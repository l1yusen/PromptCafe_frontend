<template>
  <WorkspaceLayout title="举报处理" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadList">刷新</button>
    </template>

    <div class="admin-page admin-split">
      <section class="admin-panel">
        <div class="admin-toolbar">
          <select v-model="filters.status" class="list-sort-select">
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processed">已处理</option>
            <option value="rejected">已驳回</option>
          </select>
          <input v-model="filters.communityPromptId" class="list-filter-input" type="text" placeholder="社区 Prompt ID" @keydown.enter="reload" />
          <button type="button" class="text-btn" @click="reload">查询</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>原因</th>
              <th>社区 Prompt</th>
              <th>状态</th>
              <th>提交时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in items" :key="report.id" :class="{ active: selected?.id === report.id }" @click="select(report)">
              <td>{{ report.reason }}</td>
              <td>{{ report.communityPromptId }}</td>
              <td><span class="status-badge" :class="{ warn: report.status === 'pending' }">{{ reportStatusLabel(report.status) }}</span></td>
              <td>{{ formatTime(report.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !items.length" class="admin-empty">暂无举报</div>
        <div class="pager">
          <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="muted">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
          <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </section>

      <aside class="admin-panel detail-card">
        <div v-if="selected">
          <h2>{{ selected.reason }}</h2>
          <p class="meta">{{ selected.communityPromptId }} · {{ reportStatusLabel(selected.status) }}</p>
          <div class="field">
            <div class="label">举报说明</div>
            <div class="value pre">{{ selected.description || "（无）" }}</div>
          </div>
          <div class="field">
            <div class="label">处理结果</div>
            <div class="value pre">{{ selected.handleResult || "尚未处理" }}</div>
          </div>
          <div class="form-grid compact-form">
            <label class="fg-label">处理状态</label>
            <select v-model="handleForm.status" class="fg-input">
              <option value="processed">已处理</option>
              <option value="rejected">驳回举报</option>
            </select>
            <label class="fg-label">处理说明</label>
            <textarea v-model="handleForm.handleResult" class="fg-textarea" rows="4" />
            <label class="fg-label">下架分享</label>
            <label class="chk admin-check"><input v-model="handleForm.removeCommunityPrompt" type="checkbox" /> 同时下架被举报的社区 Prompt</label>
          </div>
          <footer class="bottom-actions">
            <button type="button" class="primary" :disabled="acting" @click="handle">提交处理</button>
          </footer>
        </div>
        <div v-else class="muted center-pad">选择举报查看处理信息</div>
      </aside>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as admin from "../api/admin";
import { ApiError } from "../api/http";
import type { CommunityReport, CommunityReportStatus } from "../api/types";
import { formatTime, reportStatusLabel } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const filters = reactive({ status: "" as CommunityReportStatus | "", communityPromptId: "" });
const handleForm = reactive({ status: "processed" as CommunityReportStatus, handleResult: "", removeCommunityPrompt: false });
const items = ref<CommunityReport[]>([]);
const selected = ref<CommunityReport | null>(null);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(false);
const acting = ref(false);
const errorMsg = ref("");
const toastMessage = ref("");
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => (toastMessage.value = ""), 2400);
}

function select(report: CommunityReport) {
  selected.value = report;
  handleForm.status = report.status === "rejected" ? "rejected" : "processed";
  handleForm.handleResult = report.handleResult ?? "";
  handleForm.removeCommunityPrompt = false;
}

async function loadList() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await admin.listReports({
      status: filters.status,
      communityPromptId: filters.communityPromptId.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value
    });
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

async function reload() {
  page.value = 1;
  await loadList();
}

async function changePage(next: number) {
  page.value = next;
  await loadList();
}

async function handle() {
  if (!selected.value) return;
  const handleResult = handleForm.handleResult.trim();
  if (!handleResult) {
    errorMsg.value = "处理举报必须填写处理说明";
    return;
  }
  acting.value = true;
  try {
    selected.value = await admin.handleReport(selected.value.id, {
      status: handleForm.status,
      handleResult,
      removeCommunityPrompt: handleForm.removeCommunityPrompt
    });
    showToast("举报已处理");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

onMounted(loadList);
</script>
