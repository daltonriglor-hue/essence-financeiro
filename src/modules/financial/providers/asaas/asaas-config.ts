/**
 * ⚙️ AsaasConfig — Gerenciador de Configuração do Asaas
 *
 * Gerencia a resolução de credenciais para ambientes SANDBOX e PRODUCTION.
 * Garante que chaves de API nunca sejam expostas ao cliente frontend.
 */

export type AsaasEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
  mode: AsaasEnvironment;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const DEFAULT_PRODUCTION_URL = 'https://api.asaas.com/v3';

/**
 * Resolve a configuração do Asaas para o ambiente.
 * Prioriza variáveis de ambiente (.env.local / process.env) ou override explícito.
 */
export function getAsaasConfig(override?: Partial<AsaasConfig>): AsaasConfig {
  const mode: AsaasEnvironment =
    override?.mode ??
    (process.env.ASAAS_ENVIRONMENT === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX');

  const apiKey =
    override?.apiKey ||
    (mode === 'PRODUCTION'
      ? process.env.ASAAS_API_KEY
      : process.env.ASAAS_SANDBOX_API_KEY) ||
    '';

  const defaultUrl = mode === 'PRODUCTION' ? DEFAULT_PRODUCTION_URL : DEFAULT_SANDBOX_URL;
  const baseUrl =
    override?.baseUrl ||
    (mode === 'PRODUCTION'
      ? process.env.ASAAS_PRODUCTION_URL || defaultUrl
      : process.env.ASAAS_SANDBOX_URL || defaultUrl);

  return {
    apiKey,
    baseUrl,
    mode,
    timeoutMs: override?.timeoutMs ?? 15_000,
    maxRetries: override?.maxRetries ?? 3,
  };
}
