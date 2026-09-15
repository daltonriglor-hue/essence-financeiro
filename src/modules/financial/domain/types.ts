/**
 * 🏛️ Essence Financeiro — Modelagem Canônica de Domínio
 * 
 * Contém os tipos e interfaces TypeScript para todas as 15 entidades
 * e 11 enums da fundação financeira.
 */

// ============================================================================
// 1. ENUMS CANÔNICOS DE DOMÍNIO (11 Enums)
// ============================================================================

export type FinancialAccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export type FinancialAccountConnectionMode = 'DIRECT_CREDENTIALS' | 'SUBACCOUNT' | 'HYBRID';

export type FinancialCredentialMode = 'SANDBOX' | 'PRODUCTION';

export type FinancialCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type FinancialBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

export type FinancialChargeStatus = 
  | 'DRAFT'
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PENDING_RECONCILIATION';

export type FinancialCustomerType = 'INDIVIDUAL' | 'COMPANY';

export type FinancialSubscriptionCycle = 
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'YEARLY';

export type FinancialSubscriptionStatus = 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'EXPIRED';

export type FinancialWebhookProcessingStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';

export type FinancialNotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';


// ============================================================================
// 2. ENTIDADES PRINCIPAIS (15 Entidades de Domínio)
// ============================================================================

export interface FinancialAccount {
  id: string;
  organization_id: string;
  provider: string; // 'asaas'
  status: FinancialAccountStatus;
  connection_mode: FinancialAccountConnectionMode;
  account_identifier?: string | null;
  is_default: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialProviderCredentials {
  id: string;
  account_id: string;
  organization_id: string;
  provider: string;
  mode: FinancialCredentialMode;
  status: FinancialCredentialStatus;
  secret_reference: string; // Nunca chave em texto puro
  last_verified_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialOnboarding {
  id: string;
  account_id: string;
  organization_id: string;
  provider_onboarding_id?: string | null;
  status: string;
  regulatory_status?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialBusinessProfile {
  id: string;
  account_id: string;
  organization_id: string;
  legal_name: string;
  trade_name?: string | null;
  document_type: 'CPF' | 'CNPJ';
  document_number: string;
  email: string;
  phone?: string | null;
  postal_code?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTaxProfile {
  id: string;
  account_id: string;
  organization_id: string;
  tax_regime?: string | null;
  municipal_registration?: string | null;
  state_registration?: string | null;
  cnae_code?: string | null;
  tax_retention_rules?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialCustomer {
  id: string;
  organization_id: string;
  crm_contact_id: string;
  provider: string;
  external_customer_id?: string | null;
  customer_type: FinancialCustomerType;
  name: string;
  document_number: string;
  email?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialCharge {
  id: string;
  organization_id: string;
  account_id: string;
  customer_id: string;
  subscription_id?: string | null;
  crm_opportunity_id?: string | null;
  provider: string;
  external_id?: string | null;
  idempotency_key: string;
  billing_type: FinancialBillingType;
  status: FinancialChargeStatus;
  amount_cents: number; // BigInt tratado em centavos
  net_amount_cents?: number | null;
  fee_cents?: number;
  description?: string | null;
  due_date: string; // YYYY-MM-DD
  paid_at?: string | null;
  payment_url?: string | null;
  pix_qr_code_base64?: string | null;
  pix_copy_paste?: string | null;
  bank_slip_bar_code?: string | null;
  bank_slip_digitable_line?: string | null;
  bank_slip_pdf_url?: string | null;
  client_notes?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialReceipt {
  id: string;
  organization_id: string;
  charge_id: string;
  provider: string;
  external_payment_id?: string | null;
  gross_amount_cents: number;
  fee_amount_cents: number;
  net_amount_cents: number;
  payment_method: FinancialBillingType;
  liquidated_at: string;
  credit_date?: string | null;
  raw_details?: Record<string, unknown>;
  created_at: string;
}

export interface FinancialSubscription {
  id: string;
  organization_id: string;
  account_id: string;
  customer_id: string;
  provider: string;
  external_id?: string | null;
  idempotency_key: string;
  title: string;
  description?: string | null;
  status: FinancialSubscriptionStatus;
  billing_type: FinancialBillingType;
  cycle: FinancialSubscriptionCycle;
  amount_cents: number;
  next_due_date: string;
  cancelled_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FinancialSubscriptionItem {
  id: string;
  subscription_id: string;
  organization_id: string;
  name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  created_at: string;
}

export interface FinancialWebhookConfig {
  id: string;
  account_id: string;
  organization_id: string;
  provider: string;
  endpoint_url: string;
  auth_token_reference: string;
  is_active: boolean;
  events_subscribed: string[];
  created_at: string;
  updated_at: string;
}

export interface FinancialWebhookEvent {
  id: string;
  organization_id?: string | null;
  provider: string;
  provider_event_id: string;
  event_type: string;
  processing_status: FinancialWebhookProcessingStatus;
  payload: Record<string, unknown>;
  received_at: string;
  processed_at?: string | null;
  error_message?: string | null;
  retry_count: number;
}

export interface FinancialAuditLog {
  id: string;
  organization_id: string;
  request_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity_name: string;
  entity_id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface FinancialNotification {
  id: string;
  organization_id: string;
  charge_id?: string | null;
  customer_id?: string | null;
  channel: FinancialNotificationChannel;
  trigger_rule: string;
  status: string;
  scheduled_for: string;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface FinancialSettings {
  id: string;
  organization_id: string;
  account_id?: string | null;
  default_payment_methods: FinancialBillingType[];
  default_days_to_due: number;
  fine_percentage: number;
  monthly_interest_percentage: number;
  notification_rules: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  auto_reconcile: boolean;
  created_at: string;
  updated_at: string;
}


// ============================================================================
// 3. DTOs PARA OPERAÇÕES DE DOMÍNIO
// ============================================================================

export interface CreateChargeDTO {
  customer_id: string;
  amount_cents: number;
  billing_type: FinancialBillingType;
  due_date: string; // YYYY-MM-DD
  description?: string;
  idempotency_key: string;
  crm_opportunity_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCustomerDTO {
  crm_contact_id: string;
  name: string;
  document_number: string;
  customer_type?: FinancialCustomerType;
  email?: string;
  phone?: string;
  postal_code?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface CreateSubscriptionDTO {
  customer_id: string;
  title: string;
  description?: string;
  billing_type: FinancialBillingType;
  cycle: FinancialSubscriptionCycle;
  amount_cents: number;
  next_due_date: string;
  idempotency_key: string;
  items?: Array<{
    name: string;
    quantity: number;
    unit_amount_cents: number;
  }>;
}
