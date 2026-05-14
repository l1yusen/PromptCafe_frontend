import type { ApiErrorBody } from "./types";

const TOKEN_KEY = "promptcafe_token";
const REFRESH_TOKEN_KEY = "promptcafe_refresh_token";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function baseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  return typeof v === "string" && v.length > 0 ? v.replace(/\/$/, "") : "";
}

export class ApiError extends Error {
  readonly code: string | number;
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.detail?.trim() || body.message || String(body.code));
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.detail = body.detail;
  }
}

function redirectOnUnauthorized(path: string) {
  if (typeof window === "undefined") return;
  const publicPath = window.location.pathname === "/login" || window.location.pathname === "/register";
  if (publicPath) return;
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?redirect=${redirect || encodeURIComponent(path)}`);
}

/** 兼容 `{ data, error }` 与 `{ code, message, data }`；成功返回 `data`；204 无体返回 `undefined` */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 204) {
    return undefined;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, { code: "PARSE_ERROR", message: "响应不是合法 JSON" });
  }

  const envelope = json as {
    data?: unknown;
    error?: ApiErrorBody | null;
    code?: string | number;
    message?: string;
    detail?: string;
  };

  if (envelope.error) {
    if (res.status === 401) {
      clearToken();
      redirectOnUnauthorized(path);
    }
    throw new ApiError(res.status, envelope.error);
  }

  if ("code" in envelope && "message" in envelope) {
    const numericCode = typeof envelope.code === "number" ? envelope.code : Number(envelope.code);
    if (!res.ok || numericCode >= 400) {
      if (res.status === 401 || numericCode === 401) {
        clearToken();
        redirectOnUnauthorized(path);
      }
      throw new ApiError(res.status, {
        code: envelope.code ?? res.status,
        message: envelope.message ?? "请求失败",
        detail: envelope.detail
      });
    }
    return envelope.data as T;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      redirectOnUnauthorized(path);
    }
    throw new ApiError(res.status, {
      code: "HTTP_ERROR",
      message: `请求失败 (${res.status})`
    });
  }

  return envelope.data as T;
}
