'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

function Wordmark() {
  return (
    <span className="font-mono text-sm font-medium uppercase tracking-[4px]" style={{ color: '#ffffff' }}>
      ASP<span style={{ color: 'var(--color-auth-cobalt)' }}>I</span>RE OS
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
    // On success the browser navigates away — no need to reset loading
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-auth-bg)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <Wordmark />
          <p
            className="text-sm text-center leading-relaxed"
            style={{ color: 'var(--color-auth-secondary)' }}
          >
            The operating system for human optimization.
          </p>
        </div>

        {/* CTA */}
        <div className="w-full flex flex-col items-center gap-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{ background: 'var(--color-auth-cobalt)', minHeight: '52px' }}
            aria-label="Continue with Google"
          >
            {loading ? (
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
            ) : (
              <GoogleIcon />
            )}
            <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
          </button>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--color-auth-secondary)' }}>
              {error}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
