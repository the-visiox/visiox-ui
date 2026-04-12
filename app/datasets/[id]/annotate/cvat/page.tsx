"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { datasets, getAccessToken } from "@/lib/api";

const CVAT_URL = process.env.NEXT_PUBLIC_CVAT_URL || "http://localhost:8080";

function buildSsoUrl(cvatTaskUrl: string): string {
  const token = getAccessToken();
  if (!token) return cvatTaskUrl;

  try {
    const parsed = new URL(cvatTaskUrl);
    const taskPath = parsed.pathname + parsed.search;
    return `${CVAT_URL}/api/auth/visiox-sso?token=${encodeURIComponent(token)}&next=${encodeURIComponent(taskPath)}`;
  } catch {
    return cvatTaskUrl;
  }
}

function appendFrameToTaskUrl(cvatTaskUrl: string, frame: string | null): string {
  if (!frame) return cvatTaskUrl;
  try {
    const parsed = new URL(cvatTaskUrl);
    parsed.searchParams.set("frame", frame);
    return parsed.toString();
  } catch {
    return cvatTaskUrl;
  }
}

export default function CVATAnnotatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const [iframeUrl, setIframeUrl] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const frame = searchParams.get("frame");

  useEffect(() => {
    let cancelled = false;
    async function fetchUrl() {
      try {
        const data = await datasets.annotateUrl(id);
        if (cancelled) return;
        if (data.url) {
          const withFrame = appendFrameToTaskUrl(data.url, frame);
          setDirectUrl(withFrame);
          setIframeUrl(buildSsoUrl(withFrame));
        } else {
          setError(data.error || "Failed to fetch CVAT url");
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUrl();
    return () => { cancelled = true; };
  }, [id, frame]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await datasets.syncCvat(id);
      router.push(`/datasets/${id}`);
    } catch (err) {
      setError("Sync failed: " + String(err));
      setSyncing(false);
    }
  }, [id, router]);

  return (
    <div className="flex flex-col h-screen w-full bg-stone-900 overflow-hidden relative">
      <nav className="h-14 shrink-0 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/datasets/${id}`)}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-orange-500 text-white flex items-center justify-center font-bold text-xs">V</div>
            <span className="text-white font-bold text-sm tracking-wide">VisioX Annotation</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {directUrl && (
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-stone-400 hover:text-white px-3 py-2 text-sm font-medium rounded-lg hover:bg-stone-800 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in new tab</span>
            </a>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 text-sm font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync & Back'}</span>
          </button>
        </div>
      </nav>
      
      <main className="flex-grow relative bg-stone-950">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950 text-white z-10">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
            <p className="font-bold">Authenticating & loading annotation interface...</p>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950 z-10">
            <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl text-red-400 max-w-md text-center">
              <p className="font-bold mb-2">Error</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => router.push(`/datasets/${id}`)}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-bold transition-colors"
              >
                Back to Dataset
              </button>
            </div>
          </div>
        )}
        {iframeUrl && (
          <iframe 
            src={iframeUrl} 
            className="w-full h-full border-none"
            title="VisioX Annotation Interface"
            onLoad={() => setLoading(false)}
          />
        )}
      </main>
    </div>
  );
}
