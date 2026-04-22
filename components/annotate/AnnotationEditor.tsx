"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Line, Text, Transformer } from "react-konva";
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
  shapes: EditorShape[];
  onShapesChange: React.Dispatch<React.SetStateAction<EditorShape[]>>;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  polygonVertexCount: number;
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

const ANCHOR_PX = 16;
const RECT_MIN_SIZE = 5;
const ZOOM_MIN = 0.12;
const ZOOM_MAX = 10;
const POINT_RADIUS = 5;
const TAG_HEIGHT = 26;
const TAG_MIN_WIDTH = 88;

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  imageUrl,
  labels,
  activeClassId,
  shapes,
  onShapesChange,
  activeTool,
  onToolChange,
  polygonVertexCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [image] = useImage(imageUrl, "anonymous");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [newBox, setNewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pathDraft, setPathDraft] = useState<number[]>([]);
  const pathDraftRef = useRef(pathDraft);
  const [pathHover, setPathHover] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<{ shapeId: string; vertexIndex: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [zoomMul, setZoomMul] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isMiddlePan, setIsMiddlePan] = useState(false);
  const panOffsetRef = useRef(panOffset);
  const panOriginRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);
  const transformStartRef = useRef<{ id: string; x: number; y: number; width: number; height: number } | null>(null);

  const imageW = image?.width ?? 0;
  const imageH = image?.height ?? 0;
  const baseFit = useMemo(() => {
    if (!image || dimensions.width <= 0 || dimensions.height <= 0) {
      return { scale: 1, x: 0, y: 0 };
    }
    const scale = Math.min(dimensions.width / image.width, dimensions.height / image.height);
    return {
      scale,
      x: (dimensions.width - image.width * scale) / 2,
      y: (dimensions.height - image.height * scale) / 2,
    };
  }, [image, dimensions]);
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
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
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

  const transformTargetId = useMemo(() => selectedId ?? hoveredId ?? null, [selectedId, hoveredId]);
  const transformTargetShape = useMemo(
    () => shapes.find((shape) => shape.clientId === transformTargetId) ?? null,
    [shapes, transformTargetId]
  );
  const transformerColor = transformTargetShape ? getShapeColor(transformTargetShape.classLabelId) : "#ea580c";

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape" && pathDraft.length > 0) {
        e.preventDefault();
        setPathDraft([]);
        setPathHover(null);
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onShapesChange((prev) => prev.filter((shape) => shape.clientId !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onShapesChange, onToolChange, pathDraft.length]);

  const checkDeselect = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (isCanvasBackground(e)) setSelectedId(null);
  }, []);

  const selectShape = useCallback((clientId: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    setSelectedId(clientId);
  }, []);

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
      if (!image || imageW < 1 || imageH < 1 || !isCanvasBackground(e)) return;
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (!pos) return;

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
      setSelectedId(shape.clientId);
    },
    [image, imageW, imageH, layerX, layerY, layerScale, vertexCount, labels, activeClassId, activeTool, onShapesChange]
  );

  const placeSingleShape = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!image || imageW < 1 || imageH < 1 || !isCanvasBackground(e)) return;
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (!pos) return;
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
      setSelectedId(shape.clientId);
    },
    [image, imageW, imageH, layerX, layerY, layerScale, labels, activeClassId, canPlaceTag, onShapesChange]
  );

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (isMiddlePan || e.evt.button !== 0) return;
    if (canDrawPath) {
      appendPathVertex(e);
      return;
    }
    if (canPlacePoint || canPlaceTag) {
      placeSingleShape(e);
      return;
    }
    if (!canDrawRect || !isCanvasBackground(e)) return;

    if (selectedId) setSelectedId(null);
    const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
    if (!pos) return;
    setNewBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
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
    if (isMiddlePan || !newBox) return;
    if (Math.abs(newBox.width) > RECT_MIN_SIZE && Math.abs(newBox.height) > RECT_MIN_SIZE) {
      const classId = labels.some((label) => label.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
      const box: EditorShape = {
        clientId: `box-${Date.now()}`,
        shapeType: "rectangle",
        classLabelId: classId,
        x: newBox.width < 0 ? newBox.x + newBox.width : newBox.x,
        y: newBox.height < 0 ? newBox.y + newBox.height : newBox.y,
        width: Math.abs(newBox.width),
        height: Math.abs(newBox.height),
      };
      onShapesChange((prev) => [...prev, box]);
      setSelectedId(box.clientId);
    }
    setNewBox(null);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
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
    if (canDrawPath) return;
    checkDeselect(e);
  };

  const visibleDraft = activeTool === "polygon" || activeTool === "polyline" ? pathDraft : [];
  const previewPoints = visibleDraft.length > 0 && pathHover ? [...visibleDraft, pathHover.x, pathHover.y] : visibleDraft;
  const hoveredShape = hoveredId ? shapes.find((shape) => shape.clientId === hoveredId) ?? null : null;
  const hoveredLabelName = hoveredShape ? getShapeLabel(hoveredShape.classLabelId) : "";
  const safeLayerScale = Math.max(layerScale, 0.001);
  const safeBaseFitScale = Math.max(baseFit.scale, 0.001);
  const transformerAnchorPx = ANCHOR_PX / safeBaseFitScale;
  const shapeDragEnabled = visibleDraft.length === 0 && !newBox;
  const cursorClass = isMiddlePan ? "cursor-grabbing" : canDrawRect || canDrawPath || canPlacePoint || canPlaceTag ? "cursor-crosshair" : "cursor-default";
  const zoomPct = Math.round(zoomMul * 100);

  return (
    <div
      ref={containerRef}
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
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-[2rem] bg-stone-100 shadow-xl shadow-stone-200/50 ${cursorClass}`}
    >
      <div className="absolute right-3 top-3 z-[120] flex flex-col gap-1 rounded-2xl border border-stone-200/90 bg-white/95 p-1 shadow-lg shadow-stone-300/40 backdrop-blur-sm">
        <button type="button" title="Fit to window" onClick={fitToWindow} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" title="Zoom in" onClick={() => setZoomMul((z) => Math.min(ZOOM_MAX, z * 1.2))} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button type="button" title="Zoom out" onClick={() => setZoomMul((z) => Math.max(ZOOM_MIN, z / 1.2))} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-0.5 pb-1 text-center text-[9px] font-bold tabular-nums text-stone-500">{zoomPct}%</span>
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
            const stroke = getShapeColor(shape.classLabelId);
            const shapeLabel = getShapeLabel(shape.classLabelId);
            const isHovered = hoveredId === shape.clientId;
            const isSelected = selectedId === shape.clientId;
            const livePos = dragPreview[shape.clientId];
            const shapeX = livePos?.x ?? shape.x;
            const shapeY = livePos?.y ?? shape.y;
            const bannerX = shapeX;
            const bannerY = Math.max(0, shapeY - 22 / safeLayerScale);
            const bannerWidth = Math.max(34, shapeLabel.length * 7 + 12) / safeLayerScale;
            const bannerHeight = 18 / safeLayerScale;

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
                    onMouseDown={(e) => selectShape(shape.clientId, e)}
                    onTap={(e) => selectShape(shape.clientId, e)}
                    onMouseEnter={(e) => {
                      const p = e.target.getStage()?.getPointerPosition();
                      setHoveredId(shape.clientId);
                      if (p) setHoverPos({ x: p.x, y: p.y });
                    }}
                    onMouseMove={(e) => {
                      const p = e.target.getStage()?.getPointerPosition();
                      if (p) setHoverPos({ x: p.x, y: p.y });
                    }}
                    onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                    onDragMove={(ev) => {
                      const node = ev.target;
                      const nextX = clamp(node.x(), 0, Math.max(0, imageW - width));
                      const nextY = clamp(node.y(), 0, Math.max(0, imageH - height));
                      if (nextX !== node.x() || nextY !== node.y()) node.position({ x: nextX, y: nextY });
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
              return (
                <React.Fragment key={shape.clientId}>
                  <Rect x={bannerX} y={bannerY} width={bannerWidth} height={bannerHeight} cornerRadius={6 / safeLayerScale} fill={stroke} opacity={0.92} listening={false} />
                  <Text x={bannerX + 6 / safeLayerScale} y={bannerY + 4 / safeLayerScale} text={shapeLabel} fontSize={10 / safeLayerScale} fontStyle="bold" fill="#ffffff" listening={false} />
                  {!isPointsShape && (
                    <Line
                      id={shape.clientId}
                      name="path-shape"
                      points={shape.points}
                      closed={isClosed}
                      fill={isClosed ? `${stroke}22` : undefined}
                      stroke={stroke}
                      strokeWidth={(isHovered ? 3 : 2) / layerScale}
                      lineJoin="round"
                      perfectDrawEnabled={false}
                      draggable={shapeDragEnabled}
                      onMouseDown={(e) => selectShape(shape.clientId, e)}
                      onTap={(e) => selectShape(shape.clientId, e)}
                      onMouseEnter={(e) => {
                        const p = e.target.getStage()?.getPointerPosition();
                        setHoveredId(shape.clientId);
                        if (p) setHoverPos({ x: p.x, y: p.y });
                      }}
                      onMouseMove={(e) => {
                        const p = e.target.getStage()?.getPointerPosition();
                        if (p) setHoverPos({ x: p.x, y: p.y });
                      }}
                      onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                      onDragEnd={(ev) => {
                        const node = ev.target;
                        const dx = node.x();
                        const dy = node.y();
                        node.position({ x: 0, y: 0 });
                        const nextPoints = shape.points!.map((value, index) =>
                          index % 2 === 0 ? clamp(value + dx, 0, imageW) : clamp(value + dy, 0, imageH)
                        );
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
                  {Array.from({ length: shape.points.length / 2 }, (_, vertexIndex) => {
                    const vx = shape.points![vertexIndex * 2];
                    const vy = shape.points![vertexIndex * 2 + 1];
                    const isCornerHovered = hoveredCorner?.shapeId === shape.clientId && hoveredCorner.vertexIndex === vertexIndex;
                    return (
                      <Circle
                        key={`${shape.clientId}-v-${vertexIndex}`}
                        x={vx}
                        y={vy}
                        radius={(isCornerHovered || isPointsShape ? POINT_RADIUS + 1.5 : POINT_RADIUS) / layerScale}
                        fill={isPointsShape ? stroke : isCornerHovered ? "#ffedd5" : "#ffffff"}
                        stroke={stroke}
                        strokeWidth={(isCornerHovered ? 2 : 1.5) / layerScale}
                        draggable={shapeDragEnabled}
                        onMouseEnter={() => setHoveredCorner({ shapeId: shape.clientId, vertexIndex })}
                        onMouseLeave={() => {
                          setHoveredCorner((prev) =>
                            prev?.shapeId === shape.clientId && prev.vertexIndex === vertexIndex ? null : prev
                          );
                        }}
                        onMouseDown={(e) => {
                          e.cancelBubble = true;
                          setSelectedId(shape.clientId);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          setSelectedId(shape.clientId);
                        }}
                        onDragMove={(e) => updatePointGeometry(shape.clientId, vertexIndex, e.target.x(), e.target.y())}
                        onDragEnd={(e) => updatePointGeometry(shape.clientId, vertexIndex, e.target.x(), e.target.y())}
                      />
                    );
                  })}
                  {isSelected && !isPointsShape && (
                    <Line points={shape.points} closed={isClosed} stroke={stroke} strokeWidth={2.5 / layerScale} dash={[6 / layerScale, 6 / layerScale]} listening={false} perfectDrawEnabled={false} />
                  )}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={shape.clientId}>
                <Rect x={bannerX} y={bannerY} width={bannerWidth} height={bannerHeight} cornerRadius={6 / safeLayerScale} fill={stroke} opacity={0.92} listening={false} />
                <Text x={bannerX + 6 / safeLayerScale} y={bannerY + 4 / safeLayerScale} text={shapeLabel} fontSize={10 / safeLayerScale} fontStyle="bold" fill="#ffffff" listening={false} />
                <Rect
                  id={shape.clientId}
                  x={shapeX}
                  y={shapeY}
                  width={shape.width}
                  height={shape.height}
                  fill={`${stroke}22`}
                  stroke={stroke}
                  strokeWidth={(isHovered ? 2 : 1.25) / layerScale}
                  perfectDrawEnabled={false}
                  draggable={shapeDragEnabled}
                  onMouseDown={(e) => selectShape(shape.clientId, e)}
                  onTap={(e) => selectShape(shape.clientId, e)}
                  onMouseEnter={(e) => {
                    const p = e.target.getStage()?.getPointerPosition();
                    setHoveredId(shape.clientId);
                    if (p) setHoverPos({ x: p.x, y: p.y });
                  }}
                  onMouseMove={(e) => {
                    const p = e.target.getStage()?.getPointerPosition();
                    if (p) setHoverPos({ x: p.x, y: p.y });
                  }}
                  onMouseLeave={() => setHoveredId((id) => (id === shape.clientId ? null : id))}
                  onDragMove={(ev) => {
                    const node = ev.target;
                    const bounded = clampRectToImage(node.x(), node.y(), shape.width, shape.height);
                    if (bounded.x !== node.x() || bounded.y !== node.y()) node.position({ x: bounded.x, y: bounded.y });
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
                  }}
                  onTransformEnd={(ev) => {
                    const node = ev.target;
                    const width = Math.max(RECT_MIN_SIZE, node.width());
                    const height = Math.max(RECT_MIN_SIZE, node.height());
                    const x = clamp(node.x(), 0, Math.max(0, imageW - width));
                    const y = clamp(node.y(), 0, Math.max(0, imageH - height));
                    node.setAttrs({ x, y, width, height, scaleX: 1, scaleY: 1 });
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
              </React.Fragment>
            );
          })}

          {previewPoints.length >= 2 && (
            <Line
              points={previewPoints}
              stroke="#ea580c"
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
            anchorStrokeWidth={1.5 / safeBaseFitScale}
            borderStroke={transformerColor}
            borderStrokeWidth={1 / safeBaseFitScale}
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

      {hoveredShape && hoverPos && (
        <div
          className="pointer-events-none absolute z-[130] -translate-y-full rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold shadow-sm"
          style={{
            left: hoverPos.x + 10,
            top: hoverPos.y - 8,
            border: `1px solid ${getShapeColor(hoveredShape.classLabelId)}`,
            color: getShapeColor(hoveredShape.classLabelId),
          }}
        >
          {hoveredLabelName}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-6 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full border border-stone-200/80 bg-white/90 px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-stone-600 shadow-lg shadow-stone-200/40 backdrop-blur-md">
        {(() => {
          let primary: React.ReactNode = null;
          if (activeTool === "rectangle" && canDrawRect) {
            primary = <span>Drag to draw box - class: {labels.find((label) => label.id === activeClassId)?.name}</span>;
          } else if (activeTool === "rectangle" && !canDrawRect) {
            primary = <span>Add a label in the project first</span>;
          } else if ((activeTool === "polygon" || activeTool === "polyline") && canDrawPath) {
            primary = <span>Click {vertexCount} times on the image ({visibleDraft.length / 2} / {vertexCount}) - Esc cancels</span>;
          } else if ((activeTool === "polygon" || activeTool === "polyline") && !canDrawPath) {
            primary = <span>Add a label first</span>;
          } else if (activeTool === "points") {
            primary = <span>Click to place points</span>;
          } else if (activeTool === "tag") {
            primary = <span>Click to place a tag marker</span>;
          } else if (activeTool !== "select") {
            primary = <span>Tool &quot;{activeTool}&quot; - coming next</span>;
          }

          const shortcuts = (
            <span className="mt-1 block border-t border-stone-200/80 pt-2 text-[9px] font-semibold normal-case text-stone-500">
              Wheel: zoom - Middle-drag: pan - Fit: corner buttons - Click shape: select and edit
            </span>
          );
          if (!primary) return shortcuts;
          return (
            <>
              {primary}
              {shortcuts}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default AnnotationEditor;
