-- ==============================================================================
-- 🏛️ ESSENCE FINANCEIRO — MIGRATION 00003_FINANCIAL_MODULE.SQL
-- ==============================================================================
-- Descrição: Fundação de Banco de Dados, Tipos de Domínio, RLS Multi-Tenant,
--            Integridade Referencial Anti-Cross-Tenant e Índices de Performance.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS DE DOMÍNIO (11 Enums)
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE financial_account_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_account_connection_mode AS ENUM ('DIRECT_CREDENTIALS', 'SUBACCOUNT', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_credential_mode AS ENUM ('SANDBOX', 'PRODUCTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_credential_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_billing_type AS ENUM ('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_charge_status AS ENUM (
        'DRAFT', 
        'PENDING', 
        'AWAITING_PAYMENT', 
        'PAID', 
        'OVERDUE', 
        'CANCELLED', 
        'REFUNDED', 
        'PENDING_RECONCILIATION'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_customer_type AS ENUM ('INDIVIDUAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_subscription_cycle AS ENUM (
        'WEEKLY', 
        'BIWEEKLY', 
        'MONTHLY', 
        'QUARTERLY', 
        'SEMIANNUALLY', 
        'YEARLY'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_subscription_status AS ENUM ('ACTIVE', 'OVERDUE', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_webhook_processing_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_notification_channel AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ------------------------------------------------------------------------------
-- 2. TABELAS DE DOMÍNIO FINANCEIRO (15 Tabelas)
-- ------------------------------------------------------------------------------

-- 2.1 Contas Financeiras da Organização
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    status financial_account_status NOT NULL DEFAULT 'PENDING',
    connection_mode financial_account_connection_mode NOT NULL DEFAULT 'DIRECT_CREDENTIALS',
    account_identifier VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_financial_accounts_org_provider UNIQUE (organization_id, provider)
);

-- 2.2 Credenciais do Provedor (Armazenamento Seguro por Secret Reference)
CREATE TABLE IF NOT EXISTS financial_provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    mode financial_credential_mode NOT NULL DEFAULT 'SANDBOX',
    status financial_credential_status NOT NULL DEFAULT 'ACTIVE',
    secret_reference VARCHAR(255) NOT NULL,
    last_verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_financial_credentials_acc_mode UNIQUE (account_id, mode)
);

-- 2.3 Onboarding & Validação Regulatória
CREATE TABLE IF NOT EXISTS financial_onboardings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    provider_onboarding_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    regulatory_status VARCHAR(50) DEFAULT 'PENDING_DOCUMENTS',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Perfil Empresarial da Conta
CREATE TABLE IF NOT EXISTS financial_business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_type VARCHAR(20) NOT NULL DEFAULT 'CNPJ',
    document_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    postal_code VARCHAR(20),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Perfil Fiscal & Tributário
CREATE TABLE IF NOT EXISTS financial_tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    tax_regime VARCHAR(50),
    municipal_registration VARCHAR(50),
    state_registration VARCHAR(50),
    cnae_code VARCHAR(20),
    tax_retention_rules JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Clientes / Pagadores Financeiros (Vinculados aos Contatos do CRM)
CREATE TABLE IF NOT EXISTS financial_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    crm_contact_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    external_customer_id VARCHAR(100),
    customer_type financial_customer_type NOT NULL DEFAULT 'INDIVIDUAL',
    name VARCHAR(255) NOT NULL,
    document_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    postal_code VARCHAR(20),
    address VARCHAR(255),
    address_number VARCHAR(50),
    address_complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(10),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_financial_customers_org_contact UNIQUE (organization_id, crm_contact_id)
);

-- 2.7 Cobranças Avulsas (Contas a Receber)
CREATE TABLE IF NOT EXISTS financial_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES financial_customers(id) ON DELETE RESTRICT,
    subscription_id UUID,
    crm_opportunity_id UUID,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    external_id VARCHAR(100),
    idempotency_key VARCHAR(150) NOT NULL,
    billing_type financial_billing_type NOT NULL DEFAULT 'PIX',
    status financial_charge_status NOT NULL DEFAULT 'PENDING',
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    net_amount_cents BIGINT,
    fee_cents BIGINT DEFAULT 0,
    description TEXT,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_url TEXT,
    pix_qr_code_base64 TEXT,
    pix_copy_paste TEXT,
    bank_slip_bar_code TEXT,
    bank_slip_digitable_line TEXT,
    bank_slip_pdf_url TEXT,
    client_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_charges_org_idempotency UNIQUE (organization_id, idempotency_key)
);

-- 2.8 Liquidações / Extrato de Recebimentos
CREATE TABLE IF NOT EXISTS financial_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    charge_id UUID NOT NULL REFERENCES financial_charges(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    external_payment_id VARCHAR(100),
    gross_amount_cents BIGINT NOT NULL CHECK (gross_amount_cents > 0),
    fee_amount_cents BIGINT NOT NULL DEFAULT 0,
    net_amount_cents BIGINT NOT NULL,
    payment_method financial_billing_type NOT NULL,
    liquidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    credit_date DATE,
    raw_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 Assinaturas e Contratos Recorrentes
CREATE TABLE IF NOT EXISTS financial_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES financial_customers(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    external_id VARCHAR(100),
    idempotency_key VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status financial_subscription_status NOT NULL DEFAULT 'ACTIVE',
    billing_type financial_billing_type NOT NULL DEFAULT 'PIX',
    cycle financial_subscription_cycle NOT NULL DEFAULT 'MONTHLY',
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    next_due_date DATE NOT NULL,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_subscriptions_org_idempotency UNIQUE (organization_id, idempotency_key)
);

-- 2.10 Itens da Assinatura
CREATE TABLE IF NOT EXISTS financial_subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES financial_subscriptions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount_cents BIGINT NOT NULL CHECK (unit_amount_cents >= 0),
    total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar FK de subscription_id em financial_charges após a criação de subscriptions
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_charges_subscription'
    ) THEN
        ALTER TABLE financial_charges 
        ADD CONSTRAINT fk_financial_charges_subscription 
        FOREIGN KEY (subscription_id) REFERENCES financial_subscriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2.11 Configurações de Webhook por Conta
CREATE TABLE IF NOT EXISTS financial_webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    endpoint_url TEXT NOT NULL,
    auth_token_reference VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    events_subscribed TEXT[] DEFAULT ARRAY['PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED']::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12 Ingestão Atômica de Eventos de Webhook (Deduplicação de Idempotência)
CREATE TABLE IF NOT EXISTS financial_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
    provider_event_id VARCHAR(150) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processing_status financial_webhook_processing_status NOT NULL DEFAULT 'PENDING',
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uk_webhook_events_provider_event UNIQUE (provider, provider_event_id)
);

