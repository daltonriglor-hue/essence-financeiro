import { describe, it, expect, vi } from 'vitest';
import type { PaymentProvider } from '../src/modules/financial/providers/payment-provider.interface';

describe('PaymentProvider SPI Interface', () => {
  it('deve aceitar implementação mock que satisfaz o contrato SPI', () => {
    const mockProvider: PaymentProvider = {
      providerName: 'mock-provider',

      testConnection: vi.fn().mockResolvedValue(true),

      getAccountInfo: vi.fn().mockResolvedValue({
        name: 'Essence Comércio Digital',
        email: 'financeiro@essence.com.br',
        cpfCnpj: '12345678000190',
      }),

      createCustomer: vi.fn().mockResolvedValue({
        externalId: 'cust_mock_001',
        name: 'Cliente Teste',
        cpfCnpj: '12345678901',
      }),
      getCustomer: vi.fn().mockResolvedValue({
        externalId: 'cust_mock_001',
        name: 'Cliente Teste',
        cpfCnpj: '12345678901',
      }),

      createCharge: vi.fn().mockResolvedValue({
        externalId: 'pay_mock_001',
        status: 'PENDING',
        value: 129.99,
        billingType: 'PIX',
        dueDate: '2026-09-30',
        pixQrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
        pixCopyPaste: '00020126580014br.gov.bcb.pix...',
      }),
      getCharge: vi.fn().mockResolvedValue({
        externalId: 'pay_mock_001',
        status: 'RECEIVED',
        value: 129.99,
        billingType: 'PIX',
        dueDate: '2026-09-30',
      }),
      cancelCharge: vi.fn().mockResolvedValue(undefined),

      createSubscription: vi.fn().mockResolvedValue({
        externalId: 'sub_mock_001',
        status: 'ACTIVE',
        billingType: 'PIX',
        cycle: 'MONTHLY',
        value: 299.00,
        nextDueDate: '2026-10-01',
      }),
      getSubscription: vi.fn().mockResolvedValue({
        externalId: 'sub_mock_001',
        status: 'ACTIVE',
        billingType: 'PIX',
        cycle: 'MONTHLY',
        value: 299.00,
        nextDueDate: '2026-10-01',
      }),
      cancelSubscription: vi.fn().mockResolvedValue(undefined),
    };

    // Validar que o contrato é satisfeito
    expect(mockProvider.providerName).toBe('mock-provider');
    expect(typeof mockProvider.testConnection).toBe('function');
    expect(typeof mockProvider.getAccountInfo).toBe('function');
    expect(typeof mockProvider.createCustomer).toBe('function');
    expect(typeof mockProvider.getCustomer).toBe('function');
    expect(typeof mockProvider.createCharge).toBe('function');
    expect(typeof mockProvider.getCharge).toBe('function');
    expect(typeof mockProvider.cancelCharge).toBe('function');
    expect(typeof mockProvider.createSubscription).toBe('function');
    expect(typeof mockProvider.getSubscription).toBe('function');
    expect(typeof mockProvider.cancelSubscription).toBe('function');
  });

  it('mock deve retornar dados coerentes ao criar cobrança', async () => {
    const mockProvider: PaymentProvider = {
      providerName: 'asaas-mock',
      testConnection: vi.fn().mockResolvedValue(true),
      getAccountInfo: vi.fn(),
      createCustomer: vi.fn(),
      getCustomer: vi.fn(),
      createCharge: vi.fn().mockResolvedValue({
        externalId: 'pay_asaas_001',
        status: 'PENDING',
        value: 100.00,
        billingType: 'PIX',
        dueDate: '2026-10-15',
        pixQrCodeBase64: 'base64data',
        pixCopyPaste: 'pixcopypaste',
      }),
      getCharge: vi.fn(),
      cancelCharge: vi.fn(),
      createSubscription: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    };

    const charge = await mockProvider.createCharge({
      customerId: 'cust_001',
      billingType: 'PIX',
      value: 100.00,
      dueDate: '2026-10-15',
    });

    expect(charge.externalId).toBe('pay_asaas_001');
    expect(charge.status).toBe('PENDING');
    expect(charge.pixCopyPaste).toBe('pixcopypaste');
  });
});
