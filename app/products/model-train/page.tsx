"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Cpu, Zap, Activity } from "lucide-react";

export default function ModelTrainPage() {
  const features = [
    { title: "AutoML Tuning", desc: "Push-button model deployment. We automatically search hyperparameters and architectures (YOLO, ResNet, ViT) to find the best fit for your data.", icon: <BrainCircuit className="w-6 h-6 text-emerald-600" /> },
    { title: "Edge Optimization", desc: "Compile your trained models directly for edge hardware like NVIDIA Jetson, Coral TPU, or iOS CoreML with zero loss in accuracy.", icon: <Cpu className="w-6 h-6 text-emerald-600" /> },
    { title: "Distributed GPU Training", desc: "Leverage our scalable cloud GPU clusters. Train massive datasets in hours, not weeks.", icon: <Zap className="w-6 h-6 text-emerald-600" /> },
    { title: "Real-time Metrics", desc: "Live visualization of training loss, mAP, and precision/recall curves directly in your web dashboard.", icon: <Activity className="w-6 h-6 text-emerald-600" /> }
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-full mb-8">
            <span className="text-emerald-700 text-sm font-bold uppercase tracking-widest">Product Module</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Advanced <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Model Training</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
            Train state-of-the-art computer vision models with zero code, or
            drop down to custom PyTorch workflows. VisioX makes multi-GPU
            training accessible to every engineer.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20">Start Training</button>
            <button className="px-8 py-4 bg-white border border-stone-200 hover:border-stone-300 transition-colors text-stone-700 font-bold rounded-2xl shadow-sm">View Supported Models</button>
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
                className="group p-8 rounded-3xl bg-stone-50 border border-stone-100 hover:border-emerald-200 hover:shadow-xl transition-all">
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
