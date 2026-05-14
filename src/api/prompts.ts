import { apiRequest } from "./http";
import type {
  PromptDetail,
  PromptListData,
  PromptRenderResult,
  PromptRollbackResult,
  PromptVariableDef,
  PromptVersionDiffData,
  PromptVersionRecord
} from "./types";

export type PromptListSortBy = "createdAt" | "updatedAt" | "title";
export type PromptListSortOrder = "asc" | "desc";

export async function listPrompts(params: {
  page?: number;
  pageSize?: number;
  /** 标题模糊搜索 */
  keyword?: string;
  /** 多标签 AND；序列化为逗号分隔的单个 `tags` 查询参数（与 OpenAPI 约定一致） */
  tags?: string[];
  sortBy?: PromptListSortBy;
  sortOrder?: PromptListSortOrder;
}): Promise<PromptListData> {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  const kw = params.keyword?.trim();
  if (kw) q.set("keyword", kw);
  const tagList = (params.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tagList.length) q.set("tags", tagList.join(","));
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  const qs = q.toString();
  const data = await apiRequest<PromptListData>(`/api/prompts${qs ? `?${qs}` : ""}`);
  return data as PromptListData;
}

export async function getPrompt(id: string): Promise<PromptDetail> {
  return (await apiRequest<PromptDetail>(`/api/prompts/${encodeURIComponent(id)}`)) as PromptDetail;
}

export async function createPrompt(body: {
  title: string;
  userPrompt: string;
  description?: string | null;
  systemPrompt?: string | null;
  variables?: PromptVariableDef[];
  tags?: string[];
  visibility?: "private" | "public";
}): Promise<PromptDetail> {
  return (await apiRequest<PromptDetail>("/api/prompts", {
    method: "POST",
    body: JSON.stringify(body)
  })) as PromptDetail;
}

export async function updatePrompt(
  id: string,
  body: Record<string, unknown>
): Promise<PromptDetail> {
  return (await apiRequest<PromptDetail>(`/api/prompts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  })) as PromptDetail;
}

export async function deletePrompt(id: string): Promise<void> {
  await apiRequest(`/api/prompts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function replacePromptTags(id: string, tags: string[]): Promise<PromptDetail> {
  return (await apiRequest<PromptDetail>(`/api/prompts/${encodeURIComponent(id)}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags })
  })) as PromptDetail;
}

export async function renderPrompt(body: {
  systemPrompt?: string | null;
  userPrompt: string;
  variables: Record<string, string>;
}): Promise<PromptRenderResult> {
  return (await apiRequest<PromptRenderResult>("/api/prompts/render", {
    method: "POST",
    body: JSON.stringify(body)
  })) as PromptRenderResult;
}

export async function copyPrompt(id: string, title?: string): Promise<PromptDetail> {
  return (await apiRequest<PromptDetail>(`/api/prompts/${encodeURIComponent(id)}/copy`, {
    method: "POST",
    body: JSON.stringify(title ? { title } : {})
  })) as PromptDetail;
}

function pickStr(o: Record<string, unknown>, camel: string, snake: string): string | undefined {
  const a = o[camel];
  const b = o[snake];
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return undefined;
}

function pickNum(o: Record<string, unknown>, camel: string, snake: string): number {
  const a = o[camel];
  const b = o[snake];
  const v = a ?? b;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

/** 兼容 camelCase / snake_case 的版本行（便于 mock 与真后端混用） */
export function normalizePromptVersionRow(raw: Record<string, unknown>): PromptVersionRecord {
  const variables = raw.variables as PromptVersionRecord["variables"];
  const tagsRaw = raw.tags ?? raw.tags_snapshot ?? raw.tagsSnapshot;
  const tags = Array.isArray(tagsRaw) ? (tagsRaw as string[]) : undefined;
  const desc = raw.description;
  return {
    id: String(raw.id ?? ""),
    promptId: String(raw.promptId ?? raw.prompt_id ?? ""),
    versionNumber: pickNum(raw, "versionNumber", "version_number"),
    title: String(raw.title ?? ""),
    description: desc == null ? null : String(desc),
    systemPrompt: (pickStr(raw, "systemPrompt", "system_prompt") ?? null) as string | null,
    userPrompt: String(raw.userPrompt ?? raw.user_prompt ?? ""),
    variables: Array.isArray(variables) ? (variables as PromptVersionRecord["variables"]) : [],
    tags: tags ?? [],
    note: (raw.note ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? "")
  };
}

export async function listPromptVersions(promptId: string): Promise<PromptVersionRecord[]> {
  const data = await apiRequest<unknown[]>(`/api/prompts/${encodeURIComponent(promptId)}/versions`);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((x) => normalizePromptVersionRow(x as Record<string, unknown>));
}

export async function diffPromptVersions(
  promptId: string,
  fromVersion: number,
  toVersion: number
): Promise<PromptVersionDiffData> {
  const q = new URLSearchParams();
  q.set("from", String(fromVersion));
  q.set("to", String(toVersion));
  const raw = (await apiRequest<Record<string, unknown>>(
    `/api/prompts/${encodeURIComponent(promptId)}/versions/diff?${q.toString()}`
  )) as Record<string, unknown>;
  const fromObj =
    (raw.fromVersion as Record<string, unknown> | undefined) ??
    (raw.from_version as Record<string, unknown> | undefined);
  const toObj =
    (raw.toVersion as Record<string, unknown> | undefined) ??
    (raw.to_version as Record<string, unknown> | undefined);
  if (!fromObj || !toObj) {
    throw new Error("diff 响应缺少 fromVersion / toVersion");
  }
  return {
    fromVersion: normalizePromptVersionRow(fromObj),
    toVersion: normalizePromptVersionRow(toObj)
  };
}

export async function rollbackPromptVersion(
  promptId: string,
  versionRowId: string
): Promise<PromptRollbackResult> {
  const raw = (await apiRequest<Record<string, unknown>>(
    `/api/prompts/${encodeURIComponent(promptId)}/versions/${encodeURIComponent(versionRowId)}/rollback`,
    { method: "POST" }
  )) as Record<string, unknown>;
  return {
    message: String(raw.message ?? ""),
    newVersionId: String(raw.newVersionId ?? raw.new_version_id ?? ""),
    currentVersionNumber: pickNum(raw, "currentVersionNumber", "current_version_number")
  };
}

export async function createManualPromptVersion(
  promptId: string,
  body?: { note?: string | null }
): Promise<PromptVersionRecord> {
  const raw = (await apiRequest<Record<string, unknown>>(
    `/api/prompts/${encodeURIComponent(promptId)}/versions`,
    {
      method: "POST",
      body: JSON.stringify(body?.note != null && body.note !== "" ? { note: body.note } : {})
    }
  )) as Record<string, unknown>;
  return normalizePromptVersionRow(raw);
}
