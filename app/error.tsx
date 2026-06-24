"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className={["inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50", "mb-6"].join(" ")}>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-2">Something went wrong</h1>
        <p className="text-stone-500 mb-8 leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>

        <button
          onClick={reset}
          className={[
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 text-white text-sm",
            "font-medium hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/20",
            "active:scale-95 transition-all duration-200",
          ].join(" ")}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </motion.div>
    </div>
  );
}
