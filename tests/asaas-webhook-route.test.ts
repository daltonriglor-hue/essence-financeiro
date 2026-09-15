/**
 * 🧪 Testes de Integração da Rota — /api/webhooks/asaas (Fase 6)
 *
 * Valida o Route Handler HTTP para webhooks:
 * - Validação de token de segurança (asaas-access-token)
 * - Deduplicação única e resposta imediata HTTP 200 { deduplicated: true }
 * - Tratamento de payload inválido (HTTP 400)
 * - Processamento ponta a ponta com resposta HTTP 200 { processed: true }
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../src/app/api/webhooks/asaas/route';

// Mocks dos módulos do Supabase e repositórios
const mockIngestEvent = vi.fn();
const mockUpdateProcessingStatus = vi.fn();
const mockIncrementRetry = vi.fn();
const mockFindByExternalId = vi.fn();
const mockUpdateStatus = vi.fn();
const mockFindByChargeId = vi.fn();
const mockCreateReceipt = vi.fn();
const mockLogAction = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: vi.fn(),
  }),
}));

vi.mock('@/modules/financial/repositories/financial-webhook.repository', () => ({
  FinancialWebhookRepository: vi.fn().mockImplementation(() => ({
    ingestEvent: mockIngestEvent,
    updateProcessingStatus: mockUpdateProcessingStatus,
    incrementRetry: mockIncrementRetry,
  })),
}));

vi.mock('@/modules/financial/repositories/financial-charge.repository', () => ({
  FinancialChargeRepository: vi.fn().mockImplementation(() => ({
    findByExternalId: mockFindByExternalId,
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    updateStatus: mockUpdateStatus,
  })),
}));

vi.mock('@/modules/financial/repositories/financial-receipt.repository', () => ({
  FinancialReceiptRepository: vi.fn().mockImplementation(() => ({
    findByChargeId: mockFindByChargeId,
    create: mockCreateReceipt,
  })),
}));

vi.mock('@/modules/financial/services/financial-audit.service', () => ({
  FinancialAuditService: vi.fn().mockImplementation(() => ({
    logAction: mockLogAction,
  })),
}));

describe('Route Handler — POST /api/webhooks/asaas', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve rejeitar com 401 se ASAAS_WEBHOOK_SECRET estiver configurado e o header estiver incorreto', async () => {
    process.env.ASAAS_WEBHOOK_SECRET = 'secret_token_abc';

    const req = new Request('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': 'wrong_token',
      },
      body: JSON.stringify({ event: 'PAYMENT_RECEIVED' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.code).toBe('WEBHOOK_UNAUTHORIZED');
  });

  it('deve rejeitar com 400 se o corpo da requisição não for um JSON válido', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{{{',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('INVALID_JSON');
  });

  it('deve rejeitar com 400 se o payload não contiver o campo "event"', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notAnEvent: true }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('MISSING_EVENT');
  });

  it('deve retornar 200 com deduplicated: true se o evento já tiver sido ingerido (23505)', async () => {
    mockIngestEvent.mockResolvedValueOnce(null); // Retorna null indicando duplicação

    const req = new Request('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'evt_dup_001',
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001' },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.deduplicated).toBe(true);
  });

  it('deve processar evento com sucesso e retornar 200 com processed: true', async () => {
    const fakeIngestedEvent = {
      id: 'evtrec_123',
      provider_event_id: 'evt_asaas_success',
      processing_status: 'PENDING',
    };

    const fakeCharge = {
      id: 'chg_success_1',
      organization_id: 'org_test_1',
      amount_cents: 10000,
      fee_cents: 199,
      net_amount_cents: 9801,
      billing_type: 'PIX',
      status: 'AWAITING_PAYMENT',
    };

    mockIngestEvent.mockResolvedValueOnce(fakeIngestedEvent);
    mockFindByExternalId.mockResolvedValueOnce(fakeCharge);
    mockUpdateStatus.mockResolvedValueOnce({ ...fakeCharge, status: 'PAID' });
    mockFindByChargeId.mockResolvedValueOnce(null);
    mockCreateReceipt.mockResolvedValueOnce({ id: 'rec_001' });

    const req = new Request('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'evt_asaas_success',
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'pay_success_1',
          status: 'RECEIVED',
          value: 100.0,
          netValue: 98.01,
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.processed).toBe(true);
    expect(json.result.status).toBe('PAID');
    expect(json.result.receiptId).toBe('rec_001');
  });
});
