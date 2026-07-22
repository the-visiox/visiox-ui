"use client";

import { motion } from "framer-motion";
import { Workflow, Network, CheckCircle, RefreshCw } from "lucide-react";

export default function WorkflowsPage() {
  const features = [
    {
      title: "Visual Logic Builder",
      desc: [
        "Drag and drop models, conditional statements, and actions into a unified flow.",
        "Eg: If Model A detects a defect, send an email via Webhook B.",
      ].join(" "),
      icon: <Workflow className="w-6 h-6 text-rose-600" />,
    },
    {
      title: "Multi-Model Ensembles",
      desc: [
        "Pipeline multiple models together. Use an Object Detection model to find",
        "faces, and route the crop to a Facial Recognition classifier.",
      ].join(" "),
      icon: <Network className="w-6 h-6 text-rose-600" />,
    },
    {
      title: "Active Learning Loops",
      desc: [
        "Automatically route low-confidence model predictions back into your annotation",
        "queue for human review, continuously improving your AI.",
      ].join(" "),
      icon: <RefreshCw className="w-6 h-6 text-rose-600" />,
    },
    {
      title: "Third-Party Integrations",
      desc: [
        "Push native events to Slack, Jira, AWS S3, or custom enterprise webhooks",
        "exactly when specific visual criteria are met.",
      ].join(" "),
      icon: <CheckCircle className="w-6 h-6 text-rose-600" />,
    },
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div
            className={[
              "inline-flex items-center gap-2 px-4 py-2 bg-rose-100 border border-rose-200 rounded-full",
              "mb-8",
            ].join(" ")}
          >
            <span className="text-rose-700 text-sm font-bold uppercase tracking-widest">Product Module</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Intelligent <br />
            <span className="bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">Workflows</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
            Chain models, logic, and integrations together in a powerful visual editor. Turn raw AI predictions into
            business-critical actions without writing custom middleware.
          </p>
          <div className="flex gap-4">
            <button
              className={[
                "px-8 py-4 bg-rose-600 hover:bg-rose-700 transition-colors text-white font-bold",
                "rounded-2xl shadow-xl shadow-rose-600/20",
              ].join(" ")}
            >
              Build a Workflow
            </button>
            <button
              className={[
                "px-8 py-4 bg-white border border-stone-200 hover:border-stone-300 transition-colors",
                "text-stone-700 font-bold rounded-2xl shadow-sm",
              ].join(" ")}
            >
              Watch Tutorial
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
                  "group p-8 rounded-3xl bg-stone-50 border border-stone-100 hover:border-rose-200",
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
