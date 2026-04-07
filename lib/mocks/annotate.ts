/**
 * Mock data for the Annotation Workspace.
 * This ensures that the AnnotateClient stays clean and ready for backend integration.
 */

export interface AnnotationObject {
  id?: string | number;
  label: string;
  color: string;
}

export const MOCK_ANNOTATIONS: AnnotationObject[] = [
  { label: "Defect_Crack", color: "text-red-400" },
  { label: "Defect_Puncture", color: "text-red-400" },
  { label: "Surface_Scratch", color: "text-blue-400" },
  { label: "Surface_Scratch", color: "text-blue-400" },
];

/**
 * Returns a mock image URL for demonstration.
 * In a real app, this would be fetched from the backend.
 */
export function getMockImageUrl(imageId: string): string {
  return `https://picsum.photos/seed/${imageId}/1200/800`;
}
