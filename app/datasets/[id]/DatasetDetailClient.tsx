"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  ChevronDown,
  Tag,
  RefreshCw,
  Upload,
  Loader2,
  AlertTriangle,
  BarChart3,
  Layers,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  BadgeCheck,
  Circle,
  Check,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
  Sun,
  Aperture,
  Zap,
  Scissors,
  Sliders,
  Palette,
  Droplets,
  Wind,
  Square,
  Maximize2,
  X,
  GraduationCap,
  ScanSearch,
  ShieldCheck,
  GitBranch,
} from "lucide-react";

const BATCH_SIZE = 50;
const IMPORT_BATCH_SIZE = 500;
const INTEGER_FORMATTER = new Intl.NumberFormat();
import BlueprintGrid from "@/components/BlueprintGrid";
import DatasetExportDialog from "@/components/datasets/DatasetExportDialog";
import DatasetImportDialog, { type DatasetImportFormat } from "@/components/datasets/DatasetImportDialog";
import { useConfirm } from "@/components/useConfirm";
import {
  datasets,
  annotationClasses,
  deployments,
  resolveMediaUrl,
  type DatasetStats,
  type Dataset,
  type BrowserData,
  type Media,
  type AnnotationClass,
  type ModelRegistry,
  type PredictionBox,
} from "@/lib/api";

interface Props {
  id: string;
}

function mediaDisplayName(media: Media): string {
  return (
    media.original_filename || media.file_url?.split("/").pop() || media.file?.split("/").pop() || `media-${media.id}`
  );
}

function mediaFallbackFrames(media: Media[]): BrowserData["frames"] {
  return media
    .filter((item) => item.type === "image")
    .map((item, index) => ({
      frame: index,
      media_id: item.id,
      image_url: item.file_url,
      name: mediaDisplayName(item),
      width: item.width ?? 0,
      height: item.height ?? 0,
      annotations: [],
      augmented:
        (item.metadata as { category?: string })?.category === "augmented" || (item.file ?? "").includes("/augmented/"),
      split: (item.metadata as { split?: "train" | "val" | "test" })?.split,
    }));
}

function buildMediaFallbackBrowserData(media: Media[], datasetId: number): BrowserData {
  const frames = mediaFallbackFrames(media);
  return {
    dataset_id: datasetId,
    dataset_name: `Dataset #${datasetId}`,
    version: 1,
    task_id: 0,
    frame_count: frames.length,
    labels: [],
    frames,
    annotation_count: 0,
  };
}

function buildBrowserDataWithMediaFallback(browser: BrowserData, media: Media[], datasetId: number): BrowserData {
  if (browser.frames.length > 0 || !media.some((item) => item.type === "image")) return browser;
  return {
    ...buildMediaFallbackBrowserData(media, datasetId),
    dataset_name: browser.dataset_name,
    version: browser.version,
    task_id: browser.task_id,
    labels: browser.labels,
    annotation_count: browser.annotation_count,
  };
}

// ── Class management ──────────────────────────────────────────────────────────
function pointsToPath(points: number[]): string {
  if (points.length < 4) return "";
  const pairs: string[] = [];
  for (let index = 0; index < points.length - 1; index += 2) {
    pairs.push(`${points[index]},${points[index + 1]}`);
  }
  return pairs.join(" ");
}

function predictionToPoints(prediction: PredictionBox, width: number, height: number): number[] {
  const [a, b, c, d] = prediction.bbox;
  const values = prediction.normalized ? [a * width, b * height, c * width, d * height] : [a, b, c, d];
  if (prediction.bbox_format === "xyxy") {
    const [x1, y1, x2, y2] = values;
    return [x1, y1, x2, y1, x2, y2, x1, y2];
  }
  const [x, y, boxWidth, boxHeight] = values;
  return [x, y, x + boxWidth, y, x + boxWidth, y + boxHeight, x, y + boxHeight];
}

const CARD = "bg-white rounded-2xl border border-stone-200";
const CARD_P = `${CARD} p-6`;
const CARD_COL1 = `flex h-full min-h-0 flex-col space-y-4 ${CARD_P}`;
const CARD_COL2 = `flex h-full min-h-0 flex-col items-center justify-center border-dashed ${CARD} p-8 text-center`;
const ACCORDION_TRIGGER = [
  "flex min-h-[4.5rem] items-center gap-3 bg-white p-5 text-left transition-colors",
  "hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70",
].join(" ");
const SPLIT_BADGES = {
  train: { label: "Train", Icon: GraduationCap, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  val: { label: "Valid", Icon: ScanSearch, className: "bg-amber-50 text-amber-700 ring-amber-200" },
  test: { label: "Test", Icon: ShieldCheck, className: "bg-violet-50 text-violet-700 ring-violet-200" },
} as const;

type SplitRatios = { train: number; val: number; test: number };

function GenerationStepMarker({
  step,
  current,
  completed = false,
}: {
  step: 1 | 2 | 3;
  current: 1 | 2 | 3;
  completed?: boolean;
}) {
  const done = completed || current > step;
  const active = current === step;
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
        done
          ? "bg-emerald-500 text-white"
          : active ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-500"
      }`}
      aria-label={done ? `Step ${step} completed` : `Step ${step}`}
    >
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : step}
    </span>
  );
}

function DatasetSectionMarker({
  section,
  current,
  completed = false,
}: {
  section: 1 | 2;
  current: 1 | 2;
  completed?: boolean;
}) {
  const done = completed || current > section;
  const active = current === section;
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
        done
          ? "bg-emerald-500 text-white"
          : active ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-500"
      }`}
      aria-label={done ? `Section ${section} completed` : `Section ${section}`}
    >
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : section === 1 ? "A" : "B"}
    </span>
  );
}

