'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import XPBar from './XPBar';

function initials(name: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name: string | null): string {
  if (!name) return '#2C6BE0';
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ['#2C6BE0', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
  return colors[hash % colors.length];
}

type Props = {
  displayName: string | null;
  xp: number;
  onNameSaved: (name: string) => void;
};

export default function UserProfile({ displayName, xp, onNameSaved }: Props) {
  const [editing, setEditing] = useState(!displayName);
  const [draft, setDraft] = useState(displayName ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: draft.trim() }),
      });
      if (res.ok) {
        onNameSaved(draft.trim());
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const bg = avatarColor(displayName);
  const ini = initials(displayName);

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white select-none"
        style={{ background: bg }}
      >
        {ini}
      </div>

      {/* Name + XP */}
      <div className="min-w-0">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => { e.preventDefault(); save(); }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                className="bg-midnight-edge/60 border border-cobalt/40 rounded-md px-2 py-0.5 text-sm text-silver-bright placeholder:text-silver-muted focus:outline-none focus:border-cobalt w-32"
              />
              <button
                type="submit"
                disabled={!draft.trim() || saving}
                className="text-xs font-semibold text-cobalt hover:text-cobalt-soft disabled:opacity-40 transition-colors"
              >
                {saving ? '…' : 'Save'}
              </button>
            </motion.form>
          ) : (
            <motion.button
              key="display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-silver-bright hover:text-cobalt-soft transition-colors text-left leading-none mb-1"
              title="Edit name"
            >
              {displayName}
            </motion.button>
          )}
        </AnimatePresence>

        {!editing && <XPBar xp={xp} />}
      </div>
    </div>
  );
}
