<template>
  <WorkspaceLayout title="Prompt 管理" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadList">刷新</button>
    </template>

    <div class="admin-page admin-split">
      <section class="admin-panel">
        <div class="admin-toolbar">
          <input v-model="filters.keyword" class="list-filter-input" type="search" placeholder="搜索标题" @keydown.enter="reload" />
          <input v-model="filters.authorId" class="list-filter-input narrow" type="text" placeholder="作者 ID" @keydown.enter="reload" />
          <input v-model="filters.tag" class="list-filter-input narrow" type="text" placeholder="标签" @keydown.enter="reload" />
          <select v-model="filters.visibility" class="list-sort-select">
            <option value="">全部可见性</option>
            <option value="private">私有</option>
            <option value="public">公开</option>
          </select>
          <button type="button" class="text-btn" @click="reload">查询</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>作者</th>
              <th>可见性</th>
              <th>版本</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prompt in items" :key="prompt.id" :class="{ active: selected?.id === prompt.id }" @click="openDetail(prompt.id)">
              <td>{{ prompt.title }}</td>
              <td>{{ authorName(prompt.author) }}</td>
              <td><span class="status-badge">{{ visibilityLabel(prompt.visibility) }}</span></td>
              <td>v{{ prompt.currentVersion }}</td>
              <td>{{ formatTime(prompt.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !items.length" class="admin-empty">暂无 Prompt</div>
        <div class="pager">
          <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="muted">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
          <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </section>

      <aside class="admin-panel detail-card">
        <div v-if="detailLoading" class="muted center-pad">加载 Prompt 详情…</div>
        <div v-else-if="selected">
          <h2>{{ selected.title }}</h2>
          <p class="meta">{{ authorName(selected.author) }} · {{ visibilityLabel(selected.visibility) }} · v{{ selected.currentVersion }}</p>
          <div class="form-grid compact-form">
            <label class="fg-label">标题</label>
            <input v-model="form.title" class="fg-input" type="text" />
            <label class="fg-label">简介</label>
            <input v-model="form.description" class="fg-input" type="text" />
            <label class="fg-label">可见性</label>
            <select v-model="form.visibility" class="fg-input">
              <option value="private">私有</option>
              <option value="public">公开</option>
            </select>
            <label class="fg-label">标签</label>
            <input v-model="form.tagsText" class="fg-input" type="text" placeholder="逗号分隔" />
            <label class="fg-label">系统提示词</label>
            <textarea v-model="form.systemPrompt" class="fg-textarea" rows="4" />
            <label class="fg-label">用户提示词</label>
            <textarea v-model="form.userPrompt" class="fg-textarea" rows="7" />
            <label class="fg-label">操作原因</label>
            <textarea v-model="reason" class="fg-textarea" rows="3" />
          </div>
          <footer class="bottom-actions">
            <button type="button" class="primary" :disabled="acting" @click="save">保存</button>
            <button type="button" class="danger" :disabled="acting" @click="remove">删除</button>
          </footer>
        </div>
        <div v-else class="muted center-pad">选择 Prompt 查看和管理详情</div>
      </aside>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as admin from "../api/admin";
import { ApiError } from "../api/http";
import type { AdminPrompt, PromptVisibility } from "../api/types";
import { authorName, formatTime, visibilityLabel } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const filters = reactive({ keyword: "", authorId: "", visibility: "" as PromptVisibility | "", tag: "" });
const form = reactive({ title: "", description: "", visibility: "private" as PromptVisibility, tagsText: "", systemPrompt: "", userPrompt: "" });
const items = ref<AdminPrompt[]>([]);
const selected = ref<AdminPrompt | null>(null);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(false);
const detailLoading = ref(false);
const acting = ref(false);
const errorMsg = ref("");
const toastMessage = ref("");
const reason = ref("");
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => (toastMessage.value = ""), 2400);
}

function fillForm(prompt: AdminPrompt) {
  form.title = prompt.title;
  form.description = prompt.description ?? "";
  form.visibility = prompt.visibility;
  form.tagsText = (prompt.tags ?? []).join(", ");
  form.systemPrompt = prompt.systemPrompt ?? "";
  form.userPrompt = prompt.userPrompt;
}

async function loadList() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await admin.listAdminPrompts({
      keyword: filters.keyword.trim() || undefined,
      authorId: filters.authorId.trim() || undefined,
      tag: filters.tag.trim() || undefined,
      visibility: filters.visibility,
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

async function openDetail(id: string) {
  detailLoading.value = true;
  reason.value = "";
  try {
    selected.value = await admin.getAdminPrompt(id);
    fillForm(selected.value);
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

function requireReason(action: string): string | null {
  const r = reason.value.trim();
  if (!r) {
    errorMsg.value = `${action}必须填写操作原因`;
    return null;
  }
  return r;
}

async function save() {
  if (!selected.value) return;
  const r = requireReason("保存 Prompt");
  if (!r) return;
  acting.value = true;
  try {
    selected.value = await admin.updateAdminPrompt(selected.value.id, {
      title: form.title.trim(),
      description: form.description.trim() || null,
      visibility: form.visibility,
      tags: form.tagsText.split(",").map((x) => x.trim()).filter(Boolean),
      systemPrompt: form.systemPrompt.trim() || null,
      userPrompt: form.userPrompt.trim(),
      variables: selected.value.variables ?? [],
      reason: r
    });
    fillForm(selected.value);
    showToast("Prompt 已保存");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function remove() {
  if (!selected.value) return;
  const r = requireReason("删除 Prompt");
  if (!r || !confirm(`确定删除 Prompt「${selected.value.title}」？`)) return;
  acting.value = true;
  try {
    await admin.deleteAdminPrompt(selected.value.id, r);
    selected.value = null;
    showToast("Prompt 已删除");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

onMounted(loadList);
</script>
