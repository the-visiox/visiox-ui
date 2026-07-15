"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  type LucideIcon,
  Play,
  Square,
  Activity,
  ChevronRight,
  Target,
  BarChart3,
  FlaskConical,
  Settings2,
  X,
  Loader2,
  CheckCircle2,
  Database,
  Download,
  ImageIcon,
  Layers3,
  AlertCircle,
  Search,
  RefreshCw,
  Grid3X3,
  Cpu,
  PackageCheck,
  Rocket,
  Trash2,
  RotateCcw,
  CalendarDays,
  Clock3,
  BatteryCharging,
  TrendingUp,
  FolderOpen,
  Wrench,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  training,
  deployments,
  datasets,
  projects,
  type TrainingJob,
  type RunMetric,
  type Dataset,
  type Project,
  type ModelArchitecture,
  type ModelRegistry,
} from "@/lib/api";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
type JobFilter = "all" | "active" | "completed" | "failed";
type SummarySplit = "train" | "valid" | "test";
type ZoomedChart = "loss" | "map50";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function findMetricValue(source: unknown, keys: string[], depth = 0): unknown {
  if (!isRecord(source) || depth > 4) return undefined;
  for (const key of keys) {
    if (source[key] != null) return source[key];
  }
  for (const nestedKey of ["metrics", "results", "summary", "latest", "best", "extra"]) {
    const nested = source[nestedKey];
    const found = findMetricValue(nested, keys, depth + 1);
    if (found != null) return found;
  }
  for (const value of Object.values(source)) {
    const found = findMetricValue(value, keys, depth + 1);
    if (found != null) return found;
  }
  return undefined;
}

function parseTrainingLogMetrics(source: unknown): RunMetric[] {
  if (!isRecord(source) || !Array.isArray(source.events)) return [];
  return source.events.flatMap((entry, index) => {
    if (!isRecord(entry) || entry.event !== "metrics" || !isRecord(entry.payload)) return [];
    const payload = entry.payload;
    const timestamp = asNumber(entry.timestamp);
    return [
      {
        id: -index - 1,
        experiment: 0,
        epoch: asNumber(payload.epoch) ?? index + 1,
        step: asNumber(payload.step) ?? 0,
        loss: asNumber(payload.loss),
        val_loss: asNumber(payload.val_loss),
        map50: asNumber(payload.map50 ?? findMetricValue(payload, ["metrics/mAP50(B)"])),
        f1: asNumber(payload.f1),
        accuracy: asNumber(payload.accuracy),
        extra: isRecord(payload.extra) ? payload.extra : {},
        recorded_at: timestamp == null ? "" : new Date(timestamp * 1000).toISOString(),
      },
    ];
  });
}

function parseTrainingLogSplitMetrics(source: unknown): Record<string, unknown> | null {
  if (!isRecord(source) || !Array.isArray(source.events)) return null;
  const splitMetrics: Record<string, unknown> = {};

  for (const entry of source.events) {
    if (!isRecord(entry) || entry.event !== "split_metrics" || !isRecord(entry.payload)) continue;
    const split = asString(entry.payload.split) as SummarySplit | null;
    if (split !== "train" && split !== "valid" && split !== "test") continue;
    splitMetrics[split] = isRecord(entry.payload.summary) ? entry.payload.summary : entry.payload;
  }

  return Object.keys(splitMetrics).length > 0 ? { split_metrics: splitMetrics, ...splitMetrics } : null;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatMetric(value: number | null | undefined, digits = 3): string {
  return value == null ? "-" : value.toFixed(digits);
}

function formatScorePercent(value: number | null | undefined, digits = 2): string {
  if (value == null) return "-";
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percentValue.toFixed(digits)}%`;
}

function MetricLineChart({
  title,
  description,
  points,
  color,
  icon: Icon,
  tone = "orange",
  percent = false,
  yAxisLabel = "Value",
  xAxisMax,
  expanded = false,
  onExpand,
}: {
  title: string;
  description?: string;
  points: { epoch: number; value: number }[];
  color: string;
  icon: LucideIcon;
  tone?: "orange" | "violet";
  percent?: boolean;
  yAxisLabel?: string;
  xAxisMax?: number;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const width = expanded ? 980 : 760;
  const height = expanded ? 420 : 280;
  const paddingLeft = expanded ? 150 : 130;
  const paddingRight = expanded ? 40 : 28;
  const paddingTop = expanded ? 44 : 34;
  const paddingBottom = expanded ? 104 : 76;
  const values = points.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const valueRange = maxValue - minValue;
  const range = Math.max(valueRange, Math.abs(maxValue) * 0.05, 0.001);
  const chartMin = valueRange === 0 ? minValue - range / 2 : minValue;
  const chartMax = chartMin + range;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxEpoch = Math.max(...points.map((point) => point.epoch), xAxisMax ?? 0, 1);
  const coordinates = points.map((point) => ({
    ...point,
    x: paddingLeft + (point.epoch / maxEpoch) * plotWidth,
    y: paddingTop + ((chartMax - point.value) / range) * plotHeight,
  }));
  const latest = points.at(-1)?.value;
  const axisValue = (value: number) => (percent ? formatScorePercent(value) : value.toFixed(2));
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = chartMax - ratio * (chartMax - chartMin);
    return { label: axisValue(value), y: paddingTop + ratio * plotHeight };
  });
  const xTicks = Array.from({ length: 3 }, (_, index) => {
    const epoch = (maxEpoch * index) / 2;
    return {
      epoch,
      label: Number.isInteger(epoch) ? String(epoch) : epoch.toFixed(1),
      x: paddingLeft + (epoch / maxEpoch) * plotWidth,
    };
  });
  const latestDisplay = latest == null ? "-" : percent ? formatScorePercent(latest) : formatMetric(latest, 2);
  const toneClass =
    tone === "violet"
      ? {
          iconWrap: "bg-violet-100 text-violet-600",
          valueBox: "border-violet-200 bg-violet-50/80 text-violet-700",
          value: "text-violet-700",
        }
      : {
          iconWrap: "bg-orange-100 text-orange-600",
          valueBox: "border-orange-200 bg-orange-50/80 text-orange-600",
          value: "text-orange-600",
        };

  const cardClass = [
    "rounded-2xl border border-stone-200 bg-white shadow-sm",
    expanded ? "p-5 sm:p-6" : "p-4",
    onExpand
      ? "w-full cursor-zoom-in text-left transition-colors hover:border-orange-200 hover:bg-orange-50/20 focus-visible:ring-2 focus-visible:ring-orange-500/30"
      : "",
  ].join(" ");
  const chartContent = (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass.iconWrap}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-normal text-slate-950">{title}</p>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        <div className={`rounded-xl border px-2.5 py-1.5 text-center ${toneClass.valueBox}`}>
          <p className={`font-mono text-sm font-extrabold tabular-nums tracking-normal ${toneClass.value}`}>
            {latestDisplay}
          </p>
        </div>
      </div>
      {coordinates.length ? (
        <div className="mt-4 overflow-hidden">
          <svg
            role="img"
            aria-label={`${title}: ${yAxisLabel} by epoch over ${coordinates.length} epochs`}
            viewBox={`0 0 ${width} ${height}`}
            className={expanded ? "h-[22rem] w-full sm:h-[28rem]" : "h-44 w-full sm:h-48"}
          >
            {yTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="#dedbd6"
                  strokeDasharray="4 5"
                />
                <text
                  x={paddingLeft - (expanded ? 30 : 24)}
                  y={tick.y + 5}
                  textAnchor="end"
                  className={expanded ? "fill-stone-600 text-[22px] font-semibold" : "fill-stone-600 text-[18px] font-semibold"}
                >
                  {tick.label}
                </text>
              </g>
            ))}
            <line
              x1={paddingLeft}
              x2={paddingLeft}
              y1={paddingTop}
              y2={paddingTop + plotHeight}
              stroke="#bdb7ae"
            />
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={paddingTop + plotHeight}
              y2={paddingTop + plotHeight}
              stroke="#bdb7ae"
            />
            {xTicks.map((tick) => (
              <g key={tick.epoch}>
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={paddingTop + plotHeight}
                  y2={paddingTop + plotHeight + 4}
                  stroke="#a8a29e"
                />
                <text
                  x={tick.x}
                  y={height - (expanded ? 58 : 42)}
                  textAnchor="middle"
                  className={expanded ? "fill-stone-600 text-[22px] font-semibold" : "fill-stone-600 text-[18px] font-semibold"}
                >
                  {tick.label}
                </text>
              </g>
            ))}
            <text
              x={paddingLeft - (expanded ? 104 : 88)}
              y={paddingTop + plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${paddingLeft - (expanded ? 104 : 88)} ${paddingTop + plotHeight / 2})`}
              className={expanded ? "fill-stone-700 text-[23px] font-bold" : "fill-stone-700 text-[18px] font-bold"}
            >
              {yAxisLabel}
            </text>
            <text
              x={paddingLeft + plotWidth / 2}
              y={height - (expanded ? 14 : 10)}
              textAnchor="middle"
              className={expanded ? "fill-stone-700 text-[23px] font-bold" : "fill-stone-700 text-[18px] font-bold"}
            >
              Epoch
            </text>
            <polyline
              points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={expanded ? "6" : "5"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coordinates.map((point, index) => (
              <circle key={`${point.epoch}-${index}`} cx={point.x} cy={point.y} r={expanded ? "5.75" : "4.75"} fill={color} />
            ))}
          </svg>
        </div>
      ) : (
        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 text-center text-sm font-semibold text-stone-400 sm:h-44">
          Waiting for epoch metrics
        </div>
      )}
    </>
  );

  return onExpand ? (
    <button type="button" onClick={onExpand} className={cardClass} aria-label={`Phóng to biểu đồ ${title}`}>
      {chartContent}
    </button>
  ) : (
    <div className={cardClass}>{chartContent}</div>
  );
}

