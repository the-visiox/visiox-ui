import { apiFetch } from "./client";

export type ClassDto = {
  id: number;
  project: number;
  name: string;
  color: string;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getClassesForProject(projectId: number): Promise<ClassDto[]> {
  const data = await apiFetch<ClassDto[] | PaginatedResponse<ClassDto>>(
    `/api/classes/?project=${projectId}`
  );
  return Array.isArray(data) ? data : data.results;
}
