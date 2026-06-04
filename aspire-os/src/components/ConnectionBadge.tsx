'use client';

import { motion } from 'framer-motion';

type Props = {
  label: string;
  connected: boolean;
  loading?: boolean;
};

export default function ConnectionBadge({ label, connected, loading }: Props) {
  const state = loading ? 'loading' : connected ? 'connected' : 'idle';

  return (
    <div className="flex items-center gap-1.5">
      <motion.span
        key={state}
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          loading
            ? 'bg-midnight-edge animate-pulse'
            : connected
            ? 'bg-cobalt'
            : 'bg-midnight-edge'
        }`}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      />
      <span className="text-xs text-silver-muted whitespace-nowrap">{label}</span>
    </div>
  );
}
