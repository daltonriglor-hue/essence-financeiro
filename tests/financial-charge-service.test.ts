import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialChargeService } from '@/modules/financial/services/financial-charge.service';
import type { FinancialChargeRepository } from '@/modules/financial/repositories/financial-charge.repository';
import type { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import type { FinancialAccountRepository } from '@/modules/financial/repositories/financial-account.repository';
import type { PaymentProvider } from '@/modules/financial/providers/payment-provider.interface';
import type { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import type { FinancialCharge, FinancialCustomer, FinancialAccount } from '@/modules/financial/domain/types';
import { AsaasTimeoutError } from '@/modules/financial/providers/asaas/asaas-http-client';
import { FinancialDomainError, ValidationError } from '@/modules/financial/domain/errors';

describe('FinancialChargeService — Emissão, Idempotência e Resiliência', () => {
  const ORG_ID = '11111111-1111-1111-1111-111111111111';
  const CUSTOMER_ID = '22222222-2222-2222-2222-222222222222';
  const ACCOUNT_ID = '33333333-3333-3333-3333-333333333333';

  let mockChargeRepo: FinancialChargeRepository;
  let mockCustomerRepo: FinancialCustomerRepository;
  let mockAccountRepo: FinancialAccountRepository;
  let mockProvider: PaymentProvider;
  let mockAudit: FinancialAuditService;
  let service: FinancialChargeService;

  const fakeCustomer: FinancialCustomer = {
    id: CUSTOMER_ID,
    organization_id: ORG_ID,
    crm_contact_id: 'contact-uuid-99',
    provider: 'asaas',
    external_customer_id: 'cus_asaas_123',
    customer_type: 'INDIVIDUAL',
    name: 'Dalton Ribeiro',
    document_number: '00000000000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const fakeAccount: FinancialAccount = {
    id: ACCOUNT_ID,
    organization_id: ORG_ID,
    provider: 'asaas',
    connection_mode: 'DIRECT_CREDENTIALS',
    status: 'ACTIVE',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    mockChargeRepo = {
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findByExternalId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      findAll: vi.fn(),
      findPendingReconciliation: vi.fn(),
    } as unknown as FinancialChargeRepository;

    mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue(fakeCustomer),
      findByCrmContactId: vi.fn(),
      findByExternalId: vi.fn(),
      create: vi.fn(),
      updateExternalId: vi.fn(),
      findAll: vi.fn(),
    } as unknown as FinancialCustomerRepository;

    mockAccountRepo = {
      findById: vi.fn().mockResolvedValue(fakeAccount),
      findDefaultAccount: vi.fn().mockResolvedValue(fakeAccount),
      create: vi.fn().mockResolvedValue(fakeAccount),
      updateStatus: vi.fn(),
    } as unknown as FinancialAccountRepository;

    mockProvider = {
      providerName: 'asaas',
      testConnection: vi.fn(),
      getAccountInfo: vi.fn(),
      createCustomer: vi.fn(),
      getCustomer: vi.fn(),
      createCharge: vi.fn(),
      getCharge: vi.fn(),
      cancelCharge: vi.fn(),
      createSubscription: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    };

    mockAudit = {
      logAction: vi.fn().mockResolvedValue({}),
    } as unknown as FinancialAuditService;

    service = new FinancialChargeService(
      mockChargeRepo,
      mockCustomerRepo,
      mockAccountRepo,
      mockProvider,
      mockAudit,
      ORG_ID
    );
  });

  describe('createCharge() — Emissão Pix', () => {
    it('deve emitir cobrança Pix convertendo centavos para reais e salvando QR Code', async () => {
      vi.mocked(mockChargeRepo.findByIdempotencyKey).mockResolvedValueOnce(null);

      vi.mocked(mockProvider.createCharge).mockResolvedValueOnce({
        externalId: 'pay_asaas_pix_123',
        status: 'PENDING',
        value: 150.0,
        netValue: 148.01,
        billingType: 'PIX',
        dueDate: '2026-10-15',
        pixQrCodeBase64: 'data:image/png;base64,iVBORw0KGgo...',
        pixCopyPaste: '00020101021226830014br.gov.bcb.pix...',
        invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
      });

      const savedCharge: FinancialCharge = {
        id: 'charge-uuid-1',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: 'pay_asaas_pix_123',
        idempotency_key: 'idemp-pix-unique-01',
        billing_type: 'PIX',
        status: 'AWAITING_PAYMENT',
        amount_cents: 15000,
        net_amount_cents: 14801,
        fee_cents: 199,
        due_date: '2026-10-15',
        pix_qr_code_base64: 'data:image/png;base64,iVBORw0KGgo...',
        pix_copy_paste: '00020101021226830014br.gov.bcb.pix...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.create).mockResolvedValueOnce(savedCharge);

      const result = await service.createCharge({
        customer_id: CUSTOMER_ID,
        amount_cents: 15000, // R$ 150,00
        billing_type: 'PIX',
        due_date: '2026-10-15',
        description: 'Serviço de Consultoria',
        idempotency_key: 'idemp-pix-unique-01',
      });

      expect(result.status).toBe('AWAITING_PAYMENT');
      expect(result.pix_copy_paste).toBeDefined();
      expect(mockProvider.createCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_asaas_123',
          value: 150.0, // Conversão verificada
          billingType: 'PIX',
        })
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHARGE_CREATED',
          entityName: 'financial_charges',
        })
      );
    });
  });

  describe('createCharge() — Emissão Boleto Bancário', () => {
    it('deve emitir cobrança Boleto salvando Linha Digitável e Código de Barras', async () => {
      vi.mocked(mockChargeRepo.findByIdempotencyKey).mockResolvedValueOnce(null);

      vi.mocked(mockProvider.createCharge).mockResolvedValueOnce({
        externalId: 'pay_asaas_boleto_456',
        status: 'PENDING',
        value: 200.0,
        billingType: 'BOLETO',
        dueDate: '2026-10-20',
        bankSlipBarCode: '2379338128600830135285600006330778900000020000',
        bankSlipDigitableLine: '23793.38128 60083.013528 56000.063307 7 8900000020000',
        bankSlipUrl: 'https://sandbox.asaas.com/b/pdf/pay_456',
      });

      const savedBoleto: FinancialCharge = {
        id: 'charge-uuid-2',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: 'pay_asaas_boleto_456',
        idempotency_key: 'idemp-boleto-unique-02',
        billing_type: 'BOLETO',
        status: 'AWAITING_PAYMENT',
        amount_cents: 20000,
        due_date: '2026-10-20',
        bank_slip_bar_code: '2379338128600830135285600006330778900000020000',
        bank_slip_digitable_line: '23793.38128 60083.013528 56000.063307 7 8900000020000',
        bank_slip_pdf_url: 'https://sandbox.asaas.com/b/pdf/pay_456',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.create).mockResolvedValueOnce(savedBoleto);

      const result = await service.createCharge({
        customer_id: CUSTOMER_ID,
        amount_cents: 20000,
        billing_type: 'BOLETO',
        due_date: '2026-10-20',
        idempotency_key: 'idemp-boleto-unique-02',
      });

      expect(result.billing_type).toBe('BOLETO');
      expect(result.bank_slip_digitable_line).toBeDefined();
    });
  });

  describe('createCharge() — Idempotência Estrita', () => {
    it('deve retornar cobrança existente sem chamar gateway quando idempotency_key repetir', async () => {
      const existingCharge: FinancialCharge = {
        id: 'charge-existing-1',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: 'pay_already_emitted',
        idempotency_key: 'duplicate-key-12345',
        billing_type: 'PIX',
        status: 'AWAITING_PAYMENT',
        amount_cents: 5000,
        due_date: '2026-10-10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.findByIdempotencyKey).mockResolvedValueOnce(existingCharge);

      const result = await service.createCharge({
        customer_id: CUSTOMER_ID,
        amount_cents: 5000,
        billing_type: 'PIX',
        due_date: '2026-10-10',
        idempotency_key: 'duplicate-key-12345',
      });

      expect(result).toEqual(existingCharge);
      expect(mockProvider.createCharge).not.toHaveBeenCalled();
      expect(mockChargeRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('createCharge() — Resiliência a Timeout', () => {
    it('deve transicionar para PENDING_RECONCILIATION em caso de timeout do Asaas', async () => {
      vi.mocked(mockChargeRepo.findByIdempotencyKey).mockResolvedValueOnce(null);
      vi.mocked(mockProvider.createCharge).mockRejectedValueOnce(new AsaasTimeoutError('/payments'));

      const reconciliationCharge: FinancialCharge = {
        id: 'charge-reconcil-1',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: null,
        idempotency_key: 'timeout-idemp-key-99',
        billing_type: 'PIX',
        status: 'PENDING_RECONCILIATION',
        amount_cents: 8000,
        due_date: '2026-10-10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.create).mockResolvedValueOnce(reconciliationCharge);

      const result = await service.createCharge({
        customer_id: CUSTOMER_ID,
        amount_cents: 8000,
        billing_type: 'PIX',
        due_date: '2026-10-10',
        idempotency_key: 'timeout-idemp-key-99',
      });

      expect(result.status).toBe('PENDING_RECONCILIATION');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHARGE_CREATED_PENDING_RECONCILIATION',
        })
      );
    });
  });

  describe('cancelCharge()', () => {
    it('deve cancelar cobrança no gateway e atualizar status para CANCELLED', async () => {
      const charge: FinancialCharge = {
        id: 'charge-cancel-1',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: 'pay_to_be_cancelled',
        idempotency_key: 'cancel-key-01',
        billing_type: 'PIX',
        status: 'AWAITING_PAYMENT',
        amount_cents: 10000,
        due_date: '2026-10-10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.findById).mockResolvedValueOnce(charge);
      vi.mocked(mockChargeRepo.updateStatus).mockResolvedValueOnce({
        ...charge,
        status: 'CANCELLED',
      });

      const cancelled = await service.cancelCharge('charge-cancel-1');

      expect(cancelled.status).toBe('CANCELLED');
      expect(mockProvider.cancelCharge).toHaveBeenCalledWith('pay_to_be_cancelled');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHARGE_CANCELLED',
        })
      );
    });

    it('deve rejeitar cancelamento se a cobrança já estiver PAID', async () => {
      const paidCharge: FinancialCharge = {
        id: 'charge-paid-1',
        organization_id: ORG_ID,
        account_id: ACCOUNT_ID,
        customer_id: CUSTOMER_ID,
        provider: 'asaas',
        external_id: 'pay_already_paid',
        idempotency_key: 'paid-key-01',
        billing_type: 'PIX',
        status: 'PAID',
        amount_cents: 10000,
        due_date: '2026-10-10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockChargeRepo.findById).mockResolvedValueOnce(paidCharge);

      await expect(service.cancelCharge('charge-paid-1')).rejects.toThrow(FinancialDomainError);
      expect(mockProvider.cancelCharge).not.toHaveBeenCalled();
    });
  });
});
