"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { assetPath } from "@/lib/assets";
import { Menu, X, ChevronDown } from "lucide-react";

export default function Header() {
    const { isLoggedIn } = useAuth();
    const productLinks = [
        { name: "DataHub", href: "/products/datahub" },
        { name: "Annotation", href: "/products/annotation" },
        { name: "Model Train", href: "/products/model-train" },
        { name: "Workflows", href: "/products/workflows" },
        { name: "Deploy", href: "/products/deploy" },
    ];

    const solutionLinks = [
        { name: "Manufacturing & Industrial", href: "/solutions/manufacturing-industrial" },
        { name: "Surveillance & Security", href: "/solutions/surveillance-security" },
        { name: "Transportation & Smart Cities", href: "/solutions/transportation-smart-cities" },
        { name: "Healthcare & Medical", href: "/solutions/healthcare-medical" },
        { name: "Retail & Commerce", href: "/solutions/retail-commerce" },
        { name: "Smart Agriculture", href: "/solutions/smart-agriculture" },
        { name: "Robotics & Automation", href: "/solutions/robotics-automation" },
        { name: "Logistics & Warehousing", href: "/solutions/logistics-warehousing" },
        { name: "Entertainment & Sports", href: "/solutions/entertainment-sports" },
    ];

    const aboutLinks = [
        { name: "Company", href: "/about/company" },
        { name: "Blog", href: "/about/blog" },
        { name: "Contact", href: "/about/contact" },
    ];

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200"
            onMouseLeave={() => setActiveDropdown(null)}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="flex items-center space-x-3 cursor-pointer"
                        >
                            <motion.img
                                src={assetPath("/logos/text.png")}
                                alt="VisioX Logo"
                                className="h-15 w-auto object-contain"
                                whileHover={{
                                    scale: 1.08,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 15,
                                }}
                            />
                            {/* <span className="text-orange-500 font-bold text-2xl tracking-tight">VisioX</span> */}
                        </motion.div>
                    </Link>

                    {/* Menu Items */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/">
                            <span className="text-stone-600 hover:text-[#FF7300] transition-colors cursor-pointer font-medium">Home</span>
                        </Link>

                        {/* Product Dropdown */}
                        <div className="relative group" onMouseEnter={() => setActiveDropdown('product')}>
                            <span className="text-stone-600 hover:text-[#FF7300] transition-colors cursor-pointer font-medium flex items-center gap-1">
                                Product
                                <svg className={`w-4 h-4 transition-transform ${activeDropdown === 'product' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </span>
                            {activeDropdown === 'product' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-full -left-4 w-48 bg-white border border-stone-200 shadow-xl rounded-xl p-2 mt-2"
                                >
                                    {productLinks.map((link) => (
                                        <Link key={link.name} href={link.href}>
                                            <span className="block px-4 py-2 text-sm text-stone-600 hover:bg-orange-50 hover:text-[#FF7300] rounded-lg transition-colors cursor-pointer">
                                                {link.name}
                                            </span>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Solution Dropdown */}
                        <div className="relative group" onMouseEnter={() => setActiveDropdown('solution')}>
                            <Link href="/solutions">
                                <span className="text-stone-600 group-hover:text-[#FF7300] transition-colors cursor-pointer font-medium flex items-center gap-1">
                                    Solution
                                    <svg className={`w-4 h-4 transition-transform ${activeDropdown === 'solution' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </span>
                            </Link>
                            {activeDropdown === 'solution' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-full -left-4 w-72 bg-white border border-stone-200 shadow-xl rounded-xl p-2 mt-2"
                                >
                                    <div className="grid grid-cols-1 gap-1">
                                        {solutionLinks.map((link) => (
                                            <Link key={link.name} href={link.href}>
                                                <span className="block px-4 py-2 text-sm text-stone-600 hover:bg-orange-50 hover:text-[#FF7300] rounded-lg transition-colors cursor-pointer">
                                                    {link.name}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* About Us Dropdown */}
                        <div className="relative group" onMouseEnter={() => setActiveDropdown('about')}>
                            <span className="text-stone-600 hover:text-[#FF7300] transition-colors cursor-pointer font-medium flex items-center gap-1">
                                About Us
                                <svg className={`w-4 h-4 transition-transform ${activeDropdown === 'about' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </span>
                            {activeDropdown === 'about' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute top-full -left-4 w-48 bg-white border border-stone-200 shadow-xl rounded-xl p-2 mt-2"
                                >
                                    {aboutLinks.map((link) => (
                                        <Link key={link.name} href={link.href}>
                                            <span className="block px-4 py-2 text-sm text-stone-600 hover:bg-orange-50 hover:text-[#FF7300] rounded-lg transition-colors cursor-pointer">
                                                {link.name}
                                            </span>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex items-center space-x-6"
                    >
                        {isLoggedIn ? (
                            <Link href="/overview">
                                <span className="hidden md:block text-[#FF7300] hover:text-stone-900 transition-colors font-bold cursor-pointer">
                                    Go to Workspace
                                </span>
                            </Link>
                        ) : (
                            <Link href="/login">
                                <span className="hidden md:block text-stone-600 hover:text-[#FF7300] transition-colors cursor-pointer">
                                    Sign In
                                </span>
                            </Link>
                        )}

                        <Link href={isLoggedIn ? "/overview" : "/login"}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-orange-600 to-orange-400
                                            hover:from-orange-400 hover:to-orange-300 
                                            text-white px-4 py-2 rounded-xl
                                            transition-all duration-300
                                            flex items-center space-x-1
                                            shadow-md shadow-orange-500/20 font-bold"
                            >
                                <span className="hidden sm:inline">{isLoggedIn ? "Dashboard" : "Get Started"}</span>
                                <span className="sm:hidden">{isLoggedIn ? "Dash" : "Start"}</span>
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </motion.button>
                        </Link>

                        {/* Mobile Menu Toggle */}
                        <button 
                            className="md:hidden p-2 text-stone-600 hover:text-[#FF7300] transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Mobile Menu Content */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-t border-stone-100 overflow-hidden"
                    >
                        <div className="p-6 space-y-4">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                                <span className="block text-lg font-semibold text-stone-900">Home</span>
                            </Link>
                            
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Product</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {productLinks.map((link) => (
                                        <Link 
                                            key={link.name} 
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="text-stone-600 hover:text-orange-500 py-1"
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Solutions</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <Link 
                                        href="/solutions"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="text-stone-900 font-medium hover:text-orange-500"
                                    >
                                        All Solutions
                                    </Link>
                                    <div className="grid grid-cols-1 gap-y-1 pl-2 border-l border-stone-100">
                                        {solutionLinks.slice(0, 4).map((link) => (
                                            <Link 
                                                key={link.name} 
                                                href={link.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="text-stone-500 hover:text-orange-500 py-1 text-sm"
                                            >
                                                {link.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-stone-100 space-y-4">
                                {!isLoggedIn && (
                                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                        <span className="block text-center text-stone-600 font-semibold py-2">Sign In</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
