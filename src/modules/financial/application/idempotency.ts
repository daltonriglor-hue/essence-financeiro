/**
 * 🔑 Idempotency — Utilitários para controle de idempotência em operações financeiras
 */

import { IdempotencyConflictError } from '../domain/errors';
import type { FinancialChargeRepository } from '../repositories/financial-charge.repository';
import type { FinancialCharge } from '../domain/types';

/**
 * Gera uma chave de idempotência única para operações.
 * Formato: {prefix}-{organizationId}-{timestamp}-{random}
 */
export function generateIdempotencyKey(prefix: string, organizationId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${organizationId.substring(0, 8)}-${timestamp}-${random}`;
}

/**
 * Verifica se a chave de idempotência já foi utilizada.
 * Se sim, retorna a cobrança existente sem criar duplicata.
 * Se não, retorna null (operação pode prosseguir).
 * 
 * @throws {IdempotencyConflictError} opcional — use quando quiser rejeitar ao invés de retornar existente
 */
export async function checkChargeIdempotency(
  chargeRepo: FinancialChargeRepository,
  idempotencyKey: string,
  options?: { throwOnConflict?: boolean }
): Promise<FinancialCharge | null> {
  const existing = await chargeRepo.findByIdempotencyKey(idempotencyKey);

  if (existing) {
    if (options?.throwOnConflict) {
      throw new IdempotencyConflictError(idempotencyKey);
    }
    return existing; // Retorna a cobrança existente (comportamento idempotente)
  }

  return null; // Chave livre, pode prosseguir
}
