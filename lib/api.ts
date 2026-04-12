/** Base URL for the Visiox Django API (set `NEXT_PUBLIC_API_URL` in `.env.local`). */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const BASE_URL = API_BASE_URL;

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
}

export interface Dataset {
  id: number;
  project: number;
  name: string;
  description: string | null;
  version: number;
  media_count: number;
  thumbnail: string | null;
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

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retryOn401 && !isRefreshing) {
    isRefreshing = true;
    const refreshed = await tryRefresh();
    isRefreshing = false;
    if (refreshed) {
      return request<T>(path, options, false);
    }
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.error || JSON.stringify(err);
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(TOKEN_KEYS.access, data.access);
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

// ── Datasets ───────────────────────────────────────────────────────────────

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
  exportUrl(id: number, format: 'coco' | 'yolo' | 'voc') {
    const token = getAccessToken();
    return `${BASE_URL}/api/datasets/${id}/export/?format=${format}${token ? `&token=${token}` : ''}`;
  },
  newVersion(id: number) {
    return request<Dataset>(`/api/datasets/${id}/new_version/`, { method: 'POST' });
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
