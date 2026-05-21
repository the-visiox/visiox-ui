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
    <nav className="z-30 flex items-center justify-between gap-4 border-b border-stone-200/80 bg-white/90 px-6 py-4 shadow-sm shadow-stone-200/40 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-xl p-2.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="h-8 w-px shrink-0 bg-stone-200" />
        <div className="hidden min-w-0 sm:block">
          <h1 className="text-lg font-bold leading-none text-stone-900">Annotation workspace</h1>
          <p className="mt-1.5 truncate text-xs font-bold uppercase tracking-widest text-orange-600">
            Dataset {datasetId}
            {modeText}
            {saveText}
          </p>
        </div>
        <div className="hidden h-8 w-px shrink-0 bg-stone-200 sm:block" />
        <div className="flex items-center gap-1 rounded-xl p-1">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400">
            <Undo2 className="h-6 w-6" />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-white/80 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400">
            <Redo2 className="h-6 w-6" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex shrink-0 items-center gap-2.5 rounded-xl bg-orange-500 px-5 py-2.5 text-lg font-bold text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5" />}
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
      style={{ width }}
    >
      <div className="flex flex-col gap-2 p-1.5">
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
      className={`inline-flex h-16 w-16 self-center flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${
        isActive
          ? "border border-orange-200 bg-orange-50 text-orange-700 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/25"
          : "border border-transparent text-stone-500 hover:border-stone-200 hover:bg-white hover:text-stone-900 hover:shadow-sm"
      }`}
    >
      {icon}
      <span className="w-full truncate px-1 text-center leading-none">{label}</span>
    </button>
  );

  if (!hasPointCount) return button;

  return (
    <div className="flex w-16 self-center flex-col gap-1.5">
      {button}
      {isActive && (
        <label className="flex w-16 flex-col gap-1.5 rounded-xl border border-orange-200 bg-white px-2 py-2.5 shadow-sm shadow-orange-100/60">
          <span className="text-center text-[9px] font-bold uppercase leading-none tracking-wider text-stone-500">
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
    <div className="relative flex min-h-0 min-w-0 flex-grow items-stretch justify-stretch overflow-hidden p-4">
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
  onPickLabelColor,
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
  onPickLabelColor: (e: React.MouseEvent<HTMLInputElement>) => void;
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
      className="z-20 grid h-full shrink-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-l border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/30 backdrop-blur-xl"
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
            onPickLabelColor={onPickLabelColor}
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
    <div className="mb-5 flex items-center justify-between gap-2 border-b border-stone-200">
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
  onPickLabelColor,
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
  onPickLabelColor: (e: React.MouseEvent<HTMLInputElement>) => void;
  onCreateLabel: (e: React.FormEvent) => void;
  onDeleteLabel: (label: LabelDefinition) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4">
      <div className="mb-3 shrink-0 text-[14px] font-bold uppercase tracking-widest text-stone-500">Classes</div>
      <form onSubmit={onCreateLabel} className="mb-3 flex shrink-0 items-center gap-2">
        <input
          type="color"
          value={newLabelColor}
          onChange={(e) => onNewLabelColorChange(e.target.value)}
          onClick={(e) => void onPickLabelColor(e)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
          title="Pick label color"
          aria-label="Pick label color"
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
      <div className="custom-scrollbar min-h-0 flex-1 max-h-[70vh] space-y-2 overflow-y-auto overscroll-contain pr-2">
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
      <div className="custom-scrollbar min-h-0 flex-1 max-h-[70vh] space-y-3 overflow-y-auto overscroll-contain pr-2">
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
    { icon: <ChevronFirst className="h-5 w-5" />, label: "First", action: () => onNavigateTo(1) },
    { icon: <ChevronsLeft className="h-5 w-5" />, label: "Back 10", action: () => onNavigateTo(current - 10, { wrap: true }) },
    { icon: <ChevronLeft className="h-5 w-5" />, label: "Prev", action: () => onNavigateTo(current - 1, { wrap: true }) },
    { icon: <Play className="h-5 w-5" />, label: "Play", action: () => {} },
    { icon: <ChevronRight className="h-5 w-5" />, label: "Next", action: () => onNavigateTo(current + 1, { wrap: true }) },
    { icon: <ChevronsRight className="h-5 w-5" />, label: "Forward 10", action: () => onNavigateTo(current + 10, { wrap: true }) },
    { icon: <ChevronLast className="h-5 w-5" />, label: "Last", action: () => onNavigateTo(total || 1) },
  ];

  return (
    <div className="z-30 flex shrink-0 select-none items-center gap-4 border-t border-stone-200/80 bg-white/95 px-6 py-4 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        {controls.map(({ icon, label, action }) => (
          <button key={label} type="button" title={label} onClick={action} className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200">
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

      <div className="flex w-[18rem] shrink-0 items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-600" title={currentFilename}>
          {currentFilename || fallbackName}
        </span>
        <button type="button" title="Copy link" onClick={() => navigator.clipboard?.writeText(window.location.href)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
          <Link2 className="h-5 w-5" />
        </button>
        <button type="button" title="Delete annotation" onClick={onClearShapes} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-5 w-5" />
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
          className="no-number-spinner w-12 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-center text-sm font-bold tabular-nums text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
        />
        {total > 0 && <span className="text-sm font-bold text-stone-400">/ {total}</span>}
      </div>
    </div>
  );
}


