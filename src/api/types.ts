/** 与 docs/openapi-prompt-management.json 以及用户/管理员 OpenAPI 对齐（字段 camelCase） */

export type ApiErrorBody = { code: string | number; message: string; detail?: string };

export type ApiEnvelope<T> = { data: T; error: null } | { data: null; error: ApiErrorBody };

export type Role = "user" | "admin";
export type UserStatus = "active" | "disabled";
export type PromptVisibility = "private" | "public";
export type CommunityPromptStatus = "pending" | "approved" | "rejected" | "removed";
export type CommunityReportStatus = "pending" | "processed" | "rejected";
export type AuditTargetType = "user" | "prompt" | "community_prompt" | "report";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  nickname?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokenData = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: User;
};

export type PromptVariableDef = {
  name: string;
  type: "text" | "textarea" | "number";
  description?: string;
  required?: boolean;
  value?: string | null;
};

export type PromptSummary = {
  id: string;
  title: string;
  description?: string | null;
  tags?: string[];
  currentVersion: number;
  visibility: PromptVisibility;
  createdAt: string;
  updatedAt: string;
};

export type PromptDetail = PromptSummary & {
  systemPrompt?: string | null;
  userPrompt: string;
  variables?: PromptVariableDef[];
};

export type PromptListData = {
  items: PromptSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type PromptRenderResult = {
  renderedSystemPrompt: string | null;
  renderedUserPrompt: string;
};

export type AdminPrompt = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  systemPrompt?: string | null;
  userPrompt: string;
  variables: PromptVariableDef[];
  tags: string[];
  visibility: PromptVisibility;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id?: string;
    username?: string;
    nickname?: string | null;
    email?: string;
  } | null;
};

export type CommunityPromptAdmin = {
  id: string;
  promptId: string;
  userId: string;
  titleSnapshot: string;
  systemPromptSnapshot?: string | null;
  userPromptSnapshot: string;
  tagsSnapshot?: string[];
  description?: string | null;
  status: CommunityPromptStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  viewCount: number;
  favoriteCount: number;
  auditNote?: string | null;
  createdAt: string;
  author?: {
    id?: string;
    username?: string;
    nickname?: string | null;
    email?: string;
  } | null;
};

export type CommunityReport = {
  id: string;
  reporterId?: string | null;
  communityPromptId: string;
  reason: string;
  description?: string | null;
  status: CommunityReportStatus;
  handledBy?: string | null;
  handledAt?: string | null;
  handleResult?: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorRole?: Role | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  detail?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};
