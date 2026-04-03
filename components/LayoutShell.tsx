"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/platform/Sidebar";
import TopBar from "@/components/platform/TopBar";
import { useAuth } from "@/lib/auth";
import { TOKEN_KEYS } from "@/lib/api";

// Routes that belong to the authenticated platform workspace hubs.
const PLATFORM_ROUTES = ["/overview", "/projects", "/teams", "/datasets", "/workflows", "/train", "/deploy"];
// Routes that show no shell at all (auth pages).
const BARE_ROUTES = ["/login", "/register"];

function isPlatformRoute(path: string) {
  return PLATFORM_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}
function isBareRoute(path: string) {
  return BARE_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // ── Auth Protection ───────────────────────────────────────────
  // Redirect unauthenticated users trying to access platform hubs to /login
  useEffect(() => {
    if (isPlatformRoute(pathname) && !isLoggedIn) {
      // In a real app we might check a cookie or local session here
      // But for this demo, we'll let existing sessions persist.
      // If truly logged out, send to login.
      if (!localStorage.getItem(TOKEN_KEYS.access)) {
        router.push("/login");
      }
    }
  }, [pathname, isLoggedIn, router]);

  // ── Auth / login pages — no chrome ─────────────────────────────
  if (isBareRoute(pathname)) {
    return <div className="min-h-screen bg-[#1c1917]">{children}</div>;
  }

  // ── Authenticated platform workspace ───────────────────────────
  if (isPlatformRoute(pathname)) {
    return (
      <div className="flex min-h-screen bg-[#fcfaf7]">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-grow flex flex-col relative pt-16">{children}</main>
        </div>
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
