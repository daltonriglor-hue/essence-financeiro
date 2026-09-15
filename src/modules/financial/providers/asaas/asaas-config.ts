/**
 * ⚙️ AsaasConfig — Gerenciador de Configuração do Asaas
 *
 * Gerencia a resolução de credenciais para ambientes SANDBOX e PRODUCTION.
 * Garante que chaves de API nunca sejam expostas ao cliente frontend.
 */

import fs from 'fs';
import path from 'path';

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
 * Lê variável de ambiente com fallback para .env.local (caso o dev server tenha sido
 * iniciado antes do arquivo ser populado).
 */
function resolveEnv(key: string, defaultValue = ''): string {
  if (process.env[key]) {
    return process.env[key]!;
  }

  try {
    if (typeof window === 'undefined') {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm');
        const match = content.match(regex);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = val;
          return val;
        }
      }
    }
  } catch {
    // Ignora em caso de restrição de ambiente
  }

  return defaultValue;
}

/**
 * Resolve a configuração do Asaas para o ambiente.
 * Prioriza override explícito, variáveis de ambiente ou .env.local.
 */
export function getAsaasConfig(override?: Partial<AsaasConfig>): AsaasConfig {
  const envMode = resolveEnv('ASAAS_ENVIRONMENT', 'SANDBOX');
  const mode: AsaasEnvironment =
    override?.mode ?? (envMode === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX');

  const apiKey =
    override?.apiKey ||
    (mode === 'PRODUCTION'
      ? resolveEnv('ASAAS_API_KEY')
      : resolveEnv('ASAAS_SANDBOX_API_KEY')) ||
    '';

  const defaultUrl = mode === 'PRODUCTION' ? DEFAULT_PRODUCTION_URL : DEFAULT_SANDBOX_URL;
  const baseUrl =
    override?.baseUrl ||
    (mode === 'PRODUCTION'
      ? resolveEnv('ASAAS_PRODUCTION_URL', defaultUrl)
      : resolveEnv('ASAAS_SANDBOX_URL', defaultUrl));

  return {
    apiKey,
    baseUrl,
    mode,
    timeoutMs: override?.timeoutMs ?? 15_000,
    maxRetries: override?.maxRetries ?? 3,
  };
}
