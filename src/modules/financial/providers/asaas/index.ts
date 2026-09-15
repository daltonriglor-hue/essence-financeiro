/**
 * 📦 Asaas Provider Module — Barrel Export
 */

import { AsaasHttpClient } from './asaas-http-client';
import { AsaasProvider } from './asaas.provider';
import { getAsaasConfig, type AsaasConfig } from './asaas-config';

export * from './asaas-http-client';
export * from './asaas.provider';
export * from './asaas-config';
export * from './asaas-webhook-mapper';

/**
 * Factory para instanciar o AsaasProvider com configuração automática de ambiente.
 */
export function createAsaasProvider(overrideConfig?: Partial<AsaasConfig>): AsaasProvider {
  const config = getAsaasConfig(overrideConfig);
  const client = new AsaasHttpClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  });

  return new AsaasProvider(client, config.mode);
}
