"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    Car, TrafficCone, Signal, Navigation,
    Zap, Wind, Map, Clock
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Transportation",
    badgeIcon: <Signal className="w-4 h-4" />,
    title: <>Intelligent <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Smart Cities</span></>,
    subtitle: "Harnessing computer vision to create safer, cleaner, and more efficient urban environments for every citizen.",
    heroImage: "/solutions/transportation-smart-cities.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "CO2 Savings", value: "-22%", icon: <Wind className="w-5 h-5" /> },
        { label: "Active Objects", value: "1,284", icon: <Map className="w-5 h-5" /> },
        { label: "Flow Velocity", value: "42km/h", icon: <Car className="w-5 h-5" /> },
        { label: "Response Time", value: "Instant", icon: <Zap className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Next-Gen Urban Infrastructure",
    capabilitiesSubtitle: "By processing visual data at the edge, VisioX provides cities with the analytics needed to optimize mobility and safety.",
    capabilities: [
        { title: "Traffic Flow Analysis", description: "Real-time vehicle counting and speed monitoring to balance urban congestion.", icon: <Car className="w-6 h-6 text-orange-500" /> },
        { title: "Parking Management", description: "Automated identification of empty spaces and illegal parking via overhead cameras.", icon: <Navigation className="w-6 h-6 text-orange-500" /> },
        { title: "Incident Detection", description: "Rapidly detect accidents, stalled vehicles, or debris on highways for emergency response.", icon: <TrafficCone className="w-6 h-6 text-orange-500" /> },
        { title: "Smart Lighting", description: "Adaptive public lighting systems that respond to pedestrian and vehicle presence.", icon: <Zap className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Cities Leading the Way",
    useCases: [
        { title: "Automated ALPR Systems", tag: "Roboflow Hub", description: "Deep learning models instantly identifying license plates across various countries in difficult lighting and weather conditions.", image: "/solutions/usecases/toll-booth.jpg", metric: "99.95% OCR Acc." },
        { title: "Intersection Flow Control", tag: "Municipal AI", description: "Analyzing real-time traffic density and pedestrian movement to dynamically adjust light timings and reduce gridlock.", image: "/solutions/usecases/traffic-signal.jpg", metric: "-15% Wait Time" },
        { title: "Dashcam Asset Mapping", tag: "Smart City", description: "City fleet vehicles using AI dashcams to continually map and report potholes, graffiti, and broken streetlights automatically.", image: "/solutions/usecases/pothole-road.jpg", metric: "4x Faster Repair" }
    ],

    ctaTitle: "Building the infrastructure of tomorrow.",
    ctaSubtitle: "Join dozens of municipalities already using VisioX to power their smart city initiatives.",
    ctaPrimary: "Request Solution Brief",
    ctaSecondary: "Partner with Us",
};

export default function TransportationPage() {
    return <SolutionPageTemplate config={config} />;
}
