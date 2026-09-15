/**
 * 🛡️ Financial API Middleware — Validação de Autenticação, Tenant e RBAC
 * 
 * Utilitários para Route Handlers (Next.js App Router) do módulo financeiro.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveTenantContext, toRBACContext } from './tenant-resolver';
import { hasFinancialPermission, type FinancialPermission } from './rbac';
import { FinancialDomainError } from '../domain/errors';
import type { TenantContext } from './tenant-resolver';

/**
 * Tipo para handler autenticado com contexto financeiro resolvido.
 */
export type AuthenticatedFinancialHandler = (
  request: Request,
  context: {
    tenant: TenantContext;
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  }
) => Promise<NextResponse>;

/**
 * Wrapper para Route Handlers que garante:
 * 1. Autenticação via Supabase Auth
 * 2. Resolução de tenant (organization_id)
 * 3. Checagem de permissão RBAC (opcional)
 * 4. Tratamento padronizado de erros
 */
export function withFinancialAuth(
  handler: AuthenticatedFinancialHandler,
  requiredPermission?: FinancialPermission
) {
  return async (request: Request) => {
    try {
      const supabase = await createSupabaseServerClient();
      const tenant = await resolveTenantContext(supabase);

      // Verificar permissão RBAC se especificada
      if (requiredPermission) {
        const rbacCtx = toRBACContext(tenant);
        if (!hasFinancialPermission(rbacCtx.role, requiredPermission)) {
          return NextResponse.json(
            {
              error: 'Permissão insuficiente',
              code: 'INSUFFICIENT_PERMISSIONS',
              detail: `O perfil '${tenant.role}' não possui acesso a '${requiredPermission}'.`,
            },
            { status: 403 }
          );
        }
      }

      return await handler(request, { tenant, supabase });
    } catch (error) {
      return handleFinancialError(error);
    }
  };
}

/**
 * Tratamento padronizado de erros em respostas HTTP.
 */
export function handleFinancialError(error: unknown): NextResponse {
  if (error instanceof FinancialDomainError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Erros do Supabase
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const supaErr = error as { code: string; message: string };
    return NextResponse.json(
      {
        error: 'Erro de banco de dados',
        code: 'DATABASE_ERROR',
        detail: supaErr.message,
      },
      { status: 500 }
    );
  }

  // Erro genérico
  console.error('[FinancialModule] Erro não tratado:', error);
  return NextResponse.json(
    {
      error: 'Erro interno no módulo financeiro',
      code: 'INTERNAL_FINANCIAL_ERROR',
    },
    { status: 500 }
  );
}
