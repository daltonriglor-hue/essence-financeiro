import { describe, it, expect } from 'vitest';
import {
  createFinancialChargeSchema,
  createFinancialCustomerSchema,
  createFinancialSubscriptionSchema,
  updateFinancialSettingsSchema,
} from '../src/modules/financial/schemas';

describe('Financial Domain Zod Schemas', () => {
  describe('createFinancialChargeSchema', () => {
    it('deve validar com sucesso uma cobrança válida com amount_cents inteiro positivo', () => {
      const payload = {
        customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_cents: 129900, // R$ 1.299,00
        billing_type: 'PIX',
        due_date: '2026-09-30',
        idempotency_key: 'idem-charge-20260914-001',
        description: 'Assinatura Plano Pro',
      };

      const result = createFinancialChargeSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount_cents).toBe(129900);
        expect(result.data.billing_type).toBe('PIX');
      }
    });

    it('deve rejeitar cobrança com valor não inteiro (ponto flutuante)', () => {
      const payload = {
        customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_cents: 1299.5, // Inválido: deve ser centavos inteiros
        billing_type: 'PIX',
        due_date: '2026-09-30',
        idempotency_key: 'idem-charge-20260914-002',
      };

      const result = createFinancialChargeSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número inteiro');
      }
    });

    it('deve rejeitar cobrança com valor zerado ou negativo', () => {
      const payloadZero = {
        customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_cents: 0,
        billing_type: 'PIX',
        due_date: '2026-09-30',
        idempotency_key: 'idem-charge-20260914-003',
      };

      const result = createFinancialChargeSchema.safeParse(payloadZero);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar data de vencimento fora do formato AAAA-MM-DD', () => {
      const payload = {
        customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_cents: 5000,
        billing_type: 'BOLETO',
        due_date: '30/09/2026', // Inválido
        idempotency_key: 'idem-charge-20260914-004',
      };

      const result = createFinancialChargeSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('createFinancialCustomerSchema', () => {
    it('deve validar cliente com CPF formatado ou desformatado', () => {
      const validCustomer = {
        crm_contact_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Dalton Ribeiro',
        document_number: '12345678901',
        customer_type: 'INDIVIDUAL',
        email: 'dalton@essence.com.br',
      };

      const result = createFinancialCustomerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    it('deve validar cliente pessoa jurídica com CNPJ formatado', () => {
      const validCompany = {
        crm_contact_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Essence Comércio Digital LTDA',
        document_number: '12.345.678/0001-90',
        customer_type: 'COMPANY',
        email: 'financeiro@essence.com.br',
      };

      const result = createFinancialCustomerSchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar documento com quantidade inválida de dígitos', () => {
      const invalidDoc = {
        crm_contact_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Contato Teste',
        document_number: '12345', // Nem CPF nem CNPJ
      };

      const result = createFinancialCustomerSchema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
    });
  });

  describe('createFinancialSubscriptionSchema', () => {
    it('deve validar assinatura recorrente com ciclo mensal', () => {
      const sub = {
        customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: 'Plano Pro Recorrente',
        billing_type: 'CREDIT_CARD',
        cycle: 'MONTHLY',
        amount_cents: 29900,
        next_due_date: '2026-10-01',
        idempotency_key: 'sub-idemp-2026-001',
      };

      const result = createFinancialSubscriptionSchema.safeParse(sub);
      expect(result.success).toBe(true);
    });
  });

  describe('updateFinancialSettingsSchema', () => {
    it('deve validar configurações padrão da organização', () => {
      const settings = {
        default_payment_methods: ['PIX', 'BOLETO'],
        default_days_to_due: 3,
        fine_percentage: 2.0,
        monthly_interest_percentage: 1.0,
        auto_reconcile: true,
      };

      const result = updateFinancialSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar percentuais negativos de multa ou juros', () => {
      const invalidSettings = {
        default_payment_methods: ['PIX'],
        default_days_to_due: 3,
        fine_percentage: -5.0,
        monthly_interest_percentage: 1.0,
      };

      const result = updateFinancialSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });
  });
});
