import { apiFetch } from "./client";

export type LabelProfileItem = { id: number; name: string; color: string };

export async function getMediaLabelProfile(mediaId: number): Promise<LabelProfileItem[]> {
  const res = await apiFetch<{ labels: LabelProfileItem[] }>(`/api/v1/media/${mediaId}/label-profile/`);
  return res.labels ?? [];
}

export async function putMediaLabelProfile(
  mediaId: number,
  labels: LabelProfileItem[]
): Promise<LabelProfileItem[]> {
  const res = await apiFetch<{ labels: LabelProfileItem[] }>(`/api/v1/media/${mediaId}/label-profile/`, {
    method: "PUT",
    json: { labels },
  });
  return res.labels ?? [];
}

export async function getFrameLabelProfile(datasetId: number, frameNum: number): Promise<LabelProfileItem[]> {
  const res = await apiFetch<{ labels: LabelProfileItem[] }>(
    `/api/v1/datasets/${datasetId}/frames/${frameNum}/label-profile/`
  );
  return res.labels ?? [];
}

export async function putFrameLabelProfile(
  datasetId: number,
  frameNum: number,
  labels: LabelProfileItem[]
): Promise<LabelProfileItem[]> {
  const res = await apiFetch<{ labels: LabelProfileItem[] }>(
    `/api/v1/datasets/${datasetId}/frames/${frameNum}/label-profile/`,
    {
      method: "PUT",
      json: { labels },
    }
  );
  return res.labels ?? [];
}
