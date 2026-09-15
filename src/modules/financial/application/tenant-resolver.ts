/**
 * 🏢 Tenant Resolver — Resolução e Validação de Contexto Multi-Tenant
 * 
 * Extrai o usuário autenticado, seu organization_id e role a partir
 * do Supabase Auth (cookie de sessão), garantindo isolamento total.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformRole, RBACContext } from './rbac';
import { TenantIsolationError } from '../domain/errors';

export interface TenantContext {
  userId: string;
  organizationId: string;
  email: string;
  role: PlatformRole;
}

/**
 * Resolve o contexto de tenant a partir da sessão autenticada do Supabase.
 * Busca o usuário logado e seu vínculo organizacional na tabela `users`.
 * 
 * @throws {TenantIsolationError} se o usuário não estiver autenticado ou sem organização.
 */
export async function resolveTenantContext(
  supabase: SupabaseClient
): Promise<TenantContext> {
  // 1. Obter o usuário autenticado via Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new TenantIsolationError(
      'Usuário não autenticado. Sessão inválida ou expirada.'
    );
  }

  // 2. Buscar o perfil do usuário na tabela `users` com seu organization_id e role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, role, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new TenantIsolationError(
      `Perfil de usuário não encontrado ou sem organização vinculada (user_id: ${user.id}).`
    );
  }

  if (!profile.organization_id) {
    throw new TenantIsolationError(
      'Usuário autenticado não possui organização vinculada (organization_id ausente).'
    );
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    email: profile.email ?? user.email ?? '',
    role: (profile.role as PlatformRole) ?? 'user',
  };
}

/**
 * Converte TenantContext para RBACContext para checagem de permissões.
 */
export function toRBACContext(tenant: TenantContext): RBACContext {
  return {
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    role: tenant.role,
  };
}
