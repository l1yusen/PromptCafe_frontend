/** 与 docs/openapi-prompt-management.json 对齐（字段 camelCase） */

export type ApiErrorBody = { code: string; message: string };

export type ApiEnvelope<T> = { data: T; error: null } | { data: null; error: ApiErrorBody };

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
  visibility: "private" | "public";
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
