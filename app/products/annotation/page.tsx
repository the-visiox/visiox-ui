"use client";

import { motion } from "framer-motion";
import { PenTool, BoxSelect, Sparkles, Layers } from "lucide-react";

export default function AnnotationPage() {
  const features = [
    { title: "Smart Polygon Tools", desc: "Auto-snap polygons to object edges using our proprietary edge detection algorithms, reducing human clicks by 80%.", icon: <PenTool className="w-6 h-6 text-orange-600" /> },
    { title: "Bounding Boxes & Keypoints", desc: "Rapid entity tagging with predictive box sizing. Excellent for tracking skeletal joints and dense objects.", icon: <BoxSelect className="w-6 h-6 text-orange-600" /> },
    { title: "Semantic Segmentation", desc: "Pixel-perfect classification for complex backgrounds. Our AI-assisted wand tool isolates masks instantly.", icon: <Layers className="w-6 h-6 text-orange-600" /> },
    { title: "AI Pre-labeling", desc: "Upload your raw dataset and let our foundational models pre-annotate 90% of your images before humans even review.", icon: <Sparkles className="w-6 h-6 text-orange-600" /> }
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-200 rounded-full mb-8">
            <span className="text-orange-700 text-sm font-bold uppercase tracking-widest">Product Module</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Pixel-Perfect <br />
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Data Annotation</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
            The foundation of every great computer vision model is pristine
            data. VisioX offers an enterprise-grade annotation suite that
            marries human precision with AI-assisted speed.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-orange-600 hover:bg-orange-700 transition-colors text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20">Start Labeling</button>
            <button className="px-8 py-4 bg-white border border-stone-200 hover:border-stone-300 transition-colors text-stone-700 font-bold rounded-2xl shadow-sm">View Workflows</button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 lg:px-8 bg-white border-t border-stone-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-3xl bg-stone-50 border border-stone-100 hover:border-orange-200 hover:shadow-xl transition-all">
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
