"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export interface CardMenuItem {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

export function CardMenu({ items }: { items: CardMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:bg-stone-100 hover:text-stone-700 ${
          open
            ? "bg-stone-100 text-stone-700 opacity-100"
            : "text-stone-400 opacity-0 group-hover:opacity-100"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 z-50 min-w-[190px] rounded-xl border border-stone-200 bg-white py-1 shadow-xl overflow-hidden">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.dividerBefore && <div className="my-1 h-px bg-stone-100" />}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors ${
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
