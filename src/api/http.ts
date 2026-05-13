import type { ApiErrorBody } from "./types";

const TOKEN_KEY = "promptcafe_token";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function baseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  return typeof v === "string" && v.length > 0 ? v.replace(/\/$/, "") : "";
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
  }
}

/** 解析 `{ data, error }`；成功返回 `data`；204 无体返回 `undefined` */
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

  const envelope = json as { data?: unknown; error?: ApiErrorBody | null };

  if (envelope.error) {
    throw new ApiError(res.status, envelope.error);
  }

  if (!res.ok) {
    throw new ApiError(res.status, {
      code: "HTTP_ERROR",
      message: `请求失败 (${res.status})`
    });
  }

  return envelope.data as T;
}
