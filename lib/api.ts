/** Base URL for the Visiox Django API (set `NEXT_PUBLIC_API_URL` in `.env.local`). */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const BASE_URL = API_BASE_URL;
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function resolveBaseUrl(): string {
  const normalized = BASE_URL.replace(/\/+$/, '');
  if (typeof window === 'undefined') return normalized;

  try {
    const parsed = new URL(normalized);
    const browserHost = window.location.hostname;
    const browserIsLocalhost = LOCALHOST_HOSTNAMES.has(browserHost);

    if (LOCALHOST_HOSTNAMES.has(parsed.hostname) && !browserIsLocalhost) {
      parsed.hostname = browserHost;
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return normalized;
  }
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';

  const normalized = url.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;

  const baseUrl = resolveBaseUrl();
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${baseUrl}${cleanPath}`;
}

// ── Storage helpers ────────────────────────────────────────────────────────

export const TOKEN_KEYS = {
  access: 'visiox_access_token',
  refresh: 'visiox_refresh_token',
  user: 'visiox_user',
} as const;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.access);
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

export function clearTokens() {
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
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
  team: number;
  team_name: string;
  owner: number | null;
  name: string;
  task_type: string;
  description: string | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  cvat_project_id: number | null;
}

export interface Dataset {
  id: number;
  project: number;
  name: string;
  description: string | null;
  version: number;
  media_count: number;
  thumbnail: string | null;
  cvat_task_id: number | null;
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
  type: 'image' | 'video';
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
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
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
  status: 'inactive' | 'starting' | 'active' | 'stopping' | 'error';
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

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Only add Content-Type: application/json if there is a body and it's not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Normalize URL to avoid double slashes or missing slashes
  const baseUrl = resolveBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
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
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
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
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  
  return undefined as unknown as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refresh) return false;
  try {
    const baseUrl = resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    return request<User>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, false);
  },

  register(username: string, email: string, password: string, first_name = '', last_name = '') {
    return request<User>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, first_name, last_name }),
    }, false);
  },

  oauth(provider: 'google' | 'github', code: string, redirect_uri: string) {
    return request<User>('/api/auth/oauth/', {
      method: 'POST',
      body: JSON.stringify({ provider, code, redirect_uri }),
    }, false);
  },

  logout(refresh_token: string) {
    return request<void>('/api/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    });
  },
};

// ── Projects ───────────────────────────────────────────────────────────────

export const projects = {
  list() {
    return request<PaginatedResponse<Project>>('/api/projects/');
  },
  get(id: number) {
    return request<Project>(`/api/projects/${id}/`);
  },
  create(data: { team: number; name: string; task_type: string; description?: string }) {
    return request<Project>('/api/projects/', { method: 'POST', body: JSON.stringify(data) });
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

export const teams = {
  list() {
    return request<PaginatedResponse<Team>>('/api/teams/');
  },
  create(name: string) {
    return request<Team>('/api/teams/', { method: 'POST', body: JSON.stringify({ name }) });
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
    return request<PaginatedResponse<AnnotationClass>>(`/api/classes/?project=${projectId}`);
  },
  create(data: {
    project: number;
    name: string;
    color?: string;
    attributes?: Record<string, unknown>;
  }) {
    return request<AnnotationClass>('/api/classes/', { method: 'POST', body: JSON.stringify(data) });
  },
  update(
    id: number,
    data: { name?: string; color?: string; attributes?: Record<string, unknown> },
  ) {
    return request<AnnotationClass>(`/api/classes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete(id: number) {
    return request<void>(`/api/classes/${id}/`, { method: 'DELETE' });
  },
};

// ── Datasets ───────────────────────────────────────────────────────────────

export interface CvatJobStats {
  id: number;
  stage: string;
  state: string;
  frame_count: number;
  assignee: string | null;
}

export interface CvatAnnotationStats {
  shapes: number;
  tags: number;
  tracks: number;
  total: number;
}

export interface CvatTaskStats {
  exists: boolean;
  task_id?: number;
  name?: string;
  status?: string;
  size?: number;
  mode?: string;
  dimension?: string;
  created_date?: string;
  updated_date?: string;
  image_quality?: number;
  jobs?: CvatJobStats[];
  annotations?: CvatAnnotationStats;
  url?: string;
  error?: string;
}

export interface DatasetStats {
  id: number;
  name: string;
  version: number;
  project_id: number;
  project_name: string | null;
  cvat_task_id: number | null;
  created_at: string;
  updated_at: string;
  cvat: CvatTaskStats | null;
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
  /** Direct media URL used when CVAT has no frame data but VisioX media rows exist. */
  image_url?: string | null;
  name: string;
  width: number;
  height: number;
  annotations: FrameAnnotation[];
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

export const datasets = {
  list(projectId?: number) {
    const qs = projectId ? `?project=${projectId}` : '';
    return request<PaginatedResponse<Dataset>>(`/api/datasets/${qs}`);
  },
  get(id: number) {
    return request<Dataset>(`/api/datasets/${id}/`);
  },
  create(data: { project: number; name: string; description?: string }) {
    return request<Dataset>('/api/datasets/', { method: 'POST', body: JSON.stringify(data) });
  },
  media(id: number) {
    return request<Media[]>(`/api/datasets/${id}/media/`);
  },
  upload(id: number, file: File, type: 'image' | 'video' = 'image') {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return request<Media>(`/api/datasets/${id}/upload/`, { method: 'POST', body: form });
  },
  deleteMedia(id: number, mediaIds: number[]) {
    return request<{ deleted: number; ids: number[] }>(`/api/datasets/${id}/delete-media/`, {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  },
  stats(id: number) {
    return request<DatasetStats>(`/api/datasets/${id}/stats/`);
  },
  browser(id: number) {
    return request<BrowserData>(`/api/datasets/${id}/browser/`);
  },
  frameUrl(id: number, frameNum: number, quality: 'compressed' | 'original' = 'compressed') {
    const token = getAccessToken();
    const baseUrl = resolveBaseUrl();
    return `${baseUrl}/api/datasets/${id}/frames/${frameNum}/?quality=${quality}${token ? `&token=${token}` : ''}`;
  },
  exportUrl(id: number, format: 'coco' | 'yolo' | 'voc') {
    const token = getAccessToken();
    const baseUrl = resolveBaseUrl();
    return `${baseUrl}/api/datasets/${id}/export/?format=${format}${token ? `&token=${token}` : ''}`;
  },
  delete(id: number) {
    return request<void>(`/api/datasets/${id}/`, { method: 'DELETE' });
  },
  newVersion(id: number) {
    return request<Dataset>(`/api/datasets/${id}/new_version/`, { method: 'POST' });
  },
  annotateUrl(id: string | number) {
    return request<{ url?: string; error?: string }>(`/api/datasets/${id}/annotate_url/`);
  },
  syncCvat(id: string | number) {
    return request<{ status: string; version: number; cvat_status?: string; total_labels?: number }>(`/api/datasets/${id}/sync_cvat/`, { method: 'POST' });
  },
};

// ── Dataverse ───────────────────────────────────────────────────────────────

export const dataverse = {
  list(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<PaginatedResponse<DataverseProject>>(`/api/dataverse/${qs}`);
  },
  get(id: number) {
    return request<DataverseProject>(`/api/dataverse/${id}/`);
  },
  shareProject(data: {
    project: number;
    title?: string;
    summary?: string;
    tags?: string[];
    license?: string;
    is_public?: boolean;
  }) {
    return request<DataverseProject>('/api/dataverse/share-project/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  fork(id: number, data: { team: number; name?: string }) {
    return request<{ project_id: number; name: string }>(`/api/dataverse/${id}/fork/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ── Training ───────────────────────────────────────────────────────────────

export const training = {
  listArchitectures() {
    return request<PaginatedResponse<ModelArchitecture>>('/api/architectures/');
  },
  listJobs() {
    return request<PaginatedResponse<TrainingJob>>('/api/training-jobs/');
  },
  getJob(id: number) {
    return request<TrainingJob>(`/api/training-jobs/${id}/`);
  },
  createJob(data: {
    project: number;
    name: string;
    dataset?: number;
    architecture?: number;
    hyperparams?: Record<string, unknown>;
  }) {
    return request<TrainingJob>('/api/training-jobs/', { method: 'POST', body: JSON.stringify(data) });
  },
  startJob(id: number) {
    return request<TrainingJob>(`/api/training-jobs/${id}/start/`, { method: 'POST' });
  },
  stopJob(id: number) {
    return request<TrainingJob>(`/api/training-jobs/${id}/stop/`, { method: 'POST' });
  },
  getExperiments(jobId: number) {
    return request<Experiment[]>(`/api/training-jobs/${jobId}/experiments/`);
  },
  getMetrics(experimentId: number) {
    return request<RunMetric[]>(`/api/experiments/${experimentId}/metrics/`);
  },
};

// ── Deployments ────────────────────────────────────────────────────────────

export const deployments = {
  listRegistry() {
    return request<PaginatedResponse<ModelRegistry>>('/api/registry/');
  },
  listEndpoints() {
    return request<PaginatedResponse<InferenceEndpoint>>('/api/endpoints/');
  },
  getEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/endpoints/${id}/`);
  },
  createEndpoint(data: { registry_entry: number; name: string; confidence_threshold?: number }) {
    return request<InferenceEndpoint>('/api/endpoints/', { method: 'POST', body: JSON.stringify(data) });
  },
  startEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/endpoints/${id}/start/`, { method: 'POST' });
  },
  stopEndpoint(id: number) {
    return request<InferenceEndpoint>(`/api/endpoints/${id}/stop/`, { method: 'POST' });
  },
};
