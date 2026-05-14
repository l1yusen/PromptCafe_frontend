<template>
  <div class="home-main-shell" ref="shellRef">
          <div class="detail-scroll">
            <main class="detail-pane">
              <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

              <template v-if="mode === 'view' && detail && !detailLoading">
                <h2 class="detail-title-line">{{ detail.title }}</h2>
                <p class="meta">
                  {{ formatTime(detail.updatedAt) }} · v{{ detail.currentVersion }} ·
                  {{ detail.visibility === "public" ? "公开" : "私有" }}
                </p>
                <p class="detail-desc" :class="{ muted: !detail.description?.trim() }">
                  {{ detail.description?.trim() || "暂无描述" }}
                </p>
                <div v-if="detail.tags?.length" class="tag-row">
                  <span v-for="(t, ti) in detail.tags" :key="`${detail.id}-dtag-${ti}`" class="tag-chip">{{ t }}</span>
                </div>

                <div class="field">
                  <div class="label label-with-action">
                    <span>系统提示词</span>
                    <button
                      type="button"
                      class="icon-copy-btn"
                      title="复制系统提示词"
                      aria-label="复制系统提示词"
                      @click.stop="copyPlain(detail.systemPrompt ?? '')"
                    >
                      <svg class="copy-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          d="M7 3.5A1.5 1.5 0 018.5 2h6A1.5 1.5 0 0116 3.5v10a1.5 1.5 0 01-1.5 1.5H11v1.5A1.5 1.5 0 019.5 18h-6A1.5 1.5 0 012 16.5v-10A1.5 1.5 0 013.5 5H7V3.5zm0 2H3.5v10h6v-10zm2-1v10h6v-10h-6z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div class="value pre">{{ detail.systemPrompt || "（空）" }}</div>
                </div>
                <div class="field">
                  <div class="label label-with-action">
                    <span>用户提示词</span>
                    <button
                      type="button"
                      class="icon-copy-btn"
                      title="复制用户提示词"
                      aria-label="复制用户提示词"
                      @click.stop="copyPlain(detail.userPrompt)"
                    >
                      <svg class="copy-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          d="M7 3.5A1.5 1.5 0 018.5 2h6A1.5 1.5 0 0116 3.5v10a1.5 1.5 0 01-1.5 1.5H11v1.5A1.5 1.5 0 019.5 18h-6A1.5 1.5 0 012 16.5v-10A1.5 1.5 0 013.5 5H7V3.5zm0 2H3.5v10h6v-10zm2-1v10h6v-10h-6z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div class="value pre">{{ detail.userPrompt }}</div>
                </div>

                <footer class="bottom-actions">
                  <button type="button" class="primary ghost" @click="copyFullText">复制全文</button>
                  <button type="button" class="light" @click="previewFromDetail">预览渲染</button>
                  <button type="button" class="light" @click="openAiConfig">AI 配置</button>
                  <button type="button" class="light" @click="openAiPolish">AI 润色</button>
                  <button type="button" class="light" @click="openAiTest">AI 测试</button>
                  <button type="button" class="light" @click="openSharePanel">分享到社区</button>
                  <button type="button" class="light" @click="goToVersionsPage">历史版本</button>
                  <button type="button" class="light" @click="startEdit">编辑</button>
                  <button type="button" class="light" @click="duplicateCurrent">复制为新稿</button>
                  <button type="button" class="danger" @click="removeCurrent">删除</button>
                </footer>
              </template>

              <template v-else-if="(mode === 'edit' || mode === 'create') && !detailLoading">
                <h2>{{ mode === "create" ? "新建 Prompt" : "编辑 Prompt" }}</h2>
                <p class="meta muted">保存后将更新列表；标签在保存时一并提交。</p>

                <div class="form-grid">
                  <label class="fg-label">标题 *</label>
                  <input v-model="form.title" class="fg-input" type="text" maxlength="200" />

                  <label class="fg-label">简介</label>
                  <input v-model="form.description" class="fg-input" type="text" />

                  <label class="fg-label">可见性</label>
                  <select v-model="form.visibility" class="fg-input">
                    <option value="private">私有</option>
                    <option value="public">公开</option>
                  </select>

                  <label class="fg-label">标签</label>
                  <div class="tag-editor-cell">
                    <div class="tag-input-row">
                      <input
                        v-model="formTagDraft"
                        class="tag-input-main"
                        type="text"
                        maxlength="64"
                        placeholder="输入标签后点 + 添加"
                        @keydown.enter.prevent="addFormTag"
                      />
                      <button type="button" class="tag-add-btn" title="添加标签" @click="addFormTag">+</button>
                    </div>
                    <div v-if="form.tags.length" class="tag-chips-inline form-tag-chips">
                      <span v-for="(t, i) in form.tags" :key="`form-tag-${i}-${t}`" class="filter-tag-chip">
                        {{ t }}
                        <button type="button" class="chip-remove" aria-label="移除标签" @click="removeFormTag(i)">
                          ×
                        </button>
                      </span>
                    </div>
                  </div>

                  <label class="fg-label">系统提示词</label>
                  <textarea v-model="form.systemPrompt" class="fg-textarea" rows="4" placeholder="可空" />

                  <label class="fg-label">用户提示词 *</label>
                  <textarea v-model="form.userPrompt" class="fg-textarea" rows="8" placeholder="支持 {{变量名}}" />

                  <div class="fg-full">
                    <div class="label row-between">
                      <span>变量定义</span>
                      <button type="button" class="text-btn sm" @click="addVariableRow">+ 添加变量</button>
                    </div>
                    <div v-for="(row, idx) in form.variables" :key="idx" class="var-card">
                      <div class="var-grid">
                        <input v-model="row.name" class="fg-input" placeholder="name" />
                        <select v-model="row.type" class="fg-input">
                          <option value="text">text</option>
                          <option value="textarea">textarea</option>
                          <option value="number">number</option>
                        </select>
                        <label class="chk"><input v-model="row.required" type="checkbox" /> 必填</label>
                        <button type="button" class="text-btn sm danger-text" @click="removeVariableRow(idx)">
                          删除
                        </button>
                      </div>
                      <input v-model="row.description" class="fg-input mt" type="text" placeholder="说明 description" />
                      <input v-model="row.value" class="fg-input mt" type="text" placeholder="默认值 value（可选）" />
                    </div>
                  </div>

                  <label v-if="mode === 'edit'" class="fg-label fg-full">变更说明（可选）</label>
                  <textarea
                    v-if="mode === 'edit'"
                    v-model="form.changeNote"
                    class="fg-textarea fg-full"
                    rows="2"
                    maxlength="500"
                    placeholder="保存为新版时写入版本备注"
                  />
                </div>

                <footer class="bottom-actions">
                  <button type="button" class="primary" :disabled="saving" @click="savePrompt">保存</button>
                  <button type="button" class="light" :disabled="saving" @click="previewFromForm">预览渲染</button>
                  <button type="button" class="light" :disabled="saving" @click="openAiConfig">AI 配置</button>
                  <button type="button" class="light" :disabled="saving" @click="openAiPolish">AI 润色</button>
                  <button type="button" class="light" :disabled="saving" @click="openAiTest">AI 测试</button>
                  <button type="button" class="light" @click="cancelEdit">取消</button>
                </footer>
              </template>

              <div v-else-if="detailLoading" class="muted center-pad">加载详情…</div>
              <div v-else class="muted center-pad">
                请从列表选择一条 Prompt，或点击「新建」。
                <button type="button" class="text-btn sm" @click="openAiConfig">AI 配置</button>
              </div>

              <section v-if="aiPanel" class="tool-panel">
                <div class="tool-panel-head">
                  <h3>{{ aiPanelTitle }}</h3>
                  <button type="button" class="preview-close-btn" aria-label="关闭" @click="closeAiPanel">×</button>
                </div>

                <template v-if="aiPanel === 'config'">
                  <div class="form-grid compact-form">
                    <label class="fg-label">服务商</label>
                    <select v-model="aiConfig.provider" class="fg-input">
                      <option value="openai">OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">自定义</option>
                    </select>
                    <label class="fg-label">Base URL</label>
                    <input v-model="aiConfig.baseUrl" class="fg-input" type="url" placeholder="可选" />
                    <label class="fg-label">API Key</label>
                    <input v-model="aiConfig.apiKey" class="fg-input" type="password" autocomplete="new-password" />
                  </div>
                  <div class="ai-status-row">
                    <span>密钥：{{ aiKeyStatus?.configured ? "已配置" : "未配置" }}</span>
                    <span v-if="aiKeyStatus?.maskedKey">{{ aiKeyStatus.maskedKey }}</span>
                    <span v-if="guestQuota">游客额度：{{ guestQuota.remainingCount }} / {{ guestQuota.dailyLimit }}</span>
                  </div>
                  <div class="bottom-actions inline-actions">
                    <button type="button" class="primary" :disabled="aiLoading" @click="saveAiConfig">保存配置</button>
                    <button type="button" class="light" :disabled="aiLoading" @click="loadAiStatus">刷新状态</button>
                    <button type="button" class="danger" :disabled="aiLoading || !aiKeyStatus?.configured" @click="deleteAiConfig">
                      删除密钥
                    </button>
                  </div>
                </template>

                <template v-else-if="aiPanel === 'polish'">
                  <div class="form-grid compact-form">
                    <label class="fg-label">语气</label>
                    <select v-model="polishForm.tone" class="fg-input">
                      <option value="formal">正式</option>
                      <option value="casual">自然</option>
                      <option value="concise">简洁</option>
                      <option value="academic">学术</option>
                      <option value="creative">创意</option>
                    </select>
                    <label class="fg-label">语言</label>
                    <select v-model="polishForm.language" class="fg-input">
                      <option value="zh-CN">中文</option>
                      <option value="en-US">英文</option>
                    </select>
                    <label class="fg-label">长度</label>
                    <select v-model="polishForm.lengthPreference" class="fg-input">
                      <option value="short">更短</option>
                      <option value="medium">适中</option>
                      <option value="long">更详细</option>
                    </select>
                  </div>
                  <div class="bottom-actions inline-actions">
                    <button type="button" class="primary" :disabled="aiLoading" @click="runPolish">开始润色</button>
                    <button type="button" class="light" :disabled="!polishResult" @click="adoptPolishResult">应用到编辑区</button>
                  </div>
                  <div v-if="polishResult" class="ai-result-grid">
                    <div>
                      <div class="label">优化结果</div>
                      <div class="value pre">{{ polishResult.optimized }}</div>
                    </div>
                    <div>
                      <div class="label">建议</div>
                      <ul class="suggestion-list">
                        <li v-for="(item, idx) in polishResult.suggestions" :key="idx">{{ item }}</li>
                      </ul>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="form-grid compact-form">
                    <label class="fg-label">服务商</label>
                    <select v-model="testForm.provider" class="fg-input" @change="syncDefaultModel">
                      <option value="openai">OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">自定义</option>
                    </select>
                    <label class="fg-label">模型</label>
                    <select v-if="currentModelOptions.length" v-model="testForm.model" class="fg-input">
                      <option v-for="model in currentModelOptions" :key="model" :value="model">{{ model }}</option>
                    </select>
                    <input v-else v-model="testForm.model" class="fg-input" type="text" placeholder="输入模型名" />
                    <label class="fg-label">Temperature</label>
                    <input v-model.number="testForm.temperature" class="fg-input" type="number" min="0" max="2" step="0.1" />
                    <label class="fg-label">Max Tokens</label>
                    <input v-model.number="testForm.maxTokens" class="fg-input" type="number" min="1" step="1" />
                  </div>
                  <div v-if="activeVariables.length" class="test-vars">
                    <div class="label">测试变量</div>
                    <div v-for="v in activeVariables" :key="v.name" class="test-var-row">
                      <span>{{ v.name }}</span>
                      <input v-model="testVariables[v.name]" class="fg-input" type="text" :placeholder="v.description || v.name" />
                    </div>
                  </div>
                  <div class="bottom-actions inline-actions">
                    <button type="button" class="primary" :disabled="aiLoading" @click="runAiTest">运行测试</button>
                    <button type="button" class="light" :disabled="!testResult?.output" @click="copyAiTestOutput">复制输出</button>
                    <button type="button" class="light" :disabled="aiLoading" @click="loadTestRecords">刷新记录</button>
                  </div>
                  <div v-if="testResult" class="ai-result-grid">
                    <div>
                      <div class="label">模型输出</div>
                      <div class="value pre">{{ testResult.output }}</div>
                    </div>
                    <div>
                      <div class="label">渲染 Prompt</div>
                      <div class="value pre">{{ testResult.renderedPrompt }}</div>
                    </div>
                  </div>
                  <div v-if="testRecords.length" class="ai-records">
                    <div class="label">测试记录</div>
                    <div class="record-list">
                      <button
                        v-for="record in testRecords"
                        :key="record.id"
                        type="button"
                        class="record-item"
                        @click="openTestRecord(record.id)"
                      >
                        <strong>{{ record.model || record.provider || "AI 测试" }}</strong>
                        <span>{{ record.outputSummary || record.inputSummary }}</span>
                        <small>{{ formatTime(record.createdAt) }}</small>
                      </button>
                    </div>
                    <div v-if="testRecordDetail" class="record-detail">
                      <div class="label">记录详情</div>
                      <div class="value pre">{{ testRecordDetail.output }}</div>
                    </div>
                  </div>
                </template>
              </section>

              <section v-if="sharePanelOpen && detail" class="tool-panel">
                <div class="tool-panel-head">
                  <h3>分享到社区</h3>
                  <button type="button" class="preview-close-btn" aria-label="关闭" @click="sharePanelOpen = false">×</button>
                </div>
                <div class="form-grid compact-form">
                  <label class="fg-label">标题</label>
                  <input v-model="shareForm.title" class="fg-input" type="text" maxlength="200" />
                  <label class="fg-label">简介</label>
                  <textarea v-model="shareForm.description" class="fg-textarea" rows="3" maxlength="1000" />
                  <label class="fg-label">标签</label>
                  <input v-model="shareTagText" class="fg-input" type="text" placeholder="用逗号分隔" />
                  <label class="fg-label">使用说明</label>
                  <textarea v-model="shareForm.usageGuide" class="fg-textarea" rows="3" maxlength="2000" />
                </div>
                <div class="bottom-actions inline-actions">
                  <button type="button" class="primary" :disabled="shareLoading" @click="submitShare">提交审核</button>
                  <button type="button" class="light" :disabled="shareLoading" @click="sharePanelOpen = false">取消</button>
                </div>
              </section>
            </main>
          </div>

          <template v-if="hasPreview">
            <div
              class="splitter-row"
              :class="{ 'is-dragging': resizeAxis === 'preview' }"
              role="separator"
              aria-orientation="horizontal"
              title="拖动调整预览区高度"
              @mousedown.prevent="startResizePreview"
            />
            <div class="preview-stack" :style="{ height: previewHeightPx + 'px' }">
              <div class="preview-stack-head">
                <span class="preview-stack-title">渲染预览</span>
                <button type="button" class="preview-close-btn" aria-label="关闭预览" title="关闭" @click="clearPreview">
                  ×
                </button>
              </div>
              <div class="preview-cols">
                <section class="preview-section">
                  <div class="preview-sec-head">
                    <span class="preview-sec-title">系统提示词（渲染后）</span>
                    <button
                      type="button"
                      class="icon-copy-btn preview-copy"
                      title="复制渲染后的系统提示词"
                      aria-label="复制渲染后的系统提示词"
                      @click.stop="copyPlain(previewSystemOut)"
                    >
                      <svg class="copy-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          d="M7 3.5A1.5 1.5 0 018.5 2h6A1.5 1.5 0 0116 3.5v10a1.5 1.5 0 01-1.5 1.5H11v1.5A1.5 1.5 0 019.5 18h-6A1.5 1.5 0 012 16.5v-10A1.5 1.5 0 013.5 5H7V3.5zm0 2H3.5v10h6v-10zm2-1v10h6v-10h-6z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div v-if="!previewSystemOut.trim()" class="preview-empty muted">（空）</div>
                  <div v-else class="preview-md" v-html="previewSystemHtml" />
                </section>
                <section class="preview-section">
                  <div class="preview-sec-head">
                    <span class="preview-sec-title">用户提示词（渲染后）</span>
                    <button
                      type="button"
                      class="icon-copy-btn preview-copy"
                      title="复制渲染后的用户提示词"
                      aria-label="复制渲染后的用户提示词"
                      @click.stop="copyPlain(previewUserOut)"
                    >
                      <svg class="copy-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          d="M7 3.5A1.5 1.5 0 018.5 2h6A1.5 1.5 0 0116 3.5v10a1.5 1.5 0 01-1.5 1.5H11v1.5A1.5 1.5 0 019.5 18h-6A1.5 1.5 0 012 16.5v-10A1.5 1.5 0 013.5 5H7V3.5zm0 2H3.5v10h6v-10zm2-1v10h6v-10h-6z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div v-if="!previewUserOut.trim()" class="preview-empty muted">（空）</div>
                  <div v-else class="preview-md" v-html="previewUserHtml" />
                </section>
              </div>
            </div>
          </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "../api/prompts";
