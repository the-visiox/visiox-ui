"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gift, Github, Loader2, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type LoginMode = "choices" | "email";
type OAuthProvider = "google" | "github";

function randomState() {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function getRedirectUri() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${window.location.origin}${basePath}/auth/callback`;
}

function hasOAuthClientId(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("PASTE_"));
}

const BACKOFF_SECONDS = [0, 0, 0, 30, 60, 120];

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("choices");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/home';

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError("");

    const res = await login(email, password);
    setLoading(false);

    if (res.ok) {
      router.push(nextPath);
      return;
    }

    const nextFail = failCount + 1;
    setFailCount(nextFail);
    const wait = BACKOFF_SECONDS[Math.min(nextFail, BACKOFF_SECONDS.length - 1)];
    if (wait > 0) setCooldown(wait);
    setError(res.error ?? "Login failed");
  };

  const handleSocialLogin = (provider: OAuthProvider) => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const clientId = provider === "google" ? googleClientId : githubClientId;

    if (!hasOAuthClientId(clientId)) {
      setError(`${provider === "google" ? "Google" : "GitHub"} OAuth client ID is missing. Set it in .env.local.`);
      return;
    }

    const state = randomState();
    const redirectUri = getRedirectUri();
    localStorage.setItem("visiox_oauth_state", state);
    localStorage.setItem("visiox_oauth_provider", provider);

    const url =
      provider === "google"
        ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
        : new URL("https://github.com/login/oauth/authorize");

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    if (provider === "google") {
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("prompt", "select_account");
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("include_granted_scopes", "true");
    } else {
      url.searchParams.set("scope", "read:user user:email");
    }

    window.location.href = url.toString();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 via-amber-100 to-orange-300 px-6 py-12">
      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-black backdrop-blur transition hover:bg-white/60"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[450px] rounded-md bg-white px-7 py-12 shadow-2xl shadow-slate-900/10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-orange-600">VisioX</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Sign In or Sign Up</p>
        </div>

        <div className="mt-8 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-medium text-slate-700">
          <Gift className="mr-2 inline h-4 w-4 text-orange-500" />
          Get <span className="font-bold text-orange-600">$20 extra credits</span> in your first month with company email
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {mode === "choices" ? (
          <div className="mt-6 space-y-5">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="relative flex h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <span className="absolute -top-3 right-[-8px] rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white">
                Last Used
              </span>
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5"
              />
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("github")}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-md bg-[#333333] text-sm font-bold text-white transition hover:bg-[#242424]"
            >
              <Github className="h-5 w-5" />
              Continue with Github
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError("");
              }}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-md bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              <Mail className="h-4 w-4" />
              Continue with Email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                setMode("choices");
                setError("");
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-orange-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Login options
            </button>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
              placeholder="you@company.com"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
              placeholder="Password"
            />

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : cooldown > 0 ? (
                `Try again in ${cooldown}s`
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="mx-auto mt-10 max-w-xs text-center text-xs leading-relaxed text-slate-500">
          By continuing, you are indicating that you accept our{" "}
          <a href="#" className="font-medium text-orange-600 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-orange-600 hover:underline">
            Privacy Policy
          </a>.
        </p>
      </motion.section>
    </main>
  );
}
