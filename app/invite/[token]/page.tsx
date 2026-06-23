"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { teams } from "@/lib/api";

type State = "loading" | "success" | "error";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    teams
      .acceptInvitation(token as string)
      .then((res) => {
        setMessage(res.detail);
        setState("success");
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "This invitation is invalid or has expired.");
        setState("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/40 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 shadow-lg shadow-violet-500/20">
          {state === "loading" && <Loader2 className="h-7 w-7 animate-spin text-white" />}
          {state === "success" && <CheckCircle2 className="h-7 w-7 text-white" />}
          {state === "error" && <XCircle className="h-7 w-7 text-white" />}
        </div>

        {state === "loading" && (
          <>
            <h1 className="text-lg font-bold text-stone-900">Accepting invitation…</h1>
            <p className="mt-1 text-sm text-stone-400">Please wait a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <h1 className="text-lg font-bold text-stone-900">
              You&apos;re in!
            </h1>
            <p className="mt-1 text-sm text-stone-500">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-600"
            >
              Go to Projects
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-lg font-bold text-stone-900">Invitation unavailable</h1>
            <p className="mt-1 text-sm text-stone-500">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            >
              Back to Projects
            </button>
          </>
        )}
      </div>
    </div>
  );
}
