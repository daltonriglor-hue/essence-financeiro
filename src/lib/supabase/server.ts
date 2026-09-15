import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 🔐 Supabase Server Client — Usado em Server Components, Route Handlers e Server Actions.
 * Respeita RLS e auth.uid() automaticamente via cookie de sessão.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Silenciar se chamado de Server Component (read-only)
          }
        },
      },
    }
  );
}

/**
 * 🛡️ Supabase Admin Client — Usa service_role key para operações administrativas.
 * Ignora RLS. Usar SOMENTE em operações internas confiáveis (webhooks, reconciliação, auditoria).
 */
export function createSupabaseAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
