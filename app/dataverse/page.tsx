"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Database,
  GitFork,
  Loader2,
  Search,
  Tag,
} from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  dataverse,
  resolveMediaUrl,
  teams,
  type DataverseProject,
  type Team,
} from "@/lib/api";

const TASK_TYPE_LABEL: Record<string, string> = {
  image_classification: "Classification",
  object_detection: "Object Detection",
  semantic_segmentation: "Segmentation",
  instance_segmentation: "Instance Segmentation",
  keypoint_detection: "Keypoints",
  video_annotation: "Video",
};

function SkeletonCard() {
  return (
    <div className="h-72 rounded-3xl border border-stone-200 bg-white p-2 animate-pulse">
      <div className="h-36 rounded-2xl bg-stone-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-stone-100 w-2/3" />
        <div className="h-3 rounded bg-stone-100 w-full" />
        <div className="h-3 rounded bg-stone-100 w-1/2" />
      </div>
    </div>
  );
}

export default function DataversePage() {
  const router = useRouter();
  const [items, setItems] = useState<DataverseProject[]>([]);
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [forkingId, setForkingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void load("");
    void (async () => {
      try {
        const res = await teams.list();
        setTeamList(res.results ?? []);
      } catch {
        setTeamList([]);
      }
    })();
  }, []);

  async function load(search: string) {
    setLoading(true);
    setError("");
    try {
      const res = await dataverse.list(search.trim() || undefined);
      setItems(res.results ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load Dataverse.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFork(item: DataverseProject) {
    const targetTeam = teamList[0];
    if (!targetTeam) {
      setError("Create or join a team before forking a Dataverse project.");
      return;
    }
    setForkingId(item.id);
    setError("");
    try {
      const result = await dataverse.fork(item.id, {
        team: targetTeam.id,
        name: `${item.title} Fork`,
      });
      router.push(`/projects/${result.project_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not fork project.");
    } finally {
      setForkingId(null);
    }
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />
      <main className="flex-grow p-8 z-10">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-stone-900 md:text-3xl">
              Explore dataset
            </h1>
            <p className="max-w-xl text-base leading-6 text-stone-500">
              Search community-shared projects, inspect their dataset shape, and fork useful work into your own workspace.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(query);
            }}
            className="flex w-full flex-wrap items-center gap-3 md:w-auto md:max-w-xl md:flex-nowrap"
          >
            <div className="relative min-w-0 flex-1 md:w-80 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search defects, PPE, traffic, agriculture..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-4 text-sm font-bold text-orange-700 transition-all hover:scale-105 hover:bg-orange-200 active:scale-95">
              <Search className="w-4 h-4 text-orange-500" />
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(18rem,20rem))] sm:justify-between">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : items.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-stone-200 bg-white/80 py-16 text-center">
              <p className="font-bold text-stone-900 mb-2">No shared projects found</p>
              <p className="text-sm text-stone-500">Try another search term or share one of your projects.</p>
            </div>
          ) : (
            items.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group w-full rounded-3xl border border-stone-200 bg-white p-2 shadow-sm transition-all hover:border-orange-300 hover:shadow-xl hover:shadow-orange-50"
              >
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-stone-100">
                  {item.thumbnail ? (
                    <img
                      src={resolveMediaUrl(item.thumbnail)}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Database className="h-12 w-12 text-stone-300" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-stone-900 shadow-sm backdrop-blur">
                    {TASK_TYPE_LABEL[item.task_type] ?? item.task_type}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-stone-900 group-hover:text-orange-600">
                        {item.title}
                      </h2>
                      <p className="text-xs font-medium text-stone-400">
                        by {item.owner_username} in {item.team_name}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-stone-300" />
                  </div>

                  <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-stone-500">
                    {item.summary || "Shared VisioX project with reusable datasets and labels."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-stone-50 px-3 py-2">
                      <p className="text-lg font-black text-stone-900">{item.dataset_count}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Datasets</p>
                    </div>
                    <div className="rounded-xl bg-stone-50 px-3 py-2">
                      <p className="text-lg font-black text-stone-900">{item.media_count}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Media</p>
                    </div>
                    <div className="rounded-xl bg-stone-50 px-3 py-2">
                      <p className="text-lg font-black text-stone-900">{item.fork_count}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Forks</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleFork(item)}
                    disabled={forkingId === item.id}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                  >
                    {forkingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitFork className="h-4 w-4" />
                    )}
                    Fork to my workspace
                  </button>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
