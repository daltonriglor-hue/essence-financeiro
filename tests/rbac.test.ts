import { describe, it, expect } from 'vitest';
import {
  hasFinancialPermission,
  assertFinancialPermission,
  RBACContext,
} from '../src/modules/financial/application/rbac';

describe('Financial RBAC Permission Matrix', () => {
  it('super_admin deve possuir acesso irrestrito a todas as operações', () => {
    expect(hasFinancialPermission('super_admin', 'financial.view')).toBe(true);
    expect(hasFinancialPermission('super_admin', 'financial.account.manage')).toBe(true);
    expect(hasFinancialPermission('super_admin', 'financial.charges.cancel')).toBe(true);
    expect(hasFinancialPermission('super_admin', 'financial.settings.manage')).toBe(true);
  });

  it('org_admin deve possuir gestão de conta, clientes, cobranças e configurações', () => {
    expect(hasFinancialPermission('org_admin', 'financial.account.manage')).toBe(true);
    expect(hasFinancialPermission('org_admin', 'financial.customers.manage')).toBe(true);
    expect(hasFinancialPermission('org_admin', 'financial.charges.create')).toBe(true);
    expect(hasFinancialPermission('org_admin', 'financial.charges.cancel')).toBe(true);
    expect(hasFinancialPermission('org_admin', 'financial.settings.manage')).toBe(true);
  });

  it('manager pode gerenciar clientes e cobranças, mas NÃO pode alterar configurações ou conta financeira', () => {
    expect(hasFinancialPermission('manager', 'financial.customers.manage')).toBe(true);
    expect(hasFinancialPermission('manager', 'financial.charges.create')).toBe(true);
    expect(hasFinancialPermission('manager', 'financial.charges.cancel')).toBe(true);
    expect(hasFinancialPermission('manager', 'financial.receipts.view')).toBe(true);

    // Proibições para manager
    expect(hasFinancialPermission('manager', 'financial.account.manage')).toBe(false);
    expect(hasFinancialPermission('manager', 'financial.account.view')).toBe(false);
    expect(hasFinancialPermission('manager', 'financial.settings.manage')).toBe(false);
  });

  it('user pode visualizar e emitir cobranças para seus clientes, mas NÃO pode cancelar ou ver extratos globais', () => {
    expect(hasFinancialPermission('user', 'financial.view')).toBe(true);
    expect(hasFinancialPermission('user', 'financial.customers.view')).toBe(true);
    expect(hasFinancialPermission('user', 'financial.charges.view')).toBe(true);
    expect(hasFinancialPermission('user', 'financial.charges.create')).toBe(true);

    // Proibições estritas para user
    expect(hasFinancialPermission('user', 'financial.charges.cancel')).toBe(false);
    expect(hasFinancialPermission('user', 'financial.receipts.view')).toBe(false);
    expect(hasFinancialPermission('user', 'financial.customers.manage')).toBe(false);
    expect(hasFinancialPermission('user', 'financial.account.view')).toBe(false);
    expect(hasFinancialPermission('user', 'financial.settings.manage')).toBe(false);
  });

  it('assertFinancialPermission deve lançar erro descritivo quando a permissão for negada', () => {
    const userCtx: RBACContext = {
      userId: 'usr-1',
      organizationId: 'org-1',
      role: 'user',
    };

    expect(() => {
      assertFinancialPermission(userCtx, 'financial.charges.cancel');
    }).toThrow(/não possui permissão para 'financial.charges.cancel'/);
  });
});
