"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import { useAuth } from "@/lib/auth";
import { assetPath } from "@/lib/assets";
import Footer from "@/components/Footer";

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [demoIndex, setDemoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null);
  const [autoHoveredPartnerIndex, setAutoHoveredPartnerIndex] = useState(0);
  const { isLoggedIn } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const ALL_PARTNERS = [
    "nvidia", "intel", "apple", "google", "microsoft", // Primary
    "yaskawa", "siemens", "abb", "bosch"               // Secondary
  ];

  const DEMO_IMAGES = [
    {
      id: 1,
      title: "Surveillance",
      src: assetPath("/demo/surveillance.png"),
      boxes: [
        { id: 1, label: "OK", top: "28%", left: "19%", width: "16%", height: "44%", color: "#00ff4cff" },
        { id: 2, label: "No PPE", top: "30%", left: "80%", width: "13%", height: "42%", color: "#ff0000ff" }
      ]
    },
    {
      id: 2,
      title: "Agriculture",
      src: assetPath("/demo/agriculture.png"),
      boxes: [
        { id: 1, label: "Apple", top: "4%", left: "22.5%", width: "7%", height: "9%", color: "#00ff4cff" },
        { id: 2, label: "Apple", top: "12%", left: "3%", width: "9%", height: "13%", color: "#00ff4cff" },
        { id: 3, label: "Apple", top: "42%", left: "7%", width: "9%", height: "12%", color: "#00ff4cff" },
        { id: 4, label: "Apple", top: "30%", left: "30%", width: "7%", height: "12%", color: "#00ff4cff" },
        { id: 5, label: "Apple", top: "12%", left: "59%", width: "9%", height: "12%", color: "#00ff4cff" },
        { id: 6, label: "Apple", top: "57%", left: "2%", width: "8%", height: "11%", color: "#00ff4cff" },
      ]
    },
    {
      id: 3,
      title: "Robotics",
      src: assetPath("/demo/robotics.png"),
      boxes: [
        { id: 1, label: "Baseball", top: "48%", left: "51%", width: "17%", height: "23%", color: "#FBBF24" },
        { id: 2, label: "Baseball", top: "68%", left: "42%", width: "19%", height: "24%", color: "#FBBF24" },
        { id: 3, label: "Baseball", top: "60%", left: "2%", width: "18%", height: "20%", color: "#FBBF24" }
      ]
    },
    {
      id: 4,
      title: "Manufacturing",
      src: assetPath("/demo/manufacturing.png"),
      boxes: [
        { id: 1, label: "Blister Pack", top: "7%", left: "14%", width: "73%", height: "84%", color: "#4866ecff" },
        { id: 2, label: "OK", top: "20%", left: "18%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 3, label: "OK", top: "34%", left: "18%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 4, label: "OK", top: "48%", left: "18.7%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 5, label: "OK", top: "62.5%", left: "18.5%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 6, label: "OK", top: "76%", left: "19%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 7, label: "OK", top: "76%", left: "36%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 8, label: "OK", top: "19%", left: "35%", width: "11%", height: "7%", color: "#00ff4cff" },
        { id: 9, label: "OK", top: "19%", left: "52.6%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 10, label: "OK", top: "33.5%", left: "52.6%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 11, label: "OK", top: "61.5%", left: "52.6%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 12, label: "OK", top: "75.7%", left: "52.8%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 13, label: "OK", top: "19%", left: "70%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 14, label: "OK", top: "33%", left: "70.2%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 15, label: "OK", top: "47.3%", left: "70.5%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 16, label: "OK", top: "61.6%", left: "70.5%", width: "10.5%", height: "7%", color: "#00ff4cff" },
        { id: 17, label: "OK", top: "75.8%", left: "70.5%", width: "10.5%", height: "7%", color: "#00ff4cff" },
      ]
    },
    {
      id: 5,
      title: "Transportation",
      src: assetPath("/demo/transportation.png"),
      boxes: [
        { id: 1, label: "Car", top: "44%", left: "16%", width: "10%", height: "8%", color: "#f63b3bff" },
        { id: 2, label: "Car", top: "50%", left: "32.7%", width: "8%", height: "11.5%", color: "#f63b3bff" },
        { id: 3, label: "Car", top: "69%", left: "56%", width: "13.5%", height: "17%", color: "#f63b3bff" },
        { id: 4, label: "Car", top: "68%", left: "70.5%", width: "15%", height: "20%", color: "#f63b3bff" },
        { id: 5, label: "Car", top: "10%", left: "75%", width: "8%", height: "15%", color: "#f63b3bff" },
        { id: 6, label: "Car", top: "10%", left: "75%", width: "8%", height: "15%", color: "#f63b3bff" },

      ]
    }
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % DEMO_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [DEMO_IMAGES.length, isPaused]);

  // Removed timer-based auto hover in favor of position-based tracking in the roll

  const slideNames = ["Hero", "Features", "Impact", "CTA", "Partners"];

  return (
    <div className="h-screen overflow-y-scroll overflow-x-hidden md:snap-y md:snap-mandatory scroll-smooth relative w-full">
      {/* Side Navigation Dots */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-6 p-4 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
        <div className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-orange-500/30 to-transparent" />
        {slideNames.map((name, index) => (
          <div key={index} className="relative group">
            <button
              onClick={() => {
                const element = document.getElementById(`slide-${index}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-3 h-3 rounded-full transition-all duration-500 relative z-10 ${activeSlide === index
                ? 'bg-gradient-to-r from-[#FF7300] to-[#F1A222] scale-150 shadow-[0_0_15px_rgba(255,115,0,0.5)]'
                : 'bg-stone-500 scale-100 hover:bg-orange-400'
                }`}
              aria-label={`Go to slide ${name}`}
            />
            <span className="absolute right-10 top-1/2 -translate-y-1/2 px-3 py-1 bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Slide 1 - Hero */}
      <motion.section
        id="slide-0"
        onViewportEnter={() => setActiveSlide(0)}
        layout
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false, amount: 0.5 }}
        className="min-h-screen md:h-screen snap-start bg-[#fcfaf7] flex items-center justify-center px-6 lg:px-8 relative py-20 lg:py-0"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-stone-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-screen-2xl mx-auto w-full z-10 px-4 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="lg:col-span-5 space-y-8">
              <Badge className="mt-8">
                ✨ Next-Gen Visual Platform
              </Badge>

              <h1 className="text-4xl lg:text-7xl font-bold leading-tight text-stone-900">
                <span className="bg-gradient-to-r from-[#E66700] via-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">
                  Intelligent Computer Vision Platform
                </span>
              </h1>

              <p className="text-lg lg:text-2xl text-stone-600 leading-relaxed max-w-xl">
                Transform your visual data into actionable insights with our cutting-edge AI-powered annotation and analysis tools.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href={isLoggedIn ? "/overview" : "/login"} className="w-full sm:w-auto">
                  <button className="group w-full sm:w-56 h-16 px-8 
                                    bg-gradient-to-r from-orange-600 to-orange-400 
                                    hover:scale-105 active:scale-95 hover:from-orange-400 hover:to-orange-300 
                                    text-white rounded-2xl transition-all duration-300 font-semibold text-lg flex 
                                    items-center justify-center gap-2 shadow-xl shadow-orange-500/30">
                    <span>{isLoggedIn ? "Go to Workspace" : "Start Free Trial"}</span>
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </Link>

                <button className="w-full sm:w-56 h-16 px-8 bg-white hover:bg-gray-100 hover:scale-105 active:scale-95 text-stone-900 rounded-2xl transition-all duration-300 font-semibold text-lg border-2 border-stone-200 backdrop-blur-sm">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Right Content - Demo Visual */}
            <div className="lg:col-span-7 relative">
              <div className="relative bg-white rounded-3xl p-6 border-2 border-stone-200 shadow-2xl flex gap-6">

                {/* Side Navigation Images */}
                <div className="hidden md:flex flex-col gap-3 justify-center border-r border-stone-100 pr-4">
                  {DEMO_IMAGES.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setDemoIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 group ${idx === demoIndex
                        ? 'border-orange-500 scale-110 shadow-lg shadow-orange-200'
                        : 'border-stone-100 opacity-40 hover:opacity-100 hover:border-stone-300'
                        }`}
                    >
                      <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 bg-orange-500/10 transition-opacity ${idx === demoIndex ? 'opacity-100' : 'opacity-0'}`} />

                      {/* Tooltip */}
                      <span className="absolute left-full ml-4 px-2 py-1 bg-stone-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                        {img.title}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex-1">
                  {/* Main Content Area */}
                  <div
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="bg-stone-100 rounded-2xl aspect-[4/3] relative overflow-hidden border-2 border-stone-200 group/demo"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={demoIndex}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-0"
                      >
                        <img
                          src={DEMO_IMAGES[demoIndex].src}
                          alt={DEMO_IMAGES[demoIndex].title}
                          className="w-full h-full object-cover"
                        />

                        {/* Overlay Gradient for better label readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                        {DEMO_IMAGES[demoIndex].boxes.map((box, bIdx) => (
                          <motion.div
                            key={box.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 + (bIdx * 0.1), type: "spring", stiffness: 100 }}
                            className="absolute border-2 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                            style={{
                              top: box.top,
                              left: box.left,
                              width: box.width,
                              height: box.height,
                              borderColor: box.color,
                              backgroundColor: `${box.color}10`
                            }}
                          >
                            <div
                              className="absolute -top-7 left-0 px-2 py-1 rounded text-[10px] text-white font-bold shadow-lg backdrop-blur-sm"
                              style={{ backgroundColor: box.color }}
                            >
                              {box.label}
                            </div>

                            {/* Corner accents */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/50" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/50" />
                          </motion.div>
                        ))}

                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(139,92,246,0.05)_50%,transparent_100%)] bg-[size:100%_4px] h-20 w-full animate-scan pointer-events-none" />
                      </motion.div>
                    </AnimatePresence>

                    {/* Image Title Overlay */}
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <span className="text-white text-xs font-bold tracking-wider uppercase drop-shadow-md">
                        {DEMO_IMAGES[demoIndex].title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-sm text-stone-500 font-medium">Scroll to explore</span>
          <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </motion.section>

      {/* Slide 2 - Advanced Capabilities */}
      <motion.section
        id="slide-1"
        onViewportEnter={() => setActiveSlide(1)}
        layout
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false, amount: 0.5 }}
        className="min-h-screen md:h-screen snap-start bg-[#fcfaf7] flex items-center justify-center px-6 lg:px-8 relative py-20 lg:py-0"
      >
        <div className="max-w-7xl mx-auto w-full text-center">
          <div className="mb-6 lg:mb-10">
            <h2 className="text-3xl lg:text-6xl font-bold text-stone-900 mb-3 px-4">
              <span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Powerful</span> Features,
              <span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent"> Advanced</span> Capabilities
            </h2>
            <p className="text-stone-600 text-lg lg:text-xl font-medium px-4">Everything you need for professional computer vision projects</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 4 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Lightning Fast</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">Process thousands of images with optimized performance and real-time collaboration.</p>
            </div>

            {/* Capability 5 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Secure & Private</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">Enterprise-grade security with data encryption and compliance standards for all data.</p>
            </div>

            {/* Capability 6 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Smart Annotation</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">AI-assisted tools that speed up your workflow with intelligent suggestions and auto-labeling.</p>
            </div>

            {/* Capability 1 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Real-time Analytics</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">Monitor and analyze visual data streams in real-time with ultra-low latency processing.</p>
            </div>

            {/* Capability 2 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Multi-Modal Support</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">Seamlessly handle image, video, and 3D point cloud data within a single unified environment.</p>
            </div>

            {/* Capability 3 */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-500 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF7300] to-[#F1A222] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Global Scalability</h3>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">Architected to support massive datasets and high-concurrency workflows for teams worldwide.</p>
            </div>

          </div>
        </div>
      </motion.section>

      {/* Slide 3 - Stats Impact & Applications Content */}
      <motion.section
        id="slide-2"
        onViewportEnter={() => setActiveSlide(2)}
        layout
        initial={{ opacity: 0, scale: 1.05 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false, amount: 0.5 }}
        className="min-h-screen md:h-screen snap-start bg-stone-900 flex items-center justify-center px-6 lg:px-8 relative py-20 lg:py-0"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-stone-900 to-black"></div>
        <div className="max-w-7xl mx-auto text-center z-10 w-full px-4">
          <div className="mb-8 lg:mb-16">
            <h2 className="text-4xl lg:text-8xl font-bold text-white mb-6">
              Global Scale,
              <br />
              <span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">
                Proven Impact
              </span>
            </h2>
            <p className="text-lg lg:text-xl text-stone-400 max-w-2xl mx-auto font-medium">
              Join 50K+ innovators transforming industries with our high-fidelity vision intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20 px-8">
            <div className="group p-10 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-500">
              <div className="text-7xl font-bold text-white mb-4 group-hover:scale-110 transition-transform">50K+</div>
              <div className="text-lg text-orange-500/80 font-bold tracking-widest uppercase">Global Users</div>
            </div>
            <div className="group p-10 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-500">
              <div className="text-7xl font-bold text-white mb-4 group-hover:scale-110 transition-transform">1M+</div>
              <div className="text-lg text-orange-500/80 font-bold tracking-widest uppercase">Annotations</div>
            </div>
            <div className="group p-10 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-500">
              <div className="text-7xl font-bold text-white mb-4 group-hover:scale-110 transition-transform">99.9</div>
              <div className="text-lg text-orange-500/80 font-bold tracking-widest uppercase">% Uptime</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Slide 4 - CTA */}
      <motion.section
        id="slide-3"
        onViewportEnter={() => setActiveSlide(3)}
        layout
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false, amount: 0.5 }}
        className="min-h-screen md:h-screen snap-start bg-gradient-to-br from-[#FF7300] via-[#E66700] to-[#F1A222] flex items-center justify-center px-6 lg:px-8 relative py-20 lg:py-0"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center z-10 px-4">
          <h2 className="text-4xl lg:text-9xl font-bold text-white mb-6 lg:mb-8 leading-tight">
            Ready to
            <br />
            get started?
          </h2>
          <p className="text-xl lg:text-3xl text-white/90 mb-8 lg:mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of teams transforming their visual data into insights
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button className="group w-full sm:w-64 h-20 px-10 bg-white hover:bg-stone-50 hover:scale-110 text-stone-900 rounded-2xl transition-all duration-300 font-bold text-xl flex items-center justify-center gap-2 shadow-2xl">
              <span>Start Free Trial</span>
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button className="w-full sm:w-64 h-20 px-10 bg-white/10 hover:bg-white/20 backdrop-blur-lg hover:scale-110 active:scale-95 text-white rounded-2xl transition-all duration-300 font-bold text-xl border-2 border-white/30">
              Contact Sales
            </button>
          </div>
        </div>
      </motion.section>

      <motion.section
        id="slide-4"
        onViewportEnter={() => setActiveSlide(4)}
        layout
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false, amount: 0.4 }}
        className="min-h-screen md:h-screen snap-start bg-[#f5f2ed] flex flex-col pt-16 py-10 lg:py-0"
      >
        <div className="flex-grow flex items-center justify-center px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full py-8 text-center">

            {/* Title */}
            <div className="mb-8">
              <h2 className="text-5xl lg:text-6xl font-bold text-stone-900 mb-4">
                Trusted by{" "}
                <span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">
                  leading partners
                </span>
              </h2>
              <p className="text-stone-600 text-xl font-medium">
                Powering the next generation of computer vision worldwide
              </p>
            </div>

            {/* Divider */}
            <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent mx-auto mb-14" />

            {/* Partner Logo Roll */}
            <div className="relative mt-10 w-full overflow-hidden py-10">
              {/* Fade masks for left/right edges */}
              <div className="absolute left-0 top-0 bottom-0 w-32 lg:w-48 bg-gradient-to-r from-[#f5f2ed] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-32 lg:w-48 bg-gradient-to-l from-[#f5f2ed] to-transparent z-10 pointer-events-none" />

              <motion.div
                ref={containerRef}
                className="flex whitespace-nowrap gap-16 lg:gap-24 items-center w-max"
                animate={{
                  x: ["-50%", "0%"]
                }}
                onUpdate={(latest) => {
                  if (typeof latest.x !== "string" || !containerRef.current) return;

                  const container = containerRef.current;
                  const rect = container.getBoundingClientRect();
                  const centerLine = window.innerWidth / 2;

                  const children = container.children;
                  let closestVal = Infinity;
                  let closestIndex = 0;

                  for (let i = 0; i < children.length; i++) {
                    const childRect = children[i].getBoundingClientRect();
                    const childCenter = childRect.left + childRect.width / 2;
                    const distance = Math.abs(centerLine - childCenter);

                    if (distance < closestVal) {
                      closestVal = distance;
                      closestIndex = i % 9; // Modulo by total partners (9)
                    }
                  }

                  if (closestIndex !== autoHoveredPartnerIndex) {
                    setAutoHoveredPartnerIndex(closestIndex);
                  }
                }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 40,
                    ease: "linear"
                  }
                }}
              >
                {/* Repeated list for seamless loop */}
                {[...ALL_PARTNERS, ...ALL_PARTNERS].map((logo, idx) => {
                  const isActive = hoveredPartner ? hoveredPartner === logo : ALL_PARTNERS[autoHoveredPartnerIndex] === logo;

                  return (
                    <div
                      key={`${logo}-${idx}`}
                      className="flex-shrink-0 group flex items-center justify-center"
                      onMouseEnter={() => setHoveredPartner(logo)}
                      onMouseLeave={() => setHoveredPartner(null)}
                    >
                      <img
                        src={assetPath(`/logos/${logo}.svg`)}
                        alt={logo}
                        className={`
                          h-9 lg:h-11
                          ${isActive ? "opacity-100 grayscale-0 scale-110" : "opacity-40 grayscale"}
                          transition-all duration-500
                          group-hover:opacity-100
                          group-hover:grayscale-0
                          group-hover:scale-110
                        `}
                      />
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* View Applications Button */}
            <div className="mt-20 flex justify-center">
              <Link href="/solutions">
                <button className="group w-full sm:w-70 h-16 px-8 
                                    bg-gradient-to-r from-orange-600 to-orange-400 
                                    hover:scale-105 active:scale-95 hover:from-orange-400 hover:to-orange-300 
                                    text-white rounded-2xl transition-all duration-300 font-semibold text-lg flex 
                                    items-center justify-center gap-2 shadow-xl shadow-orange-500/30">
                  <span>Explore Applications</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </Link>
            </div>

          </div>
        </div>

        <div className="mt-auto w-full">
          <Footer />
        </div>
      </motion.section>
    </div>
  );
}
