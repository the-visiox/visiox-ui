"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Target, Cpu, Globe, ArrowRight } from 'lucide-react';

const sections = [
  {
    subtitle: "Our Mission",
    title: "Intelligence for Every Vision",
    content: "We believe that powerful computer vision shouldn't be restricted to tech giants. VisioX is building the infrastructure to make advanced visual AI accessible to engineers and innovators everywhere.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
    icon: <Target className="w-8 h-8 text-orange-600" />,
    reverse: false
  },
  {
    subtitle: "Technology",
    title: "Built for Performance",
    content: "Our platform leverages cutting-edge algorithms and GPU acceleration to provide real-time inference and seamless annotation of massive datasets, whether in the cloud or on the edge.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    icon: <Cpu className="w-8 h-8 text-orange-600" />,
    reverse: true
  },
  {
    subtitle: "Global Reach",
    title: "Scaling Automation Globally",
    content: "From manufacturing plants in Asia to logistics hubs in Europe, VisioX powers vision systems that handle the world's most complex automation challenges.",
    image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=1200",
    icon: <Globe className="w-8 h-8 text-orange-600" />,
    reverse: false
  }
];

export default function Page() {
  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto border-b border-stone-200">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 border border-stone-200 rounded-full mb-8">
            <span className="text-stone-700 text-sm font-bold uppercase tracking-widest">About Us</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Making Visual AI <br />
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Accessible to Real World</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-3xl mx-auto leading-relaxed mb-4">
            Industrial AI and 3D Vision Systems redefining automation technology solutions for diverse industries globally.
          </p>
        </motion.div>
      </section>

      {/* Dynamic Solomon-style Sections */}
      <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-32">
        {sections.map((sec, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`flex flex-col lg:flex-row items-center gap-16 ${sec.reverse ? 'lg:flex-row-reverse' : ''}`}
          >
            <div className="flex-1 space-y-6">
              <div className="w-16 h-16 bg-white border border-stone-200 shadow-sm rounded-2xl flex items-center justify-center mb-6">
                {sec.icon}
              </div>
              <h4 className="text-orange-600 font-bold tracking-widest uppercase text-sm">{sec.subtitle}</h4>
              <h2 className="text-4xl font-bold text-stone-900 leading-tight">{sec.title}</h2>
              <p className="text-lg text-stone-500 leading-relaxed">
                {sec.content}
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border border-stone-200 group">
                <img
                  src={sec.image}
                  alt={sec.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent" />
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Solomon-style CTA Section */}
      <section className="py-24 px-6 lg:px-8 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-stone-900 mb-6">Have any questions?</h2>
          <p className="text-xl text-stone-500 mb-10 leading-relaxed">
            Get in touch to find out how VisioX can support your project. Our experts are ready to assist with feasibility studies and POCs.
          </p>
          <Link href="/about/contact" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-400 hover:to-orange-300  transition-colors text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 group">
            Get in Touch
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
