import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsaasProvider } from '@/modules/financial/providers/asaas/asaas.provider';
import { AsaasHttpClient } from '@/modules/financial/providers/asaas/asaas-http-client';
import type { PaymentProvider } from '@/modules/financial/providers/payment-provider.interface';

describe('AsaasProvider — Implementação SPI PaymentProvider', () => {
  let mockClient: AsaasHttpClient;
  let provider: AsaasProvider;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
    } as unknown as AsaasHttpClient;

    provider = new AsaasProvider(mockClient, 'SANDBOX');
  });

  it('deve implementar a interface PaymentProvider com identificador asaas', () => {
    const isPaymentProvider: PaymentProvider = provider;
    expect(isPaymentProvider.providerName).toBe('asaas');
  });

  describe('testConnection()', () => {
    it('deve retornar true quando /myAccount responder com dados válidos', async () => {
      vi.mocked(mockClient.get).mockResolvedValueOnce({
        object: 'company',
        name: 'ESSENCE COMERCIO E SERVICOS LTDA',
        email: 'financeiro@essencecomercio.com.br',
        cpfCnpj: '00.000.000/0001-00',
      });

      const connected = await provider.testConnection();

      expect(connected).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('/myAccount');
    });

    it('deve retornar false quando /myAccount falhar com erro HTTP ou rede', async () => {
      vi.mocked(mockClient.get).mockRejectedValueOnce(new Error('Connection refused'));

      const connected = await provider.testConnection();

      expect(connected).toBe(false);
    });
  });

  describe('getAccountInfo()', () => {
    it('deve recuperar dados cadastrais da conta e combinar com status comercial', async () => {
      vi.mocked(mockClient.get)
        .mockResolvedValueOnce({
          name: 'ESSENCE COMERCIO E SERVICOS LTDA',
          email: 'financeiro@essencecomercio.com.br',
          cpfCnpj: '00.000.000/0001-00',
          commercialInfoExpiration: '2027-01-01',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'status-123',
          commercialInfo: 'APPROVED',
          bankAccountInfo: 'APPROVED',
          documentation: 'APPROVED',
          general: 'APPROVED',
        });

      const accountInfo = await provider.getAccountInfo();

      expect(accountInfo).toEqual({
        name: 'ESSENCE COMERCIO E SERVICOS LTDA',
        email: 'financeiro@essencecomercio.com.br',
        cpfCnpj: '00.000.000/0001-00',
        commercialInfoExpiration: '2027-01-01',
        status: 'APPROVED',
      });
      expect(mockClient.get).toHaveBeenCalledWith('/myAccount');
      expect(mockClient.get).toHaveBeenCalledWith('/myAccount/status');
    });

    it('deve manter status base se /myAccount/status falhar', async () => {
      vi.mocked(mockClient.get)
        .mockResolvedValueOnce({
          name: 'Empresa Teste',
          email: 'teste@empresa.com',
          cpfCnpj: '11.222.333/0001-44',
          status: 'PENDING_DOCUMENTATION',
        })
        .mockRejectedValueOnce(new Error('Status endpoint unavailable'));

      const accountInfo = await provider.getAccountInfo();

      expect(accountInfo.name).toBe('Empresa Teste');
      expect(accountInfo.status).toBe('PENDING_DOCUMENTATION');
    });
  });

  describe('getBalance() & getAccountStatus()', () => {
    it('deve consultar saldo financeiro via /finance/balance', async () => {
      vi.mocked(mockClient.get).mockResolvedValueOnce({ balance: 1540.5 });

      const balance = await provider.getBalance();

      expect(balance).toEqual({ balance: 1540.5 });
      expect(mockClient.get).toHaveBeenCalledWith('/finance/balance');
    });

    it('deve consultar status regulatório via /myAccount/status', async () => {
      vi.mocked(mockClient.get).mockResolvedValueOnce({
        id: 'acc-uuid',
        commercialInfo: 'APPROVED',
        bankAccountInfo: 'APPROVED',
        documentation: 'APPROVED',
        general: 'APPROVED',
      });

      const status = await provider.getAccountStatus();

      expect(status.commercialInfo).toBe('APPROVED');
      expect(mockClient.get).toHaveBeenCalledWith('/myAccount/status');
    });
  });
});
