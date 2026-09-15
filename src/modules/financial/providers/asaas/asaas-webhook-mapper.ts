/**
 * 🗺️ AsaasWebhookMapper — Mapeamento Canônico de Status Asaas → Essence
 *
 * Converte os status e eventos brutos do Asaas para os enums
 * canônicos do domínio Essence Financeiro.
 */

import type { FinancialChargeStatus } from '../../domain/types';

/** Mapa de status de cobrança do Asaas → FinancialChargeStatus Essence */
const ASAAS_PAYMENT_STATUS_MAP: Record<string, FinancialChargeStatus> = {
  PENDING: 'AWAITING_PAYMENT',
  RECEIVED: 'PAID',
  CONFIRMED: 'PAID',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED',
  RECEIVED_IN_CASH: 'PAID',
  REFUND_REQUESTED: 'REFUNDED',
  CHARGEBACK_REQUESTED: 'REFUNDED',
  CHARGEBACK_DISPUTE: 'REFUNDED',
  AWAITING_CHARGEBACK_REVERSAL: 'REFUNDED',
  DUNNING_REQUESTED: 'OVERDUE',
  DUNNING_RECEIVED: 'PAID',
  AWAITING_RISK_ANALYSIS: 'AWAITING_PAYMENT',
  DELETED: 'CANCELLED',
};

/** Mapa de eventos de webhook do Asaas → ação canônica interna */
export const ASAAS_WEBHOOK_EVENT_MAP: Record<string, string> = {
  PAYMENT_CREATED: 'CHARGE_CREATED',
  PAYMENT_UPDATED: 'CHARGE_UPDATED',
  PAYMENT_CONFIRMED: 'CHARGE_PAID',
  PAYMENT_RECEIVED: 'CHARGE_PAID',
  PAYMENT_OVERDUE: 'CHARGE_OVERDUE',
  PAYMENT_DELETED: 'CHARGE_CANCELLED',
  PAYMENT_RESTORED: 'CHARGE_RESTORED',
  PAYMENT_REFUNDED: 'CHARGE_REFUNDED',
  PAYMENT_RECEIVED_IN_CASH_UNDONE: 'CHARGE_REFUNDED',
  PAYMENT_CHARGEBACK_REQUESTED: 'CHARGE_CHARGEBACK',
  PAYMENT_CHARGEBACK_DISPUTE: 'CHARGE_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_RISK_ANALYSIS_RESPONSE: 'CHARGE_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'CHARGE_PAID',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'CHARGE_CANCELLED',
};

/**
 * Converte status bruto do Asaas para o enum canônico Essence.
 * Se o status não for reconhecido, mantém como PENDING_RECONCILIATION para auditoria.
 */
export function mapAsaasStatusToEssence(asaasStatus: string): FinancialChargeStatus {
  return ASAAS_PAYMENT_STATUS_MAP[asaasStatus] ?? 'PENDING_RECONCILIATION';
}

/**
 * Converte evento de webhook do Asaas para nome canônico interno.
 */
export function mapAsaasWebhookEvent(asaasEvent: string): string {
  return ASAAS_WEBHOOK_EVENT_MAP[asaasEvent] ?? `UNKNOWN_${asaasEvent}`;
}
