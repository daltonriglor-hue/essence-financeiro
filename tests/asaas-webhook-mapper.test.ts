import { describe, it, expect } from 'vitest';
import {
  mapAsaasStatusToEssence,
  mapAsaasWebhookEvent,
} from '@/modules/financial/providers/asaas/asaas-webhook-mapper';

describe('AsaasWebhookMapper — Mapeamento Canônico', () => {
  describe('mapAsaasStatusToEssence', () => {
    it('deve mapear status PENDING para AWAITING_PAYMENT', () => {
      expect(mapAsaasStatusToEssence('PENDING')).toBe('AWAITING_PAYMENT');
      expect(mapAsaasStatusToEssence('AWAITING_RISK_ANALYSIS')).toBe('AWAITING_PAYMENT');
    });

    it('deve mapear status de pagamento recebido para PAID', () => {
      expect(mapAsaasStatusToEssence('RECEIVED')).toBe('PAID');
      expect(mapAsaasStatusToEssence('CONFIRMED')).toBe('PAID');
      expect(mapAsaasStatusToEssence('RECEIVED_IN_CASH')).toBe('PAID');
      expect(mapAsaasStatusToEssence('DUNNING_RECEIVED')).toBe('PAID');
    });

    it('deve mapear OVERDUE e DUNNING_REQUESTED para OVERDUE', () => {
      expect(mapAsaasStatusToEssence('OVERDUE')).toBe('OVERDUE');
      expect(mapAsaasStatusToEssence('DUNNING_REQUESTED')).toBe('OVERDUE');
    });

    it('deve mapear estornos e contestações para REFUNDED', () => {
      expect(mapAsaasStatusToEssence('REFUNDED')).toBe('REFUNDED');
      expect(mapAsaasStatusToEssence('REFUND_REQUESTED')).toBe('REFUNDED');
      expect(mapAsaasStatusToEssence('CHARGEBACK_REQUESTED')).toBe('REFUNDED');
      expect(mapAsaasStatusToEssence('CHARGEBACK_DISPUTE')).toBe('REFUNDED');
    });

    it('deve mapear DELETED para CANCELLED', () => {
      expect(mapAsaasStatusToEssence('DELETED')).toBe('CANCELLED');
    });

    it('deve retornar PENDING_RECONCILIATION para qualquer status não reconhecido', () => {
      expect(mapAsaasStatusToEssence('SOME_FUTURE_UNKNOWN_STATUS')).toBe('PENDING_RECONCILIATION');
      expect(mapAsaasStatusToEssence('')).toBe('PENDING_RECONCILIATION');
    });
  });

  describe('mapAsaasWebhookEvent', () => {
    it('deve mapear eventos conhecidos do Asaas para nomes canônicos', () => {
      expect(mapAsaasWebhookEvent('PAYMENT_CREATED')).toBe('CHARGE_CREATED');
      expect(mapAsaasWebhookEvent('PAYMENT_RECEIVED')).toBe('CHARGE_PAID');
      expect(mapAsaasWebhookEvent('PAYMENT_CONFIRMED')).toBe('CHARGE_PAID');
      expect(mapAsaasWebhookEvent('PAYMENT_OVERDUE')).toBe('CHARGE_OVERDUE');
      expect(mapAsaasWebhookEvent('PAYMENT_DELETED')).toBe('CHARGE_CANCELLED');
      expect(mapAsaasWebhookEvent('PAYMENT_REFUNDED')).toBe('CHARGE_REFUNDED');
    });

    it('deve prefixar com UNKNOWN_ eventos não mapeados', () => {
      expect(mapAsaasWebhookEvent('CUSTOM_TEST_EVENT')).toBe('UNKNOWN_CUSTOM_TEST_EVENT');
    });
  });
});
