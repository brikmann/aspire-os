import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { XP_PER_TASK } from '@/lib/xp';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskIndex, taskText, date } = await req.json();

  // Idempotent insert — ignore if already completed
  const { error: insertError } = await supabase.from('protocol_completions').insert({
    user_id: user.id,
    completed_date: date,
    task_index: taskIndex,
    task_text: taskText,
    xp_earned: XP_PER_TASK,
  });

  // Already completed — don't double-award
  if (insertError) {
    const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
    return NextResponse.json({ xp: profile?.xp ?? 0, awarded: false });
  }

  // Award XP
  const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
  const newXp = (profile?.xp ?? 0) + XP_PER_TASK;
  await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id);

  return NextResponse.json({ xp: newXp, awarded: true });
}
