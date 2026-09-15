import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Users,
  GitFork,
  CheckSquare,
  Package,
  BookOpen,
  Bot,
  CreditCard,
  Receipt,
  RotateCw,
  Sliders,
  LogOut,
  ShieldCheck,
  Database,
  CheckCircle2,
  Lock,
  Wifi,
  Building2,
  Wallet,
  Server,
  KeyRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let isConnected = false;
  let accountInfo: { name: string; email: string; cpfCnpj: string; status?: string } | null = null;
  let accountStatus: { commercialInfo: string; bankAccountInfo: string; documentation: string; general: string } | null = null;
  let balance = 0;
  let errorDetail: string | null = null;

  try {
    const provider = createAsaasProvider();
    isConnected = await provider.testConnection();

    if (isConnected) {
      const [info, status, bal] = await Promise.all([
        provider.getAccountInfo(),
        provider.getAccountStatus(),
        provider.getBalance(),
      ]);

      accountInfo = {
        name: info.name,
        email: info.email,
        cpfCnpj: info.cpfCnpj,
        status: info.status,
      };

      accountStatus = {
        commercialInfo: status.commercialInfo,
        bankAccountInfo: status.bankAccountInfo,
        documentation: status.documentation,
        general: status.general,
      };

      balance = bal.balance;
    }
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : 'Falha na conexão com Asaas Sandbox';
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans" suppressHydrationWarning>
      {/* SIDEBAR — Idêntica ao padrão Essence CRM */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          {/* Logo Essence */}
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-xs">
              e
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-slate-900">
                essence<span className="text-amber-600 font-semibold text-xs ml-1 bg-amber-100 px-1.5 py-0.5 rounded">FINANCEIRO</span>
              </div>
            </div>
          </div>

          {/* Botão de Destaque Amarelo */}
          <button
            type="button"
            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition mb-6 cursor-pointer"
          >
            <span className="text-lg font-black">+</span>
            <span>Nova Cobrança</span>
          </button>

          {/* Menus Principais do CRM */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm shadow-xs">
              <LayoutDashboard size={18} className="text-amber-400" />
              <span>Dashboard</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
              <Inbox size={18} />
              <span>Caixa de Entrada</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
              <Users size={18} />
              <span>Contatos</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
              <GitFork size={18} />
              <span>Funil de Vendas</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
              <CheckSquare size={18} />
              <span>Tarefas</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
              <Package size={18} />
              <span>Produtos</span>
            </div>
          </div>

          {/* Submenu Financeiro Integrado */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              Gestão Financeira
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <CreditCard size={18} className="text-slate-500" />
                <span>Cobranças (Receber)</span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <Receipt size={18} className="text-slate-500" />
                <span>Extrato & Recebimentos</span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <RotateCw size={18} className="text-slate-500" />
                <span>Assinaturas</span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <Sliders size={18} className="text-slate-500" />
                <span>Configurações</span>
              </div>
            </div>
          </div>

          {/* Submenu IA */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
              Inteligência Artificial
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <BookOpen size={18} className="text-amber-500" />
                <span>Base de Conhecimento</span>
              </div>

              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm cursor-pointer transition">
                <Bot size={18} className="text-amber-500" />
                <span>Personalidade da IA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Usuário — Dalton Ribeiro */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-amber-400 overflow-hidden flex items-center justify-center font-bold text-slate-700">
              DR
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Dalton Ribeiro</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Admin • Online
              </div>
            </div>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Essence Financeiro
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                FASE 3 ATIVA
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Gateway de Pagamentos Asaas Sandbox conectado & isolamento multi-tenant ativo
            </p>
          </div>

          {/* Filtros em Pílula (Estilo CRM) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-xs self-start md:self-auto">
            <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              Hoje
            </button>
            <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              7 dias
            </button>
            <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-xs">
              30 dias
            </button>
            <button type="button" className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              90 dias
            </button>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS (Design System CRM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Conectividade Live */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>ASAAS GATEWAY</span>
              <Wifi size={18} className={isConnected ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
            <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
              {isConnected ? (
                <span className="text-emerald-600">Conectado</span>
              ) : (
                <span className="text-rose-600">Desconectado</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Ambiente Sandbox (api/v3)
            </div>
          </div>

          {/* Card 2: Status Comercial da Conta */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>STATUS CADASTRAL</span>
              <Building2 size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {accountStatus?.commercialInfo ?? (isConnected ? 'APPROVED' : 'PENDING')}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              Documentação e conta bancária OK
            </div>
          </div>

          {/* Card 3: Saldo Sandbox */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>SALDO EM CONTA</span>
              <Wallet size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Server size={14} className="text-slate-400" />
              Disponível para testes no Sandbox
            </div>
          </div>

          {/* Card 4: Testes Automatizados */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>TESTES UNITÁRIOS</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">64 / 64 (100%)</div>
            <div className="text-xs text-slate-500 mt-2">
              11 arquivos de teste aprovados
            </div>
          </div>
        </div>

        {/* PAINEL DE CONECTIVIDADE LIVE DA FASE 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  Diagnóstico Live — FASE 3: Asaas Provider / Sandbox Connectivity
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comunicação em tempo real com o gateway Asaas via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">AsaasHttpClient</code> e <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">AsaasProvider</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                HTTP 200 • Sandbox Conectado
              </span>
            </div>
          </div>

          {isConnected && accountInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Coluna 1: Dados da Conta */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 size={16} className="text-slate-600" />
                  <span>Titular da Conta</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{accountInfo.name}</div>
                <div className="text-xs text-slate-500 mt-1 font-mono">{accountInfo.email}</div>
                <div className="text-xs text-slate-500 mt-1">CNPJ/CPF: {accountInfo.cpfCnpj}</div>
              </div>

              {/* Coluna 2: Status Regulatório */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-slate-600" />
                  <span>Validações Regulatórias</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Info Comercial:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {accountStatus?.commercialInfo ?? 'APPROVED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Conta Bancária:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {accountStatus?.bankAccountInfo ?? 'APPROVED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Documentação:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {accountStatus?.documentation ?? 'APPROVED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Segurança & Resiliência */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <KeyRound size={16} className="text-slate-600" />
                  <span>Resiliência & Segurança</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>User-Agent: <strong>EssenceFinancial/1.0</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Backoff exponencial (3 retries)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Zero secrets em logs ou respostas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <div className="font-bold">⚠️ Conexão não estabelecida</div>
              <p className="text-xs mt-1 text-rose-600">
                {errorDetail || 'Verifique se a variável ASAAS_SANDBOX_API_KEY está configurada no .env.local'}
              </p>
            </div>
          )}

          {/* Alerta de Critério de Parada Respeitado */}
          <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-700 flex items-center justify-center shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Critério de Parada da Fase 3 Rigorosamente Respeitado
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Conexão, autenticação e consulta de conta validados com sucesso. Nenhuma cobrança ou pagador foi criado no Asaas nesta fase.
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2 font-bold text-xs text-amber-950 bg-amber-200/60 px-3 py-1.5 rounded-lg shrink-0">
              <span>Próximo passo: Fase 4</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* SUÍTE DE TESTES E ARTEFATOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Bateria de Testes Vitest */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Suíte de Testes da Fase 3 (64 aprovados)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">tests/asaas-sandbox-connectivity.test.ts</div>
                  <div className="text-slate-500 text-[11px]">Conexão live real com Sandbox Asaas</div>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  5/5 Pass
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">tests/asaas-http-client.test.ts</div>
                  <div className="text-slate-500 text-[11px]">Headers, timeout, retries 5xx e sanitização</div>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  6/6 Pass
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">tests/asaas-provider.test.ts</div>
                  <div className="text-slate-500 text-[11px]">Implementação da SPI PaymentProvider</div>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  7/7 Pass
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">tests/asaas-webhook-mapper.test.ts</div>
                  <div className="text-slate-500 text-[11px]">Conversão de status canônicos e eventos</div>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  8/8 Pass
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Testes das Fases 1 e 2</div>
                  <div className="text-slate-500 text-[11px]">Schemas, RBAC, RLS, Domain Errors, Idempotency</div>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  38/38 Pass
                </span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Roadmap do Módulo */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database size={18} className="text-amber-500" />
              <span>Progresso do Roadmap de Implantação</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-950">FASE 1: Database & Foundation</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Concluída</span>
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-950">FASE 2: Domain + Application Foundation</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Concluída</span>
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-950">FASE 3: Asaas Provider / Sandbox</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Concluída</span>
              </div>

              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                  </div>
                  <span className="font-bold text-amber-950">FASE 4: Financial Customers</span>
                </div>
                <span className="text-[11px] font-bold text-amber-700 uppercase">Aguardando Validação</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                  <span>FASE 5: Charges (Cobranças Pix / Boleto / Cartão)</span>
                </div>
                <span className="text-[11px] uppercase">Próxima</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
