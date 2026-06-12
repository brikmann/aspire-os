'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

function Spinner() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-midnight">
      <span className="text-silver-muted text-sm font-mono animate-pulse">Signing in…</span>
    </main>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      router.replace(`/sign-in?error=auth_failed&detail=${encodeURIComponent(errorDescription ?? error)}`);
      return;
    }

    if (!code) {
      router.replace('/sign-in?error=auth_failed&detail=no_code');
      return;
    }

    (async () => {
      const supabase = getSupabaseBrowser();

      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !session) {
        router.replace(`/sign-in?error=auth_failed&detail=${encodeURIComponent(exchangeError?.message ?? 'no_session')}`);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', session.user.id)
        .single();

      router.replace(profile?.onboarded ? '/dashboard' : '/onboarding');
    })();
  }, [router, searchParams]);

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
