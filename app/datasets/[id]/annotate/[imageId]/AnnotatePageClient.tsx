"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Box,
  CircleDot,
  Cuboid,
  Hexagon,
  MousePointer2,
  PenLine,
  Save,
  Spline,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AnnotationEditor from "@/components/annotate/AnnotationEditor";
import type { Tool } from "@/components/annotate/AnnotationEditor";
import { getDataset, getDatasetMedia } from "@/lib/api/datasets";
import { getClassesForProject } from "@/lib/api/classes";
import { getJobAnnotations, patchJobAnnotations } from "@/lib/api/jobs";
import { ApiError, getAccessToken } from "@/lib/api/client";
import type { EditorShape, LabelDefinition } from "@/lib/types/annotation";
import { useAuth } from "@/lib/auth";

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

function apiShapesToEditor(
  rows: { id: number; class_label: number; type: string; data: Record<string, unknown> }[]
): EditorShape[] {
  const out: EditorShape[] = [];
  for (const r of rows) {
    if (r.type === "bbox" || r.type === "rectangle") {
      const d = r.data as { x: number; y: number; width: number; height: number };
      out.push({
        clientId: `srv-${r.id}`,
        classLabelId: r.class_label,
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
      });
    } else if (r.type === "polygon") {
      const d = r.data as { points?: number[] };
      const pts = d.points;
      if (pts && pts.length >= 6) {
        const bb = bboxFromPoints(pts);
        out.push({
          clientId: `srv-${r.id}`,
          classLabelId: r.class_label,
          ...bb,
          points: pts,
        });
      }
    }
  }
  return out;
}

function editorToApiPayload(shapes: EditorShape[]) {
  return shapes.map((s) => {
    if (s.points && s.points.length >= 6) {
      return {
        class_label: s.classLabelId,
        type: "polygon" as const,
        data: { points: s.points },
        frame: 0,
      };
    }
    return {
      class_label: s.classLabelId,
      type: "bbox" as const,
      data: {
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
      },
      frame: 0,
    };
  });
}

const TOOLBAR: { tool: Tool; icon: React.ReactNode; label: string; key: string }[] = [
  { tool: "select", icon: <MousePointer2 className="w-4 h-4" />, label: "Select", key: "V" },
  { tool: "rectangle", icon: <Box className="w-4 h-4" />, label: "Box", key: "N" },
  { tool: "polygon", icon: <Hexagon className="w-4 h-4" />, label: "Polygon", key: "P" },
  { tool: "polyline", icon: <Spline className="w-4 h-4" />, label: "Polyline", key: "L" },
  { tool: "points", icon: <CircleDot className="w-4 h-4" />, label: "Points", key: "K" },
  { tool: "cuboid", icon: <Cuboid className="w-4 h-4" />, label: "Cuboid", key: "C" },
  { tool: "tag", icon: <Tag className="w-4 h-4" />, label: "Tag", key: "T" },
];

