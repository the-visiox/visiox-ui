"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Badge from "@/components/Badge";
import { assetPath } from "@/lib/assets";

const solutions = [
    {
        title: "Manufacturing & Industrial",
        description: "Streamline production lines with AI-powered inspection, assembly verification, and predictive maintenance.",
        image: assetPath("/solutions/manufacturing.png"),
        href: "/solutions/manufacturing-industrial",
        color: "from-blue-600 to-cyan-400",
        accentHex: "#2563EB"
    },
    {
        title: "Surveillance & Security",
        description: "Advanced threat detection, perimeter security, and real-time monitoring for safer environments.",
        image: assetPath("/solutions/surveillance.png"),
        href: "/solutions/surveillance-security",
        color: "from-slate-700 to-slate-900",
        accentHex: "#334155"
    },
    {
        title: "Transportation & Smart Cities",
        description: "Optimize traffic flow, autonomous vehicle navigation, and intelligent public infrastructure monitoring.",
        image: assetPath("/solutions/transportation.png"),
        href: "/solutions/transportation-smart-cities",
        color: "from-orange-600 to-amber-400",
        accentHex: "#EA580C"
    },
    {
        title: "Healthcare & Medical",
        description: "AI-assisted diagnostics, surgical robot guidance, and patient monitoring for improved health outcomes.",
        image: assetPath("/solutions/healthcare.png"),
        href: "/solutions/healthcare-medical",
        color: "from-emerald-500 to-teal-400",
        accentHex: "#10B981"
    },
    {
        title: "Retail & Commerce",
        description: "Transform shopping experiences with automated checkout, shelf-stock analysis, and customer insights.",
        image: assetPath("/solutions/retail.png"),
        href: "/solutions/retail-commerce",
        color: "from-rose-500 to-pink-400",
        accentHex: "#E11D48"
    },
    {
        title: "Robotics & Automation",
        description: "Seamlessly integrate vision-guided robots for bin picking, palletizing, and warehouse logistics.",
        image: assetPath("/solutions/robotics.png"),
        href: "/solutions/robotics-automation",
        color: "from-violet-600 to-purple-400",
        accentHex: "#8B5CF6"
    },
    {
        title: "Smart Agriculture",
        description: "Maximize yields with crop health monitoring, precision irrigation, and automated harvesting systems.",
        image: assetPath("/solutions/agriculture.png"),
        href: "/solutions/smart-agriculture",
        color: "from-green-600 to-lime-400",
        accentHex: "#16A34A"
    },
    {
        title: "Logistics & Warehousing",
        description: "Efficient sorting, package tracking, and automated storage and retrieval using intelligent vision.",
        image: assetPath("/solutions/logistics.png"),
        href: "/solutions/logistics-warehousing",
        color: "from-indigo-600 to-blue-400",
        accentHex: "#4F46E5"
    },
    {
        title: "Entertainment & Sports",
        description: "Enhanced viewer experiences through player tracking, AR broadcasts, and fan engagement tools.",
        image: assetPath("/solutions/entertainment.png"),
        href: "/solutions/entertainment-sports",
        color: "from-yellow-500 to-orange-400",
        accentHex: "#EAB308"
    }
];

export default function SolutionsPage() {
    return (
        <div className="min-h-screen bg-[#fcfaf7]">
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 lg:px-8 bg-white border-b border-stone-100 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-stone-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Badge className="mb-6">
                            Industry Applications
                        </Badge>
                        <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 mb-6 tracking-tight">
                            Intelligent Solutions for{" "}
                            <span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">
                                Every Sector
                            </span>
                        </h1>
                        <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
                            Explore how VisioX&apos;s cutting-edge computer
                            vision platform transforms industries,
                            automates complex tasks, and unlocks unprecedented visual insights.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Solutions Grid */}
            <section className="py-20 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {solutions.map((solution, index) => (
                            <motion.div
                                key={solution.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <Link href={solution.href} className="group block h-full bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-2xl hover:border-orange-200 transition-all duration-500">
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        {/* Background fallback gradient */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${solution.color} opacity-20`} />

                                        {/* Image */}
                                        <img
                                            src={solution.image}
                                            alt={solution.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />

                                        {/* Tag */}
                                        <div className="absolute top-4 left-4">
                                            <Badge accentHex={solution.accentHex}>
                                                {solution.title.split(' & ')[0]}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        <h3 className="text-2xl font-bold text-stone-900 mb-3 group-hover:text-orange-600 transition-colors">
                                            {solution.title}
                                        </h3>
                                        <p className="text-stone-600 leading-relaxed mb-6">
                                            {solution.description}
                                        </p>
                                        <div className="flex items-center text-orange-600 font-bold group-hover:gap-2 transition-all">
                                            <span>View details</span>
                                            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 lg:px-8 bg-stone-900">
                <div className="max-max-w-7xl mx-auto rounded-3xl bg-gradient-to-r from-orange-600 to-orange-400 p-12 lg:p-20 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                            Didn&apos;t find what you&apos;re looking for?
                        </h2>
                        <p className="text-xl mb-10 text-white/90">
                            Our platform is highly customizable. Contact our
                            team to discuss your specific industry needs.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/contact" className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-stone-50 transition-colors shadow-xl">
                                Contact Sales
                            </Link>
                            <Link href="/demo" className="px-8 py-4 bg-orange-700 text-white rounded-xl font-bold hover:bg-orange-800 transition-colors border border-orange-500">
                                Book a Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
