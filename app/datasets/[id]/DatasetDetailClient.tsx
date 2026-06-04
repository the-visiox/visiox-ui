"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, ChevronDown, Tag, RefreshCw, Upload,
  Loader2, AlertTriangle, BarChart3, Layers, ExternalLink,
  Image as ImageIcon, Activity, Trash2,
  CheckCircle2, Circle, Users, Check, ChevronLeft, ChevronRight,
  Wand2, Eye, FlipHorizontal, FlipVertical, RotateCcw, RotateCw,
  Sun, Aperture, Zap, Scissors, Sliders, Palette, Droplets,
  Wind, Square, Maximize2,
} from 'lucide-react';

const BATCH_SIZE = 50;
import BlueprintGrid from '@/components/BlueprintGrid';
import {
  datasets,
  annotationClasses,
  resolveMediaUrl,
  type DatasetStats,
  type BrowserData,
  type Media,
  type AnnotationClass,
} from '@/lib/api';

const CVAT_URL = process.env.NEXT_PUBLIC_CVAT_URL || 'http://localhost:8080';
const EXPORT_FORMATS = ['coco', 'yolo', 'voc'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

interface Props { id: string; }

function inferUploadMediaType(file: File): 'image' | 'video' {
  if (file.type.startsWith('video/')) return 'video';
  const lower = file.name.toLowerCase();
  if (/\.(mp4|webm|mov|mkv|avi|m4v)$/.test(lower)) return 'video';
  return 'image';
}

function mediaDisplayName(media: Media): string {
  return media.original_filename || media.file_url?.split('/').pop() || media.file?.split('/').pop() || `media-${media.id}`;
}

function mediaFallbackFrames(media: Media[]): BrowserData['frames'] {
  return media
    .filter((item) => item.type === 'image')
    .map((item, index) => ({
      frame: index,
      media_id: item.id,
      image_url: item.file_url,
      name: mediaDisplayName(item),
      width: item.width ?? 0,
      height: item.height ?? 0,
      annotations: [],
    }));
}

function buildMediaFallbackBrowserData(media: Media[], datasetId: number): BrowserData {
  const frames = mediaFallbackFrames(media);
  return {
    dataset_id: datasetId,
    dataset_name: `Dataset #${datasetId}`,
    version: 1,
    task_id: 0,
    frame_count: frames.length,
    labels: [],
    frames,
    annotation_count: 0,
  };
}

function buildBrowserDataWithMediaFallback(browser: BrowserData, media: Media[], datasetId: number): BrowserData {
  if (browser.frames.length > 0 || !media.some((item) => item.type === 'image')) return browser;
  return {
    ...buildMediaFallbackBrowserData(media, datasetId),
    dataset_name: browser.dataset_name,
    version: browser.version,
    task_id: browser.task_id,
    labels: browser.labels,
    annotation_count: browser.annotation_count,
  };
}



// ── Class management ──────────────────────────────────────────────────────────
const CARD      = "bg-white rounded-2xl border border-stone-200";
const CARD_P    = `${CARD} p-6`;
const CARD_COL1 = `flex h-full min-h-0 flex-col space-y-4 ${CARD_P}`;
const CARD_COL2 = `flex h-full min-h-0 flex-col items-center justify-center border-dashed ${CARD} p-8 text-center`;
// ──────────────────────────────────────────────────────────────────────────────

const JOB_STATE_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  new: { icon: Circle, color: 'text-stone-400' },
  'in progress': { icon: Activity, color: 'text-blue-500' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500' },
  rejected: { icon: AlertTriangle, color: 'text-red-500' },
};

interface AugCardDef {
  key: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
  type: 'toggle' | 'slider';
  defaultVal: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}

interface PreprocessCardDef {
  key: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
}

const PREPROCESS_CARDS: PreprocessCardDef[] = [
  { key: 'auto_orient', label: 'Auto-Orient', desc: 'Fix EXIF rotation metadata', Icon: RefreshCw },
  { key: 'resize',      label: 'Resize',      desc: 'Standardize to fixed dimensions', Icon: Maximize2 },
  { key: 'grayscale',   label: 'Grayscale',   desc: 'Convert images to grayscale', Icon: Circle },
];

const AUG_CARDS: AugCardDef[] = [
  { key: 'flip_h',      label: 'Flip',         desc: 'Horizontal mirror',           Icon: FlipHorizontal, type: 'toggle', defaultVal: 1 },
  { key: 'flip_v',      label: 'Flip Vertical', desc: 'Vertical mirror',             Icon: FlipVertical,   type: 'toggle', defaultVal: 1 },
  { key: 'rotate90',    label: '90° Rotate',    desc: 'Random 90° step rotation',    Icon: RotateCw,       type: 'toggle', defaultVal: 1 },
  { key: 'rotation',    label: 'Rotation',      desc: 'Random angle within range',   Icon: RotateCcw,      type: 'slider', defaultVal: 15,  min: 1,    max: 45,  step: 1,    format: v => `±${v}°` },
  { key: 'shear',       label: 'Shear',         desc: 'Geometric shear transform',   Icon: Scissors,       type: 'slider', defaultVal: 10,  min: 5,    max: 30,  step: 5,    format: v => `±${v}°` },
  { key: 'brightness',  label: 'Brightness',    desc: 'Random brightness shift',     Icon: Sun,            type: 'slider', defaultVal: 0.2, min: 0.05, max: 0.5, step: 0.05, format: v => `±${Math.round(v * 100)}%` },
  { key: 'contrast',    label: 'Contrast',      desc: 'Random contrast shift',       Icon: Sliders,        type: 'slider', defaultVal: 0.2, min: 0.05, max: 0.5, step: 0.05, format: v => `±${Math.round(v * 100)}%` },
  { key: 'hue',         label: 'Hue',           desc: 'Random hue shift',            Icon: Palette,        type: 'slider', defaultVal: 20,  min: 5,    max: 60,  step: 5,    format: v => `±${v}` },
  { key: 'saturation',  label: 'Saturation',    desc: 'Random saturation shift',     Icon: Droplets,       type: 'slider', defaultVal: 30,  min: 5,    max: 80,  step: 5,    format: v => `±${v}` },
  { key: 'blur',        label: 'Blur',          desc: 'Gaussian blur effect',        Icon: Aperture,       type: 'slider', defaultVal: 1.5, min: 0.5,  max: 5,   step: 0.5,  format: v => `${v.toFixed(1)}px` },
  { key: 'noise',       label: 'Noise',         desc: 'Gaussian noise injection',    Icon: Zap,            type: 'slider', defaultVal: 0.1, min: 0.05, max: 0.5, step: 0.05, format: v => `${Math.round(v * 100)}%` },
  { key: 'motion_blur', label: 'Motion Blur',   desc: 'Directional motion blur',     Icon: Wind,           type: 'slider', defaultVal: 7,   min: 3,    max: 15,  step: 2,    format: v => `${v}px` },
  { key: 'cutout',      label: 'Cutout',        desc: 'Random rectangular dropout',  Icon: Square,         type: 'toggle', defaultVal: 1 },
];

export default function DatasetDetailClient({ id }: Props) {
  const router = useRouter();
  const numericId = parseInt(id, 10);

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [browserData, setBrowserData] = useState<BrowserData | null>(null);
  const [annotatedCountApi, setAnnotatedCountApi] = useState<number | null>(null);
  const [mediaCountApi, setMediaCountApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Last frame row index for Shift+click range selection (in `browserData.frames` order). */
  const anchorFrameIndexRef = useRef<number | null>(null);
  /** Image browser card — clicks outside clear selection. */
  const imageBrowserPanelRef = useRef<HTMLDivElement>(null);

  const [augOpen, setAugOpen] = useState(false);
  const [augStep, setAugStep] = useState<1 | 2>(1);
  const [preprocessConfig, setPreprocessConfig] = useState({
    auto_orient: false, resize: false, resize_width: 640, resize_height: 640, grayscale: false,
  });
  const [augConfig, setAugConfig] = useState({
    flip_h: false, flip_v: false, rotate90: false,
    rotation: 0, brightness: 0, blur: 0, noise: 0, shear: 0, contrast: 0,
    hue: 0, saturation: 0, motion_blur: 0, cutout: false,
  });
  const [multiplier, setMultiplier] = useState(1);
  const [augPreviews, setAugPreviews] = useState<Array<{ media_id: number; name: string; augmented_url: string }>>([]);
  const [augLoading, setAugLoading] = useState(false);
  const [augApplying, setAugApplying] = useState(false);
  const [allClasses, setAllClasses] = useState<AnnotationClass[]>([]);

  const refreshStatsAndBrowser = useCallback(async () => {
    const [dsResult, statsResult, browserResult, mediaResult] = await Promise.allSettled([
      datasets.get(numericId),
      datasets.stats(numericId),
      datasets.browser(numericId),
      datasets.media(numericId),
    ]);
    if (dsResult.status === 'fulfilled') {
      setAnnotatedCountApi(dsResult.value.annotated_count ?? null);
      setMediaCountApi(dsResult.value.media_count ?? null);
    }
    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
      const projectId = statsResult.value.project_id;
      if (projectId) {
        annotationClasses.list(projectId).then(res => setAllClasses(res.results)).catch(() => {});
      }
    }
    if (browserResult.status === 'fulfilled') {
      const browser = browserResult.value;
      const media = mediaResult.status === 'fulfilled' ? mediaResult.value : [];
      setBrowserData(buildBrowserDataWithMediaFallback(browser, media, numericId));
    } else if (mediaResult.status === 'fulfilled' && mediaResult.value.some((item) => item.type === 'image')) {
      setBrowserData(buildMediaFallbackBrowserData(mediaResult.value, numericId));
    }
    if (dsResult.status === 'rejected' && statsResult.status === 'rejected' && browserResult.status === 'rejected') {
      setError('Failed to load dataset data');
    }
  }, [numericId]);

  useEffect(() => {
    if (isNaN(numericId)) return;
    let cancelled = false;

    async function load() {
      try {
        await refreshStatsAndBrowser();
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    setLoading(true);
    setError('');
    load();
    return () => { cancelled = true; };
  }, [numericId, refreshStatsAndBrowser]);

  useEffect(() => {
    setSelectedMediaIds([]);
    anchorFrameIndexRef.current = null;
    setCurrentPage(1);
  }, [numericId]);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("visiox-annotations");
      channel.onmessage = (e: MessageEvent<{ type: string; datasetId: number }>) => {
        if (e.data?.type === "annotations-saved" && e.data?.datasetId === numericId) {
          void refreshStatsAndBrowser();
        }
      };
    } catch { /* BroadcastChannel not supported */ }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshStatsAndBrowser();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      try { channel?.close(); } catch { /* ignore */ }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [numericId, refreshStatsAndBrowser]);

  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (selectedMediaIds.length === 0) return;
      const panel = imageBrowserPanelRef.current;
      if (!panel) return;
      if (panel.contains(e.target as Node)) return;
      setSelectedMediaIds([]);
      anchorFrameIndexRef.current = null;
    }
    document.addEventListener('mousedown', handleDocMouseDown);
    return () => document.removeEventListener('mousedown', handleDocMouseDown);
  }, [selectedMediaIds.length]);

  const totalPages = browserData ? Math.max(1, Math.ceil(browserData.frames.length / BATCH_SIZE)) : 1;
  const safePage = Math.min(currentPage, totalPages);
  const pageOffset = (safePage - 1) * BATCH_SIZE;
  const visibleFrames = browserData?.frames.slice(pageOffset, pageOffset + BATCH_SIZE) ?? [];

  const selectableMediaIds = visibleFrames
    .map((f) => f.media_id)
    .filter((id): id is number => typeof id === 'number');

  useEffect(() => {
    if (!browserData?.frames.length) return;
    const warmFrames = browserData.frames.slice(0, Math.min(browserData.frames.length, 12));
    warmFrames.forEach((frame) => {
      const href =
        frame.image_url && typeof frame.media_id === 'number'
          ? `/datasets/${id}/annotate/${frame.media_id}?mode=simple`
          : `/datasets/${id}/annotate/native?mode=simple&frame=${frame.frame}`;
      router.prefetch(href);
      const img = new Image();
      img.decoding = 'async';
      img.src = frame.image_url ? resolveMediaUrl(frame.image_url) : datasets.frameUrl(numericId, frame.frame);
    });
  }, [browserData, id, numericId, router]);

  const toggleMediaSelection = (mediaId: number) => {
    setSelectedMediaIds((prev) =>
      prev.includes(mediaId) ? prev.filter((x) => x !== mediaId) : [...prev, mediaId],
    );
  };

  const selectMediaRangeByFrameIndex = useCallback((from: number, to: number) => {
    if (!browserData?.frames.length) return;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const ids: number[] = [];
    for (let i = lo; i <= hi; i++) {
      const f = browserData.frames[i];
      if (typeof f.media_id === 'number') ids.push(f.media_id);
    }
    setSelectedMediaIds(ids);
  }, [browserData]);

  const allSelectableSelected =
    selectableMediaIds.length > 0 &&
    selectableMediaIds.every((id) => selectedMediaIds.includes(id));

  const toggleSelectAllMedia = () => {
    if (allSelectableSelected) {
      setSelectedMediaIds([]);
    } else {
      setSelectedMediaIds([...selectableMediaIds]);
    }
    anchorFrameIndexRef.current = null;
  };

  const handleDeleteSelectedMedia = async () => {
    if (!selectedMediaIds.length || isNaN(numericId)) return;
    if (!window.confirm(`Delete ${selectedMediaIds.length} image(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await datasets.deleteMedia(numericId, selectedMediaIds);
      setSelectedMediaIds([]);
      anchorFrameIndexRef.current = null;
      await refreshStatsAndBrowser();
      setCurrentPage((p) => Math.max(1, p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || isNaN(numericId)) return;
    setUploading(true);
    setError('');
    try {
      const files = Array.from(fileList);
      for (const file of files) {
        await datasets.upload(numericId, file, inferUploadMediaType(file));
      }
      await refreshStatsAndBrowser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await datasets.syncCvat(numericId);
      window.location.reload();
    } catch { setError('Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleAugPreview = async () => {
    setAugLoading(true);
    setAugPreviews([]);
    try {
      const result = await datasets.augmentPreview(numericId, {
        preprocess: preprocessConfig,
        augment: augConfig,
        count: 6,
      });
      setAugPreviews(result.previews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Augmentation preview failed');
    } finally {
      setAugLoading(false);
    }
  };

  const handleAugApply = async () => {
    if (!window.confirm(`Generate ${(browserData?.frames.length ?? 0) * multiplier} augmented images and add them to this dataset?`)) return;
    setAugApplying(true);
    setError('');
    try {
      await datasets.augmentApply(numericId, {
        preprocess: preprocessConfig,
        augment: augConfig,
        multiplier,
      });
      await refreshStatsAndBrowser();
      setAugPreviews([]);
      setAugOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setAugApplying(false);
    }
  };

  const isAugEnabled = (key: string): boolean => {
    const val = augConfig[key as keyof typeof augConfig];
    return typeof val === 'boolean' ? val : (val as number) > 0;
  };

  const toggleAug = (card: AugCardDef) => {
    setAugConfig(c => {
      const current = c[card.key as keyof typeof c];
      if (typeof current === 'boolean') return { ...c, [card.key]: !current };
      return { ...c, [card.key]: (current as number) === 0 ? card.defaultVal : 0 };
    });
    setAugPreviews([]);
  };

  const togglePreprocess = (key: string) => {
    setPreprocessConfig(c => ({ ...c, [key]: !c[key as keyof typeof c] }));
    setAugPreviews([]);
  };

  const augActiveCount = AUG_CARDS.filter(c => isAugEnabled(c.key)).length;
  const preprocessActiveCount = PREPROCESS_CARDS.filter(
    c => !!preprocessConfig[c.key as keyof typeof preprocessConfig],
  ).length;

  const handleExport = (format: ExportFormat) => {
    setExportOpen(false);
    const url = datasets.exportUrl(numericId, format);
    const a = document.createElement('a');
    a.href = url; a.download = `dataset-${id}-${format}.zip`; a.click();
  };

  const cvat = stats?.cvat;
  const totalImages = Math.max(cvat?.size ?? 0, browserData?.frame_count ?? 0, mediaCountApi ?? 0);
  const totalAnnotations = cvat?.annotations?.total ?? browserData?.annotation_count ?? 0;
  const labels = browserData?.labels ?? [];
  const name = stats?.name ?? browserData?.dataset_name ?? `Dataset #${id}`;
  const taskId = stats?.cvat_task_id ?? browserData?.task_id;
  const jobs = cvat?.jobs ?? [];

  const annotatedCount =
    annotatedCountApi !== null
      ? annotatedCountApi
      : browserData
        ? browserData.frames.filter(f => f.annotations.length > 0).length
        : (totalAnnotations > 0 ? totalImages : 0);

  if (loading) {
    return (
      <div className="relative flex-1 flex flex-col min-h-screen bg-stone-50">
        <BlueprintGrid />
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-500">Loading dataset statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen bg-stone-50">
      <BlueprintGrid />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v"
        multiple
        className="hidden"
        onChange={(e) => void handleUploadFiles(e.target.files)}
      />

      {/* Navbar */}
      <div className="sticky top-4 z-20 w-full max-w-8xl mx-auto px-6 mb-4">
        <nav className="sticky top-0 z-50 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(stats?.project_id ? `/projects/${stats.project_id}` : "/projects")}
              className="p-2 hover:bg-stone-100 rounded-xl transition-colors border border-transparent hover:border-stone-200"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div className="h-6 w-[1px] bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest">
              <Link href="/projects" className="hover:text-stone-600 transition-colors">
                Projects
              </Link>
              <span>/</span>
              {stats?.project_id && stats?.project_name ? (
                <>
                  <Link href={`/projects/${stats.project_id}`} className="hover:text-stone-600 transition-colors">
                    {stats.project_name}
                  </Link>
                  <span>/</span>
                </>
              ) : null}
              <span className="text-stone-900">{name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || syncing}
              className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </button>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </button>

            <div className="relative">
              <button
                onClick={() => setExportOpen(v => !v)}
                className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all"
              >
                <Download className="w-4 h-4" /> Export
                <ChevronDown className={`w-4 h-4 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-50 min-w-[120px]"
                >
                  {EXPORT_FORMATS.map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 uppercase"
                    >
                      {fmt === 'coco' ? 'COCO JSON' : fmt === 'yolo' ? 'YOLO txt' : 'Pascal VOC'}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {!!taskId && (
              <a href={`${CVAT_URL}/tasks/${taskId}`} target="_blank" rel="noopener noreferrer"
                className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all"
              >
                <ExternalLink className="w-4 h-4" /> CVAT
              </a>
            )}

            <button
              type="button"
              onClick={() => router.push(`/datasets/${id}/annotate/native?mode=simple`)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:scale-105 hover:bg-orange-200 active:scale-95"
            >
              <Layers className="w-4 h-4" /> Annotate Native
            </button>
          </div>
        </nav>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl z-10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Main Content */}
      <div className="z-10 flex-1 overflow-auto p-6 space-y-4 max-w-8xl mx-auto w-full">

        {/* ── Augmented Images Preview ── */}
        {augPreviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={CARD_P}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-stone-900">Augmented Preview</h3>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                    {augPreviews.length} images
                  </span>
                </div>
                <p className="text-sm text-stone-400">Current config applied — original images unchanged</p>
              </div>
              <button
                type="button"
                onClick={() => setAugPreviews([])}
                className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {augPreviews.map(preview => (
                <div key={preview.media_id}
                  className="group overflow-hidden rounded-2xl border border-orange-200/60 bg-white hover:shadow-md hover:border-orange-300 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.augmented_url} alt={`Augmented ${preview.name}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="px-2.5 py-2 bg-white">
                    <p className="truncate text-xs font-semibold text-stone-800">{preview.name}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <p className="text-[10px] font-medium text-orange-500">Augmented</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">

          {/* Column 1: Stats, Annotation Progress & Label Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={CARD_COL1}
          >
            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                { label: 'Total Images', value: totalImages, Icon: ImageIcon, iconClass: 'bg-orange-100 text-orange-500' },
                { label: 'Labels', value: allClasses.length || labels.length, Icon: Tag, iconClass: 'bg-purple-100 text-purple-500' },
                { label: 'Annotations', value: totalAnnotations, Icon: BarChart3, iconClass: 'bg-blue-100 text-blue-500' },
                { label: 'Annotated images', value: annotatedCount, Icon: CheckCircle2, iconClass: 'bg-emerald-100 text-emerald-500' },
              ] as const).map(({ label, value, Icon, iconClass }) => (
                <div key={label} className="rounded-xl bg-stone-50 px-3 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${iconClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-bold text-stone-900">{value}</p>
                  <p className="text-xs font-medium text-stone-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {(allClasses.length > 0 || labels.length > 0) && browserData && (() => {
              // Build a name→count map from CVAT browser labels
              const cvatCountByName = new Map<string, number>();
              labels.forEach(label => {
                const count = browserData.frames.reduce(
                  (sum, f) => sum + f.annotations.filter(a => a.label_id === label.id).length, 0
                );
                cvatCountByName.set(label.name.toLowerCase(), count);
              });

              // Use project classes (all labels) if available, else fall back to browserData labels
              const source = allClasses.length > 0 ? allClasses : labels;
              const counts = source.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color,
                count: cvatCountByName.get(label.name.toLowerCase()) ?? 0,
              }));
              const maxCount = Math.max(...counts.map(c => c.count), 1);
              return (
                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-3">Label Distribution</h3>
                  <div className="flex items-end gap-1.5">
                    {counts.map(lbl => {
                      const pct = (lbl.count / maxCount) * 100;
                      return (
                        <div key={lbl.id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                          <div className="relative w-full h-48">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="absolute bottom-0 left-2 right-2 rounded-t-[4px] min-h-[2px] overflow-hidden"
                              style={{ backgroundColor: lbl.color }}
                            >
                              {lbl.count > 0 && (
                                <span className="absolute top-2 left-0 right-0 text-[10px] font-bold text-stone-600 tabular-nums text-center leading-none">
                                  {lbl.count}
                                </span>
                              )}
                            </motion.div>
                          </div>
                          <span className="text-[10px] text-stone-400 truncate w-full text-center">{lbl.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {labels.length === 0 && (
              <div className="text-center py-6 text-stone-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No labels yet</p>
                <p className="text-xs mt-1">Add labels via the Annotate interface</p>
              </div>
            )}
          </motion.div>

          {/* Column 2: Model Performance placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className={CARD_COL2}
          >
            <BarChart3 className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-base font-bold text-stone-400">Model Performance</p>
            <p className="text-sm text-stone-300 mt-1 max-w-xs">
              Train a model to see predictions & metrics here
            </p>
          </motion.div>
        </div>

        {/* ── Generate Dataset ── */}
        {browserData && browserData.frames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className={`${CARD} overflow-hidden`}
          >
            <button
              type="button"
              onClick={() => { setAugOpen(v => !v); }}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-stone-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-stone-900">Generate Dataset</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Preprocessing · Augmentation · Apply to dataset</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {(preprocessActiveCount + augActiveCount) > 0 && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
                    {preprocessActiveCount + augActiveCount} active
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${augOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {augOpen && (
              <div className="border-t border-stone-100 px-6 pb-6 pt-5 space-y-5">
                {/* Step indicator */}
                <div className="flex items-center">
                  <button type="button" onClick={() => setAugStep(1)} className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                      augStep === 1 ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-emerald-500 text-white'
                    }`}>
                      {augStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                    </span>
                    <span className={`text-xs font-bold ${augStep === 1 ? 'text-orange-600' : 'text-stone-400'}`}>Preprocessing</span>
                  </button>
                  <div className="mx-3 flex-1 h-px bg-stone-200" />
                  <button type="button" onClick={() => setAugStep(2)} className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                      augStep === 2 ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-stone-200 text-stone-500'
                    }`}>2</span>
                    <span className={`text-xs font-bold ${augStep === 2 ? 'text-orange-600' : 'text-stone-400'}`}>Augmentation</span>
                  </button>
                </div>

                {/* ── Step 1: Preprocessing ── */}
                {augStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {PREPROCESS_CARDS.map(card => {
                        const enabled = !!preprocessConfig[card.key as keyof typeof preprocessConfig];
                        return (
                          <div key={card.key} className={`rounded-xl border p-4 transition-all duration-200 ${
                            enabled ? 'border-orange-300 bg-orange-50/40 shadow-sm shadow-orange-500/10' : 'border-stone-200 hover:border-stone-300'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                enabled ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-stone-100 text-stone-400'
                              }`}>
                                <card.Icon className="w-4 h-4" />
                              </div>
                              <button
                                role="switch" aria-checked={enabled}
                                onClick={() => togglePreprocess(card.key)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${
                                  enabled ? 'bg-orange-500 shadow-md shadow-orange-500/25' : 'bg-stone-200 hover:bg-stone-300'
                                }`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                            <p className="text-sm font-bold text-stone-800">{card.label}</p>
                            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{card.desc}</p>
                            {enabled && card.key === 'resize' && (
                              <div className="mt-3 pt-3 border-t border-orange-200/70">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Dimensions</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number" min={32} max={4096} step={32}
                                    value={preprocessConfig.resize_width}
                                    onChange={e => setPreprocessConfig(c => ({ ...c, resize_width: parseInt(e.target.value) || 640 }))}
                                    className="w-20 text-xs border border-orange-200 rounded-lg px-2 py-1.5 text-stone-700 text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                  />
                                  <span className="text-xs text-stone-400">×</span>
                                  <input
                                    type="number" min={32} max={4096} step={32}
                                    value={preprocessConfig.resize_height}
                                    onChange={e => setPreprocessConfig(c => ({ ...c, resize_height: parseInt(e.target.value) || 640 }))}
                                    className="w-20 text-xs border border-orange-200 rounded-lg px-2 py-1.5 text-stone-700 text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-400/40"
                                  />
                                  <span className="text-[10px] text-stone-400">px</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setAugStep(2)}
                        className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
                      >
                        Next: Augmentation <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Augmentation ── */}
                {augStep === 2 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                      {AUG_CARDS.map(card => {
                        const enabled = isAugEnabled(card.key);
                        const numVal = augConfig[card.key as keyof typeof augConfig] as number;
                        return (
                          <div key={card.key} className={`rounded-xl border p-3.5 transition-all duration-200 ${
                            enabled ? 'border-orange-300 bg-orange-50/40 shadow-sm shadow-orange-500/10' : 'border-stone-200 hover:border-stone-300 bg-white'
                          }`}>
                            <div className="flex items-start justify-between mb-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                enabled ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-stone-100 text-stone-400'
                              }`}>
                                <card.Icon className="w-4 h-4" />
                              </div>
                              <button
                                role="switch" aria-checked={enabled}
                                onClick={() => toggleAug(card)}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-200 ${
                                  enabled ? 'bg-orange-500 shadow-md shadow-orange-500/25' : 'bg-stone-200 hover:bg-stone-300'
                                }`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                            <p className="text-xs font-bold text-stone-800">{card.label}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">{card.desc}</p>
                            {enabled && card.type === 'slider' && card.format && (
                              <div className="mt-3 pt-2.5 border-t border-orange-200/70">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range" min={card.min} max={card.max} step={card.step} value={numVal}
                                    onChange={e => setAugConfig(c => ({ ...c, [card.key]: parseFloat(e.target.value) }))}
                                    className="flex-1 h-1 accent-orange-500 cursor-pointer"
                                  />
                                  <span className="w-10 shrink-0 text-right text-[10px] font-bold text-orange-600 tabular-nums">
                                    {card.format(numVal)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Multiplier */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-stone-800">Dataset Multiplier</p>
                          <p className="text-xs text-stone-400 mt-0.5">Number of augmented copies per original image</p>
                        </div>
                        <span className="text-xs font-bold text-orange-600 tabular-nums">
                          {(browserData?.frames.length ?? 0) * multiplier} total images
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {([1, 2, 3, 4, 5] as const).map(m => (
                          <button
                            key={m} type="button"
                            onClick={() => setMultiplier(m)}
                            className={`flex-1 rounded-lg border py-2.5 text-xs font-bold transition-all ${
                              multiplier === m
                                ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/25'
                                : 'border-stone-200 bg-white text-stone-600 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                          >
                            {m}×
                            <span className={`block text-[10px] font-medium mt-0.5 ${multiplier === m ? 'text-orange-200' : 'text-stone-400'}`}>
                              +{(browserData?.frames.length ?? 0) * m} imgs
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setAugStep(1)}
                        className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAugPreview()}
                          disabled={augLoading || augActiveCount === 0}
                          className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-200 bg-white text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {augLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAugApply()}
                          disabled={augApplying || augActiveCount === 0}
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {augApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                          Apply to Dataset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className={CARD_P}
          >
            <h3 className="text-base font-bold text-stone-900 mb-3">Jobs</h3>
            <div className="border border-stone-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-xs tracking-wider">
                    <th className="text-left px-3 py-2">Job</th>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-left px-3 py-2">State</th>
                    <th className="text-right px-3 py-2">Frames</th>
                    <th className="text-left px-3 py-2">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => {
                    const style = JOB_STATE_STYLE[job.state] ?? JOB_STATE_STYLE['new'];
                    const StateIcon = style.icon;
                    return (
                      <tr key={job.id} className="border-t border-stone-100 hover:bg-stone-50 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-stone-700">#{job.id}</td>
                        <td className="px-3 py-2.5 text-stone-600 capitalize">{job.stage}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 ${style.color}`}>
                            <StateIcon className="w-3 h-3" />
                            <span className="capitalize">{job.state}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-stone-700">{job.frame_count}</td>
                        <td className="px-3 py-2.5 text-stone-500">
                          {job.assignee ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {job.assignee}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {totalImages === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-base font-bold text-stone-900">No images or videos yet</h3>
            <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto">
              Upload image or video files. Videos are stored as media; use the native annotate flow for frames.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload files
            </button>
          </motion.div>
        )}

        {/* Frame Browser */}
        {browserData && browserData.frames.length > 0 && (
          <motion.div
            ref={imageBrowserPanelRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className={CARD_P}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Image Browser</h3>
                <p className="text-sm text-stone-500 mt-1">
                  Select images to delete, or click an image to open the annotation view. Hold Shift and click another checkbox to select a range.
                </p>
              </div>
              {(selectableMediaIds.length > 0 || selectedMediaIds.length > 0) && (
                <div className="relative z-10 flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:w-auto sm:min-w-[17.5rem]">
                  {selectableMediaIds.length > 0 && (
                    <label className="inline-flex min-w-[7.25rem] cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-600 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={() => toggleSelectAllMedia()}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md shadow-inner ring-1 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400/50 ${allSelectableSelected
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm ring-orange-400/40'
                            : 'bg-stone-100/95 text-stone-500 ring-stone-200/80'
                          }`}
                      >
                        <Check
                          className={`h-3 w-3 stroke-[3] text-white transition-opacity duration-150 ${allSelectableSelected ? 'opacity-100' : 'opacity-0'
                            }`}
                          aria-hidden
                        />
                      </span>
                      Select all
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelectedMedia()}
                    disabled={deleting || selectedMediaIds.length === 0}
                    className="inline-flex min-w-[9.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-red-50/90 px-3.5 py-2 text-sm font-bold tabular-nums text-red-700 shadow-sm backdrop-blur-sm transition hover:bg-red-100/95 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete ({selectedMediaIds.length})
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {visibleFrames.map((frame, localIndex) => {
                const frameIndex = pageOffset + localIndex;
                const isSelected =
                  typeof frame.media_id === 'number' && selectedMediaIds.includes(frame.media_id);
                const annotateHref =
                  frame.image_url && typeof frame.media_id === 'number'
                    ? `/datasets/${id}/annotate/${frame.media_id}?mode=simple`
                    : `/datasets/${id}/annotate/native?mode=simple&frame=${frame.frame}`;
                const imageSrc = frame.image_url ? resolveMediaUrl(frame.image_url) : datasets.frameUrl(numericId, frame.frame);
                return (
                  <div
                    key={frame.frame}
                    className={`group/card relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out ${isSelected
                        ? 'border-orange-300/70 bg-gradient-to-br from-orange-50/90 to-amber-50/40 shadow-md shadow-orange-500/10 ring-1 ring-orange-400/25'
                        : 'border-stone-200/90 bg-stone-50/80 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-300/25'
                      }`}
                  >
                    {typeof frame.media_id === 'number' && (
                      <div
                        className={`absolute left-2.5 top-2.5 z-20 transition-all duration-300 ease-out ${isSelected
                            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                            : 'pointer-events-none -translate-y-0.5 scale-90 opacity-0 group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:scale-100 group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:scale-100 group-focus-within/card:opacity-100'
                          }`}
                      >
                        <label
                          className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400/45"
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            if (!e.shiftKey) return;
                            e.preventDefault();
                            const anchor = anchorFrameIndexRef.current;
                            if (anchor !== null) {
                              selectMediaRangeByFrameIndex(anchor, frameIndex);
                            } else {
                              selectMediaRangeByFrameIndex(frameIndex, frameIndex);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const event = e.nativeEvent as MouseEvent;
                              if (event.shiftKey) return;
                              anchorFrameIndexRef.current = frameIndex;
                              toggleMediaSelection(frame.media_id as number);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.shiftKey) e.preventDefault();
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[5px] shadow-inner ring-1 transition-all duration-200 ${isSelected
                                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white ring-orange-400/40 shadow-sm'
                                : 'bg-stone-100/95 text-stone-500 ring-stone-200/85'
                              }`}
                          >
                            <Check
                              className={`h-2.5 w-2.5 stroke-[3] text-white transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0'
                                }`}
                              aria-hidden
                            />
                          </span>
                        </label>
                      </div>
                    )}
                    <Link
                      href={annotateHref}
                      className="block outline-none ring-inset focus-visible:ring-2 focus-visible:ring-orange-400/50 rounded-2xl"
                      title={`Open annotation for ${frame.name}`}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200/80">
                        {/* eslint-disable-next-line @next/next/no-img-element -- JWT-backed frame URLs */}
                        <img
                          src={imageSrc}
                          alt={frame.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
                        />
                      </div>
                      <div className="bg-white/60 px-2.5 py-2 backdrop-blur-[2px]">
                        <p className="truncate text-xs font-semibold text-stone-800">{frame.name}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-stone-500">
                          {frame.annotations.length} labels
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <p className="text-sm font-medium text-stone-500">
                  Showing {pageOffset + 1}–{Math.min(pageOffset + BATCH_SIZE, browserData?.frames.length ?? 0)} of{' '}
                  <span className="font-bold text-stone-700">{browserData?.frames.length ?? 0}</span> images
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setSelectedMediaIds([]); anchorFrameIndexRef.current = null; }}
                    disabled={safePage <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {(() => {
                    const pages: (number | 'ellipsis')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (safePage > 3) pages.push('ellipsis');
                      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
                      if (safePage < totalPages - 2) pages.push('ellipsis');
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) =>
                      p === 'ellipsis' ? (
                        <span key={`ell-${idx}`} className="px-1 text-xs text-stone-400">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setCurrentPage(p as number); setSelectedMediaIds([]); anchorFrameIndexRef.current = null; }}
                          className={`flex h-8 min-w-[2rem] items-center justify-center rounded-xl border px-2 text-xs font-bold transition ${safePage === p
                              ? 'border-orange-400/40 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); setSelectedMediaIds([]); anchorFrameIndexRef.current = null; }}
                    disabled={safePage >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}

