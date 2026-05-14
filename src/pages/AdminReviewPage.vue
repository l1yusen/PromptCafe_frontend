<template>
  <WorkspaceLayout title="审核中心" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadList">刷新</button>
    </template>

    <div class="admin-page admin-split">
      <section class="admin-panel">
        <div class="admin-toolbar">
          <input v-model="keyword" class="list-filter-input" type="search" placeholder="搜索待审核标题" @keydown.enter="reload" />
          <button type="button" class="text-btn" @click="reload">查询</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>作者</th>
              <th>状态</th>
              <th>数据</th>
              <th>提交时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" :class="{ active: selected?.id === item.id }" @click="openDetail(item.id)">
              <td>{{ item.titleSnapshot }}</td>
              <td>{{ authorName(item.author) }}</td>
              <td><span class="status-badge warn">{{ communityStatusLabel(item.status) }}</span></td>
              <td>{{ item.viewCount }} 浏览 / {{ item.favoriteCount }} 收藏</td>
              <td>{{ formatTime(item.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !items.length" class="admin-empty">暂无待审核分享</div>
        <div class="pager">
          <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="muted">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
          <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </section>

      <aside class="admin-panel detail-card">
        <div v-if="detailLoading" class="muted center-pad">加载详情…</div>
        <div v-else-if="selected">
          <h2>{{ selected.titleSnapshot }}</h2>
          <p class="meta">{{ authorName(selected.author) }} · {{ formatTime(selected.createdAt) }}</p>
          <p class="detail-desc" :class="{ muted: !selected.description?.trim() }">
            {{ selected.description?.trim() || "暂无描述" }}
          </p>
          <div v-if="selected.tagsSnapshot?.length" class="tag-row">
            <span v-for="tag in selected.tagsSnapshot" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
          <div class="field">
            <div class="label">系统提示词</div>
            <div class="value pre">{{ selected.systemPromptSnapshot || "（空）" }}</div>
          </div>
          <div class="field">
            <div class="label">用户提示词</div>
            <div class="value pre">{{ selected.userPromptSnapshot }}</div>
          </div>
          <textarea v-model="auditNote" class="fg-textarea" rows="3" placeholder="审核备注 / 驳回原因" />
          <footer class="bottom-actions">
            <button type="button" class="primary" :disabled="acting" @click="approve">通过</button>
            <button type="button" class="danger" :disabled="acting" @click="reject">驳回</button>
            <button type="button" class="light" :disabled="acting" @click="remove">下架</button>
          </footer>
        </div>
        <div v-else class="muted center-pad">选择一条待审核内容查看详情</div>
      </aside>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as admin from "../api/admin";
import { ApiError } from "../api/http";
import type { CommunityPromptAdmin } from "../api/types";
import { authorName, communityStatusLabel, formatTime } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const keyword = ref("");
const items = ref<CommunityPromptAdmin[]>([]);
const selected = ref<CommunityPromptAdmin | null>(null);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(false);
const detailLoading = ref(false);
const acting = ref(false);
const errorMsg = ref("");
const toastMessage = ref("");
const auditNote = ref("");
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => (toastMessage.value = ""), 2400);
}

async function loadList() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await admin.listPendingSharedPrompts({ keyword: keyword.value.trim() || undefined, page: page.value, pageSize: pageSize.value });
    items.value = data.items;
    total.value = data.pagination.total;
    page.value = data.pagination.page;
    pageSize.value = data.pagination.pageSize;
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailLoading.value = true;
  auditNote.value = "";
  try {
    selected.value = await admin.getSharedPrompt(id);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    detailLoading.value = false;
  }
}

async function reload() {
  page.value = 1;
  await loadList();
}

async function changePage(next: number) {
  page.value = next;
  await loadList();
}

async function approve() {
  if (!selected.value) return;
  acting.value = true;
  try {
    selected.value = await admin.approveSharedPrompt(selected.value.id, auditNote.value.trim() || undefined);
    showToast("已审核通过");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function reject() {
  if (!selected.value) return;
  const note = auditNote.value.trim();
  if (!note) {
    errorMsg.value = "驳回必须填写原因";
    return;
  }
  acting.value = true;
  try {
    selected.value = await admin.rejectSharedPrompt(selected.value.id, note);
    showToast("已驳回");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function remove() {
  if (!selected.value) return;
  const reason = auditNote.value.trim();
  if (!reason) {
    errorMsg.value = "下架必须填写原因";
    return;
  }
  if (!confirm(`确定下架「${selected.value.titleSnapshot}」？`)) return;
  acting.value = true;
  try {
    selected.value = await admin.removeSharedPrompt(selected.value.id, reason);
    showToast("已下架");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

onMounted(loadList);
</script>