-- 2.13 Trilha de Auditoria Imutável
CREATE TABLE IF NOT EXISTS financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    request_id VARCHAR(100),
    actor_id UUID,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.14 Réguas de Notificação de Cobrança
CREATE TABLE IF NOT EXISTS financial_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    charge_id UUID REFERENCES financial_charges(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES financial_customers(id) ON DELETE CASCADE,
    channel financial_notification_channel NOT NULL DEFAULT 'EMAIL',
    trigger_rule VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.15 Configurações Financeiras Globais da Organização
CREATE TABLE IF NOT EXISTS financial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    default_payment_methods financial_billing_type[] DEFAULT ARRAY['PIX', 'BOLETO', 'CREDIT_CARD']::financial_billing_type[],
    default_days_to_due INTEGER NOT NULL DEFAULT 3 CHECK (default_days_to_due >= 0),
    fine_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.00 CHECK (fine_percentage >= 0),
    monthly_interest_percentage NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (monthly_interest_percentage >= 0),
    notification_rules JSONB DEFAULT '{"email": true, "sms": false, "whatsapp": false}'::jsonb,
    auto_reconcile BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------------------------
-- 3. INTEGRIDADE ANTI-CROSS-TENANT (COMPOSITE FOREIGN KEY)
-- ------------------------------------------------------------------------------
-- Assegura que o pagador financeiro nunca seja vinculado a um contato de outra organização.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts'
    ) THEN
        -- Garantir restrição única composta em contacts(id, organization_id) caso ainda não exista
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uk_contacts_id_organization'
        ) THEN
            ALTER TABLE contacts ADD CONSTRAINT uk_contacts_id_organization UNIQUE (id, organization_id);
        END IF;

        -- Adicionar composite FK em financial_customers
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_customers_contact_tenant'
        ) THEN
            ALTER TABLE financial_customers
            ADD CONSTRAINT fk_financial_customers_contact_tenant
            FOREIGN KEY (crm_contact_id, organization_id)
            REFERENCES contacts(id, organization_id)
            ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. ÍNDICES DE PERFORMANCE E CONSULTAS FREQUENTES
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_financial_accounts_org ON financial_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_credentials_org ON financial_provider_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_customers_org ON financial_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_customers_external ON financial_customers(external_customer_id);

CREATE INDEX IF NOT EXISTS idx_financial_charges_org ON financial_charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_charges_status ON financial_charges(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_charges_due_date ON financial_charges(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_financial_charges_customer ON financial_charges(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_charges_external ON financial_charges(external_id);

CREATE INDEX IF NOT EXISTS idx_financial_receipts_org ON financial_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_receipts_charge ON financial_receipts(charge_id);
CREATE INDEX IF NOT EXISTS idx_financial_receipts_date ON financial_receipts(liquidated_at);

CREATE INDEX IF NOT EXISTS idx_financial_subs_org ON financial_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_subs_status ON financial_subscriptions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_webhook_events_status ON financial_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_financial_webhook_events_received ON financial_webhook_events(received_at);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_org ON financial_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_entity ON financial_audit_logs(entity_name, entity_id);


-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- ------------------------------------------------------------------------------

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

-- Macro / Função auxiliar para políticas RLS
-- Permite leitura e gravação apenas no tenant correspondente ao usuário autenticado
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'financial_accounts',
        'financial_provider_credentials',
        'financial_onboardings',
        'financial_business_profiles',
        'financial_tax_profiles',
        'financial_customers',
        'financial_charges',
        'financial_receipts',
        'financial_subscriptions',
        'financial_subscription_items',
        'financial_webhook_configs',
        'financial_audit_logs',
        'financial_notifications',
        'financial_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS p_tenant_isolation_all ON %I;
            CREATE POLICY p_tenant_isolation_all ON %I
                FOR ALL
                TO authenticated
                USING (
                    organization_id IN (
                        SELECT organization_id FROM users WHERE id = auth.uid()
                    )
                )
                WITH CHECK (
                    organization_id IN (
                        SELECT organization_id FROM users WHERE id = auth.uid()
                    )
                );
        ', tbl, tbl);
    END LOOP;
END $$;

-- Política de RLS específica para financial_webhook_events:
-- Permite inserção por service_role e consulta por administradores autenticados da organização
DROP POLICY IF EXISTS p_webhook_events_tenant_select ON financial_webhook_events;
CREATE POLICY p_webhook_events_tenant_select ON financial_webhook_events
    FOR SELECT
    TO authenticated
    USING (
        organization_id IS NULL OR organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );
