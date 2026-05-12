"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Hexagon,
  Link2,
  Loader2,
  MousePointer2,
  Play,
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
import { useAuth } from "@/lib/auth";
import { datasets as visioxDatasets } from "@/lib/api";
import type { ClassDto } from "@/lib/api/classes";
import { getClassesForProject } from "@/lib/api/classes";
import { getDataset, getDatasetMedia } from "@/lib/api/datasets";
import {
  getFrameAnnotations,
  getJobAnnotations,
  getMediaAnnotations,
  patchJobAnnotations,
  putFrameAnnotations,
  putMediaAnnotations,
} from "@/lib/api/jobs";
import {
  getFrameLabelProfile,
  getMediaLabelProfile,
  putFrameLabelProfile,
  putMediaLabelProfile,
} from "@/lib/api/labelProfile";
import { ApiError, getAccessToken } from "@/lib/api/client";
import {
  AnnotationSession,
  apiShapesToEditor,
  editorToApiPayload,
  mergeProjectClassesWithProfile,
} from "@/lib/annotation";
import type { EditorShape, LabelDefinition } from "@/lib/annotation";

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
  { tool: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select", key: "V" },
  { tool: "rectangle", icon: <Square className="h-4 w-4" />, label: "Box", key: "N" },
  { tool: "polygon", icon: <Hexagon className="h-4 w-4" />, label: "Polygon", key: "P" },
  { tool: "polyline", icon: <Spline className="h-4 w-4" />, label: "Polyline", key: "L" },
  { tool: "points", icon: <CircleDot className="h-4 w-4" />, label: "Points", key: "K" },
  { tool: "cuboid", icon: <Box className="h-4 w-4" />, label: "Cuboid", key: "C" },
  { tool: "tag", icon: <Tag className="h-4 w-4" />, label: "Tag", key: "T" },
];

const DEMO_LABELS = [
  { id: 1, name: "demo_a", color: "#ef4444" },
  { id: 2, name: "demo_b", color: "#3b82f6" },
] as const;

const PRELOAD_AHEAD = 6;
const PRELOAD_BEHIND = 2;
const PANE_WIDTH_STORAGE_KEY = "visiox-annotate-pane-widths";
const TOOL_PANE_DEFAULT = 84;
const TOOL_PANE_MIN = 68;
const TOOL_PANE_MAX = 180;
const OBJECTS_PANE_DEFAULT = 320;
const OBJECTS_PANE_MIN = 260;
const OBJECTS_PANE_MAX = 520;

function clampPaneWidth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function objectSummary(shape: EditorShape): string {
  if (shape.shapeType === "tag") return "tag";
  if (shape.points && shape.points.length >= 2) return `${shape.shapeType} ${shape.points.length / 2} pts`;
  return `${Math.round(shape.width)}x${Math.round(shape.height)}`;
}

function wrapIndex(oneBasedIdx: number, total: number): number {
  if (total <= 0) return 1;
  const wrapped = ((oneBasedIdx - 1) % total + total) % total;
  return wrapped + 1;
}

