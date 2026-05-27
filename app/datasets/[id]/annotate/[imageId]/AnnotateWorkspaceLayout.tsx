"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Box,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
  Eye,
  EyeOff,
  Hexagon,
  Link2,
  Loader2,
  MousePointer2,
  Pin,
  Play,
  Plus,
  Redo2,
  Save,
  Spline,
  Square,
  Tag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import AnnotationEditor from "@/components/annotate/AnnotationEditor";
import type { Tool } from "@/components/annotate/AnnotationEditor";
import type { EditorShape, LabelDefinition } from "@/lib/annotation";

const TOOLBAR: { tool: Tool; icon: React.ReactNode; label: string; key: string }[] = [
  { tool: "select", icon: <MousePointer2 className="h-5 w-5" />, label: "Select", key: "V" },
  { tool: "rectangle", icon: <Square className="h-5 w-5" />, label: "Box", key: "N" },
  { tool: "polygon", icon: <Hexagon className="h-5 w-5" />, label: "Polygon", key: "P" },
  { tool: "polyline", icon: <Spline className="h-5 w-5" />, label: "Polyline", key: "L" },
  { tool: "points", icon: <CircleDot className="h-5 w-5" />, label: "Points", key: "K" },
  { tool: "cuboid", icon: <Box className="h-5 w-5" />, label: "Cuboid", key: "C" },
  { tool: "tag", icon: <Tag className="h-5 w-5" />, label: "Tag", key: "T" },
];

function objectSummary(shape: EditorShape): string {
  if (shape.shapeType === "tag") return "tag";
  if (shape.points && shape.points.length >= 2) return `${shape.shapeType} ${shape.points.length / 2} pts`;
  return `${Math.round(shape.width)}x${Math.round(shape.height)}`;
}
type PaneResizeTarget = "tools" | "objects";
type RightTab = "objects" | "labels";

type ShapeSetter = React.Dispatch<React.SetStateAction<EditorShape[]>>;

