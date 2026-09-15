/**
 * 👤 FinancialCustomerService — Orquestração de Clientes Pagadores
 *
 * Responsável pelo ciclo de vida e sincronização bidirecional:
 * CRM Contact ➔ Financial Customer ➔ Provedor Externo (Asaas Customer)
 *
 * Princípios:
 * - Prevenção rigorosa de duplicidade (idempotência por crm_contact_id)
 * - Isolamento multi-tenant garantido em todas as operações
 * - Trilha de auditoria automática em mutações
 */

import type { FinancialCustomer, CreateCustomerDTO } from '../domain/types';
import type { FinancialCustomerRepository } from '../repositories/financial-customer.repository';
import type { PaymentProvider } from '../providers/payment-provider.interface';
import type { FinancialAuditService } from './financial-audit.service';
import { createFinancialCustomerSchema } from '../schemas';
import { ValidationError } from '../domain/errors';

export class FinancialCustomerService {
  constructor(
    private readonly customerRepo: FinancialCustomerRepository,
    private readonly provider: PaymentProvider,
    private readonly auditService?: FinancialAuditService,
    private readonly organizationId?: string
  ) {}

  /**
   * Cria ou sincroniza um cliente pagador a partir de um contato do CRM.
   * Se o contato já estiver mapeado no provedor, retorna o registro existente sem duplicar.
   */
  async createOrSyncCustomer(
    dto: CreateCustomerDTO,
    actorId?: string
  ): Promise<FinancialCustomer> {
    // 1. Validação com Zod Schema
    const validation = createFinancialCustomerSchema.safeParse(dto);
    if (!validation.success) {
      throw new ValidationError(
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedData = validation.data;

    // 2. Verificação prévia de existência (prevenção de duplicidade)
    const existingCustomer = await this.customerRepo.findByCrmContactId(validatedData.crm_contact_id);

    if (existingCustomer) {
      // Se já possui ID externo no Asaas, retorna imediatamente (idempotente)
      if (existingCustomer.external_customer_id) {
        return existingCustomer;
      }

      // Se existe localmente mas faltou registrar no gateway: cria no gateway agora
      const providerRes = await this.provider.createCustomer({
        name: existingCustomer.name,
        cpfCnpj: existingCustomer.document_number,
        email: existingCustomer.email || undefined,
        phone: existingCustomer.phone || undefined,
        postalCode: existingCustomer.postal_code || undefined,
        address: existingCustomer.address || undefined,
        addressNumber: existingCustomer.address_number || undefined,
        complement: existingCustomer.address_complement || undefined,
        province: existingCustomer.neighborhood || undefined,
        externalReference: existingCustomer.crm_contact_id,
      });

      const updated = await this.customerRepo.updateExternalId(existingCustomer.id, providerRes.externalId);

      if (this.auditService) {
        await this.auditService.logAction({
          action: 'CUSTOMER_EXTERNAL_ID_ATTACHED',
          entityName: 'financial_customers',
          entityId: updated.id,
          newState: { external_customer_id: providerRes.externalId },
        });
      }

      return updated;
    }

    // 3. Criação no Provedor Externo (Asaas)
    const providerRes = await this.provider.createCustomer({
      name: validatedData.name,
      cpfCnpj: validatedData.document_number,
      email: validatedData.email || undefined,
      phone: validatedData.phone || undefined,
      postalCode: validatedData.postal_code || undefined,
      address: validatedData.address || undefined,
      addressNumber: validatedData.address_number || undefined,
      complement: validatedData.address_complement || undefined,
      province: validatedData.neighborhood || undefined,
      externalReference: validatedData.crm_contact_id,
    });

    // 4. Persistência local no banco com vínculo ao crm_contact_id
    const newCustomer = await this.customerRepo.create({
      organization_id: this.organizationId || '',
      crm_contact_id: validatedData.crm_contact_id,
      provider: this.provider.providerName,
      external_customer_id: providerRes.externalId,
      customer_type: validatedData.customer_type,
      name: validatedData.name,
      document_number: validatedData.document_number,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      postal_code: validatedData.postal_code || null,
      address: validatedData.address || null,
      address_number: validatedData.address_number || null,
      address_complement: validatedData.address_complement || null,
      neighborhood: validatedData.neighborhood || null,
      city: validatedData.city || null,
      state: validatedData.state || null,
      metadata: {},
    });

    // 5. Auditoria de Criação
    if (this.auditService) {
      await this.auditService.logAction({
        action: 'CUSTOMER_CREATED',
        entityName: 'financial_customers',
        entityId: newCustomer.id,
        newState: {
          crm_contact_id: newCustomer.crm_contact_id,
          external_customer_id: newCustomer.external_customer_id,
          name: newCustomer.name,
          document_number: newCustomer.document_number,
        },
      });
    }

    return newCustomer;
  }

  /**
   * Busca cliente pelo ID interno.
   */
  async getCustomerById(id: string): Promise<FinancialCustomer> {
    return this.customerRepo.findById(id);
  }

  /**
   * Busca cliente pelo ID do contato no CRM.
   */
  async getCustomerByContactId(crmContactId: string): Promise<FinancialCustomer | null> {
    return this.customerRepo.findByCrmContactId(crmContactId);
  }

  /**
   * Lista clientes pagadores com suporte a paginação e busca por nome/doc/email.
   */
  async listCustomers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ data: FinancialCustomer[]; count: number }> {
    return this.customerRepo.findAll(params);
  }

  /**
   * Sincroniza os dados do cliente com o provedor externo (Asaas).
   */
  async syncWithProvider(id: string): Promise<FinancialCustomer> {
    const customer = await this.customerRepo.findById(id);

    if (!customer.external_customer_id) {
      return customer;
    }

    const providerData = await this.provider.getCustomer(customer.external_customer_id);

    if (this.auditService) {
      await this.auditService.logAction({
        action: 'CUSTOMER_SYNCED',
        entityName: 'financial_customers',
        entityId: customer.id,
        previousState: { name: customer.name, email: customer.email },
        newState: { name: providerData.name, email: providerData.email },
      });
    }

    return customer;
  }
}
