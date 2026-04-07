"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    HeartPulse, Microscope, Activity, Crosshair,
    ShieldCheck, Zap, Clock
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Healthcare",
    badgeIcon: <HeartPulse className="w-4 h-4" />,
    title: <>Vision for a <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Healthier Future</span></>,
    subtitle: "Advancing patient care and clinical efficiency with medical-grade computer vision and intelligent diagnostic support.",
    heroImage: "/solutions/healthcare-medical.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Detection Sensitivity", value: "98%", icon: <Microscope className="w-5 h-5" /> },
        { label: "Certification", value: "ISO", icon: <ShieldCheck className="w-5 h-5" /> },
        { label: "Analysis Time", value: "-45%", icon: <Clock className="w-5 h-5" /> },
        { label: "Reliability", value: "99.99%", icon: <Zap className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Precision Capabilities",
    capabilitiesSubtitle: "Our models are trained on curated clinical datasets to ensure medical-grade reliability.",
    capabilities: [
        { title: "Diagnostic Assistance", description: "AI-powered detection of abnormalities in medical imaging with high sensitivity.", icon: <Microscope className="w-6 h-6 text-orange-500" /> },
        { title: "Patient Monitoring", description: "Non-intrusive vision systems for detecting patient falls, distress, or movement in ICUs.", icon: <Activity className="w-6 h-6 text-orange-500" /> },
        { title: "Lab Automation", description: "Automated cell counting, sample sorting, and results verification for high-throughput labs.", icon: <HeartPulse className="w-6 h-6 text-orange-500" /> },
        { title: "Surgical Guidance", description: "Real-time tracking of surgical instruments and anatomical markers during procedures.", icon: <Crosshair className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Empowering Clinical Workflows",
    useCases: [
        { title: "Surgical Tool Tracking", tag: "Operating Room", description: "Counting and tracking surgical instruments during operations to prevent retained foreign objects.", image: "/solutions/usecases/pathology.jpg", metric: "0 Retained Items" },
        { title: "Pill Defect Sorting", tag: "Pharmaceutical", description: "High-speed line screening to instantly reject broken, miscolored, or incorrectly dosed capsules.", image: "/solutions/usecases/medical-pills.jpg", metric: "99.99% Reliable" },
        { title: "Radiological Anomaly Detection", tag: "Roboflow Health", description: "Deep learning segmentation of X-Rays to highlight potential fractures and anomalies for secondary review.", image: "/solutions/usecases/elderly-care.jpg", metric: "4x Faster Review" }
    ],

    ctaTitle: "Partner with VisioX for Clinical Excellence.",
    ctaSubtitle: "Discuss your medical vision requirements with our engineering team for HIPAA-compliant, high-performance integration.",
    ctaPrimary: "Connect with Engineers",
    ctaSecondary: "View Documentation",
};

export default function HealthcarePage() {
    return <SolutionPageTemplate config={config} />;
}
