import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Cookie-based storage adapter so the PKCE code verifier survives the
// cross-origin redirect (Google → Supabase → aspireos.co) and is readable
// by the server-side route handler that calls exchangeCodeForSession.
function cookieStorage() {
  return {
    getItem(key: string): string | null {
      if (typeof document === 'undefined') return null;
      const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${key}=`));
      return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
    },
    setItem(key: string, value: string): void {
      if (typeof document === 'undefined') return;
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax${secure}`;
    },
    removeItem(key: string): void {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; path=/; max-age=0`;
    },
  };
}

export function getSupabaseBrowser(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          storage: cookieStorage(),
        },
      }
    )
  }
  return _client
}
