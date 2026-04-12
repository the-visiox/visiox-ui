"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal } from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { projects, type Project } from "@/lib/api";

const TASK_TYPE_COLOR: Record<string, string> = {
  object_detection: "bg-blue-500",
  image_classification: "bg-[#6735E0]",
  semantic_segmentation: "bg-orange-500",
  instance_segmentation: "bg-green-500",
  keypoint_detection: "bg-pink-500",
  video_annotation: "bg-red-500",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-1 animate-pulse">
      <div className="h-48 rounded-[22px] bg-stone-100 m-1" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />
      <main className="flex-grow p-8 z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-1">Projects</h1>
            <p className="text-stone-500 text-sm font-medium">All projects you have access to.</p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            New project
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : list.length === 0 ? (
            <div className="col-span-3 text-center py-16 rounded-3xl border border-dashed border-stone-200 bg-white/80">
              <p className="text-stone-600 font-medium mb-2">No projects yet</p>
              <Link href="/projects/new" className="text-orange-500 font-bold text-sm hover:underline">
                Create your first project
              </Link>
            </div>
          ) : (
            list.map((p, i) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block h-full"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-3xl border border-stone-200 p-1 flex flex-col group cursor-pointer hover:border-orange-500/50 transition-all shadow-sm h-full"
                >
                  <div className="h-48 rounded-[22px] bg-stone-100 relative overflow-hidden m-1">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <>
                        <div
                          className={`absolute inset-0 opacity-10 ${TASK_TYPE_COLOR[p.task_type] ?? "bg-stone-500"}`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 border-2 border-white/30 border-dashed rounded-full" />
                        </div>
                      </>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-stone-900 rounded-full shadow-sm">
                        {p.task_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                        {p.name}
                      </h3>
                      <MoreHorizontal className="text-stone-400 w-5 h-5 shrink-0" />
                    </div>
                    <p className="text-xs text-stone-400 font-medium mb-3">{p.team_name}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-stone-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
