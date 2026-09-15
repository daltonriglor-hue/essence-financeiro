/**
 * 🌐 REST API — /api/financial/charges/[id]/cancel
 *
 * Cancelamento seguro de cobrança (financial.charges.cancel)
 */

import { NextResponse } from 'next/server';
import { withFinancialAuth } from '@/modules/financial/application/middleware';
import { FinancialChargeRepository } from '@/modules/financial/repositories/financial-charge.repository';
import { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import { FinancialAccountRepository } from '@/modules/financial/repositories/financial-account.repository';
import { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import { FinancialChargeService } from '@/modules/financial/services/financial-charge.service';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

export const dynamic = 'force-dynamic';

export const POST = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    // Formato da rota: /api/financial/charges/[id]/cancel -> o id é o penúltimo segmento
    const cancelIdx = pathSegments.indexOf('cancel');
    const id = cancelIdx > 0 ? pathSegments[cancelIdx - 1] : pathSegments[pathSegments.length - 2];

    const chargeRepo = new FinancialChargeRepository(supabase, tenant.organizationId);
    const customerRepo = new FinancialCustomerRepository(supabase, tenant.organizationId);
    const accountRepo = new FinancialAccountRepository(supabase, tenant.organizationId);
    const auditService = new FinancialAuditService(supabase, tenant);
    const provider = createAsaasProvider();

    const service = new FinancialChargeService(
      chargeRepo,
      customerRepo,
      accountRepo,
      provider,
      auditService,
      tenant.organizationId
    );

    const cancelledCharge = await service.cancelCharge(id);
    return NextResponse.json(cancelledCharge);
  },
  'financial.charges.cancel'
);
