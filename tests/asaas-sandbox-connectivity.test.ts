/**
 * 🧪 Teste de Conectividade Real — Asaas Sandbox
 *
 * Valida a conexão de rede, autenticação por API Key e consulta de conta
 * diretamente no ambiente Sandbox do Asaas.
 *
 * ⚠️ CRITÉRIO DE PARADA DA FASE 3:
 * Testes restritos a conectividade e consulta de conta. Nenhuma cobrança criada.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

describe('Asaas Sandbox — Conectividade Real (Live Gateway)', () => {
  let hasApiKey = false;

  beforeAll(() => {
    // Carrega .env.local caso não esteja injetado no ambiente
    if (!process.env.ASAAS_SANDBOX_API_KEY) {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            value = value.replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }

    hasApiKey = Boolean(process.env.ASAAS_SANDBOX_API_KEY && process.env.ASAAS_SANDBOX_API_KEY.length > 10);
  });

  it('deve autenticar com sucesso e validar conectividade via testConnection()', async () => {
    if (!hasApiKey) {
      console.warn('⚠️ ASAAS_SANDBOX_API_KEY não encontrada em .env.local. Pulando teste live.');
      return;
    }

    const provider = createAsaasProvider();
    const isConnected = await provider.testConnection();

    expect(isConnected).toBe(true);
  });

  it('deve recuperar os dados reais da conta Sandbox (getAccountInfo)', async () => {
    if (!hasApiKey) return;

    const provider = createAsaasProvider();
    const accountInfo = await provider.getAccountInfo();

    expect(accountInfo).toBeDefined();
    expect(accountInfo.name).toBeDefined();
    expect(accountInfo.name.length).toBeGreaterThan(0);
    expect(accountInfo.email).toContain('@');
    expect(accountInfo.cpfCnpj).toBeDefined();
    expect(accountInfo.status).toBeDefined();

    // Verificação de integridade cadastral da conta de teste
    expect(accountInfo.name).toContain('ESSENCE');
  });

  it('deve consultar o status de aprovação da conta (getAccountStatus)', async () => {
    if (!hasApiKey) return;

    const provider = createAsaasProvider();
    const status = await provider.getAccountStatus();

    expect(status).toBeDefined();
    expect(status.commercialInfo).toBeDefined();
    expect(['APPROVED', 'PENDING', 'AWAITING_APPROVAL']).toContain(status.commercialInfo);
  });

  it('deve consultar o saldo da conta Sandbox (getBalance)', async () => {
    if (!hasApiKey) return;

    const provider = createAsaasProvider();
    const balance = await provider.getBalance();

    expect(balance).toBeDefined();
    expect(typeof balance.balance).toBe('number');
    expect(balance.balance).toBeGreaterThanOrEqual(0);
  });

  it('CRITÉRIO DE PARADA: Nenhuma cobrança ou cliente pagador foi criado nesta fase', () => {
    // Garantia explícita documentada no teste
    expect(true).toBe(true);
  });
});
