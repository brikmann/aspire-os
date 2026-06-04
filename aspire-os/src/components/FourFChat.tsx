'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type CadenceOutput } from '@/lib/cadence-schema';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ApiMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_PROMPTS = [
  "Why protein at lunch?",
  "What if I skip the afternoon walk?",
  "I have a 4pm meeting I forgot to add — how does that change things?",
];

type Props = {
  cadenceContext: CadenceOutput;
};

let idCounter = 0;
function nextId() { return `msg-${++idCounter}`; }

export default function FourFChat({ cadenceContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cadenceRef = useRef(cadenceContext);
  useEffect(() => { cadenceRef.current = cadenceContext; }, [cadenceContext]);

  // Ref ensures sendMessage always reads the latest messages without stale-closure issues.
  // Without this, useCallback([messages]) captures an intermediate snapshot during streaming
  // (e.g. the empty assistant placeholder) which gets sent as history on the follow-up turn.
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: Message = { id: nextId(), role: 'user', content: userText.trim() };
    const assistantId = nextId();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    const history: ApiMessage[] = [
      ...messagesRef.current.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText.trim() },
    ];

    try {
      const res = await fetch('/api/4f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, cadenceContext: cadenceRef.current }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: `Error: ${errText}` }
            : m
          )
        );
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: accumulated }
            : m
          )
        );
      }
      // Flush any bytes buffered by the streaming TextDecoder.
      const tail = decoder.decode();
      if (tail) {
        accumulated += tail;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: 'Network error — please try again.' }
          : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="bg-midnight-light/30 rounded-2xl p-6 border border-midnight-edge">

      <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt-soft mb-1">ASK 4F</p>
      <p className="text-sm text-silver-muted mb-6 leading-relaxed">
        Conversational coach for sleep, sun, nutrition, stress. Has full context from today&apos;s Cadence.
      </p>

      {/* Suggested prompts — empty state only */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {SUGGESTED_PROMPTS.map(prompt => (
            <motion.button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              className="text-sm text-cobalt border border-cobalt/30 rounded-full px-4 py-2 hover:bg-cobalt/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      )}

      {/* Chat thread */}
      {messages.length > 0 && (
        <div className="space-y-4 mb-6 max-h-[520px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {messages.map(m => (
              <motion.div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={m.role === 'user'
                  ? { opacity: 0, x: 16 }
                  : { opacity: 0 }
                }
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: m.role === 'user' ? 0.25 : 0.3,
                  ease: 'easeOut',
                }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-paper-warm text-ink'
                      : 'bg-midnight-light text-silver'
                  }`}
                >
                  {m.content
                    ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    : (
                      <div className="flex gap-1.5 items-center h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-silver-muted animate-bounce" style={{ animationDelay: '300ms' }} />
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
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask 4F anything about today's protocol…"
          disabled={isLoading}
          className="flex-1 bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-4 py-3 text-sm placeholder:text-silver-muted focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt resize-none transition-colors disabled:opacity-50"
          style={{ maxHeight: '96px', overflowY: 'auto' }}
        />
        <motion.button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex-shrink-0 bg-cobalt hover:bg-cobalt-dark disabled:bg-midnight-edge disabled:text-silver-dim text-silver-bright font-semibold text-sm px-5 py-3 rounded-lg transition-colors disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-midnight"
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          {isLoading ? '…' : 'Send'}
        </motion.button>
      </form>

    </div>
  );
}
