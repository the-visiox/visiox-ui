import { apiFetch } from "./client";

export type ClassDto = {
  id: number;
  project: number;
  name: string;
  color: string;
};

export async function getClassesForProject(projectId: number): Promise<ClassDto[]> {
  return apiFetch<ClassDto[]>(`/api/classes/?project=${projectId}`);
}
