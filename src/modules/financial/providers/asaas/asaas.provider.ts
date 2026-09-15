/**
 * ⚡ AsaasProvider — Adaptador do Provedor Asaas para a SPI PaymentProvider
 *
 * Implementa o contrato formal PaymentProvider, conectando o domínio financeiro
 * ao gateway Asaas através do AsaasHttpClient resiliente.
 *
 * Princípios de segurança:
 * - Credenciais NUNCA expostas ou vazadas em logs/respostas
 * - Isolamento estrito de parâmetros e tratamento de erros
 * - Compatível com Sandbox e Produção
 */

import type {
  PaymentProvider,
  ProviderAccountInfo,
  ProviderCreateChargeDTO,
  ProviderChargeResponse,
  ProviderCreateCustomerDTO,
  ProviderCustomerResponse,
  ProviderCreateSubscriptionDTO,
  ProviderSubscriptionResponse,
} from '../payment-provider.interface';
import { AsaasHttpClient } from './asaas-http-client';
import { mapAsaasStatusToEssence } from './asaas-webhook-mapper';

export interface AsaasAccountRawResponse {
  object?: string;
  name: string;
  email: string;
  cpfCnpj: string;
  commercialInfoExpiration?: string;
  status?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  province?: string;
  city?: string;
}

export interface AsaasAccountStatusRawResponse {
  id: string;
  commercialInfo: string;
  bankAccountInfo: string;
  documentation: string;
  general: string;
}

export interface AsaasCustomerRawResponse {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
}

export interface AsaasPaymentRawResponse {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  nossoNumero?: string;
  barCode?: string;
  identificationField?: string;
}

export interface AsaasPixQrCodeRawResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface AsaasSubscriptionRawResponse {
  id: string;
  customer: string;
  value: number;
  status: string;
  billingType: string;
  cycle: string;
  nextDueDate: string;
  description?: string;
}

export class AsaasProvider implements PaymentProvider {
  readonly providerName = 'asaas';

  constructor(
    private readonly client: AsaasHttpClient,
    public readonly mode: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX'
  ) {}

  // ==========================================================================
  // Conectividade & Informações da Conta
  // ==========================================================================

  /**
   * Testa a conectividade com a API do Asaas realizando chamada a /myAccount.
   * Retorna true se autenticado com sucesso e resposta válida.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get<AsaasAccountRawResponse>('/myAccount');
      return Boolean(response && (response.email || response.cpfCnpj || response.name));
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações cadastrais e status comercial da conta Asaas.
   */
  async getAccountInfo(): Promise<ProviderAccountInfo> {
    const account = await this.client.get<AsaasAccountRawResponse>('/myAccount');

    let status = account.status ?? 'ACTIVE';

    try {
      const statusRes = await this.client.get<AsaasAccountStatusRawResponse>('/myAccount/status');
      if (statusRes?.commercialInfo) {
        status = statusRes.commercialInfo;
      }
    } catch {
      // Fallback para status do myAccount
    }

    return {
      name: account.name,
      email: account.email,
      cpfCnpj: account.cpfCnpj,
      commercialInfoExpiration: account.commercialInfoExpiration,
      status,
    };
  }

  /**
   * Obtém status detalhado de aprovação e documentação da conta.
   */
  async getAccountStatus(): Promise<AsaasAccountStatusRawResponse> {
    return this.client.get<AsaasAccountStatusRawResponse>('/myAccount/status');
  }

  /**
   * Obtém saldo atual da conta Asaas.
   */
  async getBalance(): Promise<{ balance: number }> {
    return this.client.get<{ balance: number }>('/finance/balance');
  }

  // ==========================================================================
  // Customers (Clientes Pagadores)
  // ==========================================================================

