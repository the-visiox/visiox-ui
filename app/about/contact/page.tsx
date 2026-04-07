"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 border border-stone-200 rounded-full mb-8">
            <span className="text-stone-700 text-sm font-bold uppercase tracking-widest">Connect With Us</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
            Let's build your <br />
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Vision Pipeline</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-16">
            Whether you need a custom enterprise solution, deep technical support, or a quick demo of our platform, our vision engineers are ready to chat.
          </p>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form Simulation */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">First Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Last Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Work Email</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Project Details</label>
                  <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"></textarea>
                </div>
                <button type="button" className="w-full py-4 text-white font-bold bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-lg shadow-orange-600/20">
                  Submit Request
                </button>
              </form>
            </div>

            {/* Direct Contact Info */}
            <div className="flex flex-col gap-8 justify-center lg:pl-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-stone-200 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-1">Email</h3>
                  <p className="text-stone-500">Sales: enterprise@visiox.ai</p>
                  <p className="text-stone-500">Support: help@visiox.ai</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-stone-200 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-1">Phone</h3>
                  <p className="text-stone-500">US: +1 (800) 555-0199</p>
                  <p className="text-stone-500">UK: +44 20 7123 4567</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-stone-200 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-1">Headquarters</h3>
                  <p className="text-stone-500">100 Visionary Way</p>
                  <p className="text-stone-500">San Francisco, CA 94107</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
