/**
 * 💳 FinancialChargeService — Motor de Emissão e Gestão de Cobranças
 *
 * Responsável pelo ciclo de vida completo de Contas a Receber:
 * - Emissão de cobranças avulsas (Pix, Boleto, Cartão/Checkout Hospedado)
 * - Garantia estrita de Idempotência (Idempotency-Key)
 * - Resiliência a Timeout (transição para PENDING_RECONCILIATION)
 * - Cancelamento e sincronização com o gateway de pagamento
 * - Trilha de auditoria em todas as mutações
 */

import type { FinancialCharge, CreateChargeDTO, FinancialChargeStatus } from '../domain/types';
import type { FinancialChargeRepository } from '../repositories/financial-charge.repository';
import type { FinancialCustomerRepository } from '../repositories/financial-customer.repository';
import type { FinancialAccountRepository } from '../repositories/financial-account.repository';
import type { PaymentProvider } from '../providers/payment-provider.interface';
import type { FinancialAuditService } from './financial-audit.service';
import { createFinancialChargeSchema } from '../schemas';
import { ValidationError, EntityNotFoundError, FinancialDomainError } from '../domain/errors';
import { mapAsaasStatusToEssence } from '../providers/asaas/asaas-webhook-mapper';
import { AsaasTimeoutError } from '../providers/asaas/asaas-http-client';

export class FinancialChargeService {
  constructor(
    private readonly chargeRepo: FinancialChargeRepository,
    private readonly customerRepo: FinancialCustomerRepository,
    private readonly accountRepo: FinancialAccountRepository,
    private readonly provider: PaymentProvider,
    private readonly auditService?: FinancialAuditService,
    private readonly organizationId?: string
  ) {}

