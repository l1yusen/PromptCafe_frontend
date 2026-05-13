import { apiRequest } from "./http";
import type {
  PromptDetail,
  PromptListData,
  PromptRenderResult,
  PromptVariableDef
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
