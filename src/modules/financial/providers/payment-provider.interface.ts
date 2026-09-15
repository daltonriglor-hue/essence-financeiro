/**
 * 🔌 PaymentProvider — Service Provider Interface (SPI)
 * 
 * Contrato formal que todo gateway de pagamento deve implementar.
 * O domínio Essence NUNCA se acopla a um provedor específico:
 * opera exclusivamente através desta interface.
 * 
 * Provider inicial: Asaas (Sandbox → Produção)
 * Futuros: Stripe, Pagar.me, etc.
 */

import type {
  FinancialBillingType,
  FinancialSubscriptionCycle,
} from '@/modules/financial/domain/types';

// ============================================================================
// DTOs de Comunicação com o Provider
// ============================================================================

/** Dados para criação de cliente no provedor externo */
export interface ProviderCreateCustomerDTO {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string; // bairro
  externalReference?: string; // ID interno Essence
}

/** Resposta do provedor ao criar/consultar cliente */
export interface ProviderCustomerResponse {
  externalId: string; // ID do cliente no provedor
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}

/** Dados para criação de cobrança no provedor externo */
export interface ProviderCreateChargeDTO {
  customerId: string; // ID do cliente no provedor
  billingType: FinancialBillingType;
  value: number; // Valor em reais (o provider espera em reais, a conversão de centavos → reais é do adaptador)
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  fine?: {
    value: number; // percentual
  };
  interest?: {
    value: number; // percentual mensal
  };
}

/** Resposta do provedor ao criar/consultar cobrança */
export interface ProviderChargeResponse {
  externalId: string;
  status: string; // Status bruto do provedor (será mapeado para FinancialChargeStatus)
  value: number;
  netValue?: number;
  billingType: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  bankSlipBarCode?: string;
  bankSlipDigitableLine?: string;
}

/** Dados para criação de assinatura no provedor */
export interface ProviderCreateSubscriptionDTO {
  customerId: string;
  billingType: FinancialBillingType;
  cycle: FinancialSubscriptionCycle;
  value: number;
  nextDueDate: string;
  description?: string;
  externalReference?: string;
}

/** Resposta do provedor ao criar/consultar assinatura */
export interface ProviderSubscriptionResponse {
  externalId: string;
  status: string;
  billingType: string;
  cycle: string;
  value: number;
  nextDueDate: string;
}

/** Informações da conta financeira no provedor */
export interface ProviderAccountInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  commercialInfoExpiration?: string;
  status?: string;
}


// ============================================================================
// Interface SPI Principal
// ============================================================================

export interface PaymentProvider {
  /** Identificador canônico do provedor (ex: 'asaas', 'stripe') */
  readonly providerName: string;

  // ---------- Conectividade ----------
  /** Testa se as credenciais e conectividade com o provedor estão funcionais */
  testConnection(): Promise<boolean>;

  /** Recupera informações da conta financeira no provedor */
  getAccountInfo(): Promise<ProviderAccountInfo>;

  // ---------- Customers ----------
  createCustomer(data: ProviderCreateCustomerDTO): Promise<ProviderCustomerResponse>;
  getCustomer(externalId: string): Promise<ProviderCustomerResponse>;

  // ---------- Charges ----------
  createCharge(data: ProviderCreateChargeDTO): Promise<ProviderChargeResponse>;
  getCharge(externalId: string): Promise<ProviderChargeResponse>;
  cancelCharge(externalId: string): Promise<void>;

  // ---------- Subscriptions ----------
  createSubscription(data: ProviderCreateSubscriptionDTO): Promise<ProviderSubscriptionResponse>;
  getSubscription(externalId: string): Promise<ProviderSubscriptionResponse>;
  cancelSubscription(externalId: string): Promise<void>;
}
