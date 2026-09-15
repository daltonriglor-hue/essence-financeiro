import { describe, it, expect, vi } from 'vitest';
import {
  FinancialDomainError,
  TenantIsolationError,
  CrossTenantLinkError,
  IdempotencyConflictError,
  InvalidAmountError,
  EntityNotFoundError,
  InsufficientFinancialPermissionError,
} from '../src/modules/financial/domain/errors';

describe('Financial Domain Errors', () => {
  it('FinancialDomainError deve conter code, statusCode e details', () => {
    const error = new FinancialDomainError(
      'Teste de erro',
      'VALIDATION_ERROR',
      422,
      { campo: 'email' }
    );

    expect(error.message).toBe('Teste de erro');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(422);
    expect(error.details).toEqual({ campo: 'email' });
    expect(error.name).toBe('FinancialDomainError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FinancialDomainError);
  });

  it('TenantIsolationError deve ter código 403 e código UNAUTHORIZED_TENANT_ACCESS', () => {
    const error = new TenantIsolationError();
    expect(error.code).toBe('UNAUTHORIZED_TENANT_ACCESS');
    expect(error.statusCode).toBe(403);
  });

  it('CrossTenantLinkError deve impedir vínculo entre organizações', () => {
    const error = new CrossTenantLinkError();
    expect(error.code).toBe('CROSS_TENANT_LINK_PROHIBITED');
    expect(error.statusCode).toBe(403);
  });

  it('IdempotencyConflictError deve retornar 409 com a chave duplicada', () => {
    const error = new IdempotencyConflictError('charge-key-123');
    expect(error.statusCode).toBe(409);
    expect(error.details?.idempotency_key).toBe('charge-key-123');
  });

  it('InvalidAmountError deve retornar 422 e mostrar o valor recebido', () => {
    const error = new InvalidAmountError(-500);
    expect(error.statusCode).toBe(422);
    expect(error.details?.amount_cents).toBe(-500);
    expect(error.message).toContain('-500');
  });

  it('EntityNotFoundError deve retornar 404 com entidade e id', () => {
    const error = new EntityNotFoundError('financial_charges', 'chg-xyz');
    expect(error.statusCode).toBe(404);
    expect(error.details?.entity).toBe('financial_charges');
    expect(error.details?.id).toBe('chg-xyz');
  });

  it('InsufficientFinancialPermissionError deve retornar 403 com permissão e role', () => {
    const error = new InsufficientFinancialPermissionError('financial.settings.manage', 'user');
    expect(error.statusCode).toBe(403);
    expect(error.details?.permission).toBe('financial.settings.manage');
    expect(error.details?.role).toBe('user');
  });
});
