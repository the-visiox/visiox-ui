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

export type AnnotationPayloadItem = {
  class_label: number;
  type: string;
  data: Record<string, unknown>;
  frame?: number;
  track_id?: string | null;
};

// ── Job-based endpoints ──

export async function getJobAnnotations(jobId: number): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/jobs/${jobId}/annotations/`);
}

export async function patchJobAnnotations(
  jobId: number,
  annotations: AnnotationPayloadItem[]
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

// ── Media-based endpoints (direct per-image save, no job required) ──

export async function getMediaAnnotations(mediaId: number): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/media/${mediaId}/annotations/`);
}

export async function putMediaAnnotations(
  mediaId: number,
  annotations: AnnotationPayloadItem[]
): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/media/${mediaId}/annotations/`, {
    method: "PUT",
    json: { annotations },
  });
}

// ── Frame-based endpoints (native mode: dataset + frame index) ──

export async function getFrameAnnotations(
  datasetId: number,
  frameNum: number
): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/datasets/${datasetId}/frames/${frameNum}/annotations/`);
}

export async function putFrameAnnotations(
  datasetId: number,
  frameNum: number,
  annotations: AnnotationPayloadItem[]
): Promise<ApiAnnotation[]> {
  return apiFetch<ApiAnnotation[]>(`/api/datasets/${datasetId}/frames/${frameNum}/annotations/`, {
    method: "PUT",
    json: { annotations },
  });
}
