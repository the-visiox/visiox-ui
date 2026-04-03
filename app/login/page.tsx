"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import Badge from "@/components/Badge";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await login(email, password);
    if (res.ok) {
       router.push("/overview");
    } else if (res.error) {
       setError(res.error);
       setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-12 sm:px-24 xl:px-32 bg-white relative">
        <div className="max-w-md w-full mx-auto">
          <Link href="/" className="group mb-12 inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to website
          </Link>

          <div className="mb-10 flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
               <Fingerprint className="text-white w-6 h-6" />
             </div>
             <span className="text-stone-900 font-bold text-xl tracking-tight">VisioX</span>
          </div>

          <h2 className="text-3xl font-bold text-stone-900 mb-2">Welcome Back</h2>
          <p className="text-stone-500 mb-8 text-sm">Sign in to your VisioX Workspace to manage your pipelines.</p>

          {error && (
             <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl">
                {error}
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest">Password</label>
                 <a href="#" className="text-[10px] font-bold text-orange-500 hover:underline">Forgot?</a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1c1917] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                 <>
                    Sign In <ArrowRight className="w-4 h-4" />
                 </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-stone-500">
             Don't have an account? <a href="#" className="text-stone-900 font-bold hover:underline">Request Access</a>
          </p>
        </div>
      </div>

      {/* Right Marketing Side */}
      <div className="hidden lg:flex flex-1 bg-[#1c1917] flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888941255-0816962f28fb?q=80&w=1200')] bg-cover bg-center opacity-20" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-transparent" />
         
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 max-w-lg text-center"
         >
            <Badge className="mb-6" accentHex="#ffffff">
               Enterprise Grade
            </Badge>
            <h3 className="text-4xl font-bold text-white mb-6 leading-tight">Secure. Fast. Infinite Scale.</h3>
            <p className="text-stone-400 text-lg leading-relaxed mb-12 px-8">
               VisioX's platform is designed to handle thousands of concurrent video streams with sub-millisecond latency.
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-left px-8">
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                  <h4 className="text-white font-bold mb-1">99.99%</h4>
                  <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Uptime SLA</p>
               </div>
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                  <h4 className="text-white font-bold mb-1">SOC 2</h4>
                  <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Type II Certified</p>
               </div>
            </div>
         </motion.div>
      </div>
    </div>
  );
}
