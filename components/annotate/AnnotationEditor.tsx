"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Rect,
  Line,
  Text,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  bboxFromPoints,
  buildLabelMetaMap,
  clamp,
  colorFromMap,
  labelNameFromMap,
} from "@/lib/annotation-core";
import type { EditorShape, LabelDefinition, Tool } from "@/lib/types/annotation";

export type { Tool };

interface AnnotationEditorProps {
  imageUrl: string;
  labels: LabelDefinition[];
  activeClassId: number;
  shapes: EditorShape[];
  onShapesChange: React.Dispatch<React.SetStateAction<EditorShape[]>>;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  /** Number of vertices for polygon tool (click to place each vertex). */
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

/** Stage, image, or transparent underlay — not an annotation shape. */
function isCanvasBackground(e: KonvaEventObject<MouseEvent>): boolean {
  const t = e.target;
  const name = typeof t.name === "function" ? t.name() : "";
  return (
    t === t.getStage() ||
    name === "background-image" ||
    name === "stage-background"
  );
}

const ANCHOR_PX = 16;
const RECT_MIN_SIZE = 5;

const ZOOM_MIN = 0.12;
const ZOOM_MAX = 10;

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
  const [newBox, setNewBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [polyDraft, setPolyDraft] = useState<number[]>([]);
  const polyDraftRef = useRef(polyDraft);
  polyDraftRef.current = polyDraft;
  const [polyHover, setPolyHover] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<{ shapeId: string; vertexIndex: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, { x: number; y: number }>>({});
  /** Fit-to-viewport transform (image space → stage). */
  const [baseFit, setBaseFit] = useState({ scale: 1, x: 0, y: 0 });
  const [zoomMul, setZoomMul] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isMiddlePan, setIsMiddlePan] = useState(false);
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const panOriginRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);
  const transformStartRef = useRef<{ id: string; x: number; y: number; width: number; height: number } | null>(null);

  const layerScale = baseFit.scale * zoomMul;
  const layerX = baseFit.x + panOffset.x;
  const layerY = baseFit.y + panOffset.y;

