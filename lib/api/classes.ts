import { apiFetch } from "./client";

export type ClassDto = {
  id: number;
  project: number;
  name: string;
  color: string;
  /** Total annotations using this class across the whole project. */
  annotation_count?: number;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getClassesForProject(projectId: number): Promise<ClassDto[]> {
  const data = await apiFetch<ClassDto[] | PaginatedResponse<ClassDto>>(`/api/v1/classes/?project=${projectId}`);
  return Array.isArray(data) ? data : data.results;
}

export async function createClassForProject(
  projectId: number,
  data: { name: string; color: string },
): Promise<ClassDto> {
  return apiFetch<ClassDto>("/api/v1/classes/", {
    method: "POST",
    json: {
      project: projectId,
      name: data.name,
      color: data.color,
    },
  });
}

export async function deleteClass(classId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/classes/${classId}/`, {
    method: "DELETE",
  });
}