  async createCustomer(data: ProviderCreateCustomerDTO): Promise<ProviderCustomerResponse> {
    const payload: Record<string, unknown> = {
      name: data.name,
      cpfCnpj: data.cpfCnpj,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      address: data.address,
      addressNumber: data.addressNumber,
      complement: data.complement,
      province: data.province,
      externalReference: data.externalReference,
    };

    const response = await this.client.post<AsaasCustomerRawResponse>('/customers', payload);

    return {
      externalId: response.id,
      name: response.name,
      cpfCnpj: response.cpfCnpj,
      email: response.email,
      phone: response.phone || response.mobilePhone,
    };
  }

  async getCustomer(externalId: string): Promise<ProviderCustomerResponse> {
    const response = await this.client.get<AsaasCustomerRawResponse>(`/customers/${externalId}`);

    return {
      externalId: response.id,
      name: response.name,
      cpfCnpj: response.cpfCnpj,
      email: response.email,
      phone: response.phone || response.mobilePhone,
    };
  }

  // ==========================================================================
  // Charges (Cobranças)
  // ==========================================================================

  async createCharge(data: ProviderCreateChargeDTO): Promise<ProviderChargeResponse> {
    const payload: Record<string, unknown> = {
      customer: data.customerId,
      billingType: data.billingType,
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference,
      fine: data.fine ? { value: data.fine.value } : undefined,
      interest: data.interest ? { value: data.interest.value } : undefined,
    };

    const response = await this.client.post<AsaasPaymentRawResponse>('/payments', payload);

    let pixQrCodeBase64: string | undefined;
    let pixCopyPaste: string | undefined;

    if (data.billingType === 'PIX') {
      try {
        const pix = await this.client.get<AsaasPixQrCodeRawResponse>(`/payments/${response.id}/pixQrCode`);
        pixQrCodeBase64 = pix.encodedImage;
        pixCopyPaste = pix.payload;
      } catch {
        // Será recuperado via endpoint específico ou webhook
      }
    }

    return {
      externalId: response.id,
      status: response.status,
      value: response.value,
      netValue: response.netValue,
      billingType: response.billingType,
      dueDate: response.dueDate,
      paymentDate: response.paymentDate,
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
      pixQrCodeBase64,
      pixCopyPaste,
      bankSlipBarCode: response.barCode,
      bankSlipDigitableLine: response.identificationField,
    };
  }

  async getCharge(externalId: string): Promise<ProviderChargeResponse> {
    const response = await this.client.get<AsaasPaymentRawResponse>(`/payments/${externalId}`);

    return {
      externalId: response.id,
      status: response.status,
      value: response.value,
      netValue: response.netValue,
      billingType: response.billingType,
      dueDate: response.dueDate,
      paymentDate: response.paymentDate,
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
      bankSlipBarCode: response.barCode,
      bankSlipDigitableLine: response.identificationField,
    };
  }

  async cancelCharge(externalId: string): Promise<void> {
    await this.client.delete(`/payments/${externalId}`);
  }

  // ==========================================================================
  // Subscriptions (Assinaturas)
  // ==========================================================================

  async createSubscription(data: ProviderCreateSubscriptionDTO): Promise<ProviderSubscriptionResponse> {
    const payload: Record<string, unknown> = {
      customer: data.customerId,
      billingType: data.billingType,
      cycle: data.cycle,
      value: data.value,
      nextDueDate: data.nextDueDate,
      description: data.description,
      externalReference: data.externalReference,
    };

    const response = await this.client.post<AsaasSubscriptionRawResponse>('/subscriptions', payload);

    return {
      externalId: response.id,
      status: response.status,
      billingType: response.billingType,
      cycle: response.cycle,
      value: response.value,
      nextDueDate: response.nextDueDate,
    };
  }

  async getSubscription(externalId: string): Promise<ProviderSubscriptionResponse> {
    const response = await this.client.get<AsaasSubscriptionRawResponse>(`/subscriptions/${externalId}`);

    return {
      externalId: response.id,
      status: response.status,
      billingType: response.billingType,
      cycle: response.cycle,
      value: response.value,
      nextDueDate: response.nextDueDate,
    };
  }

  async cancelSubscription(externalId: string): Promise<void> {
    await this.client.delete(`/subscriptions/${externalId}`);
  }
}
