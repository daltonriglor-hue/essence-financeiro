/**
 * 🗄️ Financial Audit Repository — Trilha de Auditoria Imutável
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAuditLog } from '../domain/types';

export class FinancialAuditRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId?: string
  ) {}

  /**
   * Registra um novo evento de auditoria (insert-only, nunca atualiza).
   */
  async log(params: {
    organization_id?: string;
    request_id?: string;
    actor_id?: string;
    actor_email?: string;
    actor_role?: string;
    action: string;
    entity_name: string;
    entity_id: string;
    previous_state?: Record<string, unknown> | null;
    new_state?: Record<string, unknown> | null;
    ip_address?: string;
    user_agent?: string;
  }): Promise<FinancialAuditLog> {
    const orgId = params.organization_id || this.organizationId;
    if (!orgId) throw new Error('organization_id é obrigatório para registrar auditoria');

    const { data, error } = await this.supabase
      .from('financial_audit_logs')
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
   * Consulta trilha de auditoria por entidade.
   */
  async findByEntity(entityName: string, entityId: string): Promise<FinancialAuditLog[]> {
    const { data, error } = await this.supabase
      .from('financial_audit_logs')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('entity_name', entityName)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Lista auditoria recente da organização.
   */
  async findRecent(limit: number = 50): Promise<FinancialAuditLog[]> {
    const { data, error } = await this.supabase
      .from('financial_audit_logs')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }
}
