import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Stores today's cadence in the existing user_oauth table keyed by
// (user_id, 'cadence-YYYY-MM-DD') — avoids needing a new table.
function todayProvider() {
  return `cadence-${new Date().toISOString().slice(0, 10)}`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ cadence: null });

  const { data } = await supabase
    .from('user_oauth')
    .select('access_token, updated_at')
    .eq('session_id', user.id)
    .eq('provider', todayProvider())
    .single();

  if (!data?.access_token) return NextResponse.json({ cadence: null });

  try {
    const cadence = JSON.parse(data.access_token);
    const generatedAt = new Date(data.updated_at).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    return NextResponse.json({ cadence, generatedAt });
  } catch {
    return NextResponse.json({ cadence: null });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cadence } = await req.json();

  await supabase.from('user_oauth').upsert(
    {
      session_id: user.id,
      provider: todayProvider(),
      access_token: JSON.stringify(cadence),
    },
    { onConflict: 'session_id,provider' }
  );

  return NextResponse.json({ ok: true });
}
