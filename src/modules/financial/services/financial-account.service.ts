/**
 * 📋 FinancialAccountService — Gestão da Conta Financeira da Organização
 * 
 * Orquestra criação, verificação de status e integração da conta com o provedor.
 * Nesta fase (Fase 2), opera sem chamadas externas reais ao gateway.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAccount, FinancialAccountStatus } from '../domain/types';
import { FinancialAccountRepository } from '../repositories/financial-account.repository';
import { FinancialAuditRepository } from '../repositories/financial-audit.repository';
import type { TenantContext } from '../application/tenant-resolver';

export class FinancialAccountService {
  private readonly accountRepo: FinancialAccountRepository;
  private readonly auditRepo: FinancialAuditRepository;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenant: TenantContext
  ) {
    this.accountRepo = new FinancialAccountRepository(supabase, tenant.organizationId);
    this.auditRepo = new FinancialAuditRepository(supabase, tenant.organizationId);
  }

  /**
   * Obtém a conta financeira padrão da organização.
   * Retorna null se nenhuma conta foi configurada ainda.
   */
  async getDefaultAccount(): Promise<FinancialAccount | null> {
    return this.accountRepo.findDefaultAccount();
  }

  /**
   * Cria uma nova conta financeira para a organização.
   */
  async createAccount(params: {
    provider: string;
    connection_mode: string;
    account_identifier?: string;
  }): Promise<FinancialAccount> {
    const account = await this.accountRepo.create({
      provider: params.provider,
      connection_mode: params.connection_mode,
      account_identifier: params.account_identifier,
      status: 'PENDING',
      is_default: true,
    });

    // Registrar na trilha de auditoria
    await this.auditRepo.log({
      actor_id: this.tenant.userId,
      actor_email: this.tenant.email,
      actor_role: this.tenant.role,
      action: 'FINANCIAL_ACCOUNT_CREATED',
      entity_name: 'financial_accounts',
      entity_id: account.id,
      new_state: account as unknown as Record<string, unknown>,
    });

    return account;
  }

  /**
   * Atualiza o status da conta financeira (ex: PENDING → ACTIVE).
   */
  async updateAccountStatus(
    accountId: string,
    newStatus: FinancialAccountStatus
  ): Promise<FinancialAccount> {
    // Buscar estado anterior para auditoria
    const previousAccount = await this.accountRepo.findById(accountId);

    const updated = await this.accountRepo.updateStatus(accountId, newStatus);

    await this.auditRepo.log({
      actor_id: this.tenant.userId,
      actor_email: this.tenant.email,
      actor_role: this.tenant.role,
      action: 'FINANCIAL_ACCOUNT_STATUS_CHANGED',
      entity_name: 'financial_accounts',
      entity_id: accountId,
      previous_state: { status: previousAccount.status },
      new_state: { status: newStatus },
    });

    return updated;
  }

  /**
   * Lista todas as contas financeiras da organização.
   */
  async listAccounts(): Promise<FinancialAccount[]> {
    return this.accountRepo.findAll();
  }
}
