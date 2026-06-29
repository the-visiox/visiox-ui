"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  Play,
  Square,
  Activity,
  ChevronRight,
  Target,
  BarChart3,
  FlaskConical,
  Settings2,
  X,
  Loader2,
  CheckCircle2,
  Database,
  Download,
  ImageIcon,
  Layers3,
  AlertCircle,
  Search,
  RefreshCw,
  Grid3X3,
  Cpu,
  PackageCheck,
  Rocket,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  training,
  deployments,
  datasets,
  projects,
  type TrainingJob,
  type RunMetric,
  type Dataset,
  type Project,
  type ModelArchitecture,
  type ModelRegistry,
} from "@/lib/api";

const STATUS_COLOR: Record<TrainingJob["status"], string> = {
  pending: "text-stone-400",
  queued: "text-blue-500",
  running: "text-orange-500",
  completed: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-stone-400",
};

const EMPTY_LOSS_PLACEHOLDER = [12, 18, 24, 22, 30, 28, 35, 26, 20, 16, 14, 18, 22, 19, 25, 29, 24, 18, 15, 12];
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
type JobFilter = "all" | "active" | "completed" | "failed";

function SkeletonJob() {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 animate-pulse motion-reduce:animate-none">
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
  initialProjectId?: number;
  initialDatasetId?: number;
}

