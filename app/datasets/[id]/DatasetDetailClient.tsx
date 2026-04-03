"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Settings, Database, Zap, Shield, Share2, Trash2,
  Play, History, Grid, Layers, MoreVertical, CheckCircle2,
  Upload, Download, Image as ImageIcon, Loader2, ChevronDown,
} from 'lucide-react';
import BlueprintGrid from '@/components/BlueprintGrid';
import { datasets, type Dataset, type Media } from '@/lib/api';

const EXPORT_FORMATS = ['coco', 'yolo', 'voc'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

interface DatasetDetailClientProps {
  id: string;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-5 gap-3 p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-stone-100 animate-pulse" />
      ))}
    </div>
  );
}

export default function DatasetDetailClient({ id }: DatasetDetailClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const numericId = parseInt(id, 10);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'versions'>('images');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNaN(numericId)) { setLoading(false); return; }
    Promise.allSettled([
      datasets.get(numericId),
      datasets.media(numericId),
    ]).then(([dsRes, mediaRes]) => {
      if (dsRes.status === 'fulfilled') setDataset(dsRes.value);
      if (mediaRes.status === 'fulfilled') setMediaList(mediaRes.value);
      setLoading(false);
    });
  }, [numericId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || isNaN(numericId)) return;

    setUploading(true);
    setUploadProgress(0);
    const uploaded: Media[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const media = await datasets.upload(numericId, files[i]);
        uploaded.push(media);
      } catch (err) {
        setError(`Failed to upload ${files[i].name}`);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setMediaList(prev => [...prev, ...uploaded]);
    setDataset(prev => prev ? { ...prev, media_count: prev.media_count + uploaded.length } : prev);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = (format: ExportFormat) => {
    setExportOpen(false);
    const url = datasets.exportUrl(numericId, format);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-${id}-${format}.zip`;
    a.click();
  };

  const name = dataset?.name ?? (isNaN(numericId) ? id : `Dataset #${id}`);

  return (
    <div className="relative flex-1 flex flex-col min-h-screen bg-stone-50">
      <BlueprintGrid />

      {/* Top Navbar */}
      <nav className="z-20 px-8 py-4 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div className="h-6 w-[1px] bg-stone-200" />
          <div>
            <h1 className="text-lg font-bold text-stone-900 leading-none">{name}</h1>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
              Dataset ID: {id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/60 backdrop-blur border border-stone-200 p-1 rounded-xl mr-4">
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'images' ? 'bg-white shadow text-stone-900 border border-stone-100' : 'text-stone-500 hover:text-stone-900'}`}
            >
              <Grid className="w-3.5 h-3.5" />
              Images
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'versions' ? 'bg-white shadow text-stone-900 border border-stone-100' : 'text-stone-500 hover:text-stone-900'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Versions
            </button>
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 mt-2 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50 min-w-[140px]"
                >
                  {EXPORT_FORMATS.map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 uppercase transition-colors"
                    >
                      {fmt === 'coco' ? 'COCO JSON' : fmt === 'yolo' ? 'YOLO txt' : 'Pascal VOC'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isNaN(numericId)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-stone-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Uploading {uploadProgress}%</span></>
            ) : (
              <><Upload className="w-3.5 h-3.5" /><span>Upload Media</span></>
            )}
          </button>

          <button className="p-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all">
            <Settings className="w-4 h-4 text-stone-600" />
          </button>
        </div>
      </nav>

      {error && (
        <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl z-10">
          {error}
        </div>
      )}

      <main className="flex-grow flex p-6 gap-6 z-10 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 flex flex-col gap-6 shrink-0">
          <section className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Database className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">Media Count</p>
                <p className="text-xl font-black text-stone-900">{loading ? '—' : mediaList.length.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 font-medium">Version</span>
                <span className="text-stone-900 font-bold">v{dataset?.version ?? '—'}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="w-full h-full bg-orange-500 transition-all" style={{ width: `${Math.min(100, (mediaList.length / 100) * 100)}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-bold text-stone-400 uppercase">Images</p>
                  <p className="text-lg font-bold text-stone-900">
                    {mediaList.filter(m => m.type === 'image').length}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[9px] font-bold text-stone-400 uppercase">Video</p>
                  <p className="text-lg font-bold text-stone-900">
                    {mediaList.filter(m => m.type === 'video').length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex-grow bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900">Dataset Info</h3>
              <Zap className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <div className="space-y-3 text-xs text-stone-600">
              {dataset ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-medium">Project</span>
                    <span className="font-bold">#{dataset.project}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-medium">Created</span>
                    <span className="font-bold">{new Date(dataset.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-medium">Updated</span>
                    <span className="font-bold">{new Date(dataset.updated_at).toLocaleDateString()}</span>
                  </div>
                  {dataset.description && (
                    <p className="text-stone-500 pt-2 border-t border-stone-100">{dataset.description}</p>
                  )}
                </>
              ) : loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-3/4" />
                </div>
              ) : (
                <p className="text-stone-400">No info available</p>
              )}
            </div>
          </section>
        </aside>

        {/* Center Content */}
        <section className="flex-grow flex flex-col gap-6 min-w-0">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200 px-6 py-3 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-xl text-[10px] font-bold text-stone-600">
                <Shield className="w-3 h-3" />
                <span>Quality Check: ON</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400">
                <History className="w-3 h-3" />
                <span>Updated {dataset ? new Date(dataset.updated_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <div className="h-4 w-[1px] bg-stone-200" />
              <button className="p-2 text-stone-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-grow min-h-0 overflow-auto">
            {activeTab === 'images' && (
              loading ? (
                <SkeletonGrid />
              ) : mediaList.length === 0 ? (
                <div className="w-full h-64 border-2 border-dashed border-stone-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-stone-400">
                  <ImageIcon className="w-12 h-12" />
                  <div className="text-center">
                    <p className="font-bold">No media yet</p>
                    <p className="text-sm">Click "Upload Media" to add images</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3 p-1">
                  {mediaList.map((media) => (
                    <Link
                      key={media.id}
                      href={`/datasets/${id}/annotate/${media.id}`}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-2xl border border-stone-200 overflow-hidden bg-stone-100 group relative cursor-pointer hover:shadow-xl hover:border-orange-500/30 transition-all"
                      >
                        {media.file_url ? (
                          <img
                            src={media.file_url}
                            alt={media.original_filename}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-stone-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                          <p className="text-white text-[10px] font-bold truncate">{media.original_filename}</p>
                          {media.width && (
                            <span className="text-[8px] text-white/70">{media.width}×{media.height}</span>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )
            )}

            {activeTab === 'versions' && (
              <div className="w-full border border-stone-200 rounded-3xl bg-white p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-8">Version History</h2>
                {dataset ? (
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-[3px] border-white shadow-sm bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-grow bg-stone-50 border border-stone-100 rounded-3xl p-6">
                      <h3 className="font-bold text-stone-900 text-lg">{dataset.name} v{dataset.version}</h3>
                      <p className="text-xs text-stone-500 font-medium mt-1">
                        {new Date(dataset.updated_at).toLocaleString()}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Media</p>
                          <p className="text-lg font-black text-stone-900">{mediaList.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Version</p>
                          <p className="text-lg font-black text-stone-900">v{dataset.version}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Export</p>
                          <div className="flex gap-1 mt-1">
                            {EXPORT_FORMATS.map(f => (
                              <button
                                key={f}
                                onClick={() => handleExport(f)}
                                className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-[9px] font-bold hover:bg-orange-100 hover:text-orange-600 transition-colors"
                              >
                                {f.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-400">No version data available.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
