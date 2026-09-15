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
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* SIDEBAR — Idêntica ao padrão Essence CRM */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4">
        <div>
          {/* Logo Essence */}
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-sm">
              e
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-slate-900">
                essence<span className="text-amber-500 font-semibold text-xs ml-1 bg-amber-100 px-1.5 py-0.5 rounded">FINANCEIRO</span>
              </div>
            </div>
          </div>

          {/* Botão de Destaque Amarelo */}
          <button className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition mb-6 cursor-pointer">
            <span className="text-lg font-black">+</span>
            <span>Nova Cobrança</span>
          </button>

          {/* Menus Principais do CRM */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm shadow-sm">
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
          <button className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Cabeçalho da Página */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Essence Financeiro
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Módulo de Gestão Financeira, Cobranças e Conciliação Multi-Tenant
            </p>
          </div>

          {/* Filtros em Pílula (Estilo CRM) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-xs">
            <button className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              Hoje
            </button>
            <button className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              7 dias
            </button>
            <button className="px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-xs">
              30 dias
            </button>
            <button className="px-4 py-1.5 text-xs font-semibold rounded-full text-slate-600 hover:text-slate-900">
              90 dias
            </button>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS (Design System CRM) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>FUNDAÇÃO DO BANCO</span>
              <Database size={18} className="text-amber-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">15 Tabelas</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              11 Enums canônicos
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>SEGURANÇA MULTI-TENANT</span>
              <Lock size={18} className="text-amber-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">100% RLS</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              Composite FK anti-cross-tenant
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>AUTORIZAÇÃO & RBAC</span>
              <ShieldCheck size={18} className="text-amber-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">4 Perfis</div>
            <div className="text-xs text-slate-500 mt-2">
              Super Admin, Org Admin, Manager, User
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
              <span>ESTADO ATUAL</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-600">Fase 1</div>
            <div className="text-xs text-slate-500 mt-2">
              Foundation / Database concluída
            </div>
          </div>
        </div>

        {/* DETALHAMENTO DA FASE 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Status da Entrega — FASE 1: Foundation / Database
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fundação completa de banco de dados, tipagem canônica e matriz RBAC
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              Fase 1 Pronta para Validação
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Artefatos Gerados na Fase 1
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span><strong>Migration 00003:</strong> 11 enums, 15 tabelas, RLS e composite FK</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span><strong>Tipagem TypeScript:</strong> <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">types.ts</code> com todas as 15 entidades</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span><strong>Erros Canônicos:</strong> <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">FinancialDomainError</code> e códigos padronizados</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span><strong>Validação Zod:</strong> Schemas para clientes, cobranças e assinaturas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span><strong>Matriz RBAC:</strong> Controle de acesso restrito aos 4 perfis do CRM</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Garantias Arquiteturais
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Valores monetários 100% em centavos inteiros (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">amount_cents BIGINT</code>)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Zero credenciais em texto puro (uso exclusivo de <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">secret_reference</code>)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Proteção contra vínculo cross-tenant via chave composta</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Critério de parada respeitado: Nenhuma chamada ao gateway Asaas nesta fase</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
