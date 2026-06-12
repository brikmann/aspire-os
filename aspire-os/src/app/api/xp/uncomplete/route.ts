import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { XP_PER_TASK } from '@/lib/xp';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskIndex, date } = await req.json();

  const { data: deleted } = await supabase
    .from('protocol_completions')
    .delete()
    .eq('user_id', user.id)
    .eq('completed_date', date)
    .eq('task_index', taskIndex)
    .select('xp_earned')
    .single();

  if (!deleted) {
    const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
    return NextResponse.json({ xp: profile?.xp ?? 0, deducted: false });
  }

  const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
  const newXp = Math.max(0, (profile?.xp ?? 0) - (deleted.xp_earned ?? XP_PER_TASK));
  await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id);

  return NextResponse.json({ xp: newXp, deducted: true });
}
