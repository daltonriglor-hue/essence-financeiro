import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialAccountService } from '../src/modules/financial/services/financial-account.service';
import type { TenantContext } from '../src/modules/financial/application/tenant-resolver';

// Mock do SupabaseClient
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    ...overrides,
  });

  return { from: mockFrom } as unknown as Parameters<typeof FinancialAccountService['prototype']['getDefaultAccount']> extends [] ? never : never;
}

const mockTenant: TenantContext = {
  userId: 'usr-test-001',
  organizationId: 'org-test-001',
  email: 'dalton@essence.com.br',
  role: 'org_admin',
};

describe('FinancialAccountService', () => {
  it('deve ser instanciável com supabase e tenant context', () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
      }),
    } as any;

    const service = new FinancialAccountService(mockSupabase, mockTenant);
    expect(service).toBeDefined();
  });

  it('getDefaultAccount deve retornar null quando nenhuma conta está configurada', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as any;

    const service = new FinancialAccountService(mockSupabase, mockTenant);
    const account = await service.getDefaultAccount();
    expect(account).toBeNull();
  });

  it('getDefaultAccount deve filtrar por organization_id e is_default', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-001',
            organization_id: 'org-test-001',
            provider: 'asaas',
            status: 'ACTIVE',
            is_default: true,
          },
          error: null,
        }),
      }),
    } as any;

    const service = new FinancialAccountService(mockSupabase, mockTenant);
    const account = await service.getDefaultAccount();

    expect(mockSupabase.from).toHaveBeenCalledWith('financial_accounts');
    expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-test-001');
    expect(eqMock).toHaveBeenCalledWith('is_default', true);
    expect(account?.status).toBe('ACTIVE');
  });
});
