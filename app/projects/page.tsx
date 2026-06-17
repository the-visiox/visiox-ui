"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  ArrowLeft,
  ImageIcon,
  Layers,
  Database,
  Download,
  UserPlus,
  BarChart2,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BlueprintGrid from "@/components/BlueprintGrid";
import { CardMenu, type CardMenuItem } from "@/components/CardMenu";
import { useConfirm } from "@/components/useConfirm";
import { projects, datasets as datasetsApi, resolveMediaUrl, type Project, type Dataset } from "@/lib/api";

/* ── helpers ─────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m  = Math.floor(diff / 60000);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  const mo = Math.floor(d / 30);
  if (mo > 0) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  if (d  > 0) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (h  > 0) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m  > 0) return `${m} minute${m > 1 ? "s" : ""} ago`;
  return "just now";
}

const TASK_TYPE_LABEL: Record<string, string> = {
  image_classification:  "Classification",
  object_detection:      "Object Detection",
  semantic_segmentation: "Segmentation",
  instance_segmentation: "Instance Segmentation",
  keypoint_detection:    "Keypoints",
  video_annotation:      "Video",
};

/* ── skeletons ───────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="aspect-[4/3] rounded-3xl border border-stone-200 bg-white p-2 animate-pulse">
      <div className="h-[62%] rounded-2xl bg-stone-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-stone-100 w-2/3" />
        <div className="h-3 rounded bg-stone-100 w-full" />
        <div className="h-3 rounded bg-stone-100 w-1/2" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function ProjectsPage() {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [list, setList]               = useState<Project[]>([]);
  const [query, setQuery]             = useState("");
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);

  const [selected, setSelected]       = useState<Project | null>(null);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [dsLoading, setDsLoading]     = useState(false);

  /* load projects */
  useEffect(() => {
    (async () => {
      try {
        const res = await projects.list();
        setList(res.results ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* load datasets when project is selected */
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDsLoading(true);
    setDatasetList([]);
    (async () => {
      try {
        const res = await datasetsApi.list(selected.id);
        if (!cancelled) setDatasetList(res.results ?? []);
      } finally {
        if (!cancelled) setDsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const filtered = list.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBack = () => {
    setSelected(null);
    setDatasetList([]);
  };

  /* ── action handlers ─────────────────────────────────────────── */
  async function handleDeleteProject(id: number) {
    if (!(await confirm({
      title: "Delete project",
      message: "Delete this project? This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    }))) return;
    try {
      await projects.delete(id);
      setList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      await confirm({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Delete failed",
        confirmLabel: "OK",
        hideCancel: true,
      });
    }
  }

  async function handleDeleteDataset(id: number) {
    if (!(await confirm({
      title: "Delete dataset",
      message: "Delete this dataset? This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    }))) return;
    try {
      await datasetsApi.delete(id);
      setDatasetList((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      await confirm({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Delete failed",
        confirmLabel: "OK",
        hideCancel: true,
      });
    }
  }

  function triggerExport(id: number, format: "coco" | "yolo" | "voc") {
    const url = datasetsApi.exportUrl(id, format);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dataset-${id}-${format}.zip`;
    a.click();
  }

  function projectMenuItems(p: Project): CardMenuItem[] {
    return [
      { icon: Download,  label: "Export Dataset",  onClick: () => router.push(`/projects/${p.id}`) },
      { icon: UserPlus,  label: "Assignee",         onClick: () => router.push(`/projects/${p.id}`) },
      { icon: BarChart2, label: "View Analytics",   onClick: () => router.push(`/projects/${p.id}`) },
      { icon: Trash2,    label: "Delete",            onClick: () => handleDeleteProject(p.id), danger: true, dividerBefore: true },
    ];
  }

  function datasetMenuItems(ds: Dataset): CardMenuItem[] {
    return [
      { icon: Upload,    label: "Upload Annotations", onClick: () => router.push(`/datasets/${ds.id}`) },
      { icon: Wand2,     label: "Auto Annotations",   onClick: () => router.push(`/datasets/${ds.id}`) },
      { icon: Download,  label: "Export as COCO",     onClick: () => triggerExport(ds.id, "coco"), dividerBefore: true },
      { icon: Download,  label: "Export as YOLO",     onClick: () => triggerExport(ds.id, "yolo") },
      { icon: Download,  label: "Export as VOC",      onClick: () => triggerExport(ds.id, "voc") },
      { icon: UserPlus,  label: "Assignee",            onClick: () => router.push(`/datasets/${ds.id}`), dividerBefore: true },
      { icon: BarChart2, label: "View Analytics",      onClick: () => router.push(`/datasets/${ds.id}`) },
      { icon: Trash2,    label: "Delete",              onClick: () => handleDeleteDataset(ds.id), danger: true, dividerBefore: true },
    ];
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      {confirmDialog}
      <BlueprintGrid />

      <main className="flex-grow p-6 z-10">
        <AnimatePresence mode="wait">

          {/* ════ PHASE 1 — Project list ════ */}
          {!selected && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="mb-1 text-3xl font-bold tracking-tight text-stone-900 md:text-3xl">
                    Projects
                  </h1>
                  <p className="max-w-xl text-base leading-6 text-stone-500">
                    Open a project to browse and manage its datasets.
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                  <form
                    onSubmit={(e) => { e.preventDefault(); setSearch(query); }}
                    className="w-full md:w-auto"
                  >
                    <div className="relative w-full md:w-64">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search projects…"
                        className="h-11 w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-4 pr-12 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                      <button
                        type="submit"
                        aria-label="Search"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                  <Link
                    href="/projects/new"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:scale-105 hover:bg-orange-200 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    New project
                  </Link>
                </div>
              </div>

              {/* Grid */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : filtered.length === 0 ? (
                  <div className="col-span-full rounded-3xl border border-dashed border-stone-200 bg-white/80 py-16 text-center">
                    <p className="mb-2 font-bold text-stone-900">No projects found</p>
                    <Link href="/projects/new" className="text-sm text-orange-500 hover:underline">
                      Create your first project
                    </Link>
                  </div>
                ) : (
                  filtered.map((p, index) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="group flex aspect-[1:1] w-full cursor-pointer flex-col rounded-3xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-xl hover:shadow-orange-50 active:scale-[0.99]"
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl bg-stone-100">
                        {p.thumbnail ? (
                          <img
                            src={resolveMediaUrl(p.thumbnail)}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <img
                            src="/project-placeholder.svg"
                            alt="No images yet"
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900 shadow-sm backdrop-blur">
                          {TASK_TYPE_LABEL[p.task_type] ?? p.task_type}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="shrink-0 px-2 pt-2 pb-1">
                        <div className="flex items-center justify-between">
                          <h3 className="truncate text-base font-bold text-stone-900 transition-colors group-hover:text-orange-600">
                            {p.name}
                          </h3>
                          <CardMenu items={projectMenuItems(p)} />
                        </div>
                        <p className="truncate text-xs font-medium text-stone-400">{p.team_name}</p>
                        <p className="mt-1 truncate text-xs text-stone-400">Updated {timeAgo(p.updated_at)}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ════ PHASE 2 — Datasets of selected project ════ */}
          {selected && (
            <motion.div
              key={`datasets-${selected.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold tracking-widest text-stone-400">
                    <button
                      onClick={handleBack}
                      className="hover:text-orange-600 transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Projects
                    </button>
                    <span>/</span>
                    <span className="text-stone-900 truncate max-w-[200px]">{selected.name}</span>
                  </div>
                  <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                    {selected.name}
                  </h1>
                  <p className="text-sm text-stone-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700">
                      <Database className="w-3 h-3" />
                      {TASK_TYPE_LABEL[selected.task_type] ?? selected.task_type}
                    </span>
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                  <Link
                    href={`/projects/${selected.id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:scale-105 active:scale-95"
                  >
                    View project
                  </Link>
                  <Link
                    href={`/projects/${selected.id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:scale-105 hover:bg-orange-200 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    New dataset
                  </Link>
                </div>
              </div>

              {/* Dataset grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(18rem,20rem))] sm:justify-between">
                {dsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : datasetList.length === 0 ? (
                  <div className="col-span-full rounded-3xl border border-dashed border-stone-200 bg-white/80 py-16 text-center">
                    <Layers className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="font-bold text-stone-900 mb-2">No datasets yet</p>
                    <p className="text-sm text-stone-500 mb-4">Create the first dataset for this project.</p>
                    <Link
                      href={`/projects/${selected.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-200 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create dataset
                    </Link>
                  </div>
                ) : (
                  datasetList.map((ds, index) => (
                    <motion.div
                      key={ds.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <div
                        onClick={() => router.push(`/datasets/${ds.id}`)}
                        className="group block w-full cursor-pointer rounded-3xl border border-stone-200 bg-white p-2 shadow-sm transition-all hover:border-orange-300 hover:shadow-xl hover:shadow-orange-50"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-40 overflow-hidden rounded-2xl bg-stone-100">
                          {ds.thumbnail ? (
                            <img
                              src={resolveMediaUrl(ds.thumbnail)}
                              alt={ds.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-stone-300" />
                            </div>
                          )}
                          <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900 shadow-sm backdrop-blur">
                            v{ds.version}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h3 className="truncate text-base font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                              {ds.name}
                            </h3>
                            <CardMenu items={datasetMenuItems(ds)} />
                          </div>
                          <p className="text-xs font-medium text-stone-400 mb-1">
                            {ds.media_count ?? 0} images
                          </p>
                          <p className="text-xs text-stone-400">Updated {timeAgo(ds.updated_at)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
