"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Tool } from "@/components/annotate/AnnotationEditor";
import {
  CanvasStage,
  ErrorBanner,
  PaneResizeHandle,
  RightPane,
  TimelineBar,
  ToolPane,
  WorkspaceHeader,
} from "./AnnotateWorkspaceLayout";
import { useAuth } from "@/lib/auth";
import { datasets as visioxDatasets, resolveMediaUrl } from "@/lib/api";
import type { ClassDto } from "@/lib/api/classes";
import { createClassForProject, deleteClass, getClassesForProject } from "@/lib/api/classes";
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

const DEMO_LABELS = [
  { id: 1, name: "demo_a", color: "#ef4444" },
  { id: 2, name: "demo_b", color: "#3b82f6" },
] as const;

const LABEL_COLOR_PALETTE = [
  "#E66700",
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#9333EA",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
  "#4F46E5",
  "#059669",
  "#EA580C",
  "#7C3AED",
];

const PRELOAD_AHEAD = 30;
const PRELOAD_BEHIND = 3;
const ROUTE_PREFETCH_AHEAD = 6;
const PANE_WIDTH_STORAGE_KEY = "visiox-annotate-pane-widths";

type MediaItem = { id: number; file_url?: string | null; filename?: string };

const mediaListCache = new Map<number, MediaItem[]>();
const preloadedUrlsCache = new Set<string>();
const TOOL_PANE_DEFAULT = 84;
const TOOL_PANE_MIN = 68;
const TOOL_PANE_MAX = 180;
const OBJECTS_PANE_DEFAULT = 400;
const OBJECTS_PANE_MIN = 320;
const OBJECTS_PANE_MAX = 640;

function clampPaneWidth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(color: string): string {
  return color.trim().toLowerCase();
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] :
    hue < 120 ? [x, c, 0] :
    hue < 180 ? [0, c, x] :
    hue < 240 ? [0, x, c] :
    hue < 300 ? [x, 0, c] :
    [c, 0, x];

  return [r, g, b]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("")
    .replace(/^/, "#");
}

function nextLabelColor(labels: LabelDefinition[]): string {
  const usedColors = new Set(labels.map((label) => normalizeHexColor(label.color)));
  const unusedPaletteColor = LABEL_COLOR_PALETTE.find((color) => !usedColors.has(normalizeHexColor(color)));
  if (unusedPaletteColor) return unusedPaletteColor;

  for (let offset = 0; offset < 360; offset += 1) {
    const generated = hslToHex(((labels.length + offset) * 47) % 360, 76, 46);
    if (!usedColors.has(normalizeHexColor(generated))) return generated;
  }

  return "#E66700";
}
function wrapIndex(oneBasedIdx: number, total: number): number {
  if (total <= 0) return 1;
  const wrapped = ((oneBasedIdx - 1) % total + total) % total;
  return wrapped + 1;
}

function randomLabelColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
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
  const [projectId, setProjectId] = useState<number | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#E66700");
  const [labelBusyId, setLabelBusyId] = useState<number | "new" | null>(null);
  const cachedMediaList =
    !isNativeMode && Number.isFinite(datasetId) ? mediaListCache.get(datasetId) ?? null : null;
  const cachedMediaIndex =
    cachedMediaList && !isNativeMode && Number.isFinite(mediaId)
      ? (() => {
          const idx = cachedMediaList.findIndex((item) => item.id === mediaId);
          return idx >= 0 ? idx + 1 : null;
        })()
      : null;
  const [mediaIndex, setMediaIndex] = useState<number | null>(cachedMediaIndex);
  const [mediaTotal, setMediaTotal] = useState<number | null>(cachedMediaList ? cachedMediaList.length : null);
  const [mediaList, setMediaList] = useState<MediaItem[]>(cachedMediaList ?? []);
  const [currentFilename, setCurrentFilename] = useState("");
  const [frameInput, setFrameInput] = useState("");
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [polygonVertexCount, setPolygonVertexCount] = useState(4);
  const [openClassMenuId, setOpenClassMenuId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [shapes, _setShapes] = useState<EditorShape[]>([]);
  const [toolPaneWidth, setToolPaneWidth] = useState(TOOL_PANE_DEFAULT);
  const [objectsPaneWidth, setObjectsPaneWidth] = useState(OBJECTS_PANE_DEFAULT);
  const [activeRightTab, setActiveRightTab] = useState<"objects" | "labels">("objects");
  const [hiddenShapeIds, setHiddenShapeIds] = useState<string[]>([]);
  const [pinnedShapeIds, setPinnedShapeIds] = useState<string[]>([]);

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
        setProjectId(ds.project);
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
          let list = mediaListCache.get(datasetId) ?? null;
          if (!list) {
            list = await getDatasetMedia(datasetId);
            mediaListCache.set(datasetId, list);
          }
          if (cancelled) return;
          setMediaTotal(list.length);
          setMediaList(list);
          const media = list.find((item) => item.id === mediaId);
          const idx = list.findIndex((item) => item.id === mediaId);
          setMediaIndex(idx >= 0 ? idx + 1 : null);
          setFrameInput(idx >= 0 ? String(idx + 1) : "1");
          setCurrentFilename(
            (media as { filename?: string })?.filename ?? media?.file_url?.split("/").pop() ?? `media-${mediaId}`
          );
          if (media?.file_url) resolvedImageUrl = resolveMediaUrl(media.file_url);
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
    if (typeof window === "undefined" || !imageUrl) return;

    const urls: string[] = [];
    if (isNativeMode) {
      const totalFrames = mediaTotal ?? Infinity;
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        const idx = frameIndex + offset;
        if (idx >= totalFrames) break;
        urls.push(visioxDatasets.frameUrl(datasetId, idx));
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        if (frameIndex - offset >= 0) {
          urls.push(visioxDatasets.frameUrl(datasetId, frameIndex - offset));
        }
      }
    } else if (mediaList.length && mediaIndex) {
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        const next = mediaList[mediaIndex - 1 + offset];
        if (!next) break;
        if (next.file_url) urls.push(resolveMediaUrl(next.file_url));
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        const prev = mediaList[mediaIndex - 1 - offset];
        if (!prev) break;
        if (prev.file_url) urls.push(resolveMediaUrl(prev.file_url));
      }
    }

    for (const url of urls) {
      if (preloadedUrlsCache.has(url)) continue;
      preloadedUrlsCache.add(url);
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }

    const routeUrls: string[] = [];
    if (isNativeMode) {
      const totalFrames = mediaTotal ?? Infinity;
      for (let offset = 1; offset <= ROUTE_PREFETCH_AHEAD; offset += 1) {
        const idx = frameIndex + offset;
        if (idx >= totalFrames) break;
        routeUrls.push(`/datasets/${params.id}/annotate/native?frame=${idx}${jobIdParam ? `&jobId=${jobIdParam}` : ""}`);
      }
    } else if (mediaList.length && mediaIndex) {
      for (let offset = 1; offset <= ROUTE_PREFETCH_AHEAD; offset += 1) {
        const next = mediaList[mediaIndex - 1 + offset];
        if (!next) break;
        routeUrls.push(`/datasets/${params.id}/annotate/${next.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
      }
    }
    routeUrls.forEach((url) => router.prefetch(url));
  }, [imageUrl, isNativeMode, datasetId, frameIndex, mediaList, mediaIndex, mediaTotal, params.id, router, jobIdParam]);

  const current = isNativeMode ? frameIndex + 1 : mediaIndex ?? 1;
  const total = mediaTotal ?? 0;
  const displayedValue =
    scrubValue !== null ? scrubValue : pendingIndex !== null ? pendingIndex : current;
  const sliderMax = Math.max(1, total, current, pendingIndex ?? 0, scrubValue ?? 0, displayedValue);
  const sliderProgress = sliderMax <= 1 ? 0 : ((displayedValue - 1) / (sliderMax - 1)) * 100;
  const isLoggedIn = !!accessToken;
  const canSaveToApi =
    isLoggedIn &&
    (!Number.isNaN(jobId) || (!isNativeMode && Number.isFinite(mediaId)) || (isNativeMode && Number.isFinite(datasetId)));

  useEffect(() => {
    if (pendingIndex !== null && pendingIndex === current) {
      setPendingIndex(null);
    }
  }, [current, pendingIndex]);

  const navigateTo = useCallback(
    (oneBasedIdx: number, options?: { wrap?: boolean }) => {
      const totalItems = Math.max(1, total);
      const nextIndex = options?.wrap
        ? wrapIndex(oneBasedIdx, totalItems)
        : Math.max(1, Math.min(totalItems, oneBasedIdx));
      setPendingIndex(nextIndex);
      setScrubValue(null);
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
    if (scrubValue !== null && scrubValue !== current) {
      navigateTo(scrubValue);
    } else {
      setScrubValue(null);
    }
  }, [current, navigateTo, scrubValue]);

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
    if (!openClassMenuId) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-class-menu-root='true']")) return;
      setOpenClassMenuId(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenClassMenuId(null);
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openClassMenuId]);

  useEffect(() => {
    const shapeIds = new Set(shapes.map((shape) => shape.clientId));
    setHiddenShapeIds((prev) => prev.filter((id) => shapeIds.has(id)));
    setPinnedShapeIds((prev) => prev.filter((id) => shapeIds.has(id)));
  }, [shapes]);

  const toggleShapeHidden = useCallback((shapeId: string) => {
    setHiddenShapeIds((prev) =>
      prev.includes(shapeId) ? prev.filter((id) => id !== shapeId) : [...prev, shapeId]
    );
  }, []);

  const toggleShapePinned = useCallback((shapeId: string) => {
    setPinnedShapeIds((prev) =>
      prev.includes(shapeId) ? prev.filter((id) => id !== shapeId) : [...prev, shapeId]
    );
  }, []);

  const handleCreateLabel = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLabelName.trim();
    if (!name) return;

    if (!projectId || !isLoggedIn) {
      const localId = Math.min(0, ...labels.map((label) => label.id)) - 1;
      const localLabel = { id: localId, name, color: newLabelColor };
      setLabels((prev) => [...prev, localLabel]);
      setActiveClassId(localLabel.id);
      setNewLabelName("");
      setNewLabelColor(nextLabelColor([...labels, localLabel]));
      return;
    }

    setLabelBusyId("new");
    setError(null);
    try {
      const created = await createClassForProject(projectId, { name, color: newLabelColor });
      setLabels((prev) => [...prev.filter((label) => label.id !== created.id), created]);
      setActiveClassId(created.id);
      setNewLabelName("");
      setNewLabelColor(nextLabelColor([...labels.filter((label) => label.id !== created.id), created]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create label.");
    } finally {
      setLabelBusyId(null);
    }
  }, [isLoggedIn, labels, newLabelColor, newLabelName, projectId]);

  const handleDeleteLabel = useCallback(async (label: LabelDefinition) => {
    if (shapes.some((shape) => shape.classLabelId === label.id)) {
      setError("Remove or reassign objects using this label before deleting it.");
      return;
    }

    if (!projectId || !isLoggedIn || label.id <= 0) {
      setLabels((prev) => prev.filter((item) => item.id !== label.id));
      if (activeClassId === label.id) setActiveClassId(labels.find((item) => item.id !== label.id)?.id ?? 0);
      return;
    }

    setLabelBusyId(label.id);
    setError(null);
    try {
      await deleteClass(label.id);
      setLabels((prev) => prev.filter((item) => item.id !== label.id));
      if (activeClassId === label.id) setActiveClassId(labels.find((item) => item.id !== label.id)?.id ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete label.");
    } finally {
      setLabelBusyId(null);
    }
  }, [activeClassId, isLoggedIn, labels, projectId, shapes]);

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

  const resizeHandlers = useMemo(
    () => ({
      start: startPaneResize,
      update: updatePaneResize,
      stop: stopPaneResize,
    }),
    [startPaneResize, stopPaneResize, updatePaneResize]
  );

  const changeShapeClass = useCallback((shapeId: string, classId: number) => {
    setShapes((prev) =>
      prev.map((item) => (item.clientId === shapeId ? { ...item, classLabelId: classId } : item))
    );
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#fcfaf7]">
      <WorkspaceHeader
        datasetId={params.id}
        imageId={params.imageId}
        isNativeMode={isNativeMode}
        frameIndex={frameIndex}
        jobId={jobId}
        canSaveToApi={canSaveToApi}
        saving={saving}
        canUndo={canUndo}
        canRedo={canRedo}
        onBack={() => router.push(`/datasets/${params.id}`)}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
      />

      <ErrorBanner message={error} />

      <main className="flex min-h-0 flex-grow overflow-hidden">
        <ToolPane
          width={toolPaneWidth}
          activeTool={activeTool}
          polygonVertexCount={polygonVertexCount}
          onToolChange={setActiveTool}
          onPolygonVertexCountChange={setPolygonVertexCount}
        />

        <PaneResizeHandle label="Resize tool pane" target="tools" resize={resizeHandlers} />

        <CanvasStage
          loading={loading}
          currentDraftKey={currentDraftKey}
          imageUrl={imageUrl}
          labels={labels}
          activeClassId={activeClassId}
          shapes={shapes}
          activeTool={activeTool}
          polygonVertexCount={polygonVertexCount}
          hiddenShapeIds={hiddenShapeIds}
          pinnedShapeIds={pinnedShapeIds}
          onActiveClassIdChange={setActiveClassId}
          onShapesChange={setShapes}
          onToolChange={setActiveTool}
        />

        <RightPane
          width={objectsPaneWidth}
          activeTab={activeRightTab}
          shapes={shapes}
          labels={labels}
          hiddenShapeIds={hiddenShapeIds}
          pinnedShapeIds={pinnedShapeIds}
          openClassMenuId={openClassMenuId}
          newLabelName={newLabelName}
          newLabelColor={newLabelColor}
          labelBusyId={labelBusyId}
          onTabChange={setActiveRightTab}
          onNewLabelNameChange={setNewLabelName}
          onNewLabelColorChange={setNewLabelColor}
          onCreateLabel={handleCreateLabel}
          onDeleteLabel={handleDeleteLabel}
          onShapeClassChange={changeShapeClass}
          onActiveClassIdChange={setActiveClassId}
          onOpenClassMenuIdChange={setOpenClassMenuId}
          onToggleShapeHidden={toggleShapeHidden}
          onToggleShapePinned={toggleShapePinned}
        />
      </main>

      <TimelineBar
        current={current}
        total={total}
        displayedValue={displayedValue}
        sliderMax={sliderMax}
        sliderProgress={sliderProgress}
        frameInput={frameInput}
        currentFilename={currentFilename}
        isNativeMode={isNativeMode}
        frameIndex={frameIndex}
        imageId={params.imageId}
        onNavigateTo={navigateTo}
        onScrubStart={() => setScrubValue(displayedValue)}
        onScrubChange={(next) => {
          setScrubValue(next);
          setFrameInput(String(next));
        }}
        onCommitSlider={commitSlider}
        onFrameInputChange={setFrameInput}
        onFrameInputCommit={handleFrameInputCommit}
        onClearShapes={() => setShapes([])}
      />
    </div>
  );
}

