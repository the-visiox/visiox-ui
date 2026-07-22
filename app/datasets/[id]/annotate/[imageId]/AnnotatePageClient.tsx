"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Tool } from "@/components/annotate/AnnotationEditor";
import { CanvasStage, ErrorBanner, RightPane, TimelineBar, ToolPane, WorkspaceHeader } from "./AnnotateWorkspaceLayout";
import { useAuth } from "@/lib/auth";
import {
  datasets as visioxDatasets,
  deployments,
  resolveMediaUrl,
  type AutoLabelDatasetJob,
  type AutoLabelPredictionResponse,
} from "@/lib/api";
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
  autoLabelPredictionsToEditor,
  editorToApiPayload,
  mergeProjectClassesWithProfile,
} from "@/lib/annotation";
import type { EditorShape, LabelDefinition } from "@/lib/annotation";

const AutoLabelDialog = dynamic(() => import("@/components/annotate/AutoLabelDialog"), { ssr: false });

function draftStorageKey(
  datasetId: number,
  imageId: string,
  isNativeMode: boolean,
  frameIndex: number,
  mediaId: number,
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
const datasetDetailCache = new Map<number, Awaited<ReturnType<typeof getDataset>>>();
const projectClassesCache = new Map<number, ClassDto[]>();
const datasetFrameRevision = new Map<number, number>();
const preloadedUrlsCache = new Set<string>();
const TOOL_PANE_DEFAULT = 64;
const TOOL_PANE_MIN = 52;
const TOOL_PANE_MAX = 180;
const OBJECTS_PANE_DEFAULT = 400;
const OBJECTS_PANE_MIN = 320;
const OBJECTS_PANE_MAX = 640;

function clampPaneWidth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueAutoLabelShapes(shapes: EditorShape[]) {
  const seen = new Set<string>();
  return shapes.filter((shape) => {
    const geometry = shape.points?.length
      ? shape.points
      : [shape.x, shape.y, shape.width, shape.height];
    const key = [
      shape.classLabelId,
      shape.shapeType,
      ...geometry.map((value) => Math.round(value * 1000) / 1000),
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeHexColor(color: string): string {
  return color.trim().toLowerCase();
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return [r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
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
  const wrapped = (((oneBasedIdx - 1) % total) + total) % total;
  return wrapped + 1;
}

function broadcastClassesUpdated(projectId: number | null) {
  if (projectId == null || typeof window === "undefined") return;
  projectClassesCache.delete(projectId);
  try {
    const ch = new BroadcastChannel("visiox-project-classes");
    ch.postMessage({ type: "classes-updated", projectId });
    ch.close();
  } catch {
    // BroadcastChannel not supported
  }
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
  const compareModelParam = searchParams.get("compareModel");
  const compareModelId = compareModelParam ? parseInt(compareModelParam, 10) : Number.NaN;
  const requestedCompareConfidence = Number(searchParams.get("compareConfidence") ?? "0.25");
  const compareConfidence = Number.isFinite(requestedCompareConfidence)
    ? Math.min(1, Math.max(0, requestedCompareConfidence))
    : 0.25;
  const comparisonQuerySuffix = Number.isFinite(compareModelId)
    ? `&compareModel=${compareModelId}&compareConfidence=${compareConfidence}`
    : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingFrame, setDeletingFrame] = useState(false);
  const [showDeleteFrameConfirm, setShowDeleteFrameConfirm] = useState(false);
  const [frameRevision, setFrameRevision] = useState(() => datasetFrameRevision.get(datasetId) ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [labels, setLabels] = useState<LabelDefinition[]>([]);
  // Class ids that have annotations somewhere in the project (any frame). Deleting
  // such a class would cascade-delete those annotations, so its delete is blocked
  // even on frames where it isn't used.
  const [usedClassIds, setUsedClassIds] = useState<Set<number>>(new Set());
  const [activeClassId, setActiveClassId] = useState(0);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#E66700");
  const [labelBusyId, setLabelBusyId] = useState<number | "new" | null>(null);
  const cachedMediaList = !isNativeMode && Number.isFinite(datasetId) ? (mediaListCache.get(datasetId) ?? null) : null;
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
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [autoLabelOpen, setAutoLabelOpen] = useState(false);
  const [predictionShapes, setPredictionShapes] = useState<EditorShape[]>([]);
  const [predictionModelName, setPredictionModelName] = useState<string | undefined>();
  const [predictionLoading, setPredictionLoading] = useState(false);

  const sessionRef = useRef(new AnnotationSession());
  const shapesRef = useRef<EditorShape[]>([]);
  const isLoadingRef = useRef(false);
  const previousDraftKeyRef = useRef<string | null>(null);
  const draftCacheRef = useRef<Record<string, EditorShape[]>>({});
  const savedShapesJsonRef = useRef<string>("[]");
  const savedLabelsJsonRef = useRef<string>("[]");
  shapesRef.current = shapes;

  const currentDraftKey = useMemo(
    () => draftStorageKey(datasetId, rawImageId, isNativeMode, frameIndex, mediaId),
    [datasetId, rawImageId, isNativeMode, frameIndex, mediaId],
  );
  const activeClassStorageKey = `visiox-annotate-active-class:dataset:${datasetId}`;
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

  const readDraft = useCallback((draftKey: string): { exists: boolean; shapes: EditorShape[] } => {
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
  }, []);

  // Frames the user actually edited this session. Kept in sessionStorage so it
  // survives remounts (re-entering the workspace) — unlike navigation drafts,
  // which exist for every visited frame and must NOT all be re-saved.
  const dirtyFramesKey = `visiox-annotate-dirty:dataset:${datasetId}`;
  const readDirtyFrames = useCallback((): number[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem(dirtyFramesKey) ?? "[]") as number[];
    } catch {
      return [];
    }
  }, [dirtyFramesKey]);
  const markFrameDirty = useCallback(
    (fi: number) => {
      if (typeof window === "undefined") return;
      try {
        const set = new Set<number>(readDirtyFrames());
        set.add(fi);
        sessionStorage.setItem(dirtyFramesKey, JSON.stringify([...set]));
      } catch {
        // ignore storage failures
      }
    },
    [dirtyFramesKey, readDirtyFrames],
  );
  const clearFrameDirty = useCallback(
    (fi: number) => {
      if (typeof window === "undefined") return;
      try {
        const set = new Set<number>(readDirtyFrames());
        set.delete(fi);
        sessionStorage.setItem(dirtyFramesKey, JSON.stringify([...set]));
      } catch {
        // ignore storage failures
      }
    },
    [dirtyFramesKey, readDirtyFrames],
  );

  useLayoutEffect(() => {
    const previousDraftKey = previousDraftKeyRef.current;
    if (previousDraftKey && previousDraftKey !== currentDraftKey && !isLoadingRef.current) {
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
    if (activeClassId <= 0 || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(activeClassStorageKey, String(activeClassId));
    } catch {
      // Ignore unavailable session storage.
    }
  }, [activeClassId, activeClassStorageKey]);

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
      localStorage.setItem(PANE_WIDTH_STORAGE_KEY, JSON.stringify({ tools: toolPaneWidth, objects: objectsPaneWidth }));
    } catch {
      // Ignore preference persistence failures.
    }
  }, [objectsPaneWidth, toolPaneWidth]);

  // Compare the current shapes against their last-saved state at the API-payload
  // level. This ignores editor-only fields and hydrate/draft round-trip quirks
  // (key order, recomputed bbox, `points: undefined`) that otherwise read as a
  // change even when nothing was edited.
  const shapesDifferFromSaved = useCallback(() => {
    let saved: EditorShape[] = [];
    try {
      saved = JSON.parse(savedShapesJsonRef.current) as EditorShape[];
    } catch {
      saved = [];
    }
    return JSON.stringify(editorToApiPayload(shapes)) !== JSON.stringify(editorToApiPayload(saved));
  }, [shapes]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoadingRef.current) return;
    persistDraft(currentDraftKey, shapes);
    if (!isNativeMode) return;
    // Mark/clear this frame as edited based on whether it differs from its saved
    // state — drives which frames Save sends to the server.
    if (shapesDifferFromSaved()) markFrameDirty(frameIndex);
    else clearFrameDirty(frameIndex);
  }, [
    clearFrameDirty,
    currentDraftKey,
    frameIndex,
    isNativeMode,
    markFrameDirty,
    persistDraft,
    shapes,
    shapesDifferFromSaved,
  ]);

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
      setError(null);

      try {
        sessionStorage.setItem("visiox-annotate-draft:active-key", currentDraftKey);
      } catch {
        // ignore
      }

      const token = getAccessToken();
      const demoSeed = isNativeMode ? `native-${datasetId}-f${frameIndex}` : rawImageId;
      const demoUrl = `https://picsum.photos/seed/${demoSeed}/1200/800`;

      if (!token) {
        setImageUrl(demoUrl);
        setLabels([...DEMO_LABELS]);
        savedLabelsJsonRef.current = JSON.stringify(DEMO_LABELS);
        setActiveClassId(1);
        isLoadingRef.current = false;
        setLoading(false);
        return;
      }

      try {
        if (!Number.isFinite(datasetId)) throw new Error("Invalid dataset id.");

        let ds = datasetDetailCache.get(datasetId);
        if (!ds) {
          ds = await getDataset(datasetId);
          datasetDetailCache.set(datasetId, ds);
        }
        setProjectId(ds.project);

        const nativeFrameTotal = ds.image_count ?? ds.media_count ?? 0;
        if (isNativeMode) {
          setMediaTotal(nativeFrameTotal);
          if (nativeFrameTotal <= 0) {
            router.replace(`/datasets/${params.id}`);
            return;
          }
          if (frameIndex >= nativeFrameTotal) {
            const lastFrameIndex = nativeFrameTotal - 1;
            setPendingIndex(nativeFrameTotal);
            router.replace(
              `/datasets/${params.id}/annotate/native?frame=${lastFrameIndex}${jobIdParam ? `&jobId=${jobIdParam}` : ""}${comparisonQuerySuffix}`,
            );
            return;
          }
        }

        const cachedClasses = projectClassesCache.get(ds.project);
        const classesPromise = cachedClasses
          ? Promise.resolve(cachedClasses)
          : getClassesForProject(ds.project).then((items) => {
              projectClassesCache.set(ds.project, items);
              return items;
            });
        const annotationsPromise: Promise<Awaited<ReturnType<typeof getJobAnnotations>>> = !Number.isNaN(jobId)
          ? getJobAnnotations(jobId)
          : !isNativeMode && Number.isFinite(mediaId)
            ? getMediaAnnotations(mediaId)
            : isNativeMode
              ? getFrameAnnotations(datasetId, frameIndex)
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
          resolvedImageUrl = `${visioxDatasets.frameUrl(datasetId, frameIndex, "original")}&revision=${frameRevision}`;
          setImageUrl(resolvedImageUrl);
          setMediaIndex(null);
          setMediaList([]);
          setCurrentFilename(`Frame ${frameIndex + 1}`);
          setFrameInput(String(frameIndex + 1));
          if (!cancelled) {
            setLoading(false);
          }
          const [loadedClasses, loadedAnnotations, loadedProfile] = await Promise.all([
            classesPromise,
            annotationsPromise,
            profilePromise,
          ]);
          classes = loadedClasses;
          annotations = loadedAnnotations;
          profileItems = loadedProfile;
          setMediaTotal(nativeFrameTotal);
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
            (media as { filename?: string })?.filename ?? media?.file_url?.split("/").pop() ?? `media-${mediaId}`,
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

        setUsedClassIds(new Set(classes.filter((c) => (c.annotation_count ?? 0) > 0).map((c) => c.id)));

        if (classes.length) {
          const merged = profileItems.length
            ? mergeProjectClassesWithProfile(classes, profileItems)
            : classes.map((item) => ({ id: item.id, name: item.name, color: item.color || "#f97316" }));
          setLabels(merged);
          savedLabelsJsonRef.current = JSON.stringify(merged);
          setActiveClassId((currentClassId) => {
            let storedClassId = 0;
            try {
              storedClassId = Number(sessionStorage.getItem(activeClassStorageKey) ?? 0);
            } catch {
              // Ignore unavailable session storage.
            }
            if (merged.some((label) => label.id === currentClassId)) return currentClassId;
            if (merged.some((label) => label.id === storedClassId)) return storedClassId;
            return merged[0]?.id ?? classes[0].id;
          });
          setNewLabelColor(nextLabelColor(merged));
        } else {
          setLabels([]);
          savedLabelsJsonRef.current = "[]";
          setActiveClassId(0);
          setNewLabelColor(nextLabelColor([]));
        }

        const apiShapes = apiShapesToEditor(annotations);
        savedShapesJsonRef.current = JSON.stringify(apiShapes);
        const shouldRestoreDraft = !isNativeMode || readDirtyFrames().includes(frameIndex);
        const draft = shouldRestoreDraft ? readDraft(currentDraftKey) : { exists: false, shapes: [] };
        if (draft.exists) {
          _setShapes(sessionRef.current.hydrate(draft.shapes));
        } else if (apiShapes.length > 0) {
          _setShapes(sessionRef.current.hydrate(apiShapes));
        } else {
          _setShapes(sessionRef.current.hydrate([]));
        }
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof ApiError ? e.body || e.message : e instanceof Error ? e.message : "Failed to load dataset.",
        );
        setImageUrl("");
        setLabels([]);
        savedLabelsJsonRef.current = "[]";
        setActiveClassId(0);
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
  }, [
    activeClassStorageKey,
    authReady,
    currentDraftKey,
    comparisonQuerySuffix,
    datasetId,
    frameIndex,
    frameRevision,
    isNativeMode,
    jobId,
    jobIdParam,
    mediaId,
    params.id,
    persistDraft,
    rawImageId,
    readDraft,
    readDirtyFrames,
    router,
  ]);

  useEffect(() => {
    if (!isNativeMode || !Number.isFinite(compareModelId) || loading || !Number.isFinite(datasetId)) {
      setPredictionShapes([]);
      setPredictionModelName(undefined);
      return;
    }

    let cancelled = false;
    setPredictionLoading(true);
    setPredictionShapes([]);
    deployments.previewFrame(compareModelId, {
      dataset: datasetId,
      frame: frameIndex,
      confidence: compareConfidence,
    }).then((result) => {
      if (cancelled) return;
      const overlays = result.predictions.flatMap<EditorShape>((prediction, index) => {
        if (prediction.class_label == null) return [];
        return [{
          clientId: `prediction-${result.model}-${result.media_id}-${index}`,
          shapeType: "rectangle",
          classLabelId: prediction.class_label,
          x: prediction.data.x,
          y: prediction.data.y,
          width: prediction.data.width,
          height: prediction.data.height,
          confidence: typeof prediction.confidence === "number" ? prediction.confidence : undefined,
          frame: result.frame,
        }];
      });
      setPredictionShapes(overlays);
      setPredictionModelName(`${result.model_name} ${result.model_version}`.trim());
      if (result.unmapped_labels.length > 0) {
        setError(`Prediction labels not found in this project: ${result.unmapped_labels.join(", ")}.`);
      }
    }).catch((reason) => {
      if (cancelled) return;
      setError(reason instanceof Error ? reason.message : "Could not load model predictions.");
      setPredictionModelName("Prediction unavailable");
    }).finally(() => {
      if (!cancelled) setPredictionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [compareConfidence, compareModelId, datasetId, frameIndex, isNativeMode, loading]);

  useEffect(() => {
    if (typeof window === "undefined" || !imageUrl) return;

    const urls: string[] = [];
    if (isNativeMode) {
      const totalFrames = mediaTotal ?? Infinity;
      for (let offset = 1; offset <= PRELOAD_AHEAD; offset += 1) {
        const idx = frameIndex + offset;
        if (idx >= totalFrames) break;
        urls.push(`${visioxDatasets.frameUrl(datasetId, idx, "original")}&revision=${frameRevision}`);
      }
      for (let offset = 1; offset <= PRELOAD_BEHIND; offset += 1) {
        if (frameIndex - offset >= 0) {
          urls.push(`${visioxDatasets.frameUrl(datasetId, frameIndex - offset, "original")}&revision=${frameRevision}`);
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
        routeUrls.push(
          `/datasets/${params.id}/annotate/native?frame=${idx}${jobIdParam ? `&jobId=${jobIdParam}` : ""}${comparisonQuerySuffix}`,
        );
      }
    } else if (mediaList.length && mediaIndex) {
      for (let offset = 1; offset <= ROUTE_PREFETCH_AHEAD; offset += 1) {
        const next = mediaList[mediaIndex - 1 + offset];
        if (!next) break;
        routeUrls.push(`/datasets/${params.id}/annotate/${next.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
      }
    }
    routeUrls.forEach((url) => router.prefetch(url));
  }, [
    imageUrl,
    isNativeMode,
    datasetId,
    frameIndex,
    frameRevision,
    mediaList,
    mediaIndex,
    mediaTotal,
    params.id,
    router,
    jobIdParam,
    comparisonQuerySuffix,
  ]);

  const current = isNativeMode ? frameIndex + 1 : (mediaIndex ?? 1);
  const total = mediaTotal ?? 0;
  const displayedValue = scrubValue !== null ? scrubValue : pendingIndex !== null ? pendingIndex : current;
  const sliderMax = Math.max(1, total, current, pendingIndex ?? 0, scrubValue ?? 0, displayedValue);
  const sliderProgress = sliderMax <= 1 ? 0 : ((displayedValue - 1) / (sliderMax - 1)) * 100;
  const isLoggedIn = !!accessToken;
  const canSaveToApi =
    isLoggedIn &&
    (!Number.isNaN(jobId) ||
      (!isNativeMode && Number.isFinite(mediaId)) ||
      (isNativeMode && Number.isFinite(datasetId)));

  useEffect(() => {
    if (pendingIndex !== null && pendingIndex === current) {
      setPendingIndex(null);
    }
  }, [current, pendingIndex]);

  // Clamp an out-of-range ?frame= URL (e.g. typed/stale link) to the last real
  // frame so we never load or create drafts for a frame the dataset doesn't have.
  useEffect(() => {
    if (!isNativeMode || mediaTotal == null || mediaTotal <= 0) return;
    if (frameIndex > mediaTotal - 1) {
      router.replace(
        `/datasets/${params.id}/annotate/native?frame=${mediaTotal - 1}${jobIdParam ? `&jobId=${jobIdParam}` : ""}${comparisonQuerySuffix}`,
      );
    }
  }, [comparisonQuerySuffix, isNativeMode, mediaTotal, frameIndex, params.id, jobIdParam, router]);

  const navigateTo = useCallback(
    (oneBasedIdx: number, options?: { wrap?: boolean }) => {
      const totalItems = Math.max(1, total);
      const nextIndex = options?.wrap
        ? wrapIndex(oneBasedIdx, totalItems)
        : Math.max(1, Math.min(totalItems, oneBasedIdx));

      if (nextIndex === current) {
        setPendingIndex(null);
        setScrubValue(null);
        setFrameInput(String(current));
        return;
      }

      setPendingIndex(nextIndex);
      setScrubValue(null);
      setFrameInput(String(nextIndex));
      if (!isLoadingRef.current) persistDraft(currentDraftKey, shapesRef.current);
      isLoadingRef.current = true;
      setLoading(true);
      if (isNativeMode) {
        const clamped = Math.max(0, nextIndex - 1);
        router.push(
          `/datasets/${params.id}/annotate/native?frame=${clamped}${jobIdParam ? `&jobId=${jobIdParam}` : ""}${comparisonQuerySuffix}`,
        );
        return;
      }
      const target = mediaList[nextIndex - 1];
      if (!target) return;
      router.push(`/datasets/${params.id}/annotate/${target.id}${jobIdParam ? `?jobId=${jobIdParam}` : ""}`);
    },
    [
      comparisonQuerySuffix,
      current,
      currentDraftKey,
      isNativeMode,
      jobIdParam,
      mediaList,
      params.id,
      persistDraft,
      router,
      total,
    ],
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

  const handleAutoLabelComplete = useCallback(async (job: AutoLabelDatasetJob) => {
    if (!isNativeMode || !Number.isFinite(datasetId)) return;
    try {
      const rows = await getFrameAnnotations(datasetId, frameIndex);
      const generated = uniqueAutoLabelShapes(
        apiShapesToEditor(rows).filter(
          (shape) => shape.source === "auto_label" && shape.autoLabelModelId === job.model,
        ),
      );
      _setShapes(sessionRef.current.update((current) => [
        ...current.filter((shape) => shape.source !== "auto_label"),
        ...generated,
      ]));
      setActiveRightTab("objects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not refresh current-frame labels.");
    }
  }, [datasetId, frameIndex, isNativeMode]);

  const handleFrameAutoLabelComplete = useCallback((result: AutoLabelPredictionResponse) => {
    if (result.frame !== frameIndex) {
      setError("Auto Label finished for a different frame. Run it again on the current frame.");
      return;
    }
    const generated = uniqueAutoLabelShapes(autoLabelPredictionsToEditor(result));
    _setShapes(sessionRef.current.update((current) => [
      ...current.filter((shape) => shape.source !== "auto_label"),
      ...generated,
    ]));
    setSelectedShapeId(generated[0]?.clientId ?? null);
    setActiveRightTab("objects");
  }, [frameIndex]);

  const handleSave = useCallback(async () => {
    if (loading || isLoadingRef.current) {
      setError("Wait for the current frame to finish loading before saving.");
      return false;
    }
    const tokenNow = getAccessToken();
    if (!tokenNow) {
      setError("Login required to save. In demo mode annotations are kept in-memory only.");
      return false;
    }
    if (!canSaveToApi) {
      setError("Cannot determine save target. Check the URL has a valid dataset/media/job id.");
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      const labelPayload = labels.map((label) => ({ id: label.id, name: label.name, color: label.color }));

      if (!Number.isNaN(jobId)) {
        await patchJobAnnotations(jobId, editorToApiPayload(shapes));
      } else if (isNativeMode) {
        // Save only the frames the user actually edited this session (tracked in
        // sessionStorage), plus the current frame if just the label roster changed.
        // Merely navigating through frames must NOT trigger a save for each one.
        persistDraft(currentDraftKey, shapes);

        const validClassIds = new Set(labels.map((label) => label.id));
        const totalFrames = mediaTotal ?? Infinity;
        const prefix = `visiox-annotate-draft:dataset:${datasetId}:frame:`;
        const dropStaleDraft = (fi: number) => {
          delete draftCacheRef.current[`${prefix}${fi}`];
          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem(`${prefix}${fi}`);
            } catch {
              // ignore storage failures
            }
          }
        };

        const labelsDirty = JSON.stringify(labels) !== savedLabelsJsonRef.current;
        const dirtyFrames = readDirtyFrames();
        const frameIndices = new Set<number>(dirtyFrames);
        if (labelsDirty) frameIndices.add(frameIndex);

        const failedFrames: number[] = [];
        let firstError: unknown = null;
        let droppedInvalid = 0;
        let profileFailed = false;
        for (const fi of frameIndices) {
          if (fi < 0 || fi >= totalFrames) {
            dropStaleDraft(fi);
            clearFrameDirty(fi);
            continue;
          }
          const annotationsEdited = dirtyFrames.includes(fi);
          const rawShapes = fi === frameIndex ? shapes : readDraft(`${prefix}${fi}`).shapes;
          // Skip objects whose label was deleted (id no longer a project class):
          // the backend rejects unknown class ids and would fail the whole save.
          const frameShapes = rawShapes.filter((s) => validClassIds.has(s.classLabelId));
          droppedInvalid += rawShapes.length - frameShapes.length;

          // Only the current frame needs a profile write when just the label roster
          // changed; other untouched frames keep their existing profile.
          const saveProfile = labelPayload.length > 0 && (annotationsEdited || (labelsDirty && fi === frameIndex));
          if (!annotationsEdited && !saveProfile) continue;

          try {
            if (annotationsEdited) {
              await putFrameAnnotations(datasetId, fi, editorToApiPayload(frameShapes));
            }
            if (saveProfile) {
              try {
                await putFrameLabelProfile(datasetId, fi, labelPayload);
              } catch {
                profileFailed = true;
              }
            }
            clearFrameDirty(fi);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              // Frame no longer exists in this dataset — drop its stale draft, don't fail.
              dropStaleDraft(fi);
              clearFrameDirty(fi);
              continue;
            }
            failedFrames.push(fi);
            if (!firstError) firstError = err;
          }
        }
        if (failedFrames.length) {
          const detail =
            firstError instanceof ApiError
              ? firstError.body || firstError.message
              : firstError instanceof Error
                ? firstError.message
                : "";
          throw new Error(
            `Save failed for frame(s) ${failedFrames.map((f) => f + 1).join(", ")}${detail ? `: ${detail}` : ""}`,
          );
        }
        if (profileFailed) {
          setError((prev) => prev || "Annotations saved, but label profile sync failed for some frames.");
        } else if (droppedInvalid > 0) {
          setError(
            (prev) =>
              prev || `Saved. Skipped ${droppedInvalid} object(s) that used a deleted label — reassign them to keep.`,
          );
        }
      } else {
        await putMediaAnnotations(mediaId, editorToApiPayload(shapes));
        if (labelPayload.length && Number.isFinite(mediaId)) {
          try {
            await putMediaLabelProfile(mediaId, labelPayload);
          } catch {
            setError((prev) => prev || "Annotations saved, but label profile sync failed.");
          }
        }
      }

      if (typeof window !== "undefined") {
        savedShapesJsonRef.current = JSON.stringify(shapes);
        savedLabelsJsonRef.current = JSON.stringify(labels);
        persistDraft(currentDraftKey, shapes);
        try {
          const ch = new BroadcastChannel("visiox-annotations");
          ch.postMessage({ type: "annotations-saved", datasetId });
          ch.close();
        } catch {
          /* ignore */
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.body || e.message : e instanceof Error ? e.message : "Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    canSaveToApi,
    clearFrameDirty,
    currentDraftKey,
    datasetId,
    frameIndex,
    isNativeMode,
    jobId,
    labels,
    loading,
    mediaId,
    mediaTotal,
    persistDraft,
    readDirtyFrames,
    readDraft,
    shapes,
  ]);

  const clearDatasetDrafts = useCallback(() => {
    const prefix = `visiox-annotate-draft:dataset:${datasetId}:`;
    for (const key of Object.keys(draftCacheRef.current)) {
      if (key.startsWith(prefix)) delete draftCacheRef.current[key];
    }
    if (typeof window !== "undefined") {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(prefix)) sessionStorage.removeItem(k);
        }
        sessionStorage.removeItem("visiox-annotate-draft:active-key");
        sessionStorage.removeItem(dirtyFramesKey);
      } catch {
        // ignore storage failures
      }
    }
  }, [datasetId, dirtyFramesKey]);

  const requestDeleteFrame = useCallback(() => {
    const hasUnsavedChanges =
      shapesDifferFromSaved() ||
      JSON.stringify(labels) !== savedLabelsJsonRef.current ||
      readDirtyFrames().length > 0;
    if (hasUnsavedChanges) {
      setError("Save or undo annotation changes before deleting a frame.");
      return;
    }
    setError(null);
    setShowDeleteFrameConfirm(true);
  }, [labels, readDirtyFrames, shapesDifferFromSaved]);

  const handleDeleteFrame = useCallback(async () => {
    if (!isNativeMode || deletingFrame) return;
    setDeletingFrame(true);
    setError(null);
    try {
      const result = await visioxDatasets.deleteFrame(datasetId, frameIndex);
      const revision = (datasetFrameRevision.get(datasetId) ?? frameRevision) + 1;
      datasetFrameRevision.set(datasetId, revision);
      datasetDetailCache.delete(datasetId);
      mediaListCache.delete(datasetId);

      isLoadingRef.current = true;
      previousDraftKeyRef.current = null;
      clearDatasetDrafts();
      savedShapesJsonRef.current = "[]";
      _setShapes(sessionRef.current.hydrate([]));
      setMediaTotal(result.remaining);
      setShowDeleteFrameConfirm(false);

      if (result.remaining === 0) {
        router.replace(`/datasets/${params.id}`);
        return;
      }

      const nextFrameIndex = Math.min(frameIndex, result.remaining - 1);
      setLoading(true);
      setFrameRevision(revision);
      if (nextFrameIndex !== frameIndex) {
        router.replace(
          `/datasets/${params.id}/annotate/native?frame=${nextFrameIndex}${jobIdParam ? `&jobId=${jobIdParam}` : ""}${comparisonQuerySuffix}`,
        );
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.body || reason.message
          : reason instanceof Error
            ? reason.message
            : "Could not delete this frame.",
      );
    } finally {
      setDeletingFrame(false);
    }
  }, [
    clearDatasetDrafts,
    comparisonQuerySuffix,
    datasetId,
    deletingFrame,
    frameIndex,
    frameRevision,
    isNativeMode,
    jobIdParam,
    params.id,
    router,
  ]);

  const handleDiscard = useCallback(() => {
    // Drop every unsaved draft for this dataset so nothing is restored on return.
    isLoadingRef.current = true;
    clearDatasetDrafts();
    // Reset the current frame back to its last-saved state.
    try {
      _setShapes(sessionRef.current.hydrate(JSON.parse(savedShapesJsonRef.current)));
    } catch {
      _setShapes(sessionRef.current.hydrate([]));
    }
    setShowExitConfirm(false);
    router.push(`/datasets/${params.id}`);
  }, [clearDatasetDrafts, params.id, router]);

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
    setHiddenShapeIds((prev) => (prev.includes(shapeId) ? prev.filter((id) => id !== shapeId) : [...prev, shapeId]));
  }, []);

  const toggleShapePinned = useCallback((shapeId: string) => {
    setPinnedShapeIds((prev) => (prev.includes(shapeId) ? prev.filter((id) => id !== shapeId) : [...prev, shapeId]));
  }, []);

  const handleCreateLabel = useCallback(
    async (e: React.FormEvent) => {
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
        broadcastClassesUpdated(projectId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create label.");
      } finally {
        setLabelBusyId(null);
      }
    },
    [isLoggedIn, labels, newLabelColor, newLabelName, projectId],
  );

  const handleDeleteLabel = useCallback(
    async (label: LabelDefinition) => {
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
        broadcastClassesUpdated(projectId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setLabels((prev) => prev.filter((item) => item.id !== label.id));
          if (activeClassId === label.id) setActiveClassId(labels.find((item) => item.id !== label.id)?.id ?? 0);
          broadcastClassesUpdated(projectId);
        } else {
          setError(err instanceof Error ? err.message : "Could not delete label.");
        }
      } finally {
        setLabelBusyId(null);
      }
    },
    [activeClassId, isLoggedIn, labels, projectId, shapes],
  );

  const handleSyncLabels = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const refreshed = await getClassesForProject(projectId);
      projectClassesCache.set(projectId, refreshed);
      setUsedClassIds(new Set(refreshed.filter((c) => (c.annotation_count ?? 0) > 0).map((c) => c.id)));
      const synced = refreshed.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color || "#f97316",
      }));
      setLabels(synced);
      savedLabelsJsonRef.current = JSON.stringify(synced);
      setNewLabelColor(nextLabelColor(synced));
      if (synced.length > 0) {
        setActiveClassId((prev) => (synced.some((l) => l.id === prev) ? prev : synced[0].id));
      }
    } catch {
      // silent — don't show error on background sync
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("visiox-project-classes");
      channel.onmessage = (e: MessageEvent<{ type: string; projectId: number }>) => {
        if (e.data?.type === "classes-updated" && e.data?.projectId === projectId) {
          void handleSyncLabels();
        }
      };
    } catch {
      // BroadcastChannel not supported
    }
    return () => {
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [projectId, handleSyncLabels]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (autoLabelOpen || showDeleteFrameConfirm || showExitConfirm) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === "c") {
          const selected = shapes.find(
            (shape) => shape.clientId === selectedShapeId && shape.shapeType === "rectangle",
          );
          if (selected) {
            e.preventDefault();
            try {
              sessionStorage.setItem(
                `visiox-annotation-bbox-clipboard:${datasetId}`,
                JSON.stringify(selected),
              );
            } catch {
              // Ignore unavailable session storage.
            }
          }
          return;
        }
        if (key === "v") {
          e.preventDefault();
          try {
            const raw = sessionStorage.getItem(`visiox-annotation-bbox-clipboard:${datasetId}`);
            if (!raw) return;
            const copied = JSON.parse(raw) as EditorShape;
            if (copied.shapeType !== "rectangle") return;
            const pasted: EditorShape = {
              ...copied,
              clientId: `paste-${Date.now()}`,
              serverId: undefined,
              source: "manual",
              confidence: undefined,
              autoLabelSource: undefined,
              autoLabelModelId: undefined,
              autoLabelProvider: undefined,
              autoLabelEngineName: undefined,
              frame: 0,
            };
            _setShapes(sessionRef.current.update((currentShapes) => [...currentShapes, pasted]));
            setSelectedShapeId(pasted.clientId);
            if (labels.some((label) => label.id === pasted.classLabelId)) {
              setActiveClassId(pasted.classLabelId);
            }
            setActiveRightTab("objects");
          } catch {
            // Ignore invalid or unavailable clipboard data.
          }
          return;
        }
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
      if (key === "a" || key === "arrowleft") {
        e.preventDefault();
        navigateTo(current - 1, { wrap: true });
      } else if (key === "d" || key === "arrowright") {
        e.preventDefault();
        navigateTo(current + 1, { wrap: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    autoLabelOpen,
    current,
    datasetId,
    handleSave,
    labels,
    navigateTo,
    selectedShapeId,
    shapes,
    showDeleteFrameConfirm,
    showExitConfirm,
  ]);

  const changeShapeClass = useCallback((shapeId: string, classId: number) => {
    setShapes((prev) => prev.map((item) => (item.clientId === shapeId ? { ...item, classLabelId: classId } : item)));
    setActiveClassId(classId);
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#fcfaf7]">
      {showDeleteFrameConfirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-frame-title"
            aria-describedby="delete-frame-description"
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" />
              </svg>
            </div>
            <h2 id="delete-frame-title" className="mt-4 text-lg font-bold text-stone-900">
              Delete frame {frameIndex + 1}?
            </h2>
            <p id="delete-frame-description" className="mt-2 text-sm leading-6 text-stone-500">
              This permanently removes the image and all of its annotations from the dataset. This action cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteFrameConfirm(false)}
                disabled={deletingFrame}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFrame}
                disabled={deletingFrame}
                className="inline-flex min-w-32 items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingFrame ? "Deleting..." : "Delete frame"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showExitConfirm && (
        <div
          className={["fixed inset-0 z-[200] flex items-center justify-center bg-black/40", "backdrop-blur-sm"].join(
            " ",
          )}
        >
          <div className="relative w-96 rounded-2xl bg-white p-6 shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(false)}
              className={[
                "absolute right-4 top-4 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100",
                "hover:text-stone-600",
              ].join(" ")}
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6L18 18" />
              </svg>
            </button>

            <h2 className="text-base font-bold text-stone-900">Unsaved changes</h2>

            <p className="mt-1.5 text-sm text-stone-500">You have unsaved annotations. Save before leaving?</p>

            <div className="mt-6 flex gap-3">
              {/* Discard */}
              <button
                type="button"
                onClick={handleDiscard}
                className={[
                  "flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold",
                  "text-stone-600 transition hover:bg-stone-100",
                ].join(" ")}
              >
                Discard changes
              </button>

              {/* Save & Exit */}
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const ok = await handleSave();
                  if (ok) router.push(`/datasets/${params.id}`);
                }}
                className={[
                  "flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5",
                  "text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50",
                ].join(" ")}
              >
                {saving ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                )}
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            key="save-toast"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={[
              "fixed left-1/2 top-6 z-[100] -translate-x-1/2 flex items-center gap-2.5 rounded-2xl",
              "bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-xl",
              "shadow-emerald-500/30",
            ].join(" ")}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8l3.5 3.5L13 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Saved successfully
          </motion.div>
        )}
      </AnimatePresence>
      <WorkspaceHeader
        datasetId={params.id}
        imageId={params.imageId}
        isNativeMode={isNativeMode}
        frameIndex={frameIndex}
        jobId={jobId}
        canSaveToApi={canSaveToApi}
        saving={saving}
        saveDisabled={loading}
        canUndo={canUndo}
        canRedo={canRedo}
        onBack={() => {
          const dirtyShapes = shapesDifferFromSaved();
          const dirtyLabels = JSON.stringify(labels) !== savedLabelsJsonRef.current;
          if (dirtyShapes || dirtyLabels) {
            setShowExitConfirm(true);
          } else {
            router.push(`/datasets/${params.id}`);
          }
        }}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onDeleteFrame={isNativeMode ? requestDeleteFrame : undefined}
        deletingFrame={deletingFrame}
        deleteFrameDisabled={loading || saving || !canSaveToApi || total <= 0}
        onAutoLabel={isNativeMode ? () => setAutoLabelOpen(true) : undefined}
        autoLabelDisabled={projectId == null || loading}
        autoLabelTitle={
          projectId != null && !loading
            ? "Auto Label current frame or entire dataset"
            : isLoggedIn
              ? "Waiting for dataset information"
              : "Sign in to use Auto Label"
        }
      />

      <ErrorBanner message={error} />

      <AutoLabelDialog
        open={autoLabelOpen}
        datasetId={datasetId}
        frameIndex={frameIndex}
        projectId={projectId}
        labels={labels}
        onClose={() => setAutoLabelOpen(false)}
        onDatasetComplete={handleAutoLabelComplete}
        onFrameComplete={handleFrameAutoLabelComplete}
      />

      <main className="flex min-h-0 flex-grow overflow-hidden">
        <ToolPane
          width={toolPaneWidth}
          activeTool={activeTool}
          polygonVertexCount={polygonVertexCount}
          onToolChange={setActiveTool}
          onPolygonVertexCountChange={setPolygonVertexCount}
        />

        <CanvasStage
          loading={loading}
          currentDraftKey={currentDraftKey}
          imageUrl={imageUrl}
          labels={labels}
          activeClassId={activeClassId}
          shapes={shapes}
          predictionShapes={predictionShapes}
          predictionModelName={predictionModelName}
          predictionLoading={predictionLoading}
          activeTool={activeTool}
          polygonVertexCount={polygonVertexCount}
          hiddenShapeIds={hiddenShapeIds}
          pinnedShapeIds={pinnedShapeIds}
          onActiveClassIdChange={setActiveClassId}
          onShapesChange={setShapes}
          onToolChange={setActiveTool}
          onSelectedIdChange={setSelectedShapeId}
          externalSelectedId={selectedShapeId}
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
          selectedShapeId={selectedShapeId}
          activeClassId={activeClassId}
          usedClassIds={usedClassIds}
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
          onSelectShape={setSelectedShapeId}
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
