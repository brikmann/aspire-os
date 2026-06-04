'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const QUOTE =
  "This is what I needed at 19. A way to connect all my health metrics together and see a truly holistic picture.";

const words = QUOTE.replace(/[""]/g, '').trim().split(' ');

export default function FounderNote() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const wordDelay = (i: number) => 0.45 + i * 0.038;
  const authorDelay = wordDelay(words.length) + 0.12;

  return (
    <div ref={ref} className="max-w-[640px] mx-auto">
      {/* Card — curtain reveal from bottom */}
      <motion.div
        initial={{ clipPath: 'inset(100% 0 0 0)', opacity: 0 }}
        animate={inView ? { clipPath: 'inset(0% 0 0 0)', opacity: 1 } : {}}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="bg-paper rounded-2xl p-8 md:p-12 overflow-hidden"
      >
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="font-sans font-medium text-[11px] uppercase tracking-[1.5px] text-cobalt mb-8"
        >
          A Note from the Founder
        </motion.p>

        {/* Quote — word-by-word stagger */}
        <blockquote
          className="font-serif italic text-[22px] md:text-[26px] leading-[1.55] tracking-[-0.3px] text-ink"
          aria-label={QUOTE}
        >
          <span aria-hidden="true">&ldquo;</span>
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.35, delay: wordDelay(i), ease: 'easeOut' }}
              className="inline-block mr-[0.26em]"
            >
              {word}
            </motion.span>
          ))}
          <span aria-hidden="true">&rdquo;</span>
        </blockquote>

        {/* Attribution — slides in from left */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.45, delay: authorDelay, ease: 'easeOut' }}
          className="mt-8 pt-6 border-t border-paper-edge"
        >
          <p className="font-sans font-semibold text-[15px] text-ink">Noah Brikman</p>
          <p className="font-sans text-[13px] text-ink-soft mt-0.5">Founder, Aspire OS</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
