/**
 * 🏛️ Essence Financeiro — Hierarquia de Erros Canônicos de Domínio
 */

export type FinancialErrorCode =
  | 'UNAUTHORIZED_TENANT_ACCESS'
  | 'CROSS_TENANT_LINK_PROHIBITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'INVALID_AMOUNT_CENTS'
  | 'ENTITY_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'PROVIDER_COMMUNICATION_ERROR'
  | 'PROVIDER_TIMEOUT_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'VALIDATION_ERROR'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'INTERNAL_FINANCIAL_ERROR';

export class FinancialDomainError extends Error {
  public readonly code: FinancialErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: FinancialErrorCode,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FinancialDomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, FinancialDomainError.prototype);
  }
}

export class TenantIsolationError extends FinancialDomainError {
  constructor(message = 'Acesso não autorizado para esta organização / tenant.') {
    super(message, 'UNAUTHORIZED_TENANT_ACCESS', 403);
  }
}

export class CrossTenantLinkError extends FinancialDomainError {
  constructor(message = 'Violação de segurança: tentativa de associar recursos de organizações distintas.') {
    super(message, 'CROSS_TENANT_LINK_PROHIBITED', 403);
  }
}

export class IdempotencyConflictError extends FinancialDomainError {
  constructor(key: string) {
    super(
      `Operação já processada com a chave de idempotência: ${key}`,
      'IDEMPOTENCY_CONFLICT',
      409,
      { idempotency_key: key }
    );
  }
}

export class InvalidAmountError extends FinancialDomainError {
  constructor(amount: number) {
    super(
      `O valor da operação deve ser um inteiro positivo em centavos (> 0). Recebido: ${amount}`,
      'INVALID_AMOUNT_CENTS',
      422,
      { amount_cents: amount }
    );
  }
}

export class EntityNotFoundError extends FinancialDomainError {
  constructor(entity: string, id: string) {
    super(
      `Registro não encontrado no módulo financeiro: ${entity} (ID: ${id})`,
      'ENTITY_NOT_FOUND',
      404,
      { entity, id }
    );
  }
}

export class InsufficientFinancialPermissionError extends FinancialDomainError {
  constructor(permission: string, role?: string) {
    super(
      `Permissão insuficiente para executar '${permission}'. Nível atual: '${role ?? 'desconhecido'}'.`,
      'INSUFFICIENT_PERMISSIONS',
      403,
      { permission, role }
    );
  }
}
