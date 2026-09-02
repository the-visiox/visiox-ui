"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, X, AlertTriangle } from "lucide-react";
import { useBackgroundExports, dismissExportTask } from "@/lib/exportManager";

export default function BackgroundExportToasts() {
  const tasks = useBackgroundExports();

  if (typeof document === "undefined" || tasks.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-5 right-5 z-[260] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {tasks.map((task) => {
          const isError = task.status === "error";
          const isCompleted = task.status === "completed";

          return (
            <motion.div
              key={task.id}
              role={isError ? "alert" : "status"}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={[
                "pointer-events-auto rounded-2xl border bg-white p-4 shadow-xl shadow-stone-950/10",
                isError
                  ? "border-red-200"
                  : isCompleted
                    ? "border-emerald-200"
                    : "border-orange-200",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isError
                      ? "bg-red-50 text-red-600"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-orange-50 text-orange-600",
                  ].join(" ")}
                >
                  {isError ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-stone-900">{task.datasetName}</p>
                    <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-600">
                      {task.formatLabel}
                    </span>
                  </div>

                  <p
                    className={[
                      "mt-0.5 text-xs font-medium",
                      isError
                        ? "text-red-600"
                        : isCompleted
                          ? "text-emerald-700"
                          : "text-stone-500",
                    ].join(" ")}
                  >
                    {isError
                      ? task.error || "Export failed."
                      : isCompleted
                        ? `Export complete · ${task.filename || "Downloaded"}`
                        : "Preparing ZIP in the background..."}
                  </p>

                  {!isCompleted && !isError ? (
                    <p className="mt-1 text-[11px] text-stone-400">
                      You can continue working. The ZIP will download automatically.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label={`Dismiss export notification for ${task.datasetName}`}
                  onClick={() => dismissExportTask(task.id)}
                  className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
