<template>
  <WorkspaceLayout title="审计日志" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadList">刷新</button>
    </template>

    <div class="admin-page">
      <section class="admin-panel">
        <div class="admin-toolbar multi">
          <input v-model="filters.actorId" class="list-filter-input narrow" type="text" placeholder="操作者 ID" @keydown.enter="reload" />
          <input v-model="filters.action" class="list-filter-input narrow" type="text" placeholder="动作" @keydown.enter="reload" />
          <select v-model="filters.targetType" class="list-sort-select">
            <option value="">全部对象</option>
            <option value="user">用户</option>
            <option value="prompt">Prompt</option>
            <option value="community_prompt">社区 Prompt</option>
            <option value="report">举报</option>
          </select>
          <input v-model="filters.targetId" class="list-filter-input narrow" type="text" placeholder="对象 ID" @keydown.enter="reload" />
          <input v-model="filters.startTime" class="list-filter-input narrow" type="datetime-local" />
          <input v-model="filters.endTime" class="list-filter-input narrow" type="datetime-local" />
          <button type="button" class="text-btn" @click="reload">查询</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作者</th>
              <th>动作</th>
              <th>对象</th>
              <th>IP</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in items" :key="log.id">
              <td>{{ formatTime(log.createdAt) }}</td>
              <td>{{ log.actorId }} / {{ roleLabel(log.actorRole) }}</td>
              <td>{{ log.action }}</td>
              <td>{{ auditTargetLabel(log.targetType) }} · {{ log.targetId }}</td>
              <td>{{ log.ipAddress || "-" }}</td>
              <td class="audit-detail">{{ stringify(log.detail) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !items.length" class="admin-empty">暂无审计日志</div>
        <div class="pager">
          <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="muted">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
          <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </section>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as admin from "../api/admin";
import { ApiError } from "../api/http";
import type { AuditLog, AuditTargetType } from "../api/types";
import { auditTargetLabel, formatTime, roleLabel } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const filters = reactive({ actorId: "", action: "", targetType: "" as AuditTargetType | "", targetId: "", startTime: "", endTime: "" });
const items = ref<AuditLog[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const errorMsg = ref("");
const toastMessage = ref("");
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

function stringify(detail?: Record<string, unknown> | null): string {
  if (!detail) return "-";
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function toApiDate(v: string): string | undefined {
  return v ? new Date(v).toISOString() : undefined;
}

async function loadList() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await admin.listAuditLogs({
      actorId: filters.actorId.trim() || undefined,
      action: filters.action.trim() || undefined,
      targetType: filters.targetType,
      targetId: filters.targetId.trim() || undefined,
      startTime: toApiDate(filters.startTime),
      endTime: toApiDate(filters.endTime),
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

onMounted(loadList);
</script>