export default function AnnotatePageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady } = useAuth();

  const datasetId = Number(params.id);
  const mediaId = Number(params.imageId);
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [labels, setLabels] = useState<LabelDefinition[]>([]);
  const [activeClassId, setActiveClassId] = useState(0);
  const [shapes, setShapes] = useState<EditorShape[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("rectangle");
  /** Vertices for polygon tool (click to place each corner). */
  const [polygonVertexCount, setPolygonVertexCount] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const token = getAccessToken();
      const demoUrl = `https://picsum.photos/seed/${params.imageId}/1200/800`;

      if (!token) {
        setImageUrl(demoUrl);
        setLabels([
          { id: 1, name: "demo_a", color: "#ef4444" },
          { id: 2, name: "demo_b", color: "#3b82f6" },
        ]);
        setActiveClassId(1);
        setLoading(false);
        return;
      }

      try {
        const ds = await getDataset(datasetId);
        const mediaList = await getDatasetMedia(datasetId);
        const media = mediaList.find((m) => m.id === mediaId);
        const classes = await getClassesForProject(ds.project);
        if (cancelled) return;

        setLabels(
          classes.map((c) => ({ id: c.id, name: c.name, color: c.color || "#f97316" }))
        );
        if (classes.length) setActiveClassId(classes[0].id);

        if (media?.file_url) {
          setImageUrl(media.file_url);
        } else {
          setImageUrl(demoUrl);
        }

        if (!Number.isNaN(jobId)) {
          const ann = await getJobAnnotations(jobId);
          if (!cancelled) setShapes(apiShapesToEditor(ann));
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          setError(e.body || e.message);
        } else {
          setError("Failed to load dataset.");
        }
        setImageUrl(demoUrl);
        setLabels([
          { id: 1, name: "demo_a", color: "#ef4444" },
          { id: 2, name: "demo_b", color: "#3b82f6" },
        ]);
        setActiveClassId(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authReady, datasetId, mediaId, jobId, params.imageId]);

  const handleSave = async () => {
    if (Number.isNaN(jobId)) {
      setError(
        "Add ?jobId=<id> to the URL to save to the API (authenticated), or rely on local demo mode."
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patchJobAnnotations(jobId, editorToApiPayload(shapes));
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.body || e.message);
      } else {
        setError("Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-screen bg-[#fcfaf7] overflow-hidden">
      <nav className="z-30 px-6 py-3 bg-white/90 backdrop-blur-xl border-b border-stone-200/80 flex items-center justify-between shadow-sm shadow-stone-200/40">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-500 hover:text-stone-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-stone-200" />
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-none">
              Annotation workspace
            </h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
              Dataset {params.id} · Media {params.imageId}
              {!Number.isNaN(jobId) ? ` · Job ${jobId}` : " · Demo mode"}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-2xl border border-stone-200/80">
            {TOOLBAR.map(({ tool, icon, label, key }) => (
              <button
                key={tool}
                type="button"
                title={`${label} (${key})`}
                onClick={() => setActiveTool(tool)}
                className={`rounded-xl px-2 py-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTool === tool
                    ? "bg-white text-orange-600 shadow-md shadow-orange-500/10"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {icon}
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
          {activeTool === "polygon" && (
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              <span>Points</span>
              <select
                value={polygonVertexCount}
                onChange={(e) => setPolygonVertexCount(Number(e.target.value))}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 normal-case"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-lg shadow-stone-300/50 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        </div>
      </nav>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <main className="flex-grow flex overflow-hidden">
        <aside className="w-16 flex flex-col items-center py-6 gap-4 bg-white/80 border-r border-stone-200/80 z-20">
          <div className="flex flex-col gap-2">
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                title={l.name}
                onClick={() => setActiveClassId(l.id)}
                className={`w-9 h-9 rounded-xl border-2 transition-all ${
                  activeClassId === l.id
                    ? "border-stone-900 scale-105 shadow-md"
                    : "border-white/30 opacity-60 hover:opacity-100"
                }`}
                style={{ backgroundColor: l.color }}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 text-stone-400">
            <PenLine className="w-5 h-5" />
          </div>
        </aside>

        <div className="flex-grow p-4 relative overflow-hidden flex items-center justify-center min-h-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-sm font-medium">Loading media…</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full h-full min-h-[420px] max-h-[calc(100vh-8rem)]"
            >
              <AnnotationEditor
                imageUrl={imageUrl}
                labels={labels}
                activeClassId={activeClassId}
                shapes={shapes}
                onShapesChange={setShapes}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                polygonVertexCount={polygonVertexCount}
              />
            </motion.div>
          )}
        </div>

        <aside className="w-80 bg-white/90 backdrop-blur-xl border-l border-stone-200/80 p-6 flex flex-col z-20 overflow-y-auto shadow-xl shadow-stone-200/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">
              Objects
            </h3>
            <span className="px-2 py-0.5 bg-stone-100 text-[10px] font-bold text-stone-500 rounded-lg">
              {shapes.length} total
            </span>
          </div>

          <div className="space-y-3">
            {shapes.length === 0 && (
              <p className="text-sm text-stone-500 leading-relaxed">
                Box: drag on the image (N). Polygon: choose point count, then click each
                corner (P). <code className="text-orange-600">Esc</code> cancels polygon in
                progress. With <code className="text-orange-600">jobId</code> + auth, Save
                syncs to the API.
              </p>
            )}
            {shapes.map((s) => {
              const name = labels.find((x) => x.id === s.classLabelId)?.name ?? "?";
              const col = labels.find((x) => x.id === s.classLabelId)?.color ?? "#999";
              return (
                <div
                  key={s.clientId}
                  className="group p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 hover:border-orange-200 hover:bg-white transition-all cursor-pointer"
                  onClick={() => setActiveClassId(s.classLabelId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col }}
                      />
                      <span className="text-xs font-bold text-stone-900">{name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {s.points && s.points.length >= 6
                        ? `${s.points.length / 2} pts`
                        : `${Math.round(s.width)}×${Math.round(s.height)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
