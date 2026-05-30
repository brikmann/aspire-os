"use client";

import { motion } from "framer-motion";

export default function FadeIn({
  children,
  delay = 0,
  className = "",
  load = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  load?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: load ? 20 : 30 }}
      animate={load ? { opacity: 1, y: 0 } : undefined}
      whileInView={load ? undefined : { opacity: 1, y: 0 }}
      viewport={load ? undefined : { once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
