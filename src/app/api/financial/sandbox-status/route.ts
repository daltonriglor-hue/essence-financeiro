import { NextResponse } from 'next/server';
import { createAsaasProvider } from '@/modules/financial/providers/asaas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = createAsaasProvider();
    const connected = await provider.testConnection();

    if (!connected) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Não foi possível conectar ao Asaas Sandbox. Verifique ASAAS_SANDBOX_API_KEY no .env.local',
        },
        { status: 502 }
      );
    }

    const [accountInfo, accountStatus, balance] = await Promise.all([
      provider.getAccountInfo(),
      provider.getAccountStatus(),
      provider.getBalance(),
    ]);

    return NextResponse.json({
      connected: true,
      provider: 'asaas',
      mode: 'SANDBOX',
      accountInfo: {
        name: accountInfo.name,
        email: accountInfo.email,
        cpfCnpj: accountInfo.cpfCnpj,
        status: accountInfo.status,
      },
      accountStatus: {
        commercialInfo: accountStatus.commercialInfo,
        bankAccountInfo: accountStatus.bankAccountInfo,
        documentation: accountStatus.documentation,
        general: accountStatus.general,
      },
      balance: balance.balance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro interno ao consultar Asaas',
      },
      { status: 500 }
    );
  }
}
