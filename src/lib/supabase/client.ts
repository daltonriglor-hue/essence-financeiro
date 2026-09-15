'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * 🌐 Supabase Browser Client — Usado em Client Components (use client).
 * Respeita RLS automaticamente via sessão do navegador.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
