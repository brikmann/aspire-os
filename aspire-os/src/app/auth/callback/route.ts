import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=auth_failed', origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session) {
    console.error('Auth callback exchange failed:', error?.message, error?.code, error?.status);
    const dest = new URL('/sign-in', origin);
    dest.searchParams.set('error', 'auth_failed');
    if (error?.message) dest.searchParams.set('detail', error.message.slice(0, 120));
    return NextResponse.redirect(dest);
  }

  // Route based on onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', session.user.id)
    .single()

  if (profile?.onboarded) {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  return NextResponse.redirect(new URL('/onboarding', origin))
}
