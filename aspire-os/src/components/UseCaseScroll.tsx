"use client";

import { motion, type Variants } from "framer-motion";

type UseCase = {
  time: string;
  pillars: string;
  quote: string;
  answer: string;
};

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function UseCaseScroll({ useCases }: { useCases: UseCase[] }) {
  return (
    <motion.div
      className="flex flex-col gap-8"
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {useCases.map((uc, i) => (
        <motion.div
          key={i}
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-start"
        >
          <div className="bg-paper-warm rounded-2xl p-6 border border-paper-edge">
            <p className="font-sans font-medium text-[11px] uppercase tracking-[1px] text-cobalt mb-3">
              {uc.time} · {uc.pillars}
            </p>
            <p className="font-serif italic text-[18px] leading-[1.55] text-ink">
              &ldquo;{uc.quote}&rdquo;
            </p>
          </div>

          <div className="pl-5 border-l-2 border-cobalt py-1">
            <p className="font-sans font-normal text-[17px] leading-[1.8] text-ink-soft">
              {uc.answer}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
