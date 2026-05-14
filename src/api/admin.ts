import { apiRequest } from "./http";
import type {
  AdminPrompt,
  AuditLog,
  AuditTargetType,
  CommunityPromptAdmin,
  CommunityReport,
  CommunityReportStatus,
  PaginatedData,
  PromptVariableDef,
  PromptVisibility,
  Role,
  User,
  UserStatus
} from "./types";

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listPendingSharedPrompts(params: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<CommunityPromptAdmin>> {
  return (await apiRequest<PaginatedData<CommunityPromptAdmin>>(
    `/api/admin/shared-prompts/pending${qs(params)}`
  )) as PaginatedData<CommunityPromptAdmin>;
}

export async function getSharedPrompt(id: string): Promise<CommunityPromptAdmin> {
  return (await apiRequest<CommunityPromptAdmin>(
    `/api/admin/shared-prompts/${encodeURIComponent(id)}`
  )) as CommunityPromptAdmin;
}

export async function approveSharedPrompt(id: string, auditNote?: string): Promise<CommunityPromptAdmin> {
  return (await apiRequest<CommunityPromptAdmin>(
    `/api/admin/shared-prompts/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: JSON.stringify({ auditNote }) }
  )) as CommunityPromptAdmin;
}

export async function rejectSharedPrompt(id: string, auditNote: string): Promise<CommunityPromptAdmin> {
  return (await apiRequest<CommunityPromptAdmin>(
    `/api/admin/shared-prompts/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: JSON.stringify({ auditNote }) }
  )) as CommunityPromptAdmin;
}

export async function removeSharedPrompt(id: string, reason: string): Promise<CommunityPromptAdmin> {
  return (await apiRequest<CommunityPromptAdmin>(
    `/api/admin/shared-prompts/${encodeURIComponent(id)}/remove`,
    { method: "POST", body: JSON.stringify({ reason }) }
  )) as CommunityPromptAdmin;
}

export async function listAdminUsers(params: {
  keyword?: string;
  role?: Role | "";
  status?: UserStatus | "";
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<User>> {
  return (await apiRequest<PaginatedData<User>>(`/api/admin/users${qs(params)}`)) as PaginatedData<User>;
}

export async function getAdminUser(id: string): Promise<User> {
  return (await apiRequest<User>(`/api/admin/users/${encodeURIComponent(id)}`)) as User;
}

export async function updateAdminUser(
  id: string,
  body: Partial<Pick<User, "username" | "email" | "role" | "status" | "nickname" | "avatarUrl" | "bio">> & {
    reason?: string;
  }
): Promise<User> {
  return (await apiRequest<User>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  })) as User;
}

export async function deleteAdminUser(id: string, reason: string): Promise<void> {
  await apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ reason })
  });
}

export async function disableAdminUser(id: string, reason: string): Promise<User> {
  return (await apiRequest<User>(`/api/admin/users/${encodeURIComponent(id)}/disable`, {
    method: "PATCH",
    body: JSON.stringify({ reason })
  })) as User;
}

export async function restoreAdminUser(id: string, reason: string): Promise<User> {
  return (await apiRequest<User>(`/api/admin/users/${encodeURIComponent(id)}/restore`, {
    method: "PATCH",
    body: JSON.stringify({ reason })
  })) as User;
}

export async function listAdminPrompts(params: {
  keyword?: string;
  authorId?: string;
  visibility?: PromptVisibility | "";
  tag?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<AdminPrompt>> {
  return (await apiRequest<PaginatedData<AdminPrompt>>(`/api/admin/prompts${qs(params)}`)) as PaginatedData<AdminPrompt>;
}

export async function getAdminPrompt(id: string): Promise<AdminPrompt> {
  return (await apiRequest<AdminPrompt>(`/api/admin/prompts/${encodeURIComponent(id)}`)) as AdminPrompt;
}

export async function updateAdminPrompt(
  id: string,
  body: {
    title?: string;
    description?: string | null;
    systemPrompt?: string | null;
    userPrompt?: string;
    variables?: PromptVariableDef[];
    tags?: string[];
    visibility?: PromptVisibility;
    reason?: string;
  }
): Promise<AdminPrompt> {
  return (await apiRequest<AdminPrompt>(`/api/admin/prompts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  })) as AdminPrompt;
}

export async function deleteAdminPrompt(id: string, reason: string): Promise<void> {
  await apiRequest(`/api/admin/prompts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ reason })
  });
}

export async function listReports(params: {
  status?: CommunityReportStatus | "";
  communityPromptId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<CommunityReport>> {
  return (await apiRequest<PaginatedData<CommunityReport>>(`/api/admin/reports${qs(params)}`)) as PaginatedData<CommunityReport>;
}

export async function handleReport(
  id: string,
  body: { status: CommunityReportStatus; handleResult: string; removeCommunityPrompt?: boolean }
): Promise<CommunityReport> {
  return (await apiRequest<CommunityReport>(`/api/admin/reports/${encodeURIComponent(id)}/handle`, {
    method: "POST",
    body: JSON.stringify(body)
  })) as CommunityReport;
}

export async function listAuditLogs(params: {
  actorId?: string;
  action?: string;
  targetType?: AuditTargetType | "";
  targetId?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedData<AuditLog>> {
  return (await apiRequest<PaginatedData<AuditLog>>(
    `/api/admin/audit-logs${qs(params)}`
  )) as PaginatedData<AuditLog>;
}
