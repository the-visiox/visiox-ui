"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users, Plus, Lock, Globe } from "lucide-react";
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
  const [teamList, setTeamList]         = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamId, setTeamId]             = useState<number | "">("");

  // inline team creation
  const [newTeamName, setNewTeamName]   = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError]       = useState("");

  const [name, setName]               = useState("");
  const [taskType, setTaskType]       = useState(TASK_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await teams.list();
        const list = res.results ?? [];
        setTeamList(list);
        if (list.length >= 1) setTeamId(list[0].id);
      } finally {
        setLoadingTeams(false);
      }
    })();
  }, []);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    setTeamError("");
    try {
      const created = await teams.create(newTeamName.trim());
      setTeamList((prev) => [...prev, created]);
      setTeamId(created.id);
      setNewTeamName("");
    } catch (err: unknown) {
      setTeamError(err instanceof Error ? err.message : "Could not create team.");
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) { setError("Select a team."); return; }
    setSaving(true);
    setError("");
    try {
      await projects.create({
        team: teamId as number,
        name: name.trim(),
        task_type: taskType,
        description: description.trim() || undefined,
        is_public: isPublic,
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
            Set up a project, then add datasets and annotation jobs.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          {loadingTeams ? (
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── No team yet: prompt to create one ────────────────────── */}
              {teamList.length === 0 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-bold text-stone-700">Create a team first</span>
                  </div>
                  <p className="mb-4 text-xs text-stone-500 leading-relaxed">
                    Projects belong to a team. Create one now or ask a teammate to invite you.
                  </p>
                  <form onSubmit={handleCreateTeam} className="flex gap-2">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name…"
                      required
                      className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={creatingTeam || !newTeamName.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                      {creatingTeam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Create
                    </button>
                  </form>
                  {teamError && <p className="mt-2 text-xs text-red-500">{teamError}</p>}
                </div>
              )}

              {/* ── Project form — shown once a team is available ─────────── */}
              {teamId !== "" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">
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
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">
                      Task type
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">
                      Description{" "}
                      <span className="font-normal text-stone-400 normal-case tracking-normal">(Optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Short summary for your team"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                    />
                  </div>

                  {/* ── Visibility toggle ───────────────────────────────── */}
                  <div>
                    <label className="block text-xs font-bold text-stone-400 tracking-widest mb-2">
                      Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPublic(false)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5 text-left transition-all ${
                          !isPublic
                            ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/20"
                            : "border-stone-200 bg-stone-50 hover:border-stone-300"
                        }`}
                      >
                        <div className={`flex items-center gap-2 text-sm font-bold ${!isPublic ? "text-orange-700" : "text-stone-700"}`}>
                          <Lock className="w-3.5 h-3.5" />
                          Private
                        </div>
                        <p className="text-[11px] leading-relaxed text-stone-400">
                          Only team members can access this project.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3.5 text-left transition-all ${
                          isPublic
                            ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/20"
                            : "border-stone-200 bg-stone-50 hover:border-stone-300"
                        }`}
                      >
                        <div className={`flex items-center gap-2 text-sm font-bold ${isPublic ? "text-orange-700" : "text-stone-700"}`}>
                          <Globe className="w-3.5 h-3.5" />
                          Public
                        </div>
                        <p className="text-[11px] leading-relaxed text-stone-400">
                          Anyone with the link can view this project.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving || !name.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {saving ? "Creating…" : "Create project"}
                    </button>

                    <Link
                      href="/projects"
                      className="flex-1 flex items-center justify-center px-4 py-3 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              )}

            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
