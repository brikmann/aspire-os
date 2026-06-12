export const XP_PER_TASK = 10;

// Total XP required to reach `level` from zero.
// Grows as level^1.5 so early levels are fast, higher levels slow down.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const current = xp - floor;
  const needed = ceiling - floor;
  return { level, current, needed, pct: Math.min(current / needed, 1) };
}
