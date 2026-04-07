"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

export default function BlogPage() {
  const posts = [
    { title: "The Future of Edge AI Computing", category: "Engineering", date: "Oct 24, 2026", desc: "How compiling YOLOv10 directly to edge TPU hardware is changing factory floor inspections.", image: "/solutions/healthcare-medical.jpg" },
    { title: "Announcing VisioX Foundation Models", category: "Product", date: "Oct 12, 2026", desc: "Our massive zero-shot foundational models can now auto-annotate 95% of your datasets instantly.", image: "/solutions/smart-agriculture.jpg" },
    { title: "Why Retail Needs Computer Vision Now", category: "Industry", date: "Sept 30, 2026", desc: "Preventing shrink and automating checkout queues using real-time spatial intelligence.", image: "/solutions/retail-commerce.jpg" }
  ];

  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-200 rounded-full mb-8">
            <span className="text-orange-700 text-sm font-bold uppercase tracking-widest">News & Insights</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            The VisioX <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Blog</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-16">
            Dive deep into computer vision engineering, product updates, and how AI is rapidly transforming physical industries.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all flex flex-col cursor-pointer">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded">{post.category}</span>
                    <span className="text-xs font-medium text-stone-400">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3 group-hover:text-orange-600 transition-colors">{post.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed mb-6 flex-1">{post.desc}</p>
                  <div className="flex items-center text-sm font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                    Read Article <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
