"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Group } from "react-konva";
import type Konva from "konva";
import useImage from "use-image";
import { Loader2 } from "lucide-react";

export interface AnnotationEditorProps {
  imageUrl: string;
}

type PixelBox = { id: string; x: number; y: number; width: number; height: number };

function fitContain(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
) {
  const scale = Math.min(boxW / imgW, boxH / imgH, 1);
  const w = imgW * scale;
  const h = imgH * scale;
  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2;
  return { x, y, width: w, height: h, scale };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeRect(x0: number, y0: number, x1: number, y1: number) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);
  return { x, y, width, height };
}

export default function AnnotationEditor({ imageUrl }: AnnotationEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 480 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(320, Math.floor(cr.width));
      const h = Math.max(240, Math.floor(cr.height));
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [image, status] = useImage(imageUrl, "anonymous");

  const layout = useMemo(() => {
    if (!image) return null;
    return fitContain(image.width, image.height, size.w, size.h);
  }, [image, size.w, size.h]);

  const [boxes, setBoxes] = useState<PixelBox[]>([]);
  const [draft, setDraft] = useState<PixelBox | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const stageToImage = useCallback(
    (sx: number, sy: number) => {
      if (!layout || !image) return null;
      const ix = (sx - layout.x) / layout.scale;
      const iy = (sy - layout.y) / layout.scale;
      if (ix < 0 || iy < 0 || ix > image.width || iy > image.height) return null;
      return {
        x: clamp(ix, 0, image.width),
        y: clamp(iy, 0, image.height),
      };
    },
    [layout, image],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!image || !layout) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      const p = stageToImage(pos.x, pos.y);
      if (!p) return;
      dragStart.current = p;
      setDraft({
        id: "draft",
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
      });
    },
    [image, layout, stageToImage],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!dragStart.current || !image || !layout) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      const p = stageToImage(pos.x, pos.y);
      if (!p) return;
      const { x, y, width, height } = normalizeRect(
        dragStart.current.x,
        dragStart.current.y,
        p.x,
        p.y,
      );
      const cx = clamp(x, 0, image.width);
      const cy = clamp(y, 0, image.height);
      const cw = clamp(width, 0, image.width - cx);
      const ch = clamp(height, 0, image.height - cy);
      setDraft({ id: "draft", x: cx, y: cy, width: cw, height: ch });
    },
    [image, layout, stageToImage],
  );

  const handleMouseUp = useCallback(() => {
    if (!draft || draft.width < 4 || draft.height < 4) {
      dragStart.current = null;
      setDraft(null);
      return;
    }
    setBoxes((prev) => [
      ...prev,
      { ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` },
    ]);
    dragStart.current = null;
    setDraft(null);
  }, [draft]);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-3xl border border-white/10 bg-stone-900/40">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-3xl border border-red-500/30 bg-stone-900/40 px-6 text-center text-sm text-red-300">
        Could not load image (check CORS or URL).
      </div>
    );
  }

  if (status === "loading" || !image || !layout) {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-3xl border border-white/10 bg-stone-900/40">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
      </div>
    );
  }

  const draftList = draft && (draft.width > 0 || draft.height > 0) ? [draft] : [];

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[320px] w-full overflow-hidden rounded-3xl border border-white/10 bg-stone-900/60 shadow-2xl shadow-black/40"
    >
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          <Group x={layout.x} y={layout.y} scaleX={layout.scale} scaleY={layout.scale}>
            <KonvaImage image={image} width={image.width} height={image.height} />
            {boxes.map((b) => (
              <Rect
                key={b.id}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                stroke="#fb923c"
                strokeWidth={2 / layout.scale}
                fill="rgba(251, 146, 60, 0.12)"
              />
            ))}
            {draftList.map((b) => (
              <Rect
                key="draft"
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                stroke="#f97316"
                strokeWidth={2 / layout.scale}
                dash={[8 / layout.scale, 6 / layout.scale]}
                fill="rgba(249, 115, 22, 0.15)"
              />
            ))}
          </Group>
        </Layer>
      </Stage>
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 backdrop-blur-md">
        Drag on the image to draw a box
      </p>
    </div>
  );
}
