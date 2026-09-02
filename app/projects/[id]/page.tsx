"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Loader2,
  X,
  Tag,
  Pencil,
  Trash2,
  Globe2,
  Download,
  UserPlus,
  BarChart2,
  Upload,
  Wand2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  FileArchive,
  FileText,
  FolderTree,
  CircleHelp,
  DatabaseZap,
  BookOpen,
  Film,
  Sparkles,
  Minimize2,
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { CardMenu, type CardMenuItem } from "@/components/CardMenu";
import DatasetExportDialog, { type DatasetExportTarget } from "@/components/datasets/DatasetExportDialog";
import { useConfirm } from "@/components/useConfirm";
import { useAuth } from "@/lib/auth";
import {
  ApiError,
  annotationClasses,
  dataverse,
  datasets,
  projects,
  teams,
  resolveMediaUrl,
  type AnnotationClass,
  type Dataset,
  type Invitation,
  type MemberRole,
  type Project,
  type TeamMember,
  type VideoExtractionConfig,
} from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  Ready: "bg-green-500",
  "In Progress": "bg-[#6735E0] animate-pulse",
  Importing: "bg-orange-500 animate-pulse",
  "Import failed": "bg-red-500",
  Draft: "bg-stone-300",
};

type DatasetImportHint = "images" | "yolo26" | "coco";

type BackgroundDatasetUpload = {
  dataset: Dataset;
  percent: number | null;
  status: "uploading" | "error";
  error?: string;
};

const DATASET_IMPORT_OPTIONS: Array<{ value: DatasetImportHint; label: string }> = [
  { value: "images", label: "Images" },
  { value: "yolo26", label: "YOLO26" },
  { value: "coco", label: "COCO" },
];

const DATASET_UPLOAD_RULES: Record<
  DatasetImportHint,
  {
    accept: string;
    emptyTitle: string;
    emptyDescription: string;
    multiple: boolean;
  }
> = {
  images: {
    accept: "image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v",
    emptyTitle: "Drag and drop your images or videos here",
    emptyDescription: "Images & videos - PNG, JPG, MP4, MOV...",
    multiple: true,
  },
  yolo26: {
    accept: ".zip,application/zip,application/x-zip-compressed",
    emptyTitle: "Drag and drop your YOLO26 ZIP here",
    emptyDescription: "Upload one .zip containing data.yaml plus train/valid/test folders",
    multiple: false,
  },
  coco: {
    accept: ".zip,application/zip,application/x-zip-compressed",
    emptyTitle: "Drag and drop your COCO ZIP here",
    emptyDescription: "Upload one .zip containing images and annotations JSON",
    multiple: false,
  },
};

