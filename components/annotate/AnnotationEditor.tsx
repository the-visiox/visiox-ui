"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Line,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import type { EditorShape, LabelDefinition, Tool } from "@/lib/types/annotation";

export type { Tool };

interface AnnotationEditorProps {
  imageUrl: string;
  labels: LabelDefinition[];
  activeClassId: number;
  shapes: EditorShape[];
  onShapesChange: (next: EditorShape[]) => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  /** Number of vertices for polygon tool (click to place each vertex). */
  polygonVertexCount: number;
}

function colorFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((l) => l.id === classLabelId)?.color ?? "#f97316";
}

function bboxFromPoints(pts: number[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function layerPos(
  e: KonvaEventObject<MouseEvent>,
  stageX: number,
  stageY: number,
  stageScale: number
) {
  const stage = e.target.getStage();
  if (!stage) return null;
  const pos = stage.getRelativePointerPosition();
  if (!pos) return null;
  return {
    x: (pos.x - stageX) / stageScale,
    y: (pos.y - stageY) / stageScale,
  };
}

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
  const [newBox, setNewBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [polyDraft, setPolyDraft] = useState<number[]>([]);
  const [polyHover, setPolyHover] = useState<{ x: number; y: number } | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);

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
        (dimensions.width - 48) / image.width,
        (dimensions.height - 48) / image.height
      );
      setStageScale(scale);
      setStageX((dimensions.width - image.width * scale) / 2);
      setStageY((dimensions.height - image.height * scale) / 2);
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
    if (!trRef.current || !layerRef.current) return;
    if (activeTool !== "select") {
      trRef.current.nodes([]);
      return;
    }
    if (!selectedId) {
      trRef.current.nodes([]);
      return;
    }
    const node = layerRef.current.findOne("#" + selectedId);
    const isRect =
      node &&
      typeof (node as { getClassName?: () => string }).getClassName === "function" &&
      (node as { getClassName: () => string }).getClassName() === "Rect";
    if (isRect) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
    }
  }, [selectedId, shapes, activeTool]);

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
        onShapesChange(shapes.filter((s) => s.clientId !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, shapes, onShapesChange, onToolChange, polyDraft.length]);

  const checkDeselect = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "background-image";
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, []);

  const canDrawRect = activeTool === "rectangle" && labels.length > 0;
  const canDrawPoly = activeTool === "polygon" && labels.length > 0;

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!canDrawRect) return;

    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "background-image";
    if (!clickedOnEmpty) return;

    if (selectedId) setSelectedId(null);

    const pos = layerPos(e, stageX, stageY, stageScale);
    if (!pos) return;
    setNewBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (canDrawPoly && polyDraft.length > 0) {
      const pos = layerPos(e, stageX, stageY, stageScale);
      if (pos) setPolyHover(pos);
    }

    if (!newBox) return;
    const pos = layerPos(e, stageX, stageY, stageScale);
    if (!pos) return;
    setNewBox({
      ...newBox,
      width: pos.x - newBox.x,
      height: pos.y - newBox.y,
    });
  };

  const handleMouseUp = () => {
    if (!newBox) return;
    if (Math.abs(newBox.width) > 5 && Math.abs(newBox.height) > 5) {
      const box: EditorShape = {
        clientId: `box-${Date.now()}`,
        classLabelId: activeClassId,
        x: newBox.width < 0 ? newBox.x + newBox.width : newBox.x,
        y: newBox.height < 0 ? newBox.y + newBox.height : newBox.y,
        width: Math.abs(newBox.width),
        height: Math.abs(newBox.height),
      };
      onShapesChange([...shapes, box]);
      setSelectedId(box.clientId);
    }
    setNewBox(null);
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!canDrawPoly) {
      checkDeselect(e);
      return;
    }

    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "background-image";
    if (!clickedOnEmpty) return;

    const pos = layerPos(e, stageX, stageY, stageScale);
    if (!pos) return;

    const next = [...polyDraft, pos.x, pos.y];
    const need = polygonVertexCount * 2;
    if (next.length >= need) {
      const bb = bboxFromPoints(next);
      const poly: EditorShape = {
        clientId: `poly-${Date.now()}`,
        classLabelId: activeClassId,
        ...bb,
        points: next.slice(0, need),
      };
      onShapesChange([...shapes, poly]);
      setPolyDraft([]);
      setPolyHover(null);
      setSelectedId(poly.clientId);
    } else {
      setPolyDraft(next);
    }
  };

  const polyPreviewPoints =
    polyDraft.length > 0 && polyHover
      ? [...polyDraft, polyHover.x, polyHover.y]
      : polyDraft;

  const cursorClass =
    activeTool === "select"
      ? "cursor-default"
      : canDrawRect || canDrawPoly
        ? "cursor-crosshair"
        : "cursor-not-allowed";

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-stone-100 overflow-hidden relative rounded-[2rem] border border-stone-200/80 shadow-xl shadow-stone-200/50 ${cursorClass}`}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        <Layer
          ref={layerRef}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stageX}
          y={stageY}
        >
          {image && (
            <KonvaImage image={image} name="background-image" listening />
          )}
          {shapes.map((shape, i) => {
            const stroke = colorFor(labels, shape.classLabelId);
            if (shape.points && shape.points.length >= 6) {
              return (
                <Line
                  key={shape.clientId}
                  id={shape.clientId}
                  name="polygon-shape"
                  points={shape.points}
                  closed
                  fill={`${stroke}22`}
                  stroke={stroke}
                  strokeWidth={2 / stageScale}
                  lineJoin="round"
                  draggable={activeTool === "select"}
                  onClick={() => {
                    if (activeTool === "select") setSelectedId(shape.clientId);
                  }}
                  onDragEnd={(ev) => {
                    const node = ev.target;
                    const dx = node.x();
                    const dy = node.y();
                    node.position({ x: 0, y: 0 });
                    const pts = shape.points!.map((v, idx) =>
                      idx % 2 === 0 ? v + dx : v + dy
                    );
                    const next = shapes.slice();
                    next[i] = {
                      ...shape,
                      points: pts,
                      ...bboxFromPoints(pts),
                    };
                    onShapesChange(next);
                  }}
                />
              );
            }
            return (
              <Rect
                key={shape.clientId}
                id={shape.clientId}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={`${stroke}22`}
                stroke={stroke}
                strokeWidth={2 / stageScale}
                draggable={activeTool === "select"}
                onClick={() => {
                  if (activeTool === "select") setSelectedId(shape.clientId);
                }}
                onTransformEnd={(ev) => {
                  const node = ev.target;
                  const next = shapes.slice();
                  next[i] = {
                    ...shape,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * node.scaleX()),
                    height: Math.max(5, node.height() * node.scaleY()),
                  };
                  node.scaleX(1);
                  node.scaleY(1);
                  onShapesChange(next);
                }}
              />
            );
          })}
          {polyPreviewPoints.length >= 2 && (
            <Line
              points={polyPreviewPoints}
              stroke="#ea580c"
              strokeWidth={2 / stageScale}
              dash={[6, 6]}
              lineJoin="round"
              closed={false}
            />
          )}
          {newBox && (
            <Rect
              {...newBox}
              stroke="#ea580c"
              strokeWidth={2 / stageScale}
              dash={[6, 6]}
            />
          )}
          <Transformer
            ref={trRef}
            flipEnabled={false}
            rotateEnabled={false}
            boundBoxFunc={(oldBox, nbox) => {
              if (nbox.width < 5 || nbox.height < 5) {
                return oldBox;
              }
              return nbox;
            }}
          />
        </Layer>
      </Stage>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full border border-stone-200/80 shadow-lg shadow-stone-200/40 text-[10px] font-bold text-stone-600 uppercase tracking-widest pointer-events-none max-w-[90%] text-center">
        {activeTool === "rectangle" && canDrawRect && (
          <span>
            Drag to draw box · class: {labels.find((l) => l.id === activeClassId)?.name}
          </span>
        )}
        {activeTool === "rectangle" && !canDrawRect && (
          <span>Add a label in the project first</span>
        )}
        {activeTool === "polygon" && canDrawPoly && (
          <span>
            Click {polygonVertexCount} corners ({polyDraft.length / 2} / {polygonVertexCount}) · Esc
            cancels
          </span>
        )}
        {activeTool === "polygon" && !canDrawPoly && <span>Add a label first</span>}
        {activeTool === "select" && (
          <span>Click a shape · Del removes · Esc clears polygon draft</span>
        )}
        {activeTool !== "rectangle" &&
          activeTool !== "select" &&
          activeTool !== "polygon" && (
            <span>Tool &quot;{activeTool}&quot; — coming next</span>
          )}
      </div>
    </div>
  );
};

export default AnnotationEditor;
