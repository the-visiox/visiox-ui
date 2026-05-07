"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Footer from "@/components/Footer";

import { ReactNode } from "react";

interface Stat {
    label: string;
    value: string;
}

interface Application {
    title: string;
    description: string;
    icon: ReactNode;
    image?: string;
    metric?: string;
    tag?: string;
}

type ColorTheme = "orange";

interface ThemeStyle {
    accent: string;
    bgGradient: string;
    blob: string;
    textGradient: string;
    button: string;
    border: string;
    iconBg: string;
    iconText: string;
    subText: string;
}

interface SolutionLayoutProps {
    colorTheme?: ColorTheme;
    hero: {
        badge: string;
        title: ReactNode;
        description: string;
        image: string;
        videoUrl?: string;
        stats: Stat[];
        ctaButtons: {
            primary: { text: string; href: string };
            secondary: { text: string; href: string };
        };
    };
    applications: {
        title?: string;
        description?: string;
        items: Application[];
    };
    cta: {
        icon: ReactNode;
        title: ReactNode;
        description: string;
        buttons: {
            primary: { text: string; onClick?: () => void };
            secondary: { text: string; onClick?: () => void };
        };
    };
}

const themeStyles: Record<ColorTheme, ThemeStyle> = {
    orange: {
        accent: "orange",
        bgGradient: "from-orange-100/50",
        blob: "bg-amber-100/30",
        textGradient: "from-orange-600 via-amber-600 to-yellow-600",
        button: "bg-gradient-to-r from-orange-600 to-orange-400 hover:scale-105 active:scale-95 hover:from-orange-400 hover:to-orange-300",
        border: "border-orange-200",
        iconBg: "bg-orange-50",
        iconText: "text-orange-600",
        subText: "text-orange-600",
    },
};

