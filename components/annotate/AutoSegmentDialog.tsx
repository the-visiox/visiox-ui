"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Hexagon, Loader2, Search, X } from "lucide-react";

import type { LabelDefinition } from "@/lib/annotation";

export default function AutoSegmentDialog({
  labels,
  activeClassId,
  running,
  error,
  message,
  onClose,
  onRun,
}: {
  labels: LabelDefinition[];
  activeClassId: number;
  running: boolean;
  error: string | null;
  message: string | null;
  onClose: () => void;
  onRun: (labelIds: number[], confidence: number) => void | Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    labels.some((label) => label.id === activeClassId) ? [activeClassId] : [],
  );
  const [search, setSearch] = useState("");
  const [confidence, setConfidence] = useState(0.35);

  const filteredLabels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? labels.filter((label) => label.name.toLocaleLowerCase().includes(query)) : labels;
  }, [labels, search]);

  const toggleLabel = (labelId: number) => {
    setSelectedIds((current) => {
      if (current.includes(labelId)) return current.filter((id) => id !== labelId);
      if (current.length >= 20) return current;
      return [...current, labelId];
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-segment-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <h2 id="auto-segment-title" className="flex items-center gap-2 text-base font-bold text-stone-900">
              <Hexagon className="h-5 w-5 text-orange-500" /> Auto Segment
            </h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Choose up to 20 dataset labels. SAM 3 will prepare polygons for hover selection.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            aria-label="Close Auto Segment"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search labels"
              className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </label>

          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Labels to segment</span>
            <span className={selectedIds.length >= 20 ? "text-orange-600" : "tabular-nums"}>
              {selectedIds.length}/20 selected
            </span>
          </div>

          <div className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredLabels.length ? filteredLabels.map((label) => {
              const selected = selectedIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  disabled={!selected && selectedIds.length >= 20}
                  aria-pressed={selected}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-orange-300 bg-orange-50 text-stone-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50/40",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  ].join(" ")}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label.name}</span>
                  <span className={[
                    "flex h-5 w-5 items-center justify-center rounded-md border",
                    selected ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300 text-transparent",
                  ].join(" ")}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            }) : (
              <p className="rounded-xl bg-stone-50 px-3 py-6 text-center text-xs text-stone-500">
                No matching dataset labels.
              </p>
            )}
          </div>

          <label className="block space-y-2 text-sm font-bold text-stone-800">
            Confidence
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={confidence}
              onChange={(event) => setConfidence(Math.max(0, Math.min(1, Number(event.target.value) || 0)))}
              className="no-number-spinner h-10 w-full rounded-xl border border-stone-200 px-3 text-sm font-semibold"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold leading-5 text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-600">
              {message}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 px-5 py-4">
          <button type="button" onClick={onClose} disabled={running} className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 disabled:opacity-40">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onRun(selectedIds, confidence)}
            disabled={running || selectedIds.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hexagon className="h-4 w-4" />}
            {running ? "Preparing segments…" : "Prepare segments"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
