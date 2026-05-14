<template>
  <div class="prompt-page">
    <aside class="left-nav">
      <div class="brand">PC</div>
      <nav>
        <button type="button" class="nav-item" @click="goHome">我的 Prompt</button>
        <button type="button" class="nav-item active">社区</button>
      </nav>
      <button type="button" class="nav-bottom nav-link" @click="goHome">返回</button>
    </aside>

    <section class="main-shell toast-host">
      <Transition name="toast-pop">
        <div v-if="toastMessage" class="toast-float" role="status">{{ toastMessage }}</div>
      </Transition>
      <header class="top-bar">
        <div class="title">社区中心</div>
        <div class="top-actions">
          <button type="button" class="text-btn" @click="toggleMyShares">我的分享</button>
          <button type="button" class="text-btn" :disabled="listLoading" @click="refreshAll">刷新</button>
        </div>
      </header>

      <div class="workspace">
        <aside class="list-pane community-list-pane">
          <div class="list-header list-header-row">
            <span>共 {{ total }} 个公开 Prompt</span>
            <span v-if="listLoading" class="muted"> · 加载中...</span>
          </div>

          <div class="list-toolbar">
            <input
              v-model="keyword"
              class="list-filter-input"
              type="search"
              maxlength="200"
              placeholder="搜索标题、描述或标签..."
              enterkeyhint="search"
            />
            <div class="list-sort-row">
              <label class="list-sort-label">
                <span>排序</span>
                <select v-model="sort" class="list-sort-select">
                  <option value="latest">最新</option>
                  <option value="favoriteCount">收藏数</option>
                  <option value="hot">热度</option>
                </select>
              </label>
            </div>
          </div>

          <div v-if="tags.length" class="tag-cloud">
            <button
              v-for="tag in tags"
              :key="tag.name"
              type="button"
              class="tag-pill"
              :class="{ active: selectedTags.includes(tag.name) }"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }} · {{ tag.promptCount }}
            </button>
          </div>

          <article
            v-for="item in items"
            :key="item.id"
            class="community-card"
            :class="{ active: item.id === selectedId }"
            @click="openItem(item.id)"
          >
            <div class="community-card-head">
              <h3>{{ item.title }}</h3>
              <span>{{ item.favoriteCount }} 收藏</span>
            </div>
            <p>{{ item.description || item.contentPreview || "暂无描述" }}</p>
            <div v-if="item.tags.length" class="tag-row compact-tags">
              <span v-for="tag in item.tags" :key="`${item.id}-${tag}`" class="tag-chip">{{ tag }}</span>
            </div>
            <div class="prompt-card-meta muted">
              {{ item.authorName }} · {{ formatTime(item.publishedAt) }}
            </div>
          </article>

          <div v-if="!listLoading && items.length === 0" class="empty-list">暂无社区内容</div>
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

        <div class="splitter-col static-splitter" />

        <div class="right-workspace">
          <div class="detail-scroll">
            <main class="detail-pane">
              <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

              <template v-if="detail && !detailLoading">
                <h2 class="detail-title-line">{{ detail.title }}</h2>
                <p class="meta">
                  {{ detail.authorName }} · {{ formatTime(detail.publishedAt) }} ·
                  {{ detail.favoriteCount }} 收藏
                </p>
                <p class="detail-desc">{{ detail.description || "暂无描述" }}</p>

                <div v-if="detail.tags.length" class="tag-row">
                  <span v-for="tag in detail.tags" :key="`d-${tag}`" class="tag-chip">{{ tag }}</span>
                </div>

                <div class="field">
                  <div class="label">使用说明</div>
                  <div class="value">{{ detail.usageGuide || "暂无使用说明" }}</div>
                </div>
                <div class="field">
                  <div class="label">系统提示词</div>
                  <div class="value pre">{{ detail.systemPrompt || "（空）" }}</div>
                </div>
                <div class="field">
                  <div class="label">用户提示词</div>
                  <div class="value pre">{{ detail.userPrompt }}</div>
                </div>

                <div v-if="detail.variables?.length" class="field">
                  <div class="label">变量</div>
                  <div class="community-vars">
                    <span v-for="v in detail.variables" :key="v.name" class="filter-tag-chip">
                      {{ v.label || v.name }} / {{ v.type }}{{ v.required ? " / 必填" : "" }}
                    </span>
                  </div>
                </div>

                <footer class="bottom-actions">
                  <button type="button" class="primary" :disabled="actionLoading" @click="toggleFavorite">
                    {{ detail.favorited ? "取消收藏" : "收藏" }}
                  </button>
                  <button type="button" class="light" :disabled="actionLoading" @click="forkCurrent">Fork 到我的 Prompt</button>
                  <button type="button" class="light" :disabled="actionLoading" @click="openReportPanel">举报</button>
                  <button type="button" class="light" @click="copyPromptText">复制内容</button>
                </footer>
              </template>

              <div v-else-if="detailLoading" class="muted center-pad">加载详情...</div>
              <div v-else class="muted center-pad">请选择一条社区 Prompt。</div>

              <section v-if="reportPanelOpen && detail" class="tool-panel">
                <div class="tool-panel-head">
                  <h3>举报社区 Prompt</h3>
                  <button type="button" class="preview-close-btn" aria-label="关闭" @click="reportPanelOpen = false">×</button>
                </div>
                <div class="form-grid compact-form">
                  <label class="fg-label">原因</label>
                  <select v-model="reportForm.reason" class="fg-input">
                    <option value="unsafe_content">不安全内容</option>
                    <option value="copyright">版权问题</option>
                    <option value="spam">垃圾内容</option>
                    <option value="privacy">隐私问题</option>
                    <option value="other">其他</option>
                  </select>
                  <label class="fg-label">补充说明</label>
                  <textarea v-model="reportForm.description" class="fg-textarea" rows="3" maxlength="1000" />
                </div>
                <div class="bottom-actions inline-actions">
                  <button type="button" class="danger" :disabled="actionLoading" @click="submitReport">提交举报</button>
                  <button type="button" class="light" :disabled="actionLoading" @click="reportPanelOpen = false">取消</button>
                </div>
              </section>

              <section v-if="mySharesOpen" class="tool-panel">
                <div class="tool-panel-head">
                  <h3>我的分享</h3>
                  <button type="button" class="preview-close-btn" aria-label="关闭" @click="mySharesOpen = false">×</button>
                </div>
                <div class="list-sort-row share-filter">
                  <label class="list-sort-label">
                    <span>审核状态</span>
                    <select v-model="shareStatusFilter" class="list-sort-select" @change="loadMyShares">
                      <option value="">全部</option>
                      <option value="pending">待审核</option>
                      <option value="approved">已通过</option>
                      <option value="rejected">已驳回</option>
                      <option value="removed">已下架</option>
                    </select>
                  </label>
                  <button type="button" class="text-btn" :disabled="actionLoading" @click="loadMyShares">刷新</button>
                </div>
                <div v-if="myShares.length" class="record-list">
                  <div v-for="share in myShares" :key="share.shareId" class="share-row">
                    <div>
                      <strong>{{ share.title }}</strong>
                      <p class="muted">
                        {{ reviewStatusText(share.reviewStatus) }} · {{ formatTime(share.submittedAt) }}
                      </p>
                      <p v-if="share.auditNote" class="muted">{{ share.auditNote }}</p>
                    </div>
                    <button
                      type="button"
                      class="text-btn sm"
                      :disabled="share.reviewStatus !== 'pending' || actionLoading"
                      @click="withdrawMyShare(share.shareId)"
                    >
                      撤回
                    </button>
                  </div>
                </div>
                <div v-else class="muted">暂无分享记录</div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api/http";
