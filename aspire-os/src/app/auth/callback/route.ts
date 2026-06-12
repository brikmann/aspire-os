import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Supabase OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/sign-in?error=auth_failed&detail=${encodeURIComponent(errorDescription ?? error)}`, origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=auth_failed&detail=no_code', origin))
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

  const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !session) {
    console.error('Auth callback exchange failed:', exchangeError?.message, exchangeError?.code)
    return NextResponse.redirect(
      new URL(`/sign-in?error=auth_failed&detail=${encodeURIComponent(exchangeError?.message ?? 'no_session')}`, origin)
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', session.user.id)
    .single()

  return NextResponse.redirect(
    new URL(profile?.onboarded ? '/dashboard' : '/onboarding', origin)
  )
}
