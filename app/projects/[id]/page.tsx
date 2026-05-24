"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  Layout,
  Settings,
  Clock,
  Image as ImageIcon,
  Loader2,
  X,
  Tag,
  Pencil,
  Trash2,
  Globe2,
  Download,
  UserPlus,
  BarChart2,
  Upload,
  Wand2,
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { CardMenu, type CardMenuItem } from "@/components/CardMenu";
import {
  annotationClasses,
  dataverse,
  datasets,
  projects,
  resolveMediaUrl,
  type AnnotationClass,
  type Dataset,
  type Project,
} from "@/lib/api";

const CVAT_PUBLIC_URL = process.env.NEXT_PUBLIC_CVAT_URL || "http://localhost:8080";

const STATUS_DOT: Record<string, string> = {
  Ready: "bg-green-500",
  Annotating: "bg-[#6735E0] animate-pulse",
  Draft: "bg-stone-300",
};

function datasetStatus(d: Dataset): "Ready" | "Annotating" | "Draft" {
  if (d.media_count === 0) return "Draft";
  return "Ready";
}

function CreateDatasetModal({
  project,
  onClose,
  onCreated,
}: {
  project: Project;
  onClose: () => void;
  onCreated: (d: Dataset) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));

      return [
        ...prev,
        ...arr.filter((f) => !existing.has(f.name + f.size)),
      ];
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const created = await datasets.create({
        project: project.id,
        name,
        description,
      });

      if (files.length > 0) {
        setUploadProgress({
          current: 0,
          total: files.length,
        });

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          const type = file.type.startsWith("video/")
            ? "video"
            : "image";

          await datasets.upload(created.id, file, type);

          setUploadProgress({
            current: i + 1,
            total: files.length,
          });
        }
      }

      onCreated(created);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create dataset"
      );

      setSaving(false);

      setUploadProgress({
        current: 0,
        total: 0,
      });
    }
  };

  function submitLabel() {
    if (!saving) return "Create Dataset";

    if (uploadProgress.total > 0) {
      return `Uploading ${uploadProgress.current}/${uploadProgress.total}…`;
    }

    return "Creating…";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              New Dataset
            </h2>

            <p className="mt-1 text-xs text-stone-500">
              Creating in project{" "}
              <span className="font-bold text-stone-900">
                {project.name}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-stone-100"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dataset Name */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Dataset Name
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Workshop-Safety-Part-A"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Description
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Upload Section */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Upload Data{" "}
              <span className="normal-case font-normal text-stone-300">
                (optional)
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                }

                e.target.value = "";
              }}
            />

            <div
              onClick={() =>
                !saving && fileInputRef.current?.click()
              }
              onDragOver={(e) => {
                e.preventDefault();

                if (!saving) {
                  setDragOver(true);
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();

                setDragOver(false);

                if (!saving) {
                  addFiles(e.dataTransfer.files);
                }
              }}
              className={`rounded-2xl border-2 border-dashed px-4 py-6 transition-all ${
                saving
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              } ${
                dragOver
                  ? "border-orange-400 bg-orange-50"
                  : "border-stone-200 hover:border-orange-300 hover:bg-stone-50/60"
              }`}
            >
              {/* Empty State */}
              {files.length === 0 && (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
                    <Upload className="h-5 w-5 text-stone-400" />
                  </div>

                  <p className="text-sm font-semibold text-stone-700">
                    Drop files here or{" "}
                    <span className="text-orange-500">
                      browse
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-stone-400">
                    Images & videos — PNG, JPG, MP4, MOV…
                  </p>
                </div>
              )}

              {/* File List Inside Upload Box */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-700">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </p>

                    <span className="text-xs text-orange-500">
                      Click or drop more
                    </span>
                  </div>

                  <div className="max-h-62 space-y-2 overflow-y-auto pr-1">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                          <ImageIcon
                            className={`h-4 w-4 ${
                              f.type.startsWith("video/")
                                ? "text-stone-400"
                                : "text-orange-400"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-700">
                            {f.name}
                          </p>

                          <p className="text-xs text-stone-400">
                            {formatSize(f.size)}
                          </p>
                        </div>

                        {!saving && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="shrink-0 rounded-lg p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}

                        {saving &&
                          uploadProgress.total > 0 &&
                          idx < uploadProgress.current && (
                            <span className="shrink-0 text-xs font-bold text-emerald-500">
                              Done
                            </span>
                          )}

                        {saving &&
                          uploadProgress.total > 0 &&
                          idx === uploadProgress.current && (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ml-auto grid w-fit grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl bg-stone-100 px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-200 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !name}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {submitLabel()}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const DEFAULT_CLASS_COLOR = "#E66700";

function ClassEditorModal({
  projectId,
  editing,
  onClose,
  onSaved,
}: {
  projectId: number;
  editing: AnnotationClass | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CLASS_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setColor(editing.color || DEFAULT_CLASS_COLOR);
    } else {
      setName("");
      setColor(DEFAULT_CLASS_COLOR);
    }
    setError("");
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await annotationClasses.update(editing.id, { name: name.trim(), color });
      } else {
        await annotationClasses.create({
          project: projectId,
          name: name.trim(),
          color,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900">
            {editing ? "Edit class" : "New label class"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hard hat, Person, Defect"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [classList, setClassList] = useState<AnnotationClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AnnotationClass | null>(null);
  const [sharing, setSharing] = useState(false);

  const projectIdNum = id ? parseInt(id as string, 10) : NaN;

  const loadClasses = useCallback(async () => {
    if (Number.isNaN(projectIdNum)) return;
    try {
      const res = await annotationClasses.list(projectIdNum);
      setClassList(res.results ?? []);
    } catch {
      setClassList([]);
    }
  }, [projectIdNum]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const projectId = parseInt(id as string, 10);
        const [found, dsRes] = await Promise.all([
          projects.get(projectId),
          datasets.list(projectId),
        ]);
        setProject(found);
        setDatasetList(dsRes.results);
        const clsRes = await annotationClasses.list(projectId);
        setClassList(clsRes.results ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-300" /></div>;
  if (!project) return <div className="flex-1 flex flex-col items-center justify-center p-8"><p className="text-stone-500 mb-4">Project not found</p><button onClick={() => router.push('/projects')} className="text-orange-500 font-bold">Back to Projects</button></div>;

  async function handleShareToDataverse() {
    if (!project) return;
    setSharing(true);
    try {
      await dataverse.shareProject({
        project: project.id,
        title: project.name,
        summary: project.description || "",
        tags: [project.task_type.replace(/_/g, "-")],
        license: "Community",
        is_public: true,
      });
      window.alert("Project shared to Dataverse.");
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Could not share project.");
    } finally {
      setSharing(false);
    }
  }

  function handleDeleteDataset(datasetId: number) {
    if (!window.confirm("Delete this dataset? This cannot be undone.")) return;
    datasets.delete(datasetId)
      .then(() => setDatasetList((prev) => prev.filter((d) => d.id !== datasetId)))
      .catch((err) => window.alert(err instanceof Error ? err.message : "Delete failed"));
  }

  function triggerExport(datasetId: number, format: "coco" | "yolo" | "voc") {
    const url = datasets.exportUrl(datasetId, format);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dataset-${datasetId}-${format}.zip`;
    a.click();
  }

  function datasetMenuItems(dataset: Dataset): CardMenuItem[] {
    return [
      { icon: Upload,    label: "Upload Annotations", onClick: () => router.push(`/datasets/${dataset.id}`) },
      { icon: Wand2,     label: "Auto Annotations",   onClick: () => router.push(`/datasets/${dataset.id}`) },
      { icon: Download,  label: "Export as COCO",     onClick: () => triggerExport(dataset.id, "coco"), dividerBefore: true },
      { icon: Download,  label: "Export as YOLO",     onClick: () => triggerExport(dataset.id, "yolo") },
      { icon: Download,  label: "Export as VOC",      onClick: () => triggerExport(dataset.id, "voc") },
      { icon: UserPlus,  label: "Assignee",            onClick: () => router.push(`/datasets/${dataset.id}`), dividerBefore: true },
      { icon: BarChart2, label: "View Analytics",      onClick: () => router.push(`/datasets/${dataset.id}`) },
      { icon: Trash2,    label: "Delete",              onClick: () => handleDeleteDataset(dataset.id), danger: true, dividerBefore: true },
    ];
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <CreateDatasetModal
            project={project}
            onClose={() => setShowModal(false)}
            onCreated={(d) => {
              setDatasetList([d, ...datasetList]);
              setShowModal(false);
            }}
          />
        )}
        {classModalOpen && (
          <ClassEditorModal
            projectId={project.id}
            editing={editingClass}
            onClose={() => {
              setClassModalOpen(false);
              setEditingClass(null);
            }}
            onSaved={loadClasses}
          />
        )}
      </AnimatePresence>

      <main className="flex-grow p-6 z-10">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/projects')} className="p-2 hover:bg-white/80 rounded-xl transition-colors border border-transparent hover:border-stone-200">
                <ArrowLeft className="w-5 h-5 text-stone-600" />
              </button>
              <div className="h-6 w-[1px] bg-stone-200" />
              <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest">
                <Link href="/projects" className="hover:text-stone-600 transition-colors">
                  Projects
                </Link>
                <span>/</span>
                <span className="text-stone-900">{project.name}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
              <button
                type="button"
                onClick={() => void handleShareToDataverse()}
                disabled={sharing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
                Share to Dataverse
              </button>
              {project.cvat_project_id && (
                <a
                  href={`${CVAT_PUBLIC_URL}/projects/${project.cvat_project_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:scale-105 active:scale-95"
                >
                  <Layout className="w-4 h-4" />
                  CVAT Project
                </a>
              )}
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:scale-105 active:scale-95"
              >
                <Settings className="w-5 h-5 text-stone-600" />
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:scale-105 hover:bg-orange-200 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Dataset
              </button>
          </div>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-500/15 shrink-0">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-stone-900 leading-tight">Class management</h2>
                <p className="text-xs text-stone-500 mt-0.5 leading-snug line-clamp-1 sm:line-clamp-2">
                  Shared across datasets in this project; used in the editor and exports.
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingClass(null);
                setClassModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-dashed border-stone-300 bg-stone-50/80 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add class
            </button>

            {classList.length === 0 ? (
              <span className="text-xs text-stone-400">
                No classes yet — add one for consistent labels when annotating.
              </span>
            ) : (
              classList.map((c) => (
                <div
                  key={c.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-white py-1 pl-2 pr-1 shadow-sm"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5"
                    style={{ backgroundColor: c.color }}
                    title={c.color}
                  />
                  <span className="max-w-[10rem] truncate text-xs font-semibold text-stone-800">
                    {c.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1 py-0.5 text-xs font-bold tabular-nums ${
                      c.annotation_count > 0 ? "bg-stone-100 text-stone-600" : "text-stone-300"
                    }`}
                    title="Annotations using this class"
                  >
                    {c.annotation_count}
                  </span>
                  <span className="inline-flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClass(c);
                        setClassModalOpen(true);
                      }}
                      className="rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ok = window.confirm(
                          `Delete class “${c.name}”? This removes the class and all annotations that use it.`,
                        );
                        if (!ok) return;
                        void (async () => {
                          try {
                            await annotationClasses.delete(c.id);
                            await loadClasses();
                          } catch (err) {
                            window.alert(
                              err instanceof Error ? err.message : "Could not delete class",
                            );
                          }
                        })();
                      }}
                      className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.section>

        <h2 id="project-datasets" className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Datasets</h2>

        <div
          className="
            grid gap-4
            grid-cols-1
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            2xl:grid-cols-5
          "
        >
           {datasetList.map((dataset, i) => {
              const status = datasetStatus(dataset);
              return (
                <motion.div
                  key={dataset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/datasets/${dataset.id}`)}
                  className="group flex aspect-[1:1] w-full cursor-pointer flex-col rounded-3xl border border-stone-200 bg-white p-2 text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-xl hover:shadow-orange-50 active:scale-[0.99]"
                >
                  <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-stone-50">
                    {dataset.thumbnail ? (
                      <img src={resolveMediaUrl(dataset.thumbnail)} alt={dataset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-12 h-12 text-stone-300" /></div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px] font-bold text-stone-900 shadow-sm flex items-center gap-1.5 border border-white/40">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
                    </div>
                  </div>
                  <div className="shrink-0 px-3 pt-2 pb-1">
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate text-base">{dataset.name}</h3>
                      <div className="flex shrink-0 items-center gap-1">
                        {dataset.cvat_task_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`${CVAT_PUBLIC_URL}/tasks/${dataset.cvat_task_id}`, "_blank", "noopener,noreferrer");
                            }}
                            className="p-1 bg-stone-50 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Annotate in CVAT"
                          >
                            <Layout className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <CardMenu items={datasetMenuItems(dataset)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      <div className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /><span className="text-stone-900">{dataset.media_count}</span></div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /><span className="text-stone-900">v{dataset.version}</span></div>
                    </div>
                  </div>
                </motion.div>
              );
           })}
           
           <motion.div
              onClick={() => setShowModal(true)}
              className="aspect-[1:1] rounded-3xl border-2 border-dashed border-stone-200 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-stone-50 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-50 transition-all">
                <Plus className="w-6 h-6 text-stone-300 group-hover:text-orange-500" />
              </div>
              <p className="font-bold text-stone-900 text-sm">Add New Dataset</p>
            </motion.div>
        </div>
      </main>
    </div>
  );
}
