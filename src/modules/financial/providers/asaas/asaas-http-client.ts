/**
 * 🌐 AsaasHttpClient — Cliente HTTP Resiliente para o Gateway Asaas
 *
 * Princípios de segurança e resiliência:
 * - API Key NUNCA aparece em logs, erros ou responses ao cliente
 * - User-Agent identificador: EssenceFinancial/1.0
 * - Timeout configurável por operação
 * - Retry com backoff exponencial em falhas transitórias (5xx, timeouts de rede)
 * - Sanitização completa de dados sensíveis em todos os logs
 */

export interface AsaasHttpClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface AsaasRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  /** Chave de idempotência opcional para operações críticas */
  idempotencyKey?: string;
}

export class AsaasHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly asaasErrors?: Array<{ code: string; description: string }>
  ) {
    super(message);
    this.name = 'AsaasHttpError';
    Object.setPrototypeOf(this, AsaasHttpError.prototype);
  }
}

export class AsaasTimeoutError extends Error {
  constructor(endpoint: string) {
    // Nunca incluir API Key ou dados sensíveis na mensagem
    super(`[AsaasHttpClient] Timeout ao conectar com o endpoint: ${endpoint}`);
    this.name = 'AsaasTimeoutError';
    Object.setPrototypeOf(this, AsaasTimeoutError.prototype);
  }
}

export class AsaasHttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: AsaasHttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remover trailing slash
    this.timeoutMs = config.timeoutMs ?? 15_000; // 15 segundos padrão
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Executa requisição HTTP ao Asaas com retry e backoff exponencial.
   * NUNCA loga a API Key ou qualquer dado sensível.
   */
  async request<T>(endpoint: string, options: AsaasRequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method ?? 'GET';
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'EssenceFinancial/1.0',
          // API Key injetada via header — NUNCA exposta em logs
          'access_token': this.config.apiKey,
        };

        if (options.idempotencyKey) {
          headers['Idempotency-Key'] = options.idempotencyKey;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Sucesso: 2xx
        if (response.ok) {
          // Respostas 204 No Content (ex: cancelamento)
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        // Erro da API Asaas (4xx — não retentar)
        if (response.status >= 400 && response.status < 500) {
          const errorBody = await response.json().catch(() => ({}));
          const asaasErrors = (errorBody as { errors?: Array<{ code: string; description: string }> }).errors;
          const description = asaasErrors?.[0]?.description ?? `HTTP ${response.status} — ${endpoint}`;

          throw new AsaasHttpError(description, response.status, asaasErrors);
        }

        // Erro de servidor (5xx — retentar com backoff)
        const serverErrorBody = await response.text().catch(() => '');
        lastError = new AsaasHttpError(
          `[AsaasHttpClient] Erro de servidor ${response.status} no endpoint ${endpoint}`,
          response.status
        );

        // Suprimir corpo de resposta que pode conter dados sensíveis
        void serverErrorBody;

      } catch (error) {
        if (error instanceof AsaasHttpError) {
          // 4xx: não retentar
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new AsaasTimeoutError(endpoint);
        } else if (error instanceof Error) {
          lastError = error;
        }
      }

      // Backoff exponencial antes de retentar: 500ms, 1000ms, 2000ms...
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ─── Métodos Convenientes ──────────────────────────────────────────────────

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, idempotencyKey });
  }

  async put<T>(
    endpoint: string,
    body: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, idempotencyKey });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
