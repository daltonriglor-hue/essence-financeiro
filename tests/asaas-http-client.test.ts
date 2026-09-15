import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AsaasHttpClient,
  AsaasHttpError,
  AsaasTimeoutError,
} from '@/modules/financial/providers/asaas/asaas-http-client';

describe('AsaasHttpClient — Resiliência, Headers e Segurança', () => {
  const FAKE_API_KEY = 'super_secret_sandbox_key_12345';
  const BASE_URL = 'https://sandbox.asaas.com/api/v3';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve injetar headers obrigatórios (access_token, User-Agent, Content-Type)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', status: 'OK' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
    });

    const result = await client.get('/myAccount');

    expect(result).toEqual({ id: '123', status: 'OK' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];

    expect(url).toBe('https://sandbox.asaas.com/api/v3/myAccount');
    expect(options.headers['access_token']).toBe(FAKE_API_KEY);
    expect(options.headers['User-Agent']).toBe('EssenceFinancial/1.0');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('deve injetar Idempotency-Key quando fornecido em requisições POST', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'charge_123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
    });

    await client.post('/payments', { value: 100 }, 'idemp-key-xyz-789');

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers['Idempotency-Key']).toBe('idemp-key-xyz-789');
  });

  it('deve realizar retries em erros transitórios 5xx com backoff', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 502,
          text: async () => 'Bad Gateway',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 3,
    });

    const result = await client.get<{ success: boolean }>('/health');
    expect(result).toEqual({ success: true });
    expect(callCount).toBe(3);
  });

  it('NÃO deve retentar em erros 4xx (falha rápida)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        errors: [{ code: 'invalid_cpf', description: 'CPF inválido' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 3,
    });

    await expect(client.get('/customers')).rejects.toThrow(AsaasHttpError);
    // Apenas 1 chamada — não desperdiça tempo com retries em erro de cliente
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('deve lançar AsaasTimeoutError em caso de aborto por timeout', async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
      maxRetries: 1,
      timeoutMs: 100,
    });

    await expect(client.get('/slow-endpoint')).rejects.toThrow(AsaasTimeoutError);
  });

  it('NUNCA deve expor a API Key na mensagem de erro', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        errors: [{ code: 'unauthorized', description: 'Chave de API inválida' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new AsaasHttpClient({
      apiKey: FAKE_API_KEY,
      baseUrl: BASE_URL,
    });

    try {
      await client.get('/test');
      expect.fail('Deveria ter lançado erro');
    } catch (error) {
      expect(error).toBeInstanceOf(AsaasHttpError);
      const errorMessage = (error as Error).message;
      expect(errorMessage).not.toContain(FAKE_API_KEY);
      expect(JSON.stringify(error)).not.toContain(FAKE_API_KEY);
    }
  });
});
