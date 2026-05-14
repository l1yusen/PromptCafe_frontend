import { apiRequest } from "./http";

export type CommunitySort = "latest" | "favoriteCount" | "hot";
export type ReviewStatus = "pending" | "approved" | "rejected" | "removed";
export type ReportReason = "unsafe_content" | "copyright" | "spam" | "privacy" | "other";

export type CommunityPromptVariable = {
  name: string;
  type: "text" | "textarea" | "select" | "number";
  label: string;
  required: boolean;
  options?: string[];
};

export type CommunityPromptListItem = {
  id: string;
  promptId: string;
  title: string;
  description: string;
  contentPreview?: string;
  tags: string[];
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  favoriteCount: number;
  favorited: boolean;
  viewCount?: number;
  publishedAt: string;
};

export type CommunityPromptDetail = CommunityPromptListItem & {
  systemPrompt?: string | null;
  userPrompt: string;
  variables?: CommunityPromptVariable[];
  usageGuide: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type CommunityPromptListData = {
  items: CommunityPromptListItem[];
  pagination: Pagination;
};

export type CommunityTagItem = {
  name: string;
  promptCount: number;
};

export type SharePromptResult = {
  shareId: string;
  promptId: string;
  title: string;
  reviewStatus: ReviewStatus;
  submittedAt: string;
};

export type MyShareItem = {
  shareId: string;
  promptId: string;
  title: string;
  reviewStatus: ReviewStatus;
  auditNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export type MyShareListData = {
  items: MyShareItem[];
  pagination: Pagination;
};

export type ReportCommunityPromptResult = {
  reportId: string;
  communityPromptId: string;
  status: "pending" | "processed" | "rejected";
  submittedAt: string;
};

export async function listCommunityPrompts(params: {
  keyword?: string;
  tags?: string[];
  sort?: CommunitySort;
  page?: number;
  pageSize?: number;
}): Promise<CommunityPromptListData> {
  const q = new URLSearchParams();
  const keyword = params.keyword?.trim();
  if (keyword) q.set("keyword", keyword);
  const tags = (params.tags ?? []).map((x) => x.trim()).filter(Boolean);
  if (tags.length) q.set("tags", tags.join(","));
  if (params.sort) q.set("sort", params.sort);
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  return (await apiRequest<CommunityPromptListData>(
    `/api/community/prompts${qs ? `?${qs}` : ""}`
  )) as CommunityPromptListData;
}

export async function getCommunityPrompt(id: string): Promise<CommunityPromptDetail> {
  return (await apiRequest<CommunityPromptDetail>(
    `/api/community/prompts/${encodeURIComponent(id)}`
  )) as CommunityPromptDetail;
}

export async function searchCommunityPromptsByTag(params: {
  tag: string;
  page?: number;
  pageSize?: number;
}): Promise<CommunityPromptListData> {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  return (await apiRequest<CommunityPromptListData>(
    `/api/community/tags/${encodeURIComponent(params.tag)}/prompts${qs ? `?${qs}` : ""}`
  )) as CommunityPromptListData;
}

export async function sharePrompt(body: {
  promptId: string;
  title: string;
  description: string;
  tags: string[];
  usageGuide: string;
}): Promise<SharePromptResult> {
  return (await apiRequest<SharePromptResult>("/api/community/shares", {
    method: "POST",
    body: JSON.stringify(body)
  })) as SharePromptResult;
}

export async function listMyShares(params: {
  reviewStatus?: ReviewStatus | "";
  page?: number;
  pageSize?: number;
}): Promise<MyShareListData> {
  const q = new URLSearchParams();
  if (params.reviewStatus) q.set("reviewStatus", params.reviewStatus);
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  return (await apiRequest<MyShareListData>(
    `/api/community/shares/my${qs ? `?${qs}` : ""}`
  )) as MyShareListData;
}

export async function withdrawShare(
  shareId: string
): Promise<{ shareId: string; withdrawn: boolean; withdrawnAt: string }> {
  return (await apiRequest<{ shareId: string; withdrawn: boolean; withdrawnAt: string }>(
    `/api/community/shares/${encodeURIComponent(shareId)}`,
    { method: "DELETE" }
  )) as { shareId: string; withdrawn: boolean; withdrawnAt: string };
}

export async function favoriteCommunityPrompt(
  id: string
): Promise<{ communityPromptId: string; favorited: boolean; favoriteCount: number }> {
  return (await apiRequest<{ communityPromptId: string; favorited: boolean; favoriteCount: number }>(
    `/api/community/prompts/${encodeURIComponent(id)}/favorite`,
    { method: "POST" }
  )) as { communityPromptId: string; favorited: boolean; favoriteCount: number };
}

export async function unfavoriteCommunityPrompt(
  id: string
): Promise<{ communityPromptId: string; favorited: boolean; favoriteCount: number }> {
  return (await apiRequest<{ communityPromptId: string; favorited: boolean; favoriteCount: number }>(
    `/api/community/prompts/${encodeURIComponent(id)}/favorite`,
    { method: "DELETE" }
  )) as { communityPromptId: string; favorited: boolean; favoriteCount: number };
}

export async function listCommunityTags(): Promise<{ items: CommunityTagItem[] }> {
  return (await apiRequest<{ items: CommunityTagItem[] }>("/api/community/tags")) as {
    items: CommunityTagItem[];
  };
}

export async function reportCommunityPrompt(
  id: string,
  body: { reason: ReportReason; description?: string }
): Promise<ReportCommunityPromptResult> {
  return (await apiRequest<ReportCommunityPromptResult>(
    `/api/community/prompts/${encodeURIComponent(id)}/reports`,
    {
      method: "POST",
      body: JSON.stringify(body)
    }
  )) as ReportCommunityPromptResult;
}

export async function forkCommunityPrompt(
  id: string
): Promise<{ promptId: string; sourceCommunityPromptId: string; title: string; createdAt: string }> {
  return (await apiRequest<{
    promptId: string;
    sourceCommunityPromptId: string;
    title: string;
    createdAt: string;
  }>(`/api/community/prompts/${encodeURIComponent(id)}/fork`, {
    method: "POST"
  })) as { promptId: string; sourceCommunityPromptId: string; title: string; createdAt: string };
}
