/**
 * ⚡ FinancialWebhookProcessor — Processador Desacoplado de Webhooks
 *
 * Executa o processamento assíncrono e transição canônica de estados:
 * - Ingestão atômica deduplicada
 * - Transição de status da cobrança no domínio Essence
 * - Liquidação automática com registro de recebimento em financial_receipts
 * - Trilha de auditoria imutável
 */

import type { FinancialWebhookRepository } from '../repositories/financial-webhook.repository';
import type { FinancialChargeRepository } from '../repositories/financial-charge.repository';
import type { FinancialReceiptRepository } from '../repositories/financial-receipt.repository';
import type { FinancialAuditService } from './financial-audit.service';
import { mapAsaasStatusToEssence, mapAsaasWebhookEvent } from '../providers/asaas/asaas-webhook-mapper';
import type { FinancialChargeStatus } from '../domain/types';

export interface AsaasWebhookPaymentPayload {
  object?: string;
  id: string;
  customer?: string;
  value?: number;
  netValue?: number;
  billingType?: string;
  status?: string;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  externalReference?: string;
  confirmedDate?: string;
  creditDate?: string;
  estimatedCreditDate?: string;
}

export interface AsaasWebhookPayload {
  id?: string;
  event: string;
  dateCreated?: string;
  payment?: AsaasWebhookPaymentPayload;
}

export interface WebhookProcessResult {
  success: boolean;
  action: string;
  chargeId?: string;
  receiptId?: string;
  status?: FinancialChargeStatus;
  message?: string;
}

export class FinancialWebhookProcessor {
  constructor(
    private readonly webhookRepo: FinancialWebhookRepository,
    private readonly chargeRepo: FinancialChargeRepository,
    private readonly receiptRepo: FinancialReceiptRepository,
    private readonly auditService?: FinancialAuditService
  ) {}

  /**
   * Processa o payload de webhook recebido do Asaas.
   */
  async processPayload(
    providerEventId: string,
    payload: AsaasWebhookPayload,
    webhookEventRecordId?: string
  ): Promise<WebhookProcessResult> {
    const eventType = payload.event;
    const payment = payload.payment;

    if (!payment || !payment.id) {
      if (webhookEventRecordId) {
        await this.webhookRepo.updateProcessingStatus(
          webhookEventRecordId,
          'IGNORED',
          'Payload sem informações de pagamento'
        );
      }
      return {
        success: true,
        action: 'IGNORED_NO_PAYMENT',
        message: 'Evento ignorado pois não contém dados de pagamento',
      };
    }

    // 1. Localizar a cobrança interna por external_id ou por externalReference (idempotency_key)
    let charge = await this.chargeRepo.findByExternalId(payment.id);

    if (!charge && payment.externalReference) {
      charge = await this.chargeRepo.findByIdempotencyKey(payment.externalReference);
    }

    if (!charge) {
      if (webhookEventRecordId) {
        await this.webhookRepo.updateProcessingStatus(
          webhookEventRecordId,
          'IGNORED',
          `Cobrança ${payment.id} não encontrada no Essence Financeiro`
        );
      }
      return {
        success: true,
        action: 'IGNORED_CHARGE_NOT_FOUND',
        message: `Cobrança ${payment.id} não gerenciada localmente`,
      };
    }

    // 2. Mapeamento de Status Canônico
    const targetStatus: FinancialChargeStatus = payment.status
      ? mapAsaasStatusToEssence(payment.status)
      : eventType.includes('RECEIVED') || eventType.includes('CONFIRMED')
      ? 'PAID'
      : eventType.includes('OVERDUE')
      ? 'OVERDUE'
      : eventType.includes('REFUNDED')
      ? 'REFUNDED'
      : eventType.includes('DELETED')
      ? 'CANCELLED'
      : charge.status;

    const previousStatus = charge.status;
    const netAmountCents = payment.netValue ? Math.round(payment.netValue * 100) : charge.net_amount_cents;
    const feeCents = netAmountCents ? charge.amount_cents - netAmountCents : charge.fee_cents;
    const paidAt = payment.paymentDate
      ? new Date(payment.paymentDate).toISOString()
      : targetStatus === 'PAID'
      ? new Date().toISOString()
      : charge.paid_at;

    // 3. Atualizar Status da Cobrança
    const updatedCharge = await this.chargeRepo.updateStatus(charge.id, {
      status: targetStatus,
      external_id: payment.id,
      paid_at: paidAt || undefined,
      net_amount_cents: netAmountCents ?? undefined,
      fee_cents: feeCents,
    });

    let receiptId: string | undefined;

    // 4. Se a cobrança foi liquidada (PAID), gerar recibo / extrato de liquidação
    if (targetStatus === 'PAID') {
      const existingReceipt = await this.receiptRepo.findByChargeId(charge.id);

      if (!existingReceipt) {
        const grossAmount = charge.amount_cents;
        const netAmount = netAmountCents ?? grossAmount;
        const feeAmount = grossAmount - netAmount;

        const receipt = await this.receiptRepo.create({
          organization_id: charge.organization_id,
          charge_id: charge.id,
          provider: 'asaas',
          external_payment_id: payment.id,
          gross_amount_cents: grossAmount,
          fee_amount_cents: feeAmount,
          net_amount_cents: netAmount,
          payment_method: charge.billing_type,
          liquidated_at: paidAt || new Date().toISOString(),
          credit_date: payment.creditDate || payment.confirmedDate || null,
          raw_details: payload as unknown as Record<string, unknown>,
        });

        receiptId = receipt.id;
      } else {
        receiptId = existingReceipt.id;
      }
    }

    // 5. Trilha de Auditoria
    if (this.auditService) {
      await this.auditService.logAction({
        action: `WEBHOOK_${mapAsaasWebhookEvent(eventType)}`,
        entityName: 'financial_charges',
        entityId: charge.id,
        organizationId: charge.organization_id,
        actorId: 'system:webhook',
        actorEmail: 'webhook@asaas.gateway',
        actorRole: 'system',
        previousState: { status: previousStatus },
        newState: {
          status: targetStatus,
          paid_at: paidAt,
          receipt_id: receiptId,
          provider_event_id: providerEventId,
        },
      });
    }

    // 6. Atualizar Status do Evento de Webhook para PROCESSED
    if (webhookEventRecordId) {
      await this.webhookRepo.updateProcessingStatus(webhookEventRecordId, 'PROCESSED');
    }

    return {
      success: true,
      action: mapAsaasWebhookEvent(eventType),
      chargeId: updatedCharge.id,
      receiptId,
      status: targetStatus,
    };
  }
}
