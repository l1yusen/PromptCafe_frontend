import type { AuditTargetType, CommunityPromptStatus, CommunityReportStatus, PromptVisibility, Role, UserStatus } from "./types";

export function roleLabel(v?: Role | null): string {
  return v === "admin" ? "管理员" : "用户";
}

export function userStatusLabel(v?: UserStatus | null): string {
  return v === "disabled" ? "已禁用" : "正常";
}

export function visibilityLabel(v?: PromptVisibility | null): string {
  return v === "public" ? "公开" : "私有";
}

export function communityStatusLabel(v?: CommunityPromptStatus | null): string {
  const map: Record<CommunityPromptStatus, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    removed: "已下架"
  };
  return v ? map[v] : "-";
}

export function reportStatusLabel(v?: CommunityReportStatus | null): string {
  const map: Record<CommunityReportStatus, string> = {
    pending: "待处理",
    processed: "已处理",
    rejected: "已驳回"
  };
  return v ? map[v] : "-";
}

export function auditTargetLabel(v?: AuditTargetType | null): string {
  const map: Record<AuditTargetType, string> = {
    user: "用户",
    prompt: "Prompt",
    community_prompt: "社区 Prompt",
    report: "举报"
  };
  return v ? map[v] : "-";
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function authorName(author?: { username?: string; nickname?: string | null; email?: string } | null): string {
  if (!author) return "-";
  return author.nickname?.trim() || author.username || author.email || "-";
}