import * as ai from "../api/ai";
import * as community from "../api/community";
import { ApiError } from "../api/http";
import type { PromptDetail, PromptVariableDef } from "../api/types";
import type {
  AIApiKeyStatus,
  AIGuestQuota,
  AIModelProviderItem,
  AIPolishResult,
  AITestRecordDetail,
  AITestRecordListItem,
  AITestResult
} from "../api/ai";
import { markdownToSafeHtml } from "../util/markdown";

const route = useRoute();
const router = useRouter();

const refreshPromptList = inject<() => Promise<void>>("refreshPromptList", async () => {});
const promptHubToast = inject<(message: string, durationMs?: number) => void>("promptHubToast", () => {});

const selectedId = ref<string | null>(null);
const detail = ref<PromptDetail | null>(null);
const detailLoading = ref(false);

type Mode = "view" | "edit" | "create";
const mode = ref<Mode>("view");

const form = reactive({
  title: "",
  description: "",
  systemPrompt: "",
  userPrompt: "",
  visibility: "private" as "private" | "public",
  tags: [] as string[],
  variables: [] as PromptVariableDef[],
  changeNote: ""
});

const formTagDraft = ref("");

const errorMsg = ref("");
const saving = ref(false);

function showToast(message: string, durationMs = 2800) {
  promptHubToast(message, durationMs);
}

