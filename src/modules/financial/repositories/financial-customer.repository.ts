/**
 * 🗄️ Financial Customer Repository — Persistência de Clientes/Pagadores Financeiros
 * 
 * Vínculo CRM → Financeiro com isolamento multi-tenant.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialCustomer } from '../domain/types';
import { EntityNotFoundError } from '../domain/errors';

export class FinancialCustomerRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId: string
  ) {}

  /**
   * Busca cliente financeiro pelo ID.
   */
  async findById(id: string): Promise<FinancialCustomer> {
    const { data, error } = await this.supabase
      .from('financial_customers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      throw new EntityNotFoundError('financial_customers', id);
    }
    return data;
  }

  /**
   * Busca cliente financeiro pelo ID do contato no CRM.
   * Útil para verificar se já existe mapeamento financeiro.
   */
  async findByCrmContactId(crmContactId: string): Promise<FinancialCustomer | null> {
    const { data, error } = await this.supabase
      .from('financial_customers')
      .select('*')
      .eq('crm_contact_id', crmContactId)
      .eq('organization_id', this.organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Busca cliente financeiro pelo ID externo no provedor (ex: Asaas customer ID).
   */
  async findByExternalId(externalId: string): Promise<FinancialCustomer | null> {
    const { data, error } = await this.supabase
      .from('financial_customers')
      .select('*')
      .eq('external_customer_id', externalId)
      .eq('organization_id', this.organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Cria um novo cliente financeiro vinculado a um contato do CRM.
   */
  async create(params: Omit<FinancialCustomer, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialCustomer> {
    const { data, error } = await this.supabase
      .from('financial_customers')
      .insert({
        ...params,
        organization_id: this.organizationId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza o ID externo do provedor (após criação no Asaas, por exemplo).
   */
  async updateExternalId(id: string, externalCustomerId: string): Promise<FinancialCustomer> {
    const { data, error } = await this.supabase
      .from('financial_customers')
      .update({
        external_customer_id: externalCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new EntityNotFoundError('financial_customers', id);
    }
    return data;
  }

  /**
   * Lista clientes financeiros da organização com paginação.
   */
  async findAll(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ data: FinancialCustomer[]; count: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('financial_customers')
      .select('*', { count: 'exact' })
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params?.search) {
      query = query.or(
        `name.ilike.%${params.search}%,document_number.ilike.%${params.search}%,email.ilike.%${params.search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
