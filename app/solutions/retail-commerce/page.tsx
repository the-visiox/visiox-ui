"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    ShoppingBag, Users, BarChart3, Tag,
    Sparkles, Timer, TrendingUp
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Retail",
    badgeIcon: <Sparkles className="w-4 h-4" />,
    title: <>The Future of <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Physical Retail</span></>,
    subtitle: "Transform your store into a data-driven powerhouse with computer vision that understands every customer interaction and shelf movement.",
    heroImage: "/solutions/retail-commerce.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Conversion Rate", value: "+12%", icon: <TrendingUp className="w-5 h-5" /> },
        { label: "Customer Dwell", value: "8.4 min", icon: <Timer className="w-5 h-5" /> },
        { label: "Inventory Accuracy", value: "99.2%", icon: <BarChart3 className="w-5 h-5" /> },
        { label: "Transaction Acc.", value: "98%", icon: <ShoppingBag className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Bridge the Gap Between URL and IRL",
    capabilitiesSubtitle: "We bring the deep analytics of e-commerce to the physical storefront, providing unprecedented visibility.",
    capabilities: [
        { title: "Footfall Analytics", description: "Map customer journey and dwell times to optimize store layout and staffing.", icon: <Users className="w-6 h-6 text-orange-500" /> },
        { title: "Inventory Monitoring", description: "Automated shelf-scanning for out-of-stock detection and planogram compliance.", icon: <Tag className="w-6 h-6 text-orange-500" /> },
        { title: "Automated Checkout", description: "Vision-based object recognition for friction-less self-checkout experiences.", icon: <ShoppingBag className="w-6 h-6 text-orange-500" /> },
        { title: "Heatmap Visualization", description: "Identify high-traffic 'hot zones' and dead spaces to maximize floor value.", icon: <BarChart3 className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Success Stories",
    useCases: [
        { title: "Empty Shelf Detection", tag: "Roboflow Retail", description: "Scanning grocery aisles with mounted cameras to identify out-of-stock items and alert restocking teams.", image: "/solutions/usecases/retail-shop.jpg", metric: "98% Shelf Uptime" },
        { title: "Frictionless Self-Checkout", tag: "Point of Sale", description: "Bypassing barcodes by having AI instantly recognize fresh produce or unlabelled items on the scale.", image: "/solutions/usecases/grocery-shelf.jpg", metric: "3x Faster Checkout" },
        { title: "Automated Spill Detection", tag: "Safety Systems", description: "Proactively pinging janitorial staff when a liquid spill or hazard is identified in shopping aisles.", image: "/solutions/usecases/retail-queue.jpg", metric: "-80% Slip Claims" }
    ],

    ctaTitle: "Ready to redesign the store?",
    ctaSubtitle: "Our retail solutions are designed for quick deployment with minimal hardware overhead.",
    ctaPrimary: "Get a Custom Quote",
    ctaSecondary: "Speak to an Expert",
};

export default function RetailPage() {
    return <SolutionPageTemplate config={config} />;
}
