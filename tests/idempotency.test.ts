import { describe, it, expect, vi } from 'vitest';
import { generateIdempotencyKey, checkChargeIdempotency } from '../src/modules/financial/application/idempotency';
import { IdempotencyConflictError } from '../src/modules/financial/domain/errors';

describe('Idempotency Utilities', () => {
  describe('generateIdempotencyKey', () => {
    it('deve gerar chave com o prefixo fornecido', () => {
      const key = generateIdempotencyKey('charge', 'org-12345678-abcd');
      expect(key).toMatch(/^charge-org-1234/);
    });

    it('deve gerar chaves únicas para chamadas consecutivas', () => {
      const key1 = generateIdempotencyKey('charge', 'org-1');
      const key2 = generateIdempotencyKey('charge', 'org-1');
      expect(key1).not.toBe(key2);
    });

    it('deve conter pelo menos 8 caracteres', () => {
      const key = generateIdempotencyKey('sub', 'org-x');
      expect(key.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('checkChargeIdempotency', () => {
    it('deve retornar null quando a chave é nova (não utilizada)', async () => {
      const mockRepo = {
        findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      } as any;

      const result = await checkChargeIdempotency(mockRepo, 'new-key-001');
      expect(result).toBeNull();
      expect(mockRepo.findByIdempotencyKey).toHaveBeenCalledWith('new-key-001');
    });

    it('deve retornar cobrança existente quando a chave já foi usada (comportamento idempotente)', async () => {
      const existingCharge = {
        id: 'chg-existing',
        idempotency_key: 'existing-key',
        status: 'AWAITING_PAYMENT',
        amount_cents: 10000,
      };
      const mockRepo = {
        findByIdempotencyKey: vi.fn().mockResolvedValue(existingCharge),
      } as any;

      const result = await checkChargeIdempotency(mockRepo, 'existing-key');
      expect(result).toEqual(existingCharge);
    });

    it('deve lançar IdempotencyConflictError quando throwOnConflict é true', async () => {
      const existingCharge = {
        id: 'chg-conflict',
        idempotency_key: 'conflict-key',
      };
      const mockRepo = {
        findByIdempotencyKey: vi.fn().mockResolvedValue(existingCharge),
      } as any;

      await expect(
        checkChargeIdempotency(mockRepo, 'conflict-key', { throwOnConflict: true })
      ).rejects.toThrow('Operação já processada com a chave de idempotência: conflict-key');
    });
  });
});