const shellRef = ref<HTMLElement | null>(null);
const previewHeightPx = ref(220);
const resizeAxis = ref<"preview" | null>(null);

const hasPreview = ref(false);
const previewSystemOut = ref("");
const previewUserOut = ref("");

const previewSystemHtml = computed(() => markdownToSafeHtml(previewSystemOut.value));
const previewUserHtml = computed(() => markdownToSafeHtml(previewUserOut.value));

type AiPanel = "config" | "polish" | "test";

const aiPanel = ref<AiPanel | null>(null);
const aiLoading = ref(false);
const aiKeyStatus = ref<AIApiKeyStatus | null>(null);
const guestQuota = ref<AIGuestQuota | null>(null);
const aiModels = ref<AIModelProviderItem[]>([]);
const polishResult = ref<AIPolishResult | null>(null);
const testResult = ref<AITestResult | null>(null);
const testRecords = ref<AITestRecordListItem[]>([]);
const testRecordDetail = ref<AITestRecordDetail | null>(null);
const testVariables = reactive<Record<string, string>>({});
const sharePanelOpen = ref(false);
const shareLoading = ref(false);
const shareTagText = ref("");

const aiConfig = reactive({
  provider: "openai" as ai.AIProvider,
  baseUrl: "",
  apiKey: ""
});

