/**
 * 🗄️ Financial Receipt Repository — Extrato de Liquidações e Recebimentos
 *
 * Persistência de liquidações confirmadas de cobranças.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialReceipt } from '../domain/types';
import { EntityNotFoundError } from '../domain/errors';

export class FinancialReceiptRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId?: string
  ) {}

  /**
   * Registra uma nova liquidação / recebimento confirmado.
   */
  async create(params: Omit<FinancialReceipt, 'id' | 'created_at'>): Promise<FinancialReceipt> {
    const orgId = params.organization_id || this.organizationId;
    if (!orgId) throw new Error('organization_id é obrigatório para registrar recebimento');

    const { data, error } = await this.supabase
      .from('financial_receipts')
      .insert({
        ...params,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Busca liquidação pelo ID.
   */
  async findById(id: string): Promise<FinancialReceipt> {
    let query = this.supabase.from('financial_receipts').select('*').eq('id', id);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    const { data, error } = await query.single();
    if (error || !data) throw new EntityNotFoundError('financial_receipts', id);
    return data;
  }

  /**
   * Busca liquidação pelo ID da cobrança interna.
   */
  async findByChargeId(chargeId: string): Promise<FinancialReceipt | null> {
    let query = this.supabase.from('financial_receipts').select('*').eq('charge_id', chargeId);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Lista recebimentos com paginação e filtros.
   */
  async findAll(params?: {
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: FinancialReceipt[]; count: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('financial_receipts')
      .select('*', { count: 'exact' })
      .order('liquidated_at', { ascending: false })
      .range(from, to);

    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    if (params?.fromDate) query = query.gte('liquidated_at', params.fromDate);
    if (params?.toDate) query = query.lte('liquidated_at', params.toDate);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }
}
