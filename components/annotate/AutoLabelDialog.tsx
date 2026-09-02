"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Boxes, Cpu, FileUp, Hexagon, Loader2, Sparkles, X } from "lucide-react";

import {
  ApiError,
  autoLabel,
  type AutoLabelDatasetJob,
  type AutoLabelModel,
  type AutoLabelPredictionResponse,
  type AutoLabelProvider,
  type AutoLabelSource,
} from "@/lib/api";
import type { LabelDefinition } from "@/lib/annotation";

type OutputType = "bbox" | "polygon";
type SourceKind = "provider" | "uploaded_model";

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) return reason.body || reason.message;
  return reason instanceof Error ? reason.message : fallback;
}

function normalizeClassName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function promptList(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLocaleLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function defaultConfidence(provider: AutoLabelProvider | undefined) {
  const confidence = provider?.parameters.confidence;
  if (confidence && typeof confidence === "object" && "default" in confidence) {
    const value = Number((confidence as { default?: unknown }).default);
    if (Number.isFinite(value)) return value;
  }
  return 0.45;
}

export default function AutoLabelDialog({
  open,
  datasetId,
  frameIndex,
  projectId,
  labels,
  defaultOutputType,
  onClose,
  onDatasetComplete,
  onFrameComplete,
}: {
  open: boolean;
  datasetId: number;
  frameIndex: number;
  projectId: number | null;
  labels: LabelDefinition[];
  defaultOutputType: OutputType;
  onClose: () => void;
  onDatasetComplete: (job: AutoLabelDatasetJob) => void | Promise<void>;
  onFrameComplete: (result: AutoLabelPredictionResponse) => void | Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completedJobRef = useRef<number | null>(null);
  const runInFlightRef = useRef(false);
  const modelHandedOffRef = useRef(false);
  const [scope, setScope] = useState<"frame" | "dataset">("frame");
  const [sourceKind, setSourceKind] = useState<SourceKind>("provider");
  const [providers, setProviders] = useState<AutoLabelProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [providerModel, setProviderModel] = useState("");
  const [prompts, setPrompts] = useState("");
  const [selectedModel, setSelectedModel] = useState<AutoLabelModel | null>(null);
  const [outputType, setOutputType] = useState<OutputType>(defaultOutputType);
  const [confidence, setConfidence] = useState(defaultOutputType === "polygon" ? 0.35 : 0.45);
  const [uploading, setUploading] = useState(false);
  const [frameRunning, setFrameRunning] = useState(false);
  const [frameResult, setFrameResult] = useState<AutoLabelPredictionResponse | null>(null);
  const [job, setJob] = useState<AutoLabelDatasetJob | null>(null);
  const [error, setError] = useState("");

  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const parsedPrompts = useMemo(() => promptList(prompts), [prompts]);
  const promptLimit = providerId === "sam3" ? 20 : 100;
  const canUsePolygon = sourceKind === "provider"
    ? selectedProvider?.capabilities.includes("polygon") ?? false
    : selectedModel?.capabilities.includes("polygon") ?? false;
  const canUseBbox = sourceKind === "provider"
    ? selectedProvider?.capabilities.includes("bbox") ?? false
    : selectedModel?.capabilities.includes("bbox") ?? false;
  const jobId = job?.id;
  const datasetRunning = job?.status === "queued" || job?.status === "running";
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
  const canRun = sourceKind === "provider"
    ? Boolean(selectedProvider && providerModel && parsedPrompts.length && parsedPrompts.length <= promptLimit)
    : selectedModel?.status === "ready";

  useEffect(() => {
    if (!open) return;
    setScope("frame");
    setSourceKind("provider");
    setProviders([]);
    setProviderId("");
    setProviderModel("");
    setPrompts(labels.map((label) => label.name).join("\n"));
    setSelectedModel(null);
    setOutputType(defaultOutputType);
    setConfidence(defaultOutputType === "polygon" ? 0.35 : 0.45);
    setJob(null);
    setFrameResult(null);
    setError("");
    completedJobRef.current = null;
    modelHandedOffRef.current = false;

    let cancelled = false;
    setProvidersLoading(true);
    void autoLabel.listProviders()
      .then((items) => {
        if (cancelled) return;
        setProviders(items);
        const preferred = items.find((item) =>
          defaultOutputType === "polygon" ? item.id === "sam3" : item.id === "yolo_world",
        ) ?? items.find((item) => item.capabilities.includes(defaultOutputType)) ?? items[0];
        if (preferred) {
          setProviderId(preferred.id);
          setProviderModel(preferred.models[0] ?? "");
          setOutputType(preferred.capabilities.includes(defaultOutputType) ? defaultOutputType : (preferred.capabilities[0] ?? "bbox"));
          setConfidence(defaultConfidence(preferred));
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason, "Could not load Auto Label providers."));
      })
      .finally(() => {
        if (!cancelled) setProvidersLoading(false);
      });
    return () => { cancelled = true; };
  }, [defaultOutputType, labels, open, projectId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open || !jobId || !datasetRunning) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await autoLabel.getDatasetJob(datasetId, jobId);
        if (!cancelled) { setJob(next); setError(""); }
      } catch (reason) {
        if (!cancelled && (!(reason instanceof ApiError) || reason.status !== 429)) {
          setError(errorMessage(reason, "Could not read Auto Label progress."));
        }
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => { cancelled = true; window.clearInterval(timer); };
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
    if (model && !modelHandedOffRef.current) void autoLabel.deleteModel(model.id).catch(() => undefined);
    onClose();
  };

  const selectProvider = (provider: AutoLabelProvider) => {
    setSourceKind("provider");
    setProviderId(provider.id);
    setProviderModel(provider.models[0] ?? "");
    setOutputType(provider.capabilities[0] ?? "bbox");
    setConfidence(defaultConfidence(provider));
    setJob(null);
    setFrameResult(null);
    setError("");
  };

  const handleFile = async (file: File | null) => {
    if (!file || projectId == null) return;
    if (!file.name.toLowerCase().endsWith(".pt")) { setError("Choose an Ultralytics .pt model file."); return; }
    setUploading(true);
    setError("");
    try {
      if (selectedModel && !modelHandedOffRef.current) {
        await autoLabel.deleteModel(selectedModel.id).catch(() => undefined);
      }
      const created = await autoLabel.uploadModel({ project: projectId, file });
      setSelectedModel(created);
      setSourceKind("uploaded_model");
      setOutputType(created.capabilities.includes(defaultOutputType) ? defaultOutputType : (created.capabilities[0] ?? "bbox"));
      setConfidence(0.45);
      setJob(null);
      setFrameResult(null);
      modelHandedOffRef.current = false;
    } catch (reason) {
      setError(errorMessage(reason, "Model upload failed."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentSource = (): AutoLabelSource | null => {
    if (sourceKind === "uploaded_model") {
      return selectedModel ? { kind: "uploaded_model", model_id: selectedModel.id } : null;
    }
    if (!selectedProvider || !providerModel) return null;
    return { kind: "provider", provider: selectedProvider.id, model: providerModel, prompts: parsedPrompts };
  };

  const handleRun = async () => {
    const source = currentSource();
    if (runInFlightRef.current || !source || !canRun) return;
    runInFlightRef.current = true;
    setError("");
    setFrameResult(null);
    if (scope === "frame") {
      setFrameRunning(true);
      try {
        const result = await autoLabel.predictFrame(datasetId, frameIndex, {
          source, output_type: outputType, confidence, create_missing_classes: false,
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
      const created = await autoLabel.startDatasetJob(datasetId, { source, output_type: outputType, confidence });
      completedJobRef.current = null;
      setJob(created);
      modelHandedOffRef.current = source.kind === "uploaded_model";
    } catch (reason) {
      setError(errorMessage(reason, "Auto Label failed."));
    } finally {
      runInFlightRef.current = false;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] isolate flex items-center justify-center overflow-y-auto bg-stone-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="auto-label-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id="auto-label-title" className="flex items-center gap-2 text-lg font-bold text-stone-900"><Sparkles className="h-5 w-5 text-orange-500" /> Auto Label</h2>
            <p className="mt-1 text-sm text-stone-500">Choose an inference model, labels, and where to apply the result.</p>
          </div>
          <button type="button" onClick={closeDialog} disabled={frameRunning || uploading} aria-label="Close Auto Label" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5" role="group" aria-label="Scope">
            {(["frame", "dataset"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={scope === item} disabled={running} onClick={() => { setScope(item); setJob(null); setFrameResult(null); setError(""); }} className={["h-10 rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50", scope === item ? "bg-white text-orange-700 shadow-sm" : "text-stone-500 hover:bg-white/60 hover:text-stone-800"].join(" ")}>
                {item === "frame" ? `Current frame (${frameIndex + 1})` : "Entire dataset"}
              </button>
            ))}
          </div>

          <section className="space-y-3">
            <div><h3 className="text-sm font-bold text-stone-900">Inference model</h3><p className="mt-1 text-xs text-stone-500">SAM 3 creates polygons; YOLO World and detection models create boxes.</p></div>
            {providersLoading ? <div className="flex h-20 items-center justify-center rounded-2xl bg-stone-50 text-sm text-stone-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading models…</div> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => {
                  const selected = sourceKind === "provider" && provider.id === providerId;
                  const Icon = provider.capabilities.includes("polygon") ? Hexagon : Boxes;
                  return <button key={provider.id} type="button" aria-pressed={selected} disabled={running} onClick={() => selectProvider(provider)} className={["flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-colors", selected ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100" : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"].join(" ")}><span className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-600"].join(" ")}><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-bold text-stone-900">{provider.display_name}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{provider.description}</span></span></button>;
                })}
                <button type="button" aria-pressed={sourceKind === "uploaded_model"} disabled={running} onClick={() => setSourceKind("uploaded_model")} className={["flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-colors", sourceKind === "uploaded_model" ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100" : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"].join(" ")}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><Cpu className="h-5 w-5" /></span><span><span className="block text-sm font-bold text-stone-900">Custom Ultralytics</span><span className="mt-1 block text-xs leading-5 text-stone-500">Upload a temporary detection or segmentation .pt model.</span></span></button>
              </div>
            )}
          </section>

          {sourceKind === "provider" && selectedProvider ? (
            <section className="grid gap-4 rounded-2xl bg-stone-50 p-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-stone-800">Model<select value={providerModel} onChange={(event) => setProviderModel(event.target.value)} disabled={running} className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold">{selectedProvider.models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
              <label className="space-y-2 text-sm font-bold text-stone-800">Confidence<input type="number" min={0} max={1} step={0.05} value={confidence} onChange={(event) => setConfidence(Math.max(0, Math.min(1, Number(event.target.value) || 0)))} className="no-number-spinner h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm" /></label>
              <label className="space-y-2 text-sm font-bold text-stone-800 sm:col-span-2">Text prompts<textarea value={prompts} onChange={(event) => setPrompts(event.target.value)} disabled={running} rows={3} placeholder="person, forklift" className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium leading-6" /><span className={["block text-xs font-medium", parsedPrompts.length > promptLimit ? "text-red-600" : "text-stone-500"].join(" ")}>{parsedPrompts.length}/{promptLimit} labels · comma or one label per line. Results only map to existing project classes.</span></label>
            </section>
          ) : null}

          {sourceKind === "uploaded_model" ? (
            <section className="space-y-3 rounded-2xl bg-stone-50 p-4">
              {selectedModel ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><FileUp className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{selectedModel.name}.pt</span><span className="text-xs uppercase">Ready</span></div><p className="mt-2 text-xs text-emerald-700">{selectedModel.task_type === "instance_segmentation" ? "Segmentation" : "Object detection"} · {matchedClassCount}/{selectedModel.class_names.length} classes match the project.</p></div> : null}
              <input ref={fileInputRef} type="file" accept=".pt" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || running || projectId == null} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 text-sm font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-40">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{uploading ? "Uploading model…" : selectedModel ? "Choose another .pt model" : "Choose and upload .pt model"}</button>
            </section>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-stone-800">Output<select value={outputType} onChange={(event) => setOutputType(event.target.value as OutputType)} className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option value="bbox" disabled={!canUseBbox}>Bounding boxes</option><option value="polygon" disabled={!canUsePolygon}>Segmentation polygons</option></select></label>
            {sourceKind === "uploaded_model" ? <label className="space-y-2 text-sm font-bold text-stone-800">Confidence<input type="number" min={0} max={1} step={0.05} value={confidence} onChange={(event) => setConfidence(Math.max(0, Math.min(1, Number(event.target.value) || 0)))} className="no-number-spinner h-10 w-full rounded-xl border border-stone-200 px-3 text-sm" /></label> : null}
          </div>

          {job ? <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4" role="status" aria-live="polite"><div className="flex items-center justify-between text-sm font-bold text-stone-800"><span>{job.status === "done" ? "Auto Label completed" : job.status === "error" ? "Auto Label failed" : "Labeling dataset…"}</span><span className="tabular-nums text-orange-600">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><p className="text-xs text-stone-500">{job.done.toLocaleString()} / {job.total.toLocaleString()} images · {job.saved_annotations.toLocaleString()} annotations saved</p>{job.error ? <p className="text-xs font-semibold text-red-700">{job.error}</p> : null}</div> : null}
          {frameResult ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-bold">Current frame labeled</p><p className="mt-1 text-xs">{frameResult.predictions.length.toLocaleString()} editable annotations added</p></div> : null}
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-stone-100 bg-white px-6 py-4"><button type="button" onClick={closeDialog} disabled={frameRunning || uploading} className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 disabled:opacity-40">{datasetRunning ? "Run in background" : job || frameResult ? "Close" : "Cancel"}</button>{job?.status !== "done" && job?.status !== "error" ? <button type="button" onClick={() => void handleRun()} disabled={running || uploading || !canRun} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-40">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{running ? "Labeling…" : scope === "frame" ? "Apply to current frame" : "Apply to entire dataset"}</button> : null}</div>
      </div>
    </div>,
    document.body,
  );
}
