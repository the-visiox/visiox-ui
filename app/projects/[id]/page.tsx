"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, ArrowLeft, Database, Layout, 
  Settings, Clock, CheckCircle2,
  Image as ImageIcon, Loader2, X
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { datasets, projects, type Dataset, type Project } from "@/lib/api";

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

function CreateDatasetModal({ project, onClose, onCreated }: { project: Project, onClose: () => void, onCreated: (d: Dataset) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await datasets.create({ project: project.id, name, description });
      onCreated(created);
    } catch (err: any) {
      setError(err.message || "Failed to create dataset");
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
          <h2 className="text-xl font-bold text-stone-900">New Dataset</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <p className="text-xs text-stone-500 mb-6">Creating in project <span className="text-stone-900 font-bold">{project.name}</span></p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Dataset Name</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Workshop-Safety-Part-A"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Optional description..."
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all">Cancel</button>
            <button
              type="submit" disabled={saving || !name}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Dataset"}
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const projectId = parseInt(id as string);
        const [found, dsRes] = await Promise.all([
          projects.get(projectId),
          datasets.list(projectId),
        ]);
        setProject(found);
        setDatasetList(dsRes.results);
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

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && <CreateDatasetModal project={project} onClose={() => setShowModal(false)} onCreated={(d) => { setDatasetList([d, ...datasetList]); setShowModal(false); }} />}
      </AnimatePresence>

      <main className="flex-grow p-8 z-10">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => router.push('/projects')} className="p-2 hover:bg-white/80 rounded-xl transition-colors border border-transparent hover:border-stone-200">
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <div className="h-6 w-[1px] bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest">
              <span>Projects</span><span>/</span><span className="text-stone-900">{project.name}</span>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">{project.name}</h1>
              <p className="text-stone-500 text-sm max-w-2xl">{project.description || "No description provided for this project."}</p>
            </div>
            <div className="flex gap-3">
              {project.cvat_project_id && (
                <a 
                  href={`${CVAT_PUBLIC_URL}/projects/${project.cvat_project_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-50 transition-all"
                >
                  <Layout className="w-4 h-4" />
                  <span>CVAT Project</span>
                </a>
              )}
              <button className="p-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all"><Settings className="w-5 h-5 text-stone-600" /></button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Dataset</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {datasetList.map((dataset, i) => {
              const status = datasetStatus(dataset);
              return (
                <motion.div
                  key={dataset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/datasets/${dataset.id}`)}
                  className="bg-white rounded-3xl border border-stone-200 p-2 group cursor-pointer shadow-sm hover:shadow-xl hover:border-orange-500/20 transition-all duration-300 relative"
                >
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-50 mb-4">
                    {dataset.thumbnail ? (
                      <img src={dataset.thumbnail} alt={dataset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30"><ImageIcon className="w-12 h-12 text-stone-300" /></div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[9px] font-bold text-stone-900 shadow-sm flex items-center gap-1.5 border border-white/40">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate pr-2">{dataset.name}</h3>
                      {dataset.cvat_task_id && (
                        <a 
                          href={`${CVAT_PUBLIC_URL}/tasks/${dataset.cvat_task_id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-stone-50 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                          title="Annotate in CVAT"
                        >
                           <Layout className="w-4 h-4" />
                        </a>
                      )}
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
              className="rounded-3xl border-2 border-dashed border-stone-200 p-8 flex flex-col items-center justify-center text-center gap-4 hover:bg-stone-50 transition-all cursor-pointer group"
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