const VIDEO_EXTENSIONS = [".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm"];
const IMAGE_EXTENSIONS = [".bmp", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"];

const DEFAULT_VIDEO_EXTRACTION: VideoExtractionConfig = {
  enabled: true,
  target: 200,
  min_frame_difference: 0.15,
};

function fileHasExtension(file: File, extensions: string[]): boolean {
  const lowerName = file.name.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

function isVideoUpload(file: File): boolean {
  return file.type.startsWith("video/") || fileHasExtension(file, VIDEO_EXTENSIONS);
}

function isImageUpload(file: File): boolean {
  return file.type.startsWith("image/") || fileHasExtension(file, IMAGE_EXTENSIONS);
}

const DATASET_IMPORT_HINTS: Record<
  DatasetImportHint,
  {
    title: string;
    description: string;
    testPath: string;
    structure: string;
    configLabel: string;
    configExample: string;
    checklist: string[];
  }
> = {
  images: {
    title: "Images & ZIP upload guide",
    description: "Upload image/video files or a .zip archive of raw images now and annotate them later in VisioX.",
    testPath: "images.zip or images/ folder",
    structure: `images.zip (or loose files)
\`-- images/
    |-- image_001.jpg
    |-- image_002.png
    \`-- video_001.mp4`,
    configLabel: "Supported files",
    configExample: `Images: PNG, JPG, JPEG, BMP, WEBP
Videos: MP4, MOV, WEBM
Archives: .ZIP (auto-extracted)`,
    checklist: [
      "Use this option when you want to upload raw images, videos, or a ZIP archive.",
      "VisioX automatically extracts all images found inside the ZIP file.",
      "You can annotate uploaded images in the VisioX annotation workspace.",
    ],
  },
  yolo26: {
    title: "YOLO ZIP import guide",
    description: "Upload a .zip archive containing images/ & labels/ folders, plus data.yaml or classes.txt.",
    testPath: "dataset.zip",
    structure: `dataset.zip (Un-split or Split)
  |-- images/
  |   |-- img_001.jpg
  |   \`-- img_002.jpg
  |-- labels/
  |   |-- img_001.txt
  |   \`-- img_002.txt
  |-- data.yaml (or classes.txt)

-- OR with split subfolders --
  |-- train/ (images/ & labels/)
  |-- valid/ (images/ & labels/)
  \`-- data.yaml`,
    configLabel: "data.yaml (or classes.txt)",
    configExample: `# Option A: data.yaml
nc: 2
names: ['cat', 'dog']

# Option B: classes.txt
cat
dog`,
    checklist: [
      "Un-split archives with images/ and labels/ folders are fully supported.",
      "Split archives with train/ and valid/ folders are also supported.",
      "Each image in images/ should have a matching .txt in labels/.",
      "Include data.yaml or classes.txt with your class names.",
    ],
  },
  coco: {
    title: "COCO ZIP import guide",
    description: "Upload one .zip archive that contains images and COCO JSON annotations.",
    testPath: "coco_dataset.zip",
    structure: `coco_dataset.zip
\`-- coco_dataset/
    |-- images/
    |   |-- train/
    |   |-- val/
    |   \`-- test/
    \`-- annotations/
        |-- instances_train.json
        |-- instances_val.json
        \`-- instances_test.json`,
    configLabel: "instances_train.json",
    configExample: `{
  "images": [],
  "annotations": [],
  "categories": []
}`,
    checklist: [
      "Choose COCO, then upload exactly one ZIP archive.",
      "Image ids in COCO JSON should match entries in the images array.",
      "Keep categories stable because they become project classes.",
    ],
  },
};

interface ExportDialogState {
  targets: DatasetExportTarget[];
  exportName: string;
}

function datasetStatus(d: Dataset): "Ready" | "In Progress" | "Importing" | "Import failed" | "Draft" {
  if (d.latest_import_job && ["queued", "running"].includes(d.latest_import_job.status)) return "Importing";
  if (d.latest_import_job?.status === "error") return "Import failed";
  if (d.media_count === 0) return "Draft";
  if (d.is_train_ready && d.generation_is_complete) return "Ready";
  return "In Progress";
}

function TrainingDatasetDialog({
  datasets: projectDatasets,
  selectedIds,
  onToggle,
  onClose,
  onContinue,
}: {
  datasets: Dataset[];
  selectedIds: number[];
  onToggle: (datasetId: number) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const selectedDatasets = projectDatasets.filter((dataset) => selectedIds.includes(dataset.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-dataset-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id="training-dataset-title" className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <BrainCircuit className="h-5 w-5 text-orange-500" /> Select training dataset
            </h2>
            <p className="mt-1 text-sm text-stone-500">Choose one or more datasets used for this training run.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dataset selection"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 space-y-3 overflow-y-auto p-6">
          {projectDatasets.map((dataset) => {
            const status = datasetStatus(dataset);
            const selected = selectedIds.includes(dataset.id);
            const imageCount = dataset.image_count ?? dataset.media_count ?? 0;
            return (
              <button
                key={dataset.id}
                type="button"
                disabled={!dataset.is_train_ready}
                aria-pressed={selected}
                onClick={() => onToggle(dataset.id)}
                className={[
                  "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
                  selected
                    ? "border-orange-400 bg-orange-50 ring-2 ring-orange-500/15"
                    : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40",
                  "disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-55",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    selected ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-500",
                  ].join(" ")}
                >
                  <DatabaseZap className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-stone-900">{dataset.name}</span>
                    <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
                      v{dataset.version}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {imageCount.toLocaleString()} images · {(dataset.annotated_count ?? 0).toLocaleString()} annotated
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold text-stone-500">{status}</span>
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      selected
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-stone-300 bg-white text-transparent",
                    ].join(" ")}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </span>
              </button>
            );
          })}
          {projectDatasets.some((dataset) => !dataset.is_train_ready) ? (
            <p className="text-xs leading-relaxed text-stone-500">
              Disabled datasets must be fully labeled, verified, and generated before training.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={selectedDatasets.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BrainCircuit className="h-4 w-4" /> Continue with {selectedDatasets.length || 0}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ROLE_OPTIONS: { value: MemberRole; label: string; hint: string }[] = [
  { value: "viewer", label: "Viewer", hint: "Can view only" },
  { value: "member", label: "Member", hint: "Can edit & annotate" },
  { value: "admin", label: "Admin", hint: "Can manage & invite" },
];

function RoleSelect({ value, onChange }: { value: MemberRole; onChange: (v: MemberRole) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold",
          "text-stone-700 transition hover:bg-stone-200",
        ].join(" ")}
      >
        {selected.label}
        <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={[
              "absolute left-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-stone-200",
              "bg-white p-1 shadow-xl shadow-stone-300/40",
            ].join(" ")}
          >
            {ROLE_OPTIONS.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left
                      transition ${active ? "bg-orange-50" : "hover:bg-stone-50"}`}
                  >
                    <Check className={`h-3.5 w-3.5 shrink-0 ${active ? "text-orange-500" : "text-transparent"}`} />
                    <span className="min-w-0">
                      <span className={`block text-xs font-bold ${active ? "text-orange-700" : "text-stone-800"}`}>
                        {o.label}
                      </span>
                      <span className="block text-[10px] text-stone-400">{o.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Color picker utilities ──────────────────────────────────────────────────

type RgbColor = { r: number; g: number; b: number };
type HsvColor = { h: number; s: number; v: number };

const LABEL_COLOR_SWATCHES = [
  "#22c55e",
  "#38bdf8",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#14b8a6",
  "#64748b",
] as const;

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(Number.isFinite(value) ? value : 0)));
}

function normalizeHexColor(value: string, fallback = "#E66700") {
  const raw = value.trim().replace("#", "");
  if (/^[0-9A-Fa-f]{3}$/.test(raw))
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback;
}

function hexToRgb(hex: string): RgbColor {
  const n = normalizeHexColor(hex).slice(1);
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((v) => clampColorChannel(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue),
    min = Math.min(red, green, blue),
    delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  return { h: h < 0 ? h + 360 : h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  let red = 0,
    green = 0,
    blue = 0;
  if (h < 60) [red, green, blue] = [c, x, 0];
  else if (h < 120) [red, green, blue] = [x, c, 0];
  else if (h < 180) [red, green, blue] = [0, c, x];
  else if (h < 240) [red, green, blue] = [0, x, c];
  else if (h < 300) [red, green, blue] = [x, 0, c];
  else [red, green, blue] = [c, 0, x];
  return {
    r: clampColorChannel((red + m) * 255),
    g: clampColorChannel((green + m) * 255),
    b: clampColorChannel((blue + m) * 255),
  };
}

interface LabelColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  usedColors?: Set<string>;
}

function LabelColorPicker({ value, onChange, usedColors }: LabelColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(normalizeHexColor(value));
  const initialColorRef = useRef(normalizeHexColor(value));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const colorAreaRef = useRef<HTMLDivElement | null>(null);
  const hsv = rgbToHsv(hexToRgb(draftColor));
  const rgb = hexToRgb(draftColor);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onChange(initialColorRef.current);
        setDraftColor(initialColorRef.current);
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onChange, open]);

  const commitColor = useCallback(
    (color: string) => {
      const normalized = normalizeHexColor(color, draftColor);
      setDraftColor(normalized);
      onChange(normalized);
    },
    [draftColor, onChange],
  );

  const updateFromColorArea = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = colorAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
      commitColor(rgbToHex(hsvToRgb({ h: hsv.h, s, v })));
    },
    [commitColor, hsv.h],
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          initialColorRef.current = normalizeHexColor(value);
          setDraftColor(normalizeHexColor(value));
          setOpen((current) => !current);
        }}
        className={[
          "h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1",
          "shadow-sm shadow-stone-200/40 transition hover:border-orange-300 focus:outline-none",
          "focus:ring-2 focus:ring-orange-400/20",
        ].join(" ")}
        title="Pick color"
        aria-label="Pick color"
      >
        <span className="block h-full w-full rounded-md" style={{ backgroundColor: normalizeHexColor(value) }} />
      </button>

      {open && (
        <div
          className={[
            "absolute left-0 top-11 z-50 w-[244px] rounded-2xl border border-stone-200 bg-white p-3",
            "shadow-2xl shadow-stone-300/50",
          ].join(" ")}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-stone-600">Select color</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={["rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100", "hover:text-stone-900"].join(
                " ",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={colorAreaRef}
            role="slider"
            aria-label="Color saturation and brightness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.s * 100)}
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              updateFromColorArea(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) updateFromColorArea(e);
            }}
            className={[
              "relative h-32 w-full touch-none cursor-crosshair overflow-hidden border",
              "border-stone-200",
            ].join(" ")}
            style={{
              background: [
                "linear-gradient(to top, #000, transparent)",
                `linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
              ].join(", "),
            }}
          >
            <span
              className={[
                "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white",
                "shadow-md shadow-black/40",
              ].join(" ")}
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-stone-200"
              style={{ backgroundColor: draftColor }}
            />
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(hsv.h)}
              onChange={(e) => commitColor(rgbToHex(hsvToRgb({ ...hsv, h: Number(e.target.value) })))}
              className="h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
              style={{
                background: [
                  "linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e",
                  "#06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                ].join(", "),
              }}
              aria-label="Hue"
            />
          </div>

          <div className="mt-3 grid grid-cols-[1.9fr_1fr_1fr_1fr] gap-2">
            <label className="col-span-1 min-w-0">
              <span className="sr-only">Hex</span>
              <input
                type="text"
                value={draftColor.replace("#", "")}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraftColor(`#${next}`);
                  if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(next)) onChange(normalizeHexColor(next, draftColor));
                }}
                onBlur={() => commitColor(draftColor)}
                className={[
                  "h-8 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-center text-xs",
                  "text-stone-800 outline-none focus:border-orange-400 focus:ring-2",
                  "focus:ring-orange-400/20",
                ].join(" ")}
              />
            </label>
            {(["r", "g", "b"] as const).map((channel) => (
              <label key={channel} className="min-w-0">
                <span className="sr-only">{channel.toUpperCase()}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[channel]}
                  onChange={(event) =>
                    commitColor(
                      rgbToHex({
                        ...rgb,
                        [channel]: clampColorChannel(Number(event.target.value)),
                      }),
                    )
                  }
                  className={[
                    "no-number-spinner h-8 w-full rounded-lg border border-stone-200 bg-stone-50 px-1",
                    "text-center text-xs text-stone-800 outline-none focus:border-orange-400 focus:ring-2",
                    "focus:ring-orange-400/20",
                  ].join(" ")}
                />
              </label>
            ))}
          </div>

          <div
            className={[
              "mt-1 grid grid-cols-[1.9fr_1fr_1fr_1fr] gap-2 text-center text-[10px] font-bold",
              "text-stone-500",
            ].join(" ")}
          >
            <span>Hex</span>
            <span>R</span>
            <span>G</span>
            <span>B</span>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-2">
            {LABEL_COLOR_SWATCHES.map((swatch) => {
              const isUsed = usedColors?.has(swatch.toUpperCase()) ?? false;
              return (
                <button
                  key={swatch}
                  type="button"
                  disabled={isUsed}
                  onClick={() => commitColor(swatch)}
                  className={`h-5 w-5 rounded-md border border-stone-200 transition focus:outline-none
                    focus:ring-2 focus:ring-orange-400/30 ${
                      isUsed ? "cursor-not-allowed opacity-30" : "hover:scale-110"
                    }`}
                  style={{ backgroundColor: swatch }}
                  aria-label={isUsed ? `${swatch} already used` : `Use ${swatch}`}
                  title={isUsed ? "Already used by another class" : undefined}
                />
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => commitColor("#E66700")}
              className={[
                "rounded-lg border border-stone-200 px-2 py-2 text-xs font-bold text-stone-600 transition",
                "hover:bg-stone-50",
              ].join(" ")}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                commitColor(initialColorRef.current);
                setOpen(false);
              }}
              className={[
                "rounded-lg border border-stone-200 px-2 py-2 text-xs font-bold text-stone-600 transition",
                "hover:bg-stone-50",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={[
                "rounded-lg bg-orange-500 px-2 py-2 text-xs font-bold text-white shadow-lg",
                "shadow-orange-500/20 transition hover:bg-orange-600",
              ].join(" ")}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CreateDatasetModal({
  project,
  importHint,
  onClose,
  onDatasetInitialized,
  onDatasetDiscarded,
  onUploadStateChange,
  onCreated,
}: {
  project: Project;
  importHint: DatasetImportHint;
  onClose: () => void;
  onDatasetInitialized: (dataset: Dataset) => void;
  onDatasetDiscarded: (datasetId: number) => void;
  onUploadStateChange: (datasetId: number, state: BackgroundDatasetUpload | null) => void;
  onCreated: (d: Dataset) => void;
}) {
  const [selectedHintKey, setSelectedHintKey] = useState<DatasetImportHint>(importHint);
  const selectedImportHint = DATASET_IMPORT_HINTS[selectedHintKey];
  const selectedImportOption = DATASET_IMPORT_OPTIONS.find((option) => option.value === selectedHintKey)!;
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [videoExtraction, setVideoExtraction] = useState<VideoExtractionConfig>(DEFAULT_VIDEO_EXTRACTION);

  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const uploadPercentRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const selectedUploadRule = DATASET_UPLOAD_RULES[selectedHintKey];
  const archiveImport = selectedHintKey !== "images";
  const archiveFormat = selectedHintKey === "images" ? null : selectedHintKey;
  const videoFiles = files.filter(isVideoUpload);
  const imageFiles = files.filter(isImageUpload);
  const configureVideoExtraction = !archiveImport && videoFiles.length > 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!formatMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) {
        setFormatMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFormatMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [formatMenuOpen]);

  function isZipFile(file: File) {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
  }

  function isMediaFile(file: File) {
    return isImageUpload(file) || isVideoUpload(file);
  }

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);

    if (archiveImport) {
      const archive = arr.find(isZipFile);
      if (!archive) {
        setError(`Please upload one ${selectedImportOption.label} .zip archive.`);
        return;
      }
      setError("");
      setFiles([archive]);
      return;
    }

    const mediaFiles = arr.filter(isMediaFile);
    if (mediaFiles.length === 0) {
      setError("Please upload image or video files.");
      return;
    }
    setError("");

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));

      return [...prev, ...mediaFiles.filter((f) => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setError("");
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    if (archiveImport && files.length !== 1) {
      setError(`Please upload one ${selectedImportOption.label} .zip archive before creating the dataset.`);
      return;
    }
    if (archiveImport && files[0] && !isZipFile(files[0])) {
      setError(`The selected ${selectedImportOption.label} file must be a .zip archive.`);
      return;
    }
    if (configureVideoExtraction && imageFiles.length > 0) {
      setError("Upload videos separately from image files to extract diverse frames.");
      return;
    }

    setSaving(true);
    let created: Dataset | null = null;

    try {
      created = await datasets.create({
        project: project.id,
        name,
        description,
      });
      onDatasetInitialized(created);

      if (files.length > 0) {
        const uploadingDataset = created;
        setUploadProgress({ current: 0, total: files.length });
        setUploadPercent(null);
        uploadPercentRef.current = 0;
        onUploadStateChange(uploadingDataset.id, {
          dataset: uploadingDataset,
          percent: 0,
          status: "uploading",
        });
        // The browser upload keeps running after this modal unmounts. Progress
        // and failures are owned by the project-level background upload card.
        onClose();
        const importResponse = await datasets.startImport(created.id, files, archiveFormat ?? "images", {
          videoExtraction:
            configureVideoExtraction
              ? videoExtraction
              : undefined,
          onUploadProgress: (uploadedBytes, totalBytes) => {
            if (totalBytes <= 0) return;
            const percent = Math.round(uploadedBytes * 100 / totalBytes);
            uploadPercentRef.current = percent;
            onUploadStateChange(uploadingDataset.id, {
              dataset: uploadingDataset,
              percent,
              status: "uploading",
            });
          },
        });
        created = importResponse.dataset;
        onUploadStateChange(uploadingDataset.id, null);
        setUploadProgress({ current: files.length, total: files.length });
      }

      onCreated(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create dataset";
      setError(message);
      const failedDataset = created;
      if (created && err instanceof ApiError && [400, 409].includes(err.status)) {
        const failedDatasetId = created.id;
        try {
          await datasets.delete(failedDatasetId);
          onDatasetDiscarded(failedDatasetId);
          created = null;
        } catch {
          // Keep the empty dataset visible if cleanup fails so the user can remove it manually.
        }
      }
      if (failedDataset) {
        onUploadStateChange(failedDataset.id, {
          dataset: failedDataset,
          percent: uploadPercentRef.current,
          status: "error",
          error: message,
        });
      }

      setSaving(false);

      setUploadProgress({
        current: 0,
        total: 0,
      });
      setUploadPercent(null);
      uploadPercentRef.current = null;
    }
  };

  function submitLabel() {
    if (!saving) return "Create Dataset";

    if (uploadProgress.total > 0) {
      return uploadPercent == null ? "Uploading file..." : `Uploading ${uploadPercent}%`;
    }

    return "Creating...";
  }

  return createPortal(
    <div
      className={["fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/35 p-3 sm:p-5", "backdrop-blur-sm"].join(" ")}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={[
          "flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl",
          "border border-stone-200 bg-white shadow-2xl",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <DatabaseZap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-stone-950">New Dataset</h2>
              <p className="mt-1 truncate text-sm text-stone-500">
                Creating in project <span className="font-bold text-orange-600">{project.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close new dataset modal"
            title={saving ? "Continue this upload in the background" : undefined}
            className="rounded-xl p-2.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 sm:mx-8">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 p-5 sm:p-8">
          <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-100">
                <FolderTree className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">Dataset import format</h3>
                      <div className="group relative z-30">
                        <button
                          type="button"
                          aria-label={`Show ${selectedImportHint.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-600 transition-colors hover:bg-orange-100 focus-visible:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
                        >
                          <CircleHelp className="h-4 w-4" />
                        </button>
                        <div
                          role="tooltip"
                          className={[
                            "pointer-events-none invisible absolute left-0 top-full mt-2 w-[min(36rem,calc(100vw-4rem))]",
                            "translate-y-1 rounded-2xl border border-orange-200 bg-white p-5 opacity-0 shadow-xl",
                            "transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                            "group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <p className="text-base font-bold text-stone-900">{selectedImportHint.title}</p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-stone-600">{selectedImportHint.description}</p>
                          <p className="mt-2 text-sm text-stone-600">
                            Test path:{" "}
                            <code className="break-all rounded-md bg-stone-100 px-2 py-1 font-semibold text-stone-700">
                              {selectedImportHint.testPath}
                            </code>
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4 text-stone-800">
                              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                                <FileArchive className="h-4 w-4" /> Expected structure
                              </div>
                              <pre className="overflow-x-auto whitespace-pre font-mono text-[11px] leading-6">
{selectedImportHint.structure}
                              </pre>
                            </div>
                            <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                                <FileText className="h-4 w-4" /> {selectedImportHint.configLabel}
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-stone-700">
{selectedImportHint.configExample}
                              </pre>
                            </div>
                          </div>

                          <ul className="mt-5 space-y-3 text-sm leading-5 text-stone-700">
                            {selectedImportHint.checklist.map((item) => (
                              <li key={item} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                  <Check className="h-3.5 w-3.5 text-orange-600" />
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-stone-600">
                      Choose the annotation format to import.
                    </p>
                  </div>
                  <div ref={formatMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={formatMenuOpen}
                      onClick={() => setFormatMenuOpen((open) => !open)}
                      className={[
                        "flex h-10 min-w-40 items-center justify-between gap-4 rounded-xl border bg-white px-3.5",
                        "text-sm font-bold text-stone-900 outline-none transition",
                        formatMenuOpen
                          ? "border-orange-500 ring-2 ring-orange-500/15"
                          : "border-orange-200 hover:border-orange-400 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20",
                      ].join(" ")}
                    >
                      <span>{selectedImportOption.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-orange-500 transition-transform ${formatMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {formatMenuOpen && (
                      <div
                        role="listbox"
                        aria-label="Dataset import format"
                        className="absolute right-0 top-full z-40 mt-2 min-w-40 overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"
                      >
                        {DATASET_IMPORT_OPTIONS.map((option) => {
                          const selected = option.value === selectedHintKey;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                if (option.value !== selectedHintKey) {
                                  setFiles([]);
                                  setError("");
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }
                                setSelectedHintKey(option.value);
                                setFormatMenuOpen(false);
                              }}
                              className={[
                                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                                selected
                                  ? "bg-orange-50 font-bold text-orange-700"
                                  : "font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-950",
                              ].join(" ")}
                            >
                              <span>{option.label}</span>
                              {selected && <Check className="h-4 w-4 text-orange-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Dataset Name */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="dataset-name" className="text-sm font-semibold text-stone-800">Dataset name</label>
              <span className="text-xs tabular-nums text-stone-400">{name.length}/100</span>
            </div>

            <input
              id="dataset-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Workshop-Safety-Part-A"
              className={[
                "h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none",
                "focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
              ].join(" ")}
            />
          </div>

          {/* Description */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="dataset-description" className="text-sm font-semibold text-stone-800">
                Description <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <span className="text-xs tabular-nums text-stone-400">{description.length}/500</span>
            </div>

            <textarea
              id="dataset-description"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className={[
                "w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm",
                "outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
              ].join(" ")}
            />
          </div>

          {/* Upload Section */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-800">
              {archiveImport ? "Upload archive" : "Upload data"}{" "}
              {!archiveImport && <span className="font-normal text-stone-400">(optional)</span>}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple={selectedUploadRule.multiple}
              accept={selectedUploadRule.accept}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                }

                e.target.value = "";
              }}
            />

            <div
              onClick={() => !saving && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();

                if (!saving) {
                  setDragOver(true);
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();

                setDragOver(false);

                if (!saving) {
                  addFiles(e.dataTransfer.files);
                }
              }}
              className={`min-h-52 rounded-2xl border border-dashed px-4 py-6 transition-all ${
                saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${
                dragOver
                  ? "border-orange-500 bg-orange-50"
                  : "border-orange-300 bg-orange-50/20 hover:border-orange-500 hover:bg-orange-50/50"
              }`}
            >
              {/* Empty State */}
              {files.length === 0 && (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <div
                    className={[
                      "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl",
                      "bg-orange-50",
                    ].join(" ")}
                  >
                    <Upload className="h-7 w-7 text-orange-500" />
                  </div>

                  <p className="text-sm font-semibold text-stone-700">
                    {selectedUploadRule.emptyTitle}
                  </p>
                  <p className="my-2 text-xs text-stone-400">or</p>
                  <span className="rounded-xl border border-orange-500 bg-white px-5 py-2.5 text-sm font-bold text-orange-600">
                    Browse files
                  </span>
                  <p className="mt-4 text-xs text-stone-400">{selectedUploadRule.emptyDescription}</p>
                </div>
              )}

              {/* File List Inside Upload Box */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-700">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </p>

                    <span className="text-xs text-orange-500">
                      {archiveImport ? "Click or drop replacement" : "Click or drop more"}
                    </span>
                  </div>

                  <div className="max-h-62 space-y-2 overflow-y-auto pr-1">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className={[
                          "flex items-center gap-3 rounded-sm border border-stone-100 bg-white px-3",
                          "py-2 shadow-sm",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            "bg-stone-100",
                          ].join(" ")}
                        >
                          {archiveImport ? (
                            <FileArchive className="h-4 w-4 text-orange-500" />
                          ) : (
                            isVideoUpload(f)
                              ? <Film className="h-4 w-4 text-orange-500" />
                              : <ImageIcon className="h-4 w-4 text-orange-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-700">{f.name}</p>

                          <p className="text-xs text-stone-400">{formatSize(f.size)}</p>
                        </div>

                        {!saving && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className={[
                              "shrink-0 rounded-lg p-1 text-stone-400 transition-colors hover:bg-red-50",
                              "hover:text-red-500",
                            ].join(" ")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}

                        {saving && uploadProgress.total > 0 && idx < uploadProgress.current && (
                          <span className="shrink-0 text-xs font-bold text-emerald-500">Done</span>
                        )}

                        {saving && uploadProgress.total > 0 && idx === uploadProgress.current && (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
                        )}
                      </div>
                    ))}
                  </div>
                  {saving && uploadPercent != null ? (
                    <div className="mt-3" role="status" aria-live="polite">
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-stone-500">
                        <span>Uploading directly to storage</span>
                        <span className="tabular-nums text-orange-600">{uploadPercent}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="Dataset upload progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={uploadPercent}
                        className="h-1.5 overflow-hidden rounded-full bg-orange-100"
                      >
                        <div
                          className="h-full rounded-full bg-orange-500 transition-[width] duration-200"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {configureVideoExtraction ? (
              <section className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-100">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Diverse video frame extraction</h3>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        Compare color, layout and edge details across the full timeline, then keep visually
                        different frames. No object detection is used.
                      </p>
                    </div>
                  </div>
                  <div className="grid w-full shrink-0 gap-3 sm:w-auto sm:grid-cols-2">
                    <label className="w-full sm:w-44">
                      <span className="mb-1.5 block text-xs font-bold text-stone-700">Images per video</span>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        value={videoExtraction.target}
                        disabled={saving}
                        onChange={(event) => setVideoExtraction((current) => ({
                          ...current,
                          target: Math.max(1, Math.min(2000, Number(event.target.value) || 1)),
                        }))}
                        className="h-10 w-full rounded-xl border border-orange-200 bg-white px-3 text-sm font-semibold tabular-nums text-stone-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60"
                      />
                    </label>
                    <label className="w-full sm:w-44">
                      <span className="mb-1.5 block text-xs font-bold text-stone-700">Minimum difference</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(videoExtraction.min_frame_difference * 100)}
                          disabled={saving}
                          onChange={(event) => setVideoExtraction((current) => ({
                            ...current,
                            min_frame_difference: Math.max(
                              0,
                              Math.min(100, Number(event.target.value) || 0),
                            ) / 100,
                          }))}
                          aria-describedby="video-difference-help"
                          className="h-10 w-full rounded-xl border border-orange-200 bg-white px-3 pr-8 text-sm font-semibold tabular-nums text-stone-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">%</span>
                      </div>
                    </label>
                  </div>
                </div>

                {imageFiles.length > 0 ? (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Frame extraction accepts videos only. Remove the {imageFiles.length} selected image file{imageFiles.length > 1 ? "s" : ""}.
                  </p>
                ) : null}

                <p className="mt-4 border-t border-orange-100 pt-3 text-xs text-stone-500">
                  <span id="video-difference-help">
                    Frames less than {Math.round(videoExtraction.min_frame_difference * 100)}% different are removed.
                  </span>{" "}
                  Output: up to <strong className="tabular-nums text-stone-800">{(
                    videoFiles.length * videoExtraction.target
                  ).toLocaleString()}</strong> diverse images across {videoFiles.length} video
                  {videoFiles.length > 1 ? "s" : ""}. Processing continues in the dataset worker after upload.
                </p>
              </section>
            ) : null}
          </div>

              </div>

          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-3 border-stone-200 bg-white px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6",
                "text-sm font-semibold text-stone-700 shadow-xs transition-all hover:bg-stone-50 hover:text-stone-900 active:scale-[0.98]",
              ].join(" ")}
            >
              {saving ? <Minimize2 className="h-4 w-4" /> : null}
              {saving ? "Run in background" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={saving || !name || (archiveImport && files.length !== 1)}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm",
                "font-bold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98]",
                "disabled:opacity-50",
              ].join(" ")}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}

              {submitLabel()}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}

const DEFAULT_CLASS_COLOR = "#E66700";

function broadcastClassChange(projectId: number) {
  try {
    const ch = new BroadcastChannel("visiox-project-classes");
    ch.postMessage({ type: "classes-updated", projectId });
    ch.close();
  } catch {
    // BroadcastChannel not supported in this environment
  }
}

function ClassEditorInline({
  projectId,
  editing,
  classList,
  onClose,
  onSaved,
}: {
  projectId: number;
  editing: AnnotationClass | null;
  classList: AnnotationClass[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CLASS_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setColor(editing.color || DEFAULT_CLASS_COLOR);
    } else {
      setName("");
      const usedColors = new Set(classList.map((c) => c.color?.toUpperCase()));
      const next = LABEL_COLOR_SWATCHES.find((s) => !usedColors.has(s.toUpperCase()));
      setColor(next ?? LABEL_COLOR_SWATCHES[classList.length % LABEL_COLOR_SWATCHES.length]);
    }
    setError("");
  }, [editing, classList]);

  const peers = classList.filter((c) => c.id !== editing?.id);
  const usedColors = new Set(peers.map((c) => c.color?.toUpperCase()).filter((c): c is string => !!c));

  const dupeName = name.trim() !== "" && peers.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  const dupeColor = peers.some((c) => c.color?.toUpperCase() === color.toUpperCase());
  const dupeError = dupeName
    ? `A class named "${name.trim()}" already exists.`
    : dupeColor
      ? `The color ${color} is already used by another class.`
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dupeError) return;
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await annotationClasses.update(editing.id, { name: name.trim(), color });
      } else {
        await annotationClasses.create({ project: projectId, name: name.trim(), color });
      }
      broadcastClassChange(projectId);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const validationError = dupeError || error;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <LabelColorPicker value={color} onChange={setColor} usedColors={usedColors} />
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Class name…"
          className={[
            "w-64 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold",
            "text-stone-800 outline-none focus:border-orange-400 focus:ring-2",
            "focus:ring-orange-400/20",
          ].join(" ")}
        />
        <button
          type="submit"
          disabled={saving || !name.trim() || !!dupeError}
          className={[
            "shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm",
            "shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50 flex",
            "items-center gap-1",
          ].join(" ")}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : editing ? "Save" : "Add"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={[
            "shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold",
            "text-stone-600 transition hover:bg-stone-100",
          ].join(" ")}
        >
          Cancel
        </button>
      </div>
      {validationError && <p className="text-xs text-red-500">{validationError}</p>}
    </form>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [splitDrafts, setSplitDrafts] = useState<Record<number, { train: number; test: number }>>({});
  const [splittingDatasetId, setSplittingDatasetId] = useState<number | null>(null);
  const [exportDialog, setExportDialog] = useState<ExportDialogState | null>(null);
  const [trainingDatasetDialogOpen, setTrainingDatasetDialogOpen] = useState(false);
  const [selectedTrainingDatasetIds, setSelectedTrainingDatasetIds] = useState<number[]>([]);
  const [classList, setClassList] = useState<AnnotationClass[]>([]);
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);
  const [classOrderSaving, setClassOrderSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [backgroundUploads, setBackgroundUploads] = useState<Record<number, BackgroundDatasetUpload>>({});
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AnnotationClass | null>(null);
  const [sharing, setSharing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [datasetImportHint, setDatasetImportHint] = useState<DatasetImportHint>("images");
  const datasetPromptHandledRef = useRef(false);

  const projectIdNum = id ? parseInt(id as string, 10) : NaN;

  const hasBrowserUpload = Object.values(backgroundUploads).some((upload) => upload.status === "uploading");

  useEffect(() => {
    if (!hasBrowserUpload) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasBrowserUpload]);

  const loadClasses = useCallback(async () => {
    if (Number.isNaN(projectIdNum)) return;
    try {
      const res = await annotationClasses.list(projectIdNum);
      setClassList(res.results ?? []);
    } catch {
      setClassList([]);
    }
  }, [projectIdNum]);

  const handleDeleteClass = useCallback(async (annotationClass: AnnotationClass) => {
    if (annotationClass.annotation_count > 0 || deletingClassId !== null) return;
    const ok = await confirm({
      title: "Delete class",
      message: `Delete class "${annotationClass.name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    setDeletingClassId(annotationClass.id);
    setClassList((current) => current
      .filter((item) => item.id !== annotationClass.id)
      .map((item, index) => ({ ...item, index })));
    try {
      await annotationClasses.delete(annotationClass.id);
      broadcastClassChange(projectIdNum);
    } catch (err) {
      await loadClasses();
      await confirm({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Could not delete class",
        confirmLabel: "OK",
        hideCancel: true,
      });
    } finally {
      setDeletingClassId(null);
    }
  }, [confirm, deletingClassId, loadClasses, projectIdNum]);

  const handleMoveClass = useCallback(async (classId: number, direction: -1 | 1) => {
    if (classOrderSaving || deletingClassId !== null) return;
    const currentIndex = classList.findIndex((item) => item.id === classId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= classList.length) return;

    const previous = classList;
    const reordered = [...classList];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    const optimistic = reordered.map((item, index) => ({ ...item, index }));
    setClassList(optimistic);
    setClassOrderSaving(true);
    try {
      const saved = await annotationClasses.reorder(projectIdNum, optimistic.map((item) => item.id));
      setClassList(saved);
      broadcastClassChange(projectIdNum);
    } catch (err) {
      setClassList(previous);
      await confirm({
        title: "Could not change class order",
        message: err instanceof Error ? err.message : "Please reload and try again.",
        confirmLabel: "OK",
        hideCancel: true,
      });
    } finally {
      setClassOrderSaving(false);
    }
  }, [classList, classOrderSaving, confirm, deletingClassId, projectIdNum]);

  const loadMembers = useCallback(async (teamId: number | null) => {
    if (teamId == null) {
      setMembers([]);
      return;
    }
    try {
      const res = await teams.members(teamId);
      setMembers(res);
    } catch {
      setMembers([]);
    }
  }, []);

  const loadInvitations = useCallback(async (teamId: number | null) => {
    if (teamId == null) {
      setInvitations([]);
      return;
    }
    try {
      const res = await teams.listInvitations(teamId);
      setInvitations(res);
    } catch {
      setInvitations([]);
    }
  }, []);

  const refreshDatasetCounts = useCallback(async (projectId: number) => {
    try {
      const res = await datasets.list(projectId);
      setDatasetList(res.results);
    } catch {
      /* silent */
    }
  }, []);

  const hasActiveDatasetImport = datasetList.some((dataset) =>
    dataset.latest_import_job && ["queued", "running"].includes(dataset.latest_import_job.status),
  );

  useEffect(() => {
    if (!hasActiveDatasetImport || Number.isNaN(projectIdNum)) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshDatasetCounts(projectIdNum);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [hasActiveDatasetImport, projectIdNum, refreshDatasetCounts]);

  useEffect(() => {
    if (datasetPromptHandledRef.current) return;
    if (!projectIdNum || Number.isNaN(projectIdNum)) return;
    if (searchParams.get("newDataset") !== "1") return;

    const hint = searchParams.get("importHint");
    setDatasetImportHint(hint === "coco" || hint === "yolo26" ? hint : "images");
    datasetPromptHandledRef.current = true;
    setShowModal(true);
    router.replace(`/projects/${projectIdNum}`);
  }, [projectIdNum, router, searchParams]);

  useEffect(() => {
    if (!id) return;
    const projectId = parseInt(id as string, 10);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("visiox-annotations");
      channel.onmessage = (e: MessageEvent<{ type: string }>) => {
        if (e.data?.type === "annotations-saved") void refreshDatasetCounts(projectId);
      };
    } catch {
      /* ignore */
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshDatasetCounts(projectId);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id, refreshDatasetCounts]);

  // Refresh the class list when classes are created/deleted elsewhere (e.g. the annotate editor).
  useEffect(() => {
    if (!id) return;
    const projectId = parseInt(id as string, 10);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("visiox-project-classes");
      channel.onmessage = (e: MessageEvent<{ type: string; projectId: number }>) => {
        if (e.data?.type === "classes-updated" && e.data?.projectId === projectId) {
          void loadClasses();
        }
      };
    } catch {
      /* ignore */
    }
    return () => {
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [id, loadClasses]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setPageError("");
      try {
        const projectId = parseInt(id as string, 10);
        const found = await projects.get(projectId);
        setProject(found);
        await Promise.all([
          refreshDatasetCounts(projectId),
          loadClasses(),
          loadMembers(found.team),
          loadInvitations(found.team),
        ]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setProject(null);
          setDatasetList([]);
          setClassList([]);
          setMembers([]);
          setInvitations([]);
          return;
        }
        setPageError(err instanceof Error ? err.message : "Could not load this project.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, loadClasses, loadInvitations, loadMembers, refreshDatasetCounts]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || project.team == null || !inviteEmail.trim()) return;
    const teamId = project.team;
    setInviteSaving(true);
    setInviteError("");
    try {
      await teams.sendInvitation(teamId, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("member");
      setInviteOpen(false);
      await loadInvitations(teamId);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setInviteSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  if (!project)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="mb-4 text-stone-500">{pageError || "Project not found"}</p>
        <button onClick={() => router.push("/projects")} className="text-orange-500 font-bold">
          Back to Projects
        </button>
      </div>
    );

  async function handleShareToDataverse() {
    if (!project) return;
    setSharing(true);
    try {
      await dataverse.shareProject({
        project: project.id,
        title: project.name,
        summary: project.description || "",
        tags: [project.task_type.replace(/_/g, "-")],
        license: "Community",
        is_public: true,
      });
      await confirm({
        title: "Shared to Dataverse",
        message: "Project shared to Dataverse.",
        confirmLabel: "OK",
        hideCancel: true,
      });
    } catch (err: unknown) {
      await confirm({
        title: "Share failed",
        message: err instanceof Error ? err.message : "Could not share project.",
        confirmLabel: "OK",
        hideCancel: true,
      });
    } finally {
      setSharing(false);
    }
  }

  async function handleDeleteDataset(datasetId: number) {
    if (
      !(await confirm({
        title: "Delete dataset",
        message: "Delete this dataset? This cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    try {
      await datasets.delete(datasetId);
      setDatasetList((prev) => prev.filter((d) => d.id !== datasetId));
    } catch (err) {
      await confirm({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Delete failed",
        confirmLabel: "OK",
        hideCancel: true,
      });
    }
  }

  async function handleDatasetSplit(dataset: Dataset) {
    const current = splitDrafts[dataset.id] ?? {
      train: dataset.split_config?.train ?? 70,
      test: dataset.split_config?.test ?? 10,
    };
    const train = current.test === 0 ? 80 : Math.max(70, Math.min(80, current.train));
    const test = current.test === 0 ? 0 : 10;
    const val = 100 - train - test;
    setSplittingDatasetId(dataset.id);
    try {
      const result = await datasets.configureSplit(dataset.id, {
        train,
        val,
        test,
        seed: dataset.split_config?.seed ?? 42,
        strategy: dataset.split_config?.strategy === "random" ? "random" : "class",
        test_dataset_id: test === 0 ? dataset.split_config?.test_dataset_id ?? null : null,
      });
      setDatasetList((currentList) =>
        currentList.map((item) => (item.id === dataset.id ? result.dataset : item)),
      );
      setSplitDrafts((drafts) => ({ ...drafts, [dataset.id]: { train, test } }));
    } catch (error) {
      await confirm({
        title: "Could not split dataset",
        message: error instanceof Error ? error.message : "Please check the dataset and try again.",
        confirmLabel: "OK",
        hideCancel: true,
      });
    } finally {
      setSplittingDatasetId(null);
    }
  }

  function datasetMenuItems(dataset: Dataset): CardMenuItem[] {
    return [
      ...(dataset.is_train_ready
        ? [{
            icon: BrainCircuit,
            label: "Train Model",
            onClick: () => router.push("/train?project=" + dataset.project + "&dataset=" + dataset.id),
          }]
        : []),
      { icon: Upload, label: "Upload Annotations", onClick: () => router.push(`/datasets/${dataset.id}`) },
      { icon: Wand2, label: "Auto Annotations", onClick: () => router.push(`/datasets/${dataset.id}`) },
      {
        icon: Download,
        label: "Export",
        onClick: () =>
          setExportDialog({
            targets: [{ id: dataset.id, name: dataset.name }],
            exportName: dataset.name,
          }),
        dividerBefore: true,
      },
      { icon: UserPlus, label: "Assignee", onClick: () => router.push(`/datasets/${dataset.id}`), dividerBefore: true },
      { icon: BarChart2, label: "View Analytics", onClick: () => router.push(`/datasets/${dataset.id}`) },
      {
        icon: Trash2,
        label: "Delete",
        onClick: () => handleDeleteDataset(dataset.id),
        danger: true,
        dividerBefore: true,
      },
    ];
  }

  const readyDatasets = datasetList.filter((dataset) => dataset.is_train_ready);
  const preferredTrainingDataset = readyDatasets.toSorted((a, b) => b.version - a.version)[0];

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      {confirmDialog}
      {exportDialog ? (
        <DatasetExportDialog
          targets={exportDialog.targets}
          exportName={exportDialog.exportName}
          open
          onClose={() => setExportDialog(null)}
        />
      ) : null}
      <AnimatePresence>
        {trainingDatasetDialogOpen ? (
          <TrainingDatasetDialog
            datasets={datasetList}
            selectedIds={selectedTrainingDatasetIds}
            onToggle={(datasetId) => {
              setSelectedTrainingDatasetIds((current) =>
                current.includes(datasetId)
                  ? current.filter((currentId) => currentId !== datasetId)
                  : [...current, datasetId],
              );
            }}
            onClose={() => setTrainingDatasetDialogOpen(false)}
            onContinue={() => {
              if (selectedTrainingDatasetIds.length === 0) return;
              setTrainingDatasetDialogOpen(false);
              const selected = selectedTrainingDatasetIds.join(",");
              router.push(
                `/train?project=${project.id}&dataset=${selectedTrainingDatasetIds[0]}&datasets=${selected}`,
              );
            }}
          />
        ) : null}
      </AnimatePresence>
      <BlueprintGrid />

      <div className="fixed bottom-5 right-5 z-40 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3" aria-live="polite">
        {Object.values(backgroundUploads).map((upload) => (
          <div
            key={upload.dataset.id}
            role={upload.status === "error" ? "alert" : "status"}
            className={[
              "rounded-2xl border bg-white p-4 shadow-xl shadow-stone-950/10",
              upload.status === "error" ? "border-red-200" : "border-orange-200",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                upload.status === "error" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600",
              ].join(" ")}>
                {upload.status === "uploading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-900">{upload.dataset.name}</p>
                <p className={[
                  "mt-0.5 text-xs",
                  upload.status === "error" ? "text-red-600" : "text-stone-500",
                ].join(" ")}>
                  {upload.status === "error"
                    ? upload.error || "Upload failed."
                    : `Uploading in background${upload.percent == null ? "..." : ` · ${upload.percent}%`}`}
                </p>
              </div>
              {upload.status === "error" ? (
                <button
                  type="button"
                  aria-label={`Dismiss upload error for ${upload.dataset.name}`}
                  onClick={() => setBackgroundUploads((current) => {
                    const next = { ...current };
                    delete next[upload.dataset.id];
                    return next;
                  })}
                  className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {upload.status === "uploading" && upload.percent != null ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-[width] duration-200"
                    style={{ width: `${upload.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-stone-400">Keep this browser tab open until the upload finishes.</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <CreateDatasetModal
            project={project}
            importHint={datasetImportHint}
            onClose={() => setShowModal(false)}
            onDatasetInitialized={(dataset) => {
              setDatasetList((current) => [dataset, ...current.filter((item) => item.id !== dataset.id)]);
            }}
            onDatasetDiscarded={(datasetId) => {
              setDatasetList((current) => current.filter((dataset) => dataset.id !== datasetId));
            }}
            onUploadStateChange={(datasetId, state) => {
              setBackgroundUploads((current) => {
                const next = { ...current };
                if (state) next[datasetId] = state;
                else delete next[datasetId];
                return next;
              });
            }}
            onCreated={(d) => {
              setDatasetList((current) => [d, ...current.filter((dataset) => dataset.id !== d.id)]);
              setShowModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <main className="flex-grow p-6 z-10">
        <header
          className={[
            "mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5",
            "shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center",
            "md:justify-between",
          ].join(" ")}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/projects")}
                className={[
                  "p-2 hover:bg-white/80 rounded-xl transition-colors border border-transparent",
                  "hover:border-stone-200",
                ].join(" ")}
              >
                <ArrowLeft className="w-5 h-5 text-stone-600" />
              </button>
              <div className="h-6 w-[1px] bg-stone-200" />
              <div
                className={[
                  "flex items-center gap-2 text-stone-400 text-xs font-bold uppercase",
                  "tracking-widest",
                ].join(" ")}
              >
                <Link href="/projects" className="hover:text-stone-600 transition-colors">
                  Projects
                </Link>
                <span>/</span>
                <span className="text-stone-900">{project.name}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <button
              type="button"
              disabled={!preferredTrainingDataset}
              onClick={() => {
                if (!preferredTrainingDataset) return;
                if (datasetList.length === 1) {
                  router.push(`/train?project=${project.id}&dataset=${preferredTrainingDataset.id}`);
                  return;
                }
                setSelectedTrainingDatasetIds([preferredTrainingDataset.id]);
                setTrainingDatasetDialogOpen(true);
              }}
              title={preferredTrainingDataset ? "Choose a dataset to train" : "Approve a fully labeled dataset first"}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold",
                "bg-stone-900 text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98]",
                "focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40",
              ].join(" ")}
            >
              <BrainCircuit aria-hidden="true" className="h-4 w-4" />
              Train Model
              {readyDatasets.length > 0 ? (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{readyDatasets.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void handleShareToDataverse()}
              disabled={sharing}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200",
                "bg-white px-4 text-sm font-semibold text-stone-700 shadow-xs transition-all",
                "hover:bg-stone-50 hover:text-stone-900 active:scale-[0.98] disabled:opacity-60",
              ].join(" ")}
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4 text-stone-500" />}
              Share to Dataverse
            </button>
            <button
              type="button"
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200",
                "bg-white text-stone-600 shadow-xs transition-all hover:bg-stone-50 hover:text-stone-900",
                "active:scale-[0.98]",
              ].join(" ")}
            >
              <Settings className="w-4 h-4 text-stone-500" />
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500",
                "px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98]",
              ].join(" ")}
            >
              <Plus className="w-4 h-4" />
              New Dataset
            </button>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm"
          >
            <div className="px-4 py-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={[
                    "w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center",
                    "justify-center shadow-md shadow-orange-500/15 shrink-0",
                  ].join(" ")}
                >
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-stone-900 leading-tight">Class management</h2>
                  <p className="text-[11px] text-stone-400">Index defines the class order used by models.</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 flex flex-wrap items-center gap-2 rounded-lg">
              {classModalOpen ? (
                <ClassEditorInline
                  projectId={project.id}
                  editing={editingClass}
                  classList={classList}
                  onClose={() => {
                    setClassModalOpen(false);
                    setEditingClass(null);
                  }}
                  onSaved={loadClasses}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    setClassModalOpen(true);
                  }}
                  className={[
                    "inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-dashed",
                    "border-stone-300 bg-stone-50/80 px-3 py-1.5 text-xs font-bold text-stone-700",
                    "hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-800 transition-colors",
                  ].join(" ")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add class
                </button>
              )}

              {deletingClassId !== null ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-stone-500"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" aria-hidden="true" />
                  Deleting class…
                </span>
              ) : null}

              {classList.length === 0 ? (
                <span className="text-xs text-stone-400">
                  No classes yet — add one for consistent labels when annotating.
                </span>
              ) : (
                classList.map((c) => (
                  <div
                    key={c.id}
                    className={[
                      "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-stone-200 bg-white",
                      "py-1 pl-2 pr-1",
                    ].join(" ")}
                  >
                    <span
                      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-orange-50 px-1 text-[10px] font-bold tabular-nums text-orange-700"
                      title={`Model class index ${c.index}`}
                    >
                      {c.index}
                    </span>
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: c.color }}
                      title={c.color}
                    />
                    <span className="max-w-[10rem] truncate text-xs font-semibold text-stone-800">{c.name}</span>
                    <span
                      className={`shrink-0 rounded-md px-1 py-0.5 text-xs font-bold tabular-nums ${
                        c.annotation_count > 0 ? "bg-stone-100 text-stone-600" : "text-stone-300"
                      }`}
                      title="Annotations using this class"
                    >
                      {c.annotation_count}
                    </span>
                    <span className="inline-flex shrink-0 items-center">
                      <button
                        type="button"
                        disabled={c.index === 0 || classOrderSaving || deletingClassId !== null}
                        onClick={() => void handleMoveClass(c.id, -1)}
                        className="rounded-md p-1 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-200 disabled:hover:bg-transparent"
                        title="Move class to a lower model index"
                        aria-label={`Move ${c.name} to index ${c.index - 1}`}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={c.index === classList.length - 1 || classOrderSaving || deletingClassId !== null}
                        onClick={() => void handleMoveClass(c.id, 1)}
                        className="rounded-md p-1 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-stone-200 disabled:hover:bg-transparent"
                        title="Move class to a higher model index"
                        aria-label={`Move ${c.name} to index ${c.index + 1}`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(c);
                          setClassModalOpen(true);
                        }}
                        className={[
                          "rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900",
                          "transition-colors",
                        ].join(" ")}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={c.annotation_count > 0 || deletingClassId !== null}
                        onClick={() => void handleDeleteClass(c)}
                        className={`rounded-md p-1 transition-colors ${
                          c.annotation_count > 0 || deletingClassId !== null
                            ? "cursor-not-allowed text-stone-200"
                            : "text-stone-400 hover:bg-red-50 hover:text-red-600"
                        }`}
                        title={c.annotation_count > 0 ? "Cannot delete: this class is used by annotations" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.section>

          {project.team != null && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm"
            >
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={[
                      "w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center",
                      "justify-center shadow-md shadow-orange-500/15 shrink-0",
                    ].join(" ")}
                  >
                    <UserPlus className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-stone-900 leading-tight">Collaborators</h2>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                      {members.length} {members.length !== 1 ? "people" : "person"} with access
                    </p>
                  </div>
                </div>
                {!inviteOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setInviteOpen(true);
                      setInviteError("");
                    }}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border border-dashed border-orange-300",
                      "bg-orange-50/80 px-3 py-1.5 text-xs font-bold text-orange-700 hover:border-orange-400",
                      "hover:bg-orange-100/60 transition-colors shrink-0",
                    ].join(" ")}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite
                  </button>
                )}
              </div>

              {inviteOpen && (
                <form
                  onSubmit={handleInvite}
                  className="px-4 py-3 border-b border-stone-100 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="email"
                    autoFocus
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email address…"
                    className={[
                      "w-60 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold",
                      "text-stone-800 outline-none transition focus:border-orange-400 focus:bg-white",
                      "focus:ring-2 focus:ring-orange-400/20",
                    ].join(" ")}
                  />
                  <RoleSelect value={inviteRole} onChange={setInviteRole} />
                  <button
                    type="submit"
                    disabled={inviteSaving || !inviteEmail.trim()}
                    className={[
                      "shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-sm",
                      "shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50 flex",
                      "items-center gap-1",
                    ].join(" ")}
                  >
                    {inviteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteOpen(false);
                      setInviteEmail("");
                      setInviteError("");
                    }}
                    className={[
                      "shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold",
                      "text-stone-600 transition hover:bg-stone-100",
                    ].join(" ")}
                  >
                    Cancel
                  </button>
                  {inviteError && <p className="w-full text-xs text-red-500">{inviteError}</p>}
                </form>
              )}

              {members.length === 0 && invitations.filter((i) => i.status === "pending").length === 0 ? (
                <p className="px-4 py-4 text-xs text-stone-400">No members yet — invite someone to get started.</p>
              ) : (
                <>
                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-3 px-4 py-3">
                      {members.map((m) => {
                        const avatarGradients = [
                          "from-violet-400 to-purple-500",
                          "from-blue-400 to-indigo-500",
                          "from-emerald-400 to-teal-500",
                          "from-orange-400 to-amber-500",
                          "from-pink-400 to-rose-500",
                          "from-cyan-400 to-sky-500",
                          "from-lime-400 to-green-500",
                          "from-fuchsia-400 to-pink-500",
                        ];
                        const gradientIndex =
                          m.user_username.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarGradients.length;
                        const gradient = avatarGradients[gradientIndex];
                        const initials = m.user_username.slice(0, 2).toUpperCase();
                        const isOnline = m.is_online ?? currentUser?.user_id === m.user;
                        const roleColors: Record<string, string> = {
                          owner: "text-amber-600",
                          admin: "text-orange-600",
                          member: "text-stone-600",
                          viewer: "text-stone-400",
                        };
                        return (
                          <div key={m.id} className="group relative">
                            <div
                              className={[
                                "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center",
                                "text-xs font-bold text-white shadow-sm ring-2 ring-white",
                                gradient,
                              ].join(" ")}
                            >
                              {initials}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white
                                shadow-sm ${isOnline ? "bg-green-500" : "bg-stone-300"}`}
                            />
                            <div
                              className={[
                                "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2",
                                "group-hover:block",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "w-max rounded-xl border border-stone-100 bg-white px-3 py-2 shadow-xl",
                                  "shadow-stone-200/60",
                                ].join(" ")}
                              >
                                <p className="text-xs font-bold text-stone-900">{m.user_username}</p>
                                <p className="mt-0.5 text-[10px] text-stone-400">{m.user_email}</p>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <span
                                    className={[
                                      "text-[10px] font-bold uppercase tracking-wide",
                                      roleColors[m.role] ?? roleColors.viewer,
                                    ].join(" ")}
                                  >
                                    {m.role}
                                  </span>
                                  <span className="text-stone-200">·</span>
                                  <span
                                    className={[
                                      "text-[10px] font-semibold",
                                      isOnline ? "text-green-500" : "text-stone-400",
                                    ].join(" ")}
                                  >
                                    {isOnline ? "Online" : "Offline"}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={[
                                  "mx-auto mt-0.5 h-1.5 w-1.5 rotate-45 border-b border-r border-stone-100",
                                  "bg-white",
                                ].join(" ")}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {invitations.filter((i) => i.status !== "cancelled").length > 0 && (
                    <div className="border-t border-stone-100 px-4 py-2.5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        Pending invitations
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {invitations
                          .filter((i) => i.status !== "cancelled")
                          .map((inv) => {
                            const statusStyles: Record<string, string> = {
                              pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
                              accepted: "bg-green-50 text-green-700 border border-green-200",
                              expired: "bg-stone-100 text-stone-400 border border-stone-200",
                            };
                            return (
                              <div key={inv.id} className="flex items-center gap-2">
                                <div
                                  className={[
                                    "h-7 w-7 shrink-0 rounded-full bg-stone-100 border border-dashed",
                                    "border-stone-300 flex",
                                    "items-center justify-center",
                                  ].join(" ")}
                                >
                                  <UserPlus className="w-3 h-3 text-stone-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-stone-700">{inv.email}</p>
                                  <p className="text-[10px] text-stone-400">
                                    {inv.role} · {new Date(inv.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase
                                    tracking-wide ${statusStyles[inv.status] ?? statusStyles.expired}`}
                                >
                                  {inv.status}
                                </span>
                                {inv.status === "pending" && (
                                  <button
                                    type="button"
                                    title="Cancel invitation"
                                    onClick={() => {
                                      if (project.team == null) return;
                                      const teamId = project.team;
                                      void teams.cancelInvitation(teamId, inv.id).then(() => loadInvitations(teamId));
                                    }}
                                    className={[
                                      "shrink-0 rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-500",
                                      "transition-colors",
                                    ].join(" ")}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}
        </div>

        <h2 id="project-datasets" className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
          Datasets
        </h2>

        <div
          className="
            grid gap-4
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            2xl:grid-cols-5
          "
        >
          {datasetList.map((dataset, i) => {
            const status = datasetStatus(dataset);
            const importJob = dataset.latest_import_job;
            const importProgress = importJob && importJob.total > 0
              ? Math.min(100, Math.round((importJob.done / importJob.total) * 100))
              : 0;
            const isImporting = !!importJob && ["queued", "running"].includes(importJob.status);
            const importFailed = importJob?.status === "error";
            const annotated = dataset.annotated_count ?? 0;
            const imageTotal = dataset.image_count ?? dataset.media_count;
            const annotationProgress = imageTotal > 0 ? Math.round((annotated / imageTotal) * 100) : 0;
            return (
              <motion.div
                key={dataset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/datasets/${dataset.id}`)}
                className={[
                  "group flex aspect-square w-full cursor-pointer flex-col rounded-3xl border",
                  "border-stone-200 bg-white p-2 text-left shadow-sm transition-all hover:border-orange-300",
                  "hover:shadow-xl hover:shadow-orange-50 active:scale-[0.99]",
                ].join(" ")}
              >
                <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-stone-50">
                  {dataset.thumbnail ? (
                    <Image
                      src={resolveMediaUrl(dataset.thumbnail)}
                      alt={dataset.name}
                      fill
                      unoptimized
                      className={[
                        "w-full h-full object-cover group-hover:scale-105 transition-transform",
                        "duration-500",
                      ].join(" ")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <ImageIcon className="w-12 h-12 text-stone-300" />
                    </div>
                  )}
                  <div
                    className={[
                      "absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px]",
                      "font-bold text-stone-900 shadow-sm flex items-center gap-1.5 border border-white/40",
                    ].join(" ")}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
                  </div>
                </div>
                <div className="shrink-0 px-3 pt-2 pb-1">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <h3
                      className={[
                        "font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate",
                        "text-base",
                      ].join(" ")}
                    >
                      {dataset.name}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      <CardMenu items={datasetMenuItems(dataset)} />
                    </div>
                  </div>
                  <div className="mb-2 min-h-7">
                    {isImporting && importJob ? (
                      <div role="status" aria-label={`Importing ${dataset.name}`}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold">
                          <span className="truncate text-stone-500">
                            {importJob.status === "queued" ? "Waiting for worker" : "Importing frames"}
                          </span>
                          <span className="shrink-0 tabular-nums text-orange-600">
                            {importJob.total > 0 ? `${importJob.done}/${importJob.total}` : "Preparing"}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={importProgress}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100"
                        >
                          <div
                            className="h-full rounded-full bg-orange-500 transition-[width] duration-500"
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : importFailed ? (
                      <p
                        title={importJob?.error || "Dataset import failed."}
                        className="line-clamp-2 text-[10px] font-semibold leading-4 text-red-600"
                      >
                        {importJob?.error || "Dataset import failed."}
                      </p>
                    ) : (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-stone-400">
                          <span>
                            <span className="text-stone-900">{annotated}</span> / {imageTotal} images annotated
                          </span>
                          <span>{annotationProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={[
                              "h-full rounded-full transition-[width] duration-500",
                              dataset.is_train_ready ? "bg-emerald-500" : "bg-orange-400",
                            ].join(" ")}
                            style={{ width: `${annotationProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {false && (() => {
                    const draft = splitDrafts[dataset.id] ?? {
                      train: dataset.split_config?.train ?? 70,
                      test: dataset.split_config?.test ?? 10,
                    };
                    const train = draft.test === 0 ? 80 : draft.train;
                    const valid = 100 - train - draft.test;
                    return (
                      <div
                        className="mb-2 flex items-end gap-1.5 rounded-xl bg-stone-50 p-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="min-w-0 flex-1 text-[9px] font-bold uppercase text-stone-400">
                          Train
                          <input
                            type="number"
                            min={70}
                            max={80}
                            disabled={draft.test === 0}
                            value={train}
                            onChange={(event) => setSplitDrafts((current) => ({
                              ...current,
                              [dataset.id]: { ...draft, train: Number(event.target.value) },
                            }))}
                            className="no-number-spinner mt-1 h-7 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs font-bold text-stone-800 outline-none focus:border-orange-400 disabled:text-stone-400"
                            aria-label={`${dataset.name} train percentage`}
                          />
                        </label>
                        <div className="min-w-0 flex-1 text-[9px] font-bold uppercase text-stone-400">
                          Valid
                          <div className="mt-1 flex h-7 items-center rounded-lg border border-stone-200 bg-stone-100 px-2 text-xs font-bold text-stone-600">
                            {valid}%
                          </div>
                        </div>
                        <label className="min-w-0 flex-1 text-[9px] font-bold uppercase text-stone-400">
                          Test
                          <select
                            value={draft.test}
                            onChange={(event) => {
                              const test = Number(event.target.value);
                              setSplitDrafts((current) => ({
                                ...current,
                                [dataset.id]: { train: test === 0 ? 80 : train, test },
                              }));
                            }}
                            className="mt-1 h-7 w-full rounded-lg border border-stone-200 bg-white px-1 text-xs font-bold text-stone-800 outline-none focus:border-orange-400"
                            aria-label={`${dataset.name} test percentage`}
                          >
                            <option value={10}>10%</option>
                            <option value={0}>{dataset.split_config?.test_dataset_id ? "Fixed" : "0%"}</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleDatasetSplit(dataset)}
                          disabled={splittingDatasetId === dataset.id}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-50"
                          aria-label={`Apply split for ${dataset.name}`}
                          title="Apply split"
                        >
                          {splittingDatasetId === dataset.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Check className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            );
          })}

          <motion.div
            onClick={() => setShowModal(true)}
            className={[
              "group flex aspect-square cursor-pointer flex-col items-center justify-center gap-4",
              "rounded-3xl border-2 border-dashed border-stone-200 p-8 text-center transition-all",
              "hover:bg-stone-50",
            ].join(" ")}
          >
            <div
              className={[
                "w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center",
                "group-hover:scale-110 group-hover:bg-orange-50 transition-all",
              ].join(" ")}
            >
              <Plus className="w-6 h-6 text-stone-300 group-hover:text-orange-500" />
            </div>
            <p className="font-bold text-stone-900 text-sm">Add New Dataset</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
