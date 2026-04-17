"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Link2,
  Play,
  Redo2,
  Trash2,
  Undo2,
  Box,
  CircleDot,
  Cuboid,
  Hexagon,
  MousePointer2,
  Save,
  Spline,
  Tag,
  Loader2,
  AlertCircle,
  RectangleVertical,
  Square,
} from "lucide-react";
import AnnotationEditor from "@/components/annotate/AnnotationEditor";
import type { Tool } from "@/components/annotate/AnnotationEditor";
import { datasets as visioxDatasets } from "@/lib/api";
import { getDataset, getDatasetMedia } from "@/lib/api/datasets";
import type { ClassDto } from "@/lib/api/classes";
import { getClassesForProject } from "@/lib/api/classes";
import {
  apiShapesToEditor,
  editorToApiPayload,
  mergeProjectClassesWithProfile,
} from "@/lib/annotation-core";
import {
  getJobAnnotations,
  patchJobAnnotations,
  getMediaAnnotations,
  putMediaAnnotations,
  getFrameAnnotations,
  putFrameAnnotations,
} from "@/lib/api/jobs";
import {
  getFrameLabelProfile,
  getMediaLabelProfile,
  putFrameLabelProfile,
  putMediaLabelProfile,
} from "@/lib/api/labelProfile";
import { ApiError, getAccessToken } from "@/lib/api/client";
import type { EditorShape, LabelDefinition } from "@/lib/types/annotation";
import { useAuth } from "@/lib/auth";

function draftStorageKey(
  datasetId: number,
  imageId: string,
  isNativeMode: boolean,
  frameIndex: number,
  mediaId: number
) {
  if (isNativeMode) return `visiox-annotate-draft:dataset:${datasetId}:frame:${frameIndex}`;
  return `visiox-annotate-draft:dataset:${datasetId}:media:${mediaId}:image:${imageId}`;
}

const TOOLBAR: { tool: Tool; icon: React.ReactNode; label: string; key: string }[] = [
  { tool: "select", icon: <MousePointer2 className="w-4 h-4" />, label: "Select", key: "V" },
  { tool: "rectangle", icon: <Square className="w-4 h-4" />, label: "Box", key: "N" },
  { tool: "polygon", icon: <Hexagon className="w-4 h-4" />, label: "Polygon", key: "P" },
  { tool: "polyline", icon: <Spline className="w-4 h-4" />, label: "Polyline", key: "L" },
  { tool: "points", icon: <CircleDot className="w-4 h-4" />, label: "Points", key: "K" },
  { tool: "cuboid", icon: <Box className="w-4 h-4" />, label: "Cuboid", key: "C" },
  { tool: "tag", icon: <Tag className="w-4 h-4" />, label: "Tag", key: "T" },
];

const DEMO_LABELS = [
  { id: 1, name: "demo_a", color: "#ef4444" },
  { id: 2, name: "demo_b", color: "#3b82f6" },
] as const;

