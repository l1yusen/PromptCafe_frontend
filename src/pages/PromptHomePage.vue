<template>
  <WorkspaceLayout title="PromptHub 网页版" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="listLoading" @click="refreshList">刷新</button>
      <button type="button" class="text-btn primary-inline" @click="startCreate">+ 新建</button>
    </template>

      <div class="workspace" ref="workspaceRef">
        <aside class="list-pane" :style="{ width: listWidthPx + 'px' }">
          <div class="list-header list-header-row">
            <span>共 {{ total }} 个</span>
            <span v-if="listLoading" class="muted"> · 加载中…</span>
            <div class="view-toggle" role="group" aria-label="浏览方式">
              <button
                type="button"
                class="view-toggle-btn"
                :class="{ active: listViewMode === 'titles' }"
                @click="listViewMode = 'titles'"
              >
                列表
              </button>
              <button
                type="button"
                class="view-toggle-btn"
                :class="{ active: listViewMode === 'cards' }"
                @click="listViewMode = 'cards'"
              >
                看板
              </button>
            </div>
          </div>
          <div class="list-toolbar">
            <input
              v-model="listKeyword"
              class="list-filter-input"
              type="search"
              maxlength="200"
              placeholder="搜索标题…"
              enterkeyhint="search"
            />
            <div class="tag-field-label">筛选标签（需同时包含）</div>
            <div class="tag-input-row">
              <input
                v-model="listFilterTagDraft"
                class="tag-input-main"
                type="text"
                maxlength="64"
                placeholder="输入标签后点 + 添加"
                @keydown.enter.prevent="addListFilterTag"
              />
              <button type="button" class="tag-add-btn" title="添加标签" @click="addListFilterTag">+</button>
            </div>
            <div v-if="listFilterTags.length" class="tag-chips-inline">
              <span v-for="(t, i) in listFilterTags" :key="`${t}-${i}`" class="filter-tag-chip">
                {{ t }}
                <button type="button" class="chip-remove" aria-label="移除标签" @click.stop="removeListFilterTag(i)">
                  ×
                </button>
              </span>
            </div>
            <div class="list-sort-row">
              <label class="list-sort-label">
                <span>排序</span>
                <select v-model="listSortBy" class="list-sort-select">
                  <option value="updatedAt">更新时间</option>
                  <option value="createdAt">创建时间</option>
                  <option value="title">标题</option>
                </select>
              </label>
              <label class="list-sort-label">
                <span>顺序</span>
                <select v-model="listSortOrder" class="list-sort-select">
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </label>
            </div>
          </div>
          <template v-if="listViewMode === 'titles'">
            <div
              v-for="item in items"
              :key="item.id"
              class="list-item list-item-block"
              :class="{ active: item.id === listActiveId && route.query.create !== '1' }"
              @click="openItem(item.id)"
            >
              <div class="list-item-inner">
                <div class="list-item-title-line">
                  <span class="list-item-title">
                    <template v-for="(seg, si) in titleHighlightSegments(item.title)" :key="`${item.id}-t-${si}`">
                      <mark v-if="seg.hit" class="title-hit">{{ seg.text }}</mark>
                      <template v-else>{{ seg.text }}</template>
                    </template>
                  </span>
                </div>
                <div class="list-item-desc muted" :title="listDescTitle(item)">
                  {{ listDescPreview(item) }}
                </div>
              </div>
            </div>
          </template>
          <div v-else class="board-grid">
            <article
              v-for="item in items"
              :key="item.id"
              class="prompt-card"
              :class="{ active: item.id === listActiveId && route.query.create !== '1' }"
              @click="openItem(item.id)"
            >
              <h3 class="prompt-card-title">
                <template v-for="(seg, si) in titleHighlightSegments(item.title)" :key="`${item.id}-ct-${si}`">
                  <mark v-if="seg.hit" class="title-hit">{{ seg.text }}</mark>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </h3>
              <p
                class="prompt-card-desc"
                :class="{ muted: !item.description?.trim() }"
                :title="listDescTitle(item)"
              >
                {{ listDescPreview(item) }}
              </p>
              <div v-if="item.tags?.length" class="prompt-card-tags">
                <span v-for="(t, ti) in item.tags" :key="`${item.id}-tag-${ti}`" class="tag-chip card-tag">{{ t }}</span>
              </div>
              <div class="prompt-card-meta muted">
                {{ formatTime(item.updatedAt) }} · {{ item.visibility === "public" ? "公开" : "私有" }}
              </div>
            </article>
          </div>
          <div v-if="!listLoading && items.length === 0" class="empty-list">暂无 Prompt，点击「新建」</div>
          <div class="pager" v-if="totalPages > 1">
            <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">
              上一页
            </button>
            <span class="muted">{{ page }} / {{ totalPages }}</span>
            <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">
              下一页
            </button>
          </div>
        </aside>

        <div
          class="splitter-col"
          :class="{ 'is-dragging': resizeAxis === 'list' }"
          role="separator"
          aria-orientation="vertical"
          title="拖动调整列表宽度"
          @mousedown.prevent="startResizeList"
        />

        <div class="right-workspace home-right-subview">
          <RouterView />
        </div>
      </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import * as api from "../api/prompts";
import type { PromptListSortBy, PromptListSortOrder } from "../api/prompts";
import { ApiError } from "../api/http";
import type { PromptSummary } from "../api/types";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const route = useRoute();
const router = useRouter();

