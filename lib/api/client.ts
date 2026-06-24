/**
 * Thin adapter over the unified request() from lib/api.ts.
 * All calls here inherit token refresh, HTTPS upgrade, and localhost→LAN resolution.
 */
import { request, getAccessToken, ApiError } from "../api";

export { getAccessToken, ApiError };

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const options = json !== undefined ? { ...rest, body: JSON.stringify(json) } : rest;
  return request<T>(path, options);
}