type PaneResizeHandlers = {
  start: (target: PaneResizeTarget, e: React.PointerEvent<HTMLButtonElement>) => void;
  update: (e: React.PointerEvent<HTMLButtonElement>) => void;
  stop: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

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
  if (/^[0-9A-Fa-f]{3}$/.test(raw)) {
    return `#${raw.split("").map((char) => char + char).join("").toUpperCase()}`;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback;
}

function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b].map((value) => clampColorChannel(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    if (max === green) h = 60 * ((blue - red) / delta + 2);
    if (max === blue) h = 60 * ((red - green) / delta + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let red = 0;
  let green = 0;
  let blue = 0;

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

export function PaneResizeHandle({
  label,
  target,
  resize,
}: {
  label: string;
  target: PaneResizeTarget;
  resize: PaneResizeHandlers;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => resize.start(target, e)}
      onPointerMove={resize.update}
      onPointerUp={resize.stop}
      onPointerCancel={resize.stop}
      className="group relative z-30 w-2 shrink-0 cursor-col-resize touch-none bg-transparent outline-none"
    >
      <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-stone-200 transition group-hover:w-1 group-hover:bg-orange-400 group-focus-visible:w-1 group-focus-visible:bg-orange-500" />
    </button>
  );
}

export function WorkspaceHeader({
  datasetId,
  imageId,
  isNativeMode,
  frameIndex,
  jobId,
  canSaveToApi,
  saving,
  canUndo,
  canRedo,
  onBack,
  onUndo,
  onRedo,
  onSave,
}: {
  datasetId: string | string[] | undefined;
  imageId: string | string[] | undefined;
  isNativeMode: boolean;
  frameIndex: number;
  jobId: number;
  canSaveToApi: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}) {
  const modeText = isNativeMode ? ` · Frame ${frameIndex + 1}` : ` · Media ${imageId}`;
  const saveText = !Number.isNaN(jobId) ? ` · Job ${jobId}` : canSaveToApi ? " · Direct" : " · Demo";

  return (
    <nav className="z-30 flex items-center justify-between gap-4 border-b border-stone-200/80 bg-white/90 px-4 py-2.5 shadow-sm shadow-stone-200/40 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-xl p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-px shrink-0 bg-stone-200" />
        <div className="hidden min-w-0 sm:block">
          <h1 className="text-sm font-bold leading-none text-stone-900">Annotation workspace</h1>
          <p className="mt-1.5 truncate text-xs font-bold uppercase tracking-widest text-orange-600">
            Dataset {datasetId}
            {modeText}
            {saveText}
          </p>
        </div>
        <div className="hidden h-8 w-px shrink-0 bg-stone-200 sm:block" />
        <div className="flex items-center gap-1 rounded-xl p-1">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>Save</span>
      </button>
    </nav>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="mx-6 mt-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function ToolPane({
  width,
  activeTool,
  polygonVertexCount,
  onToolChange,
  onPolygonVertexCountChange,
}: {
  width: number;
  activeTool: Tool;
  polygonVertexCount: number;
  onToolChange: (tool: Tool) => void;
  onPolygonVertexCountChange: (value: number) => void;
}) {
  return (
    <aside
      className="z-20 flex shrink-0 flex-col items-stretch gap-3 overflow-y-auto border-r border-stone-200/80 bg-white/90 px-2 py-4 shadow-sm shadow-stone-200/30 sm:px-2.5"
      style={{ width: 64 }}
    >
      <div className="flex flex-col gap-2 p-1">
        {TOOLBAR.map(({ tool, icon, label, key }) => (
          <ToolButton
            key={tool}
            tool={tool}
            icon={icon}
            label={label}
            shortcut={key}
            activeTool={activeTool}
            polygonVertexCount={polygonVertexCount}
            onToolChange={onToolChange}
            onPolygonVertexCountChange={onPolygonVertexCountChange}
          />
        ))}
      </div>
    </aside>
  );
}

function ToolButton({
  tool,
  icon,
  label,
  shortcut,
  activeTool,
  polygonVertexCount,
  onToolChange,
  onPolygonVertexCountChange,
}: {
  tool: Tool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  activeTool: Tool;
  polygonVertexCount: number;
  onToolChange: (tool: Tool) => void;
  onPolygonVertexCountChange: (value: number) => void;
}) {
  const isActive = activeTool === tool;
  const hasPointCount = tool === "polygon" || tool === "polyline";
  const button = (
    <button
      type="button"
      title={`${label} (${shortcut})`}
      onClick={() => onToolChange(tool)}
      className={`inline-flex h-10 w-10 self-center flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-bold uppercase tracking-wide transition-all ${
        isActive
          ? "border border-orange-200 bg-orange-50 text-orange-700 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/25"
          : "border border-transparent text-stone-500 hover:border-stone-200 hover:bg-white hover:text-stone-900 hover:shadow-sm"
      }`}
    >
      {icon}
    </button>
  );

  if (!hasPointCount) return button;

  return (
    <div className="flex w-14 self-center flex-col gap-1.5">
      {button}
      {isActive && (
        <label className="flex w-14 flex-col gap-1.5 rounded-xl border border-orange-200 bg-white px-1.5 py-2 shadow-sm shadow-orange-100/60">
          <span className="text-center text-[8px] font-bold uppercase leading-none tracking-wider text-stone-500">
            Points
          </span>
          <select
            value={polygonVertexCount}
            onChange={(e) => onPolygonVertexCountChange(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-1.5 py-1.5 text-xs font-semibold text-stone-800"
          >
            {[(tool === "polyline" ? 2 : 3), 4, 5, 6, 7, 8, 9, 10, 12, 16, 20].map((n) => (
              <option key={`${tool}-${n}`} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function CanvasStage({
  loading,
  currentDraftKey,
  imageUrl,
  labels,
  activeClassId,
  shapes,
  activeTool,
  polygonVertexCount,
  hiddenShapeIds,
  pinnedShapeIds,
  onActiveClassIdChange,
  onShapesChange,
  onToolChange,
}: {
  loading: boolean;
  currentDraftKey: string;
  imageUrl: string;
  labels: LabelDefinition[];
  activeClassId: number;
  shapes: EditorShape[];
  activeTool: Tool;
  polygonVertexCount: number;
  hiddenShapeIds: string[];
  pinnedShapeIds: string[];
  onActiveClassIdChange: (classId: number) => void;
  onShapesChange: ShapeSetter;
  onToolChange: (tool: Tool) => void;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-grow items-stretch justify-stretch overflow-hidden p-2">
      {loading ? (
        <div className="absolute inset-4 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading media...</span>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="h-full w-full min-h-0">
          <AnnotationEditor
            key={currentDraftKey}
            imageUrl={imageUrl}
            labels={labels}
            activeClassId={activeClassId}
            onActiveClassIdChange={onActiveClassIdChange}
            shapes={shapes}
            onShapesChange={onShapesChange}
            activeTool={activeTool}
            onToolChange={onToolChange}
            polygonVertexCount={polygonVertexCount}
            hiddenShapeIds={hiddenShapeIds}
            pinnedShapeIds={pinnedShapeIds}
          />
        </motion.div>
      )}
    </div>
  );
}

export function RightPane({
  width,
  activeTab,
  shapes,
  labels,
  hiddenShapeIds,
  pinnedShapeIds,
  openClassMenuId,
  newLabelName,
  newLabelColor,
  labelBusyId,
  onTabChange,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onCreateLabel,
  onDeleteLabel,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
  onToggleShapeHidden,
  onToggleShapePinned,
}: {
  width: number;
  activeTab: RightTab;
  shapes: EditorShape[];
  labels: LabelDefinition[];
  hiddenShapeIds: string[];
  pinnedShapeIds: string[];
  openClassMenuId: string | null;
  newLabelName: string;
  newLabelColor: string;
  labelBusyId: number | "new" | null;
  onTabChange: (tab: RightTab) => void;
  onNewLabelNameChange: (value: string) => void;
  onNewLabelColorChange: (value: string) => void;
  onCreateLabel: (e: React.FormEvent) => void;
  onDeleteLabel: (label: LabelDefinition) => void;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
  onToggleShapeHidden: (shapeId: string) => void;
  onToggleShapePinned: (shapeId: string) => void;
}) {
  return (
    <aside
      className="z-20 grid h-full shrink-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-l border-stone-200/80 bg-white/90 p-4 shadow-xl shadow-stone-200/30 backdrop-blur-xl"
      style={{ width }}
    >
      <RightPaneTabs activeTab={activeTab} objectCount={shapes.length} onTabChange={onTabChange} />

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {activeTab === "labels" ? (
          <LabelsPanel
            labels={labels}
            shapes={shapes}
            newLabelName={newLabelName}
            newLabelColor={newLabelColor}
            labelBusyId={labelBusyId}
            onNewLabelNameChange={onNewLabelNameChange}
            onNewLabelColorChange={onNewLabelColorChange}
            onCreateLabel={onCreateLabel}
            onDeleteLabel={onDeleteLabel}
          />
        ) : (
          <ObjectsPanel
            shapes={shapes}
            labels={labels}
            hiddenShapeIds={hiddenShapeIds}
            pinnedShapeIds={pinnedShapeIds}
            openClassMenuId={openClassMenuId}
            onShapeClassChange={onShapeClassChange}
            onActiveClassIdChange={onActiveClassIdChange}
            onOpenClassMenuIdChange={onOpenClassMenuIdChange}
            onToggleShapeHidden={onToggleShapeHidden}
            onToggleShapePinned={onToggleShapePinned}
          />
        )}
      </div>
    </aside>
  );
}

function RightPaneTabs({
  activeTab,
  objectCount,
  onTabChange,
}: {
  activeTab: RightTab;
  objectCount: number;
  onTabChange: (tab: RightTab) => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-200">
      <div className="flex">
        {(["objects", "labels"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-bold uppercase tracking-widest transition ${
              activeTab === tab
                ? "border-orange-500 text-stone-900"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            {tab === "objects" ? "Objects" : "Labels"}
          </button>
        ))}
      </div>
      {activeTab === "objects" && (
        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-500">{objectCount} total</span>
      )}
    </div>
  );
}

function LabelsPanel({
  labels,
  shapes,
  newLabelName,
  newLabelColor,
  labelBusyId,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onCreateLabel,
  onDeleteLabel,
}: {
  labels: LabelDefinition[];
  shapes: EditorShape[];
  newLabelName: string;
  newLabelColor: string;
  labelBusyId: number | "new" | null;
  onNewLabelNameChange: (value: string) => void;
  onNewLabelColorChange: (value: string) => void;
  onCreateLabel: (e: React.FormEvent) => void;
  onDeleteLabel: (label: LabelDefinition) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
      <div className="mb-3 shrink-0 text-[14px] font-bold uppercase tracking-widest text-stone-500">Classes</div>
      <form onSubmit={onCreateLabel} className="mb-3 flex shrink-0 items-center gap-2">
        <LabelColorPicker
          value={newLabelColor}
          onChange={onNewLabelColorChange}
        />
        <input
          type="text"
          value={newLabelName}
          onChange={(e) => onNewLabelNameChange(e.target.value)}
          placeholder="New label"
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
        <button
          type="submit"
          disabled={!newLabelName.trim() || labelBusyId === "new"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          title="Add label"
          aria-label="Add label"
        >
          {labelBusyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
      <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2">
        {labels.map((label) => (
          <LabelRow
            key={label.id}
            label={label}
            isUsed={shapes.some((shape) => shape.classLabelId === label.id)}
            deleting={labelBusyId === label.id}
            onDelete={onDeleteLabel}
          />
        ))}
      </div>
    </div>
  );
}

function LabelColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draftColor, setDraftColor] = React.useState(normalizeHexColor(value));
  const initialColorRef = React.useRef(normalizeHexColor(value));
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const colorAreaRef = React.useRef<HTMLDivElement | null>(null);
  const hsv = rgbToHsv(hexToRgb(draftColor));
  const rgb = hexToRgb(draftColor);

  React.useEffect(() => {
    if (!open) setDraftColor(normalizeHexColor(value));
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onChange(initialColorRef.current);
        setDraftColor(initialColorRef.current);
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onChange, open]);

  const commitColor = React.useCallback(
    (color: string) => {
      const normalized = normalizeHexColor(color, draftColor);
      setDraftColor(normalized);
      onChange(normalized);
    },
    [draftColor, onChange]
  );

  const updateFromColorArea = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = colorAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
      commitColor(rgbToHex(hsvToRgb({ h: hsv.h, s, v })));
    },
    [commitColor, hsv.h]
  );

  const updateRgb = (channel: keyof RgbColor, channelValue: string) => {
    commitColor(rgbToHex({ ...rgb, [channel]: clampColorChannel(Number(channelValue)) }));
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          initialColorRef.current = normalizeHexColor(value);
          setDraftColor(normalizeHexColor(value));
          setOpen((current) => !current);
        }}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1 shadow-sm shadow-stone-200/40 transition hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
        title="Pick label color"
        aria-label="Pick label color"
      >
        <span className="block h-full w-full rounded-md" style={{ backgroundColor: normalizeHexColor(value) }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-11 z-50 w-[244px] rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl shadow-stone-300/50"
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-stone-600">Select color</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-900"
              aria-label="Close color picker"
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
            aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
            tabIndex={0}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateFromColorArea(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateFromColorArea(event);
            }}
            className="relative h-32 w-full touch-none cursor-crosshair overflow-hidden border border-stone-200"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
            }}
          >
            <span
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md shadow-black/40"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="h-8 w-8 shrink-0 rounded-full border border-stone-200" style={{ backgroundColor: draftColor }} />
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(hsv.h)}
              onChange={(event) => commitColor(rgbToHex(hsvToRgb({ ...hsv, h: Number(event.target.value) })))}
              className="h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,#ef4444,#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)]"
              aria-label="Hue"
            />
          </div>

            <div className="mt-3 grid grid-cols-[1.9fr_1fr_1fr_1fr] gap-2">
              <label className="col-span-1 min-w-0">
                <span className="sr-only">Hex</span>
                <input
                  type="text"
                  value={draftColor.replace("#", "")}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDraftColor(`#${next}`);
                    if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(next)) {
                      onChange(normalizeHexColor(next, draftColor));
                    }
                  }}
                  onBlur={() => commitColor(draftColor)}
                  className="h-8 w-full rounded-lg border border-stone-200 bg-stone-50 px-2 text-center text-xs text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
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
                    onChange={(event) => updateRgb(channel, event.target.value)}
                  className="no-number-spinner h-8 w-full rounded-lg border border-stone-200 bg-stone-50 px-1 text-center text-xs text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
                </label>
              ))}
            </div>

          <div className="mt-1 grid grid-cols-[1.9fr_1fr_1fr_1fr] gap-2 text-center text-[10px] font-bold text-stone-500">
            <span>Hex</span>
            <span>R</span>
            <span>G</span>
            <span>B</span>
          </div>

          <div className="mt-3 grid grid-cols-8 gap-2">
            {LABEL_COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => commitColor(color)}
                className="h-5 w-5 rounded-md border border-stone-200 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => commitColor("#E66700")}
              className="rounded-lg border border-stone-200 px-2 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                commitColor(initialColorRef.current);
                setOpen(false);
              }}
              className="rounded-lg border border-stone-200 px-2 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-orange-500 px-2 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LabelRow({
  label,
  isUsed,
  deleting,
  onDelete,
}: {
  label: LabelDefinition;
  isUsed: boolean;
  deleting: boolean;
  onDelete: (label: LabelDefinition) => void;
}) {
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl bg-white/70 px-3 py-2 text-left text-base font-semibold text-stone-700 shadow-sm shadow-stone-200/40">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="min-w-0 flex-1 truncate">{label.name}</span>
      <button
        type="button"
        onClick={() => void onDelete(label)}
        disabled={deleting || isUsed}
        title={isUsed ? "Label is in use" : "Delete label"}
        aria-label={isUsed ? "Label is in use" : "Delete label"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-stone-400"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ObjectsPanel({
  shapes,
  labels,
  hiddenShapeIds,
  pinnedShapeIds,
  openClassMenuId,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
  onToggleShapeHidden,
  onToggleShapePinned,
}: {
  shapes: EditorShape[];
  labels: LabelDefinition[];
  hiddenShapeIds: string[];
  pinnedShapeIds: string[];
  openClassMenuId: string | null;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
  onToggleShapeHidden: (shapeId: string) => void;
  onToggleShapePinned: (shapeId: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
      <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-2">
        {shapes.length === 0 && (
          <p className="text-base leading-relaxed text-stone-500">
            Box: click two corners on the image (N).
          </p>
        )}
        {shapes.map((shape, index) => (
          <ObjectRow
            key={shape.clientId}
            shape={shape}
            index={index}
            labels={labels}
            isHidden={hiddenShapeIds.includes(shape.clientId)}
            isPinned={pinnedShapeIds.includes(shape.clientId)}
            isMenuOpen={openClassMenuId === shape.clientId}
            onShapeClassChange={onShapeClassChange}
            onActiveClassIdChange={onActiveClassIdChange}
            onOpenClassMenuIdChange={onOpenClassMenuIdChange}
            onToggleShapeHidden={onToggleShapeHidden}
            onToggleShapePinned={onToggleShapePinned}
          />
        ))}
      </div>
    </div>
  );
}

function ObjectRow({
  shape,
  index,
  labels,
  isHidden,
  isPinned,
  isMenuOpen,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
  onToggleShapeHidden,
  onToggleShapePinned,
}: {
  shape: EditorShape;
  index: number;
  labels: LabelDefinition[];
  isHidden: boolean;
  isPinned: boolean;
  isMenuOpen: boolean;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
  onToggleShapeHidden: (shapeId: string) => void;
  onToggleShapePinned: (shapeId: string) => void;
}) {
  const currentLabel = labels.find((item) => item.id === shape.classLabelId);
  const name = currentLabel?.name ?? "?";
  const color = currentLabel?.color ?? "#999";

  return (
    <div
      className="group space-y-1 rounded-2xl border p-2.5 transition-all hover:bg-white"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}0F`,
      }}
    >
      <div className="flex cursor-pointer items-center justify-between" onClick={() => onActiveClassIdChange(shape.classLabelId)}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-black tabular-nums text-stone-700">
            {index + 1}.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ObjectIconButton
            title={isHidden ? "Show label" : "Hide label"}
            active={isHidden}
            activeClassName="bg-stone-200 text-stone-600"
            onClick={() => onToggleShapeHidden(shape.clientId)}
          >
            {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </ObjectIconButton>
          <ObjectIconButton
            title={isPinned ? "Unpin label note" : "Pin label note"}
            active={isPinned}
            activeClassName="bg-orange-100 text-orange-700"
            onClick={() => onToggleShapePinned(shape.clientId)}
          >
            <Pin className="h-3.5 w-3.5" />
          </ObjectIconButton>
          <span className="font-mono text-xs text-stone-400">{objectSummary(shape)}</span>
        </div>
      </div>

      <ClassMenu
        shape={shape}
        labels={labels}
        color={color}
        name={name}
        isOpen={isMenuOpen}
        onShapeClassChange={onShapeClassChange}
        onActiveClassIdChange={onActiveClassIdChange}
        onOpenClassMenuIdChange={onOpenClassMenuIdChange}
      />
    </div>
  );
}

function ObjectIconButton({
  title,
  active,
  activeClassName,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  activeClassName: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
        active ? activeClassName : "text-stone-400 hover:bg-white hover:text-stone-800"
      }`}
    >
      {children}
    </button>
  );
}