export default function SolutionLayout({
    colorTheme = "orange",
    hero,
    applications,
    cta,
}: SolutionLayoutProps) {
    const theme = themeStyles[colorTheme];




    return (
        <div className="min-h-screen bg-[#fafafa] text-stone-900 overflow-x-hidden selection:bg-stone-900/10">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center pt-20 pb-20 px-6 lg:px-8 overflow-hidden">
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className={`absolute top-0 right-0 w-[1000px] h-[1000px] ${theme.bgGradient} rounded-full blur-[160px] -translate-y-1/2 translate-x-1/2`} />
                    <div className={`absolute top-1/2 left-0 w-[600px] h-[600px] ${theme.blob} rounded-full blur-[140px] -translate-x-1/2`} />
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        {/* Hero Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className={`w-12 h-px bg-${theme.accent}-500 transition-colors`} />
                                <span className={`text-sm font-bold uppercase tracking-[0.2em] ${theme.subText} transition-colors`}>{hero.badge}</span>
                            </div>
                            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight tracking-tight">
                                {hero.title}
                            </h1>
                            <p className="text-xl text-stone-600 mb-12 leading-relaxed max-w-xl">
                                {hero.description}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <Link
                                    href={hero.ctaButtons.primary.href}
                                    className={`px-12 py-5 ${theme.button} text-white rounded-full transition-all duration-300 font-bold shadow-xl shadow-orange-600/30 text-center`}
                                >
                                    {hero.ctaButtons.primary.text}
                                </Link>
                                <Link
                                    href={hero.ctaButtons.secondary.href}
                                    className="px-12 py-5 bg-white hover:bg-stone-100 hover:scale-105 active:scale-95 
                                    text-stone-900 rounded-full transition-all duration-300 font-bold 
                                    border border-stone-200 shadow-sm text-center"
                                >
                                    {hero.ctaButtons.secondary.text}
                                </Link>
                            </div>
                        </motion.div>

                        {/* Hero Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            <div className={`aspect-square rounded-[4rem] border ${theme.border} bg-white p-8 shadow-2xl shadow-stone-200/50 overflow-hidden group transition-colors`}>
                                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
                                    {hero.videoUrl ? (
                                        <video
                                            src={hero.videoUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                        />
                                    ) : (
                                        <img
                                            src={hero.image}
                                            alt="Solution Visual"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                        />
                                    )}
                                    <div className={`absolute inset-0 bg-gradient-to-t from-stone-900/20 via-transparent to-transparent`} />
                                    {/* UI Elements */}
                                    <div className="absolute inset-0 border-[20px] border-white/10" />
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-${theme.accent}-400/30 rounded-full animate-ping opacity-20`} />
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-${theme.accent}-500 rounded-full shadow-[0_0_20px_currentColor] text-${theme.accent}-500`} />
                                </div>
                            </div>

                            {/* Floating Stats */}
                            {hero.stats[0] && (
                                <div className="absolute top-12 -right-6 p-6 bg-white/90 backdrop-blur border border-stone-100 rounded-3xl shadow-xl shadow-stone-200/50 space-y-2 hidden lg:block">
                                    <div className={`text-[10px] font-bold ${theme.subText} uppercase`}>{hero.stats[0].label}</div>
                                    <div className="text-2xl font-bold text-stone-900">{hero.stats[0].value}</div>
                                </div>
                            )}
                            {hero.stats.length > 1 && (
                                <div className="absolute -bottom-6 left-12 p-6 bg-white/90 backdrop-blur border border-stone-100 rounded-3xl shadow-xl shadow-stone-200/50 flex gap-6 hidden sm:flex">
                                    {hero.stats.slice(1).map((stat, i) => (
                                        <div key={i} className="flex gap-6">
                                            {i > 0 && <div className="w-px h-10 bg-stone-100 mt-2" />}
                                            <div>
                                                <div className={`text-[10px] font-bold ${theme.subText} text-center uppercase`}>{stat.label}</div>
                                                <div className="text-2xl font-bold text-stone-900">{stat.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Applications Section */}
            <section className="py-32 px-6 lg:px-8 relative overflow-hidden">
                {/* Subtle background accents */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute bottom-0 right-0 w-[800px] h-[800px] ${theme.bgGradient} rounded-full blur-[200px] translate-y-1/2 translate-x-1/4 opacity-40`} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-16">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-px bg-${theme.accent}-500`} />
                                <span className={`text-xs font-bold uppercase tracking-[0.25em] ${theme.subText}`}>Applications</span>
                            </div>
                            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-stone-900 leading-tight">
                                {applications.title || "Core Intelligence"}
                            </h2>
                            <p className="text-lg text-stone-500 mt-4 max-w-4xl">
                                {applications.description}
                            </p>
                        </div>

                    </div>

                    {/* Application Cards Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {applications.items.map((item, i) => (
                            <motion.div
                                key={`app-${i}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-stone-200/60 hover:border-orange-300/50 hover:shadow-2xl hover:shadow-stone-200/60 transition-all duration-500"
                            >
                                {/* Visual Header: Image with Icon Overlay */}
                                <div className="relative h-56 overflow-hidden bg-stone-100">
                                    <img
                                        src={item.image || hero.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />


                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-1 p-7 lg:p-8">
                                    <h3 className="text-xl font-bold text-stone-900 mb-3 leading-snug">{item.title}</h3>
                                    <p className="text-sm text-stone-500 leading-relaxed mb-6 flex-1">{item.description}</p>

                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-40 px-6 relative overflow-hidden">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl ${theme.bgGradient} rounded-full blur-[200px] pointer-events-none`} />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className={`w-20 h-20 text-${theme.accent}-500 mx-auto mb-12`}>
                        {cta.icon}
                    </div>
                    <h2 className="text-4xl lg:text-7xl font-bold mb-12 tracking-tight text-stone-900 leading-tight">
                        {cta.title}
                    </h2>
                    <p className="text-2xl text-stone-600 mb-16 leading-relaxed">
                        {cta.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <button
                            onClick={cta.buttons.primary.onClick}
                            className={`px-12 py-5 bg-stone-900 text-white rounded-full font-bold transition-all hover:${theme.button} shadow-xl w-full sm:w-auto`}
                        >
                            {cta.buttons.primary.text}
                        </button>
                        <button
                            onClick={cta.buttons.secondary.onClick}
                            className="px-12 py-5 bg-white text-stone-900 border border-stone-200 rounded-full font-bold hover:bg-stone-50 transition-all shadow-sm w-full sm:w-auto"
                        >
                            {cta.buttons.secondary.text}
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
