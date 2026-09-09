# 🏛️ Base do Projeto — Essence Financeiro

Documento oficial de referência técnica, diretrizes arquiteturais e detalhamento passo a passo das 13 fases de implantação do módulo **Essence Financeiro**.

---

## 1. Visão Geral do Produto & Arquitetura

O **Essence Financeiro** é o módulo de infraestrutura financeira, cobranças, gestão de clientes financeiros, recebimentos e conciliação do ecossistema SaaS multi-tenant **Essence**.

### 1.1 Princípios Fundamentais
1. **Domínio Próprio & Provider Agnostic**: O Essence possui seu próprio modelo de domínio financeiro. O gateway (inicialmente o Asaas) é tratado estritamente como um provedor de infraestrutura via interface SPI (*Service Provider Interface*).
2. **Multi-Tenancy Obrigatório (`organization_id`)**: O identificador canônico de tenant é `organization_id`. Todas as tabelas, registros, consultas, eventos de webhook e auditorias são rigorosamente isolados por organização (via RLS no PostgreSQL e validação de aplicação).
3. **Segurança de Nível Fintech**:
   - Zero exposição de API Keys/Secrets no frontend, código, repositório ou logs.
   - Utilização de `secret_reference` para credenciais.
   - Tratamento monetário exclusivamente em centavos com tipo inteiro (`amount_cents BIGINT`), evitando erros de ponto flutuante.
   - Proteção física anti-vínculo cross-tenant através de **Composite Foreign Keys** (`FOREIGN KEY (crm_contact_id, organization_id) REFERENCES contacts(id, organization_id)`).
4. **Idempotência & Resiliência**:
   - Operações críticas (criação de cobrança, clientes, assinaturas, webhooks) exigem chave de idempotência (`Idempotency-Key` ou `provider_event_id`).
   - Timeouts de rede não geram emissões duplicadas; a cobrança entra no estado `PENDING_RECONCILIATION` até que o serviço de conciliação consulte o gateway.
5. **Ingestão Assíncrona de Webhooks**: Validação imediata de token (`asaas-access-token`), persistência rápida com deduplicação atômica (`UNIQUE(provider, provider_event_id)`), retorno `HTTP 200` em < 200ms e processamento desacoplado.

---

## 2. Estrutura de Camadas

```text
ESSENCE FINANCIAL
      │
      ├── UI / Dashboards & Telas (Next.js App Router)
      │
      ├── API Layer (Route Handlers: /api/financial/* e /api/webhooks/*)
      │
      ├── Application Layer
      │     ├── Auth / Supabase SSR
      │     ├── Tenant Resolver & Context
      │     ├── RBAC (Matriz de Permissões Financeiras)
      │     └── Validações / Zod Schemas
      │
      ├── Domain Layer
      │     ├── FinancialAccountService
      │     ├── FinancialCustomerService
      │     ├── FinancialChargeService
      │     ├── FinancialSubscriptionService
      │     ├── FinancialReceiptService
      │     ├── FinancialWebhookProcessor
      │     ├── FinancialReconciliationService
      │     └── FinancialAuditService
      │
      ├── Payment Provider SPI (Abstração)
      │     └── PaymentProvider (Interface)
      │
      └── Infrastructure / Providers (Implementações)
            ├── AsaasHttpClient (Headers, Timeout, Retry, Backoff, User-Agent)
            ├── AsaasProvider (Sandbox / Produção)
            └── Futuros Provedores (Stripe, Pagar.me, etc.)
```

---

## 3. Detalhamento Oficial das 13 Fases

---

