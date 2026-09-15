/**
 * 🧪 Testes Unitários — FinancialWebhookProcessor (Fase 6)
 *
 * Valida o processamento assíncrono de eventos de webhook do Asaas:
 * - Liquidação de cobranças (PAID) e criação de recibos
 * - Transições de estado (OVERDUE, REFUNDED, CANCELLED)
 * - Deduplicação e prevenção de múltiplos recibos
 * - Trilha de auditoria imutável
 * - Resiliência a cobranças desconhecidas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FinancialWebhookProcessor,
  type AsaasWebhookPayload,
} from '../src/modules/financial/services/financial-webhook-processor';
import type { FinancialCharge, FinancialReceipt } from '../src/modules/financial/domain/types';

describe('FinancialWebhookProcessor — Ingestão Assíncrona e Transição Canônica', () => {
  let mockWebhookRepo: any;
  let mockChargeRepo: any;
  let mockReceiptRepo: any;
  let mockAuditService: any;
  let processor: FinancialWebhookProcessor;

  const sampleCharge: FinancialCharge = {
    id: 'chg_123456',
    organization_id: 'org_essence_test',
    customer_id: 'cus_local_001',
    account_id: 'acc_local_001',
    provider: 'asaas',
    billing_type: 'PIX',
    status: 'AWAITING_PAYMENT',
    amount_cents: 15000, // R$ 150,00
    fee_cents: 199, // R$ 1,99
    net_amount_cents: 14801, // R$ 148,01
    due_date: '2026-09-30',
    idempotency_key: 'idemp_pix_123',
    external_id: 'pay_asaas_999',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  };

  beforeEach(() => {
    mockWebhookRepo = {
      updateProcessingStatus: vi.fn().mockResolvedValue(undefined),
      incrementRetry: vi.fn().mockResolvedValue(undefined),
    };

    mockChargeRepo = {
      findByExternalId: vi.fn().mockResolvedValue(sampleCharge),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockImplementation((id: string, updates: any) =>
        Promise.resolve({ ...sampleCharge, ...updates })
      ),
    };

    mockReceiptRepo = {
      findByChargeId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((params: any) =>
        Promise.resolve({
          id: 'rec_receipt_001',
          created_at: new Date().toISOString(),
          ...params,
        })
      ),
    };

    mockAuditService = {
      logAction: vi.fn().mockResolvedValue({ id: 'aud_001' }),
    };

    processor = new FinancialWebhookProcessor(
      mockWebhookRepo,
      mockChargeRepo,
      mockReceiptRepo,
      mockAuditService
    );
  });

  it('deve processar PAYMENT_RECEIVED com sucesso, liquidar cobrança e gerar recibo', async () => {
    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_001',
      event: 'PAYMENT_RECEIVED',
      dateCreated: '2026-09-15 08:30:00',
      payment: {
        id: 'pay_asaas_999',
        customer: 'cus_asaas_001',
        value: 150.0,
        netValue: 148.01,
        billingType: 'PIX',
        status: 'RECEIVED',
        paymentDate: '2026-09-15',
        creditDate: '2026-09-15',
        externalReference: 'idemp_pix_123',
      },
    };

    const result = await processor.processPayload('evt_asaas_001', payload, 'rec_event_01');

    expect(result.success).toBe(true);
    expect(result.status).toBe('PAID');
    expect(result.receiptId).toBe('rec_receipt_001');

    // Cobrança atualizada para PAID com dados financeiros em centavos
    expect(mockChargeRepo.updateStatus).toHaveBeenCalledWith('chg_123456', expect.objectContaining({
      status: 'PAID',
      net_amount_cents: 14801,
      fee_cents: 199,
    }));

    // Recibo gerado em financial_receipts
    expect(mockReceiptRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: 'org_essence_test',
      charge_id: 'chg_123456',
      gross_amount_cents: 15000,
      fee_amount_cents: 199,
      net_amount_cents: 14801,
      payment_method: 'PIX',
    }));

    // Auditoria registrada
    expect(mockAuditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'WEBHOOK_CHARGE_PAID',
      entityName: 'financial_charges',
      entityId: 'chg_123456',
      organizationId: 'org_essence_test',
      actorRole: 'system',
    }));

    // Evento de webhook marcado como PROCESSED
    expect(mockWebhookRepo.updateProcessingStatus).toHaveBeenCalledWith('rec_event_01', 'PROCESSED');
  });

  it('deve processar PAYMENT_OVERDUE e atualizar status para OVERDUE sem criar recibo', async () => {
    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_002',
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: 'pay_asaas_999',
        status: 'OVERDUE',
        value: 150.0,
      },
    };

    const result = await processor.processPayload('evt_asaas_002', payload, 'rec_event_02');

    expect(result.success).toBe(true);
    expect(result.status).toBe('OVERDUE');
    expect(result.receiptId).toBeUndefined();

    expect(mockChargeRepo.updateStatus).toHaveBeenCalledWith('chg_123456', expect.objectContaining({
      status: 'OVERDUE',
    }));

    expect(mockReceiptRepo.create).not.toHaveBeenCalled();
    expect(mockWebhookRepo.updateProcessingStatus).toHaveBeenCalledWith('rec_event_02', 'PROCESSED');
  });

  it('deve processar PAYMENT_REFUNDED e atualizar status para REFUNDED', async () => {
    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_003',
      event: 'PAYMENT_REFUNDED',
      payment: {
        id: 'pay_asaas_999',
        status: 'REFUNDED',
      },
    };

    const result = await processor.processPayload('evt_asaas_003', payload, 'rec_event_03');

    expect(result.success).toBe(true);
    expect(result.status).toBe('REFUNDED');
    expect(mockChargeRepo.updateStatus).toHaveBeenCalledWith('chg_123456', expect.objectContaining({
      status: 'REFUNDED',
    }));
  });

  it('deve processar PAYMENT_DELETED e atualizar status para CANCELLED', async () => {
    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_004',
      event: 'PAYMENT_DELETED',
      payment: {
        id: 'pay_asaas_999',
        status: 'DELETED',
      },
    };

    const result = await processor.processPayload('evt_asaas_004', payload, 'rec_event_04');

    expect(result.success).toBe(true);
    expect(result.status).toBe('CANCELLED');
    expect(mockChargeRepo.updateStatus).toHaveBeenCalledWith('chg_123456', expect.objectContaining({
      status: 'CANCELLED',
    }));
  });

  it('não deve duplicar recibo se já existir registro prévio para a mesma cobrança', async () => {
    const existingReceipt: FinancialReceipt = {
      id: 'rec_existing_999',
      organization_id: 'org_essence_test',
      charge_id: 'chg_123456',
      provider: 'asaas',
      external_payment_id: 'pay_asaas_999',
      gross_amount_cents: 15000,
      fee_amount_cents: 199,
      net_amount_cents: 14801,
      payment_method: 'PIX',
      liquidated_at: '2026-09-15T08:00:00Z',
      created_at: '2026-09-15T08:00:00Z',
    };

    mockReceiptRepo.findByChargeId.mockResolvedValueOnce(existingReceipt);

    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_dup',
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_asaas_999',
        status: 'CONFIRMED',
        value: 150.0,
      },
    };

    const result = await processor.processPayload('evt_asaas_dup', payload, 'rec_event_dup');

    expect(result.success).toBe(true);
    expect(result.receiptId).toBe('rec_existing_999');
    expect(mockReceiptRepo.create).not.toHaveBeenCalled();
  });

  it('deve localizar a cobrança por externalReference caso findByExternalId retorne null', async () => {
    mockChargeRepo.findByExternalId.mockResolvedValueOnce(null);
    mockChargeRepo.findByIdempotencyKey.mockResolvedValueOnce(sampleCharge);

    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_ext_ref',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_asaas_999',
        status: 'RECEIVED',
        externalReference: 'idemp_pix_123',
      },
    };

    const result = await processor.processPayload('evt_asaas_ext_ref', payload);

    expect(result.success).toBe(true);
    expect(mockChargeRepo.findByIdempotencyKey).toHaveBeenCalledWith('idemp_pix_123');
    expect(result.chargeId).toBe('chg_123456');
  });

  it('deve marcar evento como IGNORED caso a cobrança não exista localmente', async () => {
    mockChargeRepo.findByExternalId.mockResolvedValueOnce(null);
    mockChargeRepo.findByIdempotencyKey.mockResolvedValueOnce(null);

    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_unknown',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_unknown_000',
        status: 'RECEIVED',
      },
    };

    const result = await processor.processPayload('evt_asaas_unknown', payload, 'rec_event_unknown');

    expect(result.success).toBe(true);
    expect(result.action).toBe('IGNORED_CHARGE_NOT_FOUND');
    expect(mockWebhookRepo.updateProcessingStatus).toHaveBeenCalledWith(
      'rec_event_unknown',
      'IGNORED',
      expect.stringContaining('não encontrada')
    );
  });

  it('deve marcar evento como IGNORED caso o payload não contenha dados de pagamento', async () => {
    const payload: AsaasWebhookPayload = {
      id: 'evt_asaas_no_pay',
      event: 'NOTIFICATION',
    };

    const result = await processor.processPayload('evt_asaas_no_pay', payload, 'rec_event_no_pay');

    expect(result.success).toBe(true);
    expect(result.action).toBe('IGNORED_NO_PAYMENT');
    expect(mockWebhookRepo.updateProcessingStatus).toHaveBeenCalledWith(
      'rec_event_no_pay',
      'IGNORED',
      expect.stringContaining('sem informações de pagamento')
    );
  });
});
