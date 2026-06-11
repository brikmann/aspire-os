import { createSupabaseServerClient } from './supabase-server'

export interface UserGoal {
  goal_id: string
  is_primary: boolean
  goal: {
    slug: string
    label: string
    description: string
    pillar: 'sleep' | 'sun' | 'satiate' | 'serenity'
  }
}

type RawRow = {
  goal_id: string
  is_primary: boolean
  goal: { slug: string; label: string; description: string; pillar: string } | { slug: string; label: string; description: string; pillar: string }[] | null
}

/**
 * Returns the goals a user selected during onboarding, ordered primary-first.
 * Called server-side (Server Components, Route Handlers, Server Actions).
 */
export async function getUserGoals(userId: string): Promise<UserGoal[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('user_goals')
    .select(`
      goal_id,
      is_primary,
      goal:goals ( slug, label, description, pillar )
    `)
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })

  if (error) return []

  return ((data ?? []) as RawRow[]).flatMap(row => {
    const g = Array.isArray(row.goal) ? row.goal[0] : row.goal
    if (!g) return []
    return [{
      goal_id: row.goal_id,
      is_primary: row.is_primary,
      goal: {
        slug: g.slug,
        label: g.label,
        description: g.description,
        pillar: g.pillar as UserGoal['goal']['pillar'],
      },
    }]
  })
}
