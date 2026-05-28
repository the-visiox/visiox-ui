"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Circle, Group, Rect, Line, Text, Transformer } from "react-konva";
import useImage from "use-image";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  bboxFromPoints,
  buildLabelMetaMap,
  clamp,
  colorFromMap,
  labelNameFromMap,
} from "@/lib/annotation";
import type { EditorShape, LabelDefinition, Tool } from "@/lib/annotation";

export type { Tool };

interface AnnotationEditorProps {
  imageUrl: string;
  labels: LabelDefinition[];
  activeClassId: number;
  onActiveClassIdChange: (classId: number) => void;
  shapes: EditorShape[];
  onShapesChange: React.Dispatch<React.SetStateAction<EditorShape[]>>;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  polygonVertexCount: number;
  hiddenShapeIds?: string[];
  pinnedShapeIds?: string[];
}

function layerPos(
  e: KonvaEventObject<MouseEvent>,
  stageX: number,
  stageY: number,
  stageScale: number,
  imageW: number,
  imageH: number
) {
  const stage = e.target.getStage();
  if (!stage) return null;
  const pos = stage.getRelativePointerPosition();
  if (!pos) return null;
  return {
    x: clamp((pos.x - stageX) / stageScale, 0, imageW),
    y: clamp((pos.y - stageY) / stageScale, 0, imageH),
  };
}

function isCanvasBackground(e: KonvaEventObject<MouseEvent>): boolean {
  const t = e.target;
  const name = typeof t.name === "function" ? t.name() : "";
  return t === t.getStage() || name === "background-image" || name === "stage-background";
}