export default function AnnotatePageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady } = useAuth();

  const datasetId = Number(params.id);
  /** `/datasets/:id/annotate/native?frame=N` — imageId segment is the literal "native", not a media PK. */
  const rawImageId = String(params.imageId ?? "");
  const isNativeMode = rawImageId.toLowerCase() === "native";
  const frameIndex = (() => {
    const n = parseInt(searchParams.get("frame") ?? "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const mediaId = isNativeMode ? NaN : Number(rawImageId);
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [labels, setLabels] = useState<LabelDefinition[]>([]);
  const [activeClassId, setActiveClassId] = useState(0);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const [mediaTotal, setMediaTotal] = useState<number | null>(null);
  const [mediaList, setMediaList] = useState<{ id: number; file_url?: string | null; filename?: string }[]>([]);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const [frameInput, setFrameInput] = useState<string>("");

  const [shapes, _setShapes] = useState<EditorShape[]>([]);
  const pastRef = useRef<EditorShape[][]>([]);
  const futureRef = useRef<EditorShape[][]>([]);
  const shapesRef = useRef<EditorShape[]>([]);
  shapesRef.current = shapes;
  const isLoadingRef = useRef(false);
  const currentDraftKey = useMemo(
    () => draftStorageKey(datasetId, rawImageId, isNativeMode, frameIndex, mediaId),
    [datasetId, rawImageId, isNativeMode, frameIndex, mediaId]
  );

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const setShapes: React.Dispatch<React.SetStateAction<EditorShape[]>> = (action) => {
    _setShapes((prev) => {
      const next = typeof action === "function" ? (action as (p: EditorShape[]) => EditorShape[])(prev) : action;
      if (next === prev) return prev;
      pastRef.current.push(prev);
      futureRef.current = [];
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoadingRef.current) return;
    try {
      sessionStorage.setItem(currentDraftKey, JSON.stringify(shapes));
    } catch {
      // quota / security errors are harmless for drafts
    }
  }, [currentDraftKey, shapes]);

  const undo = () => {
    const past = pastRef.current;
    if (!past.length) return;
    const prev = past.pop()!;
    futureRef.current.push(shapesRef.current);
    _setShapes(prev);
  };

  const redo = () => {
    const future = futureRef.current;
    if (!future.length) return;
    const next = future.pop()!;
    pastRef.current.push(shapesRef.current);
    _setShapes(next);
  };

  const [activeTool, setActiveTool] = useState<Tool>("rectangle");
  /** Vertices for polygon tool (click to place each corner). */
  const [polygonVertexCount, setPolygonVertexCount] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function load() {
      // Snapshot the current shapes to sessionStorage for the PREVIOUS image
      // before we clear them, so navigating back restores them.
      if (typeof window !== "undefined" && shapesRef.current.length > 0) {
        try {
          const prevKey = sessionStorage.getItem("visiox-annotate-draft:active-key");
          if (prevKey) {
            sessionStorage.setItem(prevKey, JSON.stringify(shapesRef.current));
          }
        } catch { /* ignore */ }
      }

      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      pastRef.current = [];
      futureRef.current = [];
      _setShapes([]);

      // Track which key is currently active so we can snapshot on next navigate.
      try { sessionStorage.setItem("visiox-annotate-draft:active-key", currentDraftKey); } catch { /* ignore */ }

      const token = getAccessToken();
      const demoUrl = `https://picsum.photos/seed/${isNativeMode ? `native-${datasetId}-f${frameIndex}` : params.imageId}/1200/800`;

      if (!token) {
        setImageUrl(demoUrl);
        setLabels([...DEMO_LABELS]);
        setActiveClassId(1);
        isLoadingRef.current = false;
        setLoading(false);
        return;
      }

      try {
        if (!Number.isFinite(datasetId)) {
          throw new Error("Invalid dataset id.");
        }

        const ds = await getDataset(datasetId);
        const classesPromise = getClassesForProject(ds.project).catch((): ClassDto[] => []);
        const annotationsPromise: Promise<Awaited<ReturnType<typeof getJobAnnotations>>> = !Number.isNaN(jobId)
          ? getJobAnnotations(jobId)
          : !isNativeMode && Number.isFinite(mediaId)
            ? getMediaAnnotations(mediaId).catch(() => [])
            : isNativeMode && Number.isFinite(datasetId)
              ? getFrameAnnotations(datasetId, frameIndex).catch(() => [])
              : Promise.resolve([]);
        const profilePromise: Promise<{ id: number; name: string; color: string }[]> = Number.isNaN(jobId)
          ? isNativeMode && Number.isFinite(datasetId)
            ? getFrameLabelProfile(datasetId, frameIndex).catch(() => [])
            : !isNativeMode && Number.isFinite(mediaId)
              ? getMediaLabelProfile(mediaId).catch(() => [])
              : Promise.resolve([])
          : Promise.resolve([]);

        let resolvedImageUrl = demoUrl;
        let classes: ClassDto[] = [];
        let ann: Awaited<ReturnType<typeof getJobAnnotations>> = [];
        let profileItems: { id: number; name: string; color: string }[] = [];

        if (isNativeMode) {
          // In native mode the image URL is deterministic from (datasetId, frameIndex)
          // so we can start downloading it immediately — in parallel with all API calls.
          resolvedImageUrl = visioxDatasets.frameUrl(datasetId, frameIndex);
          setImageUrl(resolvedImageUrl);
          setMediaIndex(null);
          setMediaTotal(null);
          setMediaList([]);
          setCurrentFilename(`Frame ${frameIndex}`);
          setFrameInput(String(frameIndex));

          [classes, ann, profileItems] = await Promise.all([classesPromise, annotationsPromise, profilePromise]);
        } else {
          const mediaListPromise = getDatasetMedia(datasetId);

          const [list, cls, annotations, profile] = await Promise.all([
            mediaListPromise,
            classesPromise,
            annotationsPromise,
            profilePromise,
          ]);
          classes = cls;
          ann = annotations;
          profileItems = profile;
          setMediaTotal(list.length);
          setMediaList(list);
          const media = list.find((m) => m.id === mediaId);
          const idx = list.findIndex((m) => m.id === mediaId);
          setMediaIndex(idx >= 0 ? idx + 1 : null);
          setFrameInput(idx >= 0 ? String(idx + 1) : "1");
          const fname = (media as { filename?: string })?.filename
            ?? media?.file_url?.split("/").pop()
            ?? `media-${mediaId}`;
          setCurrentFilename(fname);
          if (media?.file_url) {
            resolvedImageUrl = media.file_url;
          }
          // We only know the URL after media list resolves — still kick it off ASAP.
          setImageUrl(resolvedImageUrl);
        }

        if (cancelled) return;

        if (classes.length) {
          const merged =
            profileItems.length > 0
              ? mergeProjectClassesWithProfile(classes, profileItems)
              : classes.map((c) => ({ id: c.id, name: c.name, color: c.color || "#f97316" }));
          setLabels(merged);
          setActiveClassId(merged[0]?.id ?? classes[0].id);
        } else {
          setLabels([...DEMO_LABELS]);
          setActiveClassId(1);
        }

        if (!cancelled) {
          const apiShapes = apiShapesToEditor(ann);
          if (apiShapes.length > 0) {
            _setShapes(apiShapes);
          } else if (typeof window !== "undefined") {
            try {
              const rawDraft = sessionStorage.getItem(currentDraftKey);
              _setShapes(rawDraft ? (JSON.parse(rawDraft) as EditorShape[]) : []);
            } catch {
              _setShapes([]);
            }
          } else {
            _setShapes([]);
          }
          isLoadingRef.current = false;
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          setError(e.body || e.message);
        } else {
          setError(e instanceof Error ? e.message : "Failed to load dataset.");
        }
        setImageUrl(demoUrl);
        setLabels([...DEMO_LABELS]);
        setActiveClassId(1);
        setMediaIndex(null);
        setMediaTotal(null);
        setMediaList([]);
        setCurrentFilename("");
        setFrameInput("");
      } finally {
        if (!cancelled) {
          isLoadingRef.current = false;
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authReady, currentDraftKey, datasetId, mediaId, jobId, params.imageId, isNativeMode, frameIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.ctrlKey && !e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = mediaTotal ?? 0;
  const current = mediaIndex ?? 1; // 1-based

  // Warm the HTTP cache for prev/next frames so clicking navigation feels instant.
  // Uses an off-DOM Image — the browser shares its cache with <img> / Konva use-image.
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (!imageUrl) return;

    const urls: string[] = [];
    if (isNativeMode) {
      if (frameIndex > 0) urls.push(visioxDatasets.frameUrl(datasetId, frameIndex - 1));
      urls.push(visioxDatasets.frameUrl(datasetId, frameIndex + 1));
    } else if (mediaList.length && mediaIndex) {
      const prev = mediaList[mediaIndex - 2]; // mediaIndex is 1-based
      const next = mediaList[mediaIndex]; // already 1-based -> next element
      if (prev?.file_url) urls.push(prev.file_url);
      if (next?.file_url) urls.push(next.file_url);
    }

    const imgs = urls.map((u) => {
      const img = new Image();
      img.decoding = "async";
      img.src = u;
      return img;
    });

    return () => {
      for (const img of imgs) img.src = "";
    };
  }, [loading, imageUrl, isNativeMode, datasetId, frameIndex, mediaList, mediaIndex]);

  const navigateTo = useCallback(
    (oneBasedIdx: number) => {
      setLoading(true);
      if (isNativeMode) {
        const clamped = Math.max(0, oneBasedIdx - 1);
        router.push(`/datasets/${params.id}/annotate/native?frame=${clamped}${jobIdParam ? `&jobId=${jobIdParam}` : ""}`);
        return;
      }
      const clamped = Math.max(1, Math.min(total, oneBasedIdx));
      const target = mediaList[clamped - 1];
      if (!target) return;
      router.push(`/datasets/${params.id}/annotate/${target.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
    },
    [isNativeMode, total, mediaList, params.id, router, jobIdParam]
  );

  const handleFrameInputCommit = () => {
    const n = parseInt(frameInput, 10);
    if (!Number.isNaN(n)) navigateTo(n);
    else setFrameInput(String(current));
  };

  // IMPORTANT: Avoid reading localStorage during render (SSR vs CSR mismatch).
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  const isLoggedIn = !!accessToken;
  const canSaveToApi =
    isLoggedIn &&
    (!Number.isNaN(jobId) ||
      (!isNativeMode && Number.isFinite(mediaId)) ||
      (isNativeMode && Number.isFinite(datasetId)));

  const handleSave = async () => {
    const tokenNow = getAccessToken();
    const isLoggedInNow = !!tokenNow;
    if (!isLoggedInNow) {
      setError("Login required to save. In demo mode annotations are kept in-memory only.");
      return;
    }
    if (!canSaveToApi) {
      setError("Cannot determine save target. Check the URL has a valid dataset/media/job id.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = editorToApiPayload(shapes);
      if (!Number.isNaN(jobId)) {
        await patchJobAnnotations(jobId, payload);
      } else if (isNativeMode) {
        await putFrameAnnotations(datasetId, frameIndex, payload);
      } else {
        await putMediaAnnotations(mediaId, payload);
      }
      // Persist per-image label roster (Postgres) alongside annotations.
      if (Number.isNaN(jobId) && labels.length) {
        const labelPayload = labels.map((l) => ({ id: l.id, name: l.name, color: l.color }));
        try {
          if (isNativeMode) {
            await putFrameLabelProfile(datasetId, frameIndex, labelPayload);
          } else if (Number.isFinite(mediaId)) {
            await putMediaLabelProfile(mediaId, labelPayload);
          }
        } catch {
          // Non-fatal: annotations already saved; surface a softer warning.
          setError((prev) => prev || "Annotations saved, but label profile sync failed.");
        }
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(currentDraftKey, JSON.stringify(shapes));
      }
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
      <nav className="z-30 px-4 py-2.5 bg-white/90 backdrop-blur-xl border-b border-stone-200/80 flex items-center justify-between gap-3 shadow-sm shadow-stone-200/40">
        {/* LEFT: back + title + undo/redo */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/datasets/${params.id}`)}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-500 hover:text-stone-900 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-stone-200 shrink-0" />
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-bold text-stone-900 leading-none">Annotation workspace</h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5 truncate">
              Dataset {params.id}
              {isNativeMode ? ` · Frame ${frameIndex}` : ` · Media ${params.imageId}`}
              {!Number.isNaN(jobId) ? ` · Job ${jobId}` : canSaveToApi ? " · Direct" : " · Demo"}
            </p>
          </div>
          <div className="h-6 w-px bg-stone-200 shrink-0 hidden sm:block" />
          {/* Undo / Redo on the left */}
          <div className="flex items-center gap-1 rounded-xl border border-stone-200/80 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-white hover:shadow-sm disabled:opacity-35"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-white hover:shadow-sm disabled:opacity-35"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT: save */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
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

      <main className="flex-grow flex overflow-hidden min-h-0">
        <aside className="w-[4.25rem] sm:w-[5.25rem] shrink-0 flex flex-col items-stretch gap-3 py-4 px-1.5 sm:px-2 bg-white/90 border-r border-stone-200/80 z-20 overflow-y-auto shadow-sm shadow-stone-200/30">
        <div className="flex flex-col gap-1 p-1">
            {TOOLBAR.map(({ tool, icon, label, key }) =>
              tool === "polygon" ? (
                <div key="polygon" className="flex flex-col gap-1">
                  <button
                    type="button"
                    title={`${label} (${key})`}
                    onClick={() => setActiveTool(tool)}
                    className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-2 text-[8px] font-bold uppercase tracking-wide transition-all ${
                      activeTool === tool
                        ? "bg-white text-orange-600 shadow-md shadow-orange-500/10"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    {icon}
                    <span className="leading-none text-center max-w-full truncate px-0.5">
                      {label}
                    </span>
                  </button>
                  {activeTool === "polygon" && (
                    <label className="flex flex-col gap-1 rounded-xl border border-stone-200/80 bg-white/90 px-1.5 py-2">
                      <span className="text-[7px] font-bold uppercase tracking-wider text-stone-500 text-center leading-none">
                        Points
                      </span>
                      <select
                        value={polygonVertexCount}
                        onChange={(e) => setPolygonVertexCount(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-1 py-1 text-[10px] font-semibold text-stone-800"
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
              ) : (
                <button
                  key={tool}
                  type="button"
                  title={`${label} (${key})`}
                  onClick={() => setActiveTool(tool)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[8px] font-bold uppercase tracking-wide transition-all ${
                    activeTool === tool
                      ? "bg-white text-orange-600 shadow-md shadow-orange-500/10"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {icon}
                  <span className="leading-none text-center max-w-full truncate px-0.5">{label}</span>
                </button>
              )
            )}
          </div>
        </aside>

        <div className="flex-grow p-4 relative overflow-hidden flex items-stretch justify-stretch min-h-0">
          {loading ? (
            <div className="absolute inset-4 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="text-sm font-medium">Loading media…</span>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full h-full min-h-0"
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
                progress. Save syncs annotations to the API per image.
              </p>
            )}
            {shapes.map((s) => {
              const name = labels.find((x) => x.id === s.classLabelId)?.name ?? "?";
              const col = labels.find((x) => x.id === s.classLabelId)?.color ?? "#999";
              return (
                <div
                  key={s.clientId}
                  className="group space-y-2 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 transition-all hover:border-orange-200 hover:bg-white"
                >
                  <div className="flex cursor-pointer items-center justify-between" onClick={() => setActiveClassId(s.classLabelId)}>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: col }}
                      />
                      <span className="text-xs font-bold text-stone-900">{name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-stone-400">
                      {s.points && s.points.length >= 6
                        ? `${s.points.length / 2} pts`
                        : `${Math.round(s.width)}×${Math.round(s.height)}`}
                    </span>
                  </div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    Class
                    <select
                      className="mt-1 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
                      value={s.classLabelId}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const nextClass = Number(e.target.value);
                        setShapes((prev) =>
                          prev.map((sh) =>
                            sh.clientId === s.clientId ? { ...sh, classLabelId: nextClass } : sh
                          )
                        );
                        setActiveClassId(nextClass);
                      }}
                    >
                      {labels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* ───── Bottom navigation pane ───── */}
      <div className="z-30 shrink-0 flex items-center gap-3 px-4 py-2 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] select-none">
        {/* Player buttons */}
        <div className="flex items-center gap-0.5">
          {(
            [
              { icon: <ChevronFirst className="w-3.5 h-3.5" />, label: "First", action: () => navigateTo(1) },
              { icon: <ChevronsLeft className="w-3.5 h-3.5" />, label: "Back 10", action: () => navigateTo(current - 10) },
              { icon: <ChevronLeft className="w-3.5 h-3.5" />, label: "Prev", action: () => navigateTo(current - 1) },
              { icon: <Play className="w-3 h-3" />, label: "Play", action: () => {} },
              { icon: <ChevronRight className="w-3.5 h-3.5" />, label: "Next", action: () => navigateTo(current + 1) },
              { icon: <ChevronsRight className="w-3.5 h-3.5" />, label: "Forward 10", action: () => navigateTo(current + 10) },
              { icon: <ChevronLast className="w-3.5 h-3.5" />, label: "Last", action: () => navigateTo(total || 1) },
            ] as { icon: React.ReactNode; label: string; action: () => void }[]
          ).map(({ icon, label, action }) => (
            <button
              key={label}
              type="button"
              title={label}
              onClick={action}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200"
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="relative flex-1 flex items-center min-w-0">
          <input
            type="range"
            min={1}
            max={Math.max(1, total)}
            value={current}
            onChange={(e) => navigateTo(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full bg-stone-200 accent-orange-500 cursor-pointer"
          />
        </div>

        {/* Filename + icons */}
        <div className="flex items-center gap-2 min-w-0 max-w-[14rem]">
          <span
            className="truncate text-[11px] font-semibold text-stone-600"
            title={currentFilename}
          >
            {currentFilename || (isNativeMode ? `Frame ${frameIndex}` : `Media ${params.imageId}`)}
          </span>
          <button
            type="button"
            title="Copy link"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="shrink-0 text-stone-400 hover:text-stone-700 transition"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Delete annotation"
            onClick={() => { pastRef.current.push(shapes); futureRef.current = []; _setShapes([]); }}
            className="shrink-0 text-stone-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Frame number input */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={1}
            max={Math.max(1, total)}
            value={frameInput}
            onChange={(e) => setFrameInput(e.target.value)}
            onBlur={handleFrameInputCommit}
            onKeyDown={(e) => { if (e.key === "Enter") handleFrameInputCommit(); }}
            className="w-14 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-center text-[11px] font-bold text-stone-800 tabular-nums outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
          />
          {total > 0 && (
            <span className="text-[10px] font-semibold text-stone-400">/ {total}</span>
          )}
        </div>
      </div>
    </div>
  );
}
