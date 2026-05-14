<template>
  <WorkspaceLayout title="用户管理" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadList">刷新</button>
    </template>

    <div class="admin-page admin-split">
      <section class="admin-panel">
        <div class="admin-toolbar">
          <input v-model="filters.keyword" class="list-filter-input" type="search" placeholder="搜索用户名 / 邮箱 / 昵称" @keydown.enter="reload" />
          <select v-model="filters.role" class="list-sort-select">
            <option value="">全部角色</option>
            <option value="user">用户</option>
            <option value="admin">管理员</option>
          </select>
          <select v-model="filters.status" class="list-sort-select">
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">已禁用</option>
          </select>
          <button type="button" class="text-btn" @click="reload">查询</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>最近登录</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in items" :key="user.id" :class="{ active: selected?.id === user.id }" @click="openDetail(user.id)">
              <td>{{ user.nickname || user.username }}</td>
              <td>{{ user.email }}</td>
              <td><span class="status-badge">{{ roleLabel(user.role) }}</span></td>
              <td><span class="status-badge" :class="{ danger: user.status === 'disabled' }">{{ userStatusLabel(user.status) }}</span></td>
              <td>{{ formatTime(user.lastLoginAt) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !items.length" class="admin-empty">暂无用户</div>
        <div class="pager">
          <button type="button" class="text-btn sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
          <span class="muted">{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
          <button type="button" class="text-btn sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
        </div>
      </section>

      <aside class="admin-panel detail-card">
        <div v-if="detailLoading" class="muted center-pad">加载用户详情…</div>
        <div v-else-if="selected">
          <h2>{{ selected.nickname || selected.username }}</h2>
          <p class="meta">{{ selected.email }} · {{ formatTime(selected.createdAt) }} 创建</p>
          <div class="form-grid compact-form">
            <label class="fg-label">用户名</label>
            <input v-model="form.username" class="fg-input" type="text" />
            <label class="fg-label">邮箱</label>
            <input v-model="form.email" class="fg-input" type="email" />
            <label class="fg-label">昵称</label>
            <input v-model="form.nickname" class="fg-input" type="text" />
            <label class="fg-label">角色</label>
            <select v-model="form.role" class="fg-input">
              <option value="user">用户</option>
              <option value="admin">管理员</option>
            </select>
            <label class="fg-label">状态</label>
            <select v-model="form.status" class="fg-input">
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
            </select>
            <label class="fg-label">头像 URL</label>
            <input v-model="form.avatarUrl" class="fg-input" type="url" />
            <label class="fg-label">简介</label>
            <textarea v-model="form.bio" class="fg-textarea" rows="3" />
            <label class="fg-label">操作原因</label>
            <textarea v-model="reason" class="fg-textarea" rows="3" placeholder="禁用、恢复、删除或保存敏感变更时填写" />
          </div>
          <footer class="bottom-actions">
            <button type="button" class="primary" :disabled="acting" @click="save">保存</button>
            <button type="button" class="light" :disabled="acting" @click="restore">恢复</button>
            <button type="button" class="danger" :disabled="acting" @click="disable">禁用</button>
            <button type="button" class="danger" :disabled="acting" @click="remove">删除</button>
          </footer>
        </div>
        <div v-else class="muted center-pad">选择用户查看和管理资料</div>
      </aside>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as admin from "../api/admin";
import { ApiError } from "../api/http";
import type { Role, User, UserStatus } from "../api/types";
import { formatTime, roleLabel, userStatusLabel } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const filters = reactive({ keyword: "", role: "" as Role | "", status: "" as UserStatus | "" });
const form = reactive({ username: "", email: "", nickname: "", role: "user" as Role, status: "active" as UserStatus, avatarUrl: "", bio: "" });
const items = ref<User[]>([]);
const selected = ref<User | null>(null);
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

function fillForm(user: User) {
  form.username = user.username;
  form.email = user.email;
  form.nickname = user.nickname ?? "";
  form.role = user.role;
  form.status = user.status;
  form.avatarUrl = user.avatarUrl ?? "";
  form.bio = user.bio ?? "";
}

async function loadList() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await admin.listAdminUsers({ ...filters, keyword: filters.keyword.trim() || undefined, page: page.value, pageSize: pageSize.value });
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
    selected.value = await admin.getAdminUser(id);
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
  acting.value = true;
  try {
    selected.value = await admin.updateAdminUser(selected.value.id, {
      username: form.username.trim(),
      email: form.email.trim(),
      nickname: form.nickname.trim() || null,
      role: form.role,
      status: form.status,
      avatarUrl: form.avatarUrl.trim() || null,
      bio: form.bio.trim() || null,
      reason: reason.value.trim() || undefined
    });
    fillForm(selected.value);
    showToast("用户资料已保存");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function disable() {
  if (!selected.value) return;
  const r = requireReason("禁用用户");
  if (!r) return;
  acting.value = true;
  try {
    selected.value = await admin.disableAdminUser(selected.value.id, r);
    fillForm(selected.value);
    showToast("用户已禁用");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function restore() {
  if (!selected.value) return;
  const r = requireReason("恢复用户");
  if (!r) return;
  acting.value = true;
  try {
    selected.value = await admin.restoreAdminUser(selected.value.id, r);
    fillForm(selected.value);
    showToast("用户已恢复");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

async function remove() {
  if (!selected.value) return;
  const r = requireReason("删除用户");
  if (!r || !confirm(`确定删除用户「${selected.value.username}」？`)) return;
  acting.value = true;
  try {
    await admin.deleteAdminUser(selected.value.id, r);
    selected.value = null;
    showToast("用户已删除");
    await loadList();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    acting.value = false;
  }
}

onMounted(loadList);
</script>