### 🔹 FASE 1 — Foundation / Database
* **Objetivo**: Construir a fundação de banco de dados, tipos de domínio e isolamento multi-tenant.
* **Escopo de Entrega**:
  1. Configuração do ambiente e dependências (`zod`, `@supabase/ssr`, `@supabase/supabase-js`, `vitest`/`jest`).
  2. Criação da migration SQL `supabase/migrations/00003_financial_module.sql`:
     - **11 Enums de Domínio**: `financial_account_status`, `financial_account_connection_mode`, `financial_credential_mode`, `financial_credential_status`, `financial_billing_type`, `financial_charge_status`, `financial_customer_type`, `financial_subscription_cycle`, `financial_subscription_status`, `financial_webhook_processing_status`, `financial_notification_channel`.
     - **15 Tabelas Financeiras**: `financial_accounts`, `financial_provider_credentials`, `financial_onboardings`, `financial_business_profiles`, `financial_tax_profiles`, `financial_customers`, `financial_charges`, `financial_receipts`, `financial_subscriptions`, `financial_subscription_items`, `financial_webhook_configs`, `financial_webhook_events`, `financial_audit_logs`, `financial_notifications`, `financial_settings`.
     - **Constraint Anti-Cross-Tenant**: `UNIQUE(id, organization_id)` em `contacts` + Composite FK em `financial_customers(crm_contact_id, organization_id)`.
     - **Row Level Security (RLS)**: Habilitado e configurado com políticas de isolamento por `organization_id` em todas as tabelas.
     - **Índices de Performance & Unicidade**: Índices em `organization_id`, `idempotency_key`, `(provider, provider_event_id)`, `due_date`, etc.
  3. Definições de tipos TypeScript (`src/modules/financial/domain/types.ts`).
  4. Schemas Zod de validação básica (`src/modules/financial/schemas/`).
  5. Definição da matriz de permissões RBAC (`src/modules/financial/application/rbac.ts`).
  6. Teste de isolamento multi-tenant e validação sintática.
* **Critério de Parada**: Nenhuma chamada ao gateway ou regra de emissão é implementada nesta fase.

---

### 🔹 FASE 2 — Financial Domain + Application Foundation
* **Objetivo**: Criar a estrutura interna de serviços de aplicação, repositórios de dados e tratamento de erros sem acoplamento externo.
* **Escopo de Entrega**:
  1. Definição da interface SPI `PaymentProvider`.
  2. Implementação dos Repositórios de Dados com Supabase Server Client.
  3. Serviços de Domínio base (`FinancialAccountService`, `FinancialAuditService`).
  4. Middleware de validação RBAC e resolução de Tenant.
  5. Tratamento padronizado de erros de domínio e HTTP (`FinancialDomainError`).
  6. Fundação de Idempotência e Auditoria.
* **Critério de Parada**: Nenhuma operação externa real; domínio 100% testado com mocks.

---

### 🔹 FASE 3 — Asaas Provider / Sandbox Connectivity
* **Objetivo**: Implementar o client HTTP resiliente do Asaas e o adaptador do provedor operando em ambiente Sandbox.
* **Escopo de Entrega**:
  1. `AsaasHttpClient`:
     - Gerenciamento seguro de autenticação (`access_token` nos headers).
     - Identificador `User-Agent: EssenceFinancial/1.0`.
     - Configuração de timeouts e retries com backoff exponencial.
     - Sanitização de logs (nunca registrar tokens ou dados sensíveis).
  2. `AsaasProvider`: Implementação dos métodos de leitura de conta, status cadastral e verificação de conectividade.
  3. Gestão segura de credenciais via `secret_reference` / ambiente seguro de Sandbox.
  4. Testes de conectividade, autenticação e leitura de conta no Sandbox do Asaas.
* **Critério de Parada**: Testes restritos a conectividade e consulta de conta. Nenhuma cobrança criada.

---

