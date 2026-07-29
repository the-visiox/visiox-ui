"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, ScanSearch, X } from "lucide-react";

import { ApiError, autoLabel, type ObjectPropagationJob } from "@/lib/api";
import type { EditorShape, LabelDefinition } from "@/lib/annotation";

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) return reason.body || reason.message;
  return reason instanceof Error ? reason.message : fallback;
}

export default function ObjectPropagationDialog({
  open,
  datasetId,
  frameIndex,
  shape,
  label,
  remainingFrames,
  onClose,
  onComplete,
}: {
  open: boolean;
  datasetId: number;
  frameIndex: number;
  shape: EditorShape | null;
  label: LabelDefinition | null;
  remainingFrames: number;
  onClose: () => void;
  onComplete: (job: ObjectPropagationJob) => void | Promise<void>;
}) {
  const completedJobRef = useRef<number | null>(null);
  const queuedPollCountRef = useRef(0);
  const resumeAttemptedRef = useRef(false);
  const [similarity, setSimilarity] = useState(70);
  const [maxFrames, setMaxFrames] = useState("");
  const [job, setJob] = useState<ObjectPropagationJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const jobRunning = job?.status === "queued" || job?.status === "running";
  const progress = job && job.total > 0 ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0;

  useEffect(() => {
    if (!open) return;
    setSimilarity(70);
    setMaxFrames("");
    setJob(null);
    setError("");
    completedJobRef.current = null;
    queuedPollCountRef.current = 0;
    resumeAttemptedRef.current = false;
  }, [open, shape?.clientId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!job?.id || !jobRunning) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await autoLabel.getPropagationJob(datasetId, job.id);
        if (!cancelled) {
          setJob(next);
          setError("");
          if (next.status === "queued") {
            queuedPollCountRef.current += 1;
            if (queuedPollCountRef.current >= 3 && !resumeAttemptedRef.current) {
              resumeAttemptedRef.current = true;
              const resumed = await autoLabel.resumePropagationJob(datasetId, next.id);
              if (!cancelled) setJob(resumed);
            }
          } else {
            queuedPollCountRef.current = 0;
          }
        }
      } catch (reason) {
        if (!cancelled && (!(reason instanceof ApiError) || reason.status !== 429)) {
          setError(errorMessage(reason, "Could not read tracking progress."));
        }
      }
    };
    const timer = window.setInterval(() => void poll(), 1800);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [datasetId, job?.id, jobRunning]);

  useEffect(() => {
    if (job?.status !== "done" || completedJobRef.current === job.id) return;
    completedJobRef.current = job.id;
    void onComplete(job);
  }, [job, onComplete]);

  if (!open || !shape || !label) return null;

  const start = async () => {
    if (starting || jobRunning) return;
    const parsedMaxFrames = maxFrames === "" ? null : Number(maxFrames);
    if (
      parsedMaxFrames !== null &&
      (!Number.isInteger(parsedMaxFrames) || parsedMaxFrames < 1 || parsedMaxFrames > remainingFrames)
    ) {
      setError(`Maximum later frames must be between 1 and ${remainingFrames}.`);
      return;
    }
    setStarting(true);
    setError("");
    try {
      const created = await autoLabel.propagateObject(datasetId, frameIndex, {
        class_label: shape.classLabelId,
        bbox: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
        similarity_threshold: similarity / 100,
        max_frames: parsedMaxFrames,
      });
      completedJobRef.current = null;
      queuedPollCountRef.current = 0;
      resumeAttemptedRef.current = false;
      setJob(created);
    } catch (reason) {
      setError(errorMessage(reason, "Could not start object tracking."));
    } finally {
      setStarting(false);
    }
  };

  const runInBackground = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] isolate flex items-center justify-center overflow-y-auto bg-stone-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="object-propagation-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id="object-propagation-title" className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <ScanSearch className="h-5 w-5 text-orange-500" />
              Track selected object
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Find this object in later frames and create editable boxes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={starting}
            aria-label="Close object tracking"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Selected source</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                <span className="truncate text-sm font-bold text-stone-900">{label.name}</span>
              </div>
              <span className="shrink-0 text-xs font-medium text-stone-500">Frame {frameIndex + 1}</span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {Math.round(shape.width)} × {Math.round(shape.height)} px · {remainingFrames.toLocaleString()} later
              frames
            </p>
          </div>

          {!job ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="propagation-similarity" className="text-sm font-bold text-stone-800">
                    Minimum similarity
                  </label>
                  <span className="text-sm font-bold tabular-nums text-orange-600">{similarity}%</span>
                </div>
                <input
                  id="propagation-similarity"
                  type="range"
                  min={30}
                  max={95}
                  step={1}
                  value={similarity}
                  onChange={(event) => setSimilarity(Number(event.target.value))}
                  className="mt-3 w-full accent-orange-500"
                />
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  70% is a balanced default. Increase it to reduce incorrect matches; decrease it when appearance
                  changes significantly.
                </p>
              </div>

              <div>
                <label htmlFor="propagation-max-frames" className="text-sm font-bold text-stone-800">
                  Maximum later frames <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  id="propagation-max-frames"
                  type="number"
                  min={1}
                  max={Math.max(1, remainingFrames)}
                  value={maxFrames}
                  onChange={(event) => setMaxFrames(event.target.value)}
                  placeholder={`All ${remainingFrames.toLocaleString()} frames`}
                  className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-stone-900">
                  {job.status === "done"
                    ? "Tracking completed"
                    : job.status === "error"
                      ? "Tracking failed"
                      : "Tracking later frames…"}
                </p>
                <span className="text-sm font-bold tabular-nums text-orange-600">{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    job.status === "error" ? "bg-red-500" : job.status === "done" ? "bg-emerald-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-500">
                {job.done.toLocaleString()} / {job.total.toLocaleString()} frames scanned ·{" "}
                {job.matched_frames.toLocaleString()} matches · {job.saved_annotations.toLocaleString()} annotations
                saved
              </p>
              {job.error ? <p className="mt-2 text-xs text-red-600">{job.error}</p> : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            type="button"
            onClick={runInBackground}
            disabled={starting}
            className="h-10 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
          >
            {jobRunning ? "Run in background" : "Close"}
          </button>
          {!job ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={starting || remainingFrames <= 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {starting ? "Starting…" : "Track later frames"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
