<template>
  <div class="prompt-page">
    <aside class="left-nav">
      <div class="brand">PC</div>
      <nav class="main-nav">
        <RouterLink to="/" class="nav-link" active-class="active">我的 Prompt</RouterLink>
        <RouterLink to="/profile" class="nav-link" active-class="active">个人中心</RouterLink>
        <template v-if="currentUser?.role === 'admin'">
          <div class="nav-section">管理</div>
          <RouterLink to="/admin/reviews" class="nav-link" active-class="active">审核中心</RouterLink>
          <RouterLink to="/admin/users" class="nav-link" active-class="active">用户管理</RouterLink>
          <RouterLink to="/admin/prompts" class="nav-link" active-class="active">Prompt 管理</RouterLink>
          <RouterLink to="/admin/reports" class="nav-link" active-class="active">举报处理</RouterLink>
          <RouterLink to="/admin/audit-logs" class="nav-link" active-class="active">审计日志</RouterLink>
        </template>
      </nav>
      <div class="nav-bottom">{{ currentUser?.role === "admin" ? "管理员" : "用户" }}</div>
    </aside>

    <section class="main-shell toast-host">
      <Transition name="toast-pop">
        <div v-if="toastMessage" class="toast-float" role="status">{{ toastMessage }}</div>
      </Transition>
      <header class="top-bar">
        <div class="title">{{ title }}</div>
        <div class="top-actions">
          <div class="user-pill" :title="currentUser?.email">
            {{ displayName }}
            <span>{{ currentUser?.role === "admin" ? "管理员" : "用户" }}</span>
          </div>
          <slot name="actions" />
          <button type="button" class="text-btn" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { getAuthMe, getStoredUser, logout } from "../api/auth";
import type { User } from "../api/types";

defineProps<{
  title: string;
  toastMessage?: string;
}>();

const router = useRouter();
const currentUser = ref<User | null>(getStoredUser());

const displayName = computed(() => {
  const user = currentUser.value;
  return user?.nickname?.trim() || user?.username || "未命名用户";
});

async function handleLogout() {
  await logout();
  await router.push("/login");
}

onMounted(async () => {
  if (!currentUser.value) {
    try {
      currentUser.value = await getAuthMe();
    } catch {
      currentUser.value = null;
    }
  }
});
</script>
