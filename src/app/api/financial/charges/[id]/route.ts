/**
 * 🌐 REST API — /api/financial/charges/[id]
 *
 * Busca detalhada de cobrança por ID (financial.charges.view)
 */

import { NextResponse } from 'next/server';
import { withFinancialAuth } from '@/modules/financial/application/middleware';
import { FinancialChargeRepository } from '@/modules/financial/repositories/financial-charge.repository';
import { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import { FinancialAccountRepository } from '@/modules/financial/repositories/financial-account.repository';
import { FinancialChargeService } from '@/modules/financial/services/financial-charge.service';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

export const dynamic = 'force-dynamic';

export const GET = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    const chargeRepo = new FinancialChargeRepository(supabase, tenant.organizationId);
    const customerRepo = new FinancialCustomerRepository(supabase, tenant.organizationId);
    const accountRepo = new FinancialAccountRepository(supabase, tenant.organizationId);
    const provider = createAsaasProvider();

    const service = new FinancialChargeService(
      chargeRepo,
      customerRepo,
      accountRepo,
      provider,
      undefined,
      tenant.organizationId
    );

    const charge = await service.getChargeById(id);
    return NextResponse.json(charge);
  },
  'financial.charges.view'
);
