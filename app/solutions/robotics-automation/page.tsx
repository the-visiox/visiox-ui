"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    Bot, Box, Orbit, Maximize, Move,
    Zap, CheckCircle, Target
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Robotics",
    badgeIcon: <Bot className="w-4 h-4" />,
    title: <>Visual Brain for <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Autonomous Robots</span></>,
    subtitle: "Equip your robotic systems with human-like visual perception. From bin picking to complex assembly, VisioX provides the precision needed to automate the unautomatable.",
    heroImage: "/solutions/robotics-automation.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Latency", value: "12ms", icon: <Zap className="w-5 h-5" /> },
        { label: "Uptime", value: "99.9%", icon: <CheckCircle className="w-5 h-5" /> },
        { label: "Precision", value: "0.5mm", icon: <Target className="w-5 h-5" /> },
        { label: "Pick Success", value: "99.9%", icon: <Box className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Core Intelligence",
    capabilitiesSubtitle: "Our software stack interfaces with any industrial robot brand (FANUC, ABB, KUKA, Universal Robots).",
    capabilities: [
        { title: "6D Pose Estimation", description: "Precisely identify the position and orientation of parts for reliable robotic grasping.", icon: <Orbit className="w-6 h-6 text-orange-500" /> },
        { title: "Random Bin Picking", description: "Enable robots to pick unsorted, overlapping parts from deep bins with collision avoidance.", icon: <Box className="w-6 h-6 text-orange-500" /> },
        { title: "Autonomous Navigation", description: "Vision-based SLAM and obstacle detection for mobile robots in dynamic environments.", icon: <Move className="w-6 h-6 text-orange-500" /> },
        { title: "Path Optimization", description: "Real-time recalculation of robotic trajectories to avoid obstacles and reduce cycle time.", icon: <Maximize className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Success Stories",
    useCases: [
        { title: "Welding Seam Tracking", tag: "SolMotion", description: "Real-time thermal and visual tracking of robotic welding paths to guarantee structural integrity.", image: "/solutions/usecases/smt-line.jpg", metric: "100% Path Accuracy" },
        { title: "Automated Palletizing", tag: "Logistics Robots", description: "Recognizing mixed-box dimensions and calculating optimal gripping points for warehouse robot arms.", image: "/solutions/usecases/palletizing.jpg", metric: "-50% Labor Dependency" },
        { title: "Robot Guidance SLAM", tag: "Roboflow Aerial", description: "Vision-based simultaneous localization and mapping for AGVs navigating dynamic factory floors without QR codes.", image: "/solutions/usecases/robotic-bin.jpg", metric: "<10ms Latency" }
    ],

    ctaTitle: "Automate the Unpredictable.",
    ctaSubtitle: "Bring high-performance 3D vision to your robotic cells today.",
    ctaPrimary: "Start Your Project",
    ctaSecondary: "Talk to a Robot Expert",
};

export default function RoboticsPage() {
    return <SolutionPageTemplate config={config} />;
}
