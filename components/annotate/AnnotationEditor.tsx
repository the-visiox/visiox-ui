"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from "react-konva";
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
}

function colorFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((l) => l.id === classLabelId)?.color ?? "#f97316";
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  imageUrl,
  labels,
  activeClassId,
  shapes,
  onShapesChange,
  activeTool,
  onToolChange,
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
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Konva ref types vary by react-konva version
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
    if (selectedId && trRef.current && layerRef.current) {
      const node = layerRef.current.findOne("#" + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, shapes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [selectedId, shapes, onShapesChange, onToolChange]);

  const checkDeselect = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "background-image";
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  }, []);

  const canDrawRect = activeTool === "rectangle" && labels.length > 0;

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!canDrawRect) return;
    if (selectedId) return;

    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "background-image";
    if (clickedOnEmpty) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      setNewBox({
        x: (pos.x - stageX) / stageScale,
        y: (pos.y - stageY) / stageScale,
        width: 0,
        height: 0,
      });
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!newBox) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    setNewBox({
      ...newBox,
      width: (pos.x - stageX) / stageScale - newBox.x,
      height: (pos.y - stageY) / stageScale - newBox.y,
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

  const cursorClass =
    activeTool === "select"
      ? "cursor-default"
      : canDrawRect
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
        onClick={checkDeselect}
      >
        <Layer
          ref={layerRef}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stageX}
          y={stageY}
        >
          {image && (
            <KonvaImage
              image={image}
              name="background-image"
              onMouseDown={checkDeselect}
            />
          )}
          {shapes.map((box, i) => (
            <Rect
              key={box.clientId}
              id={box.clientId}
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={`${colorFor(labels, box.classLabelId)}22`}
              stroke={colorFor(labels, box.classLabelId)}
              strokeWidth={2 / stageScale}
              draggable={activeTool === "select"}
              onClick={() => {
                if (activeTool === "select") setSelectedId(box.clientId);
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                const next = shapes.slice();
                next[i] = {
                  ...box,
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
          ))}
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
          <span>Drag to draw box · class: {labels.find((l) => l.id === activeClassId)?.name}</span>
        )}
        {activeTool === "rectangle" && !canDrawRect && (
          <span>Add a label in the project first</span>
        )}
        {activeTool === "select" && <span>Click a box to edit · Del to remove</span>}
        {activeTool !== "rectangle" && activeTool !== "select" && (
          <span>Tool &quot;{activeTool}&quot; — canvas wiring in roadmap (phase 2)</span>
        )}
      </div>
    </div>
  );
};

export default AnnotationEditor;
