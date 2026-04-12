import { apiFetch } from "./client";

export type ApiAnnotation = {
  id: number;
  media: number;
  class_label: number;
  class_name?: string;
  type: string;
  data: Record<string, unknown>;
  frame?: number;
  track_id?: string | null;
};

export async function getJobAnnotations(jobId: number): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/jobs/${jobId}/annotations/`);
}

export async function patchJobAnnotations(
  jobId: number,
  annotations: {
    class_label: number;
    type: string;
    data: Record<string, unknown>;
    frame?: number;
    track_id?: string | null;
  }[]
): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/jobs/${jobId}/annotations/`, {
    method: "PATCH",
    json: { annotations },
  });
}

export async function postJobIssue(jobId: number, text: string): Promise<void> {
  await apiFetch(`/api/jobs/${jobId}/issues/`, {
    method: "POST",
    json: { body: text },
  });
}
