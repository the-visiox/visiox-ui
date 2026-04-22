import { apiFetch } from "./client";

export type DatasetDto = {
  id: number;
  project: number;
  name: string;
  description?: string | null;
  media_count?: number;
};

export type MediaDto = {
  id: number;
  dataset: number;
  type: string;
  file_url: string | null;
  original_filename?: string;
  width?: number | null;
  height?: number | null;
};

export async function getDataset(id: number): Promise<DatasetDto> {
  return apiFetch<DatasetDto>(`/api/datasets/${id}/`);
}

export async function getDatasetMedia(datasetId: number): Promise<MediaDto[]> {
  return apiFetch<MediaDto[]>(`/api/datasets/${datasetId}/media/`);
}
