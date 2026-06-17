"use client";

import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive (red) action. */
  danger?: boolean;
  /** Hide the cancel button — use for OK-only notices (replaces window.alert). */
  hideCancel?: boolean;
};

/**
 * Promise-based confirm/notice dialog styled like the "Unsaved changes" modal.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete?", danger: true }))) return;
 *   ...
 *   return (<>{dialog}{rest of UI}</>);
 *
 * Render `dialog` once in the component tree (it portals to document.body).
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const dialog =
    options && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) settle(false);
            }}
          >
            <div className="relative w-96 rounded-2xl bg-white p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => settle(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-stone-900">{options.title}</h2>

              {options.message != null && (
                <p className="mt-1.5 text-sm text-stone-500">{options.message}</p>
              )}

              <div className="mt-6 flex gap-3">
                {!options.hideCancel && (
                  <button
                    type="button"
                    onClick={() => settle(false)}
                    className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
                  >
                    {options.cancelLabel ?? "Cancel"}
                  </button>
                )}
                <button
                  type="button"
                  autoFocus
                  onClick={() => settle(true)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    options.danger
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  {options.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { confirm, dialog };
}
