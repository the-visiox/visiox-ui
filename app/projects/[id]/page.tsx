"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  BrainCircuit,
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { CardMenu, type CardMenuItem } from "@/components/CardMenu";
import DatasetExportDialog, { type DatasetExportTarget } from "@/components/datasets/DatasetExportDialog";
import { useConfirm } from "@/components/useConfirm";
import { useAuth } from "@/lib/auth";
import {
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
} from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  Ready: "bg-green-500",
  "In Progress": "bg-[#6735E0] animate-pulse",
  Draft: "bg-stone-300",
};

interface ExportDialogState {
  targets: DatasetExportTarget[];
  exportName: string;
}

function datasetStatus(d: Dataset): "Ready" | "In Progress" | "Draft" {
  if (d.media_count === 0) return "Draft";
  if (d.is_train_ready && d.generation_is_complete) return "Ready";
  return "In Progress";
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
  onClose,
  onCreated,
}: {
  project: Project;
  onClose: () => void;
  onCreated: (d: Dataset) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));

      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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

    setSaving(true);
    setError("");

    try {
      const created = await datasets.create({
        project: project.id,
        name,
        description,
      });

      if (files.length > 0) {
        setUploadProgress({ current: 0, total: files.length });

        const images = files.filter((f) => !f.type.startsWith("video/"));
        const videos = files.filter((f) => f.type.startsWith("video/"));
        let uploaded = 0;

        const uploadGroup = async (group: File[], type: "image" | "video") => {
          for (let i = 0; i < group.length; i += 100) {
            const batch = group.slice(i, i + 100);
            await datasets.uploadBatch(created.id, batch, type);
            uploaded += batch.length;
            setUploadProgress({ current: uploaded, total: files.length });
          }
        };

        await uploadGroup(images, "image");
        await uploadGroup(videos, "video");
      }

      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create dataset");

      setSaving(false);

      setUploadProgress({
        current: 0,
        total: 0,
      });
    }
  };

  function submitLabel() {
    if (!saving) return "Create Dataset";

    if (uploadProgress.total > 0) {
      return `Uploading ${uploadProgress.current}/${uploadProgress.total}…`;
    }

    return "Creating…";
  }

  return (
    <div
      className={["fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4", "backdrop-blur-sm"].join(" ")}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={[
          "w-full max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl",
          "max-h-[90vh] overflow-y-auto",
        ].join(" ")}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">New Dataset</h2>

            <p className="mt-1 text-xs text-stone-500">
              Creating in project <span className="font-bold text-stone-900">{project.name}</span>
            </p>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-stone-100">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dataset Name */}
          <div>
            <label
              className={["mb-2 block text-[10px] font-bold uppercase tracking-widest", "text-stone-400"].join(" ")}
            >
              Dataset Name
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Workshop-Safety-Part-A"
              className={[
                "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none",
                "focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
              ].join(" ")}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className={["mb-2 block text-[10px] font-bold uppercase tracking-widest", "text-stone-400"].join(" ")}
            >
              Description
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className={[
                "w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm",
                "outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
              ].join(" ")}
            />
          </div>

          {/* Upload Section */}
          <div>
            <label
              className={["mb-2 block text-[10px] font-bold uppercase tracking-widest", "text-stone-400"].join(" ")}
            >
              Upload Data <span className="normal-case font-normal text-stone-300">(optional)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v"
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
              className={`rounded-2xl border-2 border-dashed px-4 py-6 transition-all ${
                saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${
                dragOver
                  ? "border-orange-400 bg-orange-50"
                  : "border-stone-200 hover:border-orange-300 hover:bg-stone-50/60"
              }`}
            >
              {/* Empty State */}
              {files.length === 0 && (
                <div className="text-center">
                  <div
                    className={[
                      "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl",
                      "bg-stone-100",
                    ].join(" ")}
                  >
                    <Upload className="h-5 w-5 text-stone-400" />
                  </div>

                  <p className="text-sm font-semibold text-stone-700">
                    Drop files here or <span className="text-orange-500">browse</span>
                  </p>

                  <p className="mt-1 text-xs text-stone-400">Images & videos — PNG, JPG, MP4, MOV…</p>
                </div>
              )}

              {/* File List Inside Upload Box */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-700">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </p>

                    <span className="text-xs text-orange-500">Click or drop more</span>
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
                          <ImageIcon
                            className={`h-4 w-4 ${f.type.startsWith("video/") ? "text-stone-400" : "text-orange-400"}`}
                          />
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
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ml-auto grid w-fit grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={[
                "rounded-xl bg-stone-100 px-6 py-3 text-sm font-bold text-stone-700 transition-all",
                "hover:bg-stone-200 disabled:opacity-50",
              ].join(" ")}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !name}
              className={[
                "flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm",
                "font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]",
                "disabled:opacity-50",
              ].join(" ")}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}

              {submitLabel()}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
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
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [splitDrafts, setSplitDrafts] = useState<Record<number, { train: number; test: number }>>({});
  const [splittingDatasetId, setSplittingDatasetId] = useState<number | null>(null);
  const [exportDialog, setExportDialog] = useState<ExportDialogState | null>(null);
  const [classList, setClassList] = useState<AnnotationClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  const projectIdNum = id ? parseInt(id as string, 10) : NaN;

  const loadClasses = useCallback(async () => {
    if (Number.isNaN(projectIdNum)) return;
    try {
      const res = await annotationClasses.list(projectIdNum);
      setClassList(res.results ?? []);
    } catch {
      setClassList([]);
    }
  }, [projectIdNum]);

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
      try {
        const projectId = parseInt(id as string, 10);
        const [found, dsRes] = await Promise.all([projects.get(projectId), datasets.list(projectId)]);
        setProject(found);
        setDatasetList(dsRes.results);
        const clsRes = await annotationClasses.list(projectId);
        setClassList(clsRes.results ?? []);
        await Promise.all([loadMembers(found.team), loadInvitations(found.team)]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, loadMembers, loadInvitations]);

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
        <p className="text-stone-500 mb-4">Project not found</p>
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
        strategy: dataset.split_config?.strategy ?? "class",
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
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <CreateDatasetModal
            project={project}
            onClose={() => setShowModal(false)}
            onCreated={(d) => {
              setDatasetList([d, ...datasetList]);
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
                router.push("/train?project=" + project.id + "&dataset=" + preferredTrainingDataset.id);
              }}
              title={preferredTrainingDataset ? "Train the latest approved dataset" : "Approve a fully labeled dataset first"}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold",
                "bg-stone-900 text-white shadow-lg transition-colors hover:bg-stone-800",
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
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200",
                "bg-white px-5 text-sm font-bold text-stone-700 shadow-sm transition-all",
                "hover:bg-stone-50 hover:scale-105 active:scale-95 disabled:opacity-60",
                "disabled:hover:scale-100",
              ].join(" ")}
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
              Share to Dataverse
            </button>
            <button
              type="button"
              className={[
                "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200",
                "bg-white text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:scale-105",
                "active:scale-95",
              ].join(" ")}
            >
              <Settings className="w-5 h-5 text-stone-600" />
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200",
                "bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60",
                "transition-all hover:bg-orange-200",
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
                        disabled={c.annotation_count > 0}
                        onClick={() => {
                          if (c.annotation_count > 0) return;
                          void (async () => {
                            const ok = await confirm({
                              title: "Delete class",
                              message: `Delete class “${c.name}”?`,
                              confirmLabel: "Delete",
                              danger: true,
                            });
                            if (!ok) return;
                            try {
                              await annotationClasses.delete(c.id);
                              broadcastClassChange(project!.id);
                              await loadClasses();
                            } catch (err) {
                              await confirm({
                                title: "Delete failed",
                                message: err instanceof Error ? err.message : "Could not delete class",
                                confirmLabel: "OK",
                                hideCancel: true,
                              });
                            }
                          })();
                        }}
                        className={`rounded-md p-1 transition-colors ${
                          c.annotation_count > 0
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
                    <img
                      src={resolveMediaUrl(dataset.thumbnail)}
                      alt={dataset.name}
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
                  {(() => {
                    const annotated = dataset.annotated_count ?? 0;
                    const total = dataset.image_count ?? dataset.media_count;
                    const completed = annotated;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div className="mb-2">
                        <div
                          className={[
                            "mb-1 flex items-center justify-between text-[10px] font-bold",
                            "text-stone-400",
                          ].join(" ")}
                        >
                          <span>
                            <span className="text-stone-900">{completed}</span> / {total} labeled
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={[
                              "h-full rounded-full transition-[width] duration-500",
                              dataset.is_train_ready ? "bg-emerald-500" : "bg-orange-400",
                            ].join(" ")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
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
