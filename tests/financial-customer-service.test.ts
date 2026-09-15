import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialCustomerService } from '@/modules/financial/services/financial-customer.service';
import type { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import type { PaymentProvider } from '@/modules/financial/providers/payment-provider.interface';
import type { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import type { FinancialCustomer } from '@/modules/financial/domain/types';
import { ValidationError } from '@/modules/financial/domain/errors';

describe('FinancialCustomerService — Sincronização e Idempotência', () => {
  const ORG_ID = '11111111-1111-1111-1111-111111111111';
  const CONTACT_ID = '22222222-2222-2222-2222-222222222222';

  let mockRepo: FinancialCustomerRepository;
  let mockProvider: PaymentProvider;
  let mockAudit: FinancialAuditService;
  let service: FinancialCustomerService;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByCrmContactId: vi.fn(),
      findByExternalId: vi.fn(),
      create: vi.fn(),
      updateExternalId: vi.fn(),
      findAll: vi.fn(),
    } as unknown as FinancialCustomerRepository;

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
      getEntityHistory: vi.fn(),
      getRecentActivity: vi.fn(),
    } as unknown as FinancialAuditService;

    service = new FinancialCustomerService(mockRepo, mockProvider, mockAudit, ORG_ID);
  });

  describe('createOrSyncCustomer()', () => {
    it('deve criar novo cliente no Asaas e persistir localmente com auditoria', async () => {
      vi.mocked(mockRepo.findByCrmContactId).mockResolvedValueOnce(null);

      vi.mocked(mockProvider.createCustomer).mockResolvedValueOnce({
        externalId: 'cus_asaas_123',
        name: 'Dalton Ribeiro',
        cpfCnpj: '00000000000',
        email: 'dalton@essence.com',
      });

      const fakeSavedCustomer: FinancialCustomer = {
        id: 'cust-uuid-1',
        organization_id: ORG_ID,
        crm_contact_id: CONTACT_ID,
        provider: 'asaas',
        external_customer_id: 'cus_asaas_123',
        customer_type: 'INDIVIDUAL',
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
        email: 'dalton@essence.com',
        phone: '11999999999',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockRepo.create).mockResolvedValueOnce(fakeSavedCustomer);

      const result = await service.createOrSyncCustomer({
        crm_contact_id: CONTACT_ID,
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
        email: 'dalton@essence.com',
        phone: '11999999999',
      });

      expect(result.external_customer_id).toBe('cus_asaas_123');
      expect(mockProvider.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dalton Ribeiro',
          cpfCnpj: '00000000000',
          externalReference: CONTACT_ID,
        })
      );
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATED',
          entityName: 'financial_customers',
        })
      );
    });

    it('IDEMPOTÊNCIA: deve retornar cliente existente sem chamar o provedor novamente', async () => {
      const existingCustomer: FinancialCustomer = {
        id: 'cust-existing-1',
        organization_id: ORG_ID,
        crm_contact_id: CONTACT_ID,
        provider: 'asaas',
        external_customer_id: 'cus_already_exists_999',
        customer_type: 'INDIVIDUAL',
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
        email: 'dalton@essence.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockRepo.findByCrmContactId).mockResolvedValueOnce(existingCustomer);

      const result = await service.createOrSyncCustomer({
        crm_contact_id: CONTACT_ID,
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
        email: 'dalton@essence.com',
      });

      expect(result).toEqual(existingCustomer);
      expect(mockProvider.createCustomer).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('deve vincular ID do provedor se cliente local existia sem external_customer_id', async () => {
      const pendingCustomer: FinancialCustomer = {
        id: 'cust-pending-1',
        organization_id: ORG_ID,
        crm_contact_id: CONTACT_ID,
        provider: 'asaas',
        external_customer_id: null,
        customer_type: 'INDIVIDUAL',
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockRepo.findByCrmContactId).mockResolvedValueOnce(pendingCustomer);

      vi.mocked(mockProvider.createCustomer).mockResolvedValueOnce({
        externalId: 'cus_newly_generated_888',
        name: 'Dalton Ribeiro',
        cpfCnpj: '00000000000',
      });

      const updatedCustomer: FinancialCustomer = {
        ...pendingCustomer,
        external_customer_id: 'cus_newly_generated_888',
      };

      vi.mocked(mockRepo.updateExternalId).mockResolvedValueOnce(updatedCustomer);

      const result = await service.createOrSyncCustomer({
        crm_contact_id: CONTACT_ID,
        name: 'Dalton Ribeiro',
        document_number: '00000000000',
      });

      expect(result.external_customer_id).toBe('cus_newly_generated_888');
      expect(mockRepo.updateExternalId).toHaveBeenCalledWith('cust-pending-1', 'cus_newly_generated_888');
    });

    it('deve rejeitar com ValidationError se o documento ou nome forem inválidos', async () => {
      await expect(
        service.createOrSyncCustomer({
          crm_contact_id: CONTACT_ID,
          name: '', // Inválido
          document_number: '123', // Inválido
        })
      ).rejects.toThrow(ValidationError);

      expect(mockProvider.createCustomer).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('syncWithProvider()', () => {
    it('deve sincronizar dados do cliente a partir do gateway e registrar auditoria', async () => {
      const customer: FinancialCustomer = {
        id: 'cust-sync-1',
        organization_id: ORG_ID,
        crm_contact_id: CONTACT_ID,
        provider: 'asaas',
        external_customer_id: 'cus_remote_111',
        customer_type: 'INDIVIDUAL',
        name: 'Dalton Antigo',
        document_number: '00000000000',
        email: 'antigo@essence.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(mockRepo.findById).mockResolvedValueOnce(customer);
      vi.mocked(mockProvider.getCustomer).mockResolvedValueOnce({
        externalId: 'cus_remote_111',
        name: 'Dalton Atualizado',
        cpfCnpj: '00000000000',
        email: 'novo@essence.com',
      });

      const synced = await service.syncWithProvider('cust-sync-1');

      expect(synced.id).toBe('cust-sync-1');
      expect(mockProvider.getCustomer).toHaveBeenCalledWith('cus_remote_111');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_SYNCED',
          entityId: 'cust-sync-1',
        })
      );
    });
  });
});