const polishForm = reactive({
  tone: "formal" as ai.AIPolishTone,
  language: "zh-CN" as ai.AILanguage,
  lengthPreference: "medium" as ai.AILengthPreference
});

const testForm = reactive({
  provider: "openai" as ai.AIProvider,
  model: "",
  temperature: 0.7,
  maxTokens: 1000
});

const shareForm = reactive({
  title: "",
  description: "",
  usageGuide: ""
});

const aiPanelTitle = computed(() => {
  if (aiPanel.value === "config") return "AI 配置";
  if (aiPanel.value === "polish") return "AI 润色";
  return "AI 测试";
});

const activeVariables = computed(() => (mode.value === "view" ? detail.value?.variables ?? [] : form.variables));

const currentModelOptions = computed(() => {
  return aiModels.value.find((item) => item.provider === testForm.provider)?.models ?? [];
});

function goToVersionsPage() {
  if (!detail.value) return;
  router.push({ name: "prompt-versions", params: { id: detail.value.id } });
}

let dragStartClient = 0;
let dragStartPreviewH = 0;

function clearPreview() {
  hasPreview.value = false;
  previewSystemOut.value = "";
  previewUserOut.value = "";
}

function applyRenderResult(renderedSystem: string | null | undefined, renderedUser: string) {
  previewSystemOut.value = renderedSystem ?? "";
  previewUserOut.value = renderedUser;
  hasPreview.value = true;
}

function startResizePreview(e: MouseEvent) {
  resizeAxis.value = "preview";
  dragStartClient = e.clientY;
  dragStartPreviewH = previewHeightPx.value;
  document.body.style.cursor = "row-resize";
  document.body.style.userSelect = "none";
}

function onResizeMove(e: MouseEvent) {
  if (resizeAxis.value === "preview") {
    const delta = dragStartClient - e.clientY;
    const rect = shellRef.value?.getBoundingClientRect();
    if (!rect) return;
    const max = Math.max(120, rect.height - 120);
    previewHeightPx.value = Math.round(Math.min(max, Math.max(80, dragStartPreviewH + delta)));
  }
}

