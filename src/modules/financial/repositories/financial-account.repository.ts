/**
 * 🗄️ Financial Account Repository — Persistência de Contas Financeiras
 * 
 * Todas as queries são isoladas por organization_id (RLS + aplicação).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAccount, FinancialAccountStatus } from '../domain/types';
import { EntityNotFoundError } from '../domain/errors';

export class FinancialAccountRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId: string
  ) {}

  /**
   * Busca a conta financeira padrão (is_default = true) da organização.
   */
  async findDefaultAccount(): Promise<FinancialAccount | null> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Busca conta financeira pelo ID.
   */
  async findById(id: string): Promise<FinancialAccount> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      throw new EntityNotFoundError('financial_accounts', id);
    }
    return data;
  }

  /**
   * Cria uma nova conta financeira para a organização.
   */
  async create(params: {
    provider: string;
    connection_mode: string;
    status?: FinancialAccountStatus;
    account_identifier?: string;
    is_default?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<FinancialAccount> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .insert({
        organization_id: this.organizationId,
        provider: params.provider,
        connection_mode: params.connection_mode,
        status: params.status ?? 'PENDING',
        account_identifier: params.account_identifier,
        is_default: params.is_default ?? true,
        metadata: params.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza o status da conta financeira.
   */
  async updateStatus(id: string, status: FinancialAccountStatus): Promise<FinancialAccount> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new EntityNotFoundError('financial_accounts', id);
    }
    return data;
  }

  /**
   * Lista todas as contas financeiras da organização.
   */
  async findAll(): Promise<FinancialAccount[]> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
