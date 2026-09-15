/**
 * 🔒 Essence Financeiro — Matriz de Autorização & RBAC
 * 
 * Implementação formal da tabela de permissões financeiras por perfil de usuário.
 */

export type PlatformRole = 'super_admin' | 'org_admin' | 'manager' | 'user';

export type FinancialPermission =
  | 'financial.view'
  | 'financial.account.view'
  | 'financial.account.manage'
  | 'financial.customers.view'
  | 'financial.customers.manage'
  | 'financial.charges.view'
  | 'financial.charges.create'
  | 'financial.charges.cancel'
  | 'financial.receipts.view'
  | 'financial.subscriptions.manage'
  | 'financial.reports.view'
  | 'financial.settings.manage';

export interface RBACContext {
  userId: string;
  organizationId: string;
  role: PlatformRole;
}

export const FINANCIAL_RBAC_MATRIX: Record<FinancialPermission, Record<PlatformRole, boolean>> = {
  'financial.view': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: true,
  },
  'financial.account.view': {
    super_admin: true,
    org_admin: true,
    manager: false,
    user: false,
  },
  'financial.account.manage': {
    super_admin: true,
    org_admin: true,
    manager: false,
    user: false,
  },
  'financial.customers.view': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: true,
  },
  'financial.customers.manage': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: false,
  },
  'financial.charges.view': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: true, // escopo próprio validado no serviço
  },
  'financial.charges.create': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: true, // permitido para seus contatos
  },
  'financial.charges.cancel': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: false,
  },
  'financial.receipts.view': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: false,
  },
  'financial.subscriptions.manage': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: false,
  },
  'financial.reports.view': {
    super_admin: true,
    org_admin: true,
    manager: true,
    user: false,
  },
  'financial.settings.manage': {
    super_admin: true,
    org_admin: true,
    manager: false,
    user: false,
  },
};

/**
 * Valida se um determinado papel possui a permissão requerida no módulo financeiro.
 */
export function hasFinancialPermission(role: PlatformRole, permission: FinancialPermission): boolean {
  const roleRules = FINANCIAL_RBAC_MATRIX[permission];
  if (!roleRules) {
    return false;
  }
  return !!roleRules[role];
}

/**
 * Lança erro se o usuário não possuir a permissão especificada.
 */
export function assertFinancialPermission(
  ctx: RBACContext,
  permission: FinancialPermission
): void {
  if (!hasFinancialPermission(ctx.role, permission)) {
    throw new Error(
      `Acesso negado: O perfil '${ctx.role}' não possui permissão para '${permission}'.`
    );
  }
}