import * as community from "../api/community";
import type {
  CommunityPromptDetail,
  CommunityPromptListItem,
  CommunitySort,
  CommunityTagItem,
  MyShareItem,
  ReportReason,
  ReviewStatus
} from "../api/community";

const router = useRouter();
const items = ref<CommunityPromptListItem[]>([]);
const tags = ref<CommunityTagItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref("");
const selectedTags = ref<string[]>([]);
const sort = ref<CommunitySort>("latest");
const listLoading = ref(false);
const detailLoading = ref(false);
const actionLoading = ref(false);
const errorMsg = ref("");
const selectedId = ref<string | null>(null);
const detail = ref<CommunityPromptDetail | null>(null);
const toastMessage = ref("");
const reportPanelOpen = ref(false);
const mySharesOpen = ref(false);
const myShares = ref<MyShareItem[]>([]);
const shareStatusFilter = ref<ReviewStatus | "">("");
const reportForm = reactive({
  reason: "unsafe_content" as ReportReason,
  description: ""
});

let listDebounce: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

function showToast(message: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, 2600);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

function apiMessage(e: unknown) {
  return e instanceof ApiError ? e.message : String(e);
}

function scheduleReload() {
  if (listDebounce) clearTimeout(listDebounce);
  listDebounce = setTimeout(async () => {
    listDebounce = null;
    page.value = 1;
    await refreshList();
  }, 360);
}

