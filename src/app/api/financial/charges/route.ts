/**
 * 🌐 REST API — /api/financial/charges
 *
 * Endpoints protegidos por autenticação, resolução de tenant e RBAC:
 * - GET: Lista cobranças avulsas com filtros e paginação (financial.charges.view)
 * - POST: Emite nova cobrança com controle de idempotência (financial.charges.create)
 */

import { NextResponse } from 'next/server';
import { withFinancialAuth } from '@/modules/financial/application/middleware';
import { FinancialChargeRepository } from '@/modules/financial/repositories/financial-charge.repository';
import { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import { FinancialAccountRepository } from '@/modules/financial/repositories/financial-account.repository';
import { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import { FinancialChargeService } from '@/modules/financial/services/financial-charge.service';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';
import type { FinancialChargeStatus } from '@/modules/financial/domain/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/financial/charges
 * Permissão: financial.charges.view
 */
export const GET = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 25;
    const status = searchParams.get('status') as FinancialChargeStatus | null;
    const customerId = searchParams.get('customerId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

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

    const result = await service.listCharges({
      page,
      pageSize,
      status: status || undefined,
      customerId,
      fromDate,
      toDate,
    });

    return NextResponse.json(result);
  },
  'financial.charges.view'
);

/**
 * POST /api/financial/charges
 * Permissão: financial.charges.create
 */
export const POST = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const body = await request.json();

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

    const charge = await service.createCharge(body, tenant.userId);
    return NextResponse.json(charge, { status: 201 });
  },
  'financial.charges.create'
);