function NewJobModal({
  projectList,
  datasetList,
  architectures,
  onClose,
  onCreated,
  initialProjectId,
  initialDatasetId,
}: NewJobModalProps) {
  const initialDataset = datasetList.find((dataset) => dataset.id === initialDatasetId);
  const initialProject = initialProjectId ?? initialDataset?.project ?? projectList[0]?.id;
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<number | "">(initialProject ?? "");
  const [datasetId, setDatasetId] = useState<number | "">(
    initialDatasetId ?? datasetList.find((dataset) => dataset.project === initialProject)?.id ?? "",
  );
  const [archId, setArchId] = useState<number | "">(
    architectures.find(
      (architecture) =>
        architecture.task_type === projectList.find((project) => project.id === initialProject)?.task_type,
    )?.id ?? "",
  );
  const [epochs, setEpochs] = useState("100");
  const [lr, setLr] = useState("0.001");
  const [batchSize, setBatchSize] = useState("32");
  const [imageSize, setImageSize] = useState("640");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const availableDatasets = datasetList
    .filter((dataset) => dataset.project === projectId)
    .toSorted((a, b) => Number(b.is_train_ready) - Number(a.is_train_ready) || b.version - a.version);
  const selectedDataset = datasetList.find((dataset) => dataset.id === datasetId);
  const selectedProject = projectList.find((project) => project.id === projectId);
  const availableArchitectures = architectures.filter(
    (architecture) => architecture.task_type === selectedProject?.task_type,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !datasetId || !archId) {
      setError("Select a project, dataset version, and model architecture.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const job = await training.createJob({
        project: projectId as number,
        name,
        dataset: datasetId ? (datasetId as number) : undefined,
        architecture: archId ? (archId as number) : undefined,
        hyperparams: {
          epochs: parseInt(epochs),
          lr: parseFloat(lr),
          batch: parseInt(batchSize),
          imgsz: parseInt(imageSize),
          device: 0,
        },
      });
      const startedJob = await training.startJob(job.id);
      onCreated(startedJob);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setSaving(false);
    }
  };

  return (
    <div
      className={["fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-orange-950/20", "backdrop-blur-sm"].join(" ")}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-training-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mx-4 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="new-training-title" className="text-xl font-bold text-stone-900">New Training Run</h2>
          <button type="button" onClick={onClose} aria-label="Close training form" className="rounded-xl p-2 transition-colors hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500">
            <X aria-hidden="true" className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div role="alert" aria-live="polite"
            className={["mb-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm", "rounded-xl"].join(" ")}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="training-name"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Experiment Name
            </label>
            <input
              id="training-name"
              name="training-name"
              autoComplete="off"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: YOLOv8 PPE Run 1…"
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            />
          </div>
          <div>
            <label htmlFor="training-project"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Project
            </label>
            <select
              id="training-project"
              name="training-project"
              value={projectId}
              onChange={(e) => {
                const nextProject = Number(e.target.value);
                const nextProjectRecord = projectList.find((project) => project.id === nextProject);
                setProjectId(nextProject);
                setDatasetId(datasetList.find((dataset) => dataset.project === nextProject)?.id ?? "");
                setArchId(
                  architectures.find((architecture) => architecture.task_type === nextProjectRecord?.task_type)?.id ?? "",
                );
              }}
              required
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-dataset"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Dataset
            </label>
            <select
              id="training-dataset"
              name="training-dataset"
              value={datasetId}
              onChange={(e) => setDatasetId(Number(e.target.value))}
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              <option value="">Select a dataset version</option>
              {availableDatasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.is_train_ready ? "✓ Ready" : String(d.labeling_progress ?? 0) + "% labeled"} · {d.name} · v{d.version}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-architecture"
              className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
            >
              Architecture
            </label>
            <select
              id="training-architecture"
              name="training-architecture"
              value={archId}
              onChange={(e) => setArchId(Number(e.target.value))}
              className={[
                "w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                "focus-visible:ring-2 focus-visible:ring-orange-500/30",
              ].join(" ")}
            >
              <option value="">Select an architecture</option>
              {availableArchitectures.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.backbone})
                </option>
              ))}
            </select>
          </div>
          {selectedDataset ? (
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Images</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{selectedDataset.image_count ?? selectedDataset.media_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Annotated</p>
                <p className="mt-1 text-lg font-bold text-stone-900">{selectedDataset.annotated_count ?? "—"}</p>
              </div>
              <div className={["flex items-center justify-end gap-2 text-xs font-bold", selectedDataset.is_train_ready ? "text-emerald-600" : "text-amber-600"].join(" ")}>
                {selectedDataset.is_train_ready ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}
                {selectedDataset.is_train_ready ? "Ready to train" : String(selectedDataset.labeling_progress ?? 0) + "% labeled"}
              </div>
            </div>
          ) : null}
          {selectedDataset && !selectedDataset.is_train_ready ? (
            <p className="-mt-2 text-xs leading-5 text-amber-700">
              {selectedDataset.is_label_complete
                ? "This dataset is fully labeled. Verify it from the Project page before training."
                : (selectedDataset.annotated_count ?? 0) > 0
                  ? "Verify this dataset from the Project page. Unlabeled images will be treated as background."
                  : "Add labels to at least 1 image, then verify this dataset from the Project page."}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="training-epochs"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                Epochs
              </label>
              <input
                id="training-epochs"
                name="training-epochs"
                type="number"
                inputMode="numeric"
                value={epochs}
                onChange={(e) => setEpochs(e.target.value)}
                min="1"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
            <div>
              <label htmlFor="training-image-size" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Image size
              </label>
              <input
                id="training-image-size"
                name="training-image-size"
                type="number"
                inputMode="numeric"
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                min="32"
                step="32"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm focus-visible:ring-2 focus-visible:ring-orange-500/30"
              />
            </div>
            <div>
              <label htmlFor="training-learning-rate"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                LR
              </label>
              <input
                id="training-learning-rate"
                name="training-learning-rate"
                type="number"
                inputMode="decimal"
                value={lr}
                onChange={(e) => setLr(e.target.value)}
                step="0.0001"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
            <div>
              <label htmlFor="training-batch-size"
                className={["block text-[10px] font-bold text-stone-400 uppercase tracking-widest", "mb-2"].join(" ")}
              >
                Batch
              </label>
              <input
                id="training-batch-size"
                name="training-batch-size"
                type="number"
                inputMode="numeric"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min="1"
                className={[
                  "w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm",
                  "focus-visible:ring-2 focus-visible:ring-orange-500/30",
                ].join(" ")}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={[
                "flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200",
                "transition-colors focus-visible:ring-2 focus-visible:ring-stone-400",
              ].join(" ")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !projectId || !datasetId || !archId || !selectedDataset?.is_train_ready}
              className={[
                "flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg",
                "shadow-orange-500/20 transition-[transform,background-color] hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50",
                "flex items-center justify-center gap-2",
              ].join(" ")}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Training
                </>
              )}
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
  const [registeredModels, setRegisteredModels] = useState<ModelRegistry[]>([]);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [jobActionId, setJobActionId] = useState<number | null>(null);
  const [jobFilter, setJobFilter] = useState<JobFilter>("all");
  const [jobQuery, setJobQuery] = useState("");
  const [pageError, setPageError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [trainingTarget, setTrainingTarget] = useState<{ projectId?: number; datasetId?: number }>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deepLinkHandledRef = useRef(false);

  const loadData = useCallback(async (background = false) => {
      if (background) setRefreshing(true);
      setPageError("");
      const [jobsRes, projRes, dsRes, archRes, registryRes] = await Promise.allSettled([
        training.listJobs(),
        projects.list(),
        datasets.list(),
        training.listArchitectures(),
        deployments.listRegistry(),
      ]);
      if (jobsRes.status === "fulfilled") {
        const list = jobsRes.value.results;
        setJobs(list);
        setSelectedJob((current) => {
          const refreshed = list.find((job) => job.id === current?.id);
          const active = list.find((job) => job.status === "running" || job.status === "queued");
          return refreshed ?? active ?? list[0] ?? null;
        });
      } else {
        setPageError("Couldn’t load training jobs. Check the API connection, then try again.");
      }
      if (projRes.status === "fulfilled") setProjectList(projRes.value.results);
      if (dsRes.status === "fulfilled") setDatasetList(dsRes.value.results);
      if (archRes.status === "fulfilled") setArchitectures(archRes.value.results);
      if (registryRes.status === "fulfilled") setRegisteredModels(registryRes.value.results);
      if (!deepLinkHandledRef.current) {
        deepLinkHandledRef.current = true;
        const params = new URLSearchParams(window.location.search);
        const projectParam = params.get("project");
        const datasetParam = params.get("dataset");
        const projectId = projectParam ? Number(projectParam) : undefined;
        const datasetId = datasetParam ? Number(datasetParam) : undefined;
        if (Number.isInteger(projectId) || Number.isInteger(datasetId)) {
          setTrainingTarget({
            projectId: Number.isInteger(projectId) ? projectId : undefined,
            datasetId: Number.isInteger(datasetId) ? datasetId : undefined,
          });
          setShowModal(true);
        }
      }
      setLoading(false);
      setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  // Poll metrics every 2 s for the selected running job
  const selectedJobId = selectedJob?.id;
  const selectedJobStatus = selectedJob?.status;

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJobId) return;

    const fetchMetrics = async () => {
      try {
        const exps = await training.getExperiments(selectedJobId);
        if (exps.length > 0) {
          const m = await training.getMetrics(exps[0].id);
          setMetrics(m);
        }
        // Refresh job status
        const updated = await training.getJob(selectedJobId);
        setSelectedJob(updated);
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      } catch {
        setPageError("Live metrics are temporarily unavailable. VisioX will retry automatically.");
      }
    };

    fetchMetrics();
    if (["queued", "running"].includes(selectedJobStatus ?? "")) {
      pollRef.current = setInterval(fetchMetrics, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedJobId, selectedJobStatus]);

  const handleStop = async (jobId: number) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!window.confirm("Cancel “" + (job?.name ?? "this training run") + "”? The current GPU work will stop.")) return;
    setStoppingId(jobId);
    setPageError("");
    try {
      const updated = await training.stopJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      if (selectedJob?.id === jobId) setSelectedJob(updated);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t cancel this training run. Try again.");
    }
    setStoppingId(null);
  };

  const handleRetry = async (job: TrainingJob) => {
    setJobActionId(job.id);
    setPageError("");
    try {
      const updated = await training.startJob(job.id);
      setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedJob(updated);
      setMetrics([]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t retry this training run.");
    } finally {
      setJobActionId(null);
    }
  };

  const handleDelete = async (job: TrainingJob) => {
    if (!window.confirm(`Delete “${job.name}”? Metrics for this run will also be removed.`)) return;
    setJobActionId(job.id);
    setPageError("");
    try {
      await training.deleteJob(job.id);
      setJobs((current) => current.filter((item) => item.id !== job.id));
      if (selectedJob?.id === job.id) {
        const remaining = jobs.filter((item) => item.id !== job.id);
        setSelectedJob(remaining[0] ?? null);
        setMetrics([]);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn’t delete this training run.");
    } finally {
      setJobActionId(null);
    }
  };

  const handleJobCreated = (job: TrainingJob) => {
    setJobs((prev) => [job, ...prev]);
    setSelectedJob(job);
    setShowModal(false);
  };

  const latestMetric = metrics[metrics.length - 1];
  const lossHistory = metrics.slice(-20).map((m) => m.loss ?? 0);
  const maxLoss = Math.max(...lossHistory, 0.001);

  const hyperparams = selectedJob?.hyperparams ?? {};
  const totalEpochs = Number(latestMetric?.extra?.total_epochs ?? hyperparams.epochs ?? 0);
  const progress = totalEpochs > 0 ? Math.min(100, ((latestMetric?.epoch ?? 0) / totalEpochs) * 100) : 0;
  const selectedDataset = datasetList.find((dataset) => dataset.id === selectedJob?.dataset);
  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !query ||
        job.name.toLowerCase().includes(query) ||
        Boolean(job.architecture_name?.toLowerCase().includes(query));
      const matchesStatus =
        jobFilter === "all" ||
        (jobFilter === "active" && (job.status === "queued" || job.status === "running")) ||
        (jobFilter === "completed" && job.status === "completed") ||
        (jobFilter === "failed" && (job.status === "failed" || job.status === "cancelled"));
      return matchesQuery && matchesStatus;
    });
  }, [jobFilter, jobQuery, jobs]);

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
            initialProjectId={trainingTarget.projectId}
            initialDatasetId={trainingTarget.datasetId}
          />
        )}
      </AnimatePresence>

      <main className="z-10 mx-auto w-full max-w-6xl flex-grow p-4 md:p-6">
        <div
          className={[
            "mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5",
            "shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center",
            "md:justify-between",
          ].join(" ")}
        >
          <div>
            <h1 className="mb-1 text-pretty text-2xl font-bold tracking-tight text-stone-900">Training</h1>
            <p className="max-w-xl text-sm leading-6 text-stone-500">
              Create a run and follow its progress.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <div
              className={["flex h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white", "px-4"].join(" ")}
            >
              <div
                className={[
                  "w-2 h-2 rounded-full",
                  jobs.some((j) => j.status === "running") ? "bg-orange-500 animate-ping motion-reduce:animate-none" : "bg-stone-300",
                ].join(" ")}
              />
              <span className="text-sm font-bold text-stone-900">
                {jobs.filter((j) => j.status === "running").length} Running
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              aria-label="Refresh training data"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className={["h-4 w-4", refreshing ? "animate-spin motion-reduce:animate-none" : ""].join(" ")} />
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={[
                "flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200",
                "bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60",
                "transition-colors hover:bg-orange-200 focus-visible:ring-2 focus-visible:ring-orange-500",
              ].join(" ")}
            >
              <FlaskConical className="w-4 h-4 text-orange-500" />
              <span>New Training Run</span>
            </button>
          </div>
        </div>

        {pageError ? (
          <div role="alert" aria-live="polite" className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{pageError}</span>
            </div>
            <button type="button" onClick={() => setPageError("")} aria-label="Dismiss error" className="rounded-md p-1 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="hidden">
          {[
            { label: "Dataset version", value: selectedDataset ? `${selectedDataset.name} v${selectedDataset.version}` : "Not selected", icon: Database },
            { label: "Training images", value: selectedDataset?.media_count ?? "—", icon: ImageIcon },
            { label: "Architecture", value: selectedJob?.architecture_name ?? "—", icon: Layers3 },
            { label: "Progress", value: selectedJob?.status === "completed" ? "100%" : `${Math.round(progress)}%`, icon: Activity },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{item.label}</p>
                <item.icon className="h-4 w-4 text-orange-500" />
              </div>
              <p className="truncate text-base font-bold text-stone-900">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
                <PackageCheck aria-hidden="true" className="h-5 w-5 text-orange-500" />
                Model Registry
              </h2>
              <p className="mt-1 text-sm text-stone-500">Saved model versions ready for evaluation or deployment.</p>
            </div>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <Rocket aria-hidden="true" className="h-4 w-4 text-orange-500" />
              Manage Deployments
            </Link>
          </div>
          {registeredModels.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {registeredModels.slice(0, 4).map((model) => {
                const map50 = typeof model.metrics.map50 === "number" ? model.metrics.map50 : null;
                return (
                  <article key={model.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-stone-900">{model.name}</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          v{model.version} · {model.format}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">
                        Saved
                      </span>
                    </div>
                    <div className="flex items-end justify-between border-t border-stone-200 pt-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">mAP@.5</p>
                        <p className="mt-1 font-mono text-lg font-bold tabular-nums text-stone-900">
                          {map50 == null ? "—" : map50.toFixed(3)}
                        </p>
                      </div>
                      <time className="text-[10px] text-stone-400">{DATE_FORMATTER.format(new Date(model.created_at))}</time>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 py-8 text-center">
              <p className="text-sm font-bold text-stone-700">No trained models yet</p>
              <p className="mt-1 text-xs text-stone-400">Completed training runs are saved here automatically.</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-12 gap-5">
          {/* Main Monitor */}
          <div className="col-span-12 space-y-5">
            <div
              className={[
                "bg-white rounded-3xl p-6 border border-stone-200 shadow-sm",
                "relative overflow-hidden",
              ].join(" ")}
            >
              <div
                className={[
                  "hidden absolute top-0 right-0 w-96 h-96 bg-orange-200/40 rounded-full blur-[120px] -mr-48",
                  "-mt-48",
                ].join(" ")}
              />
              <div
                className={[
                  "hidden absolute bottom-0 left-0 w-64 h-64 bg-amber-200/30 rounded-full blur-[100px] -ml-32",
                  "-mb-32",
                ].join(" ")}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 mb-1">
                      {selectedJob ? selectedJob.name : "No job selected"}
                    </h2>
                    <p className="text-stone-500 text-sm">
                      {selectedJob ? (
                        <>
                          Status:{" "}
                          <span className={`font-mono ${STATUS_COLOR[selectedJob.status]}`}>{selectedJob.status}</span>
                        </>
                      ) : (
                        "Start a new experiment to begin training"
                      )}
                    </p>
                  </div>
                  {selectedJob && (
                    <div className="flex gap-2">
                      {["queued", "running"].includes(selectedJob.status) && (
                        <button
                          type="button"
                          onClick={() => handleStop(selectedJob.id)}
                          disabled={stoppingId === selectedJob.id}
                          aria-label={"Cancel " + selectedJob.name}
                          className={[
                            "p-3 bg-white text-stone-500 border border-orange-100 rounded-2xl hover:text-red-500",
                            "transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50",
                          ].join(" ")}
                        >
                          {stoppingId === selectedJob.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      {selectedJob.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => handleRetry(selectedJob)}
                          disabled={jobActionId === selectedJob.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                        >
                          <RotateCcw aria-hidden="true" className="h-4 w-4" />
                          Retry
                        </button>
                      ) : null}
                      {!["queued", "running"].includes(selectedJob.status) ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedJob)}
                          disabled={jobActionId === selectedJob.id}
                          aria-label={"Delete " + selectedJob.name}
                          className="rounded-xl border border-stone-200 p-2 text-stone-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {selectedJob && ["queued", "running"].includes(selectedJob.status) ? (
                  <div className="mb-7">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-stone-500">
                      <span>{selectedJob.status === "queued" ? "Waiting for GPU agent" : `Epoch ${latestMetric?.epoch ?? 0} of ${totalEpochs || "—"}`}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400"
                        animate={{ width: selectedJob.status === "queued" ? "8%" : `${Math.max(progress, 2)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {selectedJob?.status === "failed" && selectedJob.error_message ? (
                  <div role="alert" className="mb-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold">Training failed</p>
                      <p className="mt-1 break-words text-red-600">{selectedJob.error_message}</p>
                    </div>
                  </div>
                ) : null}

                {/* Metrics chart */}
                <div className="hidden">
                  {lossHistory.length > 0
                    ? lossHistory.map((v, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${(v / maxLoss) * 100}%` }}
                          transition={{ duration: 0.3 }}
                          className={[
                            "flex-1 min-w-[4px] bg-gradient-to-t from-orange-600/20 to-orange-500",
                            "rounded-t-sm",
                          ].join(" ")}
                        />
                      ))
                    : EMPTY_LOSS_PLACEHOLDER.map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 min-w-[4px] bg-orange-300 rounded-t-sm"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                </div>

                <div
                  className={[
                    "grid grid-cols-3 gap-3 border-t border-stone-100 pt-5 text-stone-500 text-xs font-bold",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span>
                      Loss:{" "}
                      <span className="text-stone-900 font-mono">
                        {latestMetric?.loss != null ? latestMetric.loss.toFixed(4) : "—"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#6735E0]" />
                    <span>
                      mAP@.5:{" "}
                      <span className="text-stone-900 font-mono">
                        {latestMetric?.map50 != null ? latestMetric.map50.toFixed(3) : "—"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span>
                      Epoch: <span className="text-stone-900 font-mono">{latestMetric?.epoch ?? "—"}</span>
                    </span>
                  </div>
                </div>
                {latestMetric ? (
                  <div className="hidden">
                    {[
                      ["Precision", latestMetric.extra?.precision],
                      ["Recall", latestMetric.extra?.recall],
                      ["F1 score", latestMetric.f1],
                      ["Validation loss", latestMetric.val_loss],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl border border-orange-100 bg-white/70 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
                        <p className="mt-1 font-mono text-sm font-bold text-stone-900">
                          {typeof value === "number" ? value.toFixed(4) : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Jobs list */}
            <div>
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500">Training Runs</h3>
                  <p className="mt-1 text-xs text-stone-400">{filteredJobs.length} of {jobs.length} runs</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <span className="sr-only">Search training runs</span>
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input type="search" name="training-search" autoComplete="off" value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="Search runs…" className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-orange-500/30 sm:w-52" />
                  </label>
                  <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1" aria-label="Filter training runs">
                    {(["all", "active", "completed", "failed"] as JobFilter[]).map((filter) => (
                      <button type="button" key={filter} onClick={() => setJobFilter(filter)} aria-pressed={jobFilter === filter} className={["rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-orange-500", jobFilter === filter ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"].join(" ")}>
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonJob key={i} />)
                ) : filteredJobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 py-10 text-center">
                    <p className="text-sm font-bold text-stone-700">{jobs.length === 0 ? "No training runs yet" : "No matching runs"}</p>
                    <p className="mt-1 text-xs text-stone-400">{jobs.length === 0 ? "Create your first run to start training." : "Try another search or status filter."}</p>
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedJob(job);
                        setMetrics([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedJob(job);
                          setMetrics([]);
                        }
                      }}
                      className={[
                        "w-full cursor-pointer text-left bg-white rounded-2xl border p-5",
                        "transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-orange-500",
                        selectedJob?.id === job.id ? "border-orange-500/50 shadow-md" : "border-stone-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={[
                              "w-2.5 h-2.5 rounded-full",
                              job.status === "running"
                                ? "bg-orange-500 animate-pulse motion-reduce:animate-none"
                                : job.status === "completed"
                                  ? "bg-green-500"
                                  : job.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-stone-300",
                            ].join(" ")}
                          />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{job.name}</p>
                            <p className="text-[10px] text-stone-400 font-medium uppercase mt-0.5">
                              {job.status} · {DATE_FORMATTER.format(new Date(job.created_at))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(job.status === "running" || job.status === "queued") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStop(job.id);
                              }}
                              disabled={stoppingId === job.id}
                              aria-label={"Cancel " + job.name}
                              className={[
                                "p-1.5 text-stone-400 hover:text-red-500 transition-colors",
                                "disabled:opacity-50",
                              ].join(" ")}
                            >
                              {stoppingId === job.id ? (
                                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                              ) : (
                                <Square aria-hidden="true" className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {job.status === "failed" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRetry(job);
                              }}
                              disabled={jobActionId === job.id}
                              aria-label={"Retry " + job.name}
                              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                            >
                              <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!["queued", "running"].includes(job.status) ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete(job);
                              }}
                              disabled={jobActionId === job.id}
                              aria-label={"Delete " + job.name}
                              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 font-bold text-stone-900">
                <Cpu aria-hidden="true" className="h-4 w-4 text-orange-500" />
                Run Information
              </h3>
              <dl className="space-y-3 text-xs">
                {[
                  ["Agent job", selectedJob?.agent_job_id || "Not assigned"],
                  ["Dataset", selectedDataset ? selectedDataset.name + " v" + selectedDataset.version : "—"],
                  ["Started", selectedJob?.started_at ? DATE_FORMATTER.format(new Date(selectedJob.started_at)) : "—"],
                  ["Finished", selectedJob?.finished_at ? DATE_FORMATTER.format(new Date(selectedJob.finished_at)) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="max-w-[65%] break-words text-right font-bold tabular-nums text-stone-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-500" />
                  Hyperparameters
                </h3>
              </div>
              <div className="space-y-4">
                {Object.keys(hyperparams).length > 0
                  ? Object.entries(hyperparams).map(([k, v]) => (
                      <div
                        key={k}
                        className={[
                          "flex justify-between items-center py-2 border-b border-stone-50",
                          "last:border-0",
                        ].join(" ")}
                      >
                        <span className="text-xs font-medium text-stone-500 capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-xs font-bold text-stone-900">{String(v)}</span>
                      </div>
                    ))
                  : [
                      { label: "Learning Rate", value: "—" },
                      { label: "Batch Size", value: "—" },
                      { label: "Epochs", value: "—" },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className={[
                          "flex justify-between items-center py-2 border-b border-stone-50",
                          "last:border-0",
                        ].join(" ")}
                      >
                        <span className="text-xs font-medium text-stone-500">{p.label}</span>
                        <span className="text-xs font-bold text-stone-900">{p.value}</span>
                      </div>
                    ))}
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-stone-900">
                <Grid3X3 aria-hidden="true" className="h-4 w-4 text-orange-500" />
                Confusion Matrix
              </h3>
              {selectedJob?.artifact_urls?.["confusion_matrix.png"] ? (
                <a
                  href={selectedJob.artifact_urls["confusion_matrix.png"]}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  Open confusion matrix
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </a>
              ) : (
                <p className="text-sm leading-6 text-stone-500">
                  Not generated by the current GPU agent. Epoch metrics remain available above; update the agent to upload <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">confusion_matrix.png</code>.
                </p>
              )}
            </div>

            <div
              className={[
                "p-8 bg-orange-50 rounded-3xl border border-orange-100 text-stone-900 relative",
                "overflow-hidden shadow-sm",
              ].join(" ")}
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">Export Result</h3>
                <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                  {selectedJob?.status === "completed"
                    ? `${Object.keys(selectedJob.artifact_urls ?? {}).length} training artifacts are available from this run.`
                    : "The GPU agent uploads PyTorch, ONNX, metrics, and training-log artifacts when training completes."}
                </p>
                <div className="space-y-2">
                  {Object.entries(selectedJob?.status === "completed" ? selectedJob.artifact_urls : {}).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      className="flex items-center justify-between rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-orange-100"
                    >
                      <span>{name}</span>
                      <Download className="h-4 w-4 text-orange-500" />
                    </a>
                  ))}
                </div>
                {selectedJob?.status !== "completed" || Object.keys(selectedJob?.artifact_urls ?? {}).length === 0 ? <button
                  disabled
                  className={[
                    "px-6 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-xl font-bold",
                    "text-sm flex items-center gap-2 opacity-50",
                  ].join(" ")}
                >
                  <span>Artifacts available after training</span>
                  <ChevronRight className="w-5 h-5" />
                </button> : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
