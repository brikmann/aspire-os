'use client';

import { motion } from 'framer-motion';
import { xpProgress } from '@/lib/xp';

export default function XPBar({ xp, animate = true }: { xp: number; animate?: boolean }) {
  const { level, current, needed, pct } = xpProgress(xp);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-[10px] font-bold text-cobalt shrink-0">Lv.{level}</span>
      <div className="flex-1 h-1.5 bg-midnight-edge rounded-full overflow-hidden min-w-[60px]">
        <motion.div
          className="h-full bg-cobalt rounded-full"
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[10px] text-silver-muted shrink-0">{current}/{needed}</span>
    </div>
  );
}