  const fitToWindow = useCallback(() => {
    setZoomMul(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (image && dimensions.width > 0) {
      const scale = Math.min(
        dimensions.width / image.width,
        dimensions.height / image.height
      );
      setBaseFit({
        scale,
        x: (dimensions.width - image.width * scale) / 2,
        y: (dimensions.height - image.height * scale) / 2,
      });
    }
  }, [image, dimensions]);

  useEffect(() => {
    if (activeTool !== "polygon") {
      setPolyDraft([]);
      setPolyHover(null);
    }
  }, [activeTool]);

  useEffect(() => {
    setPolyDraft([]);
    setPolyHover(null);
  }, [polygonVertexCount]);

  useEffect(() => {
    if (!isMiddlePan) return;
    const onMove = (e: MouseEvent) => {
      const o = panOriginRef.current;
      if (!o) return;
      setPanOffset({
        x: o.ox + (e.clientX - o.cx),
        y: o.oy + (e.clientY - o.cy),
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

  const transformTargetId = useMemo(() => selectedId ?? hoveredId ?? null, [selectedId, hoveredId]);
  const transformTargetShape = useMemo(
    () => shapes.find((shape) => shape.clientId === transformTargetId) ?? null,
    [shapes, transformTargetId]
  );
  const labelMetaMap = useMemo(() => buildLabelMetaMap(labels), [labels]);
  const getShapeColor = useCallback(
    (classLabelId: number) => colorFromMap(labelMetaMap, classLabelId),
    [labelMetaMap]
  );
  const getShapeLabel = useCallback(
    (classLabelId: number) => labelNameFromMap(labelMetaMap, classLabelId),
    [labelMetaMap]
  );
  const transformerColor = transformTargetShape
    ? getShapeColor(transformTargetShape.classLabelId)
    : "#ea580c";

  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    if (!transformTargetId) {
      trRef.current.nodes([]);
      return;
    }
    const node = layerRef.current.findOne("#" + transformTargetId);
    const className =
      node && typeof (node as { getClassName?: () => string }).getClassName === "function"
        ? (node as { getClassName: () => string }).getClassName()
        : "";
    const isTransformable = className === "Rect";
    if (isTransformable) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
    }
  }, [transformTargetId, shapes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Escape" && polyDraft.length > 0) {
        e.preventDefault();
        setPolyDraft([]);
        setPolyHover(null);
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
        onShapesChange((prev) => prev.filter((s) => s.clientId !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onShapesChange, onToolChange, polyDraft.length]);

  const checkDeselect = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (isCanvasBackground(e)) {
      setSelectedId(null);
    }
  }, []);

  /** Select shape on pointer down (any tool — resize without switching to Select). */
  const selectShape = useCallback(
    (clientId: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      setSelectedId(clientId);
    },
    []
  );

  const canDrawRect = activeTool === "rectangle" && labels.length > 0;
  const canDrawPoly = activeTool === "polygon" && labels.length > 0;
  const imageW = image?.width ?? 0;
  const imageH = image?.height ?? 0;

  const updatePolygonVertex = useCallback(
    (clientId: string, vertexIndex: number, x: number, y: number) => {
      onShapesChange((prev) => {
        const idx = prev.findIndex((s) => s.clientId === clientId);
        if (idx < 0) return prev;
        const shape = prev[idx];
        if (!shape.points || shape.points.length < (vertexIndex + 1) * 2) return prev;
        const pts = shape.points.slice();
        pts[vertexIndex * 2] = clamp(x, 0, imageW);
        pts[vertexIndex * 2 + 1] = clamp(y, 0, imageH);
        const next = prev.slice();
        next[idx] = { ...shape, points: pts, ...bboxFromPoints(pts) };
        return next;
      });
    },
    [onShapesChange, imageW, imageH]
  );

  const vertexCount = Math.max(3, Math.min(64, Math.round(polygonVertexCount)));

  const appendPolygonVertex = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!image || imageW < 1 || imageH < 1) return;
      if (!isCanvasBackground(e)) return;
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (!pos) return;

      const need = vertexCount * 2;
      const next = [...polyDraftRef.current, pos.x, pos.y];
      if (next.length >= need) {
        const slice = next.slice(0, need);
        const bb = bboxFromPoints(slice);
        const classId =
          labels.some((l) => l.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
        const poly: EditorShape = {
          clientId: `poly-${Date.now()}`,
          classLabelId: classId,
          ...bb,
          points: slice,
        };
        polyDraftRef.current = [];
        setPolyDraft([]);
        setPolyHover(null);
        onShapesChange((p) => [...p, poly]);
        setSelectedId(poly.clientId);
      } else {
        polyDraftRef.current = next;
        setPolyDraft(next);
      }
    },
    [
      image,
      imageW,
      imageH,
      layerX,
      layerY,
      layerScale,
      labels,
      activeClassId,
      onShapesChange,
      vertexCount,
    ]
  );

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (isMiddlePan) return;
    if (e.evt.button !== 0) return;

    if (canDrawPoly) {
      appendPolygonVertex(e);
      return;
    }

    if (!canDrawRect) return;

    if (!isCanvasBackground(e)) return;

    if (selectedId) setSelectedId(null);

    const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
    if (!pos) return;
    setNewBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isMiddlePan) return;
    if (canDrawPoly && polyDraft.length > 0) {
      const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
      if (pos) setPolyHover(pos);
    }