export default function AnnotatePageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady } = useAuth();

  const datasetId = Number(params.id);
  const rawImageId = String(params.imageId ?? "");
  const isNativeMode = rawImageId.toLowerCase() === "native";
  const frameIndex = (() => {
    const n = parseInt(searchParams.get("frame") ?? "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const mediaId = isNativeMode ? Number.NaN : Number(rawImageId);
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : Number.NaN;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [labels, setLabels] = useState<LabelDefinition[]>([]);
  const [activeClassId, setActiveClassId] = useState(0);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const [mediaTotal, setMediaTotal] = useState<number | null>(null);
  const [mediaList, setMediaList] = useState<{ id: number; file_url?: string | null; filename?: string }[]>([]);
  const [currentFilename, setCurrentFilename] = useState("");
  const [frameInput, setFrameInput] = useState("");
  const [sliderValue, setSliderValue] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("rectangle");
  const [polygonVertexCount, setPolygonVertexCount] = useState(4);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [shapes, _setShapes] = useState<EditorShape[]>([]);
  const [toolPaneWidth, setToolPaneWidth] = useState(TOOL_PANE_DEFAULT);
  const [objectsPaneWidth, setObjectsPaneWidth] = useState(OBJECTS_PANE_DEFAULT);

  const sessionRef = useRef(new AnnotationSession());
  const shapesRef = useRef<EditorShape[]>([]);
  const isLoadingRef = useRef(false);
  const previousDraftKeyRef = useRef<string | null>(null);
  const draftCacheRef = useRef<Record<string, EditorShape[]>>({});
  const paneResizeRef = useRef<{
    target: "tools" | "objects";
    startX: number;
    startWidth: number;
  } | null>(null);
  shapesRef.current = shapes;

  const currentDraftKey = useMemo(
    () => draftStorageKey(datasetId, rawImageId, isNativeMode, frameIndex, mediaId),
    [datasetId, rawImageId, isNativeMode, frameIndex, mediaId]
  );

  const canUndo = sessionRef.current.canUndo;
  const canRedo = sessionRef.current.canRedo;

  const setShapes: React.Dispatch<React.SetStateAction<EditorShape[]>> = (action) => {
    _setShapes(sessionRef.current.update(action));
  };

  const persistDraft = useCallback((draftKey: string, draftShapes: EditorShape[]) => {
    draftCacheRef.current[draftKey] = draftShapes;
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draftShapes));
    } catch {
      // ignore draft persistence failures
    }
  }, []);

  const readDraft = useCallback(
    (draftKey: string): { exists: boolean; shapes: EditorShape[] } => {
      const cached = draftCacheRef.current[draftKey];
      if (cached) {
        return { exists: true, shapes: cached };
      }
      if (typeof window === "undefined") {
        return { exists: false, shapes: [] };
      }
      try {
        const rawDraft = sessionStorage.getItem(draftKey);
        if (rawDraft === null) return { exists: false, shapes: [] };
        const parsed = JSON.parse(rawDraft) as EditorShape[];
        draftCacheRef.current[draftKey] = parsed;
        return { exists: true, shapes: parsed };
      } catch {
        return { exists: false, shapes: [] };
      }
    },
    []
  );

  useLayoutEffect(() => {
    const previousDraftKey = previousDraftKeyRef.current;
    if (previousDraftKey && previousDraftKey !== currentDraftKey) {
      persistDraft(previousDraftKey, shapesRef.current);
    }
    previousDraftKeyRef.current = currentDraftKey;
    isLoadingRef.current = true;
    setLoading(true);
    _setShapes(sessionRef.current.hydrate([]));
  }, [currentDraftKey, persistDraft]);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(PANE_WIDTH_STORAGE_KEY) ?? "{}") as {
        tools?: number;
        objects?: number;
      };
      if (Number.isFinite(saved.tools)) {
        setToolPaneWidth(clampPaneWidth(saved.tools!, TOOL_PANE_MIN, TOOL_PANE_MAX));
      }
      if (Number.isFinite(saved.objects)) {
        setObjectsPaneWidth(clampPaneWidth(saved.objects!, OBJECTS_PANE_MIN, OBJECTS_PANE_MAX));
      }
    } catch {
      // Ignore invalid local pane preferences.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        PANE_WIDTH_STORAGE_KEY,
        JSON.stringify({ tools: toolPaneWidth, objects: objectsPaneWidth })
      );
    } catch {
      // Ignore preference persistence failures.
    }
  }, [objectsPaneWidth, toolPaneWidth]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoadingRef.current) return;
    persistDraft(currentDraftKey, shapes);
  }, [currentDraftKey, persistDraft, shapes]);

  const undo = () => {
    const previous = sessionRef.current.undo();
    if (previous) _setShapes(previous);
  };

  const redo = () => {
    const next = sessionRef.current.redo();
    if (next) _setShapes(next);
  };

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    async function load() {
      if (typeof window !== "undefined" && shapesRef.current.length > 0) {
        try {
          const prevKey = sessionStorage.getItem("visiox-annotate-draft:active-key");
          if (prevKey) persistDraft(prevKey, shapesRef.current);
        } catch {
          // ignore
        }
      }

      setError(null);

      try {
        sessionStorage.setItem("visiox-annotate-draft:active-key", currentDraftKey);
      } catch {
        // ignore
      }

      const token = getAccessToken();
      const demoUrl = `https://picsum.photos/seed/${isNativeMode ? `native-${datasetId}-f${frameIndex}` : rawImageId}/1200/800`;

      if (!token) {
        setImageUrl(demoUrl);
        setLabels([...DEMO_LABELS]);
        setActiveClassId(1);
        isLoadingRef.current = false;
        setLoading(false);
        return;
      }

      try {
        if (!Number.isFinite(datasetId)) throw new Error("Invalid dataset id.");

        const ds = await getDataset(datasetId);
        const statsPromise = visioxDatasets.stats(datasetId).catch(() => null);
        const classesPromise = getClassesForProject(ds.project).catch((): ClassDto[] => []);
        const annotationsPromise: Promise<Awaited<ReturnType<typeof getJobAnnotations>>> = !Number.isNaN(jobId)
          ? getJobAnnotations(jobId)
          : !isNativeMode && Number.isFinite(mediaId)
            ? getMediaAnnotations(mediaId).catch(() => [])
            : isNativeMode
              ? getFrameAnnotations(datasetId, frameIndex).catch(() => [])
              : Promise.resolve([]);
        const profilePromise: Promise<{ id: number; name: string; color: string }[]> = Number.isNaN(jobId)
          ? isNativeMode
            ? getFrameLabelProfile(datasetId, frameIndex).catch(() => [])
            : Number.isFinite(mediaId)
              ? getMediaLabelProfile(mediaId).catch(() => [])
              : Promise.resolve([])
          : Promise.resolve([]);

        let resolvedImageUrl = demoUrl;
        let classes: ClassDto[] = [];
        let annotations: Awaited<ReturnType<typeof getJobAnnotations>> = [];
        let profileItems: { id: number; name: string; color: string }[] = [];

        if (isNativeMode) {
          resolvedImageUrl = visioxDatasets.frameUrl(datasetId, frameIndex);
          setImageUrl(resolvedImageUrl);
          setMediaIndex(null);
          setMediaList([]);
          setCurrentFilename(`Frame ${frameIndex + 1}`);
          setFrameInput(String(frameIndex + 1));
          if (!cancelled) {
            setLoading(false);
          }
          const [stats, loadedClasses, loadedAnnotations, loadedProfile] = await Promise.all([
            statsPromise,
            classesPromise,
            annotationsPromise,
            profilePromise,
          ]);
          classes = loadedClasses;
          annotations = loadedAnnotations;
          profileItems = loadedProfile;
          setMediaTotal(stats?.cvat?.size ?? ds.media_count ?? null);
        } else {
          const mediaListPromise = getDatasetMedia(datasetId);
          const list = await mediaListPromise;
          setMediaTotal(list.length);
          setMediaList(list);
          const media = list.find((item) => item.id === mediaId);
          const idx = list.findIndex((item) => item.id === mediaId);
          setMediaIndex(idx >= 0 ? idx + 1 : null);
          setFrameInput(idx >= 0 ? String(idx + 1) : "1");
          setCurrentFilename(
            (media as { filename?: string })?.filename ?? media?.file_url?.split("/").pop() ?? `media-${mediaId}`
          );
          if (media?.file_url) resolvedImageUrl = media.file_url;
          setImageUrl(resolvedImageUrl);
          if (!cancelled) {
            setLoading(false);
          }
          [classes, annotations, profileItems] = await Promise.all([
            classesPromise,
            annotationsPromise,
            profilePromise,
          ]);
        }

        if (cancelled) return;

        if (classes.length) {
          const merged = profileItems.length
            ? mergeProjectClassesWithProfile(classes, profileItems)
            : classes.map((item) => ({ id: item.id, name: item.name, color: item.color || "#f97316" }));
          setLabels(merged);
          setActiveClassId(merged[0]?.id ?? classes[0].id);
        } else {
          setLabels([...DEMO_LABELS]);
          setActiveClassId(1);
        }

        const apiShapes = apiShapesToEditor(annotations);
        const draft = readDraft(currentDraftKey);
        if (draft.exists) {
          _setShapes(sessionRef.current.hydrate(draft.shapes));
        } else if (apiShapes.length > 0) {
          _setShapes(sessionRef.current.hydrate(apiShapes));
        } else {
          _setShapes(sessionRef.current.hydrate([]));
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.body || e.message : e instanceof Error ? e.message : "Failed to load dataset.");
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
  }, [authReady, currentDraftKey, datasetId, frameIndex, isNativeMode, jobId, mediaId, persistDraft, rawImageId, readDraft]);

  useEffect(() => {
    if (loading || typeof window === "undefined" || !imageUrl) return;
    const urls: string[] = [];
    if (isNativeMode) {
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        urls.push(visioxDatasets.frameUrl(datasetId, frameIndex + offset));
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        if (frameIndex - offset >= 0) {
          urls.push(visioxDatasets.frameUrl(datasetId, frameIndex - offset));
        }
      }
    } else if (mediaList.length && mediaIndex) {
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        const next = mediaList[mediaIndex - 1 + offset];
        if (next?.file_url) urls.push(next.file_url);
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        const prev = mediaList[mediaIndex - 1 - offset];
        if (prev?.file_url) urls.push(prev.file_url);
      }
    }

    const routeUrls: string[] = [];
    if (isNativeMode) {
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        routeUrls.push(`/datasets/${params.id}/annotate/native?frame=${frameIndex + offset}${jobIdParam ? `&jobId=${jobIdParam}` : ""}`);
      }
    } else if (mediaList.length && mediaIndex) {
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        const next = mediaList[mediaIndex - 1 + offset];
        if (next) {
          routeUrls.push(`/datasets/${params.id}/annotate/${next.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
        }
      }
    }

    routeUrls.forEach((url) => router.prefetch(url));

    const imgs = urls.map((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      return img;
    });
    return () => {
      for (const img of imgs) img.src = "";
    };
  }, [loading, imageUrl, isNativeMode, datasetId, frameIndex, mediaList, mediaIndex, params.id, router, jobIdParam]);

  const total = mediaTotal ?? 0;
  const current = isNativeMode ? frameIndex + 1 : mediaIndex ?? 1;
  const numberedLabels = useMemo(
    () => labels.map((label, index) => ({ ...label, shortcut: index + 1 })),
    [labels]
  );
  const isLoggedIn = !!accessToken;
  const canSaveToApi =
    isLoggedIn &&
    (!Number.isNaN(jobId) || (!isNativeMode && Number.isFinite(mediaId)) || (isNativeMode && Number.isFinite(datasetId)));

  useEffect(() => {
    if (loading) return;
    if (pendingIndex !== null && pendingIndex !== current) return;
    setPendingIndex(null);
    if (isScrubbing) return;
    setSliderValue(current);
  }, [current, isScrubbing, loading, pendingIndex]);

  const navigateTo = useCallback(
    (oneBasedIdx: number, options?: { wrap?: boolean }) => {
      const totalItems = Math.max(1, total);
      const nextIndex = options?.wrap
        ? wrapIndex(oneBasedIdx, totalItems)
        : Math.max(1, Math.min(totalItems, oneBasedIdx));
      setPendingIndex(nextIndex);
      setSliderValue(nextIndex);
      setFrameInput(String(nextIndex));
      persistDraft(currentDraftKey, shapesRef.current);
      setLoading(true);
      if (isNativeMode) {
        const clamped = Math.max(0, nextIndex - 1);
        router.push(`/datasets/${params.id}/annotate/native?frame=${clamped}${jobIdParam ? `&jobId=${jobIdParam}` : ""}`);
        return;
      }
      const target = mediaList[nextIndex - 1];
      if (!target) return;
      router.push(`/datasets/${params.id}/annotate/${target.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
    },
    [currentDraftKey, isNativeMode, mediaList, params.id, persistDraft, router, total, jobIdParam]
  );

  const handleFrameInputCommit = () => {
    const n = parseInt(frameInput, 10);
    if (!Number.isNaN(n)) navigateTo(n);
    else setFrameInput(String(current));
  };

  const commitSlider = useCallback(() => {
    setIsScrubbing(false);
    if (sliderValue !== current) {
      navigateTo(sliderValue);
    }
  }, [current, navigateTo, sliderValue]);

  const handleSave = useCallback(async () => {
    const tokenNow = getAccessToken();
    if (!tokenNow) {
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

      if (Number.isNaN(jobId) && labels.length) {
        const labelPayload = labels.map((label) => ({ id: label.id, name: label.name, color: label.color }));
        try {
          if (isNativeMode) await putFrameLabelProfile(datasetId, frameIndex, labelPayload);
          else if (Number.isFinite(mediaId)) await putMediaLabelProfile(mediaId, labelPayload);
        } catch {
          setError((prev) => prev || "Annotations saved, but label profile sync failed.");
        }
      }

      if (typeof window !== "undefined") {
        persistDraft(currentDraftKey, shapes);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.body || e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [canSaveToApi, currentDraftKey, datasetId, frameIndex, isNativeMode, jobId, labels, mediaId, persistDraft, shapes]);

  const startPaneResize = useCallback(
    (target: "tools" | "objects", e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      paneResizeRef.current = {
        target,
        startX: e.clientX,
        startWidth: target === "tools" ? toolPaneWidth : objectsPaneWidth,
      };
    },
    [objectsPaneWidth, toolPaneWidth]
  );

  const updatePaneResize = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const resize = paneResizeRef.current;
    if (!resize) return;
    const delta = e.clientX - resize.startX;
    if (resize.target === "tools") {
      setToolPaneWidth(clampPaneWidth(resize.startWidth + delta, TOOL_PANE_MIN, TOOL_PANE_MAX));
      return;
    }
    setObjectsPaneWidth(clampPaneWidth(resize.startWidth - delta, OBJECTS_PANE_MIN, OBJECTS_PANE_MAX));
  }, []);

  const stopPaneResize = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!paneResizeRef.current) return;
    paneResizeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (key === "y" || (key === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
          return;
        }
        if (key === "s") {
          e.preventDefault();
          void handleSave();
        }
        return;
      }
      if (key === "arrowleft") {
        e.preventDefault();
        navigateTo(current - 1, { wrap: true });
      } else if (key === "arrowright") {
        e.preventDefault();
        navigateTo(current + 1, { wrap: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, navigateTo, handleSave]);

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#fcfaf7]">
      <nav className="z-30 flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/90 px-4 py-2.5 shadow-sm shadow-stone-200/40 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/datasets/${params.id}`)}
            className="shrink-0 rounded-xl p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-6 w-px shrink-0 bg-stone-200" />
          <div className="hidden min-w-0 sm:block">
            <h1 className="text-sm font-bold leading-none text-stone-900">Annotation workspace</h1>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-orange-600">
              Dataset {params.id}
              {isNativeMode ? ` · Frame ${frameIndex + 1}` : ` · Media ${params.imageId}`}
              {!Number.isNaN(jobId) ? ` · Job ${jobId}` : canSaveToApi ? " · Direct" : " · Demo"}
            </p>
          </div>
          <div className="hidden h-6 w-px shrink-0 bg-stone-200 sm:block" />
          <div className="flex items-center gap-1 rounded-xl border border-stone-200/80 bg-stone-50 p-0.5">
            <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-white hover:shadow-sm disabled:opacity-35">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-white hover:shadow-sm disabled:opacity-35">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>Save</span>
        </button>
      </nav>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <main className="flex min-h-0 flex-grow overflow-hidden">
        <aside
          className="z-20 flex shrink-0 flex-col items-stretch gap-3 overflow-y-auto border-r border-stone-200/80 bg-white/90 px-1.5 py-4 shadow-sm shadow-stone-200/30 sm:px-2"
          style={{ width: toolPaneWidth }}
        >
          <div className="flex flex-col gap-1 p-1">
            {TOOLBAR.map(({ tool, icon, label, key }) =>
              tool === "polygon" || tool === "polyline" ? (
                <div key={tool} className="flex flex-col gap-1">
                  <button
                    type="button"
                    title={`${label} (${key})`}
                    onClick={() => setActiveTool(tool)}
                    className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-2 text-[8px] font-bold uppercase tracking-wide transition-all ${
                      activeTool === tool ? "bg-white text-orange-600 shadow-md shadow-orange-500/10" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    {icon}
                    <span className="max-w-full truncate px-0.5 text-center leading-none">{label}</span>
                  </button>
                  {activeTool === tool && (
                    <label className="flex flex-col gap-1 rounded-xl border border-stone-200/80 bg-white/90 px-1.5 py-2">
                      <span className="text-center text-[7px] font-bold uppercase leading-none tracking-wider text-stone-500">
                        Points
                      </span>
                      <select
                        value={polygonVertexCount}
                        onChange={(e) => setPolygonVertexCount(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-1 py-1 text-[10px] font-semibold text-stone-800"
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
              ) : (
                <button
                  key={tool}
                  type="button"
                  title={`${label} (${key})`}
                  onClick={() => setActiveTool(tool)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[8px] font-bold uppercase tracking-wide transition-all ${
                    activeTool === tool ? "bg-white text-orange-600 shadow-md shadow-orange-500/10" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {icon}
                  <span className="max-w-full truncate px-0.5 text-center leading-none">{label}</span>
                </button>
              )
            )}
          </div>
        </aside>

        <button
          type="button"
          aria-label="Resize tool pane"
          title="Resize tool pane"
          onPointerDown={(e) => startPaneResize("tools", e)}
          onPointerMove={updatePaneResize}
          onPointerUp={stopPaneResize}
          onPointerCancel={stopPaneResize}
          className="group relative z-30 w-2 shrink-0 cursor-col-resize touch-none bg-transparent outline-none"
        >
          <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-stone-200 transition group-hover:w-1 group-hover:bg-orange-400 group-focus-visible:w-1 group-focus-visible:bg-orange-500" />
        </button>

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
                onActiveClassIdChange={setActiveClassId}
                shapes={shapes}
                onShapesChange={setShapes}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                polygonVertexCount={polygonVertexCount}
              />
            </motion.div>
          )}
        </div>

        <button
          type="button"
          aria-label="Resize objects pane"
          title="Resize objects pane"
          onPointerDown={(e) => startPaneResize("objects", e)}
          onPointerMove={updatePaneResize}
          onPointerUp={stopPaneResize}
          onPointerCancel={stopPaneResize}
          className="group relative z-30 w-2 shrink-0 cursor-col-resize touch-none bg-transparent outline-none"
        >
          <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-stone-200 transition group-hover:w-1 group-hover:bg-orange-400 group-focus-visible:w-1 group-focus-visible:bg-orange-500" />
        </button>

        <aside
          className="z-20 flex shrink-0 flex-col overflow-y-auto border-l border-stone-200/80 bg-white/90 p-6 shadow-xl shadow-stone-200/30 backdrop-blur-xl"
          style={{ width: objectsPaneWidth }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">Objects</h3>
            <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">{shapes.length} total</span>
          </div>

          {numberedLabels.length > 0 && (
            <div className="mb-5 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-stone-500">Class Keys</div>
              <div className="space-y-1.5">
                {numberedLabels.map((label) => (
                  <div key={label.id} className="flex items-center gap-2 text-[11px] font-semibold text-stone-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-stone-700 shadow-sm">
                      {label.shortcut}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="truncate">{label.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {shapes.length === 0 && (
              <p className="text-sm leading-relaxed text-stone-500">
                Box: drag on the image (N). Polygon or polyline: choose point count, then click each corner. Points and tags are single-click tools. Save syncs annotations to the API per image.
              </p>
            )}
            {shapes.map((shape) => {
              const name = labels.find((item) => item.id === shape.classLabelId)?.name ?? "?";
              const color = labels.find((item) => item.id === shape.classLabelId)?.color ?? "#999";
              return (
                <div key={shape.clientId} className="group space-y-2 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 transition-all hover:border-orange-200 hover:bg-white">
                  <div className="flex cursor-pointer items-center justify-between" onClick={() => setActiveClassId(shape.classLabelId)}>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold text-stone-900">{name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-stone-400">{objectSummary(shape)}</span>
                  </div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    Class
                    <select
                      className="mt-1 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs font-semibold text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
                      value={shape.classLabelId}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const nextClass = Number(e.target.value);
                        setShapes((prev) =>
                          prev.map((item) => (item.clientId === shape.clientId ? { ...item, classLabelId: nextClass } : item))
                        );
                        setActiveClassId(nextClass);
                      }}
                    >
                      {numberedLabels.map((label) => (
                        <option key={label.id} value={label.id}>
                          {label.shortcut}. {label.name}
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

      <div className="z-30 flex shrink-0 select-none items-center gap-3 border-t border-stone-200/80 bg-white/95 px-4 py-2 shadow-[0_-1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex items-center gap-0.5">
          {[
            { icon: <ChevronFirst className="h-3.5 w-3.5" />, label: "First", action: () => navigateTo(1) },
            { icon: <ChevronsLeft className="h-3.5 w-3.5" />, label: "Back 10", action: () => navigateTo(current - 10, { wrap: true }) },
            { icon: <ChevronLeft className="h-3.5 w-3.5" />, label: "Prev", action: () => navigateTo(current - 1, { wrap: true }) },
            { icon: <Play className="h-3 w-3" />, label: "Play", action: () => {} },
            { icon: <ChevronRight className="h-3.5 w-3.5" />, label: "Next", action: () => navigateTo(current + 1, { wrap: true }) },
            { icon: <ChevronsRight className="h-3.5 w-3.5" />, label: "Forward 10", action: () => navigateTo(current + 10, { wrap: true }) },
            { icon: <ChevronLast className="h-3.5 w-3.5" />, label: "Last", action: () => navigateTo(total || 1) },
          ].map(({ icon, label, action }) => (
            <button key={label} type="button" title={label} onClick={action} className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200">
              {icon}
            </button>
          ))}
        </div>

        <div className="relative flex min-w-0 flex-1 items-center">
          <input
            type="range"
            min={1}
            max={Math.max(1, total)}
            value={sliderValue}
            onPointerDown={() => setIsScrubbing(true)}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            onPointerUp={commitSlider}
            onBlur={commitSlider}
            onKeyUp={(e) => {
              if (
                e.key.startsWith("Arrow") ||
                e.key === "Home" ||
                e.key === "End" ||
                e.key === "PageUp" ||
                e.key === "PageDown"
              ) {
                commitSlider();
              }
            }}
            className="h-1.5 w-full cursor-pointer touch-none appearance-none rounded-full bg-stone-200 accent-orange-500"
          />
        </div>

        <div className="flex min-w-0 max-w-[14rem] items-center gap-2">
          <span className="truncate text-[11px] font-semibold text-stone-600" title={currentFilename}>
            {currentFilename || (isNativeMode ? `Frame ${frameIndex + 1}` : `Media ${params.imageId}`)}
          </span>
          <button type="button" title="Copy link" onClick={() => navigator.clipboard?.writeText(window.location.href)} className="shrink-0 text-stone-400 transition hover:text-stone-700">
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete annotation" onClick={() => setShapes([])} className="shrink-0 text-stone-400 transition hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={1}
            max={Math.max(1, total)}
            value={frameInput}
            onChange={(e) => setFrameInput(e.target.value)}
            onBlur={handleFrameInputCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFrameInputCommit();
            }}
            className="w-14 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-center text-[11px] font-bold tabular-nums text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25"
          />
          {total > 0 && <span className="text-[10px] font-semibold text-stone-400">/ {total}</span>}
        </div>
      </div>
    </div>
  );
}
