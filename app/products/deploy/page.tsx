"use client";

import { motion } from "framer-motion";
import { Cloud, PlaySquare, Server, Link } from "lucide-react";

export default function DeployPage() {
  const features = [
    { title: "One-Click Cloud Hosting", desc: "Instantly deploy your model to an infinitely scalable Kubernetes cluster with auto-scaling APIs instantly generated for you.", icon: <Cloud className="w-6 h-6 text-purple-600" /> },
    { title: "Edge Docker Containers", desc: "Export your model as a highly optimized, lightweight Docker container ready to run on local edge devices, factory floors, or disconnected environments.", icon: <Server className="w-6 h-6 text-purple-600" /> },
    { title: "Hosted Inference API", desc: "Every model automatically receives a secure, RESTful API endpoint. Send images via curl and get JSON bounding boxes back in milliseconds.", icon: <Link className="w-6 h-6 text-purple-600" /> },
    { title: "Interactive UI Sandbox", desc: "Test your live models immediately through a web interface. Upload a picture or stream your webcam right from the browser to verify results.", icon: <PlaySquare className="w-6 h-6 text-purple-600" /> }
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-200 rounded-full mb-8">
            <span className="text-purple-700 text-sm font-bold uppercase tracking-widest">Product Module</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Infinite <br />
            <span className="bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">Deployment</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
            A model is useless if it&apos;s stuck in a notebook. VisioX bridges
            the gap between data science and production, allowing you to deploy
            world-class APIs without DevOps overhead.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 transition-colors text-white font-bold rounded-2xl shadow-xl shadow-purple-600/20">View Deployment Options</button>
            <button className="px-8 py-4 bg-white border border-stone-200 hover:border-stone-300 transition-colors text-stone-700 font-bold rounded-2xl shadow-sm">API Docs</button>
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
                className="group p-8 rounded-3xl bg-stone-50 border border-stone-100 hover:border-purple-200 hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-3">{f.title}</h3>
                <p className="text-stone-500 leading-relaxed group-hover:text-stone-600 transition-colors">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
