# Essence Financeiro — Módulo Financeiro & Fintech Multi-Tenant

O **Essence Financeiro** é o módulo de gestão financeira, faturamento, cobranças e conciliação do ecossistema **Essence Platform / CRM**, desenvolvido com arquitetura multi-tenant de nível enterprise, agnóstica a provedor de pagamento (*provider-agnostic*) e nativamente integrada ao Supabase e Next.js App Router.

---

## 📌 Sumário Executivo

- **Objetivo**: Prover uma infraestrutura financeira robusta, auditável, idempotente e segura para emissão de cobranças (Pix, Boleto, Cartão/Checkout Hospedado), gestão de pagadores, assinaturas recorrentes e conciliação automática via webhooks.
- **Provider Inicial**: [Asaas](https://asaas.com/) (primeira integração via Sandbox e Produção).
- **Abstração SPI**: Arquitetura em camadas desacopladas que permite a inclusão de futuros gateways (ex: Stripe, Pagar.me) sem refatorar o domínio financeiro.
- **Isolamento Multi-Tenant**: Aplicação em 3 níveis (Aplicação, RBAC e PostgreSQL Row Level Security - RLS).
- **Segurança de Nível Fintech**: Zero exposição de chaves ou secrets no cliente, tratamento de valores em centavos (`amount_cents BIGINT`) e garantia física anti-vínculo cross-tenant via Foreign Keys compostas.

---

## 🏗️ Visão Arquitetural

O módulo opera seguindo os princípios de *Clean Architecture* e portas e adaptadores (*Hexagonal Architecture*):

```
                       ESSENCE PLATFORM
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      Essence CRM (UI)                  REST APIs & Webhooks
             │                                 │
             └────────────────┬────────────────┘
                              │
                      FINANCIAL DOMAIN
     ┌─────────────────────────────────────────────────┐
     │ - FinancialAccountService                       │
     │ - FinancialCustomerService                      │
     │ - FinancialChargeService                        │
     │ - FinancialSubscriptionService                  │
     │ - FinancialReceiptService                       │
     │ - FinancialWebhookProcessor                     │
     │ - FinancialReconciliationService                │
     │ - FinancialAuditService                         │
     └────────────────────────┬────────────────────────┘
                              │
                    PaymentProvider (SPI Interface)
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
       AsaasProvider                     Future Providers
      (AsaasHttpClient)               (Stripe, Pagar.me, etc.)
             │
      Asaas REST API v3
```

---

## 🛡️ Multi-Tenancy & Integridade Referencial

1. **Identificador Canônico**: Todas as tabelas financeiras utilizam `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
2. **Proteção Anti-Cross-Tenant (Composite FK)**:
   Para impedir que um pagador financeiro seja vinculado a um contato de outra organização, o banco impõe:
   ```sql
   FOREIGN KEY (crm_contact_id, organization_id) 
   REFERENCES contacts(id, organization_id)
   ```
3. **Isolamento por RLS**: Nenhuma query do Supabase pode ignorar o tenant:
   ```sql
   organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
   ```

---

## 💳 Domínio Financeiro & Entidades

O banco de dados conta com 15 tabelas especializadas e 11 enums de domínio:

| Tabela | Função Principal |
| :--- | :--- |
| `financial_accounts` | Registro da conta financeira da organização junto ao provedor. |
| `financial_provider_credentials` | Armazenamento de metadados e referências de secrets (`secret_reference`). Sem secrets em texto puro. |
| `financial_onboardings` | Histórico e aprovação regulatória/cadastral da conta. |
| `financial_business_profiles` | Dados cadastrais da empresa titular (Razão Social, CNPJ/CPF, endereço). |
| `financial_tax_profiles` | Configurações tributárias (Inscrição Municipal, CNAE, regime fiscal). |
| `financial_customers` | Pagadores internos vinculados aos contatos do CRM (`contacts`). |
| `financial_charges` | Cobranças avulsas emitidas (Pix, Boleto, Cartão/Link). |
| `financial_receipts` | Extrato de liquidações confirmadas, taxas de intermediação e valor líquido. |
| `financial_subscriptions` | Gestão de contratos e assinaturas recorrentes com ciclos configuráveis. |
| `financial_subscription_items` | Itens e planos que compõem uma assinatura. |
| `financial_webhook_configs` | Configurações de endpoint e credenciais de webhook por conta. |
| `financial_webhook_events` | Ingestão atômica de eventos recebidos (`UNIQUE(provider, provider_event_id)`). |
| `financial_audit_logs` | Trilha de auditoria imutável de eventos operacionais com `request_id`. |
| `financial_notifications` | Agendamentos e réguas de notificações de cobrança. |
| `financial_settings` | Parâmetros de juros, multas e dias de vencimento padrão. |

---

## 🔒 Matriz de Autorização & RBAC

Mapeada sobre as roles existentes da plataforma (`user_role`):

| Permissão | `super_admin` | `org_admin` | `manager` | `user` |
| :--- | :---: | :---: | :---: | :---: |
| `financial.view` | ✅ | ✅ | ✅ | ✅ |
| `financial.account.view` | ✅ | ✅ | ❌ | ❌ |
| `financial.account.manage` | ✅ | ✅ | ❌ | ❌ |
| `financial.customers.view` | ✅ | ✅ | ✅ | ✅ |
| `financial.customers.manage` | ✅ | ✅ | ✅ | ❌ |
| `financial.charges.view` | ✅ | ✅ | ✅ | ✅ (escopo próprio) |
| `financial.charges.create` | ✅ | ✅ | ✅ | ✅ (para seus clientes) |
| `financial.charges.cancel` | ✅ | ✅ | ✅ | ❌ |
| `financial.receipts.view` | ✅ | ✅ | ✅ | ❌ |
| `financial.subscriptions.manage` | ✅ | ✅ | ✅ | ❌ |
| `financial.reports.view` | ✅ | ✅ | ✅ | ❌ |
| `financial.settings.manage` | ✅ | ✅ | ❌ | ❌ |

---

## ⚡ Resiliência, Idempotência & Webhooks

- **Idempotência em Cobranças**: Parâmetro `Idempotency-Key` exigido em operações críticas. Requisições repetidas retornam a cobrança existente sem duplicar registros.
- **Resiliência a Timeout**: Se o provedor Asaas sofrer timeout de rede durante a criação, o registro local é marcado como `PENDING_RECONCILIATION`. O sistema nunca repete uma emissão sem antes consultar o status do `externalReference` no Asaas.
- **Ingestão Ultrarrápida de Webhooks**:
  1. Validação de token/assinatura (`asaas-access-token`).
  2. Persistência imediata em `financial_webhook_events` garantida por `UNIQUE(provider, provider_event_id)`.
  3. Resposta `HTTP 200` ao gateway em menos de 200ms.
  4. Processamento desacoplado através do `FinancialWebhookProcessor`.

---

## 🗺️ Roadmap de Implantação (Fases 0 a 9)

```
[FASE 0] Arquitetura & Blueprint Consolidado (CONCLUÍDA)
   │
   ▼
[FASE 1] Database & Foundation
   │     - Instalação de dependências (Zod)
   │     - Migration 00003_financial_module.sql (Enums, Tabelas, Índices, RLS)
   │     - Tipos de domínio, erros padronizados e matriz RBAC
   │
   ▼
[FASE 2] Provider Layer & Asaas Sandbox
   │     - Interface PaymentProvider SPI
   │     - AsaasHttpClient (headers, timeout, backoff exponencial, user-agent)
   │     - AsaasProvider (implementação Sandbox)
   │
   ▼
[FASE 3] Financial Customers
   │     - FinancialCustomerService (busca/criação, mapeamento crm_contact_id)
   │     - Garantia de integridade com contacts
   │
   ▼
[FASE 4] Charges & Cobranças
   │     - Emissão de Pix (QR Code + Copia e Cola), Boleto e Link Hospedado
   │     - Endpoints REST (/api/financial/charges)
   │     - Tratamento estrito de idempotência
   │
   ▼
[FASE 5] Webhooks & Idempotência
   │     - Route Handler /api/webhooks/asaas
   │     - FinancialWebhookProcessor & AsaasWebhookMapper
   │     - Transição canônica de estados
   │
   ▼
[FASE 6] Receipts & Reconciliação
   │     - Extrato de recebimentos e cálculo de taxas líquidas
   │     - FinancialReconciliationService (sanitização de divergências ativas)
   │
   ▼
[FASE 7] Subscriptions
   │     - Assinaturas recorrentes e ciclos (Weekly, Monthly, Yearly)
   │     - Cancelamento e renovação automática
   │
   ▼
[FASE 8] UI & Dashboard Financeiro
   │     - Layout integrado ao sidebar existente
   │     - KPIs (A receber, Recebido, Vencido, Inadimplência)
   │     - Tabela de cobranças, drawer de detalhes e modal de pagamento Pix
   │
   ▼
[FASE 9] Testes, Homologação & Documentação
         - Teste crítico de isolamento multi-tenant (Org A vs Org B)
         - Simulação completa de ciclo de vida em Asaas Sandbox
         - Documentação técnica definitiva em docs/financial/
```

---

## 📁 Estrutura de Arquivos no Projeto

Dentro do projeto `essence-crm-proprio`:

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                                 # Atualizado com link Financeiro
│   │   └── financial/                                 # Telas do Essence Financeiro
│   │       ├── page.tsx                               # Dashboard de métricas e KPIs
│   │       ├── account/page.tsx                       # Status da conta e integração
│   │       ├── customers/page.tsx                     # Clientes e pagadores
│   │       ├── charges/
│   │       │   ├── page.tsx                           # Lista e filtros de cobranças
│   │       │   ├── new/page.tsx                       # Emissão de Pix/Boleto/Link
│   │       │   └── [id]/page.tsx                      # Detalhes da cobrança
│   │       ├── receipts/page.tsx                      # Extrato de recebimentos
│   │       ├── subscriptions/page.tsx                 # Assinaturas recorrentes
│   │       └── reports/page.tsx                       # Relatórios financeiros
│   │
│   └── api/
│       ├── financial/
│       │   ├── account/route.ts
│       │   ├── customers/route.ts
│       │   ├── charges/route.ts
│       │   ├── receipts/route.ts
│       │   └── subscriptions/route.ts
│       └── webhooks/
│           └── asaas/route.ts                         # Ingestão de webhooks
│
├── modules/
│   └── financial/
│       ├── domain/                                    # Enums, DTOs e erros canônicos
│       ├── providers/                                 # Abstração de pagamento e Asaas
│       ├── services/                                  # Serviços de domínio e orquestração
│       ├── application/                               # Matriz RBAC e tenant resolver
│       ├── schemas/                                   # Schemas de validação Zod
│       └── repositories/                              # Camada de persistência segura Supabase
│
└── components/
    └── financial/                                     # UI Components especializados (Tailwind v4)
```

---

## 🚀 Próximos Passos

1. Revisão e aprovação final da documentação.
2. Início autorizado da **Fase 1 (Database & Foundation)** com geração da migration `supabase/migrations/00003_financial_module.sql` e schemas de domínio.
