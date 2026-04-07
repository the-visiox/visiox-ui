"use client";

import SolutionPageTemplate, { SolutionPageConfig } from "@/components/SolutionPageTemplate";
import {
    Trophy, Gamepad2, Users,
    Sparkles, PlayCircle, Camera, Target
} from "lucide-react";

const config: SolutionPageConfig = {
    accentColor: "orange",
    accentHex: "#FF7300",
    bgTint: "bg-[#fcfaf7]",
    gradientFrom: "from-orange-600",
    gradientTo: "to-orange-400",

    badge: "Entertainment",
    badgeIcon: <PlayCircle className="w-4 h-4" />,
    title: <>The Edge of <br /><span className="bg-gradient-to-r from-[#FF7300] to-[#F1A222] bg-clip-text text-transparent">Sensation.</span></>,
    subtitle: "Where high-performance vision meets the thrill of the moment. We power the technical heart of modern entertainment and elite sports.",
    heroImage: "/solutions/entertainment-sports.jpg",
    heroCTAPrimary: "Try Now",
    heroCTASecondary: "Contact Sales",

    stats: [
        { label: "Tracking Precision", value: "<1cm", icon: <Target className="w-5 h-5" /> },
        { label: "Live Sync", value: "<5ms", icon: <Sparkles className="w-5 h-5" /> },
        { label: "Visitors/Month", value: "100K+", icon: <Users className="w-5 h-5" /> },
        { label: "MoCap Savings", value: "-70%", icon: <Camera className="w-5 h-5" /> }
    ],

    capabilitiesTitle: "Don't Just Watch. Experience.",
    capabilitiesSubtitle: "VisioX transforms raw broadcast and arena data into immersive assets for athletes and fans.",
    capabilities: [
        { title: "Player Analytics", description: "High-precision tracking of player movement, velocity, and biomechanics for elite performance insights.", icon: <Trophy className="w-6 h-6 text-orange-500" /> },
        { title: "AR Broadcast Overlays", description: "Real-time visual effects and statistical overlays synced perfectly with live broadcast feeds.", icon: <Sparkles className="w-6 h-6 text-orange-500" /> },
        { title: "Interactive Experiences", description: "Gesture and posture recognition for theme parks, VR attractions, and interactive marketing.", icon: <Gamepad2 className="w-6 h-6 text-orange-500" /> },
        { title: "Crowd Insights", description: "Analyze fan engagement, sentiment, and dwell times during live events and concerts.", icon: <Users className="w-6 h-6 text-orange-500" /> }
    ],

    useCasesTitle: "Visions of Victory",
    useCases: [
        { title: "Broadcast Player Tracking", tag: "Roboflow Sports", description: "Real-time ball and player tracking to generate complex heatmaps and advanced analytics for live sports television broadcasts.", image: "/solutions/usecases/sports-tennis.jpg", metric: "Sub-1cm Precision" },
        { title: "Audience Emotion Analysis", tag: "Crowd Intel", description: "Analyzing wide crowd shots to gauge aggregate joy, tension, and engagement during live events for production feedback.", image: "/solutions/usecases/theme-park.jpg", metric: "100k+ Faces/Sec" },
        { title: "Markerless MoCap", tag: "Solomon 3D Base", description: "Real-time, markerless motion capture tracking actors for immediate virtual production rendering and VFX pipelines.", image: "/solutions/usecases/vfx-studio.jpg", metric: "-70% Setup Time" }
    ],

    ctaTitle: "Ready for the main stage?",
    ctaSubtitle: "Elevate your entertainment venue or broadcast capabilities with high-performance vision AI from VisioX.",
    ctaPrimary: "Get in the Game",
    ctaSecondary: "Contact Sales",
};

export default function EntertainmentPage() {
    return <SolutionPageTemplate config={config} />;
}
