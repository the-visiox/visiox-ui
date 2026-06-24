"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for premium feel
      }}
      className="flex-grow flex flex-col"
    >
      {children}
    </motion.div>
  );
}
