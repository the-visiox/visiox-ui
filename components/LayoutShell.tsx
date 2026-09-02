"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/platform/Sidebar";
import { useAuth } from "@/lib/auth";
import { getAccessToken } from "@/lib/api";
import { Loader2 } from "lucide-react";
import BackgroundExportToasts from "@/components/datasets/BackgroundExportToasts";

// Routes that belong to the authenticated platform workspace hubs.
const PLATFORM_ROUTES = [
  "/home",
  "/overview",
  "/projects",
  "/datasets",
  "/dataverse",
  "/workflows",
  "/train",
  "/deploy",
];
// Routes that show no shell at all (auth pages).
const BARE_ROUTES = ["/login", "/register", "/auth/callback"];

function isPlatformRoute(path: string) {
  return PLATFORM_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}
function isBareRoute(path: string) {
  return BARE_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}

/** Full-screen annotation workspace (no sidebar / top bar — canvas brings its own chrome). */
function isAnnotateWorkspace(path: string) {
  return /\/datasets\/[^/]+\/annotate\//.test(path);
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (isPlatformRoute(pathname) && !isLoggedIn && !getAccessToken()) {
      router.push("/login");
    }
  }, [pathname, isLoggedIn, authReady, router]);

  // ── Auth / login pages — no chrome ─────────────────────────────
  if (isBareRoute(pathname)) {
    return <div className="min-h-screen bg-[#1c1917]">{children}</div>;
  }

  if (isPlatformRoute(pathname) && !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfaf7]" role="status" aria-label="Restoring session">
        <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin text-orange-500 motion-reduce:animate-none" />
      </div>
    );
  }

  // ── Annotation terminal (datasets … / annotate / …) ──────────
  if (isAnnotateWorkspace(pathname)) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#fcfaf7] text-stone-900">
        {children}
        <BackgroundExportToasts />
      </div>
    );
  }

  // ── Authenticated platform workspace ───────────────────────────
  if (isPlatformRoute(pathname)) {
    return (
      <div className="flex min-h-screen bg-[#fcfaf7]">
        <Sidebar />
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
          <main className="flex-grow flex flex-col relative">{children}</main>
        </div>
        <BackgroundExportToasts />
      </div>
    );
  }

  // ── Public marketing pages — Header + Footer ───────────────────
  // The home page has its own full-screen snap container and renders the Footer internally.
  const isHomePage = pathname === "/" || pathname === "/VisioX" || pathname === "/VisioX/";

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfaf7]">
      <Header />
      <main className="flex-grow">{children}</main>
      {!isHomePage && <Footer />}
    </div>
  );
}
