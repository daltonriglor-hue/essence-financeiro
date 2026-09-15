/**
 * 🗄️ Financial Webhook Repository — Ingestão e Consulta de Eventos de Webhook
 * 
 * Deduplicação atômica por UNIQUE(provider, provider_event_id).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialWebhookEvent, FinancialWebhookProcessingStatus } from '../domain/types';

export class FinancialWebhookRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Persiste evento de webhook com deduplicação atômica.
   * Se o evento já existir (provider + provider_event_id), retorna null.
   */
  async ingestEvent(params: {
    organization_id?: string;
    provider: string;
    provider_event_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  }): Promise<FinancialWebhookEvent | null> {
    const { data, error } = await this.supabase
      .from('financial_webhook_events')
      .insert({
        organization_id: params.organization_id,
        provider: params.provider,
        provider_event_id: params.provider_event_id,
        event_type: params.event_type,
        payload: params.payload,
        processing_status: 'PENDING',
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Se for violação de unicidade (evento duplicado), retornar null
    if (error) {
      if (error.code === '23505') {
        return null; // Evento já ingerido — deduplicação atômica
      }
      throw error;
    }

    return data;
  }

  /**
   * Atualiza o status de processamento de um evento.
   */
  async updateProcessingStatus(
    id: string,
    status: FinancialWebhookProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('financial_webhook_events')
      .update({
        processing_status: status,
        processed_at: status !== 'PENDING' ? new Date().toISOString() : null,
        error_message: errorMessage ?? null,
        // retry_count é gerenciado pelo método incrementRetry()
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Incrementa o contador de retries e atualiza erro.
   */
  async incrementRetry(id: string, errorMessage: string): Promise<void> {
    // Buscar retry_count atual
    const { data: current, error: findError } = await this.supabase
      .from('financial_webhook_events')
      .select('retry_count')
      .eq('id', id)
      .single();

    if (findError) throw findError;

    const { error } = await this.supabase
      .from('financial_webhook_events')
      .update({
        retry_count: (current?.retry_count ?? 0) + 1,
        error_message: errorMessage,
        processing_status: 'FAILED',
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Busca eventos pendentes de processamento (para retry).
   */
  async findPending(limit: number = 50): Promise<FinancialWebhookEvent[]> {
    const { data, error } = await this.supabase
      .from('financial_webhook_events')
      .select('*')
      .eq('processing_status', 'PENDING')
      .order('received_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }
}