### 🔹 FASE 4 — Financial Customers
* **Objetivo**: Estabelecer a sincronização e gestão de clientes pagadores entre o CRM e o provedor financeiro.
* **Escopo de Entrega**:
  1. Fluxo: `CRM Contact` ➔ `Financial Customer` ➔ `Asaas Customer`.
  2. `FinancialCustomerService`:
     - Verificação prévia de existência e mapeamento de ID externo.
     - Criação idempotente de cliente pagador no Asaas.
     - Persistência e amarração com `contacts` (respeitando tenant isolation).
  3. Validação de dados cadastrais (CPF/CNPJ, e-mail, telefone, endereço).
  4. Endpoints REST: `GET /api/financial/customers`, `POST /api/financial/customers`.
  5. Testes automatizados de criação e prevenção de duplicidade.

---

### 🔹 FASE 5 — Charges (Contas a Receber)
* **Objetivo**: Implementar o motor de emissão de cobranças avulsas para Pix, Boleto e Cartão de Crédito (Checkout Hospedado).
* **Escopo de Entrega**:
  1. `FinancialChargeService`:
     - Emissão de cobrança com controle estrito de `Idempotency-Key`.
     - Resolução do método de pagamento (`PIX`, `BOLETO`, `CREDIT_CARD`).
     - Geração de Pix Copia e Cola + QR Code base64.
     - Geração de Boleto Bancário (Linha Digitável, Código de Barras e PDF).
     - Geração de Link de Pagamento / Invoice Hospedada para Cartão (sem exposição PCI).
  2. Tratamento de timeout com transição para estado `PENDING_RECONCILIATION`.
  3. Cancelamento seguro de cobranças (`POST /api/financial/charges/:id/cancel`).
  4. Endpoints REST: `GET /api/financial/charges`, `POST /api/financial/charges`, `GET /api/financial/charges/:id`.
  5. Testes unitários e de integração com Sandbox.

---