function onResizeEnd() {
  if (resizeAxis.value) {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
  resizeAxis.value = null;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

function addFormTag() {
  const t = formTagDraft.value.trim();
  if (!t) return;
  if (form.tags.includes(t)) {
    formTagDraft.value = "";
    return;
  }
  form.tags.push(t);
  formTagDraft.value = "";
}

function removeFormTag(index: number) {
  form.tags.splice(index, 1);
}

function varsToMap(vars: PromptVariableDef[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const v of vars) {
    if (!v.name?.trim()) continue;
    m[v.name.trim()] = (v.value ?? "").toString();
  }
  return m;
}

async function loadDetail(id: string) {
  detailLoading.value = true;
  detail.value = null;
  errorMsg.value = "";
  clearPreview();
  try {
    detail.value = await api.getPrompt(id);
  } catch (e) {
    detail.value = null;
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    detailLoading.value = false;
  }
}

function resetForm() {
  form.title = "";
  form.description = "";
  form.systemPrompt = "";
  form.userPrompt = "";
  form.visibility = "private";
  form.tags = [];
  form.variables = [];
  form.changeNote = "";
  formTagDraft.value = "";
}

function fillFormFromDetail(d: PromptDetail) {
  form.title = d.title;
  form.description = (d.description ?? "") as string;
  form.systemPrompt = (d.systemPrompt ?? "") as string;
  form.userPrompt = d.userPrompt;
  form.visibility = d.visibility;
  form.tags = [...(d.tags ?? [])];
  form.variables = JSON.parse(JSON.stringify(d.variables ?? [])) as PromptVariableDef[];
}

function startCreate() {
  mode.value = "create";
  selectedId.value = null;
  detail.value = null;
  resetForm();
  clearPreview();
  errorMsg.value = "";
}

function startEdit() {
  if (!detail.value) return;
  mode.value = "edit";
  fillFormFromDetail(detail.value);
  clearPreview();
  errorMsg.value = "";
}

function cancelEdit() {
  clearPreview();
  if (mode.value === "create") {
    mode.value = "view";
    detail.value = null;
    selectedId.value = null;
    void router.replace({ name: "home-main", query: {} });
    return;
  }
  mode.value = "view";
  if (selectedId.value) {
    void loadDetail(selectedId.value);
  }
}

function addVariableRow() {
  form.variables.push({
    name: `var${form.variables.length + 1}`,
    type: "text",
    description: "",
    required: false,
    value: ""
  });
}

function removeVariableRow(idx: number) {
  form.variables.splice(idx, 1);
}

async function savePrompt() {
  errorMsg.value = "";
  const title = form.title.trim();
  const userPrompt = form.userPrompt.trim();
  if (!title || !userPrompt) {
    errorMsg.value = "标题与用户提示词不能为空";
    return;
  }
  saving.value = true;
  try {
    const tags = form.tags.map((x) => x.trim()).filter(Boolean);
    const payload = {
      title,
      description: form.description.trim() || null,
      systemPrompt: form.systemPrompt.trim() || null,
      userPrompt,
      variables: form.variables.filter((v) => v.name?.trim()),
      visibility: form.visibility,
      tags
    };

    if (mode.value === "create") {
      const created = await api.createPrompt(payload);
      showToast("已创建");
      mode.value = "view";
      selectedId.value = created.id;
      detail.value = created;
      await refreshPromptList();
      await loadDetail(created.id);
      await router.replace({ name: "home-main", query: { prompt: created.id } });
    } else if (mode.value === "edit" && selectedId.value) {
      const { tags: _t, ...putBody } = payload;
      const extra: Record<string, unknown> = {};
      if (form.changeNote.trim()) extra.changeNote = form.changeNote.trim();
      await api.replacePromptTags(selectedId.value, tags);
      await api.updatePrompt(selectedId.value, { ...putBody, ...extra });
      showToast("已保存");
      mode.value = "view";
      await refreshPromptList();
      await loadDetail(selectedId.value);
    }
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

async function removeCurrent() {
  if (!detail.value) return;
  if (!confirm(`确定删除「${detail.value.title}」？不可恢复。`)) return;
  errorMsg.value = "";
  try {
    await api.deletePrompt(detail.value.id);
    showToast("已删除");
    selectedId.value = null;
    detail.value = null;
    mode.value = "view";
    await refreshPromptList();
    await router.replace({ name: "home-main", query: {} });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  }
}

async function duplicateCurrent() {
  if (!detail.value) return;
  errorMsg.value = "";
  try {
    const copy = await api.copyPrompt(detail.value.id);
    showToast("已复制为新稿");
    await refreshPromptList();
    await router.replace({ name: "home-main", query: { prompt: copy.id } });
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  }
}

function copyFullText() {
  if (!detail.value) return;
  const parts = [
    detail.value.systemPrompt ? `【系统】\n${detail.value.systemPrompt}` : "",
    `【用户】\n${detail.value.userPrompt}`
  ].filter(Boolean);
  const text = parts.join("\n\n");
  navigator.clipboard.writeText(text).then(
    () => {
      showToast("已复制到剪贴板");
    },
    () => {
      errorMsg.value = "复制失败，请检查浏览器权限";
    }
  );
}

function copyPlain(text: string) {
  const raw = text ?? "";
  if (!raw.trim()) {
    showToast("没有可复制的内容");
    return;
  }
  navigator.clipboard.writeText(raw).then(
    () => showToast("已复制到剪贴板"),
    () => {
      errorMsg.value = "复制失败，请检查浏览器权限";
    }
  );
}

async function previewFromDetail() {
  if (!detail.value) return;
  errorMsg.value = "";
  try {
    const r = await api.renderPrompt({
      systemPrompt: detail.value.systemPrompt ?? null,
      userPrompt: detail.value.userPrompt,
      variables: varsToMap(detail.value.variables ?? [])
    });
    applyRenderResult(r.renderedSystemPrompt, r.renderedUserPrompt);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  }
}

async function previewFromForm() {
  errorMsg.value = "";
  try {
    const r = await api.renderPrompt({
      systemPrompt: form.systemPrompt.trim() || null,
      userPrompt: form.userPrompt,
      variables: varsToMap(form.variables)
    });
    applyRenderResult(r.renderedSystemPrompt, r.renderedUserPrompt);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  }
}

function apiMessage(e: unknown) {
  return e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e);
}

function activePromptId() {
  return mode.value === "view" ? detail.value?.id : selectedId.value ?? undefined;
}

function activePromptContent() {
  return mode.value === "view" ? detail.value?.userPrompt ?? "" : form.userPrompt;
}

function activeFullPromptContent() {
  const systemPrompt = mode.value === "view" ? detail.value?.systemPrompt ?? "" : form.systemPrompt;
  const userPrompt = activePromptContent();
  return [
    systemPrompt.trim() ? `【系统提示词】\n${systemPrompt.trim()}` : "",
    userPrompt.trim() ? `【用户提示词】\n${userPrompt.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function resetTestVariables() {
  for (const key of Object.keys(testVariables)) delete testVariables[key];
  for (const variable of activeVariables.value) {
    if (!variable.name?.trim()) continue;
    testVariables[variable.name.trim()] = (variable.value ?? "").toString();
  }
}

async function loadAiStatus() {
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    const [status, quota] = await Promise.allSettled([ai.getApiKeyStatus(), ai.getGuestQuota()]);
    if (status.status === "fulfilled") {
      aiKeyStatus.value = status.value;
      aiConfig.provider = status.value.provider ?? aiConfig.provider;
      aiConfig.baseUrl = status.value.baseUrl ?? "";
    }
    if (quota.status === "fulfilled") guestQuota.value = quota.value;
    if (status.status === "rejected" && quota.status === "rejected") throw status.reason;
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

async function loadAiModels() {
  try {
    const data = await ai.getModels();
    aiModels.value = data.items ?? [];
    syncDefaultModel();
  } catch (e) {
    errorMsg.value = apiMessage(e);
  }
}

function closeAiPanel() {
  aiPanel.value = null;
}

function openAiConfig() {
  aiPanel.value = "config";
  sharePanelOpen.value = false;
  void loadAiStatus();
}

function openAiPolish() {
  if (!activePromptContent().trim()) {
    showToast("请先填写用户提示词");
    return;
  }
  aiPanel.value = "polish";
  sharePanelOpen.value = false;
  polishResult.value = null;
  void loadAiStatus();
}

function openAiTest() {
  if (!activePromptContent().trim()) {
    showToast("请先填写用户提示词");
    return;
  }
  aiPanel.value = "test";
  sharePanelOpen.value = false;
  resetTestVariables();
  void loadAiStatus();
  void loadAiModels();
  void loadTestRecords();
}

async function saveAiConfig() {
  if (!aiConfig.apiKey.trim()) {
    errorMsg.value = "API Key 不能为空";
    return;
  }
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    aiKeyStatus.value = await ai.saveApiKey({
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey.trim(),
      baseUrl: aiConfig.baseUrl.trim() || undefined
    });
    aiConfig.apiKey = "";
    showToast("AI 配置已保存");
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

async function deleteAiConfig() {
  if (!confirm("确定删除当前 AI API Key？")) return;
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    await ai.deleteApiKey();
    aiKeyStatus.value = null;
    aiConfig.apiKey = "";
    showToast("AI 密钥已删除");
    await loadAiStatus();
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

async function runPolish() {
  const content = activePromptContent().trim();
  if (!content) {
    errorMsg.value = "没有可润色的用户提示词";
    return;
  }
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    polishResult.value = await ai.polishPrompt({
      promptId: activePromptId(),
      content,
      tone: polishForm.tone,
      language: polishForm.language,
      lengthPreference: polishForm.lengthPreference
    });
    showToast("润色完成");
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

function adoptPolishResult() {
  if (!polishResult.value) return;
  if (mode.value === "view") startEdit();
  form.userPrompt = polishResult.value.optimized;
  showToast("已应用到编辑区，保存后生效");
}

function syncDefaultModel() {
  const options = currentModelOptions.value;
  if (options.length && !options.includes(testForm.model)) {
    testForm.model = options[0];
  }
}

async function runAiTest() {
  const content = activeFullPromptContent();
  if (!content.trim()) {
    errorMsg.value = "没有可测试的 Prompt 内容";
    return;
  }
  if (!testForm.model.trim()) {
    errorMsg.value = "请选择或填写模型";
    return;
  }
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    testResult.value = await ai.testPrompt({
      promptId: activePromptId(),
      content,
      variables: { ...testVariables },
      provider: testForm.provider,
      model: testForm.model.trim(),
      temperature: testForm.temperature,
      maxTokens: testForm.maxTokens
    });
    showToast("AI 测试完成");
    await loadTestRecords();
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

async function loadTestRecords() {
  try {
    const data = await ai.listTestRecords({ promptId: activePromptId(), page: 1, pageSize: 8 });
    testRecords.value = data.items ?? [];
  } catch (e) {
    errorMsg.value = apiMessage(e);
  }
}

async function openTestRecord(id: string) {
  aiLoading.value = true;
  errorMsg.value = "";
  try {
    testRecordDetail.value = await ai.getTestRecord(id);
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    aiLoading.value = false;
  }
}

function copyAiTestOutput() {
  if (!testResult.value?.output) return;
  copyPlain(testResult.value.output);
}

function openSharePanel() {
  if (!detail.value) {
    showToast("请先选择已保存的 Prompt");
    return;
  }
  aiPanel.value = null;
  sharePanelOpen.value = true;
  shareForm.title = detail.value.title;
  shareForm.description = detail.value.description ?? "";
  shareForm.usageGuide = "请根据变量说明填写后使用。";
  shareTagText.value = (detail.value.tags ?? []).join(", ");
}

async function submitShare() {
  if (!detail.value) return;
  const title = shareForm.title.trim();
  const description = shareForm.description.trim();
  const usageGuide = shareForm.usageGuide.trim();
  if (!title || !description || !usageGuide) {
    errorMsg.value = "标题、简介和使用说明不能为空";
    return;
  }
  shareLoading.value = true;
  errorMsg.value = "";
  try {
    const tags = shareTagText.value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    await community.sharePrompt({
      promptId: detail.value.id,
      title,
      description,
      usageGuide,
      tags
    });
    sharePanelOpen.value = false;
    showToast("已提交社区审核");
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    shareLoading.value = false;
  }
}

onMounted(() => {
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
});

watch(
  () => [route.name, route.query.prompt, route.query.create] as const,
  async ([name, prompt, create]) => {
    if (name !== "home-main") return;
    if (create === "1") {
      if (mode.value !== "create") startCreate();
      return;
    }
    const pid = typeof prompt === "string" ? prompt.trim() : "";
    if (pid) {
      if (selectedId.value !== pid || !detail.value || detail.value.id !== pid) {
        mode.value = "view";
        selectedId.value = pid;
        await loadDetail(pid);
      }
    } else if (mode.value !== "create") {
      selectedId.value = null;
      detail.value = null;
      mode.value = "view";
      clearPreview();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});
</script>

<style scoped>
.home-main-shell {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.primary-inline {
  border-color: #2f67ea !important;
  color: #2f67ea !important;
  font-weight: 600;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.primary-inline:hover:not(:disabled) {
  background: #eff3ff !important;
  box-shadow: 0 1px 4px rgba(47, 103, 234, 0.2);
}
.primary-inline:active:not(:disabled) {
  box-shadow: none;
}
.muted {
  color: #9099ab;
}
.list-item-title {
  display: inline;
}
.list-item.list-item-block {
  height: 72px;
  max-height: 72px;
  padding: 8px 10px !important;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.list-item-inner {
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.list-item-title-line {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.35;
}
.list-item-desc {
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-height: 1.3em;
}
.title-hit {
  background: #fef08a;
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
  font-weight: inherit;
}
.list-item.active .title-hit {
  background: rgba(255, 255, 255, 0.38);
  color: inherit;
}
.list-item.active .list-item-desc {
  color: rgba(255, 255, 255, 0.88);
}
.detail-title-line {
  margin: 0;
  font-size: 32px;
  line-height: 1.2;
}
.detail-desc {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: #4b5563;
  word-break: break-word;
}
.detail-desc.muted {
  color: #98a2b3;
}
.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.icon-copy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.icon-copy-btn:hover {
  background: #eef2fa;
  color: #2f67ea;
}
.icon-copy-btn:active {
  background: #e2e8f5;
}
.copy-svg {
  width: 16px;
  height: 16px;
  display: block;
}
.preview-copy {
  width: 28px;
  height: 28px;
}
.sm {
  padding: 4px 8px !important;
  font-size: 12px !important;
}
.empty-list {
  font-size: 13px;
  color: #98a2b3;
  padding: 12px 4px;
}
.list-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.view-toggle {
  display: inline-flex;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.view-toggle-btn {
  border: none;
  background: transparent;
  padding: 5px 10px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.view-toggle-btn:hover:not(.active) {
  background: #f8fafc;
  color: #374151;
}
.view-toggle-btn + .view-toggle-btn {
  border-left: 1px solid #e2e6f0;
}
.view-toggle-btn.active {
  background: #eff3ff;
  color: #2f67ea;
  font-weight: 600;
}
.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}
.prompt-card {
  display: flex;
  flex-direction: column;
  height: 200px;
  max-height: 200px;
  padding: 10px 10px 8px;
  background: #fff;
  border: 1px solid #e7e9f0;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  box-sizing: border-box;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease,
    transform 0.12s ease;
}
.prompt-card:hover {
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  border-color: #d1d9e8;
  transform: translateY(-1px);
}
.prompt-card:active {
  transform: translateY(0);
}
.prompt-card.active {
  border-color: #2f67ea;
  box-shadow: 0 0 0 1px rgba(47, 103, 234, 0.25);
}
.prompt-card-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  flex-shrink: 0;
}
.prompt-card-desc {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  flex-shrink: 0;
}
.prompt-card-desc.muted {
  color: #98a2b3;
}
.prompt-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
  max-height: 44px;
  overflow: hidden;
  flex-shrink: 0;
}
.card-tag {
  font-size: 11px;
  padding: 2px 7px;
}
.prompt-card-meta {
  margin-top: auto;
  font-size: 11px;
  padding-top: 6px;
  border-top: 1px solid #f0f2f7;
}
.tag-field-label {
  font-size: 11px;
  color: #8a90a3;
  margin: 2px 0 4px;
}
.tag-input-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
}
.tag-input-main {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.tag-input-main:hover {
  border-color: #cfd6e6;
}
.tag-input-main:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.2);
}
.tag-add-btn {
  flex-shrink: 0;
  width: 36px;
  border: 1px solid #d5d8e2;
  border-radius: 8px;
  background: #fff;
  font-size: 18px;
  line-height: 1;
  font-weight: 600;
  color: #2f67ea;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}
.tag-add-btn:hover {
  background: #eff3ff;
  border-color: #93b4f7;
}
.tag-add-btn:active {
  transform: scale(0.96);
}
.tag-chips-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.filter-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 3px 6px 3px 8px;
  font-size: 12px;
  color: #3f4658;
  background: #eef2fa;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.filter-tag-chip:hover {
  background: #e2e8f5;
}
.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9099ab;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.chip-remove:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #374151;
}
.form-tag-chips {
  margin-top: 8px;
}
.tag-editor-cell {
  min-width: 0;
}
.list-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.list-filter-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.list-filter-input:hover {
  border-color: #cfd6e6;
}
.list-filter-input:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.2);
}
.list-sort-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-end;
}
.list-sort-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #8a90a3;
}
.list-sort-label span {
  white-space: nowrap;
}
.list-sort-select {
  min-width: 0;
  padding: 5px 8px;
  font-size: 12px;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.list-sort-select:hover {
  border-color: #cfd6e6;
  background: #fafbfc;
}
.list-sort-select:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.2);
}
.pager {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toast-host {
  position: relative;
}
.toast-float {
  position: absolute;
  top: 68px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(420px, calc(100% - 32px));
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #166534;
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  pointer-events: none;
  text-align: center;
}
.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
.error-msg {
  margin: 0 0 8px;
  padding: 8px 12px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 13px;
}
.pre {
  white-space: pre-wrap;
  word-break: break-word;
}
.tag-row {
  margin-bottom: 12px;
}
.tag-chip {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  margin-right: 6px;
  border-radius: 6px;
  background: #eef2fa;
  color: #3f4658;
}
.form-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 14px;
  align-items: start;
  max-width: 720px;
}
.fg-full {
  grid-column: 1 / -1;
}
.fg-label {
  font-size: 13px;
  color: #6b7280;
  padding-top: 8px;
}
.fg-input,
.fg-textarea {
  width: 100%;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.fg-input:hover,
.fg-textarea:hover {
  border-color: #cfd6e6;
}
.fg-input:focus,
.fg-textarea:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.25);
}
.fg-textarea {
  resize: vertical;
  min-height: 80px;
}
.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.var-card {
  border: 1px solid #e7e9f0;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.var-card:hover {
  border-color: #d8deed;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.var-grid {
  display: grid;
  grid-template-columns: 1fr 120px auto auto;
  gap: 8px;
  align-items: center;
}
.mt {
  margin-top: 8px;
}
.chk {
  font-size: 13px;
  color: #4b5563;
  white-space: nowrap;
}
.danger-text {
  color: #c5314d !important;
  border-color: #fecaca !important;
}
.center-pad {
  padding: 40px 0;
  text-align: center;
}
.preview-stack {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border-top: 1px solid #e7e9f0;
  padding: 0 16px 12px;
  box-sizing: border-box;
}
.preview-stack-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  padding: 10px 0 8px;
}
.preview-stack-title {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}
.preview-close-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.preview-close-btn:hover {
  background: #f1f5f9;
  color: #1f2937;
}
.preview-close-btn:active {
  background: #e2e8f0;
}
.preview-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.preview-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.preview-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 6px;
}
.preview-sec-title {
  margin: 0;
  font-size: 12px;
  color: #8a90a3;
  min-width: 0;
}
.preview-empty {
  flex: 1;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  background: #f7f8fc;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  font-size: 13px;
}
.preview-md {
  margin: 0;
  flex: 1;
  min-height: 72px;
  overflow: auto;
  padding: 10px 12px;
  background: #f7f8fc;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.55;
  color: #374151;
}
.preview-md :deep(p) {
  margin: 0 0 0.6em;
}
.preview-md :deep(p:last-child) {
  margin-bottom: 0;
}
.preview-md :deep(h1),
.preview-md :deep(h2),
.preview-md :deep(h3),
.preview-md :deep(h4) {
  margin: 0.75em 0 0.4em;
  font-weight: 600;
  line-height: 1.3;
}
.preview-md :deep(h1) {
  font-size: 1.25rem;
}
.preview-md :deep(h2) {
  font-size: 1.1rem;
}
.preview-md :deep(ul),
.preview-md :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.35em;
}
.preview-md :deep(li) {
  margin: 0.2em 0;
}
.preview-md :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.92em;
  background: #e5e7eb;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.preview-md :deep(pre) {
  margin: 0.5em 0;
  padding: 10px 12px;
  overflow: auto;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.preview-md :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
.preview-md :deep(a) {
  color: #2563eb;
  word-break: break-all;
}
.preview-md :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 12px;
  border-left: 3px solid #cbd5e1;
  color: #64748b;
}
.tool-panel {
  margin-top: 18px;
  padding: 14px;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fbfcff;
}
.tool-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.tool-panel-head h3 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}
.compact-form {
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px 12px;
}
.inline-actions {
  margin-top: 12px;
}
.ai-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 12px;
  font-size: 13px;
  color: #5b6475;
}
.ai-result-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  gap: 12px;
  margin-top: 12px;
}
.suggestion-list {
  margin: 0;
  padding: 10px 12px 10px 28px;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fff;
  color: #4b5563;
  line-height: 1.55;
}
.test-vars {
  margin-top: 12px;
}
.test-var-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}
.test-var-row span {
  color: #5b6475;
  font-size: 13px;
  word-break: break-word;
}
.ai-records {
  margin-top: 14px;
}
.record-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.record-item {
  display: grid;
  grid-template-columns: minmax(120px, 0.7fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  text-align: left;
  cursor: pointer;
}
.record-item:hover {
  border-color: #cfd6e6;
  background: #f8fafc;
}
.record-item span,
.record-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-item small {
  color: #9099ab;
}
.record-detail {
  margin-top: 12px;
}
@media (max-width: 960px) {
  .preview-cols {
    grid-template-columns: 1fr;
  }
  .ai-result-grid,
  .record-item,
  .test-var-row {
    grid-template-columns: 1fr;
  }
}
</style>
