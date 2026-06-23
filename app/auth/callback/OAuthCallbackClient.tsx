"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { auth, saveTokens, TOKEN_KEYS } from "@/lib/api";

function getRedirectUri() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${window.location.origin}${basePath}/auth/callback`;
}

export default function OAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function finishOAuth() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const storedState = localStorage.getItem("visiox_oauth_state");
      const storedProvider = localStorage.getItem("visiox_oauth_provider");
      const providerParam = searchParams.get("provider");
      const provider =
        providerParam === "google" || providerParam === "github"
          ? providerParam
          : storedProvider === "google" || storedProvider === "github"
            ? storedProvider
            : null;

      if (!provider || !code) {
        setError("OAuth callback is missing provider or code.");
        return;
      }
      if (
        !state ||
        !storedState ||
        state !== storedState ||
        provider !== storedProvider
      ) {
        setError("OAuth state check failed. Please try signing in again.");
        return;
      }

      try {
        const data = await auth.oauth(provider, code, getRedirectUri());
        saveTokens(data.access_token, data.refresh_token);
        localStorage.setItem(
          TOKEN_KEYS.user,
          JSON.stringify({
            user_id: data.user_id,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
          }),
        );
        localStorage.removeItem("visiox_oauth_state");
        localStorage.removeItem("visiox_oauth_provider");
        window.location.assign(
          `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/home`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "OAuth login failed.");
      }
    }

    void finishOAuth();
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-amber-100 to-orange-300 px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl shadow-orange-200/60">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-stone-900">
              Sign in failed
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-red-600">
              {error}
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-6 h-11 rounded-md bg-orange-500 px-6 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <h1 className="mt-4 text-xl font-bold text-stone-900">
              Signing you in...
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Finishing OAuth with VisioX.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
