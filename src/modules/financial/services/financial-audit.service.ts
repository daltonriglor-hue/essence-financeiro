/**
 * 📋 FinancialAuditService — Serviço de Trilha de Auditoria Financeira
 * 
 * Registros imutáveis de todas as operações sensíveis do módulo.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAuditLog } from '../domain/types';
import { FinancialAuditRepository } from '../repositories/financial-audit.repository';
import type { TenantContext } from '../application/tenant-resolver';

export class FinancialAuditService {
  private readonly auditRepo: FinancialAuditRepository;

  constructor(
    supabase: SupabaseClient,
    private readonly tenant?: TenantContext
  ) {
    this.auditRepo = new FinancialAuditRepository(supabase, tenant?.organizationId);
  }

  /**
   * Registra um evento de auditoria para uma operação financeira.
   */
  async logAction(params: {
    action: string;
    entityName: string;
    entityId: string;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    organizationId?: string;
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
  }): Promise<FinancialAuditLog> {
    return this.auditRepo.log({
      organization_id: params.organizationId || this.tenant?.organizationId,
      request_id: params.requestId,
      actor_id: params.actorId || this.tenant?.userId || 'system',
      actor_email: params.actorEmail || this.tenant?.email || 'system@essence.local',
      actor_role: params.actorRole || this.tenant?.role || 'system',
      action: params.action,
      entity_name: params.entityName,
      entity_id: params.entityId,
      previous_state: params.previousState,
      new_state: params.newState,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  }

  /**
   * Consulta auditoria de uma entidade específica.
   */
  async getEntityHistory(entityName: string, entityId: string): Promise<FinancialAuditLog[]> {
    return this.auditRepo.findByEntity(entityName, entityId);
  }

  /**
   * Lista os registros de auditoria mais recentes da organização.
   */
  async getRecentActivity(limit: number = 50): Promise<FinancialAuditLog[]> {
    return this.auditRepo.findRecent(limit);
  }
}
