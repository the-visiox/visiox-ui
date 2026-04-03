"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  MousePointer2,
  Square,
  Pentagon,
  Undo2,
  Redo2,
  Trash2,
  Settings,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import AnnotationEditor from '@/components/annotate/AnnotationEditor';
import BlueprintGrid from '@/components/BlueprintGrid';
import { datasets } from '@/lib/api';

interface AnnotateClientProps {
  id: string;
  imageId: string;
}

export default function AnnotateClient({ id, imageId }: AnnotateClientProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const datasetId = parseInt(id, 10);
    const mid = parseInt(imageId, 10);
    if (Number.isNaN(datasetId) || Number.isNaN(mid)) {
      setError('Invalid dataset or image.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const list = await datasets.media(datasetId);
        const found = list.find((m) => m.id === mid);
        if (!found?.file_url) {
          setError('Image not found or has no file URL.');
        } else {
          setImageUrl(found.file_url);
        }
      } catch {
        setError('Could not load image.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, imageId]);

  if (loading) {
    return (
      <div className="relative flex-1 flex flex-col h-screen bg-stone-950 items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-stone-400 text-sm font-medium">Loading image…</p>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="relative flex-1 flex flex-col h-screen bg-stone-950 items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400 text-sm font-medium">{error ?? 'No image URL.'}</p>
        <button
          type="button"
          onClick={() => router.push(`/datasets/${id}`)}
          className="px-4 py-2 bg-white text-stone-900 rounded-xl text-xs font-bold"
        >
          Back to dataset
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-screen bg-stone-950 overflow-hidden">
      <BlueprintGrid />
      
      {/* Precision Toolbar - Top */}
      <nav className="z-30 px-6 py-3 bg-stone-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-stone-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-[1px] bg-white/10" />
          <div>
             <h1 className="text-sm font-bold text-white leading-none">Annotation Terminal</h1>
             <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">Image: {imageId}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
           <button className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20">
              <Square className="w-4 h-4" />
           </button>
           <button className="p-2.5 text-stone-500 hover:text-white transition-colors">
              <Pentagon className="w-4 h-4" />
           </button>
           <button className="p-2.5 text-stone-500 hover:text-white transition-colors">
              <MousePointer2 className="w-4 h-4" />
           </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 pr-3 border-r border-white/10">
            <button className="p-2 text-stone-500 hover:text-white transition-colors"><Undo2 className="w-4 h-4" /></button>
            <button className="p-2 text-stone-500 hover:text-white transition-colors"><Redo2 className="w-4 h-4" /></button>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-white text-stone-900 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
            <Save className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-grow flex overflow-hidden">
        {/* Left - Toolbox */}
        <aside className="w-16 flex flex-col items-center py-6 gap-6 bg-stone-900/50 border-r border-white/5 z-20">
           <div className="flex flex-col gap-2">
             <div className="w-8 h-8 rounded-lg bg-red-400 shadow-lg shadow-red-400/20 cursor-pointer border-2 border-white/10" />
             <div className="w-8 h-8 rounded-lg bg-blue-400 opacity-40 hover:opacity-100 cursor-pointer border-2 border-white/10" />
             <div className="w-8 h-8 rounded-lg bg-emerald-400 opacity-40 hover:opacity-100 cursor-pointer border-2 border-white/10" />
           </div>
           
           <div className="mt-auto flex flex-col gap-4">
              <button className="text-stone-600 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
              <button className="text-stone-600 hover:text-white transition-colors"><HelpCircle className="w-5 h-5" /></button>
           </div>
        </aside>

        {/* Center - Canvas */}
        <div className="flex-grow p-4 relative overflow-hidden flex items-center justify-center">
           <AnnotationEditor imageUrl={imageUrl} />
        </div>

        {/* Right - Classes & Bounding Boxes */}
        <aside className="w-80 bg-stone-900/80 backdrop-blur-xl border-l border-white/5 p-6 flex flex-col z-20 overflow-y-auto">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Active Objects</h3>
              <span className="px-2 py-0.5 bg-white/5 text-[10px] font-bold text-stone-500 rounded-lg">4 Total</span>
           </div>

           <div className="space-y-3">
              {[
                { label: "Defect_Crack", color: "text-red-400" },
                { label: "Defect_Puncture", color: "text-red-400" },
                { label: "Surface_Scratch", color: "text-blue-400" },
                { label: "Surface_Scratch", color: "text-blue-400" },
              ].map((obj, i) => (
                <div key={i} className="group p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full bg-current ${obj.color}`} />
                        <span className="text-xs font-bold text-white">{obj.label}</span>
                     </div>
                     <Trash2 className="w-3.5 h-3.5 text-stone-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                   </div>
                </div>
              ))}
           </div>
        </aside>
      </main>
    </div>
  );
}
