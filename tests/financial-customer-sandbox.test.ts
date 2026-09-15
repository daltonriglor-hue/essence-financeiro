/**
 * 🧪 Teste de Integração Real — Financial Customers no Asaas Sandbox
 *
 * Valida a criação e recuperação real de cliente pagador no gateway Asaas.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

/**
 * Gera um CPF de teste matematicamente válido para o Sandbox do Asaas.
 */
function generateValidTestCpf(): string {
  const rnd = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, rnd);
  let d1 = n.reduce((total, num, idx) => total + num * (10 - idx), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = [...n, d1].reduce((total, num, idx) => total + num * (11 - idx), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [...n, d1, d2].join('');
}

describe('Financial Customers — Integração Real no Asaas Sandbox', () => {
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

  it('deve criar um cliente pagador no Asaas Sandbox e recuperar os dados com sucesso', async () => {
    if (!hasApiKey) {
      console.warn('⚠️ ASAAS_SANDBOX_API_KEY não encontrada em .env.local. Pulando teste live.');
      return;
    }

    const provider = createAsaasProvider();
    const timestamp = Date.now();
    const uniqueContactId = `contact-test-${timestamp}`;
    const validCpf = generateValidTestCpf();

    // 1. Criação no Asaas Sandbox
    const created = await provider.createCustomer({
      name: `Cliente Teste Essence ${timestamp}`,
      cpfCnpj: validCpf,
      email: `teste.${timestamp}@essencecomercio.com.br`,
      phone: '11988887777',
      postalCode: '01310100',
      address: 'Avenida Paulista',
      addressNumber: '1000',
      province: 'Bela Vista',
      externalReference: uniqueContactId,
    });

    expect(created).toBeDefined();
    expect(created.externalId).toBeDefined();
    expect(created.externalId.startsWith('cus_')).toBe(true);
    expect(created.name).toContain('Cliente Teste Essence');

    // 2. Consulta pelo ID no Asaas Sandbox
    const fetched = await provider.getCustomer(created.externalId);

    expect(fetched).toBeDefined();
    expect(fetched.externalId).toBe(created.externalId);
    expect(fetched.name).toBe(created.name);
    expect(fetched.email).toBe(created.email);
  });
});
