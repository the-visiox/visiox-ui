# VisioX — Intelligent Computer Vision Workspace

VisioX is a high-fidelity, enterprise-grade platform designed for managing end-to-end computer vision workflows. From high-speed data annotation and model training to seamless edge deployment, VisioX provides a workspace-dense environment focused on performance, precision, and world-class aesthetics.

## ✨ Key Features

- **High-Fidelity Workspace**: A premium, workspace-dense environment inspired by industry leaders, featuring a light-themed, animated design system.
- **Dynamic Annotation Visuals**: Interactive demo system with real-time bounding box visualization across multiple industries (Surveillance, Agriculture, Robotics, etc.).
- **Infinite Partner Roll**: A seamless, position-based auto-hovering partner logo roll powered by Framer Motion.
- **Snap-Scroll Experience**: A modern, full-screen snap-scroll landing page with smooth transitions and interactive navigation dots.
- **Advanced CV Analytics**: Real-time metric visualization for model training, including mAP, Loss, and Accuracy.
- **Modular Architecture**: Clean, scalable codebase using the latest React 19 and Next.js 16 features.

## 🚀 Tech Stack

VisioX is built with a cutting-edge frontend stack for maximum performance and visual excellence:

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16.1.4](https://nextjs.org/) (App Router) |
| **Runtime** | [React 19.2.3](https://reactjs.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animation** | [Framer Motion 12.29.0](https://www.framer.com/motion/) |
| **Canvas** | [Konva & React-Konva](https://konvajs.org/) (for visual workflows) |
| **Icons** | [Lucide React](https://lucide.dev/) |

## 📦 Getting Started

Ensure you have [pnpm](https://pnpm.io/) installed for the best experience.

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev

# Build for production
pnpm build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```text
visiox-ui/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── about/            # Project vision and history
│   ├── datasets/         # Image library and class distribution
│   ├── deploy/           # Deployment dashboard and API keys
│   ├── login/            # Authentication flow
│   ├── overview/         # User workspace dashboard
│   ├── products/         # Workflow and training hubs
│   ├── solutions/        # Industry-specific solutions
│   ├── train/            # Live training monitor
│   └── workflows/        # Node-based pipeline builder
├── components/           # Reusable UI components (Bento, Badge, etc.)
├── hooks/                # Custom React hooks (Auth, Assets, etc.)
├── lib/                  # Shared utilities and core logic
├── public/               # Static assets (Logos, Demo Images, Videos)
└── specs/                # Implementation plans and feature specs
```

## 🎨 Design Philosophy

VisioX adheres to a **Premium Design System** characterized by:
- **Rich Aesthetics**: Vibrant gradients, sleek dark/light modes, and glassmorphism.
- **Micro-Animations**: Subtle, purposeful motion to enhance user engagement without distraction.
- **Visual Precision**: Accurate, position-based tracking and high-density data visualization.

---
Built with ❤️ by the VisioX Team.
