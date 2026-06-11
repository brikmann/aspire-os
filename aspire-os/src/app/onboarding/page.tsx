'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type Pillar = 'sleep' | 'sun' | 'satiate' | 'serenity';

interface Goal {
  id: string;
  slug: string;
  label: string;
  description: string;
  pillar: Pillar;
  sort_order: number;
}

const PILLAR_ICONS: Record<Pillar, React.ReactNode> = {
  satiate: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2v2M10 16v2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M2 10h2M16 10h2M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  sleep: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M17.3 11.3A7 7 0 0 1 8.7 2.7 7 7 0 1 0 17.3 11.3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  serenity: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17c2-4 4-6 7-6s5 2 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 11V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 6c1-2 3-3 3-3s2 1 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sun: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v2M10 15v2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M3 10h2M15 10h2M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
};

function Wordmark() {
  return (
    <span className="font-mono text-xs font-medium uppercase tracking-[4px]" style={{ color: '#ffffff' }}>
      ASP<span style={{ color: 'var(--color-auth-cobalt)' }}>I</span>RE OS
    </span>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
      <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.27l-3.09 1.74.59-3.44-2.5-2.437 3.455-.502L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Load goals and guard against already-onboarded users
  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowser();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/sign-in'); return; }

      // Skip onboarding if already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .single();
      if (profile?.onboarded) { router.replace('/dashboard'); return; }

      const { data, error } = await supabase
        .from('goals')
        .select('id, slug, label, description, pillar, sort_order')
        .eq('active', true)
        .order('sort_order');

      if (error) { setLoadError('Could not load goals — please refresh.'); return; }
      setGoals(data ?? []);
    }
    init();
  }, [router]);

  function toggleGoal(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryId === id) {
          const remaining = [...next];
          setPrimaryId(remaining[0] ?? null);
        }
      } else {
        next.add(id);
        if (!primaryId) setPrimaryId(id);
      }
      return next;
    });
  }

  function setPrimary(id: string) {
    if (!selected.has(id)) {
      setSelected(prev => { const next = new Set(prev); next.add(id); return next; });
    }
    setPrimaryId(id);
  }

  async function handleStart() {
    if (selected.size === 0) return;
    setSaving(true);

    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/sign-in'); return; }

    const rows = [...selected].map(goalId => ({
      user_id: user.id,
      goal_id: goalId,
      is_primary: goalId === primaryId,
    }));

    const { error: goalsError } = await supabase
      .from('user_goals')
      .upsert(rows, { onConflict: 'user_id,goal_id' });

    if (goalsError) {
      setSaving(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ onboarded: true })
      .eq('id', user.id);

    router.replace('/dashboard');
  }

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-auth-bg)' }}>
        <p className="text-sm" style={{ color: 'var(--color-auth-secondary)' }}>{loadError}</p>
      </main>
    );
  }

  const canStart = selected.size > 0;

  return (
    <main
      className="min-h-screen flex flex-col px-6 py-12"
      style={{ background: 'var(--color-auth-bg)' }}
    >
      <div className="w-full max-w-lg mx-auto flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <Wordmark />
          <div className="flex flex-col gap-2 mt-2">
            <h1 className="text-2xl font-semibold leading-tight" style={{ color: '#ffffff' }}>
              What are you here to build?
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-auth-secondary)' }}>
              Pick what matters most. Cadence takes it from here.
            </p>
          </div>
        </div>

        {/* Goal cards */}
        {goals.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl animate-pulse"
                style={{ background: 'var(--color-auth-surface)' }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map(goal => {
              const isSelected = selected.has(goal.id);
              const isPrimary = primaryId === goal.id;
              return (
                <div
                  key={goal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGoal(goal.id)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleGoal(goal.id)}
                  className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    background: isSelected ? 'rgba(31,58,95,0.25)' : 'var(--color-auth-surface)',
                    border: `1.5px solid ${isSelected ? 'var(--color-auth-cobalt)' : 'transparent'}`,
                    outlineColor: 'var(--color-auth-cobalt)',
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${goal.label} — ${goal.description}`}
                >
                  {/* Pillar icon */}
                  <div
                    className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: isSelected ? 'rgba(31,58,95,0.5)' : 'rgba(255,255,255,0.06)',
                      color: isSelected ? '#ffffff' : 'var(--color-auth-secondary)',
                    }}
                  >
                    {PILLAR_ICONS[goal.pillar]}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold leading-tight"
                      style={{ color: isSelected ? '#ffffff' : 'var(--color-auth-off-white)' }}
                    >
                      {goal.label}
                    </p>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: 'var(--color-auth-secondary)' }}
                    >
                      {goal.description}
                    </p>
                  </div>

                  {/* Primary star */}
                  {isSelected && (
                    <button
                      onClick={e => { e.stopPropagation(); setPrimary(goal.id); }}
                      className="mt-0.5 flex-shrink-0 p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-1"
                      style={{
                        color: isPrimary ? '#ffffff' : 'rgba(255,255,255,0.3)',
                        outlineColor: 'var(--color-auth-cobalt)',
                      }}
                      aria-label={isPrimary ? 'Primary goal' : 'Set as primary goal'}
                      title={isPrimary ? 'Primary goal' : 'Mark as primary'}
                    >
                      <StarIcon filled={isPrimary} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Helper text */}
        {selected.size > 0 && (
          <p className="text-xs -mt-6" style={{ color: 'var(--color-auth-secondary)' }}>
            {primaryId
              ? `Star marks your primary focus — Cadence builds around it first.`
              : `Tap ★ on one goal to mark it as your primary focus.`}
          </p>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 pb-6">
          <button
            onClick={handleStart}
            disabled={!canStart || saving}
            className="w-full py-4 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{ background: 'var(--color-auth-cobalt)', minHeight: '52px' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                Setting up…
              </span>
            ) : 'Start'}
          </button>
        </div>

      </div>
    </main>
  );
}
