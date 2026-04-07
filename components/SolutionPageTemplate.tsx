"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Badge from "@/components/Badge";
import { ArrowRight, Zap } from "lucide-react";
import { ReactNode } from "react";

/* ───── Types ───── */
export interface SolutionCapability {
    title: string;
    description: string;
    icon: ReactNode;
}

export interface SolutionUseCase {
    title: string;
    tag: string;           // industry / sport / facility / city / location
    description: string;
    image: string;
    metric: string;
}

export interface SolutionStat {
    label: string;
    value: string;
    icon: ReactNode;
}

export interface SolutionPageConfig {
    /* ── Theme ── */
    accentColor: string;          // tailwind color name, e.g. "orange", "emerald", "violet"
    accentHex: string;            // e.g. "#FF7300"
    bgTint: string;               // page background tailwind class, e.g. "bg-[#fcfaf7]"
    gradientFrom: string;         // gradient start class
    gradientTo: string;           // gradient end class

    /* ── Hero ── */
    badge: string;                // e.g. "Next-Gen Engagement"
    badgeIcon: ReactNode;
    title: ReactNode;             // can include <br/> and <span> for gradient
    subtitle: string;
    heroImage: string;
    heroCTAPrimary: string;
    heroCTASecondary: string;

    /* ── Stats ── */
    stats: SolutionStat[];

    /* ── Capabilities ── */
    capabilitiesTitle: string;
    capabilitiesSubtitle: string;
    capabilities: SolutionCapability[];

    /* ── Use Cases ── */
    useCasesTitle: string;
    useCases: SolutionUseCase[];

    /* ── CTA ── */
    ctaTitle: string;
    ctaSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
}

/* ───── Component ───── */
export default function SolutionPageTemplate({ config }: { config: SolutionPageConfig }) {
    const {
        accentColor, accentHex, bgTint, gradientFrom, gradientTo,
        badge, badgeIcon, title, subtitle, heroImage,
        heroCTAPrimary, heroCTASecondary,
        stats,
        capabilitiesTitle, capabilitiesSubtitle, capabilities,
        useCasesTitle, useCases,
        ctaTitle, ctaSubtitle, ctaPrimary, ctaSecondary,
    } = config;

    return (
        <div className={`min-h-screen ${bgTint} overflow-x-hidden`}>
            {/* ═══════ HERO ═══════ */}
            <section className="relative pt-32 pb-20 px-6 lg:px-8 bg-white overflow-hidden min-h-[85vh] flex flex-col justify-center">
                {/* Background ambience */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-30"
                        style={{ backgroundColor: accentHex }} />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-stone-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Text content */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 mb-6">
                                <Link href="/solutions" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">Solutions</Link>
                                <span className="text-stone-300">/</span>
                                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: accentHex }}>{badge}</span>
                            </div>

                            {/* Badge */}
                            <Badge className="mb-8" accentHex={accentHex} icon={badgeIcon}>
                                {badge}
                            </Badge>

                            <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-8 leading-[1.1] tracking-tight">
                                {title}
                            </h1>

                            <p className="text-xl text-stone-600 mb-10 leading-relaxed max-w-xl">
                                {subtitle}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button className="px-10 py-4 text-white rounded-2xl font-bold transition-all shadow-xl hover:-translate-y-0.5"
                                    style={{ backgroundColor: accentHex }}>
                                    {heroCTAPrimary}
                                </button>
                                <button className="px-10 py-4 bg-white text-stone-900 border border-stone-200 rounded-2xl font-bold hover:bg-stone-50 transition-colors">
                                    {heroCTASecondary}
                                </button>
                            </div>
                        </motion.div>

                        {/* Hero image */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                                <img
                                    src={heroImage}
                                    alt={badge}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════ COMBINED STATS & CAPABILITIES ═══════ */}
            <section className="bg-white px-6 lg:px-8 pt-16 pb-24 relative z-20">
                <div className="max-w-7xl mx-auto">
                    {/* STATS BAR */}
                    <div className="rounded-[2.5rem] shadow-xl shadow-stone-200/50 py-8 px-6 lg:py-10 lg:px-12 mb-24 relative overflow-hidden z-10"
                        style={{ backgroundColor: accentHex }}>
                        {/* Decorative glow inside stats */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center relative z-10">
                            {stats.map((stat, i) => (
                                <div key={i} className="space-y-3 group">
                                    <div className="mx-auto w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-white">
                                        {stat.icon}
                                    </div>
                                    <div className="text-4xl lg:text-5xl font-black text-white">{stat.value}</div>
                                    <p className="text-white/70 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CAPABILITIES */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-5xl font-bold text-stone-900 mb-6">{capabilitiesTitle}</h2>
                        <p className="text-lg text-stone-600 max-w-2xl mx-auto">{capabilitiesSubtitle}</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {capabilities.map((item, i) => (
                            <div key={i} className="p-8 bg-stone-50/50 rounded-3xl border border-stone-100 hover:bg-white hover:shadow-2xl hover:border-stone-200 transition-all duration-300 group">
                                <div className="mb-6 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                                    style={{ boxShadow: `0 4px 14px ${accentHex}15` }}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                                <p className="text-stone-500 text-sm leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ USE CASES ═══════ */}
            <section className="pt-24 pb-8 md:pb-16 px-6 lg:px-8 bg-stone-50 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div>
                            <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-stone-900">{useCasesTitle}</h2>
                            <div className="w-20 h-1 rounded-full" style={{ backgroundColor: accentHex }} />
                        </div>
                        <Link href="/contact" className="inline-flex items-center font-bold group transition-all" style={{ color: accentHex }}>
                            View all case studies
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {useCases.map((useCase, i) => (
                            <div key={i} className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-xl transition-all">
                                {/* Image */}
                                <div className="relative h-56 overflow-hidden">
                                    <img
                                        src={useCase.image}
                                        alt={useCase.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <Badge className="absolute top-4 left-4" accentHex={accentHex}>
                                        {useCase.tag}
                                    </Badge>
                                </div>

                                {/* Content */}
                                <div className="p-8 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold mb-3 text-stone-900">{useCase.title}</h3>
                                    <p className="text-stone-500 text-sm mb-6 leading-relaxed flex-1">{useCase.description}</p>
                                    <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Impact</span>
                                        <span className="flex items-center gap-2 text-lg font-black" style={{ color: accentHex }}>
                                            <Zap className="w-4 h-4" />
                                            {useCase.metric}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ CTA ═══════ */}
            <section className="pt-8 md:pt-16 pb-12 md:pb-24 px-6">
                <div className="max-w-4xl mx-auto rounded-3xl p-8 lg:p-12 text-center text-white relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${accentHex}, ${accentHex}cc)` }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <h2 className="text-3xl lg:text-5xl font-extrabold mb-6 tracking-tight leading-tight">{ctaTitle}</h2>
                        <p className="text-lg mb-8 text-white/85 max-w-xl mx-auto leading-relaxed">{ctaSubtitle}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/contact" className="px-8 py-3.5 bg-white rounded-xl font-bold hover:bg-stone-50 transition-all shadow-xl hover:-translate-y-0.5"
                                style={{ color: accentHex }}>
                                {ctaPrimary}
                            </Link>
                            <Link href="/contact" className="px-8 py-3.5 bg-white/10 text-white border border-white/30 rounded-xl font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
                                {ctaSecondary}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
