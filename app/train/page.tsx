"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  Play, Square, Activity, ChevronRight,
  Target, BarChart3, FlaskConical, Settings2, X, Loader2,
} from "lucide-react";
import {
  training, datasets, projects,
  type TrainingJob, type RunMetric, type Dataset, type Project, type ModelArchitecture,
} from "@/lib/api";

const STATUS_COLOR: Record<TrainingJob['status'], string> = {
  pending: 'text-stone-400',
  queued: 'text-blue-500',
  running: 'text-orange-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  cancelled: 'text-stone-400',
};

const EMPTY_LOSS_PLACEHOLDER = [12, 18, 24, 22, 30, 28, 35, 26, 20, 16, 14, 18, 22, 19, 25, 29, 24, 18, 15, 12];

function SkeletonJob() {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 animate-pulse">
      <div className="h-5 bg-stone-100 rounded w-1/2 mb-3" />
      <div className="h-3 bg-stone-100 rounded w-1/3" />
    </div>
  );
}

interface NewJobModalProps {
  projectList: Project[];
  datasetList: Dataset[];
  architectures: ModelArchitecture[];
  onClose: () => void;
  onCreated: (job: TrainingJob) => void;
}

function NewJobModal({ projectList, datasetList, architectures, onClose, onCreated }: NewJobModalProps) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<number | "">(projectList[0]?.id ?? "");
  const [datasetId, setDatasetId] = useState<number | "">(datasetList[0]?.id ?? "");
  const [archId, setArchId] = useState<number | "">(architectures[0]?.id ?? "");
  const [epochs, setEpochs] = useState("100");
  const [lr, setLr] = useState("0.001");
  const [batchSize, setBatchSize] = useState("32");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) { setError("Select a project."); return; }
    setSaving(true);
    setError("");
    try {
      const job = await training.createJob({
        project: projectId as number,
        name,
        dataset: datasetId ? (datasetId as number) : undefined,
        architecture: archId ? (archId as number) : undefined,
        hyperparams: { epochs: parseInt(epochs), lr: parseFloat(lr), batch_size: parseInt(batchSize) },
      });
      await training.startJob(job.id);
      onCreated({ ...job, status: 'queued' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-950/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md mx-4 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900">New Experiment</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Experiment Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. YOLOv8-PPE-run1"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Project</label>
            <select value={projectId} onChange={e => setProjectId(Number(e.target.value))} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Dataset</label>
            <select value={datasetId} onChange={e => setDatasetId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              <option value="">None</option>
              {datasetList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Architecture</label>
            <select value={archId} onChange={e => setArchId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              <option value="">None</option>
              {architectures.map(a => <option key={a.id} value={a.id}>{a.name} ({a.backbone})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Epochs</label>
              <input type="number" value={epochs} onChange={e => setEpochs(e.target.value)} min="1"
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">LR</label>
              <input type="number" value={lr} onChange={e => setLr(e.target.value)} step="0.0001"
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Batch</label>
              <input type="number" value={batchSize} onChange={e => setBatchSize(e.target.value)} min="1"
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name || !projectId}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Starting…</> : <><Play className="w-4 h-4 fill-current" />Start Training</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TrainPage() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);
  const [metrics, setMetrics] = useState<RunMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [datasetList, setDatasetList] = useState<Dataset[]>([]);
  const [architectures, setArchitectures] = useState<ModelArchitecture[]>([]);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      const [jobsRes, projRes, dsRes, archRes] = await Promise.allSettled([
        training.listJobs(),
        projects.list(),
        datasets.list(),
        training.listArchitectures(),
      ]);
      if (jobsRes.status === 'fulfilled') {
        const list = jobsRes.value.results;
        setJobs(list);
        const running = list.find(j => j.status === 'running');
        setSelectedJob(running ?? list[0] ?? null);
      }
      if (projRes.status === 'fulfilled') setProjectList(projRes.value.results);
      if (dsRes.status === 'fulfilled') setDatasetList(dsRes.value.results);
      if (archRes.status === 'fulfilled') setArchitectures(archRes.value.results);
      setLoading(false);
    }
    load();
  }, []);

  // Poll metrics every 2 s for the selected running job
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJob || selectedJob.status !== 'running') return;

    const fetchMetrics = async () => {
      try {
        const exps = await training.getExperiments(selectedJob.id);
        if (exps.length > 0) {
          const m = await training.getMetrics(exps[0].id);
          setMetrics(m);
        }
        // Refresh job status
        const updated = await training.getJob(selectedJob.id);
        setSelectedJob(updated);
        setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
      } catch {}
    };

    fetchMetrics();
    pollRef.current = setInterval(fetchMetrics, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedJob?.id, selectedJob?.status]);

  const handleStop = async (jobId: number) => {
    setStoppingId(jobId);
    try {
      const updated = await training.stopJob(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
      if (selectedJob?.id === jobId) setSelectedJob(updated);
    } catch {}
    setStoppingId(null);
  };

  const handleJobCreated = (job: TrainingJob) => {
    setJobs(prev => [job, ...prev]);
    setSelectedJob(job);
    setShowModal(false);
  };

  const latestMetric = metrics[metrics.length - 1];
  const lossHistory = metrics.slice(-20).map(m => m.loss ?? 0);
  const maxLoss = Math.max(...lossHistory, 0.001);

  const hyperparams = selectedJob?.hyperparams ?? {};

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <NewJobModal
            projectList={projectList}
            datasetList={datasetList}
            architectures={architectures}
            onClose={() => setShowModal(false)}
            onCreated={handleJobCreated}
          />
        )}
      </AnimatePresence>

      <main className="flex-grow p-8 z-10">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-stone-900 md:text-3xl">Active Training</h1>
            <p className="max-w-xl text-base leading-6 text-stone-500">
              Monitor experiments, review training health, and export successful models.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4">
              <div className={`w-2 h-2 rounded-full ${jobs.some(j => j.status === 'running') ? 'bg-orange-500 animate-ping' : 'bg-stone-300'}`} />
              <span className="text-sm font-bold text-stone-900">
                {jobs.filter(j => j.status === 'running').length} Running
              </span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:scale-105 hover:bg-orange-200"
            >
              <FlaskConical className="w-4 h-4 text-orange-500" />
              <span>New Experiment</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Monitor */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100 shadow-2xl shadow-orange-100/70 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/40 rounded-full blur-[120px] -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200/30 rounded-full blur-[100px] -ml-32 -mb-32" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">
                      {selectedJob ? selectedJob.name : 'No job selected'}
                    </h2>
                    <p className="text-stone-500 text-sm">
                      {selectedJob ? (
                        <>Status: <span className={`font-mono ${STATUS_COLOR[selectedJob.status]}`}>{selectedJob.status}</span></>
                      ) : (
                        'Start a new experiment to begin training'
                      )}
                    </p>
                  </div>
                  {selectedJob && (
                    <div className="flex gap-2">
                      {selectedJob.status === 'running' && (
                        <button
                          onClick={() => handleStop(selectedJob.id)}
                          disabled={stoppingId === selectedJob.id}
                          className="p-3 bg-white text-stone-500 border border-orange-100 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {stoppingId === selectedJob.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Metrics chart */}
                <div className="h-48 flex items-end gap-1 mb-6 overflow-hidden">
                  {lossHistory.length > 0 ? (
                    lossHistory.map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${(v / maxLoss) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 min-w-[4px] bg-gradient-to-t from-orange-600/20 to-orange-500 rounded-t-sm"
                      />
                    ))
                  ) : (
                    EMPTY_LOSS_PLACEHOLDER.map((height, i) => (
                      <div key={i} className="flex-1 min-w-[4px] bg-orange-300 rounded-t-sm" style={{ height: `${height}%` }} />
                    ))
                  )}
                </div>

                <div className="flex justify-between items-center text-stone-500 text-xs font-bold uppercase tracking-widest border-t border-orange-100 pt-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span>Loss: <span className="text-stone-900 font-mono">
                      {latestMetric?.loss != null ? latestMetric.loss.toFixed(4) : '—'}
                    </span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#6735E0]" />
                    <span>mAP@.5: <span className="text-stone-900 font-mono">
                      {latestMetric?.map50 != null ? latestMetric.map50.toFixed(3) : '—'}
                    </span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span>Epoch: <span className="text-stone-900 font-mono">
                      {latestMetric?.epoch ?? '—'}
                    </span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Jobs list */}
            <div>
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">All Jobs</h3>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonJob key={i} />)
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">No training jobs yet.</div>
                ) : (
                  jobs.map(job => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedJob(job); setMetrics([]); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedJob(job); setMetrics([]); } }}
                      className={`w-full text-left bg-white rounded-2xl border p-5 transition-all hover:shadow-md cursor-pointer ${selectedJob?.id === job.id ? 'border-orange-500/50 shadow-md' : 'border-stone-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${job.status === 'running' ? 'bg-orange-500 animate-pulse' : job.status === 'completed' ? 'bg-green-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-stone-300'}`} />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{job.name}</p>
                            <p className="text-[10px] text-stone-400 font-medium uppercase mt-0.5">{job.status} · {new Date(job.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.status === 'running' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleStop(job.id); }}
                              disabled={stoppingId === job.id}
                              className="p-1.5 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              {stoppingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-500" />
                  Hyperparameters
                </h3>
              </div>
              <div className="space-y-4">
                {Object.keys(hyperparams).length > 0 ? (
                  Object.entries(hyperparams).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                      <span className="text-xs font-medium text-stone-500 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-stone-900">{String(v)}</span>
                    </div>
                  ))
                ) : (
                  [
                    { label: "Learning Rate", value: "—" },
                    { label: "Batch Size", value: "—" },
                    { label: "Epochs", value: "—" },
                  ].map((p, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0">
                      <span className="text-xs font-medium text-stone-500">{p.label}</span>
                      <span className="text-xs font-bold text-stone-900">{p.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-8 bg-orange-50 rounded-3xl border border-orange-100 text-stone-900 relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">Export Result</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                  Your model can be exported to OpenVINO, ONNX, or CoreML once training completes.
                </p>
                <button className="px-6 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl shadow-orange-100/60 hover:bg-orange-200 hover:scale-105 active:scale-95 transition-all">
                  <span>Choose Export Format</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