async function refreshList() {
  errorMsg.value = "";
  listLoading.value = true;
  try {
    const data =
      selectedTags.value.length === 1 && !keyword.value.trim()
        ? await community.searchCommunityPromptsByTag({
            tag: selectedTags.value[0],
            page: page.value,
            pageSize: pageSize.value
          })
        : await community.listCommunityPrompts({
            keyword: keyword.value,
            tags: selectedTags.value,
            sort: sort.value,
            page: page.value,
            pageSize: pageSize.value
          });
    items.value = data.items;
    total.value = data.pagination.total;
    page.value = data.pagination.page;
    pageSize.value = data.pagination.pageSize;
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    listLoading.value = false;
  }
}

async function refreshTags() {
  try {
    const data = await community.listCommunityTags();
    tags.value = data.items;
  } catch {
    tags.value = [];
  }
}

async function refreshAll() {
  await Promise.all([refreshList(), refreshTags()]);
}

async function openItem(id: string) {
  selectedId.value = id;
  reportPanelOpen.value = false;
  detailLoading.value = true;
  errorMsg.value = "";
  try {
    detail.value = await community.getCommunityPrompt(id);
  } catch (e) {
    detail.value = null;
    errorMsg.value = apiMessage(e);
  } finally {
    detailLoading.value = false;
  }
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((x) => x !== tag)
    : [...selectedTags.value, tag];
  scheduleReload();
}

async function changePage(next: number) {
  page.value = next;
  await refreshList();
}

async function toggleFavorite() {
  if (!detail.value) return;
  actionLoading.value = true;
  errorMsg.value = "";
  try {
    const r = detail.value.favorited
      ? await community.unfavoriteCommunityPrompt(detail.value.id)
      : await community.favoriteCommunityPrompt(detail.value.id);
    detail.value.favorited = r.favorited;
    detail.value.favoriteCount = r.favoriteCount;
    const current = items.value.find((x) => x.id === detail.value?.id);
    if (current) {
      current.favorited = r.favorited;
      current.favoriteCount = r.favoriteCount;
    }
    showToast(r.favorited ? "已收藏" : "已取消收藏");
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    actionLoading.value = false;
  }
}

async function forkCurrent() {
  if (!detail.value) return;
  actionLoading.value = true;
  errorMsg.value = "";
  try {
    const r = await community.forkCommunityPrompt(detail.value.id);
    showToast(`已 Fork：${r.title}，可返回我的 Prompt 查看`);
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    actionLoading.value = false;
  }
}

function openReportPanel() {
  if (!detail.value) return;
  reportForm.reason = "unsafe_content";
  reportForm.description = "";
  reportPanelOpen.value = true;
}

async function submitReport() {
  if (!detail.value) return;
  actionLoading.value = true;
  errorMsg.value = "";
  try {
    await community.reportCommunityPrompt(detail.value.id, {
      reason: reportForm.reason,
      description: reportForm.description.trim() || undefined
    });
    reportPanelOpen.value = false;
    showToast("举报已提交");
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    actionLoading.value = false;
  }
}

async function toggleMyShares() {
  mySharesOpen.value = !mySharesOpen.value;
  if (mySharesOpen.value) await loadMyShares();
}

async function loadMyShares() {
  actionLoading.value = true;
  errorMsg.value = "";
  try {
    const data = await community.listMyShares({
      reviewStatus: shareStatusFilter.value,
      page: 1,
      pageSize: 20
    });
    myShares.value = data.items;
  } catch (e) {
    myShares.value = [];
    errorMsg.value = apiMessage(e);
  } finally {
    actionLoading.value = false;
  }
}

