"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    Package, Truck, Barcode, Layers,
    Zap, CheckCircle, ArrowRight, Maximize2
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Logistics",
    badgeIcon: <Package className="w-4 h-4" />,
    title: <>Optimize Every <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Parcel in Motion</span></>,
    subtitle: "Maximize warehouse throughput and eliminate sorting errors with high-speed visual intelligence designed for modern logistics.",
    heroImage: "/solutions/logistics-warehousing.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Throughput", value: "+50%", icon: <Zap className="w-5 h-5" /> },
        { label: "Accuracy", value: "99.98%", icon: <CheckCircle className="w-5 h-5" /> },
        { label: "Data Quality", value: "24/7", icon: <Package className="w-5 h-5" /> },
        { label: "Cost Saving", value: "30%", icon: <ArrowRight className="w-5 h-5 -rotate-45" /> }
    ],

    capabilitiesTitle: "Unrivaled Precision",
    capabilitiesSubtitle: "Seamlessly integrate our vision stack with WMS, ERP, and industrial PLC systems for end-to-end operational visibility.",
    capabilities: [
        { title: "High-Speed Sorting", description: "Automated classification of parcels on fast-moving conveyors using shape and label OCR.", icon: <Barcode className="w-6 h-6 text-orange-500" /> },
        { title: "Automated Dimensioning", description: "Instant 3D measurements of items for volumetric weight calculation and space optimization.", icon: <Maximize2 className="w-6 h-6 text-orange-500" /> },
        { title: "Depalletizing Guidance", description: "Vision-guided robotic arms for safe and efficient unloading of mixed-order pallets.", icon: <Layers className="w-6 h-6 text-orange-500" /> },
        { title: "Dock Occupancy", description: "Real-time monitoring of loading docks to optimize truck turnaround times.", icon: <Truck className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Global Logistics Excellence",
    useCases: [
        { title: "Conveyor Belt OCR", tag: "Roboflow Core", description: "High-speed OCR reading damaged, wrinkled, or partially obscured barcodes and shipping labels on fast-moving conveyor belts.", image: "/solutions/usecases/logistics-sort.jpg", metric: "99.9% Read Rate" },
        { title: "3D Pallet Dimensioning", tag: "SolVision 3D", description: "Using 3D vision systems to instantly calculate the volume, boundaries, and dimensions of incoming mixed-freight pallets.", image: "/solutions/usecases/cold-storage.jpg", metric: "Instant Calc" },
        { title: "Damaged Parcel Detection", tag: "Intake Automation", description: "Automatically flagging crushed, wet, or damaged packages at the intake dock before they enter the sorting system.", image: "/solutions/usecases/delivery-vision.jpg", metric: "-80% Returns" }
    ],

    ctaTitle: "Ship Faster. Grow Brighter.",
    ctaSubtitle: "Ready to upgrade your fulfillment technology? Schedule a consultation with our supply chain engineers.",
    ctaPrimary: "Start Your Pilot",
    ctaSecondary: "Request a Site Audit",
};

export default function LogisticsPage() {
    return <SolutionPageTemplate config={config} />;
}