const items = ref<PromptSummary[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const listLoading = ref(false);

const listKeyword = ref("");
const listFilterTagDraft = ref("");
const listFilterTags = ref<string[]>([]);
const listSortBy = ref<PromptListSortBy>("updatedAt");
const listSortOrder = ref<PromptListSortOrder>("desc");
const listViewMode = ref<"titles" | "cards">("titles");

let listFilterDebounce: ReturnType<typeof setTimeout> | null = null;

const errorMsg = ref("");
const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, durationMs = 2800) {
  if (toastTimer != null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, durationMs);
}

const workspaceRef = ref<HTMLElement | null>(null);
const listWidthPx = ref(240);
const resizeAxis = ref<"list" | null>(null);

let dragStartClient = 0;
let dragStartListW = 0;

function startResizeList(e: MouseEvent) {
  resizeAxis.value = "list";
  dragStartClient = e.clientX;
  dragStartListW = listWidthPx.value;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}

function onResizeMove(e: MouseEvent) {
  if (resizeAxis.value === "list") {
    const delta = e.clientX - dragStartClient;
    const rect = workspaceRef.value?.getBoundingClientRect();
    if (!rect) return;
    const max = Math.min(520, rect.width * 0.55);
    listWidthPx.value = Math.round(Math.min(max, Math.max(160, dragStartListW + delta)));
  }
}

function onResizeEnd() {
  if (resizeAxis.value) {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
  resizeAxis.value = null;
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const listActiveId = computed(() => {
  const n = route.name;
  if (n === "prompt-versions" || n === "prompt-versions-compare") {
    return String(route.params.id ?? "").trim() || null;
  }
  const p = route.query.prompt;
  if (typeof p === "string" && p.trim()) return p.trim();
  return null;
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

type TitleSeg = { text: string; hit: boolean };

function titleHighlightSegments(title: string): TitleSeg[] {
  const q = listKeyword.value.trim();
  if (!q) return [{ text: title, hit: false }];
  const lowerTitle = title.toLowerCase();
  const lowerQ = q.toLowerCase();
  const qLen = q.length;
  const out: TitleSeg[] = [];
  let i = 0;
  while (i < title.length) {
    const idx = lowerTitle.indexOf(lowerQ, i);
    if (idx === -1) {
      if (i < title.length) out.push({ text: title.slice(i), hit: false });
      break;
    }
    if (idx > i) out.push({ text: title.slice(i, idx), hit: false });
    out.push({ text: title.slice(idx, idx + qLen), hit: true });
    i = idx + qLen;
  }
  return out;
}

function addListFilterTag() {
  const t = listFilterTagDraft.value.trim();
  if (!t) return;
  if (listFilterTags.value.includes(t)) {
    listFilterTagDraft.value = "";
    return;
  }
  listFilterTags.value = [...listFilterTags.value, t];
  listFilterTagDraft.value = "";
  scheduleListFilterReload();
}

function removeListFilterTag(index: number) {
  listFilterTags.value = listFilterTags.value.filter((_, i) => i !== index);
  scheduleListFilterReload();
}

function scheduleListFilterReload() {
  if (listFilterDebounce != null) clearTimeout(listFilterDebounce);
  listFilterDebounce = setTimeout(async () => {
    listFilterDebounce = null;
    page.value = 1;
    await refreshList();
  }, 380);
}

watch(listKeyword, () => {
  scheduleListFilterReload();
});

watch([listSortBy, listSortOrder], async () => {
  page.value = 1;
  await refreshList();
});

watch(listViewMode, (v) => {
  if (v === "cards") {
    listWidthPx.value = Math.max(listWidthPx.value, 280);
  }
});

async function refreshList() {
  errorMsg.value = "";
  listLoading.value = true;
  try {
    const tagList = listFilterTags.value.map((x) => x.trim()).filter(Boolean);
    const data = await api.listPrompts({
      page: page.value,
      pageSize: pageSize.value,
      keyword: listKeyword.value.trim() || undefined,
      tags: tagList.length ? tagList : undefined,
      sortBy: listSortBy.value,
      sortOrder: listSortOrder.value
    });
    items.value = data.items;
    total.value = data.total;
    page.value = data.page;
    pageSize.value = data.pageSize;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    listLoading.value = false;
  }
}

async function changePage(p: number) {
  page.value = p;
  await refreshList();
}

function openItem(id: string) {
  void router.push({ name: "home-main", query: { prompt: id } });
}

function startCreate() {
  void router.push({ name: "home-main", query: { create: "1" } });
}

function listDescPreview(item: PromptSummary): string {
  return item.description?.trim() || "暂无简介";
}

function listDescTitle(item: PromptSummary): string {
  const d = item.description?.trim();
  return d || "暂无简介";
}

provide("refreshPromptList", refreshList);
provide("promptHubToast", showToast);

onMounted(() => {
  void refreshList();
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
});

onUnmounted(() => {
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  if (toastTimer != null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (listFilterDebounce != null) {
    clearTimeout(listFilterDebounce);
    listFilterDebounce = null;
  }
});
</script>

<style scoped>
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
.home-right-subview {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
@media (max-width: 960px) {
  .preview-cols {
    grid-template-columns: 1fr;
  }
}
</style>
