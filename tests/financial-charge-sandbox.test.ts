/**
 * 🧪 Teste de Integração Real — Emissão de Cobranças no Asaas Sandbox
 *
 * Valida a emissão real de Pix (QR Code + Copia e Cola), Boleto e Cancelamento.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

function generateValidTestCpf(): string {
  const rnd = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, rnd);
  let d1 = n.reduce((total, num, idx) => total + num * (10 - idx), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = [...n, d1].reduce((total, num, idx) => total + num * (11 - idx), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [...n, d1, d2].join('');
}

describe('Financial Charges — Integração Real no Asaas Sandbox', () => {
  let hasApiKey = false;

  beforeAll(() => {
    if (!process.env.ASAAS_SANDBOX_API_KEY) {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }

    hasApiKey = Boolean(process.env.ASAAS_SANDBOX_API_KEY && process.env.ASAAS_SANDBOX_API_KEY.length > 10);
  });

  it('deve emitir cobrança Pix com QR Code e Copia e Cola no Sandbox', async () => {
    if (!hasApiKey) {
      console.warn('⚠️ ASAAS_SANDBOX_API_KEY não encontrada em .env.local. Pulando teste live.');
      return;
    }

    const provider = createAsaasProvider();
    const timestamp = Date.now();
    const validCpf = generateValidTestCpf();

    // 1. Cria pagador no Asaas
    const customer = await provider.createCustomer({
      name: `Cliente Pix Teste ${timestamp}`,
      cpfCnpj: validCpf,
      email: `pix.${timestamp}@essencecomercio.com.br`,
      postalCode: '01310100',
      address: 'Av Paulista',
      addressNumber: '100',
    });

    // 2. Emite Cobrança Pix
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const charge = await provider.createCharge({
      customerId: customer.externalId,
      billingType: 'PIX',
      value: 15.0,
      dueDate,
      description: `Teste Pix Automatizado ${timestamp}`,
      externalReference: `idemp-pix-${timestamp}`,
    });

    expect(charge).toBeDefined();
    expect(charge.externalId.startsWith('pay_')).toBe(true);
    expect(charge.billingType).toBe('PIX');
    expect(charge.value).toBe(15.0);

    // Consulta Pix QR Code via helper direto ou na cobrança
    let pixData = charge.pixCopyPaste ? { payload: charge.pixCopyPaste } : null;
    if (!pixData) {
      pixData = await provider.getPixQrCode(charge.externalId);
    }

    expect(pixData).toBeDefined();
    expect(pixData.payload).toBeDefined();
    expect(pixData.payload.length).toBeGreaterThan(10);
  });

  it('deve emitir cobrança Boleto e realizar cancelamento com sucesso', async () => {
    if (!hasApiKey) return;

    const provider = createAsaasProvider();
    const timestamp = Date.now();
    const validCpf = generateValidTestCpf();

    // 1. Cria pagador no Asaas
    const customer = await provider.createCustomer({
      name: `Cliente Boleto Teste ${timestamp}`,
      cpfCnpj: validCpf,
      email: `boleto.${timestamp}@essencecomercio.com.br`,
      postalCode: '01310100',
      address: 'Av Paulista',
      addressNumber: '200',
    });

    // 2. Emite Cobrança Boleto
    const dueDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const charge = await provider.createCharge({
      customerId: customer.externalId,
      billingType: 'BOLETO',
      value: 30.0,
      dueDate,
      description: `Teste Boleto Automatizado ${timestamp}`,
      externalReference: `idemp-boleto-${timestamp}`,
    });

    expect(charge).toBeDefined();
    expect(charge.externalId.startsWith('pay_')).toBe(true);
    expect(charge.bankSlipUrl || charge.bankSlipDigitableLine || charge.invoiceUrl).toBeDefined();

    // 3. Cancela a cobrança emitida
    await provider.cancelCharge(charge.externalId);

    // 4. Confirma cancelamento
    const refreshed = await provider.getCharge(charge.externalId);
    expect(['CANCELLED', 'DELETED']).toContain(refreshed.status);
  });
});
