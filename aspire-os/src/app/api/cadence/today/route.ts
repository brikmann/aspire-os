import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ cadence: null });

  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('cadence_protocols')
    .select('protocol_json, generated_at')
    .eq('user_id', user.id)
    .eq('protocol_date', today)
    .single();

  if (!data) return NextResponse.json({ cadence: null });

  return NextResponse.json({
    cadence: data.protocol_json,
    generatedAt: new Date(data.generated_at).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cadence } = await req.json();
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from('cadence_protocols').upsert(
    { user_id: user.id, protocol_date: today, protocol_json: cadence },
    { onConflict: 'user_id,protocol_date' }
  );

  return NextResponse.json({ ok: true });
}
