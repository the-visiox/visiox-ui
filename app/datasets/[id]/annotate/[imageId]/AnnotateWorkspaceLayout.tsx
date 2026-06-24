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
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
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
  return `#${[r, g, b]
    .map((value) => clampColorChannel(value).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
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
      className={["group relative z-30 w-2 shrink-0 cursor-col-resize touch-none", "bg-transparent outline-none"].join(
        " ",
      )}
    >
      <span
        className={[
          "absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-stone-200 transition",
          "group-hover:w-1 group-hover:bg-orange-400 group-focus-visible:w-1",
          "group-focus-visible:bg-orange-500",
        ].join(" ")}
      />
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
    <nav
      className={[
        "z-30 flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4",
        "py-3 shadow-sm shadow-stone-200/40 backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className={[
            "shrink-0 rounded-xl p-2 text-stone-500 transition-colors",
            "hover:bg-stone-100 hover:text-stone-900",
          ].join(" ")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-px shrink-0 bg-stone-200" />
        <div className="hidden min-w-0 sm:block">
          <h1 className="text-sm font-bold leading-none text-stone-900">Annotation workspace</h1>
          <p className={["mt-1.5 truncate text-xs font-bold uppercase tracking-widest", "text-orange-600"].join(" ")}>
            Dataset {datasetId}
            {modeText}
            {saveText}
          </p>
        </div>
        <div className="hidden h-8 w-px shrink-0 bg-stone-200 sm:block" />
        <div className="flex items-center gap-3 rounded-xl p-1">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            title="Save (Ctrl+S)"
            className={[
              "flex h-7 w-7 items-center justify-center pt-0.5 rounded-lg text-stone-400 transition",
              "hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent",
              "disabled:hover:text-stone-400",
            ].join(" ")}
          >
            {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={[
              "flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition",
              "hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent",
              "disabled:hover:text-stone-400",
            ].join(" ")}
          >
            <Undo2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={[
              "flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition",
              "hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent",
              "disabled:hover:text-stone-400",
            ].join(" ")}
          >
            <Redo2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="group absolute left-4 top-14 z-50">
      <div
        className={[
          "flex cursor-default items-center gap-1.5 rounded-full border border-red-200 bg-red-500",
          "px-2.5 py-1 shadow-sm",
        ].join(" ")}
      >
        <AlertCircle className="h-3.5 w-3.5 text-white" />
        <span className="text-xs font-semibold text-white">Error</span>
      </div>
      <div
        className={[
          "pointer-events-none absolute left-0 top-full mt-2 w-72 rounded-2xl border border-red-100",
          "bg-red-50 px-4 py-3 text-sm text-red-700 opacity-0 shadow-lg transition-opacity",
          "duration-150 group-hover:pointer-events-auto group-hover:opacity-100",
        ].join(" ")}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      </div>
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
      className={[
        "z-20 flex flex-col items-stretch gap-3 overflow-y-auto border-r border-stone-200/80",
        "bg-white/90 px-2 py-4 shadow-sm shadow-stone-200/30 sm:px-2.5",
      ].join(" ")}
      style={{ width, minWidth: width, maxWidth: width, flexShrink: 0, flexGrow: 0 }}
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
      className={`inline-flex h-10 w-10 self-center flex-col items-center justify-center
        gap-1 rounded-xl text-[8px] font-bold uppercase tracking-wide
        transition-all ${
          isActive
            ? [
                "border border-orange-200 bg-orange-50 text-orange-700 shadow-lg",
                "shadow-orange-500/20 ring-2 ring-orange-400/25",
              ].join(" ")
            : [
                "border border-transparent text-stone-500 hover:border-stone-200 hover:bg-white",
                "hover:text-stone-900 hover:shadow-sm",
              ].join(" ")
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
        <label
          className={[
            "flex w-14 flex-col gap-1.5 rounded-xl border border-orange-200 bg-white px-1.5 py-2",
            "shadow-sm shadow-orange-100/60",
          ].join(" ")}
        >
          <span
            className={[
              "text-center text-[8px] font-bold uppercase leading-none tracking-wider",
              "text-stone-500",
            ].join(" ")}
          >
            Points
          </span>
          <select
            value={polygonVertexCount}
            onChange={(e) => onPolygonVertexCountChange(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className={[
              "w-full rounded-lg border border-stone-200 bg-stone-50 px-1.5 py-1.5 text-xs",
              "font-semibold text-stone-800",
            ].join(" ")}
          >
            {[tool === "polyline" ? 2 : 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20].map((n) => (
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
  onSelectedIdChange,
  externalSelectedId,
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
  onSelectedIdChange?: (id: string | null) => void;
  externalSelectedId?: string | null;
}) {
  return (
    <div
      className={["relative flex min-h-0 min-w-0 flex-grow items-stretch justify-stretch", "overflow-hidden"].join(" ")}
    >
      {loading ? (
        <div className="absolute inset-4 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading media...</span>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
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
            onSelectedIdChange={onSelectedIdChange}
            externalSelectedId={externalSelectedId}
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
  selectedShapeId,
  activeClassId,
  usedClassIds,
  onSelectShape,
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
  selectedShapeId: string | null;
  activeClassId: number;
  usedClassIds: Set<number>;
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
  onSelectShape: (shapeId: string) => void;
}) {
  return (
    <aside
      className={[
        "z-20 grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-l",
        "border-stone-200/80 bg-white/90 p-4 shadow-xl shadow-stone-200/30 backdrop-blur-xl",
      ].join(" ")}
      style={{ width, minWidth: width, maxWidth: width, flexShrink: 0, flexGrow: 0 }}
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
            activeClassId={activeClassId}
            usedClassIds={usedClassIds}
            onNewLabelNameChange={onNewLabelNameChange}
            onNewLabelColorChange={onNewLabelColorChange}
            onCreateLabel={onCreateLabel}
            onDeleteLabel={onDeleteLabel}
            onActiveClassIdChange={onActiveClassIdChange}
          />
        ) : (
          <ObjectsPanel
            shapes={shapes}
            labels={labels}
            hiddenShapeIds={hiddenShapeIds}
            pinnedShapeIds={pinnedShapeIds}
            openClassMenuId={openClassMenuId}
            selectedShapeId={selectedShapeId}
            onShapeClassChange={onShapeClassChange}
            onActiveClassIdChange={onActiveClassIdChange}
            onOpenClassMenuIdChange={onOpenClassMenuIdChange}
            onToggleShapeHidden={onToggleShapeHidden}
            onToggleShapePinned={onToggleShapePinned}
            onSelectShape={onSelectShape}
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
            className={`-mb-px border-b-2 px-3 pb-2 text-sm font-bold uppercase tracking-widest transition ${
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
        <span className="rounded-lg bg-stone-100 px-2.5 mb-2 py-1 text-xs font-bold text-stone-500">
          {objectCount} total
        </span>
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
  activeClassId,
  usedClassIds,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onCreateLabel,
  onDeleteLabel,
  onActiveClassIdChange,
}: {
  labels: LabelDefinition[];
  shapes: EditorShape[];
  newLabelName: string;
  newLabelColor: string;
  labelBusyId: number | "new" | null;
  activeClassId: number;
  usedClassIds: Set<number>;
  onNewLabelNameChange: (value: string) => void;
  onNewLabelColorChange: (value: string) => void;
  onCreateLabel: (e: React.FormEvent) => void;
  onDeleteLabel: (label: LabelDefinition) => void;
  onActiveClassIdChange: (classId: number) => void;
}) {
  return (
    <div
      className={[
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border",
        "border-stone-200/80 bg-stone-50/80 p-4",
      ].join(" ")}
    >
      <div className={["mb-3 shrink-0 text-[14px] font-bold uppercase tracking-widest", "text-stone-500"].join(" ")}>
        Classes
      </div>
      <form onSubmit={onCreateLabel} className="mb-3 flex shrink-0 items-center gap-2">
        <LabelColorPicker value={newLabelColor} onChange={onNewLabelColorChange} />
        <input
          type="text"
          value={newLabelName}
          onChange={(e) => onNewLabelNameChange(e.target.value)}
          placeholder="New label"
          className={[
            "min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm",
            "font-semibold text-stone-800 outline-none transition focus:border-orange-400",
            "focus:ring-2 focus:ring-orange-400/20",
          ].join(" ")}
        />
        <button
          type="submit"
          disabled={!newLabelName.trim() || labelBusyId === "new"}
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white",
            "transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
          title="Add label"
          aria-label="Add label"
        >
          {labelBusyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
      <div
        className={[
          "custom-scrollbar min-h-0 flex-1 max-h-[68.3vh] space-y-2 overflow-y-auto",
          "overscroll-contain pr-2",
        ].join(" ")}
      >
        {labels.length === 0 ? (
          <p className="pt-6 text-center text-xs text-stone-400">
            No classes yet. Add classes in project settings or create one above.
          </p>
        ) : (
          labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              isUsed={usedClassIds.has(label.id) || shapes.some((shape) => shape.classLabelId === label.id)}
              deleting={labelBusyId === label.id}
              isActive={label.id === activeClassId}
              onSelect={onActiveClassIdChange}
              onDelete={onDeleteLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LabelColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
    [draftColor, onChange],
  );

  const updateFromColorArea = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = colorAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
      commitColor(rgbToHex(hsvToRgb({ h: hsv.h, s, v })));
    },
    [commitColor, hsv.h],
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
        className={[
          "h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1",
          "shadow-sm shadow-stone-200/40 transition hover:border-orange-300 focus:outline-none",
          "focus:ring-2 focus:ring-orange-400/20",
        ].join(" ")}
        title="Pick label color"
        aria-label="Pick label color"
      >
        <span className="block h-full w-full rounded-md" style={{ backgroundColor: normalizeHexColor(value) }} />
      </button>

      {open && (
        <div
          className={[
            "absolute left-0 top-11 z-50 w-[244px] rounded-2xl border border-stone-200 bg-white p-3",
            "shadow-2xl shadow-stone-300/50",
          ].join(" ")}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
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
              onChange={(event) => commitColor(rgbToHex(hsvToRgb({ ...hsv, h: Number(event.target.value) })))}
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
                onChange={(event) => {
                  const next = event.target.value;
                  setDraftColor(`#${next}`);
                  if (/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(next)) {
                    onChange(normalizeHexColor(next, draftColor));
                  }
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
                  onChange={(event) => updateRgb(channel, event.target.value)}
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
            {LABEL_COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => commitColor(color)}
                className={[
                  "h-5 w-5 rounded-md border border-stone-200 transition hover:scale-110 focus:outline-none",
                  "focus:ring-2 focus:ring-orange-400/30",
                ].join(" ")}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
              />
            ))}
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

function LabelRow({
  label,
  isUsed,
  deleting,
  isActive,
  onSelect,
  onDelete,
}: {
  label: LabelDefinition;
  isUsed: boolean;
  deleting: boolean;
  isActive: boolean;
  onSelect: (classId: number) => void;
  onDelete: (label: LabelDefinition) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(label.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(label.id);
        }
      }}
      aria-pressed={isActive}
      title={`Use “${label.name}” for new labels`}
      className={[
        "group flex min-w-0 shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-2",
        "text-left text-sm font-semibold text-stone-700 transition-colors",
      ].join(" ")}
      style={{
        borderColor: isActive ? label.color : `${label.color}55`,
        backgroundColor: isActive ? `${label.color}26` : `${label.color}0F`,
        // Inset ring in the label's own colour: uniform tone, never bleeds past the card.
        boxShadow: isActive ? `inset 0 0 0 0px ${label.color}` : undefined,
      }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="min-w-0 flex-1 truncate">{label.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void onDelete(label);
        }}
        disabled={deleting || isUsed}
        title={isUsed ? "Label is in use" : "Delete label"}
        aria-label={isUsed ? "Label is in use" : "Delete label"}
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition",
          "hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-35",
          "disabled:hover:bg-transparent disabled:hover:text-stone-400",
        ].join(" ")}
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
  selectedShapeId,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
  onToggleShapeHidden,
  onToggleShapePinned,
  onSelectShape,
}: {
  shapes: EditorShape[];
  labels: LabelDefinition[];
  hiddenShapeIds: string[];
  pinnedShapeIds: string[];
  openClassMenuId: string | null;
  selectedShapeId: string | null;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
  onToggleShapeHidden: (shapeId: string) => void;
  onToggleShapePinned: (shapeId: string) => void;
  onSelectShape: (shapeId: string) => void;
}) {
  return (
    <div
      className={[
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border",
        "border-stone-200/80 bg-stone-50/80 p-3",
      ].join(" ")}
    >
      <div
        className={[
          "custom-scrollbar min-h-0 flex-1 max-h-[77vh] space-y-2 overflow-y-auto",
          "overscroll-contain pr-2 p-1",
        ].join(" ")}
      >
        {shapes.length === 0 && (
          <p className="text-base leading-relaxed text-stone-500">Box: click two corners on the image (N).</p>
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
            isSelected={selectedShapeId === shape.clientId}
            onShapeClassChange={onShapeClassChange}
            onActiveClassIdChange={onActiveClassIdChange}
            onOpenClassMenuIdChange={onOpenClassMenuIdChange}
            onToggleShapeHidden={onToggleShapeHidden}
            onToggleShapePinned={onToggleShapePinned}
            onSelect={onSelectShape}
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
  isSelected,
  onShapeClassChange,
  onActiveClassIdChange,
  onOpenClassMenuIdChange,
  onToggleShapeHidden,
  onToggleShapePinned,
  onSelect,
}: {
  shape: EditorShape;
  index: number;
  labels: LabelDefinition[];
  isHidden: boolean;
  isPinned: boolean;
  isMenuOpen: boolean;
  isSelected: boolean;
  onShapeClassChange: (shapeId: string, classId: number) => void;
  onActiveClassIdChange: (classId: number) => void;
  onOpenClassMenuIdChange: React.Dispatch<React.SetStateAction<string | null>>;
  onToggleShapeHidden: (shapeId: string) => void;
  onToggleShapePinned: (shapeId: string) => void;
  onSelect: (shapeId: string) => void;
}) {
  const currentLabel = labels.find((item) => item.id === shape.classLabelId);
  const name = currentLabel?.name ?? "?";
  const color = currentLabel?.color ?? "#999";
  const rowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isSelected]);

  return (
    <motion.div
      ref={rowRef}
      animate={
        isSelected
          ? { boxShadow: [`0 0 0px ${color}00`, `0 0 12px ${color}88`, `0 0 6px ${color}44`] }
          : { boxShadow: `0 0 0px ${color}00` }
      }
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`group space-y-1 rounded-2xl border p-2.5 transition-colors
        hover:bg-white ${isSelected ? "ring-2 ring-orange-400/60" : ""}`}
      style={{
        borderColor: isSelected ? `${color}99` : `${color}55`,
        backgroundColor: isSelected ? `${color}33` : `${color}0F`,
      }}
    >
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => {
          onSelect(shape.clientId);
          onActiveClassIdChange(shape.classLabelId);
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-black tabular-nums",
              "text-stone-700",
            ].join(" ")}
          >
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
    </motion.div>
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
          className={[
            "flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200",
            "bg-white px-3.5 py-2.5 text-left text-sm font-semibold normal-case tracking-normal",
            "text-stone-800 shadow-sm shadow-stone-200/50 outline-none transition",
            "hover:border-stone-400 hover:bg-white focus:border-stone-400",
          ].join(" ")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{name}</span>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
          />
        </button>
        {isOpen && (
          <div
            className={[
              "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto",
              "rounded-xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-300/30",
            ].join(" ")}
          >
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
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm
        font-semibold normal-case tracking-normal transition ${
          selected ? "bg-white text-stone-800" : "text-stone-300 hover:bg-stone-50 hover:text-stone-900"
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
    {
      icon: <ChevronsLeft className="h-4 w-4" />,
      label: "Back 10",
      action: () => onNavigateTo(current - 10, { wrap: true }),
    },
    {
      icon: <ChevronLeft className="h-4 w-4" />,
      label: "Prev",
      action: () => onNavigateTo(current - 1, { wrap: true }),
    },
    { icon: <Play className="h-4 w-4" />, label: "Play", action: () => {} },
    {
      icon: <ChevronRight className="h-4 w-4" />,
      label: "Next",
      action: () => onNavigateTo(current + 1, { wrap: true }),
    },
    {
      icon: <ChevronsRight className="h-4 w-4" />,
      label: "Forward 10",
      action: () => onNavigateTo(current + 10, { wrap: true }),
    },
    { icon: <ChevronLast className="h-4 w-4" />, label: "Last", action: () => onNavigateTo(total || 1) },
  ];

  return (
    <div
      className={[
        "z-30 flex select-none items-center gap-3 border-t border-stone-200/80 bg-white/95 px-4",
        "py-1 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl",
      ].join(" ")}
      style={{ width: "100%", flexShrink: 0, flexGrow: 0 }}
    >
      <div className="flex items-center gap-1.5">
        {controls.map(({ icon, label, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={action}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition",
              "hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200",
            ].join(" ")}
          >
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
          className={[
            "h-2 w-full cursor-pointer touch-none appearance-none rounded-full bg-stone-200",
            "accent-orange-500 transition-[background] duration-200",
          ].join(" ")}
          style={{
            background: [
              "linear-gradient(to right, #f97316 0%",
              `#f97316 ${sliderProgress}%`,
              `#e7e5e4 ${sliderProgress}%`,
              "#e7e5e4 100%)",
            ].join(", "),
          }}
        />
      </div>

      <div className="flex w-48 shrink-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-600" title={currentFilename}>
          {currentFilename || fallbackName}
        </span>
        <button
          type="button"
          title="Copy link"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition",
            "hover:bg-stone-100 hover:text-stone-700",
          ].join(" ")}
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Delete annotation"
          onClick={onClearShapes}
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition",
            "hover:bg-red-50 hover:text-red-500",
          ].join(" ")}
        >
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
          className={[
            "no-number-spinner w-12 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1",
            "text-center text-xs font-bold tabular-nums text-stone-800 outline-none",
            "focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25",
          ].join(" ")}
        />
        {total > 0 && <span className="text-xs font-bold text-stone-400">/ {total}</span>}
      </div>
    </div>
  );
}
