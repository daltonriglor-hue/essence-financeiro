import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Migration 00003_financial_module.sql Integrity', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/00003_financial_module.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  it('deve conter a definição dos 11 enums de domínio', () => {
    const requiredEnums = [
      'financial_account_status',
      'financial_account_connection_mode',
      'financial_credential_mode',
      'financial_credential_status',
      'financial_billing_type',
      'financial_charge_status',
      'financial_customer_type',
      'financial_subscription_cycle',
      'financial_subscription_status',
      'financial_webhook_processing_status',
      'financial_notification_channel',
    ];

    for (const enumName of requiredEnums) {
      expect(sql).toContain(`CREATE TYPE ${enumName} AS ENUM`);
    }
  });

  it('deve conter a criação das 15 tabelas financeiras', () => {
    const requiredTables = [
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
      'financial_webhook_events',
      'financial_audit_logs',
      'financial_notifications',
      'financial_settings',
    ];

    for (const tableName of requiredTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${tableName}`);
    }
  });

  it('deve habilitar Row Level Security (RLS) para todas as tabelas', () => {
    const requiredTables = [
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
      'financial_webhook_events',
      'financial_audit_logs',
      'financial_notifications',
      'financial_settings',
    ];

    for (const tableName of requiredTables) {
      expect(sql).toContain(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('deve impor a chave composta anti-cross-tenant com contacts', () => {
    expect(sql).toContain('FOREIGN KEY (crm_contact_id, organization_id)');
    expect(sql).toContain('REFERENCES contacts(id, organization_id)');
  });

  it('deve conter índices de performance para organization_id e idempotência', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_financial_accounts_org');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_financial_charges_org');
    expect(sql).toContain('uk_charges_org_idempotency UNIQUE (organization_id, idempotency_key)');
    expect(sql).toContain('uk_webhook_events_provider_event UNIQUE (provider, provider_event_id)');
  });
});
