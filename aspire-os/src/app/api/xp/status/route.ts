import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const [profileResult, completionsResult] = await Promise.all([
    supabase.from('profiles').select('xp, display_name').eq('id', user.id).single(),
    supabase.from('protocol_completions')
      .select('task_index')
      .eq('user_id', user.id)
      .eq('completed_date', today),
  ]);

  return NextResponse.json({
    xp: profileResult.data?.xp ?? 0,
    displayName: profileResult.data?.display_name ?? null,
    completedToday: (completionsResult.data ?? []).map(r => r.task_index),
  });
}