function SplitAllocationSlider({ value, onChange }: { value: SplitRatios; onChange: (next: SplitRatios) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number } | null>(null);
  const validEnd = value.train + value.val;

  const updateFromPointer = (handle: "train" | "valid", clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const requested = Math.round(((clientX - rect.left) / rect.width) * 100);
    if (handle === "train") {
      const train = Math.max(0, Math.min(requested, validEnd));
      if (train === value.train) return;
      onChange({ train, val: validEnd - train, test: 100 - validEnd });
      return;
    }
    const nextEnd = Math.max(value.train, Math.min(requested, 100));
    if (nextEnd === validEnd) return;
    onChange({ train: value.train, val: nextEnd - value.train, test: 100 - nextEnd });
  };

  const adjustWithKeyboard = (handle: "train" | "valid", delta: number) => {
    if (handle === "train") {
      const train = Math.max(0, Math.min(value.train + delta, validEnd));
      onChange({ train, val: validEnd - train, test: 100 - validEnd });
      return;
    }
    const nextEnd = Math.max(value.train, Math.min(validEnd + delta, 100));
    onChange({ train: value.train, val: nextEnd - value.train, test: 100 - nextEnd });
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-1.5 grid grid-cols-3 items-center px-3 text-[11px] font-bold tabular-nums">
        <span className="whitespace-nowrap text-left text-emerald-600">Train {value.train}%</span>
        <span className="whitespace-nowrap text-center text-amber-600">Valid {value.val}%</span>
        <span className="whitespace-nowrap text-right text-violet-600">Test {value.test}%</span>
      </div>
      <div ref={trackRef} className="relative mx-3 h-7 touch-none select-none">
        <div className="absolute inset-x-0 top-1/2 flex h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200/70">
          <span className="bg-emerald-400" style={{ width: `${value.train}%` }} />
          <span className="bg-amber-400" style={{ width: `${value.val}%` }} />
          <span className="bg-violet-500" style={{ width: `${value.test}%` }} />
        </div>
        {([
          { handle: "train" as const, position: value.train, label: "Train end point" },
          { handle: "valid" as const, position: validEnd, label: "Validation end point" },
        ]).map(({ handle, position, label }) => (
          <button
            key={handle}
            type="button"
            role="slider"
            aria-label={label}
            aria-valuemin={handle === "train" ? 0 : value.train}
            aria-valuemax={handle === "train" ? validEnd : 100}
            aria-valuenow={position}
            onPointerDown={(event) => {
              event.preventDefault();
              const handleRect = event.currentTarget.getBoundingClientRect();
              dragRef.current = {
                pointerId: event.pointerId,
                offsetX: event.clientX - (handleRect.left + handleRect.width / 2),
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              updateFromPointer(handle, event.clientX - drag.offsetX);
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onLostPointerCapture={() => {
              dragRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              adjustWithKeyboard(handle, event.key === "ArrowRight" ? 1 : -1);
            }}
            className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white bg-orange-500 shadow-md shadow-orange-200 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            style={{ left: `${position}%` }}
          />
        ))}
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

interface AugCardDef {
  key: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
  type: "toggle" | "slider";
  defaultVal: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}

interface PreprocessCardDef {
  key: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
}

const PREPROCESS_CARDS: PreprocessCardDef[] = [
  { key: "auto_orient", label: "Auto-Orient", desc: "Fix EXIF rotation metadata", Icon: RefreshCw },
  { key: "resize", label: "Resize", desc: "Standardize to fixed dimensions", Icon: Maximize2 },
  { key: "grayscale", label: "Grayscale", desc: "Convert images to grayscale", Icon: Circle },
];

const AUG_CARDS: AugCardDef[] = [
  { key: "flip_h", label: "Flip", desc: "Horizontal mirror", Icon: FlipHorizontal, type: "toggle", defaultVal: 1 },
  { key: "flip_v", label: "Flip Vertical", desc: "Vertical mirror", Icon: FlipVertical, type: "toggle", defaultVal: 1 },
  {
    key: "rotate90",
    label: "90° Rotate",
    desc: "Random 90° step rotation",
    Icon: RotateCw,
    type: "toggle",
    defaultVal: 1,
  },
  {
    key: "rotation",
    label: "Rotation",
    desc: "Random angle within range",
    Icon: RotateCcw,
    type: "slider",
    defaultVal: 15,
    min: 1,
    max: 45,
    step: 1,
    format: (v) => `±${v}°`,
  },
  {
    key: "shear",
    label: "Shear",
    desc: "Geometric shear transform",
    Icon: Scissors,
    type: "slider",
    defaultVal: 10,
    min: 5,
    max: 30,
    step: 5,
    format: (v) => `±${v}°`,
  },
  {
    key: "brightness",
    label: "Brightness",
    desc: "Random brightness shift",
    Icon: Sun,
    type: "slider",
    defaultVal: 0.2,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    format: (v) => `±${Math.round(v * 100)}%`,
  },
  {
    key: "contrast",
    label: "Contrast",
    desc: "Random contrast shift",
    Icon: Sliders,
    type: "slider",
    defaultVal: 0.2,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    format: (v) => `±${Math.round(v * 100)}%`,
  },
  {
    key: "hue",
    label: "Hue",
    desc: "Random hue shift",
    Icon: Palette,
    type: "slider",
    defaultVal: 20,
    min: 5,
    max: 60,
    step: 5,
    format: (v) => `±${v}`,
  },
  {
    key: "saturation",
    label: "Saturation",
    desc: "Random saturation shift",
    Icon: Droplets,
    type: "slider",
    defaultVal: 30,
    min: 5,
    max: 80,
    step: 5,
    format: (v) => `±${v}`,
  },
  {
    key: "blur",
    label: "Blur",
    desc: "Gaussian blur effect",
    Icon: Aperture,
    type: "slider",
    defaultVal: 1.5,
    min: 0.5,
    max: 5,
    step: 0.5,
    format: (v) => `${v.toFixed(1)}px`,
  },
  {
    key: "noise",
    label: "Noise",
    desc: "Gaussian noise injection",
    Icon: Zap,
    type: "slider",
    defaultVal: 0.1,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "motion_blur",
    label: "Motion Blur",
    desc: "Directional motion blur",
    Icon: Wind,
    type: "slider",
    defaultVal: 7,
    min: 3,
    max: 15,
    step: 2,
    format: (v) => `${v}px`,
  },
  { key: "cutout", label: "Cutout", desc: "Random rectangular dropout", Icon: Square, type: "toggle", defaultVal: 1 },
];

const DEFAULT_SPLIT_RATIOS = { train: 80, val: 15, test: 5 };

const DEFAULT_PREPROCESS_CONFIG = {
  auto_orient: false,
  resize: false,
  resize_width: 640,
  resize_height: 640,
  grayscale: false,
};

const DEFAULT_AUG_CONFIG = {
  flip_h: false,
  flip_v: false,
  rotate90: false,
  rotation: 0,
  brightness: 0,
  blur: 0,
  noise: 0,
  shear: 0,
  contrast: 0,
  hue: 0,
  saturation: 0,
  motion_blur: 0,
  cutout: false,
};

export default function DatasetDetailClient({ id }: Props) {
  const router = useRouter();
  const numericId = parseInt(id, 10);

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<Dataset | null>(null);
  const [splitRatios, setSplitRatios] = useState(DEFAULT_SPLIT_RATIOS);
  const [splitting, setSplitting] = useState(false);
  const [verifyingLabels, setVerifyingLabels] = useState(false);
  const [splitView, setSplitView] = useState<"class" | "split">("class");
  const [splitStrategy, setSplitStrategy] = useState<"class" | "random">("random");
  const splitStrategyTouchedRef = useRef(false);
  const [testMode, setTestMode] = useState<"split" | "none" | "dataset">("split");
  const [fixedTestDatasetId, setFixedTestDatasetId] = useState<number | null>(null);
  const [projectDatasets, setProjectDatasets] = useState<Dataset[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData | null>(null);
  const [annotatedCountApi, setAnnotatedCountApi] = useState<number | null>(null);
  const [mediaCountApi, setMediaCountApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [browserTab, setBrowserTab] = useState<"original" | "augmented">("original");
  const [registeredModels, setRegisteredModels] = useState<ModelRegistry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | "">("");
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [predictionsByMediaId, setPredictionsByMediaId] = useState<Record<number, PredictionBox[]>>({});
  const [showAnnotationLabels, setShowAnnotationLabels] = useState(true);
  const [showPredictionLabels, setShowPredictionLabels] = useState(true);
  const [currentDatasetSection, setCurrentDatasetSection] = useState<1 | 2>(1);
  const [browserOpen, setBrowserOpen] = useState(true);
  const browserLayoutInitializedRef = useRef(false);
  /** Last frame row index for Shift+click range selection (in `browserData.frames` order). */
  const anchorFrameIndexRef = useRef<number | null>(null);
  /** Image browser card — clicks outside clear selection. */
  const imageBrowserPanelRef = useRef<HTMLDivElement>(null);

  const [augOpen, setAugOpen] = useState(false);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<1 | 2 | 3>(1);
  const [splitOpen, setSplitOpen] = useState(true);
  const [prepareOpen, setPrepareOpen] = useState(true);
  const [augmentOpen, setAugmentOpen] = useState(false);
  const [preprocessConfig, setPreprocessConfig] = useState(DEFAULT_PREPROCESS_CONFIG);
  const [augConfig, setAugConfig] = useState(DEFAULT_AUG_CONFIG);
  const [multiplier, setMultiplier] = useState(1);
  const [augPreviews, setAugPreviews] = useState<Array<{ media_id: number; name: string; augmented_url: string }>>([]);
  const [augLoading, setAugLoading] = useState(false);
  const [augApplying, setAugApplying] = useState(false);
  const [augConfirmOpen, setAugConfirmOpen] = useState(false);
  const [augJob, setAugJob] = useState<{
    jobId: string;
    total: number;
    done: number;
    status: "running" | "done" | "error";
  } | null>(null);
  const [allClasses, setAllClasses] = useState<AnnotationClass[]>([]);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const refreshStatsAndBrowser = useCallback(async () => {
    const [dsResult, statsResult, browserResult, mediaResult, registryResult] = await Promise.allSettled([
      datasets.get(numericId),
      datasets.stats(numericId),
      datasets.browser(numericId),
      datasets.media(numericId),
      deployments.listRegistry(),
    ]);
    if (dsResult.status === "fulfilled") {
      setDatasetDetail(dsResult.value);
      if (dsResult.value.split_config) {
        const saved = dsResult.value.split_config;
        const savedIsUsable = saved.train > 0 && saved.val > 0 && saved.test >= 0
          && saved.train + saved.val + saved.test === 100;
        const train = savedIsUsable ? saved.train : 80;
        const val = savedIsUsable ? saved.val : 15;
        setSplitRatios({
          train,
          val,
          test: savedIsUsable ? saved.test : 5,
        });
        const savedStrategy = saved.strategy === "class" ? "class" : "random";
        setSplitStrategy(splitStrategyTouchedRef.current ? savedStrategy : "random");
        setFixedTestDatasetId(null);
        setTestMode("split");
      }
      setAnnotatedCountApi(dsResult.value.annotated_count ?? null);
      setMediaCountApi(dsResult.value.media_count ?? null);
    }
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
      const projectId = statsResult.value.project_id;
      if (projectId) {
        datasets.listAll(projectId).then(setProjectDatasets).catch(() => {});
        annotationClasses
          .list(projectId)
          .then((res) => setAllClasses(res.results))
          .catch(() => {});
      }
    }
    if (browserResult.status === "fulfilled") {
      const browser = browserResult.value;
      const media = mediaResult.status === "fulfilled" ? mediaResult.value : [];
      setBrowserData(buildBrowserDataWithMediaFallback(browser, media, numericId));
    } else if (mediaResult.status === "fulfilled" && mediaResult.value.some((item) => item.type === "image")) {
      setBrowserData(buildMediaFallbackBrowserData(mediaResult.value, numericId));
    }
    if (registryResult.status === "fulfilled") {
      setRegisteredModels(registryResult.value.results);
      setSelectedModelId((current) => current || registryResult.value.results[0]?.id || "");
    }
    if (dsResult.status === "rejected" && statsResult.status === "rejected" && browserResult.status === "rejected") {
      setError("Failed to load dataset data");
    }
  }, [numericId]);

  const latestImportJob = datasetDetail?.latest_import_job ?? null;
  const hasActiveImport = latestImportJob != null && ["queued", "running"].includes(latestImportJob.status);

  useEffect(() => {
    if (!hasActiveImport) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshStatsAndBrowser();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveImport, refreshStatsAndBrowser]);

  const handleConfigureSplit = async () => {
    if (splitRatios.train + splitRatios.val + splitRatios.test !== 100) {
      setError("Split ratios must total 100%.");
      return;
    }
    setSplitting(true);
    setError("");
    try {
      const result = await datasets.configureSplit(numericId, {
        ...splitRatios,
        seed: 42,
        strategy: splitStrategy,
        test_dataset_id: null,
      });
      setDatasetDetail(result.dataset);
      await refreshStatsAndBrowser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split dataset");
    } finally {
      setSplitting(false);
    }
  };

  const handleVerifyLabels = async () => {
    const labeled = datasetDetail?.annotated_count ?? 0;
    const background = datasetDetail?.unlabeled_count ?? 0;
    const accepted = await confirm({
      title: "Verify Annotations for Generation?",
      message: background > 0
        ? `${labeled} images contain labels. Confirm ${background} unlabeled images as background.`
        : `Confirm labels for ${labeled} images before generating the dataset.`,
      confirmLabel: "Verify Annotations",
    });
    if (!accepted) return;
    setVerifyingLabels(true);
    setError("");
    try {
      const updated = await datasets.verify(numericId, background > 0);
      setDatasetDetail(updated);
      await refreshStatsAndBrowser();
      setCurrentDatasetSection(2);
      setBrowserOpen(false);
      setAugOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify Annotations");
    } finally {
      setVerifyingLabels(false);
    }
  };

  const handleUnverifyLabels = async () => {
    const accepted = await confirm({
      title: "Mark Annotations as Unverified?",
      message: "Generate Dataset will be locked until these annotations are verified again.",
      confirmLabel: "Mark Unverified",
      danger: true,
    });
    if (!accepted) return;
    setVerifyingLabels(true);
    setError("");
    try {
      const updated = await datasets.unverify(numericId);
      setDatasetDetail(updated);
      setSplitRatios(DEFAULT_SPLIT_RATIOS);
      setSplitStrategy("random");
      splitStrategyTouchedRef.current = false;
      setTestMode("split");
      setFixedTestDatasetId(null);
      setCurrentGenerationStep(1);
      setSplitOpen(true);
      setPrepareOpen(true);
      setAugmentOpen(false);
      setPreprocessConfig(DEFAULT_PREPROCESS_CONFIG);
      setAugConfig(DEFAULT_AUG_CONFIG);
      setMultiplier(1);
      setAugPreviews([]);
      setAugConfirmOpen(false);
      setAugJob(null);
      setBrowserTab("original");
      setCurrentPage(1);
      setSelectedMediaIds([]);
      anchorFrameIndexRef.current = null;
      setCurrentDatasetSection(1);
      setBrowserOpen(true);
      setAugOpen(false);
      await refreshStatsAndBrowser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark Annotations as unverified");
    } finally {
      setVerifyingLabels(false);
    }
  };

  const handleTestModeChange = (mode: "split" | "none" | "dataset") => {
    setTestMode(mode);
    setSplitRatios(mode === "split" ? { train: 70, val: 20, test: 10 } : { train: 80, val: 20, test: 0 });
    if (mode !== "dataset") setFixedTestDatasetId(null);
  };

  useEffect(() => {
    if (isNaN(numericId)) return;
    let cancelled = false;

    async function load() {
      try {
        await refreshStatsAndBrowser();
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    setLoading(true);
    setError("");
    load();
    return () => {
      cancelled = true;
    };
  }, [numericId, refreshStatsAndBrowser]);

  useEffect(() => {
    setSelectedMediaIds([]);
    anchorFrameIndexRef.current = null;
    setCurrentPage(1);
  }, [numericId]);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("visiox-annotations");
      channel.onmessage = (e: MessageEvent<{ type: string; datasetId: number }>) => {
        if (e.data?.type === "annotations-saved" && e.data?.datasetId === numericId) {
          setCurrentDatasetSection(1);
          setBrowserOpen(true);
          setAugOpen(false);
          void refreshStatsAndBrowser();
        }
      };
    } catch {
      /* BroadcastChannel not supported */
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshStatsAndBrowser();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [numericId, refreshStatsAndBrowser]);

  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (selectedMediaIds.length === 0) return;
      const panel = imageBrowserPanelRef.current;
      if (!panel) return;
      if (panel.contains(e.target as Node)) return;
      setSelectedMediaIds([]);
      anchorFrameIndexRef.current = null;
    }
    document.addEventListener("mousedown", handleDocMouseDown);
    return () => document.removeEventListener("mousedown", handleDocMouseDown);
  }, [selectedMediaIds.length]);

  const allFrames = browserData?.frames ?? [];
  const originalCount = allFrames.filter((f) => !f.augmented).length;
  const augmentedCount = allFrames.filter((f) => f.augmented).length;
  const trainImageCount = allFrames.filter((frame) => !frame.augmented && frame.split === "train").length;
  const labelsAreVerified = Boolean(
    datasetDetail?.verification_status === "verified" && datasetDetail.verification_is_current,
  );
  const generationIsComplete = Boolean(datasetDetail?.generation_is_complete);
  useEffect(() => {
    if (!datasetDetail || browserLayoutInitializedRef.current) return;
    browserLayoutInitializedRef.current = true;
    const verified = Boolean(
      datasetDetail.verification_status === "verified" && datasetDetail.verification_is_current,
    );
    setBrowserOpen(!verified);
    setAugOpen(verified);
    setCurrentDatasetSection(verified ? 2 : 1);
    if (verified && datasetDetail.generation_is_complete) {
      setCurrentGenerationStep(3);
      setSplitOpen(false);
      setPrepareOpen(false);
      setAugmentOpen(true);
    } else if (datasetDetail.split_updated_at) {
      setCurrentGenerationStep(2);
      setSplitOpen(false);
    }
  }, [datasetDetail]);
  const savedSplit = datasetDetail?.split_config;
  const splitIsConfigured = Boolean(datasetDetail?.split_updated_at && savedSplit);
  const splitIsSaved = Boolean(
    datasetDetail?.split_updated_at
    && savedSplit
    && savedSplit.train === splitRatios.train
    && savedSplit.val === splitRatios.val
    && savedSplit.test === splitRatios.test
    && (savedSplit.strategy ?? "random") === splitStrategy,
  );
  const activeFrames = allFrames.filter((f) => (browserTab === "augmented" ? f.augmented : !f.augmented));
  const totalPages = Math.max(1, Math.ceil(activeFrames.length / BATCH_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageOffset = (safePage - 1) * BATCH_SIZE;
  const visibleFrames = activeFrames.slice(pageOffset, pageOffset + BATCH_SIZE);

  const selectableMediaIds = visibleFrames.map((f) => f.media_id).filter((id): id is number => typeof id === "number");

  useEffect(() => {
    if (!browserData?.frames.length) return;
    // Prefetch only the first few annotate routes for fast click-through. Gallery
    // images are lazy-loaded thumbnails, so we no longer eagerly fetch them here.
    const warmFrames = browserData.frames.slice(0, Math.min(browserData.frames.length, 6));
    warmFrames.forEach((frame) => {
      const href =
        frame.image_url && typeof frame.media_id === "number"
          ? `/datasets/${id}/annotate/${frame.media_id}?mode=simple`
          : `/datasets/${id}/annotate/native?mode=simple&frame=${frame.frame}`;
      router.prefetch(href);
    });
  }, [browserData, id, router]);

  const toggleMediaSelection = (mediaId: number) => {
    setSelectedMediaIds((prev) => (prev.includes(mediaId) ? prev.filter((x) => x !== mediaId) : [...prev, mediaId]));
  };

  const selectMediaRangeByFrameIndex = useCallback(
    (from: number, to: number) => {
      if (!browserData?.frames.length) return;
      const frames = browserData.frames.filter((f) => (browserTab === "augmented" ? f.augmented : !f.augmented));
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const ids: number[] = [];
      for (let i = lo; i <= hi; i++) {
        const f = frames[i];
        if (f && typeof f.media_id === "number") ids.push(f.media_id);
      }
      setSelectedMediaIds(ids);
    },
    [browserData, browserTab],
  );

  const allSelectableSelected =
    selectableMediaIds.length > 0 && selectableMediaIds.every((id) => selectedMediaIds.includes(id));

  const toggleSelectAllMedia = () => {
    if (allSelectableSelected) {
      setSelectedMediaIds([]);
    } else {
      setSelectedMediaIds([...selectableMediaIds]);
    }
    anchorFrameIndexRef.current = null;
  };

  const handleDeleteSelectedMedia = async () => {
    if (!selectedMediaIds.length || isNaN(numericId)) return;
    if (
      !(await confirm({
        title: "Delete images",
        message: `Delete ${selectedMediaIds.length} image(s)? This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    setDeleting(true);
    setError("");
    try {
      await datasets.deleteMedia(numericId, selectedMediaIds);
      setSelectedMediaIds([]);
      anchorFrameIndexRef.current = null;
      await refreshStatsAndBrowser();
      setCurrentPage((p) => Math.max(1, p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleRunInference = async () => {
    if (!selectedModelId || isNaN(numericId)) {
      setPredictionError("Select a trained model first.");
      return;
    }
    const visibleOriginalMediaIds = visibleFrames
      .filter((frame) => !frame.augmented && typeof frame.media_id === "number")
      .map((frame) => frame.media_id as number);
    const mediaIds = selectedMediaIds.length > 0 ? selectedMediaIds : visibleOriginalMediaIds;
    if (mediaIds.length === 0) {
      setPredictionError("No original images are available for inference on this page.");
      return;
    }
    setPredicting(true);
    setPredictionError("");
    try {
      const result = await deployments.predictDataset(selectedModelId as number, {
        dataset: numericId,
        media_ids: mediaIds,
      });
      const next: Record<number, PredictionBox[]> = {};
      for (const prediction of result.predictions ?? []) {
        if (!next[prediction.media_id]) next[prediction.media_id] = [];
        next[prediction.media_id].push(prediction);
      }
      setPredictionsByMediaId((current) => ({ ...current, ...next }));
      setShowPredictionLabels(true);
    } catch (err) {
      setPredictionError(err instanceof Error ? err.message : "Inference request failed.");
    } finally {
      setPredicting(false);
    }
  };

  const handleUploadFiles = async (files: File[], format: DatasetImportFormat) => {
    if (files.length === 0 || isNaN(numericId)) return;
    setUploading(true);
    setError("");
    try {
      if (format === "images") {
        for (let i = 0; i < files.length; i += IMPORT_BATCH_SIZE) {
          await datasets.startImport(numericId, files.slice(i, i + IMPORT_BATCH_SIZE), "images");
        }
      } else {
        await datasets.startImport(numericId, files, "yolo26");
      }
      await refreshStatsAndBrowser();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAugPreview = async () => {
    setAugLoading(true);
    setAugPreviews([]);
    try {
      const result = await datasets.augmentPreview(numericId, {
        preprocess: preprocessConfig,
        augment: augConfig,
        count: 6,
      });
      setAugPreviews(result.previews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Augmentation preview failed");
    } finally {
      setAugLoading(false);
    }
  };

  const handleAugApply = async () => {
    setAugApplying(true);
    setError("");
    try {
      // Kicks off a background job and returns immediately; we poll for progress.
      const { job_id, total } = await datasets.augmentApply(numericId, {
        preprocess: preprocessConfig,
        augment: augConfig,
        multiplier,
      });
      setAugPreviews([]);
      setAugConfirmOpen(false);
      setAugOpen(false);
      setAugJob({ jobId: job_id, total, done: 0, status: "running" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setAugApplying(false);
    }
  };

  // Poll the background augmentation job for progress; refresh the gallery when done.
  const augJobId = augJob?.jobId;
  const augJobStatus = augJob?.status;
  useEffect(() => {
    if (!augJobId || augJobStatus !== "running") return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const s = await datasets.augmentStatus(numericId, augJobId);
        if (cancelled) return;
        setAugJob((prev) => (prev ? { ...prev, done: s.done, total: s.total, status: s.status } : prev));
        if (s.status === "done") {
          await refreshStatsAndBrowser();
          setBrowserTab("augmented");
          setCurrentPage(1);
          setSelectedMediaIds([]);
          setTimeout(() => setAugJob((p) => (p && p.status === "done" ? null : p)), 1800);
        } else if (s.status === "error") {
          setError(s.error || "Augmentation failed");
          setAugJob(null);
        }
      } catch {
        // transient network/auth blip — keep polling
      }
    }, 800);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [augJobId, augJobStatus, numericId, refreshStatsAndBrowser]);

  const isAugEnabled = (key: string): boolean => {
    const val = augConfig[key as keyof typeof augConfig];
    return typeof val === "boolean" ? val : (val as number) > 0;
  };

  const toggleAug = (card: AugCardDef) => {
    setAugConfig((c) => {
      const current = c[card.key as keyof typeof c];
      if (typeof current === "boolean") return { ...c, [card.key]: !current };
      return { ...c, [card.key]: (current as number) === 0 ? card.defaultVal : 0 };
    });
    setAugPreviews([]);
  };

  const togglePreprocess = (key: string) => {
    setPreprocessConfig((c) => ({ ...c, [key]: !c[key as keyof typeof c] }));
    setAugPreviews([]);
  };

  const augActiveCount = AUG_CARDS.filter((c) => isAugEnabled(c.key)).length;
  const preprocessActiveCount = PREPROCESS_CARDS.filter(
    (c) => !!preprocessConfig[c.key as keyof typeof preprocessConfig],
  ).length;
  const hasGenerationTransforms = preprocessActiveCount + augActiveCount > 0;

  const totalImages = Math.max(browserData?.frame_count ?? 0, mediaCountApi ?? 0);
  const totalAnnotations = browserData?.annotation_count ?? 0;
  const labels = browserData?.labels ?? [];
  const name = stats?.name ?? browserData?.dataset_name ?? `Dataset #${id}`;

  const annotatedCount =
    annotatedCountApi !== null
      ? annotatedCountApi
      : browserData
        ? browserData.frames.filter((f) => f.annotations.length > 0).length
        : totalAnnotations > 0
          ? totalImages
          : 0;

  if (loading) {
    return (
      <div className="relative flex-1 flex flex-col min-h-screen bg-stone-50">
        <BlueprintGrid />
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-500">Loading dataset statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen bg-stone-50">
      <BlueprintGrid />

      {/* Navbar */}
      <div className="sticky top-4 z-20 w-full max-w-8xl mx-auto px-6 mb-4">
        <nav
          className={[
            "sticky top-0 z-50 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white",
            "p-5 md:flex-row md:items-center md:justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(stats?.project_id ? `/projects/${stats.project_id}` : "/projects")}
              className={[
                "p-2 hover:bg-stone-100 rounded-xl transition-colors border border-transparent",
                "hover:border-stone-200",
              ].join(" ")}
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div className="h-6 w-[1px] bg-stone-200" />
            <div
              className={["flex items-center gap-2 text-stone-400 text-xs font-bold uppercase", "tracking-widest"].join(
                " ",
              )}
            >
              <Link href="/projects" className="hover:text-stone-600 transition-colors">
                Projects
              </Link>
              <span>/</span>
              {stats?.project_id && stats?.project_name ? (
                <>
                  <Link href={`/projects/${stats.project_id}`} className="hover:text-stone-600 transition-colors">
                    {stats.project_name}
                  </Link>
                  <span>/</span>
                </>
              ) : null}
              <span className="text-stone-900">{name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              disabled={uploading || hasActiveImport}
              className={[
                "flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm",
                "font-bold text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-50",
              ].join(" ")}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : hasActiveImport ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Queueing upload..." : hasActiveImport ? "Importing..." : "Upload"}
            </button>

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={exportOpen}
              className={[
                "flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm",
                "font-bold text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-50",
              ].join(" ")}
            >
              <Download className="w-4 h-4" /> Export
            </button>

            <button
              type="button"
              onClick={() => router.push(`/datasets/${id}/annotate/native?mode=simple`)}
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200",
                "bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60",
                "transition-all hover:bg-orange-200",
              ].join(" ")}
            >
              <Layers className="w-4 h-4" /> Annotate Native
            </button>
          </div>
        </nav>
      </div>

      {error && (
        <div
          className={[
            "mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl",
            "z-10 flex items-center gap-2",
          ].join(" ")}
        >
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {latestImportJob && (
        <div
          role={latestImportJob.status === "error" ? "alert" : "status"}
          aria-live={latestImportJob.status === "error" ? "assertive" : "polite"}
          className={[
            "mx-6 mt-3 flex flex-col gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm",
            "sm:flex-row sm:items-center sm:justify-between",
            latestImportJob.status === "error"
              ? "border-red-200 bg-red-50/80"
              : latestImportJob.status === "done"
                ? "border-emerald-200 bg-emerald-50/80"
                : "border-orange-200 bg-orange-50/80",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={[
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                latestImportJob.status === "error"
                  ? "bg-red-100 text-red-600"
                  : latestImportJob.status === "done"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-orange-100 text-orange-600",
              ].join(" ")}
              aria-hidden="true"
            >
              {latestImportJob.status === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : latestImportJob.status === "done" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={[
                  "font-bold",
                  latestImportJob.status === "error"
                    ? "text-red-800"
                    : latestImportJob.status === "done"
                      ? "text-emerald-800"
                      : "text-orange-800",
                ].join(" ")}
              >
                {latestImportJob.status === "queued"
                  ? "Upload queued for worker"
                  : latestImportJob.status === "running"
                    ? "Worker is importing files"
                    : latestImportJob.status === "error"
                      ? "Latest import failed"
                      : "Latest import completed"}
              </p>
              <p
                className={[
                  "mt-0.5 break-words text-xs leading-relaxed",
                  latestImportJob.status === "error"
                    ? "text-red-600"
                    : latestImportJob.status === "done"
                      ? "text-emerald-600"
                      : "text-orange-600",
                ].join(" ")}
              >
                {latestImportJob.status === "error"
                  ? latestImportJob.error || "The worker could not finish this import."
                  : `${latestImportJob.done}/${latestImportJob.total} files processed`}
              </p>
            </div>
          </div>
          {latestImportJob.status === "error" ? (
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              className={[
                "inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-xl",
                "border border-red-200 bg-white px-3 text-xs font-bold text-red-700",
                "transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-red-400 focus-visible:ring-offset-2 sm:self-center",
              ].join(" ")}
            >
              <Upload className="h-3.5 w-3.5" /> Choose another file
            </button>
          ) : null}
        </div>
      )}

      <DatasetExportDialog
        targets={[{ id: numericId, name }]}
        exportName={name}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <DatasetImportDialog
        open={importDialogOpen}
        datasetName={name}
        onClose={() => setImportDialogOpen(false)}
        onSubmit={handleUploadFiles}
      />

      {/* Main Content */}
      <div className="z-10 mx-auto flex w-full max-w-8xl flex-1 flex-col gap-4 overflow-auto p-6">
        {/* ── Augmented Images Preview ── */}
        {augPreviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={CARD_P}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-stone-900">Augmented Preview</h3>
                  <span
                    className={["rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold", "text-orange-600"].join(
                      " ",
                    )}
                  >
                    {augPreviews.length} images
                  </span>
                </div>
                <p className="text-sm text-stone-400">Current config applied — original images unchanged</p>
              </div>
              <button
                type="button"
                onClick={() => setAugPreviews([])}
                className={["text-xs font-medium text-stone-400 hover:text-stone-600", "transition-colors"].join(" ")}
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {augPreviews.map((preview) => (
                <div
                  key={preview.media_id}
                  className={[
                    "group overflow-hidden rounded-2xl border border-orange-200/60 bg-white hover:shadow-md",
                    "hover:border-orange-300 transition-all duration-300",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-50",
                      "to-amber-50",
                    ].join(" ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.augmented_url}
                      alt={`Augmented ${preview.name}`}
                      className={[
                        "h-full w-full object-cover transition-transform duration-500",
                        "group-hover:scale-[1.04]",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent opacity-0",
                        "group-hover:opacity-100 transition-opacity duration-300",
                      ].join(" ")}
                    />
                  </div>
                  <div className="px-2.5 py-2 bg-white">
                    <p className="truncate text-xs font-semibold text-stone-800">{preview.name}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <p className="text-[10px] font-medium text-orange-500">Augmented</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          {/* Column 1: Stats, Annotation Progress & Label Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={CARD_COL1}
          >
            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  {
                    label: "Total Images",
                    value: totalImages,
                    Icon: ImageIcon,
                    iconClass: "bg-orange-100 text-orange-500",
                  },
                  {
                    label: "Classes",
                    value: allClasses.length || labels.length,
                    Icon: Tag,
                    iconClass: "bg-purple-100 text-purple-500",
                  },
                  {
                    label: "Annotations",
                    value: totalAnnotations,
                    Icon: BarChart3,
                    iconClass: "bg-blue-100 text-blue-500",
                  },
                  {
                    label: "Annotated images",
                    value: annotatedCount,
                    Icon: CheckCircle2,
                    iconClass: "bg-emerald-100 text-emerald-500",
                  },
                ] as const
              ).map(({ label, value, Icon, iconClass }) => (
                <div key={label} className="rounded-xl bg-stone-50 px-3 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${iconClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">{value}</p>
                  <p className="text-xs font-medium text-stone-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {(allClasses.length > 0 || labels.length > 0) &&
              browserData &&
              (() => {
                // Build a name→count map from browser labels
                const labelCountByName = new Map<string, number>();
                labels.forEach((label) => {
                  const count = browserData.frames.reduce(
                    (sum, f) => sum + f.annotations.filter((a) => a.label_id === label.id).length,
                    0,
                  );
                  labelCountByName.set(label.name.toLowerCase(), count);
                });

                // Use project classes (all labels) if available, else fall back to browserData labels
                const source = allClasses.length > 0 ? allClasses : labels;
                const counts = source.map((label) => ({
                  id: label.id,
                  name: label.name,
                  color: label.color,
                  count: labelCountByName.get(label.name.toLowerCase()) ?? 0,
                }));
                const maxCount = Math.max(...counts.map((c) => c.count), 1);
                const totalCount = counts.reduce((s, c) => s + c.count, 0);
                return (
                  <div>
                    <h3 className="text-base font-bold text-stone-900 mb-3">Label Distribution</h3>
                    {/* Horizontal bars — reads cleanly whether there's 1 class or many. */}
                    <div className="space-y-2.5">
                      {counts.map((lbl) => {
                        const pct = (lbl.count / maxCount) * 100;
                        const share = totalCount > 0 ? Math.round((lbl.count / totalCount) * 100) : 0;
                        return (
                          <div key={lbl.id} className="flex items-center gap-3">
                            <div className="flex w-24 shrink-0 items-center gap-2 min-w-0">
                              <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: lbl.color }} />
                              <span className="truncate text-xs font-bold text-stone-600">{lbl.name}</span>
                            </div>
                            <div className="relative h-2 flex-1 overflow-hidden rounded-md bg-stone-100">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute inset-y-0 left-0 min-w-[3px] rounded-md"
                                style={{ backgroundColor: lbl.color }}
                              />
                            </div>
                            <div className="ml-1 flex w-20 shrink-0 items-center">
                              <span className="text-xs font-bold tabular-nums text-stone-800">{lbl.count}</span>

                              <span className="ml-auto text-xs font-bold tabular-nums text-stone-400">{share}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {allClasses.length === 0 && labels.length === 0 && (
              <div className="text-center py-6 text-stone-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No labels yet</p>
                <p className="text-xs mt-1">Add labels via the Annotate interface</p>
              </div>
            )}
          </motion.div>

          {/* Column 2: Model Performance placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className={CARD_COL2}
          >
            <BarChart3 className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-base font-bold text-stone-400">Model Performance</p>
            <p className="text-sm text-stone-300 mt-1 max-w-xs">Train a model to see predictions & metrics here</p>
          </motion.div>
        </div>

        {/* ── Generate Dataset ── */}
        {browserData && browserData.frames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className={`${CARD} order-2 overflow-hidden`}
          >
            <button
              type="button"
              disabled={!labelsAreVerified}
              onClick={() => {
                setBrowserOpen(false);
                setAugOpen((open) => currentDatasetSection === 2 ? !open : true);
                setCurrentDatasetSection(2);
              }}
              className={`${ACCORDION_TRIGGER} w-full justify-between disabled:bg-stone-50/70`}
            >
              <div className="flex items-center gap-3">
                <DatasetSectionMarker
                  section={2}
                  current={currentDatasetSection}
                  completed={generationIsComplete}
                />
                <div className="text-left">
                  <h3 className="text-base font-bold text-stone-900">Generate Dataset</h3>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {labelsAreVerified
                      ? "Preprocessing · Augmentation · Apply to dataset"
                      : "Verify annotations in Image Browser to unlock"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {preprocessActiveCount + augActiveCount > 0 && (
                  <span
                    className={[
                      "inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold",
                      "text-orange-700",
                    ].join(" ")}
                  >
                    {preprocessActiveCount + augActiveCount} active
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${augOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {augOpen && labelsAreVerified && (
              <div className="space-y-4 border-t border-stone-100 bg-stone-50/40 px-6 pb-6 pt-5">
                <div className="space-y-4">
                <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  splitOpen && currentGenerationStep === 1 ? "border-orange-200" : "border-stone-200"
                }`} aria-labelledby="split-step-title">
                  <div className="flex items-center bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentGenerationStep(1);
                        setPrepareOpen(false);
                        setAugmentOpen(false);
                        setSplitOpen((open) => !open);
                      }}
                      className={`${ACCORDION_TRIGGER} min-w-0 flex-1`}
                      aria-expanded={splitOpen}
                    >
                      <GenerationStepMarker step={1} current={currentGenerationStep} />
                      <div className="min-w-0 flex-1">
                        <h3 id="split-step-title" className="text-base font-bold text-stone-900">Step 1. Split Dataset</h3>
                        <span className="block text-xs text-stone-500">Split images into training, validation and test sets.</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${splitOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  </div>

                  {splitOpen && <div className="border-t border-stone-200 p-5">
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(22rem,2fr)_repeat(3,minmax(0,1fr))]">
                    <div className="flex min-h-24 w-full items-center rounded-2xl border border-stone-200 bg-stone-50/70 px-5 py-4 sm:col-span-3 xl:col-span-1">
                      <SplitAllocationSlider
                        value={splitRatios}
                        onChange={(next) => {
                          setCurrentGenerationStep(1);
                          setPrepareOpen(false);
                          setAugmentOpen(false);
                          setSplitRatios(next);
                        }}
                      />
                    </div>

                    {([
                      { key: "train", label: "Train", color: "emerald", value: splitRatios.train },
                      { key: "val", label: "Validation", color: "amber", value: splitRatios.val },
                      { key: "test", label: "Test", color: "violet", value: splitRatios.test },
                    ] as const).map((item) => (
                      <div key={item.key} className={`flex min-h-24 flex-col justify-between rounded-2xl border p-3.5 ${
                        item.color === "emerald"
                          ? "border-emerald-100 bg-emerald-50/50"
                          : item.color === "amber"
                            ? "border-amber-100 bg-amber-50/50"
                            : "border-violet-100 bg-violet-50/50"
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                          <span>{item.label}</span>
                        </div>
                        <p className="mt-3 text-2xl font-bold tabular-nums text-stone-900">
                          {INTEGER_FORMATTER.format(Math.round(originalCount * item.value / 100))}
                          <span className="ml-1 text-xs font-medium text-stone-400">images</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-stone-100 pt-4">
                    <div className="flex items-end gap-2">
                    <label className="grid gap-1 text-[10px] font-bold uppercase text-stone-400">
                      Strategy
                      <select
                        value={splitStrategy}
                        onChange={(event) => {
                          splitStrategyTouchedRef.current = true;
                          setSplitStrategy(event.target.value as "class" | "random");
                        }}
                        className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold normal-case text-stone-700 focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <option value="random">Random</option>
                        <option value="class">By class</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentGenerationStep(1);
                        setPrepareOpen(false);
                        setAugmentOpen(false);
                        setSplitRatios({ train: 80, val: 15, test: 5 });
                        setSplitStrategy("random");
                      }}
                      className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                    </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span aria-live="polite" className="text-xs font-medium text-stone-400">
                        {splitIsSaved
                          ? "Split saved"
                          : splitIsConfigured ? "Unsaved changes" : "Split first, then continue"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleConfigureSplit()}
                        disabled={splitting}
                        className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:opacity-50"
                      >
                        {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                        Split
                      </button>
                    </div>
                  </div>
                  </div>}
                </section>

                <div className="hidden rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-200/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="shrink-0 lg:w-64">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">1</span>
                        <p className="text-sm font-bold text-stone-900">Split Dataset</p>
                        <span
                          aria-live="polite"
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            splitIsSaved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {splitIsSaved ? "Saved" : "Not saved"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">Split first. Only Train images will be augmented.</p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                      <SplitAllocationSlider value={splitRatios} onChange={setSplitRatios} />
                      <label className="grid gap-1 text-[10px] font-bold uppercase text-stone-400">
                        Strategy
                        <select
                          value={splitStrategy}
                          onChange={(event) => {
                            splitStrategyTouchedRef.current = true;
                            setSplitStrategy(event.target.value as "class" | "random");
                          }}
                          className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold normal-case text-stone-700 outline-none focus:border-orange-400"
                        >
                          <option value="class">By class</option>
                          <option value="random">Random</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleConfigureSplit()}
                        disabled={splitting}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-orange-500 px-3 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                      >
                        {splitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save Split
                      </button>
                    </div>
                  </div>
                </div>
                <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  prepareOpen && splitIsConfigured ? "border-orange-200" : "border-stone-200"
                }`}>
                <button
                  type="button"
                  disabled={!splitIsConfigured}
                  onClick={() => {
                    setCurrentGenerationStep(2);
                    setSplitOpen(false);
                    setAugmentOpen(false);
                    setPrepareOpen((open) => !open);
                  }}
                  className={`${ACCORDION_TRIGGER} w-full`}
                >
                  <GenerationStepMarker step={2} current={currentGenerationStep} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-bold text-stone-900">
                      Step 2. Prepare Images
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">Optional</span>
                    </span>
                    <span className="block text-xs text-stone-400">Configure image size, orientation and padding.</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${prepareOpen && splitIsConfigured ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {/* ── Preprocessing ── */}
                {splitIsConfigured && prepareOpen && <div className="space-y-4 border-t border-stone-200 bg-stone-50/30 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Preprocessing</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {PREPROCESS_CARDS.map((card) => {
                      const enabled = !!preprocessConfig[card.key as keyof typeof preprocessConfig];
                      return (
                        <div
                          key={card.key}
                          className={`flex min-h-32 flex-col rounded-xl border p-4 transition-all duration-200 ${
                            enabled
                              ? "border-orange-300 bg-orange-50/40 shadow-sm shadow-orange-500/10"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all
                                duration-200 ${
                                  enabled
                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                                    : "bg-stone-100 text-stone-400"
                                }`}
                            >
                              <card.Icon className="h-4 w-4" />
                            </div>
                            <button
                              role="switch"
                              aria-checked={enabled}
                              onClick={() => togglePreprocess(card.key)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                                transition-all duration-200 ${
                                  enabled
                                    ? "bg-orange-500 shadow-md shadow-orange-500/25"
                                    : "bg-stone-200 hover:bg-stone-300"
                                }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm
                                  transition-transform duration-200 ${
                                    enabled ? "translate-x-[18px]" : "translate-x-0.5"
                                  }`}
                              />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-stone-800">{card.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-400">{card.desc}</p>
                          {enabled && card.key === "resize" && (
                            <div className="mt-3 pt-3 border-t border-orange-200/70">
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                                Dimensions
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={32}
                                  max={4096}
                                  step={32}
                                  value={preprocessConfig.resize_width}
                                  onChange={(event) =>
                                    setPreprocessConfig((current) => ({
                                      ...current,
                                      resize_width: parseInt(event.target.value) || 640,
                                    }))
                                  }
                                  className={[
                                    "w-20 text-xs border border-orange-200 rounded-lg px-2 py-1.5",
                                    "text-stone-700 text-center",
                                    "font-bold focus:outline-none focus:ring-2 focus:ring-orange-400/40",
                                  ].join(" ")}
                                />
                                <span className="text-xs text-stone-400">×</span>
                                <input
                                  type="number"
                                  min={32}
                                  max={4096}
                                  step={32}
                                  value={preprocessConfig.resize_height}
                                  onChange={(event) =>
                                    setPreprocessConfig((current) => ({
                                      ...current,
                                      resize_height: parseInt(event.target.value) || 640,
                                    }))
                                  }
                                  className={[
                                    "w-20 text-xs border border-orange-200 rounded-lg px-2 py-1.5",
                                    "text-stone-700 text-center",
                                    "font-bold focus:outline-none focus:ring-2 focus:ring-orange-400/40",
                                  ].join(" ")}
                                />
                                <span className="text-[10px] text-stone-400">px</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-stone-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-stone-400">This step is optional. Continue with or without preprocessing.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentGenerationStep(3);
                        setSplitOpen(false);
                        setPrepareOpen(false);
                        setAugmentOpen(true);
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>}
                </section>

                {/* ── Augmentation ── */}
                <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  augmentOpen && splitIsConfigured ? "border-orange-200" : "border-stone-200"
                }`}>
                <button
                  type="button"
                  disabled={!splitIsConfigured}
                  onClick={() => {
                    setCurrentGenerationStep(3);
                    setSplitOpen(false);
                    setPrepareOpen(false);
                    setAugmentOpen((open) => !open);
                  }}
                  className={`${ACCORDION_TRIGGER} w-full`}
                >
                  <GenerationStepMarker
                    step={3}
                    current={currentGenerationStep}
                    completed={generationIsComplete}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-bold text-stone-900">
                      Step 3. Augment Images
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">Optional</span>
                    </span>
                    <span className="block text-xs text-stone-400">Apply augmentation to improve Train data diversity.</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-400 transition-transform ${
                      augmentOpen && splitIsConfigured ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {splitIsConfigured && augmentOpen && <>
                <div className="space-y-4 border-t border-stone-200 bg-stone-50/30 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Augmentation</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {AUG_CARDS.map((card) => {
                      const enabled = isAugEnabled(card.key);
                      const numVal = augConfig[card.key as keyof typeof augConfig] as number;
                      return (
                        <div
                          key={card.key}
                          className={`flex min-h-32 flex-col rounded-xl border p-4 transition-all duration-200 ${
                            enabled
                              ? "border-orange-300 bg-orange-50/40 shadow-sm shadow-orange-500/10"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all
                                duration-200 ${
                                  enabled
                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                                    : "bg-stone-100 text-stone-400"
                                }`}
                            >
                              <card.Icon className="h-4 w-4" />
                            </div>
                            <button
                              role="switch"
                              aria-checked={enabled}
                              onClick={() => toggleAug(card)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                                transition-all duration-200 ${
                                  enabled
                                    ? "bg-orange-500 shadow-md shadow-orange-500/25"
                                    : "bg-stone-200 hover:bg-stone-300"
                                }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm
                                  transition-transform duration-200 ${
                                    enabled ? "translate-x-[18px]" : "translate-x-0.5"
                                  }`}
                              />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-stone-800">{card.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-400">{card.desc}</p>
                          {enabled && card.type === "slider" && card.format && (
                            <div className="mt-3 pt-2.5 border-t border-orange-200/70">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={card.min}
                                  max={card.max}
                                  step={card.step}
                                  value={numVal}
                                  onChange={(e) =>
                                    setAugConfig((c) => ({ ...c, [card.key]: parseFloat(e.target.value) }))
                                  }
                                  className="flex-1 h-1 accent-orange-500 cursor-pointer"
                                />
                                <span
                                  className={[
                                    "w-10 shrink-0 text-right text-[10px] font-bold text-orange-600",
                                    "tabular-nums",
                                  ].join(" ")}
                                >
                                  {card.format(numVal)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multiplier */}
                <div className="border-t border-stone-200 bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-stone-800">Dataset Multiplier</p>
                      <p className="text-xs text-stone-400 mt-0.5">Number of augmented copies per original image</p>
                    </div>
                    <span className="text-xs font-bold text-stone-800 tabular-nums">
                      {trainImageCount * multiplier} generated images
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMultiplier(m)}
                        className={`h-12 flex-1 rounded-xl border px-3 text-sm font-bold transition-all ${
                          multiplier === m
                            ? "border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/25"
                            : "border-stone-200 bg-white text-stone-600 hover:border-orange-300 hover:bg-orange-50"
                        }`}
                      >
                        {m}×
                        <span
                          className={[
                            "block text-[10px] font-medium mt-0.5",
                            multiplier === m ? "text-orange-200" : "text-stone-400",
                          ].join(" ")}
                        >
                          +{trainImageCount * m} imgs
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                </>}

                {/* Actions */}
                {splitIsConfigured && augmentOpen && !generationIsComplete && (
                <div className="flex min-h-16 items-center justify-between gap-4 border-t border-stone-200 bg-white px-5 py-4">
                  <p className="hidden text-xs text-stone-400 sm:block">
                    {splitIsSaved
                      ? "Step 2: configure options, then generate"
                      : splitIsConfigured ? "Save split changes before generating" : "Step 1: save the split to continue"}
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAugPreview()}
                    disabled={!splitIsSaved || augLoading || !hasGenerationTransforms}
                    className={[
                      "flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4",
                      "text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40",
                      "disabled:pointer-events-none",
                    ].join(" ")}
                  >
                    {augLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setAugConfirmOpen(true)}
                    disabled={!splitIsSaved || augApplying}
                    className={[
                      "flex h-10 min-w-40 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm text-white",
                      "font-bold shadow-sm shadow-orange-200 transition-colors hover:bg-orange-600",
                      "disabled:opacity-40 disabled:pointer-events-none",
                    ].join(" ")}
                  >
                    {augApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Apply to Dataset
                  </button>
                  </div>
                </div>
                )}
                </section>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {false && <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={CARD_P}
          aria-labelledby="dataset-split-heading"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="dataset-split-heading" className="text-base font-bold text-stone-900">Data Split</h2>
                {datasetDetail?.split_updated_at && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    Ready
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-stone-500">
                Augmentation is included in Train only. Valid and Test remain raw.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {(["train", "val", "test"] as const).map((key) => (
                <label key={key} className="grid gap-1 text-xs font-semibold capitalize text-stone-500">
                  {key === "val" ? "Valid" : key}
                  <span className="flex h-10 items-center rounded-xl border border-stone-200 bg-white px-3 focus-within:border-orange-400">
                    <input
                      type="number"
                      min={key === "train" ? 70 : 10}
                      max={key === "train" ? 80 : key === "val" ? 20 : 10}
                      value={splitRatios[key]}
                      disabled={key === "test" && testMode !== "split"}
                      onChange={(event) =>
                        setSplitRatios((current) => ({ ...current, [key]: Number(event.target.value) }))
                      }
                      className="no-number-spinner w-10 bg-transparent text-sm font-bold text-stone-800 outline-none disabled:text-stone-400"
                      aria-label={`${key} percentage`}
                    />
                    <span className="text-stone-400">%</span>
                  </span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => void handleConfigureSplit()}
                disabled={
                  splitting
                  || splitRatios.train + splitRatios.val + splitRatios.test !== 100
                  || (testMode === "dataset" && !fixedTestDatasetId)
                }
                className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                Apply split
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 lg:grid-cols-2">
            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-stone-500">Split strategy</legend>
              <div className="mt-2 inline-flex rounded-xl border border-stone-200 bg-white p-1">
                {([['class', 'By Class'], ['random', 'Random']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSplitStrategy(value)}
                    aria-pressed={splitStrategy === value}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                      splitStrategy === value
                        ? "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-stone-400">
                {splitStrategy === "class"
                  ? "Balances every class and background while keeping capture groups together."
                  : "Random split with a fixed seed; capture groups still stay together."}
              </p>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-stone-500">Test source</legend>
              <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1">
                {([['split', 'Split 10%'], ['none', 'No test'], ['dataset', 'Fixed dataset']] as const).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleTestModeChange(value)}
                      aria-pressed={testMode === value}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                        testMode === value
                          ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
              {testMode === "dataset" ? (
                <select
                  value={fixedTestDatasetId ?? ""}
                  onChange={(event) => setFixedTestDatasetId(event.target.value ? Number(event.target.value) : null)}
                  className="mt-2 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 outline-none focus:border-violet-400"
                  aria-label="Fixed test dataset"
                >
                  <option value="">Select a verified dataset…</option>
                  {projectDatasets
                    .filter((item) => item.id !== numericId && item.verification_status === "verified")
                    .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              ) : (
                <p className="mt-2 text-xs text-stone-400">
                  {testMode === "none"
                    ? "Training sends only Train and Valid. You can attach a test dataset later."
                    : "10% of this dataset is reserved for final evaluation."}
                </p>
              )}
            </fieldset>
          </div>

          {datasetDetail?.split_config?.summary && (() => {
            const summary = datasetDetail!.split_config!.summary!;
            const totalRaw = summary.train.raw + summary.val.raw + summary.test.raw;
            const colors = { train: "#52d8c2", val: "#f7cf5c", test: "#7657f6" };
            return (
              <div className="mt-6 border-t border-stone-100 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-900">View your split ({totalRaw} raw images)</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600">
                      <span>Train: <b className="text-stone-900">{summary.train.raw}</b></span>
                      <span>Valid: <b className="text-stone-900">{summary.val.raw}</b></span>
                      <span>Test: <b className="text-stone-900">{summary.test.raw}</b></span>
                    </div>
                  </div>
                  <div className="inline-flex self-start rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="tablist">
                    {([['class', 'By Class'], ['split', 'By Split']] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={splitView === value}
                        onClick={() => setSplitView(value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          splitView === value
                            ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
                            : "text-stone-400 hover:text-stone-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {splitView === "class" ? (
                    summary.classes?.length ? (summary.classes ?? []).map((row) => {
                      const total = row.train + row.val + row.test;
                      return (
                        <div key={row.name} className="grid grid-cols-[7rem_1fr] items-center gap-3">
                          <span className="truncate text-xs font-medium text-stone-700" title={row.name}>{row.name}</span>
                          <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
                            {(["train", "val", "test"] as const).map((key) => (
                              <motion.span
                                key={key}
                                initial={{ width: 0 }}
                                animate={{ width: `${total ? row[key] * 100 / total : 0}%` }}
                                transition={{ duration: 0.45 }}
                                style={{ backgroundColor: colors[key] }}
                                title={`${key}: ${row[key]}`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }) : <p className="text-xs text-stone-400">Apply split again to calculate class distribution.</p>
                  ) : (
                    (["train", "val", "test"] as const).map((key) => {
                      const value = summary[key];
                      return (
                        <div key={key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
                          <span className="text-xs font-bold capitalize text-stone-700">{key === "val" ? "Valid" : key}</span>
                          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${totalRaw ? value.raw * 100 / totalRaw : 0}%` }}
                              transition={{ duration: 0.45 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: colors[key] }}
                            />
                          </div>
                          <span className="w-28 text-right text-xs tabular-nums text-stone-500">
                            {value.raw} raw{value.augmented ? ` + ${value.augmented} aug` : ""}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-4 border-t border-stone-100 pt-3">
                  {([['train', 'Train'], ['val', 'Valid'], ['test', 'Test']] as const).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[key] }} />{label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </motion.section>}

        {confirmDialog}

        {augJob &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className={[
                "fixed bottom-5 right-5 z-[150] w-72 rounded-2xl border border-stone-200 bg-white/95 p-4",
                "shadow-xl shadow-stone-300/40 backdrop-blur",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                {augJob.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-500" />
                )}
                <p className="text-sm font-bold text-stone-800">
                  {augJob.status === "done" ? "Augmentation complete" : "Generating dataset…"}
                </p>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${augJob.total ? Math.round((augJob.done / augJob.total) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs font-medium text-stone-500">
                {augJob.done}/{augJob.total} images · runs in background
              </p>
            </div>,
            document.body,
          )}

        {augConfirmOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className={[
                "fixed inset-0 z-[200] flex items-center justify-center bg-black/40",
                "backdrop-blur-sm",
              ].join(" ")}
            >
              <div className="relative w-96 rounded-2xl bg-white p-6 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setAugConfirmOpen(false)}
                  className={[
                    "absolute right-4 top-4 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100",
                    "hover:text-stone-600",
                  ].join(" ")}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-base font-bold text-stone-900">Generate dataset</h2>

                <p className="mt-1.5 text-sm text-stone-500">
                  {hasGenerationTransforms ? (
                    <>
                      Generate <span className="font-bold text-stone-700">{trainImageCount * multiplier}</span> processed
                      image{trainImageCount * multiplier === 1 ? "" : "s"} from Train images?
                    </>
                  ) : (
                    "Finalize the current Train, Validation and Test split without preprocessing or augmentation?"
                  )}
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAugConfirmOpen(false)}
                    className={[
                      "flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold",
                      "text-stone-600 transition hover:bg-stone-100",
                    ].join(" ")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={augApplying}
                    onClick={() => void handleAugApply()}
                    className={[
                      "flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5",
                      "text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50",
                    ].join(" ")}
                  >
                    {augApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Apply
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {totalImages === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center"
          >
            <div
              className={[
                "w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex",
                "items-center justify-center shadow-lg shadow-orange-500/20 mb-4",
              ].join(" ")}
            >
              <Upload className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-base font-bold text-stone-900">No images or videos yet</h3>
            <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto">
              Upload image or video files. Videos are stored as media; use the native annotate flow for frames.
            </p>
            <button
              type="button"
              onClick={() => setImportDialogOpen(true)}
              disabled={uploading || hasActiveImport}
              className={[
                "mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl",
                "text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95",
                "transition-all disabled:opacity-50",
              ].join(" ")}
            >
              {uploading || hasActiveImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Queueing upload..." : hasActiveImport ? "Importing..." : "Upload files"}
            </button>
          </motion.div>
        )}

        {/* Frame Browser */}
        {browserData && browserData.frames.length > 0 && (
          <motion.div
            ref={imageBrowserPanelRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className={`${CARD} order-1 overflow-hidden`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setAugOpen(false);
                  setBrowserOpen((open) => currentDatasetSection === 1 ? !open : true);
                  setCurrentDatasetSection(1);
                }}
                className={`${ACCORDION_TRIGGER} min-w-0 flex-1`}
                aria-label={browserOpen ? "Collapse Image Browser" : "Expand Image Browser"}
                aria-expanded={browserOpen}
              >
                <DatasetSectionMarker
                  section={1}
                  current={currentDatasetSection}
                  completed={labelsAreVerified}
                />
                <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-900">Image Browser</h3>
                  {labelsAreVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-stone-400">
                  Review images · Check annotations · Verify dataset
                </p>
                </div>
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-stone-400 transition-transform ${browserOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {browserOpen && <div className="border-t border-stone-100 bg-stone-50/40 px-6 pb-6 pt-5">
            {/* ── Original / Augmented tabs ── */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-stone-100 p-1">
              {[
                { key: "original" as const, label: "Original", count: originalCount },
                { key: "augmented" as const, label: "Augmented", count: augmentedCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    if (browserTab === tab.key) return;
                    setBrowserTab(tab.key);
                    setCurrentPage(1);
                    setSelectedMediaIds([]);
                    anchorFrameIndexRef.current = null;
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                    browserTab === tab.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      browserTab === tab.key ? "bg-orange-100 text-orange-700" : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {(selectableMediaIds.length > 0 || selectedMediaIds.length > 0) && (
              <div className="relative z-10 flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                {selectableMediaIds.length > 0 && (
                  <label className="inline-flex h-10 min-w-32 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={() => toggleSelectAllMedia()}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400/50 ${
                        allSelectableSelected
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-stone-300 bg-white text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                    </span>
                    Select all
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeleteSelectedMedia()}
                  disabled={deleting || selectedMediaIds.length === 0}
                  className="inline-flex h-10 min-w-32 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold tabular-nums text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete ({selectedMediaIds.length})
                </button>
              </div>
            )}
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedModelId}
                  onChange={(event) => setSelectedModelId(event.target.value ? Number(event.target.value) : "")}
                  className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700 focus-visible:ring-2 focus-visible:ring-orange-500"
                  aria-label="Select model for inference"
                >
                  <option value="">Select trained model</option>
                  {registeredModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} v{model.version}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleRunInference()}
                  disabled={predicting || !selectedModelId || browserTab !== "original"}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {predicting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Try Model
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "Annotations",
                    active: showAnnotationLabels,
                    toggle: () => setShowAnnotationLabels((value) => !value),
                  },
                  {
                    label: "Predictions",
                    active: showPredictionLabels,
                    toggle: () => setShowPredictionLabels((value) => !value),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.toggle}
                    aria-pressed={item.active}
                    className={[
                      "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors",
                      item.active
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
                    ].join(" ")}
                  >
                    {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {predictionError ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {predictionError}
              </div>
            ) : null}

            {activeFrames.length === 0 ? (
              <div
                className={[
                  "rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 py-12",
                  "text-center",
                ].join(" ")}
              >
                <p className="text-sm font-medium text-stone-400">
                  {browserTab === "augmented"
                    ? 'No augmented images yet. Use "Generate Dataset" below to create some.'
                    : "No original images yet. Upload images to get started."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {visibleFrames.map((frame, localIndex) => {
                  const frameIndex = pageOffset + localIndex;
                  const isSelected = typeof frame.media_id === "number" && selectedMediaIds.includes(frame.media_id);
                  const annotateHref =
                    frame.image_url && typeof frame.media_id === "number"
                      ? `/datasets/${id}/annotate/${frame.media_id}?mode=simple`
                      : `/datasets/${id}/annotate/native?mode=simple&frame=${frame.frame}`;
                  const imageSrc = frame.image_url
                    ? resolveMediaUrl(frame.image_url)
                    : datasets.frameUrl(numericId, frame.frame, "thumb");
                  const framePredictions =
                    typeof frame.media_id === "number" ? (predictionsByMediaId[frame.media_id] ?? []) : [];
                  return (
                    <div
                      key={frame.frame}
                      className={`group/card relative overflow-hidden rounded-2xl border transition-all
                        duration-300 ease-out ${
                          isSelected
                            ? [
                                "border-orange-300/70 bg-gradient-to-br from-orange-50/90 to-amber-50/40",
                                "shadow-md shadow-orange-500/10 ring-1 ring-orange-400/25",
                              ].join(" ")
                            : [
                                "border-stone-200/90 bg-stone-50/80 hover:border-stone-300",
                                "hover:shadow-lg hover:shadow-stone-300/25",
                              ].join(" ")
                        }`}
                    >
                      {splitIsConfigured && frame.split && (() => {
                        const badge = SPLIT_BADGES[frame.split];
                        return (
                          <span
                            className={`absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold shadow-sm ring-1 ${badge.className}`}
                          >
                            <badge.Icon className="h-3 w-3" aria-hidden="true" />
                            {badge.label}
                          </span>
                        );
                      })()}
                      {typeof frame.media_id === "number" && (
                        <div
                          className={`absolute left-2.5 top-2.5 z-20 transition-all duration-300 ease-out ${
                            isSelected
                              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                              : [
                                  "pointer-events-none -translate-y-0.5 scale-90 opacity-0",
                                  "group-hover/card:pointer-events-auto group-hover/card:translate-y-0",
                                  "group-hover/card:scale-100 group-hover/card:opacity-100",
                                  "group-focus-within/card:pointer-events-auto",
                                  "group-focus-within/card:translate-y-0 group-focus-within/card:scale-100",
                                  "group-focus-within/card:opacity-100",
                                ].join(" ")
                          }`}
                        >
                          <label
                            className={[
                              "relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-md bg-white/90",
                              "shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md",
                              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400/45",
                            ].join(" ")}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              if (!e.shiftKey) return;
                              e.preventDefault();
                              const anchor = anchorFrameIndexRef.current;
                              if (anchor !== null) {
                                selectMediaRangeByFrameIndex(anchor, frameIndex);
                              } else {
                                selectMediaRangeByFrameIndex(frameIndex, frameIndex);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const event = e.nativeEvent as MouseEvent;
                                if (event.shiftKey) return;
                                anchorFrameIndexRef.current = frameIndex;
                                toggleMediaSelection(frame.media_id as number);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (e.shiftKey) e.preventDefault();
                              }}
                              className="peer sr-only"
                            />
                            <span
                              className={`pointer-events-none flex h-4 w-4 items-center justify-center
                                rounded-[5px] shadow-inner ring-1 transition-all duration-200 ${
                                  isSelected
                                    ? [
                                        "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
                                        "ring-orange-400/40 shadow-sm",
                                      ].join(" ")
                                    : "bg-stone-100/95 text-stone-500 ring-stone-200/85"
                                }`}
                            >
                              <Check
                                className={`h-2.5 w-2.5 stroke-[3] text-white transition-opacity duration-150 ${
                                  isSelected ? "opacity-100" : "opacity-0"
                                }`}
                                aria-hidden
                              />
                            </span>
                          </label>
                        </div>
                      )}
                      <Link
                        href={annotateHref}
                        className={[
                          "block outline-none ring-inset focus-visible:ring-2 focus-visible:ring-orange-400/50",
                          "rounded-2xl",
                        ].join(" ")}
                        title={`Open annotation for ${frame.name}`}
                      >
                        <div
                          className={[
                            "relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-stone-100",
                            "to-stone-200/80",
                          ].join(" ")}
                        >
                          <svg
                            className={[
                              "absolute inset-0 h-full w-full transition-transform duration-500 ease-out",
                              "group-hover/card:scale-[1.03]",
                            ].join(" ")}
                            viewBox={`0 0 ${Math.max(frame.width, 1)} ${Math.max(frame.height, 1)}`}
                            preserveAspectRatio="xMidYMid slice"
                            aria-label={frame.name}
                            role="img"
                          >
                            <image
                              href={imageSrc}
                              width={Math.max(frame.width, 1)}
                              height={Math.max(frame.height, 1)}
                              preserveAspectRatio="xMidYMid slice"
                            />
                            {(showAnnotationLabels || showPredictionLabels) && (
                              <g className="pointer-events-none">
                                {showAnnotationLabels &&
                                  frame.annotations.map((annotation) => {
                                    const points = annotation.points ?? [];
                                    const path = pointsToPath(points);
                                    if (!path) return null;
                                    return (
                                      <g key={`ann-${annotation.id}`}>
                                        <polygon
                                          points={path}
                                          fill="none"
                                          stroke={annotation.color || "#16a34a"}
                                          strokeWidth={Math.max(1.25, Math.max(frame.width, frame.height) * 0.0005)}
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <text
                                          x={points[0] ?? 0}
                                          y={Math.max(10, (points[1] ?? 0) - 3)}
                                          fill={annotation.color || "#16a34a"}
                                          fontSize={Math.max(frame.width, frame.height) * 0.028}
                                          fontWeight={700}
                                          paintOrder="stroke"
                                          stroke="white"
                                          strokeWidth={2}
                                        >
                                          {annotation.label}
                                        </text>
                                      </g>
                                    );
                                  })}
                                {showPredictionLabels &&
                                  framePredictions.map((prediction, predictionIndex) => {
                                    const points = predictionToPoints(
                                      prediction,
                                      Math.max(frame.width, 1),
                                      Math.max(frame.height, 1),
                                    );
                                    const path = pointsToPath(points);
                                    if (!path) return null;
                                    return (
                                      <g key={`pred-${prediction.media_id}-${predictionIndex}`}>
                                        <polygon
                                          points={path}
                                          fill="none"
                                          stroke={prediction.color || "#f97316"}
                                          strokeDasharray="6 5"
                                          strokeWidth={Math.max(1.25, Math.max(frame.width, frame.height) * 0.0025)}
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <text
                                          x={points[0] ?? 0}
                                          y={Math.max(10, (points[1] ?? 0) - 3)}
                                          fill={prediction.color || "#f97316"}
                                          fontSize={Math.max(frame.width, frame.height) * 0.028}
                                          fontWeight={700}
                                          paintOrder="stroke"
                                          stroke="white"
                                          strokeWidth={2}
                                        >
                                          {prediction.label} {Math.round(prediction.confidence * 100)}%
                                        </text>
                                      </g>
                                    );
                                  })}
                              </g>
                            )}
                          </svg>
                        </div>
                        <div className="bg-white/60 px-2.5 py-2 backdrop-blur-[2px]">
                          <p className="truncate text-xs font-semibold text-stone-800">{frame.name}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-stone-500">
                            {frame.annotations.length} labels
                            {framePredictions.length > 0 ? (
                              <span className="text-orange-600"> · {framePredictions.length} predictions</span>
                            ) : null}
                          </p>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <p className="text-sm font-medium text-stone-500">
                  Showing {pageOffset + 1}–{Math.min(pageOffset + BATCH_SIZE, activeFrames.length)} of{" "}
                  <span className="font-bold text-stone-700">{activeFrames.length}</span> images
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((page) => Math.max(1, page - 1));
                      setSelectedMediaIds([]);
                      anchorFrameIndexRef.current = null;
                    }}
                    disabled={safePage <= 1}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white",
                      "text-stone-500 transition hover:border-stone-300 hover:bg-stone-50",
                      "disabled:pointer-events-none disabled:opacity-40",
                    ].join(" ")}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {(() => {
                    const pages: (number | "ellipsis")[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (safePage > 3) pages.push("ellipsis");
                      for (
                        let page = Math.max(2, safePage - 1);
                        page <= Math.min(totalPages - 1, safePage + 1);
                        page += 1
                      ) {
                        pages.push(page);
                      }
                      if (safePage < totalPages - 2) pages.push("ellipsis");
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) =>
                      p === "ellipsis" ? (
                        <span key={`ell-${idx}`} className="px-1 text-xs text-stone-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setCurrentPage(p as number);
                            setSelectedMediaIds([]);
                            anchorFrameIndexRef.current = null;
                          }}
                          className={`flex h-8 min-w-[2rem] items-center justify-center rounded-xl border px-2
                            text-xs font-bold transition ${
                              safePage === p
                                ? [
                                    "border-orange-400/40 bg-gradient-to-br from-orange-500 to-amber-500 text-white",
                                    "shadow-md shadow-orange-500/20",
                                  ].join(" ")
                                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                            }`}
                        >
                          {p}
                        </button>
                      ),
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                      setSelectedMediaIds([]);
                      anchorFrameIndexRef.current = null;
                    }}
                    disabled={safePage >= totalPages}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white",
                      "text-stone-500 transition hover:border-stone-300 hover:bg-stone-50",
                      "disabled:pointer-events-none disabled:opacity-40",
                    ].join(" ")}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-end border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => void (labelsAreVerified ? handleUnverifyLabels() : handleVerifyLabels())}
                  disabled={verifyingLabels}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    labelsAreVerified
                      ? "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      : "bg-orange-500 text-white shadow-sm shadow-orange-200 hover:bg-orange-600"
                  }`}
                >
                  {verifyingLabels ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                  {labelsAreVerified ? "Unverify" : "Verify"}
                </button>
              </div>
            </div>}
          </motion.div>
        )}
      </div>
    </div>
  );
}
