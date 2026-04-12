"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  Plus,
  Search,
  Filter,
  Download,
  Tag,
  Image as ImageIcon,
  Grid,
  List,
  MoreVertical,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { datasets, projects, type Dataset, type Project } from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  Ready: "bg-green-500",
  Annotating: "bg-[#6735E0] animate-pulse",
  Draft: "bg-stone-300",
};

function datasetStatus(d: Dataset): "Ready" | "Annotating" | "Draft" {
  if (d.media_count === 0) return "Draft";
  return "Ready";
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-2 animate-pulse">
      <div className="aspect-[4/3] rounded-2xl bg-stone-100 mb-4" />
      <div className="px-4 pb-4 space-y-2">
        <div className="h-4 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    </div>
  );
}

interface CreateDatasetModalProps {
  projectList: Project[];
  defaultProjectId: number | null;
  onClose: () => void;
  onCreated: (d: Dataset) => void;
}

function CreateDatasetModal({
  projectList,
  defaultProjectId,
  onClose,
  onCreated,
}: CreateDatasetModalProps) {
  const initialProject =
    defaultProjectId != null && projectList.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : projectList[0]?.id ?? "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<number | "">(initialProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Select a project.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await datasets.create({
        project: projectId as number,
        name,
        description,
      });
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create dataset");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md mx-4 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900">Create Dataset</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              required
            >
              {projectList.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Dataset Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Safety-PPE-v3"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the dataset..."
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
            />
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
              disabled={saving || !name || !projectId}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Dataset"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function DatasetsPageClient() {
  const searchParams = useSearchParams();
  const projectParam = searchParams.get("project");
  const filterProjectId =
    projectParam != null && projectParam !== "" && !Number.isNaN(Number(projectParam))
      ? Number(projectParam)
      : null;

  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const activeProject =
    filterProjectId != null ? projectList.find((p) => p.id === filterProjectId) : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [dsRes, projRes] = await Promise.allSettled([
        datasets.list(filterProjectId ?? undefined),
        projects.list(),
      ]);
      if (cancelled) return;
      if (dsRes.status === "fulfilled") setDatasetList(dsRes.value.results);
      if (projRes.status === "fulfilled") setProjectList(projRes.value.results);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterProjectId]);

  const filtered = datasetList.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreated = (d: Dataset) => {
    setDatasetList((prev) => {
      if (filterProjectId != null && d.project !== filterProjectId) return prev;
      return [d, ...prev];
    });
    setShowModal(false);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <CreateDatasetModal
            projectList={projectList}
            defaultProjectId={filterProjectId}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      <main className="flex-grow p-8 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">
              <Link href="/overview" className="hover:text-orange-600 transition-colors">
                Workspace
              </Link>
              <span>/</span>
              <Link href="/projects" className="hover:text-orange-600 transition-colors">
                Projects
              </Link>
              {activeProject && (
                <>
                  <span>/</span>
                  <span className="text-stone-900 max-w-[200px] truncate" title={activeProject.name}>
                    {activeProject.name}
                  </span>
                </>
              )}
              <span>/</span>
              <span className="text-stone-900">Datasets</span>
            </div>
            <h1 className="text-4xl font-bold text-stone-900 tracking-tight">Dataset Library</h1>
            {activeProject && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-xs font-bold text-orange-800">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {activeProject.name}
                </span>
                <Link
                  href="/datasets"
                  className="text-xs font-bold text-stone-500 hover:text-orange-600 underline underline-offset-2"
                >
                  Show all datasets
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-600 hover:bg-stone-50 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export All</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Dataset</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-stone-200 mb-8 sticky top-4 z-30">
          <div className="flex items-center gap-1 p-1">
            <button
              type="button"
              className="px-4 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-stone-500 hover:bg-stone-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets..."
                className="pl-9 pr-4 py-1.5 bg-transparent border-none text-xs font-medium focus:outline-none w-48"
              />
            </div>
            <div className="w-px h-4 bg-stone-200" />
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-stone-500 hover:text-stone-900 text-xs font-bold transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 rounded-3xl border border-dashed border-stone-200 bg-white/80">
              <p className="text-stone-600 font-medium mb-2">
                {filterProjectId != null
                  ? "No datasets in this project yet."
                  : "No datasets yet."}
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-orange-500 font-bold text-sm hover:underline"
              >
                Create a dataset
              </button>
            </div>
          ) : (
            filtered.map((dataset, i) => {
              const status = datasetStatus(dataset);
              return (
                <Link key={dataset.id} href={`/datasets/${dataset.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    whileHover={{ y: -8 }}
                    className="bg-white rounded-3xl border border-stone-200 p-2 group cursor-pointer shadow-sm hover:shadow-2xl hover:border-orange-500/20 transition-all duration-300 relative"
                  >
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 mb-4">
                      {dataset.thumbnail ? (
                        <img
                          src={dataset.thumbnail}
                          alt={dataset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-stone-300" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="p-3 bg-white text-stone-900 rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-xl">
                          <Download className="w-5 h-5" />
                        </span>
                        <span className="p-3 bg-white text-stone-900 rounded-2xl hover:bg-[#6735E0] hover:text-white transition-all shadow-xl">
                          <Tag className="w-5 h-5" />
                        </span>
                      </div>

                      <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px] font-bold text-stone-900 shadow-sm flex items-center gap-1.5 border border-white/40">
                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                        {status}
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate pr-2">
                          {dataset.name}
                        </h3>
                        <MoreVertical className="w-4 h-4 text-stone-400 group-hover:text-stone-900 shrink-0" />
                      </div>

                      <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3" />
                          <span className="text-stone-900">
                            {dataset.media_count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3" />
                          <span className="text-stone-900">v{dataset.version}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-stone-50 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span className="text-[10px] font-medium text-stone-500">
                            {new Date(dataset.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        {status === "Ready" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>

                    <div className="absolute inset-0 border-2 border-orange-500 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                  </motion.div>
                </Link>
              );
            })
          )}

          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => setShowModal(true)}
              className="rounded-3xl border-2 border-dashed border-stone-200 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-stone-50 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-50 transition-all">
                <Plus className="w-8 h-8 text-stone-300 group-hover:text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Create New Dataset</p>
                <p className="text-xs text-stone-500 mt-1 max-w-[150px]">
                  Upload images or import from cloud storage
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
