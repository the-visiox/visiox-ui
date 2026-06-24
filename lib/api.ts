/** Base URL for the Visiox Django API (set `NEXT_PUBLIC_API_URL` in `.env.local`). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const BASE_URL = API_BASE_URL;
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function resolveBaseUrl(): string {
  const normalized = BASE_URL.replace(/\/+$/, "");
  if (typeof window === "undefined") return normalized;

  try {
    const parsed = new URL(normalized);
    const browserHost = window.location.hostname;
    const browserIsLocalhost = LOCALHOST_HOSTNAMES.has(browserHost);

    if (LOCALHOST_HOSTNAMES.has(parsed.hostname) && !browserIsLocalhost) {
      parsed.hostname = browserHost;
    }

    // Upgrade http→https when the browser is already on HTTPS and the API host is not localhost
    if (
      window.location.protocol === "https:" &&
      parsed.protocol === "http:" &&
      !LOCALHOST_HOSTNAMES.has(parsed.hostname)
    ) {
      parsed.protocol = "https:";
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return normalized;
  }
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";

  const normalized = url.trim().replace(/\\/g, "/");
  if (!normalized) return "";
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;

  const baseUrl = resolveBaseUrl();
  const cleanPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${baseUrl}${cleanPath}`;
}

// ── Storage helpers ────────────────────────────────────────────────────────

export const TOKEN_KEYS = {
  access: "visiox_access_token",
  refresh: "visiox_refresh_token",
  user: "visiox_user",
} as const;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.access);
}

const SESSION_COOKIE = "visiox_session";

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  // Mirror a session flag cookie so the server-side middleware can detect auth state
  document.cookie = `${SESSION_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=86400`;
}

export function clearTokens() {
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  access_token: string;
  refresh_token: string;
}

export interface Project {
  id: number;
  team: number | null;
  team_name: string | null;
  owner: number | null;
  name: string;
  task_type: string;
  description: string | null;
  thumbnail: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: number;
  project: number;
  name: string;
  description: string | null;
  version: number;
  media_count: number;
  annotated_count?: number;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataverseProject {
  id: number;
  source_project: number;
  owner: number;
  owner_username: string;
  team_name: string;
  title: string;
  summary: string;
  tags: string[];
  license: string;
  is_public: boolean;
  task_type: string;
  dataset_count: number;
  media_count: number;
  class_count: number;
  thumbnail: string | null;
  fork_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: number;
  dataset: number;
  type: "image" | "video";
  file: string;
  file_url: string | null;
  original_filename: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  metadata: Record<string, unknown>;
  uploaded_at: string;
}

export interface ModelArchitecture {
  id: number;
  name: string;
  backbone: string;
  task_type: string;
  description: string;
}

export interface TrainingJob {
  id: number;
  name: string;
  project: number;
  dataset: number | null;
  architecture: number | null;
  architecture_name: string | null;
  status: "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";
  hyperparams: Record<string, unknown>;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  experiment_count: number;
}

export interface RunMetric {
  id: number;
  experiment: number;
  epoch: number;
  step: number;
  loss: number | null;
  val_loss: number | null;
  map50: number | null;
  f1: number | null;
  recorded_at: string;
}

export interface Experiment {
  id: number;
  job: number;
  name: string;
  metrics: RunMetric[];
}

export interface InferenceEndpoint {
  id: number;
  registry_entry: number;
  name: string;
  status: "inactive" | "starting" | "active" | "stopping" | "error";
  endpoint_url: string;
  auth_token: string;
  rate_limit_rpm: number;
  confidence_threshold: number;
  created_at: string;
}

export interface ModelRegistry {
  id: number;
  name: string;
  version: string;
  format: string;
  training_job: number | null;
  metrics: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export async function request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Only add Content-Type: application/json if there is a body and it's not FormData
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Normalize URL to avoid double slashes or missing slashes
  const baseUrl = resolveBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(`Connection failed (${url}): ${err instanceof Error ? err.message : String(err)}`);
  }

  if (res.status === 401 && retryOn401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      // Re-fetch token after refresh
      const newToken = getAccessToken();
      const retryHeaders = {
        ...headers,
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
      };
      return request<T>(path, { ...options, headers: retryHeaders }, false);
    }

    clearTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.error || JSON.stringify(err);
    } catch {
      // If not JSON, use the status text or the generic message
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  // Handle case where body might be empty despite 200/201 status
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  if (contentType && (contentType.includes("application/zip") || contentType.includes("application/octet-stream"))) {
    return res.blob() as Promise<T>;
  }

  return undefined as unknown as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refresh) return false;
  try {
    const baseUrl = resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.access, data.refresh || refresh);
    return true;
  } catch {
    return false;
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  login(username: string, password: string) {
    return request<User>(
      "/api/v1/auth/login/",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
      false,
    );
  },

  register(username: string, email: string, password: string, first_name = "", last_name = "") {
    return request<User>(
      "/api/v1/auth/register/",
      {
        method: "POST",
        body: JSON.stringify({ username, email, password, first_name, last_name }),
      },
      false,
    );
  },

  oauth(provider: "google" | "github", code: string, redirect_uri: string) {
    return request<User>(
      "/api/v1/auth/oauth/",
      {
        method: "POST",
        body: JSON.stringify({ provider, code, redirect_uri }),
      },
      false,
    );
  },

  logout(refresh_token: string) {
    return request<void>("/api/v1/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    });
  },
};

// ── Projects ───────────────────────────────────────────────────────────────

export const projects = {
  list() {
    return request<PaginatedResponse<Project>>("/api/v1/projects/");
  },
  get(id: number) {
    return request<Project>(`/api/v1/projects/${id}/`);
  },
  create(data: { team?: number; name: string; task_type: string; description?: string; is_public?: boolean }) {
    return request<Project>("/api/v1/projects/", { method: "POST", body: JSON.stringify(data) });
  },
  delete(id: number) {
    return request<void>(`/api/v1/projects/${id}/`, { method: "DELETE" });
  },
};

// ── Teams ──────────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  owner: number;
  owner_username: string;
  member_count: number;
  created_at: string;
}

export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface TeamMember {
  id: number;
  user: number;
  user_username: string;
  user_email: string;
  role: MemberRole;
  joined_at: string;
  is_online?: boolean;
}

export interface Invitation {
  id: number;
  email: string;
  role: MemberRole;
  status: InvitationStatus;
  invited_by_username: string;
  created_at: string;
  expires_at: string;
}

export const teams = {
  list() {
    return request<PaginatedResponse<Team>>("/api/v1/teams/");
  },
  create(name: string) {
    return request<Team>("/api/v1/teams/", { method: "POST", body: JSON.stringify({ name }) });
  },
  members(teamId: number) {
    return request<TeamMember[]>(`/api/v1/teams/${teamId}/members/`);
  },
  invite(teamId: number, username: string, role: MemberRole = "member") {
    return request<TeamMember>(`/api/v1/teams/${teamId}/invite/`, {
      method: "POST",
      body: JSON.stringify({ username, role }),
    });
  },
  sendInvitation(teamId: number, email: string, role: MemberRole = "member") {
    return request<Invitation>(`/api/v1/teams/${teamId}/invitations/`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  },
  listInvitations(teamId: number) {
    return request<Invitation[]>(`/api/v1/teams/${teamId}/invitations/`);
  },
  cancelInvitation(teamId: number, inviteId: number) {
    return request<void>(`/api/v1/teams/${teamId}/invitations/${inviteId}/`, { method: "DELETE" });
  },
  acceptInvitation(token: string) {
    return request<{ detail: string; member: TeamMember }>(`/api/v1/invitations/${token}/accept/`, { method: "POST" });
  },
  removeMember(teamId: number, memberId: number) {
    return request<void>(`/api/v1/teams/${teamId}/members/${memberId}/`, { method: "DELETE" });
  },
  updateMemberRole(teamId: number, memberId: number, role: MemberRole) {
    return request<TeamMember>(`/api/v1/teams/${teamId}/members/${memberId}/`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
};

// ── Annotation classes (labels per project) ────────────────────────────────

export interface AnnotationClass {
  id: number;
  project: number;
  name: string;
  color: string;
  attributes: Record<string, unknown>;
  annotation_count: number;
  created_at: string;
}

export const annotationClasses = {
  list(projectId: number) {
    return request<PaginatedResponse<AnnotationClass>>(`/api/v1/classes/?project=${projectId}`);
  },
  create(data: { project: number; name: string; color?: string; attributes?: Record<string, unknown> }) {
    return request<AnnotationClass>("/api/v1/classes/", { method: "POST", body: JSON.stringify(data) });
  },
  update(id: number, data: { name?: string; color?: string; attributes?: Record<string, unknown> }) {
    return request<AnnotationClass>(`/api/v1/classes/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  delete(id: number) {
    return request<void>(`/api/v1/classes/${id}/`, { method: "DELETE" });
  },
};

// ── Datasets ───────────────────────────────────────────────────────────────

export interface DatasetStats {
  id: number;
  name: string;
  version: number;
  project_id: number;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

// ── Data Browser types ──────────────────────────────────────────────────────

export interface FrameAnnotation {
  id: number;
  type: string;
  label_id: number;
  label: string;
  color: string;
  points: number[];
  occluded: boolean;
}

export interface BrowserFrame {
  frame: number;
  /** Present when backend can map this frame to a VisioX Media row (standalone or aligned uploads). */
  media_id?: number;
  /** Direct media URL. */
  image_url?: string | null;
  name: string;
  width: number;
  height: number;
  annotations: FrameAnnotation[];
  /** True when this frame is an augmentation-generated image (separate browser tab). */
  augmented?: boolean;
}

