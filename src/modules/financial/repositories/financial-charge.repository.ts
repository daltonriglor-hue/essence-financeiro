/**
 * 🗄️ Financial Charge Repository — Persistência de Cobranças
 * 
 * Cobranças avulsas (Contas a Receber) com controle de idempotência.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialCharge, FinancialChargeStatus } from '../domain/types';
import { EntityNotFoundError } from '../domain/errors';

export class FinancialChargeRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId?: string
  ) {}

  async findById(id: string): Promise<FinancialCharge> {
    let query = this.supabase
      .from('financial_charges')
      .select('*')
      .eq('id', id);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }
    const { data, error } = await query.single();

    if (error || !data) throw new EntityNotFoundError('financial_charges', id);
    return data;
  }

  /**
   * Verifica se já existe cobrança com a mesma chave de idempotência.
   * Retorna null se não existir (chave livre).
   */
  async findByIdempotencyKey(key: string): Promise<FinancialCharge | null> {
    let query = this.supabase
      .from('financial_charges')
      .select('*')
      .eq('idempotency_key', key);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Busca cobranças pelo ID externo do provedor.
   */
  async findByExternalId(externalId: string): Promise<FinancialCharge | null> {
    let query = this.supabase
      .from('financial_charges')
      .select('*')
      .eq('external_id', externalId);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Cria nova cobrança com idempotency_key obrigatória.
   */
  async create(params: Omit<FinancialCharge, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialCharge> {
    const orgId = params.organization_id || this.organizationId;
    if (!orgId) throw new Error('organization_id é obrigatório para criar cobrança');

    const { data, error } = await this.supabase
      .from('financial_charges')
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
   * Atualiza status e dados de pagamento de uma cobrança.
   */
  async updateStatus(
    id: string,
    updates: {
      status: FinancialChargeStatus;
      external_id?: string;
      paid_at?: string;
      net_amount_cents?: number;
      fee_cents?: number;
      payment_url?: string;
      pix_qr_code_base64?: string;
      pix_copy_paste?: string;
      bank_slip_bar_code?: string;
      bank_slip_digitable_line?: string;
      bank_slip_pdf_url?: string;
    }
  ): Promise<FinancialCharge> {
    let query = this.supabase
      .from('financial_charges')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }
    const { data, error } = await query.select().single();

    if (error || !data) throw new EntityNotFoundError('financial_charges', id);
    return data;
  }

  /**
   * Lista cobranças com filtros e paginação.
   */
  async findAll(params?: {
    page?: number;
    pageSize?: number;
    status?: FinancialChargeStatus;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: FinancialCharge[]; count: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('financial_charges')
      .select('*', { count: 'exact' });

    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    if (params?.status) query = query.eq('status', params.status);
    if (params?.customerId) query = query.eq('customer_id', params.customerId);
    if (params?.fromDate) query = query.gte('due_date', params.fromDate);
    if (params?.toDate) query = query.lte('due_date', params.toDate);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }

  /**
   * Busca cobranças em estado PENDING_RECONCILIATION (para conciliação ativa).
   */
  async findPendingReconciliation(): Promise<FinancialCharge[]> {
    let query = this.supabase
      .from('financial_charges')
      .select('*')
      .eq('status', 'PENDING_RECONCILIATION');

    if (this.organizationId) {
      query = query.eq('organization_id', this.organizationId);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
