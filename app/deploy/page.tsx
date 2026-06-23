"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlueprintGrid from "@/components/BlueprintGrid";
import {
  Globe, Terminal, Copy, Check, RefreshCw, ExternalLink,
  ShieldCheck, Zap, Cpu, Smartphone, ChevronRight, X, Loader2,
  Play, Square, Plus, Search,
} from "lucide-react";
import {
  deployments,
  type InferenceEndpoint, type ModelRegistry,
} from "@/lib/api";

const STATUS_COLOR: Record<InferenceEndpoint['status'], string> = {
  inactive: 'text-stone-400',
  starting: 'text-blue-500',
  active: 'text-green-500',
  stopping: 'text-orange-400',
  error: 'text-red-500',
};

const STATUS_DOT: Record<InferenceEndpoint['status'], string> = {
  inactive: 'bg-stone-300',
  starting: 'bg-blue-500 animate-pulse',
  active: 'bg-green-500',
  stopping: 'bg-orange-400 animate-pulse',
  error: 'bg-red-500',
};

function SkeletonEndpoint() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse">
      <div className="h-5 bg-stone-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-stone-100 rounded w-1/3" />
    </div>
  );
}

interface NewEndpointModalProps {
  registryList: ModelRegistry[];
  onClose: () => void;
  onCreated: (ep: InferenceEndpoint) => void;
}

