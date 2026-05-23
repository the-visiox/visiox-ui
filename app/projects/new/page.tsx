"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import BlueprintGrid from "@/components/BlueprintGrid";
import { projects, teams, type Team } from "@/lib/api";

const TASK_TYPES: { value: string; label: string }[] = [
  { value: "object_detection", label: "Object Detection" },
  { value: "image_classification", label: "Image Classification" },
  { value: "semantic_segmentation", label: "Semantic Segmentation" },
  { value: "instance_segmentation", label: "Instance Segmentation" },
  { value: "keypoint_detection", label: "Keypoint Detection" },
  { value: "video_annotation", label: "Video Annotation" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamId, setTeamId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState(TASK_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await teams.list();
        const list = res.results ?? [];
        setTeamList(list);
        if (list.length === 1) setTeamId(list[0].id);
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Select a team.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await projects.create({
        team: teamId as number,
        name: name.trim(),
        task_type: taskType,
        description: description.trim() || undefined,
      });
      router.push("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />
      <main className="flex-grow p-6 z-10 max-w-xl mx-auto w-full">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8"
        >
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-1">New project</h1>
          <p className="text-stone-500 text-sm font-medium mb-8">
            Create a project under one of your teams, then add datasets and training jobs.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {loadingTeams ? (
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading teams…
            </div>
          ) : teamList.length === 0 ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-5">
              <p className="text-stone-800 text-sm font-medium mb-1">No team yet</p>
              <p className="text-stone-600 text-sm mb-4 leading-relaxed">
                Create a team first, then you can add projects under it. Or ask a teammate to invite you to an
                existing team.
              </p>
              <Link
                href="/teams/new"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Create a team
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                >
                  <option value="">Select a team</option>
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Warehouse QC — Line A"
                  minLength={3}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Task type
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Description{" "}
                  <span className="font-normal text-stone-400 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short summary for your team"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || !teamId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? "Creating…" : "Create project"}
                </button>
                <Link
                  href="/projects"
                  className="px-4 py-3 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
