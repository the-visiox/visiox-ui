import { assetPath } from "@/lib/assets";

/**
 * Mock data for Datasets to demonstrate backend-ready integration patterns.
 * This file should be removed once real API endpoints are integrated.
 */

export interface Dataset {
  id: number;
  name: string;
  images: number;
  classes: number;
  status: 'Ready' | 'Annotating' | 'Draft' | 'Error';
  lastModified: string;
  preview: string;
}

export const MOCK_DATASETS: Dataset[] = [
  { 
    id: 1, 
    name: "Industrial-Defect-v2", 
    images: 12403, 
    classes: 4, 
    status: "Ready", 
    lastModified: "2h ago", 
    preview: assetPath("/demo/manufacturing.png") 
  },
  { 
    id: 2, 
    name: "Safety-PPE-Monitor", 
    images: 8521, 
    classes: 6, 
    status: "Annotating", 
    lastModified: "15m ago", 
    preview: assetPath("/demo/surveillance.png") 
  },
  { 
    id: 3, 
    name: "Smart-Retail-Traffic", 
    images: 1590, 
    classes: 2, 
    status: "Ready", 
    lastModified: "1d ago", 
    preview: assetPath("/demo/transportation.png") 
  },
  { 
    id: 4, 
    name: "Medical-Imaging-Test", 
    images: 420, 
    classes: 8, 
    status: "Draft", 
    lastModified: "3d ago", 
    preview: assetPath("/demo/robotics.png") 
  },
];
