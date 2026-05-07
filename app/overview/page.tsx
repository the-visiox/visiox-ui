"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  Zap,
  Shield,
  Clock,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { projects, datasets, training, deployments, type Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

export default function OverviewPage() {
  const { user } = useAuth();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [stats, setStats] = useState({ totalImages: 0, activeModels: 0, apiCallsMin: 0, storageGB: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, datasetsRes, jobsRes, endpointsRes] = await Promise.allSettled([
          projects.list(),
          datasets.list(),
          training.listJobs(),
          deployments.listEndpoints(),
        ]);

        const projectData = projectsRes.status === 'fulfilled' ? projectsRes.value.results : [];
        const datasetData = datasetsRes.status === 'fulfilled' ? datasetsRes.value.results : [];
        const jobData = jobsRes.status === 'fulfilled' ? jobsRes.value.results : [];
        const endpointData = endpointsRes.status === 'fulfilled' ? endpointsRes.value.results : [];

        setProjectList(projectData);

        const totalImages = datasetData.reduce((sum, d) => sum + d.media_count, 0);
        const activeModels = endpointData.filter(e => e.status === 'active').length;
        const runningJobs = jobData.filter(j => j.status === 'running').length;
        const storageGB = Math.round(datasetData.length * 0.5);

        setStats({ totalImages, activeModels, apiCallsMin: runningJobs * 120, storageGB });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'there';

  const statCards = [
    { label: "Total Images", value: loading ? '—' : stats.totalImages.toLocaleString(), change: "+12.5%", positive: true, icon: Clock },
    { label: "Active Models", value: loading ? '—' : String(stats.activeModels), change: "+2", positive: true, icon: Zap },
    { label: "API Calls / min", value: loading ? '—' : stats.apiCallsMin.toLocaleString(), change: "-3%", positive: false, icon: Shield },
    { label: "Storage Used", value: loading ? '—' : `${stats.storageGB} GB`, change: "+8%", positive: true, icon: ArrowUpRight },
  ];

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <main className="flex-grow p-8 z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-1">Workspace Overview</h1>
            <p className="text-stone-500 text-sm font-medium">
              Welcome back, {firstName}! Here&apos;s what&apos;s happening with your projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all w-64"
              />
            </div>
            <Link href="/projects/new">
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm group hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 group-hover:text-orange-500 transition-colors">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-stone-900">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Projects */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-stone-900">Recent Projects</h2>
          <div className="flex gap-2">
            <button className="p-2 bg-white border border-stone-200 rounded-lg text-stone-500 hover:text-stone-900 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <Link href="/projects" className="text-orange-500 text-sm font-bold hover:underline">View All</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : projectList.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-stone-400">
              <p className="text-lg font-bold mb-2">No projects yet</p>
              <p className="text-sm">
                <Link href="/projects/new" className="text-orange-500 font-bold hover:underline">
                  Create a project
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            projectList.slice(0, 6).map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-white rounded-3xl border border-stone-200 p-1 flex flex-col group cursor-pointer hover:border-orange-500/50 transition-all shadow-sm"
              >
                <div className="h-48 rounded-[22px] bg-stone-100 relative overflow-hidden m-1">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <>
                      <div className={`absolute inset-0 opacity-10 ${TASK_TYPE_COLOR[project.task_type] ?? 'bg-stone-500'}`} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-2 border-white/50 border-dashed rounded-full" />
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-stone-900 rounded-full shadow-sm">
                      {project.task_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">{project.name}</h3>
                    <MoreHorizontal className="text-stone-400 w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-stone-500 font-medium">Active</span>
                    </div>
                    <div className="mx-2 w-[1px] h-3 bg-stone-200" />
                    <span className="text-xs text-stone-500 font-medium">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Active Pipelines */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-stone-900">Active Pipelines</h2>
          <Link href="/train" className="text-orange-500 text-sm font-bold hover:underline">Launch Builder</Link>
        </div>

        <div className="bg-[#1c1917] rounded-[40px] p-8 border border-stone-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full mb-4">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">Real-time Flow</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Core Logistic Pipeline v2</h3>
              <p className="text-stone-400 text-sm mb-6 max-w-md">
                {loading ? 'Loading pipeline data...' : `${stats.activeModels} active endpoint${stats.activeModels !== 1 ? 's' : ''} running. System load is nominal.`}
              </p>
              <div className="flex gap-4">
                <Link href="/train">
                  <button className="px-6 py-2 bg-white text-stone-900 rounded-xl font-bold text-xs hover:scale-105 transition-all">Monitor Stats</button>
                </Link>
                <Link href="/deploy">
                  <button className="px-6 py-2 bg-stone-800 text-white rounded-xl font-bold text-xs hover:bg-stone-700 transition-all">Manage Endpoints</button>
                </Link>
              </div>
            </div>
            <div className="w-full md:w-64 h-32 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-x-0 flex items-center justify-around px-8">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center"><Camera className="w-4 h-4 text-green-500" /></div>
                <div className="w-8 h-1 bg-stone-800 rounded-full relative overflow-hidden">
                  <motion.div animate={{ x: [-20, 40] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-y-0 w-4 bg-orange-500" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center"><Zap className="w-4 h-4 text-orange-500" /></div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        </div>
      </main>
    </div>
  );
}
