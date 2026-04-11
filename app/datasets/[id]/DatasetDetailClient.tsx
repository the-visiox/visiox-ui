"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, ChevronDown, Tag, RefreshCw,
  Loader2, AlertTriangle, BarChart3, Layers, ExternalLink,
  Image as ImageIcon, Box, Crosshair, Activity,
  CheckCircle2, Circle, Users,
} from 'lucide-react';
import BlueprintGrid from '@/components/BlueprintGrid';
import {
  datasets,
  type DatasetStats,
  type BrowserData,
} from '@/lib/api';

const CVAT_URL = process.env.NEXT_PUBLIC_CVAT_URL || 'http://localhost:8080';
const EXPORT_FORMATS = ['coco', 'yolo', 'voc'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

interface Props { id: string; }

function StatCard({ icon: Icon, label, value, sub, color = 'orange', delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string; delay?: number;
}) {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500 to-amber-400',
    emerald: 'from-emerald-500 to-teal-400',
    blue: 'from-blue-500 to-cyan-400',
    purple: 'from-purple-500 to-violet-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:border-stone-300 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs font-medium text-stone-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-stone-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-stone-600">{label}</span>
        <span className="text-xs font-bold text-stone-800">{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
        />
      </div>
    </div>
  );
}

const JOB_STATE_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  new: { icon: Circle, color: 'text-stone-400' },
  'in progress': { icon: Activity, color: 'text-blue-500' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500' },
  rejected: { icon: AlertTriangle, color: 'text-red-500' },
};

export default function DatasetDetailClient({ id }: Props) {
  const router = useRouter();
  const numericId = parseInt(id, 10);

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [browserData, setBrowserData] = useState<BrowserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (isNaN(numericId)) return;
    let cancelled = false;

    async function load() {
      try {
        const [statsResult, browserResult] = await Promise.allSettled([
          datasets.stats(numericId),
          datasets.browser(numericId),
        ]);
        if (cancelled) return;
        if (statsResult.status === 'fulfilled') setStats(statsResult.value);
        if (browserResult.status === 'fulfilled') setBrowserData(browserResult.value);
        if (statsResult.status === 'rejected' && browserResult.status === 'rejected') {
          setError('Failed to load dataset data');
        }
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [numericId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await datasets.syncCvat(numericId);
      window.location.reload();
    } catch { setError('Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleExport = (format: ExportFormat) => {
    setExportOpen(false);
    const url = datasets.exportUrl(numericId, format);
    const a = document.createElement('a');
    a.href = url; a.download = `dataset-${id}-${format}.zip`; a.click();
  };

  const cvat = stats?.cvat;
  const totalImages = cvat?.size ?? browserData?.frame_count ?? 0;
  const totalAnnotations = cvat?.annotations?.total ?? browserData?.annotation_count ?? 0;
  const labels = browserData?.labels ?? [];
  const name = stats?.name ?? browserData?.dataset_name ?? `Dataset #${id}`;
  const version = stats?.version ?? browserData?.version ?? 1;
  const taskId = stats?.cvat_task_id ?? browserData?.task_id;
  const jobs = cvat?.jobs ?? [];

  const annotatedCount = browserData
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

      {/* Navbar */}
      <nav className="z-20 px-6 py-3 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div className="h-6 w-[1px] bg-stone-200" />
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-none">{name}</h1>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
              {totalImages} images · v{version}
              {stats?.project_name && <> · {stats.project_name}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export
              <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-50 min-w-[120px]"
              >
                {EXPORT_FORMATS.map(fmt => (
                  <button key={fmt} onClick={() => handleExport(fmt)}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 uppercase"
                  >
                    {fmt === 'coco' ? 'COCO JSON' : fmt === 'yolo' ? 'YOLO txt' : 'Pascal VOC'}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {taskId && (
            <a href={`${CVAT_URL}/tasks/${taskId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> CVAT
            </a>
          )}

          <button onClick={() => router.push(`/datasets/${id}/annotate/native?mode=simple`)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Layers className="w-3.5 h-3.5" /> Annotate Native
          </button>
        </div>
      </nav>

      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl z-10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Main Content */}
      <div className="z-10 flex-1 overflow-auto p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ImageIcon} label="Total Images" value={totalImages} color="orange" delay={0} />
          <StatCard icon={Tag} label="Annotations" value={totalAnnotations}
            sub={totalAnnotations > 0 ? `${cvat?.annotations?.shapes ?? 0} shapes · ${cvat?.annotations?.tags ?? 0} tags · ${cvat?.annotations?.tracks ?? 0} tracks` : undefined}
            color="blue" delay={0.05}
          />
          <StatCard icon={Box} label="Labels" value={labels.length} color="purple" delay={0.1} />
          <StatCard icon={Crosshair} label="Annotated Images" value={`${annotatedCount} / ${totalImages}`}
            sub={totalImages > 0 ? `${Math.round((annotatedCount / totalImages) * 100)}% complete` : 'No images'}
            color="emerald" delay={0.15}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Annotation Progress & Label Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-4">Annotation Progress</h3>
              <ProgressBar value={annotatedCount} max={totalImages} label="Images annotated" />
            </div>

            {labels.length > 0 && browserData && (
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-4">Label Distribution</h3>
                <div className="space-y-3">
                  {labels.map(label => {
                    const count = browserData.frames.reduce(
                      (sum, f) => sum + f.annotations.filter(a => a.label_id === label.id).length, 0
                    );
                    const pct = totalAnnotations > 0 ? (count / totalAnnotations) * 100 : 0;
                    return (
                      <div key={label.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: label.color }} />
                            <span className="text-xs font-medium text-stone-600">{label.name}</span>
                          </div>
                          <span className="text-xs font-bold text-stone-800">{count}</span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {labels.length === 0 && (
              <div className="text-center py-6 text-stone-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No labels yet</p>
                <p className="text-[10px] mt-1">Add labels via the Annotate interface</p>
              </div>
            )}
          </motion.div>

          {/* CVAT Task Info + Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-4">Task Info</h3>
              {cvat?.exists ? (
                <div className="space-y-2.5">
                  <InfoRow label="Status" value={cvat.status ?? '—'} />
                  <InfoRow label="Mode" value={cvat.mode ?? '—'} />
                  <InfoRow label="Dimension" value={cvat.dimension ?? '—'} />
                  <InfoRow label="Image Quality" value={cvat.image_quality ? `${cvat.image_quality}%` : '—'} />
                  <InfoRow label="Created" value={cvat.created_date ? new Date(cvat.created_date).toLocaleDateString() : '—'} />
                  <InfoRow label="Updated" value={cvat.updated_date ? new Date(cvat.updated_date).toLocaleDateString() : '—'} />
                </div>
              ) : (
                <div className="text-center py-4 text-stone-400">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No CVAT task linked</p>
                  <p className="text-[10px] mt-1">Click Annotate to auto-provision</p>
                </div>
              )}
            </div>

            {/* Jobs table */}
            {jobs.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3">Jobs</h3>
                <div className="border border-stone-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
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
              </div>
            )}
          </motion.div>
        </div>

        {/* Frame Browser */}
        {browserData && browserData.frames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="bg-white rounded-2xl border border-stone-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Image Browser</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Click any image to open the annotation view
                </p>
              </div>
              <button
                onClick={() => router.push(`/datasets/${id}/annotate/native?mode=simple`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-700 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Open Native Annotate
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {browserData.frames.map((frame) => (
                <Link
                  key={frame.frame}
                  href={`/datasets/${id}/annotate/native?mode=simple&frame=${frame.frame}`}
                  className="group block overflow-hidden rounded-xl border border-stone-200 bg-stone-50 hover:border-orange-300 hover:shadow-md transition-all"
                  title={`Open annotation for ${frame.name}`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- JWT-backed frame URLs */}
                    <img
                      src={datasets.frameUrl(numericId, frame.frame)}
                      alt={frame.name}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-stone-700 truncate">{frame.name}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Frame {frame.frame} · {frame.annotations.length} labels
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Model Performance placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center"
        >
          <BarChart3 className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-400">Model Performance</p>
          <p className="text-xs text-stone-300 mt-1">Train a model to see predictions & metrics here</p>
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-xs font-bold text-stone-800 capitalize">{value}</span>
    </div>
  );
}