export interface BrowserLabel {
  id: number;
  name: string;
  color: string;
  type: string;
}

export interface BrowserData {
  dataset_id: number;
  dataset_name: string;
  version: number;
  task_id: number;
  frame_count: number;
  labels: BrowserLabel[];
  frames: BrowserFrame[];
  annotation_count: number;
}

export type DatasetExportFormat = "coco" | "yolo" | "voc" | "mask" | "coco_keypoints" | "imagenet";

function datasetListPath(projectId?: number, page?: number): string {
  const params = new URLSearchParams();
  if (projectId) params.set("project", String(projectId));
  if (page) params.set("page", String(page));
  const query = params.toString();
  return `/api/v1/datasets/${query ? `?${query}` : ""}`;
}

async function listAllDatasets(projectId?: number): Promise<Dataset[]> {
  const allDatasets: Dataset[] = [];
  let page = 1;

  while (true) {
    const response = await request<PaginatedResponse<Dataset>>(datasetListPath(projectId, page));
    allDatasets.push(...(response.results ?? []));
    if (!response.next) return allDatasets;
    page += 1;
  }
}

export const datasets = {
  list(projectId?: number, page?: number) {
    return request<PaginatedResponse<Dataset>>(datasetListPath(projectId, page));
  },
  listAll: listAllDatasets,
  get(id: number) {
    return request<Dataset>(`/api/v1/datasets/${id}/`);
  },
  create(data: { project: number; name: string; description?: string }) {
    return request<Dataset>("/api/v1/datasets/", { method: "POST", body: JSON.stringify(data) });
  },
  media(id: number) {
    return request<Media[]>(`/api/v1/datasets/${id}/media/`);
  },
  upload(id: number, file: File, type: "image" | "video" = "image") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return request<Media>(`/api/v1/datasets/${id}/upload/`, { method: "POST", body: form });
  },
  uploadBatch(id: number, files: File[], type: "image" | "video" = "image") {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    form.append("type", type);
    return request<Media[]>(`/api/v1/datasets/${id}/upload-batch/`, { method: "POST", body: form });
  },
  deleteMedia(id: number, mediaIds: number[]) {
    return request<{ deleted: number; ids: number[] }>(`/api/v1/datasets/${id}/media/`, {
      method: "DELETE",
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  },
  stats(id: number) {
    return request<DatasetStats>(`/api/v1/datasets/${id}/stats/`);
  },
  browser(id: number) {
    return request<BrowserData>(`/api/v1/datasets/${id}/browser/`);
  },
  frameUrl(id: number, frameNum: number, quality: "compressed" | "original" | "thumb" = "compressed") {
    const token = getAccessToken();
    const baseUrl = resolveBaseUrl();
    return `${baseUrl}/api/v1/datasets/${id}/frames/${frameNum}/?quality=${quality}${token ? `&token=${token}` : ""}`;
  },
  exportUrl(id: number, format: DatasetExportFormat, saveImages = false) {
    const token = getAccessToken();
    const baseUrl = resolveBaseUrl();
    const params = new URLSearchParams({ export_format: format });
    if (saveImages) params.set("save_images", "1");
    if (token) params.set("token", token);
    return `${baseUrl}/api/v1/datasets/${id}/export/?${params.toString()}`;
  },
  exportArchive(id: number, format: DatasetExportFormat, saveImages = false) {
    const params = new URLSearchParams({
      export_format: format,
      save_images: saveImages ? "1" : "0",
    });
    return request<Blob>(`/api/v1/datasets/${id}/export/?${params.toString()}`);
  },
  delete(id: number) {
    return request<void>(`/api/v1/datasets/${id}/`, { method: "DELETE" });
  },
  newVersion(id: number) {
    return request<Dataset>(`/api/v1/datasets/${id}/versions/`, { method: "POST" });
  },
  augmentPreview(
    id: number,
    config: {
      preprocess: {
        auto_orient: boolean;
        resize: boolean;
        resize_width: number;
        resize_height: number;
        grayscale: boolean;
      };
      augment: {
        flip_h: boolean;
        flip_v: boolean;
        rotate90: boolean;
        rotation: number;
        brightness: number;
        blur: number;
        noise: number;
        shear: number;
        contrast: number;
        hue: number;
        saturation: number;
        motion_blur: number;
        cutout: boolean;
      };
      count?: number;
    },
  ) {
    return request<{ previews: Array<{ media_id: number; name: string; augmented_url: string }> }>(
      `/api/v1/datasets/${id}/augmentations/preview/`,
      { method: "POST", body: JSON.stringify(config) },
    );
  },
  augmentApply(
    id: number,
    config: {
      preprocess: {
        auto_orient: boolean;
        resize: boolean;
        resize_width: number;
        resize_height: number;
        grayscale: boolean;
      };
      augment: {
        flip_h: boolean;
        flip_v: boolean;
        rotate90: boolean;
        rotation: number;
        brightness: number;
        blur: number;
        noise: number;
        shear: number;
        contrast: number;
        hue: number;
        saturation: number;
        motion_blur: number;
        cutout: boolean;
      };
      multiplier: number;
    },
  ) {
    return request<{ job_id: string; total: number }>(`/api/v1/datasets/${id}/augmentations/`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },
  augmentStatus(id: number, jobId: string) {
    return request<{
      total: number;
      done: number;
      generated: number;
      status: "running" | "done" | "error";
      error: string | null;
    }>(`/api/v1/datasets/${id}/augmentations/status/?job=${encodeURIComponent(jobId)}`);
  },
};

// ── Dataverse ───────────────────────────────────────────────────────────────

export const dataverse = {
  list(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<PaginatedResponse<DataverseProject>>(`/api/v1/dataverse/${qs}`);
  },
  get(id: number) {
    return request<DataverseProject>(`/api/v1/dataverse/${id}/`);
  },
  shareProject(data: {
    project: number;
    title?: string;
    summary?: string;
    tags?: string[];
    license?: string;
    is_public?: boolean;
  }) {
    return request<DataverseProject>("/api/v1/dataverse/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  fork(id: number, data: { team: number; name?: string }) {
    return request<{ project_id: number; name: string }>(`/api/v1/dataverse/${id}/fork/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ── Training ───────────────────────────────────────────────────────────────

export const training = {
  listArchitectures() {
    return request<PaginatedResponse<ModelArchitecture>>("/api/v1/architectures/");
  },
  listJobs() {
    return request<PaginatedResponse<TrainingJob>>("/api/v1/training-jobs/");
  },
  getJob(id: number) {
    return request<TrainingJob>(`/api/v1/training-jobs/${id}/`);
  },
  createJob(data: {
    project: number;
    name: string;
    dataset?: number;
    architecture?: number;
    hyperparams?: Record<string, unknown>;
  }) {
    return request<TrainingJob>("/api/v1/training-jobs/", { method: "POST", body: JSON.stringify(data) });
  },
  startJob(id: number) {
    return request<TrainingJob>(`/api/v1/training-jobs/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: "queued" }),
    });
  },
  stopJob(id: number) {
    return request<TrainingJob>(`/api/v1/training-jobs/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
  },
  getExperiments(jobId: number) {
    return request<Experiment[]>(`/api/v1/training-jobs/${jobId}/experiments/`);
  },
  getMetrics(experimentId: number) {
    return request<RunMetric[]>(`/api/v1/experiments/${experimentId}/metrics/`);
  },
};

// ── Deployments ────────────────────────────────────────────────────────────

export const deployments = {
  listRegistry() {
    return request<PaginatedResponse<ModelRegistry>>("/api/v1/registry/");
  },
  listEndpoints() {
    return request<PaginatedResponse<InferenceEndpoint>>("/api/v1/endpoints/");
  },
  getEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/v1/endpoints/${id}/`);
  },
  createEndpoint(data: { registry_entry: number; name: string; confidence_threshold?: number }) {
    return request<InferenceEndpoint>("/api/v1/endpoints/", { method: "POST", body: JSON.stringify(data) });
  },
  startEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/v1/endpoints/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    });
  },
  stopEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/v1/endpoints/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: "inactive" }),
    });
  },
};
