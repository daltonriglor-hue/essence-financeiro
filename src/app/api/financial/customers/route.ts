/**
 * 🌐 REST API — /api/financial/customers
 *
 * Endpoints protegidos por autenticação, resolução de tenant e RBAC:
 * - GET: Lista clientes ou busca por crmContactId / id (financial.customers.view)
 * - POST: Cria ou sincroniza pagador no provedor externo (financial.customers.manage)
 */

import { NextResponse } from 'next/server';
import { withFinancialAuth } from '@/modules/financial/application/middleware';
import { FinancialCustomerRepository } from '@/modules/financial/repositories/financial-customer.repository';
import { FinancialAuditRepository } from '@/modules/financial/repositories/financial-audit.repository';
import { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import { FinancialCustomerService } from '@/modules/financial/services/financial-customer.service';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/financial/customers
 * Permissão: financial.customers.view
 */
export const GET = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const { searchParams } = new URL(request.url);
    const crmContactId = searchParams.get('crmContactId');
    const id = searchParams.get('id');
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 25;
    const search = searchParams.get('search') || undefined;

    const customerRepo = new FinancialCustomerRepository(supabase, tenant.organizationId);
    const provider = createAsaasProvider();
    const service = new FinancialCustomerService(customerRepo, provider, undefined, tenant.organizationId);

    if (id) {
      const customer = await service.getCustomerById(id);
      return NextResponse.json(customer);
    }

    if (crmContactId) {
      const customer = await service.getCustomerByContactId(crmContactId);
      if (!customer) {
        return NextResponse.json(
          { error: 'Cliente financeiro não encontrado para o contato informado', code: 'CUSTOMER_NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(customer);
    }

    const result = await service.listCustomers({ page, pageSize, search });
    return NextResponse.json(result);
  },
  'financial.customers.view'
);

/**
 * POST /api/financial/customers
 * Permissão: financial.customers.manage
 */
export const POST = withFinancialAuth(
  async (request, { tenant, supabase }) => {
    const body = await request.json();

    const customerRepo = new FinancialCustomerRepository(supabase, tenant.organizationId);
    const auditService = new FinancialAuditService(supabase, tenant);
    const provider = createAsaasProvider();

    const service = new FinancialCustomerService(
      customerRepo,
      provider,
      auditService,
      tenant.organizationId
    );

    const customer = await service.createOrSyncCustomer(body, tenant.userId);
    return NextResponse.json(customer, { status: 201 });
  },
  'financial.customers.manage'
);
