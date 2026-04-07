"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    ShieldCheck, Eye, BellRing, MapPin,
    Zap, Lock, Search
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Surveillance",
    badgeIcon: <Lock className="w-4 h-4" />,
    title: <>Smart Sight for a <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Safer World</span></>,
    subtitle: "Next-generation security solutions powered by deep learning for proactive threat detection and real-time situational awareness.",
    heroImage: "/solutions/surveillance-security.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Uptime", value: "99.99%", icon: <Zap className="w-5 h-5" /> },
        { label: "Security Delay", value: "<250ms", icon: <Lock className="w-5 h-5" /> },
        { label: "Accuracy Rate", value: "98.5%", icon: <Search className="w-5 h-5" /> },
        { label: "Response Speed", value: "Instant", icon: <BellRing className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "The New Standard in Physical Security",
    capabilitiesSubtitle: "We combine edge computing with deep neural networks to provide instantaneous insights without compromising privacy.",
    capabilities: [
        { title: "Intrusion Detection", description: "Instant alerts for unauthorized access in restricted zones using virtual fences.", icon: <ShieldCheck className="w-6 h-6 text-orange-500" /> },
        { title: "Facial Recognition", description: "Highly accurate identification for secure access control and person-of-interest tracking.", icon: <Eye className="w-6 h-6 text-orange-500" /> },
        { title: "Behavior Analysis", description: "Detect suspicious activities like loitering, running, or falling in public spaces.", icon: <BellRing className="w-6 h-6 text-orange-500" /> },
        { title: "Crowd Management", description: "Real-time occupancy monitoring and density analysis for large-scale events.", icon: <MapPin className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Deployment Scenarios",
    useCases: [
        { title: "Weapons Detection", tag: "Roboflow Core", description: "Identifying firearms in live CCTV feeds instantly to trigger proactive facility lockdowns.", image: "/solutions/usecases/airport-security.jpg", metric: "0.2s Alert Time" },
        { title: "Perimeter Intrusion", tag: "Thermal Vision", description: "Distinguishing humans from animals or debris along restricted borders using customized thermal models.", image: "/solutions/usecases/office-access.jpg", metric: "0 False Positives" },
        { title: "Unattended Baggage Alert", tag: "Public Transit", description: "Tracking stationary items over time in crowded transit hubs to alert security of potential threats.", image: "/solutions/usecases/retail-security.jpg", metric: "99% Reliability" }
    ],

    ctaTitle: "Secure your perimeter today.",
    ctaSubtitle: "Experience the power of proactive surveillance. Request a vulnerability assessment and see how VisioX can harden your security posture.",
    ctaPrimary: "Request Free Assessment",
    ctaSecondary: "Talk to Security Advisor",
};

export default function SurveillancePage() {
    return <SolutionPageTemplate config={config} />;
}
