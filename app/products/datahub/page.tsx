"use client";

import { motion } from "framer-motion";
import { Database, Search, ShieldCheck, Share2 } from "lucide-react";

export default function DatahubPage() {
  const features = [
    {
      title: "Petabyte-Scale Storage",
      desc: [
        "Reliably ingest, store, and manage massive datasets of images and video",
        "without worrying about infrastructure bottlenecks.",
      ].join(" "),
      icon: <Database className="w-6 h-6 text-blue-600" />,
    },
    {
      title: "Semantic Search",
      desc: [
        "Find the exact frames you need using natural language queries like 'find red",
        "cars in the rain'. No manual tagging required.",
      ].join(" "),
      icon: <Search className="w-6 h-6 text-blue-600" />,
    },
    {
      title: "Enterprise Security",
      desc: [
        "End-to-end encryption, SOC2 compliance, and granular Role-Based Access Control",
        "(RBAC) to ensure your proprietary IP remains safe.",
      ].join(" "),
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
    },
    {
      title: "Collaborative Workspaces",
      desc: "Share isolated views of datasets with third-party labeling teams or external stakeholders seamlessly.",
      icon: <Share2 className="w-6 h-6 text-blue-600" />,
    },
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div
            className={[
              "inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full",
              "mb-8",
            ].join(" ")}
          >
            <span className="text-blue-700 text-sm font-bold uppercase tracking-widest">Product Module</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Centralized <br />
            <span
              className={["bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text", "text-transparent"].join(" ")}
            >
              Data Hub
            </span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
            A single source of truth for all your visual data. The VisioX Data Hub allows you to aggregate, search, and
            curate datasets before they ever hit the training pipeline.
          </p>
          <div className="flex gap-4">
            <button
              className={[
                "px-8 py-4 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold",
                "rounded-2xl shadow-xl shadow-blue-600/20",
              ].join(" ")}
            >
              Upload Dataset
            </button>
            <button
              className={[
                "px-8 py-4 bg-white border border-stone-200 hover:border-stone-300 transition-colors",
                "text-stone-700 font-bold rounded-2xl shadow-sm",
              ].join(" ")}
            >
              Read Documentation
            </button>
          </div>
        </motion.div>
      </section>

      <section className="py-24 px-6 lg:px-8 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={[
                  "group p-8 rounded-3xl bg-stone-50 border border-stone-100 hover:border-blue-200",
                  "hover:shadow-xl transition-all",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-14 h-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center",
                    "mb-6 shadow-sm group-hover:scale-110 transition-transform",
                  ].join(" ")}
                >
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-3">{f.title}</h3>
                <p
                  className={["text-stone-500 leading-relaxed group-hover:text-stone-600", "transition-colors"].join(
                    " ",
                  )}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