    if (!newBox) return;
    const pos = layerPos(e, layerX, layerY, layerScale, imageW, imageH);
    if (!pos) return;
    setNewBox({
      ...newBox,
      width: pos.x - newBox.x,
      height: pos.y - newBox.y,
    });
  };

  const handleMouseUp = () => {
    if (isMiddlePan) return;
    if (!newBox) return;
    if (Math.abs(newBox.width) > RECT_MIN_SIZE && Math.abs(newBox.height) > RECT_MIN_SIZE) {
      const classId =
        labels.some((l) => l.id === activeClassId) ? activeClassId : (labels[0]?.id ?? 1);
      const box: EditorShape = {
        clientId: `box-${Date.now()}`,
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

    // Keep the image-space point under cursor stable.
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
    if (canDrawPoly) return;
    checkDeselect(e);
  };

  const polyPreviewPoints =
    polyDraft.length > 0 && polyHover
      ? [...polyDraft, polyHover.x, polyHover.y]
      : polyDraft;

  const hoveredShape = hoveredId ? shapes.find((s) => s.clientId === hoveredId) ?? null : null;
  const hoveredLabelName = hoveredShape
    ? labels.find((l) => l.id === hoveredShape.classLabelId)?.name ?? "Label"
    : "";

  const shapeDragEnabled = polyDraft.length === 0 && !newBox;
  const safeLayerScale = Math.max(layerScale, 0.001);
  const safeBaseFitScale = Math.max(baseFit.scale, 0.001);
  // Keep anchors stable for fit-scale but let them grow with user zoom.
  const transformerAnchorPx = ANCHOR_PX / safeBaseFitScale;

  const cursorClass = isMiddlePan
    ? "cursor-grabbing"
    : canDrawRect || canDrawPoly
      ? "cursor-crosshair"
      : "cursor-default";

  const zoomPct = Math.round(zoomMul * 100);

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

  const normalizeRectFromCorners = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const left = clamp(Math.min(x1, x2), 0, imageW);
      const top = clamp(Math.min(y1, y2), 0, imageH);
      const right = clamp(Math.max(x1, x2), 0, imageW);
      const bottom = clamp(Math.max(y1, y2), 0, imageH);
      const width = right - left;
      const height = bottom - top;
      if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) return null;
      return { x: left, y: top, width, height };
    },
    [imageW, imageH]
  );

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
      className={`w-full h-full min-h-0 bg-stone-100 overflow-hidden relative rounded-[2rem] shadow-xl shadow-stone-200/50 ${cursorClass}`}
    >
      <div className="absolute right-3 top-3 z-[120] flex flex-col gap-1 rounded-2xl border border-stone-200/90 bg-white/95 p-1 shadow-lg shadow-stone-300/40 backdrop-blur-sm">
        <button
          type="button"
          title="Fit to window"
          onClick={fitToWindow}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Zoom in"
          onClick={() =>
            setZoomMul((z) => Math.min(ZOOM_MAX, z * 1.2))
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Zoom out"
          onClick={() =>
            setZoomMul((z) => Math.max(ZOOM_MIN, z / 1.2))
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-0.5 pb-1 text-center text-[9px] font-bold tabular-nums text-stone-500">
          {zoomPct}%
        </span>
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
        <Layer
          ref={layerRef}
          scaleX={layerScale}
          scaleY={layerScale}
          x={layerX}
          y={layerY}
        >
          {image && (
            <KonvaImage image={image} name="background-image" listening />
          )}
          {/* Full-size hit target behind shapes so clicks “between” thin strokes still deselect */}
          {image && (
            <Rect
              name="stage-background"
              x={0}
              y={0}
              width={image.width}
              height={image.height}
              fill="transparent"
              listening
            />
          )}
          {shapes.map((shape) => {
            const stroke = getShapeColor(shape.classLabelId);
            const shapeLabel = getShapeLabel(shape.classLabelId);
            const isHovered = hoveredId === shape.clientId;
            const livePos = dragPreview[shape.clientId];
            const shapeX = livePos?.x ?? shape.x;
            const shapeY = livePos?.y ?? shape.y;
            const tagX = shapeX;
            const tagY = Math.max(0, shapeY - 22 / safeLayerScale);
            const tagWidth = Math.max(34, shapeLabel.length * 7 + 12) / safeLayerScale;
            const tagHeight = 18 / safeLayerScale;
            if (shape.points && shape.points.length >= 6) {
              const isSelected = selectedId === shape.clientId;
              return (
                <React.Fragment key={shape.clientId}>
                  <Rect
                    x={tagX}
                    y={tagY}
                    width={tagWidth}
                    height={tagHeight}
                    cornerRadius={6 / safeLayerScale}
                    fill={stroke}
                    opacity={0.92}
                    listening={false}
                  />
                  <Text
                    x={tagX + 6 / safeLayerScale}
                    y={tagY + 4 / safeLayerScale}
                    text={shapeLabel}
                    fontSize={10 / safeLayerScale}
                    fontStyle="bold"
                    fill="#ffffff"
                    listening={false}
                  />
                  {/* Visual polygon */}
                  <Line
                    id={shape.clientId}
                    name="polygon-shape"
                    points={shape.points}
                    closed
                    fill={`${stroke}22`}
                    stroke={stroke}
                    strokeWidth={(isHovered ? 3 : 2) / layerScale}
                    lineJoin="round"
                    listening
                    perfectDrawEnabled={false}
                    draggable={shapeDragEnabled}
                    onMouseDown={(e) => selectShape(shape.clientId, e)}
                    onTap={(e) => selectShape(shape.clientId, e)}
                    onMouseEnter={(e) => {
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      setHoveredId(shape.clientId);
                      if (p) setHoverPos({ x: p.x, y: p.y });
                    }}
                    onMouseMove={(e) => {
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (p) setHoverPos({ x: p.x, y: p.y });
                    }}
                    onMouseLeave={() => {
                      setHoveredId((id) => (id === shape.clientId ? null : id));
                    }}
                    onDragEnd={(ev) => {
                      const node = ev.target;
                      const dx = node.x();
                      const dy = node.y();
                      node.position({ x: 0, y: 0 });
                      const pts = shape.points!.map((v, idx) =>
                        idx % 2 === 0
                          ? clamp(v + dx, 0, imageW)
                          : clamp(v + dy, 0, imageH)
                      );
                      onShapesChange((prev) => {
                        const idx2 = prev.findIndex((s) => s.clientId === shape.clientId);
                        if (idx2 < 0) return prev;
                        const next = prev.slice();
                        next[idx2] = {
                          ...prev[idx2],
                          points: pts,
                          ...bboxFromPoints(pts),
                        };
                        return next;
                      });
                    }}
                  />

                  {/* Selection outline + vertex handles (no bounding-box transformer). */}
                  {isSelected && (
                    <>
                      <Line
                        points={shape.points}
                        closed
                        stroke={stroke}
                        strokeWidth={2.5 / layerScale}
                        dash={[6 / layerScale, 6 / layerScale]}
                        listening={false}
                        perfectDrawEnabled={false}
                      />
                      {Array.from({ length: shape.points.length / 2 }, (_, vi) => {
                        const vx = shape.points![vi * 2];
                        const vy = shape.points![vi * 2 + 1];
                        const isCornerHovered =
                          hoveredCorner?.shapeId === shape.clientId && hoveredCorner.vertexIndex === vi;
                        return (
                          <Circle
                            key={`${shape.clientId}-v-${vi}`}
                            x={vx}
                            y={vy}
                            radius={(isCornerHovered ? 6.5 : 5.5) / layerScale}
                            fill={isCornerHovered ? "#ffedd5" : "#ffffff"}
                            stroke={stroke}
                            strokeWidth={(isCornerHovered ? 2 : 1.5) / layerScale}
                            draggable={shapeDragEnabled}
                            onMouseEnter={() => {
                              setHoveredCorner({ shapeId: shape.clientId, vertexIndex: vi });
                            }}
                            onMouseLeave={() => {
                              setHoveredCorner((prev) =>
                                prev?.shapeId === shape.clientId && prev.vertexIndex === vi ? null : prev
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
                            onDragMove={(e) => {
                              const node = e.target;
                              updatePolygonVertex(shape.clientId, vi, node.x(), node.y());
                            }}
                            onDragEnd={(e) => {
                              const node = e.target;
                              updatePolygonVertex(shape.clientId, vi, node.x(), node.y());
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={shape.clientId}>
                <Rect
                  x={tagX}
                  y={tagY}
                  width={tagWidth}
                  height={tagHeight}
                  cornerRadius={6 / safeLayerScale}
                  fill={stroke}
                  opacity={0.92}
                  listening={false}
                />
                <Text
                  x={tagX + 6 / safeLayerScale}
                  y={tagY + 4 / safeLayerScale}
                  text={shapeLabel}
                  fontSize={10 / safeLayerScale}
                  fontStyle="bold"
                  fill="#ffffff"
                  listening={false}
                />
                <Rect
                  id={shape.clientId}
                  x={shapeX}
                  y={shapeY}
                  width={shape.width}
                  height={shape.height}
                  fill={`${stroke}22`}
                  stroke={stroke}
                  strokeWidth={(isHovered ? 2 : 1.25) / layerScale}
                  listening
                  perfectDrawEnabled={false}
                  draggable={shapeDragEnabled}
                  onMouseDown={(e) => selectShape(shape.clientId, e)}
                  onTap={(e) => selectShape(shape.clientId, e)}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    const p = stage?.getPointerPosition();
                    setHoveredId(shape.clientId);
                    if (p) setHoverPos({ x: p.x, y: p.y });
                  }}
                  onMouseMove={(e) => {
                    const stage = e.target.getStage();
                    const p = stage?.getPointerPosition();
                    if (p) setHoverPos({ x: p.x, y: p.y });
                  }}
                  onMouseLeave={() => {
                    setHoveredId((id) => (id === shape.clientId ? null : id));
                  }}
                  onDragMove={(ev) => {
                    const node = ev.target;
                    const bounded = clampRectToImage(node.x(), node.y(), shape.width, shape.height);
                    if (bounded.x !== node.x() || bounded.y !== node.y()) {
                      node.position({ x: bounded.x, y: bounded.y });
                    }
                    setDragPreview((prev) => ({
                      ...prev,
                      [shape.clientId]: { x: bounded.x, y: bounded.y },
                    }));
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
                      const idx2 = prev.findIndex((s) => s.clientId === shape.clientId);
                      if (idx2 < 0) return prev;
                      const w = prev[idx2].width;
                      const h = prev[idx2].height;
                      const next = prev.slice();
                      next[idx2] = {
                        ...prev[idx2],
                        x: clamp(nextX, 0, Math.max(0, imageW - w)),
                        y: clamp(nextY, 0, Math.max(0, imageH - h)),
                      };
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
                    const w = Math.max(RECT_MIN_SIZE, node.width() * Math.abs(sx));
                    const h = Math.max(RECT_MIN_SIZE, node.height() * Math.abs(sy));
                    let nx = node.x();
                    let ny = node.y();
                    if (sx < 0) nx = nx - w;
                    if (sy < 0) ny = ny - h;
                    nx = clamp(nx, 0, Math.max(0, imageW - RECT_MIN_SIZE));
                    ny = clamp(ny, 0, Math.max(0, imageH - RECT_MIN_SIZE));
                    const right = Math.min(nx + w, imageW);
                    const bottom = Math.min(ny + h, imageH);
                    node.setAttrs({
                      x: nx,
                      y: ny,
                      width: right - nx,
                      height: bottom - ny,
                      scaleX: 1,
                      scaleY: 1,
                    });
                  }}
                  onTransformEnd={(ev) => {
                    const node = ev.target;
                    const w = Math.max(RECT_MIN_SIZE, node.width());
                    const h = Math.max(RECT_MIN_SIZE, node.height());
                    const nx = clamp(node.x(), 0, Math.max(0, imageW - w));
                    const ny = clamp(node.y(), 0, Math.max(0, imageH - h));
                    node.setAttrs({ x: nx, y: ny, width: w, height: h, scaleX: 1, scaleY: 1 });
                    const start = transformStartRef.current;
                    const noChange =
                      start &&
                      start.id === shape.clientId &&
                      Math.abs(nx - start.x) < 0.5 &&
                      Math.abs(ny - start.y) < 0.5 &&
                      Math.abs(w - start.width) < 0.5 &&
                      Math.abs(h - start.height) < 0.5;
                    transformStartRef.current = null;
                    if (noChange) return;
                    onShapesChange((prev) => {
                      const idx2 = prev.findIndex((s) => s.clientId === shape.clientId);
                      if (idx2 < 0) return prev;
                      const next = prev.slice();
                      next[idx2] = { ...prev[idx2], x: nx, y: ny, width: w, height: h };
                      return next;
                    });
                  }}
                />
              </React.Fragment>
            );
          })}
          {polyPreviewPoints.length >= 2 && (
            <Line
              points={polyPreviewPoints}
              stroke="#ea580c"
              strokeWidth={2 / layerScale}
              dash={[6, 6]}
              lineJoin="round"
              closed={false}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {newBox && (
            <Rect
              {...newBox}
              stroke={getShapeColor(activeClassId)}
              strokeWidth={2 / layerScale}
              dash={[6, 6]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
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
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-left",
              "middle-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ]}
            boundBoxFunc={(_oldBox, nbox) => {
              if (imageW <= 0 || imageH <= 0) return nbox;
              const imgLeft = layerX;
              const imgTop = layerY;
              const imgRight = layerX + imageW * layerScale;
              const imgBottom = layerY + imageH * layerScale;
              const minStage = RECT_MIN_SIZE * layerScale;

              let left = clamp(nbox.x, imgLeft, imgRight - minStage);
              let top = clamp(nbox.y, imgTop, imgBottom - minStage);
              let right = clamp(nbox.x + nbox.width, imgLeft + minStage, imgRight);
              let bottom = clamp(nbox.y + nbox.height, imgTop + minStage, imgBottom);

              if (right - left < minStage) {
                if (nbox.x === left) right = left + minStage;
                else left = right - minStage;
              }
              if (bottom - top < minStage) {
                if (nbox.y === top) bottom = top + minStage;
                else top = bottom - minStage;
              }

              return {
                ...nbox,
                x: left,
                y: top,
                width: right - left,
                height: bottom - top,
              };
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

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full border border-stone-200/80 shadow-lg shadow-stone-200/40 text-[10px] font-bold text-stone-600 uppercase tracking-widest pointer-events-none max-w-[90%] text-center">
        {(() => {
          let primary: React.ReactNode = null;
          if (activeTool === "rectangle" && canDrawRect) {
            primary = (
              <span>
                Drag to draw box · class: {labels.find((l) => l.id === activeClassId)?.name}
              </span>
            );
          } else if (activeTool === "rectangle" && !canDrawRect) {
            primary = <span>Add a label in the project first</span>;
          } else if (activeTool === "polygon" && canDrawPoly) {
            primary = (
              <span>
                Click {vertexCount} times on the image ({polyDraft.length / 2} / {vertexCount}) · Esc
                cancels
              </span>
            );
          } else if (activeTool === "polygon" && !canDrawPoly) {
            primary = <span>Add a label first</span>;
          } else if (activeTool !== "rectangle" && activeTool !== "polygon" && activeTool !== "select") {
            primary = <span>Tool &quot;{activeTool}&quot; — coming next</span>;
          }
          const shortcuts = (
            <span className="text-[9px] font-semibold normal-case text-stone-500">
              Wheel: zoom · Middle-drag: pan · Fit: corner buttons · Click shape: select & resize
            </span>
          );
          if (!primary) return shortcuts;
          return (
            <>
              {primary}
              <span className="mt-1 block border-t border-stone-200/80 pt-2">{shortcuts}</span>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default AnnotationEditor;
