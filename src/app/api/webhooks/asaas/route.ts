/**
 * ⚡ Webhook Handler — /api/webhooks/asaas
 *
 * Ponto de entrada de eventos assíncronos do gateway Asaas:
 * 1. Validação de autenticidade (header asaas-access-token)
 * 2. Ingestão atômica e deduplicação em financial_webhook_events
 * 3. Transição canônica de estados via FinancialWebhookProcessor
 * 4. Liquidação automática e geração de recibos em financial_receipts
 * 5. Trilha de auditoria imutável
 */

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { FinancialWebhookRepository } from '@/modules/financial/repositories/financial-webhook.repository';
import { FinancialChargeRepository } from '@/modules/financial/repositories/financial-charge.repository';
import { FinancialReceiptRepository } from '@/modules/financial/repositories/financial-receipt.repository';
import { FinancialAuditService } from '@/modules/financial/services/financial-audit.service';
import {
  FinancialWebhookProcessor,
  type AsaasWebhookPayload,
} from '@/modules/financial/services/financial-webhook-processor';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Validação de Autenticidade do Token de Webhook (se configurado)
    const configuredSecret = process.env.ASAAS_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
    if (configuredSecret) {
      const receivedToken = request.headers.get('asaas-access-token');
      if (!receivedToken || receivedToken !== configuredSecret) {
        return NextResponse.json(
          {
            error: 'Não autorizado: token de webhook inválido ou ausente',
            code: 'WEBHOOK_UNAUTHORIZED',
          },
          { status: 401 }
        );
      }
    }

    // 2. Leitura do Payload JSON
    let payload: AsaasWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corpo da requisição inválido (JSON esperado)', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    if (!payload || !payload.event) {
      return NextResponse.json(
        { error: 'Payload de webhook inválido: campo "event" é obrigatório', code: 'MISSING_EVENT' },
        { status: 400 }
      );
    }

    // Identificador único do evento para deduplicação atômica
    const providerEventId =
      payload.id ||
      `${payload.event}_${payload.payment?.id || 'unknown'}_${payload.payment?.status || 'none'}_${payload.dateCreated || Date.now()}`;

    // 3. Inicialização dos Componentes com Supabase Admin (Service Role)
    const supabaseAdmin = createSupabaseAdminClient();
    const webhookRepo = new FinancialWebhookRepository(supabaseAdmin);
    const chargeRepo = new FinancialChargeRepository(supabaseAdmin);
    const receiptRepo = new FinancialReceiptRepository(supabaseAdmin);
    const auditService = new FinancialAuditService(supabaseAdmin);

    // 4. Ingestão Atômica com Deduplicação Única (provider, provider_event_id)
    const ingestedEvent = await webhookRepo.ingestEvent({
      provider: 'asaas',
      provider_event_id: providerEventId,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
    });

    // Se ingestedEvent for null, indica violação de unicidade (código 23505) -> Deduplicação
    if (!ingestedEvent) {
      return NextResponse.json(
        {
          received: true,
          deduplicated: true,
          message: `Evento ${providerEventId} já recebido e deduplicado anteriormente.`,
        },
        { status: 200 }
      );
    }

    // 5. Processamento Desacoplado do Evento
    const processor = new FinancialWebhookProcessor(
      webhookRepo,
      chargeRepo,
      receiptRepo,
      auditService
    );

    try {
      const result = await processor.processPayload(
        providerEventId,
        payload,
        ingestedEvent.id
      );

      return NextResponse.json(
        {
          received: true,
          processed: true,
          eventId: ingestedEvent.id,
          result,
        },
        { status: 200 }
      );
    } catch (procError) {
      const errorMessage = procError instanceof Error ? procError.message : String(procError);
      await webhookRepo.incrementRetry(ingestedEvent.id, errorMessage);

      console.error(`[AsaasWebhook] Erro ao processar evento ${providerEventId}:`, procError);
      return NextResponse.json(
        {
          received: true,
          processed: false,
          error: errorMessage,
          code: 'WEBHOOK_PROCESSING_FAILED',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[AsaasWebhook] Erro inesperado no endpoint de webhook:', error);
    return NextResponse.json(
      {
        error: 'Erro interno ao processar webhook',
        code: 'INTERNAL_WEBHOOK_ERROR',
      },
      { status: 500 }
    );
  }
}
