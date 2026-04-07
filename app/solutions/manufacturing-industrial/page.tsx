"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    CheckCircle2, Settings2, ShieldAlert, Cpu,
    Target, TrendingUp, ArrowRight, Clock
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Manufacturing",
    badgeIcon: <Settings2 className="w-4 h-4" />,
    title: <>Precision Vision <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Modern Industry</span></>,
    subtitle: "Eliminate human error and maximize production efficiency with AI-powered inspection systems that see what the eye misses.",
    heroImage: "/solutions/manufacturing-industrial.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Accuracy", value: "99.9%", icon: <Target className="w-5 h-5" /> },
        { label: "Throughput", value: "+45%", icon: <TrendingUp className="w-5 h-5" /> },
        { label: "Cost Reduction", value: "30%", icon: <ArrowRight className="w-5 h-5 -rotate-45" /> },
        { label: "Inspection Time", value: "-90%", icon: <Clock className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Core Capabilities",
    capabilitiesSubtitle: "Our advanced algorithms are specifically tuned for the rigors of industrial environments.",
    capabilities: [
        { title: "Defect Detection", description: "Identify scratches, cracks, or malformations in real-time with sub-millimeter precision.", icon: <ShieldAlert className="w-6 h-6 text-orange-500" /> },
        { title: "Assembly Verification", description: "Ensure every component is correctly placed and secured in complex assembly lines.", icon: <Settings2 className="w-6 h-6 text-orange-500" /> },
        { title: "PPE Compliance", description: "Automatically monitor safety gear usage to maintain a secure working environment.", icon: <CheckCircle2 className="w-6 h-6 text-orange-500" /> },
        { title: "Predictive Maintenance", description: "Analyze visual cues of machine wear and tear to prevent costly downtime.", icon: <Cpu className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Real-World Impact",
    useCases: [
        { title: "3D Random Bin Picking", tag: "SolVision", description: "Enabling robot arms to pick unsorted, overlapping metal parts from deep bins with zero collision.", image: "/solutions/usecases/robotic-bin.jpg", metric: "99.9% Pick Success" },
        { title: "Defect Analysis", tag: "Roboflow Core", description: "Spotting micro-fissures, rust, and scratches on aluminum casings using ultra-high resolution inspection.", image: "/solutions/usecases/pcb-inspection.jpg", metric: "1B+ Images Trained" },
        { title: "6D Pose Estimation", tag: "Automotive", description: "Detecting the exact orientation of complex engine components for precise automated grasping and assembly.", image: "/solutions/usecases/car-paint.jpg", metric: "Sub-mm Precision" }
    ],

    ctaTitle: "Ready to optimize your production line?",
    ctaSubtitle: "Our experts will help you design a custom vision system tailored to your specific industrial needs.",
    ctaPrimary: "Schedule a Demo",
    ctaSecondary: "Custom Quote",
};

export default function ManufacturingPage() {
    return <SolutionPageTemplate config={config} />;
}
