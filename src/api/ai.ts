import { apiRequest } from "./http";

export type AIProvider = "openai" | "deepseek" | "anthropic" | "custom";
export type AIPolishTone = "formal" | "casual" | "concise" | "academic" | "creative";
export type AILanguage = "zh-CN" | "en-US";
export type AILengthPreference = "short" | "medium" | "long";

export type AIGuestQuota = {
  dailyLimit: number;
  usedCount: number;
  remainingCount: number;
  resetAt: string;
  allowed: boolean;
};

export type AIApiKeyStatus = {
  configured: boolean;
  saved?: boolean;
  maskedKey?: string | null;
  provider: AIProvider | null;
  baseUrl?: string | null;
  verified: boolean;
  updatedAt?: string | null;
};

export type AIModelProviderItem = {
  provider: string;
  models: string[];
};

export type AIPolishResult = {
  original: string;
  optimized: string;
  suggestions: string[];
  latencyMs: number;
};

export type AITestResult = {
  recordId: string;
  promptId?: string | null;
  provider?: string;
  model?: string;
  renderedPrompt: string;
  output: string;
  latencyMs: number;
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  createdAt?: string;
};

export type AITestRecordListItem = {
  id: string;
  promptId?: string | null;
  provider?: string;
  model?: string;
  inputSummary: string;
  outputSummary: string;
  latencyMs: number;
  createdAt: string;
};

export type AITestRecordDetail = {
  id: string;
  promptId?: string | null;
  provider?: string;
  model?: string;
  inputVariables?: Record<string, string>;
  renderedPrompt: string;
  output: string;
  latencyMs: number;
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  createdAt: string;
};

export type AITestRecordListData = {
  items: AITestRecordListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export async function getGuestQuota(): Promise<AIGuestQuota> {
  return (await apiRequest<AIGuestQuota>("/api/ai/guest/quota")) as AIGuestQuota;
}

export async function getApiKeyStatus(): Promise<AIApiKeyStatus> {
  return (await apiRequest<AIApiKeyStatus>("/api/ai/api-key/status")) as AIApiKeyStatus;
}

export async function saveApiKey(body: {
  apiKey: string;
  provider: AIProvider;
  baseUrl?: string;
}): Promise<AIApiKeyStatus> {
  return (await apiRequest<AIApiKeyStatus>("/api/ai/api-key", {
    method: "PUT",
    body: JSON.stringify(body)
  })) as AIApiKeyStatus;
}

export async function deleteApiKey(): Promise<{ deleted: boolean; deletedAt: string }> {
  return (await apiRequest<{ deleted: boolean; deletedAt: string }>("/api/ai/api-key", {
    method: "DELETE"
  })) as { deleted: boolean; deletedAt: string };
}

export async function getModels(): Promise<{ items: AIModelProviderItem[] }> {
  return (await apiRequest<{ items: AIModelProviderItem[] }>("/api/ai/models")) as {
    items: AIModelProviderItem[];
  };
}

export async function polishPrompt(body: {
  promptId?: string;
  content?: string;
  tone?: AIPolishTone;
  language?: AILanguage;
  lengthPreference?: AILengthPreference;
}): Promise<AIPolishResult> {
  return (await apiRequest<AIPolishResult>("/api/ai/polish", {
    method: "POST",
    body: JSON.stringify(body)
  })) as AIPolishResult;
}

export async function testPrompt(body: {
  promptId?: string;
  content: string;
  variables?: Record<string, string>;
  provider?: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<AITestResult> {
  return (await apiRequest<AITestResult>("/api/ai/test", {
    method: "POST",
    body: JSON.stringify(body)
  })) as AITestResult;
}

export async function listTestRecords(params: {
  promptId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AITestRecordListData> {
  const q = new URLSearchParams();
  if (params.promptId) q.set("promptId", params.promptId);
  if (params.page != null) q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  return (await apiRequest<AITestRecordListData>(
    `/api/ai/test-records${qs ? `?${qs}` : ""}`
  )) as AITestRecordListData;
}

export async function getTestRecord(id: string): Promise<AITestRecordDetail> {
  return (await apiRequest<AITestRecordDetail>(
    `/api/ai/test-records/${encodeURIComponent(id)}`
  )) as AITestRecordDetail;
}