### 🔹 FASE 6 — Webhooks & Ingestão Assíncrona
* **Objetivo**: Desenvolver o pipeline de recepção, validação, persistência e processamento de notificações de eventos do gateway.
* **Escopo de Entrega**:
  1. Route Handler: `POST /api/webhooks/asaas`.
  2. Validação rigorosa de token (`asaas-access-token`).
  3. Ingestão e persistência atômica em `financial_webhook_events` com deduplicação por chave única `(provider, provider_event_id)`.
  4. Resposta imediata `HTTP 200 OK` ao gateway (< 200ms).
  5. `FinancialWebhookProcessor` & `AsaasWebhookMapper`:
     - Mapeamento canônico dos eventos (`PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, etc.).
     - Transição de status da cobrança no domínio Essence.
     - Disparo de geração de recebimento (`financial_receipts`) e trilha de auditoria.
  6. Testes de eventos duplicados e resiliência a falhas de processamento.

---

### 🔹 FASE 7 — Receipts + Reconciliation
* **Objetivo**: Gestão do extrato de liquidações financeiras e mecanismo ativo de conciliação com o gateway.
* **Escopo de Entrega**:
  1. `FinancialReceiptService`: Registro de valores brutos, taxas de intermediação descontadas pelo gateway e valor líquido real recebido.
  2. `FinancialReconciliationService`:
     - Conciliação sob demanda (*on-demand*) e base para conciliação periódica em lote.
     - Recuperação e sincronização de cobranças em estado `PENDING_RECONCILIATION` ou com divergência de status.
  3. Endpoints REST: `GET /api/financial/receipts`, `POST /api/financial/charges/:id/reconcile`.
  4. Trilha de auditoria das conciliações executadas.

---

### 🔹 FASE 8 — Subscriptions (Recorrência)
* **Objetivo**: Gestão de assinaturas e contratos recorrentes com ciclo configurável.
* **Escopo de Entrega**:
  1. `FinancialSubscriptionService`:
     - Criação de planos e assinaturas recorrentes com ciclos (`WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMIANNUALLY`, `YEARLY`).
     - Gestão de itens da assinatura (`financial_subscription_items`).
     - Acompanhamento do ciclo de vida (ativa, suspensa, cancelada, inadimplente).
     - Cancelamento de assinatura junto ao provedor.
  2. Sincronização de cobranças geradas por assinaturas via webhook.
  3. Endpoints REST: `GET /api/financial/subscriptions`, `POST /api/financial/subscriptions`, `POST /api/financial/subscriptions/:id/cancel`.

---

### 🔹 FASE 9 — Financial UI / Dashboard
* **Objetivo**: Construir a interface visual de alta qualidade integrada ao design system da Essence Platform.
* **Escopo de Entrega**:
  1. **Dashboard Financeiro**: KPIs em tempo real (Total a Receber, Recebido, Vencido, Inadimplência, Distribuição por Método).
  2. **Telas Especializadas**:
     - *Conta Financeira*: Status de integração, modo de conexão e configurações.
     - *Clientes*: Listagem, busca e detalhes de pagadores.
     - *Cobranças*: Tabela completa, filtros de status/data, drawer de detalhes, modal de emissão (Pix/Boleto/Cartão) e modal de pagamento Pix com QR Code.
     - *Recebimentos*: Extrato financeiro e taxas.
     - *Assinaturas*: Gestão de contratos recorrentes.
     - *Configurações*: Parâmetros de juros, multas e régua de cobrança.
  3. Componentes com estados de *loading*, *empty state*, tratamento de erros e responsividade total.

---

### 🔹 FASE 10 — CRM Integration
* **Objetivo**: Conectar o fluxo comercial do CRM com a emissão financeira de forma cirúrgica.
* **Escopo de Entrega**:
  1. Ações no CRM para geração de cobrança direta a partir de um Contato (`contacts`) ou Oportunidade/Negócio (`opportunities`).
  2. Registro de rastreabilidade e origem (`source: 'crm'`, `crm_opportunity_id`).
  3. Atualização de status no funil de vendas quando a cobrança vinculada for liquidada.

---

### 🔹 FASE 11 — Reporting & Analytics
* **Objetivo**: Geração de relatórios analíticos, exportações e métricas consolidadas.
* **Escopo de Entrega**:
  1. Relatórios consolidados por período, cliente, status e método de pagamento.
  2. Indicadores de fluxo de caixa futuro (previsão de recebimentos).
  3. Taxas médias de inadimplência e tempo médio de liquidação.
  4. Exportação estruturada (CSV/JSON/PDF).

---

### 🔹 FASE 12 — Hardening / Homologation
* **Objetivo**: Revisão abrangente de segurança, resiliência, integridade multi-tenant e homologação end-to-end.
* **Escopo de Entrega**:
  1. Auditoria de segurança e permissões RBAC.
  2. Validação direta de RLS no PostgreSQL contra ataques cross-tenant.
  3. Bateria de testes de concorrência, idempotência e carga.
  4. Validação completa do ciclo de vida em Asaas Sandbox (Emissão ➔ Pagamento Simulado ➔ Webhook ➔ Liquidação ➔ Extrato).
  5. Documentação técnica e manual de operação consolidados.

---

### 🔹 FASE 13 — Production Readiness
* **Objetivo**: Preparação e checklist final para ativação do ambiente de produção.
* **Escopo de Entrega**:
  1. Validação do modelo comercial homologado com o Asaas (`CONNECTED_ACCOUNT` vs `SUBACCOUNT`).
  2. Configuração de credenciais de produção via Secret Manager / ambiente seguro.
  3. Validação de URLs públicas de Webhook e tokens de produção.
  4. Checklist de observabilidade, alertas e monitoramento de latência/erros.
  5. Plano de rollback e integridade de backups.
* **Regra Fundamental**: A ativação de produção NUNCA é automática; exige autorização formal e explícita do responsável.

---

## 4. Regra de Execução

```text
[FASE N] Solicitação ➔ Implementação ➔ Validação & Testes ➔ Atualização do Diário ➔ Commit & Push ➔ PARADA OBRIGATÓRIA ➔ Aguardar autorização da [FASE N+1]
```