  /**
   * Emite uma nova cobrança com controle rigoroso de Idempotência e resiliência a timeout.
   */
  async createCharge(dto: CreateChargeDTO, actorId?: string): Promise<FinancialCharge> {
    // 1. Validação Zod do Payload
    const validation = createFinancialChargeSchema.safeParse(dto);
    if (!validation.success) {
      throw new ValidationError(
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedData = validation.data;

    // 2. Controle Estrito de Idempotência
    const existingCharge = await this.chargeRepo.findByIdempotencyKey(validatedData.idempotency_key);
    if (existingCharge) {
      // Retorna a cobrança previamente emitida sem duplicar
      return existingCharge;
    }

    // 3. Resolução e Validação do Cliente Pagador
    const customer = await this.customerRepo.findById(validatedData.customer_id);
    if (!customer) {
      throw new EntityNotFoundError('financial_customers', validatedData.customer_id);
    }

    let externalCustomerId = customer.external_customer_id;
    if (!externalCustomerId) {
      // Vinculação sob demanda caso o cliente não possua ID no gateway
      const customerRes = await this.provider.createCustomer({
        name: customer.name,
        cpfCnpj: customer.document_number,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        postalCode: customer.postal_code || undefined,
        address: customer.address || undefined,
        addressNumber: customer.address_number || undefined,
        complement: customer.address_complement || undefined,
        province: customer.neighborhood || undefined,
        externalReference: customer.crm_contact_id,
      });

      externalCustomerId = customerRes.externalId;
      await this.customerRepo.updateExternalId(customer.id, externalCustomerId);
    }

    // 4. Resolução da Conta Financeira
    let accountId = validatedData.account_id;
    if (!accountId) {
      const defaultAccount = await this.accountRepo.findDefaultAccount();
      if (defaultAccount) {
        accountId = defaultAccount.id;
      } else {
        // Criação de conta padrão se ainda não existir
        const newAccount = await this.accountRepo.create({
          provider: this.provider.providerName,
          connection_mode: 'DIRECT_CREDENTIALS',
          status: 'ACTIVE',
          is_default: true,
        });
        accountId = newAccount.id;
      }
    }

    // Conversão segura de centavos para reais (ex: 15000 cents -> 150.00 BRL)
    const valueInReais = validatedData.amount_cents / 100;

    // 5. Chamada ao Gateway de Pagamento com Tratamento de Timeout
    try {
      const providerRes = await this.provider.createCharge({
        customerId: externalCustomerId,
        billingType: validatedData.billing_type,
        value: valueInReais,
        dueDate: validatedData.due_date,
        description: validatedData.description,
        externalReference: validatedData.idempotency_key,
      });

      const canonicalStatus = mapAsaasStatusToEssence(providerRes.status);
      const netAmountCents = providerRes.netValue ? Math.round(providerRes.netValue * 100) : undefined;
      const feeCents = netAmountCents ? validatedData.amount_cents - netAmountCents : 0;

      // 6. Persistência Local da Cobrança Emitida
      const charge = await this.chargeRepo.create({
        organization_id: this.organizationId || '',
        account_id: accountId,
        customer_id: customer.id,
        crm_opportunity_id: validatedData.crm_opportunity_id || null,
        provider: this.provider.providerName,
        external_id: providerRes.externalId,
        idempotency_key: validatedData.idempotency_key,
        billing_type: validatedData.billing_type,
        status: canonicalStatus,
        amount_cents: validatedData.amount_cents,
        net_amount_cents: netAmountCents ?? null,
        fee_cents: feeCents,
        description: validatedData.description || null,
        due_date: validatedData.due_date,
        paid_at: providerRes.paymentDate || null,
        payment_url: providerRes.invoiceUrl || providerRes.bankSlipUrl || null,
        pix_qr_code_base64: providerRes.pixQrCodeBase64 || null,
        pix_copy_paste: providerRes.pixCopyPaste || null,
        bank_slip_bar_code: providerRes.bankSlipBarCode || null,
        bank_slip_digitable_line: providerRes.bankSlipDigitableLine || null,
        bank_slip_pdf_url: providerRes.bankSlipUrl || null,
        client_notes: null,
        metadata: validatedData.metadata || {},
      });

      // 7. Registro de Auditoria
      if (this.auditService) {
        await this.auditService.logAction({
          action: 'CHARGE_CREATED',
          entityName: 'financial_charges',
          entityId: charge.id,
          newState: {
            idempotency_key: charge.idempotency_key,
            amount_cents: charge.amount_cents,
            billing_type: charge.billing_type,
            status: charge.status,
            external_id: charge.external_id,
          },
        });
      }

      return charge;
    } catch (error) {
      // RESILIÊNCIA A TIMEOUT: Marca como PENDING_RECONCILIATION para não duplicar no gateway
      if (error instanceof AsaasTimeoutError || (error instanceof Error && error.name === 'AbortError')) {
        const reconciliationCharge = await this.chargeRepo.create({
          organization_id: this.organizationId || '',
          account_id: accountId,
          customer_id: customer.id,
          crm_opportunity_id: validatedData.crm_opportunity_id || null,
          provider: this.provider.providerName,
          external_id: null,
          idempotency_key: validatedData.idempotency_key,
          billing_type: validatedData.billing_type,
          status: 'PENDING_RECONCILIATION',
          amount_cents: validatedData.amount_cents,
          net_amount_cents: null,
          fee_cents: 0,
          description: validatedData.description || null,
          due_date: validatedData.due_date,
          paid_at: null,
          payment_url: null,
          pix_qr_code_base64: null,
          pix_copy_paste: null,
          bank_slip_bar_code: null,
          bank_slip_digitable_line: null,
          bank_slip_pdf_url: null,
          client_notes: 'Timeout de rede na emissão. Aguardando conciliação ativa.',
          metadata: validatedData.metadata || {},
        });

        if (this.auditService) {
          await this.auditService.logAction({
            action: 'CHARGE_CREATED_PENDING_RECONCILIATION',
            entityName: 'financial_charges',
            entityId: reconciliationCharge.id,
            newState: {
              idempotency_key: reconciliationCharge.idempotency_key,
              status: 'PENDING_RECONCILIATION',
            },
          });
        }

        return reconciliationCharge;
      }

      throw error;
    }
  }

  /**
   * Busca cobrança pelo ID interno.
   */
  async getChargeById(id: string): Promise<FinancialCharge> {
    return this.chargeRepo.findById(id);
  }

  /**
   * Lista cobranças com suporte a paginação e filtros.
   */
  async listCharges(params?: {
    page?: number;
    pageSize?: number;
    status?: FinancialChargeStatus;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: FinancialCharge[]; count: number }> {
    return this.chargeRepo.findAll(params);
  }

  /**
   * Cancela uma cobrança no gateway e atualiza o estado local para CANCELLED.
   */
  async cancelCharge(id: string): Promise<FinancialCharge> {
    const charge = await this.chargeRepo.findById(id);

    if (charge.status === 'CANCELLED') {
      return charge;
    }

    if (charge.status === 'PAID' || charge.status === 'REFUNDED') {
      throw new FinancialDomainError(
        `Cobrança não pode ser cancelada pois está no estado '${charge.status}'.`,
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    // Cancela no provedor externo se houver external_id
    if (charge.external_id) {
      await this.provider.cancelCharge(charge.external_id);
    }

    const updated = await this.chargeRepo.updateStatus(id, {
      status: 'CANCELLED',
    });

    if (this.auditService) {
      await this.auditService.logAction({
        action: 'CHARGE_CANCELLED',
        entityName: 'financial_charges',
        entityId: updated.id,
        previousState: { status: charge.status },
        newState: { status: 'CANCELLED' },
      });
    }

    return updated;
  }

  /**
   * Sincroniza o status da cobrança consultando o gateway Asaas.
   */
  async syncCharge(id: string): Promise<FinancialCharge> {
    const charge = await this.chargeRepo.findById(id);

    if (!charge.external_id) {
      return charge;
    }

    const remote = await this.provider.getCharge(charge.external_id);
    const canonicalStatus = mapAsaasStatusToEssence(remote.status);
    const netAmountCents = remote.netValue ? Math.round(remote.netValue * 100) : undefined;
    const feeCents = netAmountCents ? charge.amount_cents - netAmountCents : charge.fee_cents;

    const updated = await this.chargeRepo.updateStatus(id, {
      status: canonicalStatus,
      paid_at: remote.paymentDate || charge.paid_at || undefined,
      net_amount_cents: netAmountCents,
      fee_cents: feeCents,
      payment_url: remote.invoiceUrl || remote.bankSlipUrl || charge.payment_url || undefined,
      pix_qr_code_base64: remote.pixQrCodeBase64 || charge.pix_qr_code_base64 || undefined,
      pix_copy_paste: remote.pixCopyPaste || charge.pix_copy_paste || undefined,
      bank_slip_bar_code: remote.bankSlipBarCode || charge.bank_slip_bar_code || undefined,
      bank_slip_digitable_line: remote.bankSlipDigitableLine || charge.bank_slip_digitable_line || undefined,
      bank_slip_pdf_url: remote.bankSlipUrl || charge.bank_slip_pdf_url || undefined,
    });

    if (this.auditService) {
      await this.auditService.logAction({
        action: 'CHARGE_SYNCED',
        entityName: 'financial_charges',
        entityId: updated.id,
        previousState: { status: charge.status },
        newState: { status: updated.status, paid_at: updated.paid_at },
      });
    }

    return updated;
  }
}