function NewEndpointModal({ registryList, onClose, onCreated }: NewEndpointModalProps) {
  const [name, setName] = useState("");
  const [registryId, setRegistryId] = useState<number | "">(registryList[0]?.id ?? "");
  const [confidence, setConfidence] = useState("0.5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registryId) { setError("Select a model from registry."); return; }
    setSaving(true);
    setError("");
    try {
      const ep = await deployments.createEndpoint({
        registry_entry: registryId as number,
        name,
        confidence_threshold: parseFloat(confidence),
      });
      onCreated(ep);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create endpoint");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-950/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md mx-4 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900">New Endpoint</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Endpoint Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PPE-prod"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Model Registry Entry</label>
            <select value={registryId} onChange={e => setRegistryId(Number(e.target.value))} required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              {registryList.length === 0 ? (
                <option value="">No models in registry</option>
              ) : (
                registryList.map(r => <option key={r.id} value={r.id}>{r.name} v{r.version}</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Confidence Threshold</label>
            <input type="number" value={confidence} onChange={e => setConfidence(e.target.value)} min="0" max="1" step="0.05"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name || !registryId}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Globe className="w-4 h-4" />Deploy</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function DeployPage() {
  const [endpoints, setEndpoints] = useState<InferenceEndpoint[]>([]);
  const [registryList, setRegistryList] = useState<ModelRegistry[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<InferenceEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const [epRes, regRes] = await Promise.allSettled([
        deployments.listEndpoints(),
        deployments.listRegistry(),
      ]);
      if (epRes.status === 'fulfilled') {
        const eps = epRes.value.results;
        setEndpoints(eps);
        setSelectedEndpoint(eps.find(e => e.status === 'active') ?? eps[0] ?? null);
      }
      if (regRes.status === 'fulfilled') setRegistryList(regRes.value.results);
      setLoading(false);
    }
    load();
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async (id: number) => {
    setActionId(id);
    try {
      const updated = await deployments.startEndpoint(id);
      setEndpoints(prev => prev.map(e => e.id === id ? updated : e));
      if (selectedEndpoint?.id === id) setSelectedEndpoint(updated);
    } catch {}
    setActionId(null);
  };

  const handleStop = async (id: number) => {
    setActionId(id);
    try {
      const updated = await deployments.stopEndpoint(id);
      setEndpoints(prev => prev.map(e => e.id === id ? updated : e));
      if (selectedEndpoint?.id === id) setSelectedEndpoint(updated);
    } catch {}
    setActionId(null);
  };

  const handleCreated = (ep: InferenceEndpoint) => {
    setEndpoints(prev => [ep, ...prev]);
    setSelectedEndpoint(ep);
    setShowModal(false);
  };

  const endpointUrl = selectedEndpoint?.endpoint_url || '';

  return (
    <div className="relative flex-1 flex flex-col min-h-screen">
      <BlueprintGrid />

      <AnimatePresence>
        {showModal && (
          <NewEndpointModal
            registryList={registryList}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      <main className="flex-grow p-6 z-10">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-stone-200/80 bg-white/80 p-5 shadow-sm shadow-stone-200/50 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-stone-900 md:text-3xl">Cloud & Edge Deploy</h1>
            <p className="max-w-xl text-base leading-6 text-stone-500">
              Manage live endpoints, copy request snippets, and monitor deployment readiness.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search endpoints…"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-100 px-5 text-sm font-bold text-orange-700 shadow-xl shadow-orange-100/60 transition-all hover:bg-orange-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Endpoint</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Panel */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Selected endpoint detail */}
            <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 mb-1">
                    {selectedEndpoint?.name ?? 'No endpoint selected'}
                  </h2>
                  {selectedEndpoint && (
                    <p className="text-xs font-medium text-stone-500 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[selectedEndpoint.status]}`} />
                      <span className={`font-bold ${STATUS_COLOR[selectedEndpoint.status]}`}>
                        {selectedEndpoint.status.charAt(0).toUpperCase() + selectedEndpoint.status.slice(1)}
                      </span>
                    </p>
                  )}
                </div>
                {selectedEndpoint && (
                  <div className="flex gap-2">
                    {selectedEndpoint.status === 'inactive' || selectedEndpoint.status === 'error' ? (
                      <button
                        onClick={() => handleStart(selectedEndpoint.id)}
                        disabled={actionId === selectedEndpoint.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {actionId === selectedEndpoint.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        Start
                      </button>
                    ) : selectedEndpoint.status === 'active' ? (
                      <button
                        onClick={() => handleStop(selectedEndpoint.id)}
                        disabled={actionId === selectedEndpoint.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {actionId === selectedEndpoint.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                        Stop
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {selectedEndpoint && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">API Endpoint</label>
                  <div className="relative group">
                    <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-sm text-stone-600 overflow-hidden pr-20">
                      <span className="truncate">{endpointUrl || '—'}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(endpointUrl)}
                      disabled={!endpointUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl hover:text-orange-500 transition-all shadow-sm disabled:opacity-40"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {selectedEndpoint && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Example Request (Python)</label>
                    <button className="text-[10px] font-bold text-orange-500 flex items-center gap-1 hover:underline">
                      <Terminal className="w-3 h-3" />
                      View Docs
                    </button>
                  </div>
                  <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6 font-mono text-xs text-stone-700 leading-relaxed shadow-inner">
                    <p><span className="text-orange-600">import</span> requests</p>
                    <p className="mt-2 text-stone-500"># Predict using the REST endpoint</p>
                    <p>response = requests.post(</p>
                    <p className="pl-4"><span className="text-orange-600">{`"${endpointUrl}"`}</span>,</p>
                    <p className="pl-4">headers={'{'}Authorization: <span className="text-orange-600">{`"Bearer ${selectedEndpoint.auth_token}"`}</span>{'}'}</p>
                    <p className="pl-4">json={'{'}image_url: <span className="text-orange-600">{`"https://..."`}</span>{'}'}</p>
                    <p>)</p>
                    <p>print(response.json())</p>
                  </div>
                </div>
              )}
            </div>

            {/* Endpoints list */}
            <div>
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">All Endpoints</h3>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonEndpoint key={i} />)
                ) : endpoints.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">No endpoints yet. Deploy a model to get started.</div>
                ) : (
                  endpoints.map(ep => (
                    <button
                      key={ep.id}
                      onClick={() => setSelectedEndpoint(ep)}
                      className={`w-full text-left bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${selectedEndpoint?.id === ep.id ? 'border-orange-500/50 shadow-md' : 'border-stone-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[ep.status]}`} />
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{ep.name}</p>
                            <p className="text-[10px] text-stone-400 font-medium uppercase mt-0.5">
                              {ep.status} · threshold {ep.confidence_threshold}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ep.status === 'inactive' ? (
                            <button
                              onClick={e => { e.stopPropagation(); handleStart(ep.id); }}
                              disabled={actionId === ep.id}
                              className="p-1.5 text-stone-400 hover:text-green-500 transition-colors disabled:opacity-50"
                            >
                              {actionId === ep.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                          ) : ep.status === 'active' ? (
                            <button
                              onClick={e => { e.stopPropagation(); handleStop(ep.id); }}
                              disabled={actionId === ep.id}
                              className="p-1.5 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              {actionId === ep.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                            </button>
                          ) : null}
                          <button
                            onClick={e => { e.stopPropagation(); handleCopy(ep.endpoint_url); }}
                            className="p-1.5 text-stone-400 hover:text-orange-500 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Platform cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Hosted API", icon: Zap, status: "Active", latency: "14ms", desc: "Auto-scalable cloud clusters" },
                { title: "Edge Native", icon: Cpu, status: "Ready", latency: "2ms", desc: "NVIDIA Jetson / OAK-D" },
                { title: "Mobile SDK", icon: Smartphone, status: "Beta", latency: "12ms", desc: "iOS CoreML & Android TFLite" },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-[10px] font-bold text-green-700 rounded-full border border-green-100">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-900 mb-1">{item.title}</h4>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Latency: {item.latency}</p>
                  <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100 text-stone-900 shadow-2xl shadow-orange-100/70 relative overflow-hidden">
              <h3 className="text-xl font-bold mb-4">Usage Analytics</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest text-stone-500">
                    <span>Active Endpoints</span>
                    <span className="text-stone-900">{endpoints.filter(e => e.status === 'active').length} / {endpoints.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: endpoints.length > 0 ? `${(endpoints.filter(e => e.status === 'active').length / endpoints.length) * 100}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest text-stone-500">
                    <span>Safety SLA</span>
                    <span className="text-stone-900">99.99%</span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-100 rounded-full overflow-hidden">
                    <div className="h-full w-[99%] bg-green-500" />
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-orange-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-orange-100">
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none mb-1">Security Status</p>
                  <p className="text-xs font-bold text-stone-900">SOC2 & GDPR Compliant</p>
                </div>
              </div>

              <div className="absolute top-0 right-0 p-8 opacity-10">
                <RefreshCw className="w-24 h-24 rotate-[30deg]" />
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-900">API Documentation</h3>
                <ExternalLink className="w-4 h-4 text-stone-300" />
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                Integrate your detection models into any application using our SDKs and REST endpoints.
              </p>
              <div className="space-y-3">
                {["Python SDK", "Node.js Client", "C++ Engine", "Swift / iOS"].map((lib, i) => (
                  <button key={i} className="w-full flex justify-between items-center p-3 bg-stone-50 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all">
                    {lib}
                    <ChevronRight className="w-4 h-4 text-stone-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
