import { z } from 'zod';

/**
 * 🏛️ Essence Financeiro — Schemas de Validação Zod
 */

// Helper para validar formato de documento brasileiro (CPF ou CNPJ)
const documentRegex = /^(?:\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

export const financialBillingTypeSchema = z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED']);

export const financialSubscriptionCycleSchema = z.enum([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUALLY',
  'YEARLY',
]);

export const financialCustomerTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);

// 1. Schema para Criação de Cliente Financeiro
export const createFinancialCustomerSchema = z.object({
  crm_contact_id: z.string().uuid('ID do contato CRM deve ser um UUID válido'),
  name: z.string().trim().min(2, 'Nome deve conter pelo menos 2 caracteres'),
  document_number: z
    .string()
    .trim()
    .regex(documentRegex, 'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido'),
  customer_type: financialCustomerTypeSchema.default('INDIVIDUAL'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  address_number: z.string().optional().or(z.literal('')),
  address_complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().max(2, 'UF deve conter 2 letras').optional().or(z.literal('')),
});

// 2. Schema para Emissão de Cobrança
export const createFinancialChargeSchema = z.object({
  customer_id: z.string().uuid('ID do cliente financeiro deve ser um UUID válido'),
  amount_cents: z
    .number({ invalid_type_error: 'Valor deve ser numérico em centavos' })
    .int('Valor em centavos deve ser um número inteiro')
    .positive('Valor da cobrança deve ser maior que zero'),
  billing_type: financialBillingTypeSchema.default('PIX'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento deve estar no formato AAAA-MM-DD'),
  description: z.string().max(500, 'Descrição não pode ultrapassar 500 caracteres').optional(),
  idempotency_key: z
    .string()
    .trim()
    .min(8, 'Chave de idempotência deve conter pelo menos 8 caracteres'),
  crm_opportunity_id: z.string().uuid().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
});

// 3. Schema para Assinatura Recorrente
export const createFinancialSubscriptionSchema = z.object({
  customer_id: z.string().uuid('ID do cliente financeiro deve ser um UUID válido'),
  title: z.string().trim().min(3, 'Título da assinatura deve conter pelo menos 3 caracteres'),
  description: z.string().optional(),
  billing_type: financialBillingTypeSchema.default('PIX'),
  cycle: financialSubscriptionCycleSchema.default('MONTHLY'),
  amount_cents: z
    .number()
    .int('Valor em centavos deve ser um número inteiro')
    .positive('Valor da assinatura deve ser maior que zero'),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data do primeiro vencimento deve estar no formato AAAA-MM-DD'),
  idempotency_key: z
    .string()
    .trim()
    .min(8, 'Chave de idempotência deve conter pelo menos 8 caracteres'),
  items: z
    .array(
      z.object({
        name: z.string().min(1, 'Nome do item é obrigatório'),
        quantity: z.number().int().positive().default(1),
        unit_amount_cents: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

// 4. Schema de Configurações Financeiras
export const updateFinancialSettingsSchema = z.object({
  default_payment_methods: z.array(financialBillingTypeSchema).min(1, 'Pelo menos um método padrão deve ser definido'),
  default_days_to_due: z.number().int().nonnegative('Dias até o vencimento não podem ser negativos'),
  fine_percentage: z.number().min(0, 'Multa não pode ser negativa').max(100, 'Multa não pode exceder 100%'),
  monthly_interest_percentage: z.number().min(0, 'Juros não podem ser negativos').max(100, 'Juros não podem exceder 100%'),
  auto_reconcile: z.boolean().default(true),
  notification_rules: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      whatsapp: z.boolean().default(false),
    })
    .default({ email: true, sms: false, whatsapp: false }),
});

export type CreateFinancialCustomerInput = z.infer<typeof createFinancialCustomerSchema>;
export type CreateFinancialChargeInput = z.infer<typeof createFinancialChargeSchema>;
export type CreateFinancialSubscriptionInput = z.infer<typeof createFinancialSubscriptionSchema>;
export type UpdateFinancialSettingsInput = z.infer<typeof updateFinancialSettingsSchema>;