async function withdrawMyShare(shareId: string) {
  actionLoading.value = true;
  errorMsg.value = "";
  try {
    await community.withdrawShare(shareId);
    showToast("已撤回分享");
    await loadMyShares();
  } catch (e) {
    errorMsg.value = apiMessage(e);
  } finally {
    actionLoading.value = false;
  }
}

function reviewStatusText(status: ReviewStatus) {
  const map: Record<ReviewStatus, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    removed: "已下架"
  };
  return map[status];
}

function copyPromptText() {
  if (!detail.value) return;
  const text = [
    detail.value.systemPrompt ? `【系统】\n${detail.value.systemPrompt}` : "",
    `【用户】\n${detail.value.userPrompt}`
  ]
    .filter(Boolean)
    .join("\n\n");
  navigator.clipboard.writeText(text).then(
    () => showToast("已复制到剪贴板"),
    () => {
      errorMsg.value = "复制失败，请检查浏览器权限";
    }
  );
}

function goHome() {
  router.push("/");
}

watch(keyword, scheduleReload);
watch(sort, async () => {
  page.value = 1;
  await refreshList();
});

onMounted(refreshAll);

onUnmounted(() => {
  if (listDebounce) clearTimeout(listDebounce);
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
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
.community-list-pane {
  width: 360px;
}
.list-header-row,
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.list-toolbar {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}
.list-filter-input,
.list-sort-select,
.fg-input,
.fg-textarea {
  width: 100%;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
}
.fg-textarea {
  resize: vertical;
  min-height: 80px;
}
.form-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 14px;
  align-items: start;
}
.fg-label {
  font-size: 13px;
  color: #6b7280;
  padding-top: 8px;
}
.tool-panel {
  margin-top: 18px;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fff;
  padding: 14px;
}
.tool-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.tool-panel-head h3 {
  margin: 0;
  font-size: 16px;
}
.inline-actions {
  margin-top: 12px;
  flex-wrap: wrap;
}
.share-filter {
  align-items: end;
  margin-bottom: 12px;
}
.record-list {
  display: grid;
  gap: 8px;
}
.share-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  padding: 10px;
}
.share-row p {
  margin: 4px 0 0;
  font-size: 12px;
}
.list-sort-row {
  display: flex;
  gap: 8px;
}
.list-sort-label {
  display: grid;
  gap: 5px;
  width: 100%;
  font-size: 12px;
  color: #6b7280;
}
.muted {
  color: #9099ab;
}
.sm {
  padding: 4px 8px !important;
  font-size: 12px !important;
}
.error-msg {
  margin: 0 0 8px;
  padding: 8px 12px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 13px;
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
.filter-tag-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #eef2fa;
  color: #3f4658;
  padding: 4px 8px;
  font-size: 12px;
}
.pre {
  white-space: pre-wrap;
  word-break: break-word;
}
.empty-list,
.center-pad {
  font-size: 13px;
  color: #98a2b3;
  padding: 12px 4px;
}
.prompt-card-meta {
  font-size: 12px;
}
.preview-close-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.preview-close-btn:hover {
  background: #eef2fa;
  color: #2f67ea;
}
.nav-link {
  border: none;
  background: transparent;
  cursor: pointer;
}
.static-splitter {
  cursor: default;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}
.tag-pill {
  border: 1px solid #d8deea;
  background: #fff;
  color: #667085;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 12px;
  cursor: pointer;
}
.tag-pill.active {
  border-color: #2f67ea;
  background: #eef3ff;
  color: #2f67ea;
  font-weight: 600;
}
.community-card {
  border: 1px solid #e2e6f0;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.community-card:hover,
.community-card.active {
  border-color: #2f67ea;
  box-shadow: 0 2px 8px rgba(47, 103, 234, 0.14);
}
.community-card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.community-card h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
}
.community-card-head span {
  flex-shrink: 0;
  color: #667085;
  font-size: 12px;
}
.community-card p {
  margin: 8px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
}
.compact-tags {
  margin: 0 0 8px;
}
.community-vars {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