function menuPositionFromPointer(evt: MouseEvent | PointerEvent, container: HTMLDivElement | null) {
  if (!container) {
    return { x: evt.clientX, y: evt.clientY };
  }
  const rect = container.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

const RECT_MIN_SIZE = 5;
const ZOOM_MIN = 0.12;
const ZOOM_MAX = 10;
const CORNER_HANDLE_RADIUS_PX = 4.5;
const CORNER_HANDLE_HOVER_RADIUS_PX = 5.5;
const CORNER_HANDLE_DIAMETER_PX = CORNER_HANDLE_RADIUS_PX * 2;
const TAG_HEIGHT = 26;
const TAG_MIN_WIDTH = 88;
const PINNED_LABEL_HEIGHT = 22;
const PINNED_LABEL_MIN_WIDTH = 54;

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  imageUrl,
  labels,
  activeClassId,
  onActiveClassIdChange,
  shapes,
  onShapesChange,
  activeTool,
  onToolChange,
  polygonVertexCount,
  hiddenShapeIds = [],
  pinnedShapeIds = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [image] = useImage(imageUrl, "anonymous");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [newBox, setNewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pathDraft, setPathDraft] = useState<number[]>([]);
  const pathDraftRef = useRef(pathDraft);
  const [pathHover, setPathHover] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<{ shapeId: string; vertexIndex: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [zoomMul, setZoomMul] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isMiddlePan, setIsMiddlePan] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ shapeId: string; x: number; y: number } | null>(null);
  const panOffsetRef = useRef(panOffset);
  const panOriginRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);
  const transformStartRef = useRef<{ id: string; x: number; y: number; width: number; height: number } | null>(null);
  const MENU_WIDTH = 192;
  const MENU_HEIGHT = 220;
  const MENU_GAP = 8;

  const imageW = image?.width ?? 0;
  const imageH = image?.height ?? 0;
  const containerW = dimensions.width;
  const containerH = dimensions.height;
  const baseFit = useMemo(() => {
    if (!imageW || !imageH || containerW <= 0 || containerH <= 0) {
      return { scale: 1, x: 0, y: 0 };
    }
    const scale = Math.min(containerW / imageW, containerH / imageH);
    return {
      scale,
      x: (containerW - imageW * scale) / 2,
      y: (containerH - imageH * scale) / 2,
    };
  }, [imageW, imageH, containerW, containerH]);
  const layerScale = baseFit.scale * zoomMul;
  const layerX = baseFit.x + panOffset.x;
  const layerY = baseFit.y + panOffset.y;

  const fitToWindow = useCallback(() => {
    setZoomMul(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const trRef = useRef<Konva.Transformer | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  useEffect(() => {
    pathDraftRef.current = pathDraft;
  }, [pathDraft]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setNewBox(null);
      setPathDraft([]);
      setPathHover(null);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTool]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      setDimensions((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    updateSize();
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && containerRef.current
        ? new ResizeObserver(updateSize)
        : null;
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateSize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    if (!isMiddlePan) return;
    const onMove = (e: MouseEvent) => {
      const origin = panOriginRef.current;
      if (!origin) return;
      setPanOffset({
        x: origin.ox + (e.clientX - origin.cx),
        y: origin.oy + (e.clientY - origin.cy),
      });
    };
    const onUp = () => {
      panOriginRef.current = null;
      setIsMiddlePan(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isMiddlePan]);

  const labelMetaMap = useMemo(() => buildLabelMetaMap(labels), [labels]);
  const getShapeColor = useCallback((classLabelId: number) => colorFromMap(labelMetaMap, classLabelId), [labelMetaMap]);
  const getShapeLabel = useCallback((classLabelId: number) => labelNameFromMap(labelMetaMap, classLabelId), [labelMetaMap]);

  const transformTargetId = useMemo(
    () => selectedId ?? (activeTool === "select" ? hoveredId : null),
    [selectedId, hoveredId, activeTool]
  );
  const transformTargetShape = useMemo(
    () =>
      shapes.find(
        (shape) => shape.clientId === transformTargetId && !hiddenShapeIds.includes(shape.clientId)
      ) ?? null,
    [hiddenShapeIds, shapes, transformTargetId]
  );
  const transformerColor = transformTargetShape ? getShapeColor(transformTargetShape.classLabelId) : "#ea580c";

  const applyShapeClass = useCallback(
    (clientId: string, classId: number) => {
      onShapesChange((prev) =>
        prev.map((shape) => (shape.clientId === clientId ? { ...shape, classLabelId: classId } : shape))
      );
      setSelectedId(clientId);
      onActiveClassIdChange(classId);
      setContextMenu(null);
    },
    [onActiveClassIdChange, onShapesChange]
  );

  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    if (!transformTargetId) {
      trRef.current.nodes([]);
      return;
    }
    const node = layerRef.current.findOne(`#${transformTargetId}`);
    const className =
      node && typeof (node as { getClassName?: () => string }).getClassName === "function"
        ? (node as { getClassName: () => string }).getClassName()
        : "";
    const isTransformable = className === "Rect" && transformTargetShape?.shapeType === "rectangle";
    if (!node || !isTransformable) {
      trRef.current.nodes([]);
      return;
    }
    trRef.current.nodes([node]);
    trRef.current.getLayer()?.batchDraw();
  }, [transformTargetId, transformTargetShape]);

  const deleteShape = useCallback(
    (id: string) => {
      onShapesChange((prev) => prev.filter((shape) => shape.clientId !== id));
      setSelectedId((current) => (current === id ? null : current));
      setHoveredId((current) => (current === id ? null : current));
    },
    [onShapesChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (contextMenu) {
        if (e.key === "Escape") {
          e.preventDefault();
          setContextMenu(null);
          return;
        }
      }
      if (e.key === "Escape" && pathDraft.length > 0) {
        e.preventDefault();
        setPathDraft([]);
        setPathHover(null);
        return;
      }
      if (e.key === "Escape" && newBox) {
        e.preventDefault();
        setNewBox(null);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "v") onToolChange("select");
      if (k === "n") onToolChange("rectangle");
      if (k === "p") onToolChange("polygon");
      if (k === "l") onToolChange("polyline");
      if (k === "k") onToolChange("points");
      if (k === "c") onToolChange("cuboid");
      if (k === "t") onToolChange("tag");
      if (e.key === "Delete" || e.key === "Backspace" || k === "d") {
        const target = selectedId ?? hoveredId;
        if (target) {
          e.preventDefault();
          deleteShape(target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextMenu, deleteShape, hoveredId, newBox, onToolChange, pathDraft.length, selectedId]);

  const checkDeselect = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (isCanvasBackground(e)) {
      setSelectedId(null);
      setContextMenu(null);
    }
  }, []);

  const selectShape = useCallback((clientId: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activeTool !== "select") return;
    e.cancelBubble = true;
    setSelectedId(clientId);
  }, [activeTool]);

  const openShapeClassMenu = useCallback((clientId: string, e: KonvaEventObject<MouseEvent | PointerEvent>) => {
    if (activeTool !== "select") return;
    e.evt.preventDefault();
    e.cancelBubble = true;
    const pos = menuPositionFromPointer(e.evt, containerRef.current);
    setSelectedId(clientId);
    setContextMenu({
      shapeId: clientId,
      x: pos.x,
      y: pos.y,
    });
  }, [activeTool]);

  const clampRectToImage = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const safeW = Math.max(RECT_MIN_SIZE, Math.min(width, imageW));
      const safeH = Math.max(RECT_MIN_SIZE, Math.min(height, imageH));
      return {
        x: clamp(x, 0, Math.max(0, imageW - safeW)),
        y: clamp(y, 0, Math.max(0, imageH - safeH)),
        width: safeW,
        height: safeH,
      };
    },
    [imageW, imageH]
  );

  const updatePointGeometry = useCallback(
    (clientId: string, vertexIndex: number, x: number, y: number) => {
      onShapesChange((prev) => {
        const idx = prev.findIndex((shape) => shape.clientId === clientId);
        if (idx < 0) return prev;
        const shape = prev[idx];
        if (!shape.points || shape.points.length < (vertexIndex + 1) * 2) return prev;
        const nextPoints = shape.points.slice();
        nextPoints[vertexIndex * 2] = clamp(x, 0, imageW);
        nextPoints[vertexIndex * 2 + 1] = clamp(y, 0, imageH);
        const next = prev.slice();
        next[idx] = { ...shape, ...bboxFromPoints(nextPoints), points: nextPoints };
        return next;
      });
    },
    [onShapesChange, imageW, imageH]
  );

  const canDrawRect = activeTool === "rectangle" && labels.length > 0;
  const canDrawPath = (activeTool === "polygon" || activeTool === "polyline") && labels.length > 0;
  const canPlacePoint = activeTool === "points" && labels.length > 0;
  const canPlaceTag = activeTool === "tag" && labels.length > 0;
  const vertexCount = Math.max(activeTool === "polyline" ? 2 : 3, Math.min(64, Math.round(polygonVertexCount)));

  const appendPathVertex = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!image || imageW < 1 || imageH < 1) return;
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (!pos) return;

      if (pathDraftRef.current.length === 0) {
        setSelectedId(null);
      }

      const nextPoints = [...pathDraftRef.current, pos.x, pos.y];
      const required = vertexCount * 2;
      if (nextPoints.length < required) {
        pathDraftRef.current = nextPoints;
        setPathDraft(nextPoints);
        return;
      }

      const points = nextPoints.slice(0, required);
      const box = bboxFromPoints(points);
      const classId = labels.some((label) => label.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
      const shape: EditorShape = {
        clientId: `${activeTool}-${Date.now()}`,
        shapeType: activeTool === "polyline" ? "polyline" : "polygon",
        classLabelId: classId,
        ...box,
        points,
      };
      pathDraftRef.current = [];
      setPathDraft([]);
      setPathHover(null);
      onShapesChange((prev) => [...prev, shape]);
      onToolChange("select");
    },
    [image, imageW, imageH, layerX, layerY, layerScale, vertexCount, labels, activeClassId, activeTool, onShapesChange, onToolChange]
  );

  const placeSingleShape = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!image || imageW < 1 || imageH < 1) return;
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (!pos) return;
      setSelectedId(null);
      const classId = labels.some((label) => label.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
      const shape: EditorShape = canPlaceTag
        ? {
            clientId: `tag-${Date.now()}`,
            shapeType: "tag",
            classLabelId: classId,
            x: pos.x,
            y: pos.y,
            width: TAG_MIN_WIDTH,
            height: TAG_HEIGHT,
          }
        : {
            clientId: `pt-${Date.now()}`,
            shapeType: "points",
            classLabelId: classId,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            points: [pos.x, pos.y],
          };
      onShapesChange((prev) => [...prev, shape]);
      onToolChange("select");
    },
    [image, imageW, imageH, layerX, layerY, layerScale, labels, activeClassId, canPlaceTag, onShapesChange, onToolChange]
  );

  const handleStageMouseDown = () => {
    /* tool actions live in handleStageClick so that drag on a shape (which suppresses click) doesn't accidentally fire them */
  };

  const performRectClick = (e: KonvaEventObject<MouseEvent>) => {
    const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
    if (!pos) return;

    if (!newBox) {
      if (selectedId) setSelectedId(null);
      setNewBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    const x = newBox.width < 0 ? newBox.x + newBox.width : newBox.x;
    const y = newBox.height < 0 ? newBox.y + newBox.height : newBox.y;
    const width = Math.abs(newBox.width);
    const height = Math.abs(newBox.height);
    if (width <= RECT_MIN_SIZE || height <= RECT_MIN_SIZE) {
      setNewBox(null);
      return;
    }
    const classId = labels.some((label) => label.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
    const box: EditorShape = {
      clientId: `box-${Date.now()}`,
      shapeType: "rectangle",
      classLabelId: classId,
      x,
      y,
      width,
      height,
    };
    onShapesChange((prev) => [...prev, box]);
    setNewBox(null);
    onToolChange("select");
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isMiddlePan) return;
    if (canDrawPath && pathDraft.length > 0) {
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (pos) setPathHover(pos);
    }
    if (!newBox) return;
    const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
    if (!pos) return;
    setNewBox({ ...newBox, width: pos.x - newBox.x, height: pos.y - newBox.y });
  };

  const handleMouseUp = () => {
    /* box drawing is two-click — finalize happens in handleStageClick */
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (newBox) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const dir = e.evt.deltaY > 0 ? -1 : 1;
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomMul * (1 + 0.1 * dir)));
    if (nextZoom === zoomMul) return;
    const imgX = (pointer.x - layerX) / layerScale;
    const imgY = (pointer.y - layerY) / layerScale;
    const nextScale = baseFit.scale * nextZoom;
    setZoomMul(nextZoom);
    setPanOffset({
      x: pointer.x - baseFit.x - imgX * nextScale,
      y: pointer.y - baseFit.y - imgY * nextScale,
    });
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (isMiddlePan || e.evt.button !== 0) return;
    if (canDrawPath) {
      appendPathVertex(e);
      return;
    }
    if (canPlacePoint || canPlaceTag) {
      placeSingleShape(e);
      return;
    }
    if (canDrawRect) {
      performRectClick(e);
      return;
    }
    checkDeselect(e);
  };

  const visibleDraft = activeTool === "polygon" || activeTool === "polyline" ? pathDraft : [];
  const previewPoints = visibleDraft.length > 0 && pathHover ? [...visibleDraft, pathHover.x, pathHover.y] : visibleDraft;
  const hoverEnabled = activeTool === "select";
  const safeLayerScale = Math.max(layerScale, 0.001);
  const transformerAnchorPx = CORNER_HANDLE_DIAMETER_PX;
  const shapeDragEnabled = activeTool === "select" && visibleDraft.length === 0 && !newBox;
  const pathVertexEditingEnabled =
    (activeTool === "select" || activeTool === "polygon" || activeTool === "polyline") && visibleDraft.length === 0 && !newBox;
  const cursorClass = isMiddlePan
    ? "cursor-grabbing"
    : canDrawRect || canDrawPath || canPlacePoint || canPlaceTag
      ? "cursor-crosshair"
      : "cursor-default";
  const zoomPct = Math.round(zoomMul * 100);

  return (
    <div
      onMouseDown={(e) => {
        const isMiddle = e.button === 1;
        const isCtrlLeft = e.button === 0 && e.ctrlKey;
        if (!isMiddle && !isCtrlLeft) return;
        e.preventDefault();
        panOriginRef.current = {
          cx: e.clientX,
          cy: e.clientY,
          ox: panOffsetRef.current.x,
          oy: panOffsetRef.current.y,
        };
        setIsMiddlePan(true);
      }}
      className={`relative h-full min-h-0 w-full bg-stone-100 p-6 shadow-xl shadow-stone-200/50 ${cursorClass}`}
      onContextMenu={(e) => {
        if (!contextMenu) return;
        e.preventDefault();
      }}
    >
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <div className="absolute right-3 top-3 z-[120] flex flex-col gap-1.5 rounded-2xl border border-stone-200/90 bg-white/95 p-1.5 shadow-lg shadow-stone-300/40 backdrop-blur-sm">
        <button type="button" title="Fit to window" onClick={fitToWindow} className="flex h-12 w-12 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <Maximize2 className="h-[22px] w-[22px]" />
        </button>
        <button type="button" title="Zoom in" onClick={() => {
          const nextZoom = Math.min(ZOOM_MAX, zoomMul * 1.2);
          if (nextZoom === zoomMul) return;
          const cx = containerW / 2;
          const cy = containerH / 2;
          const imgX = (cx - layerX) / layerScale;
          const imgY = (cy - layerY) / layerScale;
          const nextScale = baseFit.scale * nextZoom;
          setZoomMul(nextZoom);
          setPanOffset({
            x: cx - baseFit.x - imgX * nextScale,
            y: cy - baseFit.y - imgY * nextScale,
          });
        }} className="flex h-12 w-12 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <ZoomIn className="h-[22px] w-[22px]" />
        </button>
        <button type="button" title="Zoom out" onClick={() => {
          const nextZoom = Math.max(ZOOM_MIN, zoomMul / 1.2);
          if (nextZoom === zoomMul) return;
          const cx = containerW / 2;
          const cy = containerH / 2;
          const imgX = (cx - layerX) / layerScale;
          const imgY = (cy - layerY) / layerScale;
          const nextScale = baseFit.scale * nextZoom;
          setZoomMul(nextZoom);
          setPanOffset({
            x: cx - baseFit.x - imgX * nextScale,
            y: cy - baseFit.y - imgY * nextScale,
          });
        }} className="flex h-12 w-12 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <ZoomOut className="h-[22px] w-[22px]" />
        </button>
        <span className="px-1 pb-1 text-center text-[11px] font-bold tabular-nums text-stone-500">{zoomPct}%</span>
      </div>

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleStageClick}
      >
        <Layer ref={layerRef} scaleX={layerScale} scaleY={layerScale} x={layerX} y={layerY}>
          {image && <KonvaImage image={image} name="background-image" listening />}
          {image && <Rect name="stage-background" x={0} y={0} width={image.width} height={image.height} fill="transparent" listening />}

          {shapes.map((shape) => {
            if (hiddenShapeIds.includes(shape.clientId)) return null;
            const stroke = getShapeColor(shape.classLabelId);
            const shapeLabel = getShapeLabel(shape.classLabelId);
            const isHovered = hoverEnabled && hoveredId === shape.clientId;
            const isSelected = selectedId === shape.clientId;
            const livePos = dragPreview[shape.clientId];
            const shapeX = livePos?.x ?? shape.x;
            const shapeY = livePos?.y ?? shape.y;
            const shapePointerEnabled = true;
            const isPinned = pinnedShapeIds.includes(shape.clientId);
            const showFloatingLabel = (isHovered || isPinned) && shape.shapeType !== "tag";
            const floatingLabelWidth = Math.max(PINNED_LABEL_MIN_WIDTH, shapeLabel.length * 7 + 18) / safeLayerScale;
            const floatingLabelHeight = PINNED_LABEL_HEIGHT / safeLayerScale;
            const floatingLabelGap = 4 / safeLayerScale;
            const getFloatingLabelPosition = (nextShapeX: number, nextShapeY: number, nextShapeHeight: number) => {
              const aboveY = nextShapeY - floatingLabelHeight - floatingLabelGap;
              const belowY = nextShapeY + Math.max(0, nextShapeHeight) + floatingLabelGap;
              return {
                x: clamp(nextShapeX, 0, Math.max(0, imageW - floatingLabelWidth)),
                y: clamp(aboveY >= 0 ? aboveY : belowY, 0, Math.max(0, imageH - floatingLabelHeight)),
              };
            };
            const floatingLabelPosition = getFloatingLabelPosition(shapeX, shapeY, shape.height);
            const syncFloatingLabelPosition = (nextShapeX: number, nextShapeY: number, nextShapeHeight = shape.height) => {
              const labelNode = layerRef.current?.findOne(`#${shape.clientId}-floating-label`);
              if (!labelNode) return;
              labelNode.position(getFloatingLabelPosition(nextShapeX, nextShapeY, nextShapeHeight));
              layerRef.current?.batchDraw();
            };
            const floatingLabel = showFloatingLabel ? (
              <Group
                key={`${shape.clientId}-floating-label`}
                id={`${shape.clientId}-floating-label`}
                x={floatingLabelPosition.x}
                y={floatingLabelPosition.y}
                listening={false}
              >
                <Rect
                  x={0}
                  y={0}
                  width={floatingLabelWidth}
                  height={floatingLabelHeight}
                  cornerRadius={6 / safeLayerScale}
                  fill="#ffffff"
                  stroke={stroke}
                  strokeWidth={1 / safeLayerScale}
                  shadowColor="#000000"
                  shadowOpacity={0.12}
                  shadowBlur={8 / safeLayerScale}
                  shadowOffsetY={2 / safeLayerScale}
                  listening={false}
                />
                <Text
                  x={8 / safeLayerScale}
                  y={5 / safeLayerScale}
                  text={shapeLabel}
                  fontSize={10 / safeLayerScale}
                  fontStyle="bold"
                  fill={stroke}
                  listening={false}
                />
              </Group>
            ) : null;

            if (shape.shapeType === "tag") {
              const width = Math.max(TAG_MIN_WIDTH, shapeLabel.length * 9 + 28) / safeLayerScale;
              const height = TAG_HEIGHT / safeLayerScale;
              return (
                <React.Fragment key={shape.clientId}>
                  <Rect
                    id={shape.clientId}
                    x={shapeX}
                    y={shapeY}
                    width={width}
                    height={height}
                    cornerRadius={height / 2}
                    fill={stroke}
                    opacity={0.96}
                    stroke={isSelected ? "#ffffff" : stroke}
                    strokeWidth={(isSelected ? 2 : 1) / safeLayerScale}
                    draggable={shapeDragEnabled}
                    listening={shapePointerEnabled}
                    onMouseDown={(e) => selectShape(shape.clientId, e)}
                    onTap={(e) => selectShape(shape.clientId, e)}
                    onContextMenu={(e) => openShapeClassMenu(shape.clientId, e)}
                    onMouseEnter={() => {
                      setHoveredId(shape.clientId);
                    }}
                    onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                    onDragMove={(ev) => {
                      const node = ev.target;
                      const nextX = clamp(node.x(), 0, Math.max(0, imageW - width));
                      const nextY = clamp(node.y(), 0, Math.max(0, imageH - height));
                      if (nextX !== node.x() || nextY !== node.y()) node.position({ x: nextX, y: nextY });
                      syncFloatingLabelPosition(nextX, nextY);
                      setDragPreview((prev) => ({ ...prev, [shape.clientId]: { x: nextX, y: nextY } }));
                    }}
                    onDragEnd={(ev) => {
                      const node = ev.target;
                      setDragPreview((prev) => {
                        const next = { ...prev };
                        delete next[shape.clientId];
                        return next;
                      });
                      onShapesChange((prev) => {
                        const idx = prev.findIndex((item) => item.clientId === shape.clientId);
                        if (idx < 0) return prev;
                        const next = prev.slice();
                        next[idx] = {
                          ...prev[idx],
                          x: clamp(node.x(), 0, Math.max(0, imageW - width)),
                          y: clamp(node.y(), 0, Math.max(0, imageH - height)),
                        };
                        return next;
                      });
                    }}
                  />
                  <Text x={shapeX + 12 / safeLayerScale} y={shapeY + 7 / safeLayerScale} text={shapeLabel} fontSize={11 / safeLayerScale} fontStyle="bold" fill="#ffffff" listening={false} />
                </React.Fragment>
              );
            }

            if (shape.shapeType !== "rectangle" && shape.points && shape.points.length >= 2) {
              const isClosed = shape.shapeType === "polygon";
              const isPointsShape = shape.shapeType === "points";
              const pathCenterX = shape.x + shape.width / 2;
              const pathCenterY = shape.y + shape.height / 2;
              return (
                <React.Fragment key={shape.clientId}>
                  {!isPointsShape && (
                    <Line
                      id={shape.clientId}
                      name="path-shape"
                      points={shape.points}
                      closed={isClosed}
                      fill={isClosed ? `${stroke}${isHovered ? "55" : "22"}` : undefined}
                      stroke={stroke}
                      strokeWidth={(isHovered ? 4 : 2) / layerScale}
                      lineJoin="round"
                      perfectDrawEnabled={false}
                      draggable={shapeDragEnabled}
                      listening={shapePointerEnabled}
                      onMouseDown={(e) => selectShape(shape.clientId, e)}
                        onTap={(e) => selectShape(shape.clientId, e)}
                      onContextMenu={(e) => openShapeClassMenu(shape.clientId, e)}
                      onMouseEnter={() => {
                        setHoveredId(shape.clientId);
                      }}
                      onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                      onDragMove={(ev) => {
                        const node = ev.target;
                        const nextX = shape.x + node.x();
                        const nextY = shape.y + node.y();
                        syncFloatingLabelPosition(nextX, nextY);
                        setDragPreview((prev) => ({
                          ...prev,
                          [shape.clientId]: { x: nextX, y: nextY },
                        }));
                      }}
                      onDragEnd={(ev) => {
                        const node = ev.target;
                        const dx = node.x();
                        const dy = node.y();
                        node.position({ x: 0, y: 0 });
                        const nextPoints = shape.points!.map((value, index) =>
                          index % 2 === 0 ? clamp(value + dx, 0, imageW) : clamp(value + dy, 0, imageH)
                        );
                        setDragPreview((prev) => {
                          const next = { ...prev };
                          delete next[shape.clientId];
                          return next;
                        });
                        onShapesChange((prev) => {
                          const idx = prev.findIndex((item) => item.clientId === shape.clientId);
                          if (idx < 0) return prev;
                          const next = prev.slice();
                          next[idx] = { ...prev[idx], ...bboxFromPoints(nextPoints), points: nextPoints };
                          return next;
                        });
                      }}
                    />
                  )}
                  {(isPointsShape || isSelected || (pathVertexEditingEnabled && hoveredId === shape.clientId)) && Array.from({ length: shape.points.length / 2 }, (_, vertexIndex) => {
                    const vx = shape.points![vertexIndex * 2] + (shapeX - shape.x);
                    const vy = shape.points![vertexIndex * 2 + 1] + (shapeY - shape.y);
                    const isCornerHovered = pathVertexEditingEnabled && hoveredCorner?.shapeId === shape.clientId && hoveredCorner.vertexIndex === vertexIndex;
                    const resizeCursor = (vx - pathCenterX) * (vy - pathCenterY) >= 0 ? "nwse-resize" : "nesw-resize";
                    return (
                      <Circle
                        key={`${shape.clientId}-v-${vertexIndex}`}
                        x={vx}
                        y={vy}
                        radius={(isCornerHovered || isPointsShape ? CORNER_HANDLE_HOVER_RADIUS_PX : CORNER_HANDLE_RADIUS_PX) / layerScale}
                        fill={isPointsShape ? stroke : isCornerHovered ? "#ffedd5" : "#ffffff"}
                        stroke={stroke}
                        strokeWidth={(isCornerHovered ? 2 : 1.5) / layerScale}
                        draggable={pathVertexEditingEnabled}
                        listening={shapePointerEnabled}
                        onMouseEnter={(e) => {
                          setHoveredCorner({ shapeId: shape.clientId, vertexIndex });
                          const stage = e.target.getStage();
                          if (stage) stage.container().style.cursor = resizeCursor;
                        }}
                        onMouseLeave={(e) => {
                          const stage = e.target.getStage();
                          if (stage) stage.container().style.cursor = "";
                          setHoveredCorner((prev) =>
                            prev?.shapeId === shape.clientId && prev.vertexIndex === vertexIndex ? null : prev
                          );
                        }}
                        onMouseDown={(e) => {
                          if (!pathVertexEditingEnabled) return;
                          e.cancelBubble = true;
                          setSelectedId(shape.clientId);
                        }}
                        onContextMenu={(e) => openShapeClassMenu(shape.clientId, e)}
                        onTap={(e) => {
                          if (!pathVertexEditingEnabled) return;
                          e.cancelBubble = true;
                          setSelectedId(shape.clientId);
                        }}
                        onDragMove={(e) => updatePointGeometry(shape.clientId, vertexIndex, e.target.x(), e.target.y())}
                        onDragEnd={(e) => updatePointGeometry(shape.clientId, vertexIndex, e.target.x(), e.target.y())}
                      />
                    );
                  })}
                  {floatingLabel}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={shape.clientId}>
                <Rect
                  id={shape.clientId}
                  x={shapeX}
                  y={shapeY}
                  width={shape.width}
                  height={shape.height}
                  fill={`${stroke}${isHovered ? "55" : "22"}`}
                  stroke={stroke}
                  strokeWidth={(isHovered ? 3 : 1.25) / layerScale}
                  perfectDrawEnabled={false}
                  draggable={shapeDragEnabled}
                  listening={shapePointerEnabled}
                  onMouseDown={(e) => selectShape(shape.clientId, e)}
                  onTap={(e) => selectShape(shape.clientId, e)}
                  onContextMenu={(e) => openShapeClassMenu(shape.clientId, e)}
                  onMouseEnter={() => {
                    setHoveredId(shape.clientId);
                  }}
                  onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                  onDragMove={(ev) => {
                    const node = ev.target;
                    const bounded = clampRectToImage(node.x(), node.y(), shape.width, shape.height);
                    if (bounded.x !== node.x() || bounded.y !== node.y()) node.position({ x: bounded.x, y: bounded.y });
                    syncFloatingLabelPosition(bounded.x, bounded.y);
                    setDragPreview((prev) => ({ ...prev, [shape.clientId]: { x: bounded.x, y: bounded.y } }));
                  }}
                  onDragEnd={(ev) => {
                    const node = ev.target;
                    const nextX = clamp(node.x(), 0, Math.max(0, imageW - shape.width));
                    const nextY = clamp(node.y(), 0, Math.max(0, imageH - shape.height));
                    setDragPreview((prev) => {
                      const next = { ...prev };
                      delete next[shape.clientId];
                      return next;
                    });
                    onShapesChange((prev) => {
                      const idx = prev.findIndex((item) => item.clientId === shape.clientId);
                      if (idx < 0) return prev;
                      const next = prev.slice();
                      next[idx] = { ...prev[idx], x: nextX, y: nextY };
                      return next;
                    });
                  }}
                  onTransformStart={() => {
                    transformStartRef.current = {
                      id: shape.clientId,
                      x: shape.x,
                      y: shape.y,
                      width: shape.width,
                      height: shape.height,
                    };
                  }}
                  onTransform={(ev) => {
                    const node = ev.target;
                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    const width = Math.max(RECT_MIN_SIZE, node.width() * Math.abs(sx));
                    const height = Math.max(RECT_MIN_SIZE, node.height() * Math.abs(sy));
                    let x = node.x();
                    let y = node.y();
                    if (sx < 0) x -= width;
                    if (sy < 0) y -= height;
                    x = clamp(x, 0, Math.max(0, imageW - RECT_MIN_SIZE));
                    y = clamp(y, 0, Math.max(0, imageH - RECT_MIN_SIZE));
                    const right = Math.min(x + width, imageW);
                    const bottom = Math.min(y + height, imageH);
                    node.setAttrs({ x, y, width: right - x, height: bottom - y, scaleX: 1, scaleY: 1 });
                    syncFloatingLabelPosition(x, y, bottom - y);
                    setDragPreview((prev) => ({ ...prev, [shape.clientId]: { x, y } }));
                  }}
                  onTransformEnd={(ev) => {
                    const node = ev.target;
                    const width = Math.max(RECT_MIN_SIZE, node.width());
                    const height = Math.max(RECT_MIN_SIZE, node.height());
                    const x = clamp(node.x(), 0, Math.max(0, imageW - width));
                    const y = clamp(node.y(), 0, Math.max(0, imageH - height));
                    node.setAttrs({ x, y, width, height, scaleX: 1, scaleY: 1 });
                    setDragPreview((prev) => {
                      const next = { ...prev };
                      delete next[shape.clientId];
                      return next;
                    });
                    const start = transformStartRef.current;
                    const noChange =
                      start &&
                      start.id === shape.clientId &&
                      Math.abs(x - start.x) < 0.5 &&
                      Math.abs(y - start.y) < 0.5 &&
                      Math.abs(width - start.width) < 0.5 &&
                      Math.abs(height - start.height) < 0.5;
                    transformStartRef.current = null;
                    if (noChange) return;
                    onShapesChange((prev) => {
                      const idx = prev.findIndex((item) => item.clientId === shape.clientId);
                      if (idx < 0) return prev;
                      const next = prev.slice();
                      next[idx] = { ...prev[idx], x, y, width, height };
                      return next;
                    });
                  }}
                />
                {floatingLabel}
              </React.Fragment>
            );
          })}

          {previewPoints.length >= 2 && (
            <Line
              points={previewPoints}
              stroke={getShapeColor(activeClassId)}
              strokeWidth={2 / layerScale}
              dash={[6, 6]}
              lineJoin="round"
              closed={activeTool === "polygon"}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {newBox && <Rect {...newBox} stroke={getShapeColor(activeClassId)} strokeWidth={2 / layerScale} dash={[6, 6]} listening={false} perfectDrawEnabled={false} />}
          <Transformer
            ref={trRef}
            flipEnabled={false}
            rotateEnabled={false}
            keepRatio={false}
            anchorSize={transformerAnchorPx}
            anchorCornerRadius={transformerAnchorPx / 2}
            anchorFill="#ffffff"
            anchorStroke={transformerColor}
            anchorStrokeWidth={1.5}
            borderStroke={transformerColor}
            borderStrokeWidth={1}
            listening={activeTool === "select"}
            enabledAnchors={["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]}
            boundBoxFunc={(_oldBox, box) => {
              if (imageW <= 0 || imageH <= 0) return box;
              const imgLeft = layerX;
              const imgTop = layerY;
              const imgRight = layerX + imageW * layerScale;
              const imgBottom = layerY + imageH * layerScale;
              const minStage = RECT_MIN_SIZE * layerScale;
              let left = clamp(box.x, imgLeft, imgRight - minStage);
              let top = clamp(box.y, imgTop, imgBottom - minStage);
              let right = clamp(box.x + box.width, imgLeft + minStage, imgRight);
              let bottom = clamp(box.y + box.height, imgTop + minStage, imgBottom);
              if (right - left < minStage) {
                if (box.x === left) right = left + minStage;
                else left = right - minStage;
              }
              if (bottom - top < minStage) {
                if (box.y === top) bottom = top + minStage;
                else top = bottom - minStage;
              }
              return { ...box, x: left, y: top, width: right - left, height: bottom - top };
            }}
          />
        </Layer>
      </Stage>

      {contextMenu && (
        <div
          className="absolute z-[140] min-w-[12rem] rounded-2xl border border-stone-200/90 bg-white/95 p-2 shadow-2xl shadow-stone-300/40 backdrop-blur-md"
          style={{
            left: Math.max(
              12,
              Math.min(contextMenu.x + MENU_GAP, Math.max(12, dimensions.width - MENU_WIDTH - 12))
            ),
            top: Math.max(
              12,
              Math.min(contextMenu.y + MENU_GAP, Math.max(12, dimensions.height - MENU_HEIGHT - 12))
            ),
          }}
        >
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Class
          </div>
          <div className="space-y-1">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => applyShapeClass(contextMenu.shapeId, label.id)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                <span className="truncate">{label.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default AnnotationEditor;