function ClassMenu({
  shape,
  labels,
  color,
  name,
  isOpen,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
}: {
  shape: EditorShape;
  labels: LabelDefinition[];
  color: string;
  name: string;
  isOpen: boolean;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
    <div className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
      <div className="relative" data-class-menu-root="true">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenClassMenuIdChange((prev) => (prev === shape.clientId ? null : shape.clientId));
          }}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left text-sm font-semibold normal-case tracking-normal text-stone-800 shadow-sm shadow-stone-200/50 outline-none transition hover:border-orange-200 hover:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{name}</span>
          </span>
          <ChevronRight className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-300/30">
            {labels.map((label) => (
              <ClassMenuItem
                key={label.id}
                label={label}
                selected={label.id === shape.classLabelId}
                onSelect={(classId) => {
                  onShapeClassChange(shape.clientId, classId);
                  onActiveClassIdChange(classId);
                  onOpenClassMenuIdChange(null);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassMenuItem({
  label,
  selected,
  onSelect,
}: {
  label: LabelDefinition;
  selected: boolean;
  onSelect: (classId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(label.id);
      }}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold normal-case tracking-normal transition ${
        selected ? "bg-orange-50 text-orange-700" : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
      }`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="min-w-0 flex-1 truncate">{label.name}</span>
    </button>
  );
}

export function TimelineBar({
  current,
  total,
  displayedValue,
  sliderMax,
  sliderProgress,
  frameInput,
  currentFilename,
  isNativeMode,
  frameIndex,
  imageId,
  onNavigateTo,
  onScrubStart,
  onScrubChange,
  onCommitSlider,
  onFrameInputChange,
  onFrameInputCommit,
  onClearShapes,
}: {
  current: number;
  total: number;
  displayedValue: number;
  sliderMax: number;
  sliderProgress: number;
  frameInput: string;
  currentFilename: string;
  isNativeMode: boolean;
  frameIndex: number;
  imageId: string | string[] | undefined;
  onNavigateTo: (oneBasedIdx: number, options?: { wrap?: boolean }) => void;
  onScrubStart: () => void;
  onScrubChange: (value: number) => void;
  onCommitSlider: () => void;
  onFrameInputChange: (value: string) => void;
  onFrameInputCommit: () => void;
  onClearShapes: () => void;
}) {
  const fallbackName = isNativeMode ? `Frame ${frameIndex + 1}` : `Media ${imageId}`;
  const controls = [
    { icon: <ChevronFirst className="h-4 w-4" />, label: "First", action: () => onNavigateTo(1) },
    { icon: <ChevronsLeft className="h-4 w-4" />, label: "Back 10", action: () => onNavigateTo(current - 10, { wrap: true }) },
    { icon: <ChevronLeft className="h-4 w-4" />, label: "Prev", action: () => onNavigateTo(current - 1, { wrap: true }) },
    { icon: <Play className="h-4 w-4" />, label: "Play", action: () => {} },
    { icon: <ChevronRight className="h-4 w-4" />, label: "Next", action: () => onNavigateTo(current + 1, { wrap: true }) },
    { icon: <ChevronsRight className="h-4 w-4" />, label: "Forward 10", action: () => onNavigateTo(current + 10, { wrap: true }) },
    { icon: <ChevronLast className="h-4 w-4" />, label: "Last", action: () => onNavigateTo(total || 1) },
  ];

  return (
    <div className="z-30 flex shrink-0 select-none items-center gap-3 border-t border-stone-200/80 bg-white/95 px-4 py-2 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        {controls.map(({ icon, label, action }) => (
          <button key={label} type="button" title={label} onClick={action} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200">
            {icon}
          </button>
        ))}
      </div>

      <div className="relative flex min-w-0 flex-1 items-center">
        <input
          type="range"
          min={1}
          max={sliderMax}
          value={displayedValue}
          onPointerDown={onScrubStart}
          onChange={(e) => onScrubChange(Number(e.target.value))}
          onPointerUp={onCommitSlider}
          onBlur={onCommitSlider}
          onKeyUp={(e) => {
            if (
              e.key.startsWith("Arrow") ||
              e.key === "Home" ||
              e.key === "End" ||
              e.key === "PageUp" ||
              e.key === "PageDown"
            ) {
              onCommitSlider();
            }
          }}
          className="h-2 w-full cursor-pointer touch-none appearance-none rounded-full bg-stone-200 accent-orange-500 transition-[background] duration-200"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${sliderProgress}%, #e7e5e4 ${sliderProgress}%, #e7e5e4 100%)`,
          }}
        />
      </div>

      <div className="flex w-48 shrink-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-600" title={currentFilename}>
          {currentFilename || fallbackName}
        </span>
        <button type="button" title="Copy link" onClick={() => navigator.clipboard?.writeText(window.location.href)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
          <Link2 className="h-4 w-4" />
        </button>
        <button type="button" title="Delete annotation" onClick={onClearShapes} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={Math.max(1, total)}
          value={frameInput}
          onChange={(e) => onFrameInputChange(e.target.value)}
          onBlur={onFrameInputCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onFrameInputCommit();
          }}
          className="no-number-spinner w-12 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-center text-xs font-bold tabular-nums text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
        />
        {total > 0 && <span className="text-xs font-bold text-stone-400">/ {total}</span>}
      </div>
    </div>
  );
}