function SkeletonJob() {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 animate-pulse motion-reduce:animate-none">
      <div className="h-5 bg-stone-100 rounded w-1/2 mb-3" />
      <div className="h-3 bg-stone-100 rounded w-1/3" />
    </div>
  );
}

interface NewJobModalProps {
  projectList: Project[];
  datasetList: Dataset[];
  architectures: ModelArchitecture[];
  onClose: () => void;
  onCreated: (job: TrainingJob) => void;
  initialProjectId?: number;
  initialDatasetId?: number;
}

function NewJobModal({
  projectList,
  datasetList,
  architectures,
  onClose,
  onCreated,
  initialProjectId,
  initialDatasetId,
}: NewJobModalProps) {
  const initialDataset = datasetList.find((dataset) => dataset.id === initialDatasetId);
  const initialProject = initialProjectId ?? initialDataset?.project ?? projectList[0]?.id;
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<number | "">(initialProject ?? "");
  const [datasetId, setDatasetId] = useState<number | "">(
    initialDatasetId ?? datasetList.find((dataset) => dataset.project === initialProject)?.id ?? "",
  );
  const [archId, setArchId] = useState<number | "">(
    architectures.find(
      (architecture) =>
        architecture.task_type === projectList.find((project) => project.id === initialProject)?.task_type,
    )?.id ?? "",
  );
  const [epochs, setEpochs] = useState("100");
  const [lr, setLr] = useState("0.001");
  const [batchSize, setBatchSize] = useState("32");
  const [imageSize, setImageSize] = useState("640");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const availableDatasets = datasetList
    .filter((dataset) => dataset.project === projectId)
    .toSorted((a, b) => Number(b.is_train_ready) - Number(a.is_train_ready) || b.version - a.version);
  const selectedDataset = datasetList.find((dataset) => dataset.id === datasetId);
  const selectedProject = projectList.find((project) => project.id === projectId);
  const availableArchitectures = architectures.filter(
    (architecture) => architecture.task_type === selectedProject?.task_type,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !datasetId || !archId) {
      setError("Select a project, dataset version, and model architecture.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const job = await training.createJob({
        project: projectId as number,
        name,
        dataset: datasetId ? (datasetId as number) : undefined,
        architecture: archId ? (archId as number) : undefined,
        hyperparams: {
          epochs: parseInt(epochs),
          lr: parseFloat(lr),
          batch: parseInt(batchSize),
          imgsz: parseInt(imageSize),
          device: 0,
        },
      });
      const startedJob = await training.startJob(job.id);
      onCreated(startedJob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setSaving(false);
    }
  };

  return (
    <div
      className={["fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-orange-950/20", "backdrop-blur-sm"].join(" ")}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-training-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mx-4 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="new-training-title" className="text-xl font-bold text-stone-900">New Training Run</h2>
          <button type="button" onClick={onClose} aria-label="Close training form" className="rounded-xl p-2 transition-colors hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500">
            <X aria-hidden="true" className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div role="alert" aria-live="polite"
            className={["mb-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm", "rounded-xl"].join(" ")}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="training-name"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Experiment Name
            </label>
            <input
              id="training-name"
              name="training-name"
              autoComplete="off"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: YOLOv8 PPE Run 1…"
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            />
          </div>
          <div>
            <label htmlFor="training-project"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Project
            </label>
            <select
              id="training-project"
              name="training-project"
              value={projectId}
              onChange={(e) => {
                const nextProject = Number(e.target.value);
                const nextProjectRecord = projectList.find((project) => project.id === nextProject);
                setProjectId(nextProject);
                setDatasetId(datasetList.find((dataset) => dataset.project === nextProject)?.id ?? "");
                setArchId(
                  architectures.find((architecture) => architecture.task_type === nextProjectRecord?.task_type)?.id ?? "",
                );
              }}
              required
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-dataset"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Dataset
            </label>
            <select
              id="training-dataset"
              name="training-dataset"
              value={datasetId}
              onChange={(e) => setDatasetId(Number(e.target.value))}
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              <option value="">Select a dataset version</option>
              {availableDatasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.is_train_ready ? "✓ Ready" : String(d.labeling_progress ?? 0) + "% labeled"} · {d.name} · v{d.version}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-architecture"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Architecture
            </label>
            <select
              id="training-architecture"
              name="training-architecture"
              value={archId}
              onChange={(e) => setArchId(Number(e.target.value))}
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              <option value="">Select an architecture</option>
              {availableArchitectures.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.backbone})
                </option>
              ))}
            </select>
          </div>
          {selectedDataset ? (
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Images</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{selectedDataset.image_count ?? selectedDataset.media_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Annotated</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{selectedDataset.annotated_count ?? "—"}</p>
              </div>
              <div className={["flex items-center justify-end gap-2 text-xs font-bold", selectedDataset.is_train_ready ? "text-emerald-600" : "text-amber-600"].join(" ")}>
                {selectedDataset.is_train_ready ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}
                {selectedDataset.is_train_ready ? "Ready to train" : String(selectedDataset.labeling_progress ?? 0) + "% labeled"}
              </div>
            </div>
          ) : null}
          {selectedDataset && !selectedDataset.is_train_ready ? (
            <p className="-mt-2 text-xs leading-5 text-amber-700">
              {selectedDataset.is_label_complete
                ? "This dataset is fully labeled. Verify it from the Project page before training."
                : (selectedDataset.annotated_count ?? 0) > 0
                  ? "Verify this dataset from the Project page. Unlabeled images will be treated as background."
                  : "Add labels to at least 1 image, then verify this dataset from the Project page."}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="training-epochs"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                Epochs
              </label>
              <input
                id="training-epochs"
                name="training-epochs"
                type="number"
                inputMode="numeric"
                value={epochs}
                onChange={(e) => setEpochs(e.target.value)}
                min="1"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
            <div>
              <label htmlFor="training-image-size" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Image size
              </label>
              <input
                id="training-image-size"
                name="training-image-size"
                type="number"
                inputMode="numeric"
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                min="32"
                step="32"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm focus-visible:ring-2 focus-visible:ring-orange-500/30"
              />
            </div>
            <div>
              <label htmlFor="training-learning-rate"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                LR
              </label>
              <input
                id="training-learning-rate"
                name="training-learning-rate"
                type="number"
                inputMode="decimal"
                value={lr}
                onChange={(e) => setLr(e.target.value)}
                step="0.0001"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
            <div>
              <label htmlFor="training-batch-size"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                Batch
              </label>
              <input
                id="training-batch-size"
                name="training-batch-size"
                type="number"
                inputMode="numeric"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min="1"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={[
                "flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200",
                "transition-colors focus-visible:ring-2 focus-visible:ring-stone-400",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !projectId || !datasetId || !archId || !selectedDataset?.is_train_ready}
              className={[
                "flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg",
                "shadow-orange-500/20 transition-[transform,background-color] hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50",
                "flex items-center justify-center gap-2",
              ].join(" ")}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Training
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TrainPage() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);
  const [metrics, setMetrics] = useState<RunMetric[]>([]);
  const [metricsByJobId, setMetricsByJobId] = useState<Record<number, RunMetric[]>>({});
  const [metricsLoadingJobId, setMetricsLoadingJobId] = useState<number | null>(null);
  const [artifactMetrics, setArtifactMetrics] = useState<Record<string, unknown> | null>(null);
  const [artifactLogMetrics, setArtifactLogMetrics] = useState<RunMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [zoomedChart, setZoomedChart] = useState<ZoomedChart | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [architectures, setArchitectures] = useState<ModelArchitecture[]>([]);
  const [registeredModels, setRegisteredModels] = useState<ModelRegistry[]>([]);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [jobActionId, setJobActionId] = useState<number | null>(null);
  const [jobFilter, setJobFilter] = useState<JobFilter>("all");
  const [jobQuery, setJobQuery] = useState("");
  const [pageError, setPageError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [summarySplit, setSummarySplit] = useState<SummarySplit>("train");
  const [trainingTarget, setTrainingTarget] = useState<{ projectId?: number; datasetId?: number }>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deepLinkHandledRef = useRef(false);

  const loadData = useCallback(async (background = false) => {
      if (background) setRefreshing(true);
      setPageError("");
      const [jobsRes, projRes, dsRes, archRes, registryRes] = await Promise.allSettled([
        training.listJobs(),
        projects.list(),
        datasets.list(),
        training.listArchitectures(),
        deployments.listAllRegistry(),
      ]);
      if (jobsRes.status === "fulfilled") {
        const list = jobsRes.value.results;
        setJobs(list);
        setSelectedJob((current) => {
          const refreshed = list.find((job) => job.id === current?.id);
          const active = list.find((job) => job.status === "running" || job.status === "queued");
          return refreshed ?? active ?? list[0] ?? null;
        });
      } else {
        setPageError("Couldn’t load training jobs. Check the API connection, then try again.");
      }
      if (projRes.status === "fulfilled") setProjectList(projRes.value.results);
      if (dsRes.status === "fulfilled") setDatasetList(dsRes.value.results);
      if (archRes.status === "fulfilled") setArchitectures(archRes.value.results);
      if (registryRes.status === "fulfilled") setRegisteredModels(registryRes.value);
      if (!deepLinkHandledRef.current) {
        deepLinkHandledRef.current = true;
        const params = new URLSearchParams(window.location.search);
        const projectParam = params.get("project");
        const datasetParam = params.get("dataset");
        const projectId = projectParam ? Number(projectParam) : undefined;
        const datasetId = datasetParam ? Number(datasetParam) : undefined;
        if (Number.isInteger(projectId) || Number.isInteger(datasetId)) {
          setTrainingTarget({
            projectId: Number.isInteger(projectId) ? projectId : undefined,
            datasetId: Number.isInteger(datasetId) ? datasetId : undefined,
          });
          setShowModal(true);
        }
      }
      setLoading(false);
      setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  // Poll metrics every 2 s for the selected running job
  const selectedJobId = selectedJob?.id;
  const selectedJobStatus = selectedJob?.status;

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJobId) return;
    let cancelled = false;

    const fetchMetrics = async () => {
      const jobId = selectedJobId;
      setMetricsLoadingJobId(jobId);
      try {
        const exps = await training.getExperiments(jobId);
        if (exps.length > 0) {
          const m = await training.getMetrics(exps[0].id);
          if (cancelled) return;
          setMetrics(m);
          setMetricsByJobId((current) => ({ ...current, [jobId]: m }));
        } else {
          if (cancelled) return;
          setMetrics([]);
          setMetricsByJobId((current) => ({ ...current, [jobId]: [] }));
        }
        // Refresh job status
        const updated = await training.getJob(jobId);
        if (cancelled) return;
        setSelectedJob(updated);
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      } catch {
        if (!cancelled) {
          setPageError("Live metrics are temporarily unavailable. VisioX will retry automatically.");
        }
      } finally {
        if (!cancelled) {
          setMetricsLoadingJobId((current) => (current === jobId ? null : current));
        }
      }
    };

    fetchMetrics();
    if (["queued", "running"].includes(selectedJobStatus ?? "")) {
      pollRef.current = setInterval(fetchMetrics, 2000);
    }
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedJobId, selectedJobStatus]);

  useEffect(() => {
    if (!zoomedChart) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedChart(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedChart]);

  useEffect(() => {
    const metricsUrl = selectedJob?.artifact_urls?.["metrics.json"];
    const trainingLogUrl = selectedJob?.artifact_urls?.["training_log.json"];
    if (selectedJob?.status !== "completed" || (!metricsUrl && !trainingLogUrl)) {
      setArtifactMetrics(null);
      setArtifactLogMetrics([]);
      return;
    }

    const controller = new AbortController();

    const loadArtifactMetrics = async () => {
      const fetchJson = async (url: string): Promise<unknown> => {
        const response = await fetch(url, { signal: controller.signal });
        return response.ok ? response.json() : null;
      };

      let metricsPayload: unknown = null;
      let trainingLogPayload: unknown = null;

      try {
        metricsPayload = metricsUrl ? await fetchJson(metricsUrl) : null;
      } catch {
        metricsPayload = null;
      }

      try {
        trainingLogPayload = trainingLogUrl ? await fetchJson(trainingLogUrl) : null;
      } catch {
        trainingLogPayload = null;
      }

      if (controller.signal.aborted) return;

      const logSplitMetrics = parseTrainingLogSplitMetrics(trainingLogPayload);
      setArtifactMetrics(isRecord(metricsPayload) ? metricsPayload : logSplitMetrics);
      setArtifactLogMetrics(parseTrainingLogMetrics(trainingLogPayload));
    };

    void loadArtifactMetrics();
    return () => controller.abort();
  }, [selectedJob?.artifact_urls, selectedJob?.status]);

  const handleStop = async (jobId: number) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!window.confirm("Cancel “" + (job?.name ?? "this training run") + "”? The current GPU work will stop.")) return;
    setStoppingId(jobId);
    setPageError("");
    try {
      const updated = await training.stopJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      if (selectedJob?.id === jobId) setSelectedJob(updated);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t cancel this training run. Try again.");
    }
    setStoppingId(null);
  };

  const handleRetry = async (job: TrainingJob) => {
    setJobActionId(job.id);
    setPageError("");
    try {
      const updated = await training.startJob(job.id);
      setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedJob(updated);
      setMetrics([]);
      setMetricsByJobId((current) => ({ ...current, [job.id]: [] }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t retry this training run.");
    } finally {
      setJobActionId(null);
    }
  };

  const handleDelete = async (job: TrainingJob) => {
    if (!window.confirm(`Delete “${job.name}”? Metrics for this run will also be removed.`)) return;
    setJobActionId(job.id);
    setPageError("");
    try {
      await training.deleteJob(job.id);
      setJobs((current) => current.filter((item) => item.id !== job.id));
      if (selectedJob?.id === job.id) {
        const remaining = jobs.filter((item) => item.id !== job.id);
        setSelectedJob(remaining[0] ?? null);
        setMetrics([]);
      }
      setMetricsByJobId((current) => {
        const next = { ...current };
        delete next[job.id];
        return next;
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t delete this training run.");
    } finally {
      setJobActionId(null);
    }
  };

  const handleJobCreated = (job: TrainingJob) => {
    setJobs((prev) => [job, ...prev]);
    setSelectedJob(job);
    setMetricsByJobId((current) => ({ ...current, [job.id]: [] }));
    setShowModal(false);
  };

  const handleSelectJob = (job: TrainingJob) => {
    if (selectedJob?.id === job.id) return;
    setSelectedJob(job);
  };

  const selectedLiveMetrics = selectedJobId ? (metricsByJobId[selectedJobId] ?? []) : metrics;
  const displayMetrics =
    selectedLiveMetrics.length > 0 || selectedJob?.status !== "completed" ? selectedLiveMetrics : artifactLogMetrics;
  const latestMetric = displayMetrics[displayMetrics.length - 1];
  const hasMetrics = Boolean(latestMetric);
  const isMetricsLoading = metricsLoadingJobId === selectedJobId;
  const isActiveJob = selectedJob?.status === "queued" || selectedJob?.status === "running";
  const chartMetrics = displayMetrics.slice(-40);
  const lossChartPoints = chartMetrics.flatMap((metric) =>
    metric.loss == null ? [] : [{ epoch: metric.epoch, value: metric.loss }],
  );
  const map50ChartPoints = chartMetrics.flatMap((metric) =>
    metric.map50 == null ? [] : [{ epoch: metric.epoch, value: metric.map50 }],
  );
  const zoomedChartConfig =
    zoomedChart === "loss"
      ? {
          title: "Training Loss",
          points: lossChartPoints,
          color: "#f97316",
          icon: Activity,
          tone: "orange" as const,
          percent: false,
          yAxisLabel: "Loss",
        }
      : zoomedChart === "map50"
        ? {
            title: "mAP@0.5",
            points: map50ChartPoints,
            color: "#7c3aed",
            icon: Target,
            tone: "violet" as const,
            percent: false,
            yAxisLabel: "Score",
          }
        : null;
  const completedMetricSource = artifactMetrics ?? null;

  const hyperparams = selectedJob?.hyperparams ?? {};
  const metricExtra = latestMetric?.extra ?? {};
  const lossDisplay =
    latestMetric?.loss ??
    asNumber(findMetricValue(completedMetricSource, ["loss", "train_loss", "train/box_loss", "box_loss"]));
  const epochDisplay =
    latestMetric?.epoch ??
    asNumber(findMetricValue(completedMetricSource, ["best_epoch", "epoch", "epochs_completed", "total_epochs"]));
  const totalEpochs =
    asNumber(metricExtra.total_epochs) ??
    asNumber(findMetricValue(completedMetricSource, ["total_epochs", "epochs"])) ??
    asNumber(hyperparams.epochs) ??
    0;
  const explicitProgress =
    asNumber(metricExtra.progress_percent ?? metricExtra.progress) ??
    asNumber(findMetricValue(completedMetricSource, ["progress_percent", "progress"]));
  const epochProgress = totalEpochs > 0 ? ((epochDisplay ?? 0) / totalEpochs) * 100 : 0;
  const progress =
    selectedJob?.status === "completed"
      ? 100
      : selectedJob?.status === "queued"
        ? 8
        : selectedJob?.status === "running" && !hasMetrics
          ? 12
        : clampPercent(explicitProgress ?? epochProgress);
  const stageLabel =
    selectedJob?.status === "queued"
      ? "Waiting for GPU agent"
      : selectedJob?.status === "completed"
        ? asString(findMetricValue(completedMetricSource, ["stage"])) ?? "Completed"
        : selectedJob?.status === "running" && !hasMetrics
          ? "Preparing"
          : asString(metricExtra.stage) ?? "Training";
  const progressMessage =
    asString(metricExtra.message) ??
    asString(findMetricValue(completedMetricSource, ["message"])) ??
    (selectedJob?.status === "running" && !hasMetrics
      ? "GPU agent is preparing the dataset and waiting to report the first epoch"
      : selectedJob?.status === "running"
        ? `Epoch ${epochDisplay ?? 0}${totalEpochs ? ` of ${totalEpochs}` : ""}`
      : selectedJob?.status === "completed"
        ? epochDisplay != null
          ? `Training completed at epoch ${epochDisplay}${totalEpochs ? ` / ${totalEpochs}` : ""}`
          : "Training completed"
      : selectedJob?.status ?? "No active run");
  const etaSeconds =
    asNumber(metricExtra.eta_seconds) ??
    asNumber(findMetricValue(completedMetricSource, ["eta_seconds"]));
  const gpuMemoryMb =
    asNumber(metricExtra.gpu_memory_mb) ??
    asNumber(findMetricValue(completedMetricSource, ["gpu_memory_mb"]));
  const gpuUtilization =
    asNumber(metricExtra.gpu_utilization) ??
    asNumber(findMetricValue(completedMetricSource, ["gpu_utilization"]));
  const map50 =
    latestMetric?.map50 ??
    asNumber(metricExtra["metrics/mAP50(B)"]) ??
    asNumber(findMetricValue(completedMetricSource, ["best_map50", "map50", "mAP50", "metrics/mAP50(B)"]));
  const valLoss =
    latestMetric?.val_loss ??
    asNumber(metricExtra["val/box_loss"]) ??
    asNumber(findMetricValue(completedMetricSource, ["val_loss", "val/box_loss", "validation_loss"]));
  const learningRate = asNumber(metricExtra.learning_rate ?? metricExtra["lr/pg0"]);
  const learningRateDisplay = learningRate ?? asNumber(hyperparams.lr ?? hyperparams.lr0);
  const selectedDataset = datasetList.find((dataset) => dataset.id === selectedJob?.dataset);
  const selectedRegistry = registeredModels.find((model) => model.training_job === selectedJob?.id);
  const selectedModelMetrics = selectedRegistry?.metrics ?? {};
  const metricSources = [completedMetricSource, selectedModelMetrics, metricExtra, latestMetric].filter(Boolean);
  const findSplitMetric = (split: SummarySplit, metricKeys: string[]): number | null => {
    const splitKeys =
      split === "train"
        ? ["train", "training"]
        : split === "valid"
          ? ["valid", "val", "validation", "dev"]
          : ["test"];
    const splitContainers = ["summary", "summaries", "splits", "split_metrics", "by_split", "datasets", "metrics", "results", "best", "latest"];
    const candidateKeys = splitKeys.flatMap((splitKey) =>
      metricKeys.flatMap((metricKey) => [
        `${splitKey}_${metricKey}`,
        `${metricKey}_${splitKey}`,
        `${splitKey}/${metricKey}`,
        `${metricKey}/${splitKey}`,
        `${splitKey}.${metricKey}`,
        `${metricKey}.${splitKey}`,
        `metrics/${splitKey}/${metricKey}`,
        `metrics/${metricKey}/${splitKey}`,
      ]),
    );

    for (const source of metricSources) {
      if (!isRecord(source)) continue;

      for (const splitKey of splitKeys) {
        const directSplit = source[splitKey];
        if (isRecord(directSplit)) {
          const directValue = asNumber(findMetricValue(directSplit, metricKeys));
          if (directValue != null) return directValue;
        }
      }

      for (const containerKey of splitContainers) {
        const container = source[containerKey];
        if (!isRecord(container)) continue;
        for (const splitKey of splitKeys) {
          const splitRecord = container[splitKey];
          if (isRecord(splitRecord)) {
            const nestedValue = asNumber(findMetricValue(splitRecord, metricKeys));
            if (nestedValue != null) return nestedValue;
          }
        }
      }
    }

    for (const source of metricSources) {
      if (!isRecord(source)) continue;
      const found = asNumber(findMetricValue(source, candidateKeys));
      if (found != null) return found;
    }

    if (split === "valid") {
      for (const source of metricSources) {
        if (!isRecord(source)) continue;
        const validationRecords = [source, source.latest, source.summary].filter(isRecord);
        for (const record of validationRecords) {
          for (const metricKey of metricKeys) {
            const directValue = asNumber(record[metricKey]);
            if (directValue != null) return directValue;
          }
        }
      }
    }
    return null;
  };
  const getSplitSummaryValues = (split: SummarySplit): [string, number | null][] => {
    const precision = findSplitMetric(split, ["precision", "metrics/precision(B)"]);
    const recall = findSplitMetric(split, ["recall", "metrics/recall(B)"]);
    const explicitF1 = findSplitMetric(split, ["f1", "f1_score"]);
    const derivedF1 =
      precision != null && recall != null
        ? precision + recall === 0
          ? 0
          : (2 * precision * recall) / (precision + recall)
        : null;
    return [
      ["F1 Score", explicitF1 ?? derivedF1],
      ["Precision", precision],
      ["Recall", recall],
      ["mAP50", findSplitMetric(split, ["map50", "mAP50", "best_map50", "metrics/mAP50(B)"])],
      [
        "mAP50-95",
        findSplitMetric(split, [
          "map50_95",
          "map50-95",
          "mAP50-95",
          "mAP50-95(B)",
          "best_map50_95",
          "metrics/mAP50-95(B)",
          "metrics/mAP50-95",
        ]),
      ],
    ];
  };
  const summarySplitMetrics: Record<SummarySplit, { label: string; values: [string, number | null][] }> = {
    train: {
      label: "Train Summary",
      values: getSplitSummaryValues("train"),
    },
    valid: {
      label: "Valid Summary",
      values: getSplitSummaryValues("valid"),
    },
    test: {
      label: "Test Summary",
      values: getSplitSummaryValues("test"),
    },
  };
  const confusionMatrixUrl = selectedJob?.artifact_urls?.["confusion_matrix.png"] ?? null;
  const summaryArtifacts = Object.entries(selectedJob?.artifact_urls ?? {}).filter(
    ([name]) => name === "best.onnx" || name === "best.pt",
  );
  const showSummaryPanel = Boolean(selectedJob);
  const summaryReady = selectedJob?.status === "completed";
  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !query ||
        job.name.toLowerCase().includes(query) ||
        Boolean(job.architecture_name?.toLowerCase().includes(query));
      const matchesStatus =
        jobFilter === "all" ||
        (jobFilter === "active" && (job.status === "queued" || job.status === "running")) ||
        (jobFilter === "completed" && job.status === "completed") ||
        (jobFilter === "failed" && (job.status === "failed" || job.status === "cancelled"));
      return matchesQuery && matchesStatus;
    });
  }, [jobFilter, jobQuery, jobs]);

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <NewJobModal
            projectList={projectList}
            datasetList={datasetList}
            architectures={architectures}
            onClose={() => setShowModal(false)}
            onCreated={handleJobCreated}
            initialProjectId={trainingTarget.projectId}
            initialDatasetId={trainingTarget.datasetId}
          />
        )}
        {zoomedChartConfig ? (
          <motion.div
            key="chart-zoom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${zoomedChartConfig.title} enlarged chart`}
            onClick={() => setZoomedChart(null)}
          >
            <motion.div
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl sm:p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Training Chart</p>
                  <h3 className="mt-1 truncate text-lg font-bold text-stone-900">{zoomedChartConfig.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedChart(null)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-orange-500/30"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <MetricLineChart
                title={zoomedChartConfig.title}
                points={zoomedChartConfig.points}
                color={zoomedChartConfig.color}
                icon={zoomedChartConfig.icon}
                tone={zoomedChartConfig.tone}
                percent={zoomedChartConfig.percent}
                yAxisLabel={zoomedChartConfig.yAxisLabel}
                xAxisMax={totalEpochs || undefined}
                expanded
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="z-10 mx-auto w-full max-w-6xl flex-grow p-4 md:p-6">
        <div
          className={[
            "mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5",
            "shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center",
            "md:justify-between",
          ].join(" ")}
        >
          <div>
            <h1 className="mb-1 text-pretty text-2xl font-bold tracking-tight text-stone-900">Training</h1>
            <p className="max-w-xl text-sm leading-6 text-stone-500">
              Create a run and follow its progress.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <div
              className={["flex h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white", "px-4"].join(" ")}
            >
              <div
                className={[
                  "w-2 h-2 rounded-full",
                  jobs.some((j) => j.status === "running") ? "bg-orange-500 animate-ping motion-reduce:animate-none" : "bg-stone-300",
                ].join(" ")}
              />
              <span className="text-sm font-bold text-stone-900">
                {jobs.filter((j) => j.status === "running").length} Running
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              aria-label="Refresh training data"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className={["h-4 w-4", refreshing ? "animate-spin motion-reduce:animate-none" : ""].join(" ")} />
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200",
                "bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60",
                "transition-colors hover:bg-orange-200 focus-visible:ring-2 focus-visible:ring-orange-500",
              ].join(" ")}
            >
              <FlaskConical className="w-4 h-4 text-orange-500" />
              <span>New Training Run</span>
            </button>
          </div>
        </div>

        {pageError ? (
          <div role="alert" aria-live="polite" className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{pageError}</span>
            </div>
            <button type="button" onClick={() => setPageError("")} aria-label="Dismiss error" className="rounded-md p-1 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="hidden">
          {[
            { label: "Dataset version", value: selectedDataset ? `${selectedDataset.name} v${selectedDataset.version}` : "Not selected", icon: Database },
            { label: "Training images", value: selectedDataset?.media_count ?? "—", icon: ImageIcon },
            { label: "Architecture", value: selectedJob?.architecture_name ?? "—", icon: Layers3 },
            { label: "Progress", value: selectedJob?.status === "completed" ? "100%" : `${Math.round(progress)}%`, icon: Activity },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{item.label}</p>
                <item.icon className="h-4 w-4 text-orange-500" />
              </div>
              <p className="truncate text-base font-bold text-stone-900">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                <PackageCheck aria-hidden="true" className="h-5 w-5 text-orange-500" />
                Model Registry
              </h2>
              <p className="mt-1 text-sm text-stone-500">Saved model versions ready for evaluation or deployment.</p>
            </div>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <Rocket aria-hidden="true" className="h-4 w-4 text-orange-500" />
              Manage Deployments
            </Link>
          </div>
          {registeredModels.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {registeredModels.slice(0, 4).map((model) => {
                const map50 = asNumber(
                  model.metrics.map50 ??
                    findMetricValue(model.metrics, ["best_map50", "map50", "mAP50", "metrics/mAP50(B)"]),
                );
                return (
                  <article key={model.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-stone-900">{model.name}</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          v{model.version} · {model.format}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">
                        Saved
                      </span>
                    </div>
                    <div className="flex items-end justify-between border-t border-stone-200 pt-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">mAP@.5</p>
                        <p className="mt-1 font-mono text-lg font-bold tabular-nums text-stone-900">
                          {map50 == null ? "—" : map50.toFixed(3)}
                        </p>
                      </div>
                      <time className="text-[10px] text-stone-400">{DATE_FORMATTER.format(new Date(model.created_at))}</time>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 py-8 text-center">
              <p className="text-sm font-bold text-stone-700">No trained models yet</p>
              <p className="mt-1 text-xs text-stone-400">Completed training runs are saved here automatically.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-12 gap-5">
          {/* Main Monitor */}
          <div className="col-span-12 space-y-5">
            <div
              className={[
                "bg-white rounded-3xl p-6 border border-stone-200 shadow-sm",
                "relative overflow-hidden",
              ].join(" ")}
            >
              <div
                className={[
                  "hidden absolute top-0 right-0 w-96 h-96 bg-orange-200/40 rounded-full blur-[120px] -mr-48",
                  "-mt-48",
                ].join(" ")}
              />
              <div
                className={[
                  "hidden absolute bottom-0 left-0 w-64 h-64 bg-amber-200/30 rounded-full blur-[100px] -ml-32",
                  "-mb-32",
                ].join(" ")}
              />

              <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-stone-900">
                      {selectedJob ? selectedJob.name : "No job selected"}
                    </h2>
                    {selectedJob ? (
                      <span className={["inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold capitalize", selectedJob.status === "running" ? "bg-emerald-50 text-emerald-600" : selectedJob.status === "failed" ? "bg-red-50 text-red-600" : selectedJob.status === "completed" ? "bg-blue-50 text-blue-600" : "bg-stone-100 text-stone-600"].join(" ")}>
                        <span className={["h-2 w-2 rounded-full", selectedJob.status === "running" ? "bg-emerald-500" : selectedJob.status === "failed" ? "bg-red-500" : selectedJob.status === "completed" ? "bg-blue-500" : "bg-stone-400"].join(" ")} />
                        {selectedJob.status}
                      </span>
                    ) : <p className="w-full text-sm text-stone-500">Start a new experiment to begin training</p>}
                  </div>
                  {selectedJob && (
                    <div className="flex gap-2">
                      {["queued", "running"].includes(selectedJob.status) && (
                        <button
                          type="button"
                          onClick={() => handleStop(selectedJob.id)}
                          disabled={stoppingId === selectedJob.id}
                          aria-label={"Cancel " + selectedJob.name}
                          className={[
                            "flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50/30 text-red-500 hover:bg-red-50",
                            "transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50",
                          ].join(" ")}
                        >
                          {stoppingId === selectedJob.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      {selectedJob.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => handleRetry(selectedJob)}
                          disabled={jobActionId === selectedJob.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                        >
                          <RotateCcw aria-hidden="true" className="h-4 w-4" />
                          Retry
                        </button>
                      ) : null}
                      {!["queued", "running"].includes(selectedJob.status) ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedJob)}
                          disabled={jobActionId === selectedJob.id}
                          aria-label={"Delete " + selectedJob.name}
                          className="rounded-xl border border-stone-200 p-2 text-stone-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {selectedJob ? (
                  <div className="mb-6 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/70 via-white to-orange-50/40 p-5">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                          <Activity aria-hidden="true" className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">{stageLabel}</p>
                          <p className="mt-1 truncate text-sm font-bold text-stone-900">{progressMessage}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-2xl font-bold tabular-nums text-orange-600">
                          {Math.round(progress)}%
                        </p>
                      </div>
                    </div>
                    <div className="ml-0 h-2 overflow-hidden rounded-full bg-orange-100 sm:ml-16">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400"
                        animate={{ width: `${Math.max(progress, selectedJob.status === "running" ? 2 : 0)}%` }}
                      />
                    </div>
                    <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        [
                          "Epoch",
                          epochDisplay != null
                            ? `${epochDisplay}${totalEpochs ? ` / ${totalEpochs}` : ""}`
                            : totalEpochs && isActiveJob
                              ? `0 / ${totalEpochs}`
                              : "-",
                          CalendarDays,
                          "bg-blue-50 text-blue-500",
                        ],
                        ["ETA", formatDuration(etaSeconds), Clock3, "bg-violet-50 text-violet-500"],
                        [
                          "GPU",
                          gpuMemoryMb == null
                            ? selectedJob.agent_job_id
                              ? "Agent assigned"
                              : isActiveJob
                                ? "Waiting"
                                : "-"
                            : `${Math.round(gpuMemoryMb)} MB${gpuUtilization == null ? "" : ` / ${Math.round(gpuUtilization)}%`}`,
                          BatteryCharging,
                          "bg-emerald-50 text-emerald-500",
                        ],
                        ["Learning Rate", learningRateDisplay == null ? "-" : learningRateDisplay.toExponential(2), TrendingUp, "bg-orange-50 text-orange-500"],
                      ].map(([label, value, Icon, iconClass], index) => (
                        <div key={String(label)} className={["flex items-center gap-3 px-1 py-2", index > 0 ? "lg:border-l lg:border-orange-100 lg:pl-5" : ""].join(" ")}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${String(iconClass)}`}>
                            {typeof Icon !== "string" ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
                          </span>
                          <div className="min-w-0">
                            <dt className="font-semibold text-stone-500">{String(label)}</dt>
                            <dd className="mt-1 truncate font-mono text-sm font-bold tabular-nums text-stone-900">{String(value)}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                    {isActiveJob && !hasMetrics ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        <Loader2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
                        <span>
                          Live metrics will fill in after the first callback from the GPU agent.
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {selectedJob?.status === "failed" && selectedJob.error_message ? (
                  <div role="alert" className="mb-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold">Training failed</p>
                      <p className="mt-1 break-words text-red-600">{selectedJob.error_message}</p>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Loss", formatMetric(lossDisplay, 4), Activity, "text-emerald-500"],
                      ["mAP50", formatMetric(map50), BarChart3, "text-violet-500"],
                      ["Epoch", String(epochDisplay ?? "-"), Target, "text-blue-500"],
                      ["Val loss", formatMetric(valLoss, 4), ShieldCheck, "text-orange-500"],
                    ].map(([label, value, Icon, color], index) => (
                      <div key={String(label)} className={["flex min-h-20 items-center gap-3 px-5 py-4", index > 0 ? "border-t border-stone-100 sm:border-l sm:border-t-0" : ""].join(" ")}>
                        {typeof Icon !== "string" ? <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${String(color)}`} /> : null}
                        <div><p className="text-xs font-semibold text-stone-500">{String(label)}</p><p className="mt-1 font-mono text-sm font-bold text-stone-900">{String(value)}</p></div>
                      </div>
                    ))}
                  </div>
                </div>

                {showSummaryPanel ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="grid lg:grid-cols-[1.15fr_0.95fr]">
                      <div className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-3 text-sm font-bold text-stone-900"><BarChart3 className="h-5 w-5 text-violet-500" />Training Summary</h3>
                            <p className="mt-1 pl-8 text-xs font-medium text-stone-500">{summaryReady ? "Training completed successfully." : "This summary will be updated automatically when training completes."}</p>
                          </div>
                          <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1" aria-label="Training summary split">
                            {(["train", "valid", "test"] as SummarySplit[]).map((split) => (
                              <button
                                key={split}
                                type="button"
                                onClick={() => setSummarySplit(split)}
                                aria-pressed={summarySplit === split}
                                className={[
                                  "h-8 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-orange-500",
                                  summarySplit === split ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900",
                                ].join(" ")}
                              >
                                {split === "valid" ? "Valid" : split[0].toUpperCase() + split.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5">
                          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{summarySplitMetrics[summarySplit].label}</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {summarySplitMetrics[summarySplit].values.map(([label, value]) => (
                              <div key={label} className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3">
                                <p className="text-sm font-semibold text-stone-600">{label}</p>
                                <p className="font-mono text-lg font-bold text-stone-900">{formatScorePercent(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Artifacts</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {summaryArtifacts.length > 0
                              ? summaryArtifacts.map(([name, url]) => (
                                <a
                                  key={name}
                                  href={url}
                                  className="inline-flex h-12 items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50"
                                >
                                  <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-stone-500" /><span className="truncate">{name}</span></span>
                                  <Download className="h-4 w-4 text-orange-500" />
                                </a>
                                ))
                              : ["best.onnx", "best.pt"].map((name) => (
                                  <div
                                    key={name}
                                    className="inline-flex h-12 items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-400"
                                  >
                                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{name}</span></span>
                                    <Download className="h-4 w-4" />
                                  </div>
                                ))}
                          </div>
                        </div>

                        <div className="mt-5">
                          <h3 className="flex items-center gap-3 text-sm font-bold text-stone-900"><Wrench className="h-5 w-5 text-violet-500" />Tools</h3>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {confusionMatrixUrl ? <a href={confusionMatrixUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-600 transition hover:bg-violet-50"><Grid3X3 className="h-4 w-4" />Confusion Matrix</a> : <div className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-violet-100 px-3 text-xs font-bold text-violet-400"><Grid3X3 className="h-4 w-4" />View Confusion Matrix</div>}
                            {selectedJob?.dataset ? (
                              <Link
                                href={`/datasets/${selectedJob.dataset}`}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-bold text-violet-600 transition-colors hover:bg-violet-50"
                              >
                                <ImageIcon className="h-4 w-4" />Try Model
                              </Link>
                            ) : <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-100 px-3 text-xs font-bold text-violet-400"><ImageIcon className="h-4 w-4" />Try Model on Image Browser</div>}
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-3 text-sm font-bold text-stone-900">
                            <FolderOpen aria-hidden="true" className="h-5 w-5 text-blue-500" />
                            Training Chart
                          </h3>
                        </div>
                        <div className="mt-5 flex flex-col gap-4">
                          <MetricLineChart
                            title="Training Loss"
                            points={lossChartPoints}
                            color="#f97316"
                            icon={Activity}
                            yAxisLabel="Loss"
                            xAxisMax={totalEpochs || undefined}
                            onExpand={() => setZoomedChart("loss")}
                          />
                          <MetricLineChart
                            title="mAP@0.5"
                            points={map50ChartPoints}
                            color="#7c3aed"
                            icon={Target}
                            tone="violet"
                            yAxisLabel="Score"
                            xAxisMax={totalEpochs || undefined}
                            onExpand={() => setZoomedChart("map50")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Jobs list */}
            <div>
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500">Training Runs</h3>
                  <p className="mt-1 text-xs text-stone-400">{filteredJobs.length} of {jobs.length} runs</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <span className="sr-only">Search training runs</span>
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input type="search" name="training-search" autoComplete="off" value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="Search runs…" className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-orange-500/30 sm:w-52" />
                  </label>
                  <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1" aria-label="Filter training runs">
                    {(["all", "active", "completed", "failed"] as JobFilter[]).map((filter) => (
                      <button type="button" key={filter} onClick={() => setJobFilter(filter)} aria-pressed={jobFilter === filter} className={["rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-orange-500", jobFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"].join(" ")}>
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonJob key={i} />)
                ) : filteredJobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 py-10 text-center">
                    <p className="text-sm font-bold text-stone-700">{jobs.length === 0 ? "No training runs yet" : "No matching runs"}</p>
                    <p className="mt-1 text-xs text-stone-400">{jobs.length === 0 ? "Create your first run to start training." : "Try another search or status filter."}</p>
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectJob(job)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectJob(job);
                        }
                      }}
                      className={[
                        "group relative w-full cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 text-left",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/40",
                        selectedJob?.id === job.id
                          ? "border-orange-400/70 bg-orange-50/30 shadow-[0_14px_34px_rgba(249,115,22,0.14)]"
                          : "border-stone-200 shadow-sm",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-orange-500 transition-opacity duration-200",
                          selectedJob?.id === job.id ? "opacity-100" : "opacity-0 group-hover:opacity-50",
                        ].join(" ")}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={[
                              "w-2.5 h-2.5 rounded-full",
                              job.status === "running"
                                ? "bg-orange-500 animate-pulse motion-reduce:animate-none"
                                : job.status === "completed"
                                  ? "bg-green-500"
                                  : job.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-stone-300",
                            ].join(" ")}
                          />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{job.name}</p>
                            <p className="text-[10px] text-stone-400 font-medium uppercase mt-0.5">
                              {job.status} · {DATE_FORMATTER.format(new Date(job.created_at))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(job.status === "running" || job.status === "queued") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStop(job.id);
                              }}
                              disabled={stoppingId === job.id}
                              aria-label={"Cancel " + job.name}
                              className={[
                                "p-1.5 text-stone-400 hover:text-red-500 transition-colors",
                                "disabled:opacity-50",
                              ].join(" ")}
                            >
                              {stoppingId === job.id ? (
                                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                              ) : (
                                <Square aria-hidden="true" className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {job.status === "failed" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRetry(job);
                              }}
                              disabled={jobActionId === job.id}
                              aria-label={"Retry " + job.name}
                              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                            >
                              <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            </button>
                          ) : null}
                          {selectedJob?.id === job.id && isMetricsLoading ? (
                            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-orange-500 motion-reduce:animate-none" />
                          ) : null}
                          {!["queued", "running"].includes(job.status) ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete(job);
                              }}
                              disabled={jobActionId === job.id}
                              aria-label={"Delete " + job.name}
                              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 font-bold text-stone-900">
                <Cpu aria-hidden="true" className="h-4 w-4 text-orange-500" />
                Run Information
              </h3>
              <dl className="space-y-3 text-xs">
                {[
                  ["Agent job", selectedJob?.agent_job_id || "Not assigned"],
                  ["Dataset", selectedDataset ? selectedDataset.name + " v" + selectedDataset.version : "—"],
                  ["Started", selectedJob?.started_at ? DATE_FORMATTER.format(new Date(selectedJob.started_at)) : "—"],
                  ["Finished", selectedJob?.finished_at ? DATE_FORMATTER.format(new Date(selectedJob.finished_at)) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="max-w-[65%] break-words text-right font-bold tabular-nums text-stone-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-500" />
                  Hyperparameters
                </h3>
              </div>
              <div className="space-y-4">
                {Object.keys(hyperparams).length > 0
                  ? Object.entries(hyperparams).map(([k, v]) => (
                      <div
                        key={k}
                        className={[
                          "flex justify-between items-center py-2 border-b border-stone-50",
                          "last:border-0",
                        ].join(" ")}
                      >
                        <span className="text-xs font-medium text-stone-500 capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-xs font-bold text-stone-900">{String(v)}</span>
                      </div>
                    ))
                  : [
                      { label: "Learning Rate", value: "—" },
                      { label: "Batch Size", value: "—" },
                      { label: "Epochs", value: "—" },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className={[
                          "flex justify-between items-center py-2 border-b border-stone-50",
                          "last:border-0",
                        ].join(" ")}
                      >
                        <span className="text-xs font-medium text-stone-500">{p.label}</span>
                        <span className="text-xs font-bold text-stone-900">{p.value}</span>
                      </div>
                    ))}
              </div>
            </div>

            <div
              className={[
                "p-8 bg-orange-50 rounded-3xl border border-orange-100 text-stone-900 relative",
                "overflow-hidden shadow-sm",
              ].join(" ")}
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">Export Result</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                  {selectedJob?.status === "completed"
                    ? `${Object.keys(selectedJob.artifact_urls ?? {}).length} training artifacts are available from this run.`
                    : "The GPU agent uploads PyTorch, ONNX, metrics, and training-log artifacts when training completes."}
                </p>
                <div className="space-y-2">
                  {Object.entries(selectedJob?.status === "completed" ? selectedJob.artifact_urls : {}).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      className="flex items-center justify-between rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-orange-100"
                    >
                      <span>{name}</span>
                      <Download className="h-4 w-4 text-orange-500" />
                    </a>
                  ))}
                </div>
                {selectedJob?.status !== "completed" || Object.keys(selectedJob?.artifact_urls ?? {}).length === 0 ? <button
                  disabled
                  className={[
                    "px-6 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold",
                    "text-sm flex items-center gap-2 opacity-50",
                  ].join(" ")}
                >
                  <span>Artifacts available after training</span>
                  <ChevronRight className="w-5 h-5" />
                </button> : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
