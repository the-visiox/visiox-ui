"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";

import {
  ApiError,
  autoLabel,
  type AutoLabelDatasetJob,
  type AutoLabelModel,
  type AutoLabelPredictionResponse,
} from "@/lib/api";
import type { LabelDefinition } from "@/lib/annotation";

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) return reason.body || reason.message;
  return reason instanceof Error ? reason.message : fallback;
}

function normalizeClassName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export default function AutoLabelDialog({
  open,
  datasetId,
  frameIndex,
  projectId,
  labels,
  onClose,
  onDatasetComplete,
  onFrameComplete,
}: {
  open: boolean;
  datasetId: number;
  frameIndex: number;
  projectId: number | null;
  labels: LabelDefinition[];
  onClose: () => void;
  onDatasetComplete: (job: AutoLabelDatasetJob) => void | Promise<void>;
  onFrameComplete: (result: AutoLabelPredictionResponse) => void | Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completedJobRef = useRef<number | null>(null);
  const runInFlightRef = useRef(false);
  const modelHandedOffRef = useRef(false);
  const [scope, setScope] = useState<"frame" | "dataset">("frame");
  const [selectedModel, setSelectedModel] = useState<AutoLabelModel | null>(null);
  const [outputType, setOutputType] = useState<"bbox" | "polygon">("bbox");
  const [confidence, setConfidence] = useState(0.45);
  const [uploading, setUploading] = useState(false);
  const [frameRunning, setFrameRunning] = useState(false);
  const [frameResult, setFrameResult] = useState<AutoLabelPredictionResponse | null>(null);
  const [job, setJob] = useState<AutoLabelDatasetJob | null>(null);
  const [error, setError] = useState("");

  const canUsePolygon = selectedModel?.capabilities.includes("polygon") ?? false;
  const jobId = job?.id;
  const jobStatus = job?.status;
  const datasetRunning = jobStatus === "queued" || jobStatus === "running";
  const running = frameRunning || datasetRunning;
  const progress = job && job.total > 0 ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0;
  const projectClassNames = useMemo(
    () => new Set(labels.map((label) => normalizeClassName(label.name))),
    [labels],
  );
  const matchedClassCount = selectedModel?.class_names.reduce(
    (count, name) => count + Number(projectClassNames.has(normalizeClassName(name))),
    0,
  ) ?? 0;

  useEffect(() => {
    if (!open) return;
    setScope("frame");
    setSelectedModel(null);
    setOutputType("bbox");
    setJob(null);
    setFrameResult(null);
    setError("");
    completedJobRef.current = null;
    modelHandedOffRef.current = false;
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!canUsePolygon && outputType === "polygon") setOutputType("bbox");
  }, [canUsePolygon, outputType]);

  useEffect(() => {
    if (!open || !jobId || !datasetRunning) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await autoLabel.getDatasetJob(datasetId, jobId);
        if (!cancelled) {
          setJob(next);
          setError("");
        }
      } catch (reason) {
        if (!cancelled && (!(reason instanceof ApiError) || reason.status !== 429)) {
          setError(errorMessage(reason, "Could not read Auto Label progress."));
        }
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [datasetId, datasetRunning, jobId, open]);

  useEffect(() => {
    if (job?.status !== "done" || completedJobRef.current === job.id) return;
    completedJobRef.current = job.id;
    void onDatasetComplete(job);
  }, [job, onDatasetComplete]);

  if (!open) return null;

  const closeDialog = () => {
    const model = selectedModel;
    setSelectedModel(null);
    if (model && !modelHandedOffRef.current) {
      void autoLabel.deleteModel(model.id).catch(() => undefined);
    }
    onClose();
  };

  const handleFile = async (file: File | null) => {
    if (!file || projectId == null) return;
    if (!file.name.toLowerCase().endsWith(".pt")) {
      setError("Choose an Ultralytics .pt model file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      if (selectedModel && !modelHandedOffRef.current) {
        await autoLabel.deleteModel(selectedModel.id).catch(() => undefined);
      }
      const created = await autoLabel.uploadModel({ project: projectId, file });
      setSelectedModel(created);
      modelHandedOffRef.current = false;
      setOutputType("bbox");
      setJob(null);
      setFrameResult(null);
    } catch (reason) {
      setError(errorMessage(reason, "Model upload failed."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRun = async () => {
    if (runInFlightRef.current || !selectedModel || selectedModel.status !== "ready") return;
    runInFlightRef.current = true;
    setError("");
    setFrameResult(null);

    if (scope === "frame") {
      setFrameRunning(true);
      try {
        const result = await autoLabel.predictFrame(datasetId, frameIndex, {
          source: { kind: "uploaded_model", model_id: selectedModel.id },
          output_type: outputType,
          confidence,
          create_missing_classes: false,
        });
        setFrameResult(result);
        await onFrameComplete(result);
        closeDialog();
      } catch (reason) {
        setError(errorMessage(reason, "Auto Label failed for this frame."));
      } finally {
        runInFlightRef.current = false;
        setFrameRunning(false);
      }
      return;
    }

    try {
      const created = await autoLabel.startDatasetJob(datasetId, {
        model_id: selectedModel.id,
        output_type: outputType,
        confidence,
      });
      completedJobRef.current = null;
      setJob(created);
      modelHandedOffRef.current = true;
    } catch (reason) {
      setError(errorMessage(reason, "Auto Label failed."));
    } finally {
      runInFlightRef.current = false;
    }
  };

  const changeScope = (nextScope: "frame" | "dataset") => {
    setScope(nextScope);
    setJob(null);
    setFrameResult(null);
    setError("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] isolate flex items-center justify-center overflow-y-auto bg-stone-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-label-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id="auto-label-title" className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <Sparkles className="h-5 w-5 text-orange-500" /> Auto Label
            </h2>
            <p className="mt-1 text-sm text-stone-500">Generate editable annotations for one frame or the dataset.</p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={frameRunning || uploading}
            aria-label="Close Auto Label"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5" role="group" aria-label="Scope">
            <button
              type="button"
              aria-pressed={scope === "frame"}
              disabled={running}
              onClick={() => changeScope("frame")}
              className={[
                "h-10 rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50",
                scope === "frame"
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-stone-500 hover:bg-white/60 hover:text-stone-800",
              ].join(" ")}
            >
              Current frame ({frameIndex + 1})
            </button>
            <button
              type="button"
              aria-pressed={scope === "dataset"}
              disabled={running}
              onClick={() => changeScope("dataset")}
              className={[
                "h-10 rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50",
                scope === "dataset"
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-stone-500 hover:bg-white/60 hover:text-stone-800",
              ].join(" ")}
            >
              Entire dataset
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-stone-800">Temporary model file</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                The model artifact is removed automatically after Auto Label finishes.
              </p>
            </div>
            {selectedModel ? (
              <div className="space-y-3">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
                  <FileUp className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{selectedModel.name}.pt</span>
                  <span className="text-xs font-bold uppercase">{job?.status === "done" ? "Used" : "Ready"}</span>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-stone-800">Detected model classes</p>
                    <span className="text-[11px] font-semibold text-stone-500">
                      {selectedModel.task_type === "instance_segmentation" ? "Segmentation" : "Object detection"}
                      {selectedModel.file_size ? ` · ${(selectedModel.file_size / 1024 / 1024).toFixed(1)} MB` : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedModel.class_names.map((name, index) => {
                      const matched = projectClassNames.has(normalizeClassName(name));
                      return (
                        <span
                          key={`${index}-${name}`}
                          title={matched ? "Matches a project class" : "Not in project; predictions will be skipped"}
                          className={[
                            "rounded-lg border px-2 py-1 text-[11px] font-bold",
                            matched
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {index}: {name}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-stone-500">
                    {matchedClassCount}/{selectedModel.class_names.length} classes match this project.
                    Amber classes are ignored.
                  </p>
                </div>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pt"
              className="sr-only"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || running || projectId == null}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {uploading
                ? "Uploading model…"
                : selectedModel
                  ? "Choose another .pt model"
                  : "Choose and upload .pt model"}
            </button>
          </div>

          <div className="rounded-xl bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-600">
            Model labels are matched by name to existing project classes: {" "}
            <span className="font-bold text-stone-800">
              {labels.map((label) => label.name).join(", ") || "none"}
            </span>
            . Unknown labels are skipped.
          </div>

          {selectedModel ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {canUsePolygon ? (
                <label className="space-y-2 text-sm font-bold text-stone-800">
                  Output
                  <select
                    value={outputType}
                    onChange={(event) => setOutputType(event.target.value as "bbox" | "polygon")}
                    className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="bbox">Bounding boxes</option>
                    <option value="polygon">Segmentation polygons</option>
                  </select>
                </label>
              ) : null}
              <label className="space-y-2 text-sm font-bold text-stone-800">
                Confidence
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={confidence}
                  onChange={(event) => setConfidence(Math.max(0, Math.min(1, Number(event.target.value) || 0)))}
                  className="no-number-spinner h-10 w-full rounded-xl border border-stone-200 px-3 text-sm"
                />
              </label>
            </div>
          ) : null}

          {job ? (
            <div
              className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between text-sm font-bold text-stone-800">
                <span>
                  {job.status === "done"
                    ? "Auto Label completed"
                    : job.status === "error"
                      ? "Auto Label failed"
                      : "Labeling dataset…"}
                </span>
                <span className="tabular-nums text-orange-600">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-orange-500 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-stone-500">
                {job.done.toLocaleString()} / {job.total.toLocaleString()} images · {" "}
                {job.saved_annotations.toLocaleString()} annotations saved
              </p>
              {job.error ? <p className="text-xs font-semibold text-red-700">{job.error}</p> : null}
            </div>
          ) : null}

          {frameResult ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-bold">Current frame labeled</p>
              <p className="mt-1 text-xs">
                {frameResult.predictions.length.toLocaleString()} editable annotations added
                {frameResult.unmapped_labels.length
                  ? ` · Skipped labels: ${frameResult.unmapped_labels.join(", ")}`
                  : ""}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={closeDialog}
            disabled={frameRunning || uploading}
            className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 disabled:opacity-40"
          >
            {datasetRunning ? "Run in background" : job || frameResult ? "Close" : "Cancel"}
          </button>
          {job?.status !== "done" && job?.status !== "error" ? (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={running || uploading || !selectedModel || selectedModel.status !== "ready"}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running
                ? scope === "frame"
                  ? "Labeling frame…"
                  : "Labeling dataset…"
                : scope === "frame"
                  ? "Apply to current frame"
                  : "Apply to entire dataset"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
