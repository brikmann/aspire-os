'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const BTN_CLASS =
  'btn-shimmer relative overflow-hidden inline-flex items-center gap-2.5 bg-cobalt hover:bg-cobalt-dark active:scale-[0.98] text-white font-semibold text-[17px] px-9 py-4 rounded-xl transition-all duration-200 shadow-[0_4px_32px_rgba(44,107,224,0.35)]';

export default function HeroSignIn() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setAuthed(!!data.user));
  }, []);

  async function handleSignIn() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  // Pre-hydration: invisible placeholder to avoid layout shift
  if (authed === null) {
    return (
      <span className={BTN_CLASS + ' opacity-0 pointer-events-none select-none'} aria-hidden="true">
        Continue with Google
      </span>
    );
  }

  if (authed) {
    return (
      <Link href="/dashboard" className={BTN_CLASS}>
        Open Dashboard
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    );
  }

  return (
    <button onClick={handleSignIn} className={BTN_CLASS}>
      <GoogleIcon />
      Continue with Google
    </button>
  );
}
