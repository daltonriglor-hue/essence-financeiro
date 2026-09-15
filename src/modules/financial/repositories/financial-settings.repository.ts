/**
 * 🗄️ Financial Settings Repository — Configurações Financeiras da Organização
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialSettings } from '../domain/types';

export class FinancialSettingsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId: string
  ) {}

  /**
   * Busca as configurações financeiras da organização.
   */
  async find(): Promise<FinancialSettings | null> {
    const { data, error } = await this.supabase
      .from('financial_settings')
      .select('*')
      .eq('organization_id', this.organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Cria ou atualiza configurações financeiras (upsert por organization_id UNIQUE).
   */
  async upsert(params: Partial<Omit<FinancialSettings, 'id' | 'organization_id' | 'created_at'>>): Promise<FinancialSettings> {
    const { data, error } = await this.supabase
      .from('financial_settings')
      .upsert(
        {
          organization_id: this.organizationId,
          ...params,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
