'use client';

import { motion } from 'framer-motion';

export type IntegrationStatus = 'loading' | 'disconnected' | 'connected' | 'reconnect-needed';

type Props = {
  name: string;
  description: string;
  status: IntegrationStatus;
  connectHref: string;
  connectLabel: string;
  reconnectHref?: string;
  connectedSummary?: string;
  onDisconnect?: () => void;
  errorMessage?: string;
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#2C6BE0" strokeWidth="1.5" />
      <path d="M4.5 7l2 2 3-3" stroke="#2C6BE0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function IntegrationCard({
  name,
  description,
  status,
  connectHref,
  connectLabel,
  reconnectHref,
  connectedSummary,
  onDisconnect,
  errorMessage,
}: Props) {
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-xs text-silver-muted animate-pulse px-1">
        <span className="w-3 h-3 rounded-full bg-midnight-edge flex-shrink-0" />
        Checking {name}…
      </div>
    );
  }

  if (status === 'reconnect-needed') {
    return (
      <motion.div
        className="flex items-center justify-between bg-midnight-edge/40 rounded-2xl px-4 py-3"
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div>
          <p className="text-sm text-silver-bright font-medium">{name}</p>
          <p className="text-xs text-silver-muted mt-1">Session expired — reconnect to restore data sync</p>
        </div>
        {(reconnectHref ?? connectHref) && (
          <a
            href={reconnectHref ?? connectHref}
            className="text-xs font-semibold text-cobalt hover:text-cobalt-soft transition-colors flex-shrink-0 ml-4"
          >
            Reconnect →
          </a>
        )}
      </motion.div>
    );
  }

  if (status === 'connected') {
    return (
      <motion.div
        className="flex items-center justify-between bg-cobalt/10 border border-cobalt/20 rounded-2xl px-4 py-3"
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <CheckIcon />
          <span className="text-silver-bright font-medium">{name}</span>
          {connectedSummary && (
            <span className="text-silver-muted">· {connectedSummary}</span>
          )}
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-silver-muted hover:text-silver transition-colors ml-3 flex-shrink-0"
          >
            Disconnect
          </button>
        )}
      </motion.div>
    );
  }

  // disconnected
  return (
    <div>
      {errorMessage && (
        <p className="text-xs text-red-400 mb-2">{errorMessage}</p>
      )}
      <motion.a
        href={connectHref}
        className="flex items-center justify-between w-full rounded-2xl py-3 px-4 bg-midnight-light border border-midnight-edge hover:border-cobalt/40 hover:bg-midnight-light/80 transition-colors group"
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-silver-bright group-hover:text-cobalt-soft transition-colors">
            {name}
          </p>
          <p className="text-xs text-silver-muted mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-1.5 text-cobalt text-xs font-semibold flex-shrink-0 ml-4">
          <LinkArrowIcon />
          {connectLabel}
        </div>
      </motion.a>
    </div>
  );
}
