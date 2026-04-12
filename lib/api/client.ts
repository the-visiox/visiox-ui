const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return API_BASE.replace(/\/$/, "");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("visiox_access_token");
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("visiox_access_token", access);
  localStorage.setItem("visiox_refresh_token", refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("visiox_access_token");
  localStorage.removeItem("visiox_refresh_token");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.statusText || "Request failed", res.status, text);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
