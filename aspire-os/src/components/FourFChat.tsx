'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type CadenceOutput } from '@/lib/cadence-schema';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Props = { cadenceContext: CadenceOutput };

let uid = 0;
const mkId = () => `m${++uid}`;

const PROMPTS = [
  "Why protein at lunch?",
  "What if I skip the afternoon walk?",
  "I have a 4pm meeting I forgot to add — how does that change things?",
];

export default function FourFChat({ cadenceContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sending     = useRef(false); // prevents concurrent sends across async boundaries

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  // Plain async function — recreated each render, so `messages` is always the current snapshot.
  // No refs needed for history; no stale-closure risk.
  async function send(text: string) {
    const trimmed = text.trim();
    console.log('[4F] send called', { trimmed: trimmed.slice(0, 30), loading, sending: sending.current, historyLen: messages.length });
    if (!trimmed || loading || sending.current) return;
    sending.current = true;
    setLoading(true);
    setInput('');

    const asstId  = mkId();
    const userMsg: Message = { id: mkId(), role: 'user', content: trimmed };

    // Build API history from the messages snapshot at this render, before the new turn is added.
    const history = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ];

    setMessages(prev => [...prev, userMsg, { id: asstId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/4f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, cadenceContext }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => 'Request failed');
        setMessages(prev =>
          prev.map(m => m.id === asstId ? { ...m, content: `Error: ${err}` } : m)
        );
        return;
      }

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let acc      = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === asstId ? { ...m, content: acc } : m)
        );
      }
      const tail = dec.decode();
      if (tail) {
        acc += tail;
        setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: acc } : m));
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === asstId ? { ...m, content: 'Network error — please try again.' } : m)
      );
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Section header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt-soft mb-1">Ask Cadence</p>
        <p className="text-sm text-silver-muted leading-relaxed max-w-prose">
          Ask anything about your protocol — why a block is scheduled, what to swap, how to adjust for a late meeting.
        </p>
      </div>

      {/* Suggested prompts — empty state only */}
      {messages.length === 0 && (
        <motion.div
          className="flex flex-wrap gap-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
        >
          {PROMPTS.map(p => (
            <motion.button
              key={p}
              type="button"
              onClick={() => send(p)}
              disabled={loading}
              className="text-sm text-silver-muted border border-midnight-edge rounded-full px-4 py-2 hover:border-cobalt/40 hover:text-cobalt-soft transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
              variants={{
                hidden: { opacity: 0, y: 10, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } },
              }}
              whileHover={{ scale: 1.04, y: -1, borderColor: 'rgba(61,122,237,0.4)', transition: { type: 'spring', stiffness: 600, damping: 20 } }}
              whileTap={{ scale: 0.96 }}
            >
              {p}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Chat thread */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {messages.map(m => (
              <motion.div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={m.role === 'user' ? { opacity: 0, x: 12 } : { opacity: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: m.role === 'user' ? 0.2 : 0.3, ease: 'easeOut' }}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-midnight-edge/60 text-silver-bright'
                      : 'bg-midnight-light/50 text-silver'
                  }`}
                >
                  {m.content
                    ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    : (
                      <div className="flex gap-1.5 items-center h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-typing-dot" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-typing-dot" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-typing-dot" style={{ animationDelay: '300ms' }} />
                      </div>
                    )
                  }
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(input); }}
        className="flex gap-3 items-end"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask anything about today's protocol…"
          disabled={loading}
          className="flex-1 bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-4 py-3 text-sm placeholder:text-silver-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:border-cobalt resize-none transition-colors disabled:opacity-50"
          style={{ maxHeight: '96px', overflowY: 'auto' }}
        />
        <motion.button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="flex-shrink-0 bg-cobalt disabled:bg-midnight-edge disabled:text-silver-dim text-silver-bright font-semibold text-sm px-5 py-3 rounded-lg transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
          whileHover={{ scale: 1.04, y: -1, backgroundColor: 'var(--color-cobalt-dark)', transition: { type: 'spring', stiffness: 600, damping: 20 } }}
          whileTap={{ scale: 0.95, y: 0 }}
        >
          {loading ? '…' : 'Send'}
        </motion.button>
      </form>

    </div>
  );
}
