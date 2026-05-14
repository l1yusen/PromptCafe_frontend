<template>
  <WorkspaceLayout title="个人中心" :toast-message="toastMessage">
    <template #actions>
      <button type="button" class="text-btn" :disabled="loading" @click="loadProfile">刷新</button>
    </template>

    <div class="admin-page">
      <section class="admin-panel profile-panel">
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <div v-if="loading" class="muted center-pad">加载个人资料…</div>
        <template v-else>
          <div class="profile-head">
            <div class="profile-avatar">{{ avatarInitial }}</div>
            <div>
              <h2>{{ displayName }}</h2>
              <p class="meta">{{ profile?.email }} · {{ roleLabel(profile?.role) }} · {{ userStatusLabel(profile?.status) }}</p>
            </div>
          </div>

          <div class="form-grid profile-form">
            <label class="fg-label">用户名</label>
            <input class="fg-input" :value="profile?.username || ''" type="text" disabled />

            <label class="fg-label">昵称</label>
            <input v-model="form.nickname" class="fg-input" type="text" maxlength="80" />

            <label class="fg-label">头像 URL</label>
            <input v-model="form.avatarUrl" class="fg-input" type="url" />

            <label class="fg-label">个人简介</label>
            <textarea v-model="form.bio" class="fg-textarea" rows="5" maxlength="500" />
          </div>

          <footer class="bottom-actions profile-actions">
            <button type="button" class="primary" :disabled="saving" @click="saveProfile">
              {{ saving ? "保存中…" : "保存资料" }}
            </button>
          </footer>
        </template>
      </section>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { getMyProfile, updateMyProfile } from "../api/auth";
import { ApiError } from "../api/http";
import type { User } from "../api/types";
import { roleLabel, userStatusLabel } from "../api/userLabels";
import WorkspaceLayout from "../layouts/WorkspaceLayout.vue";

const loading = ref(false);
const saving = ref(false);
const errorMsg = ref("");
const toastMessage = ref("");
const profile = ref<User | null>(null);
const form = reactive({ nickname: "", avatarUrl: "", bio: "" });

const displayName = computed(() => profile.value?.nickname?.trim() || profile.value?.username || "未命名用户");
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase());

function fillForm(user: User) {
  form.nickname = user.nickname ?? "";
  form.avatarUrl = user.avatarUrl ?? "";
  form.bio = user.bio ?? "";
}

function showToast(message: string) {
  toastMessage.value = message;
  window.setTimeout(() => {
    toastMessage.value = "";
  }, 2400);
}

async function loadProfile() {
  loading.value = true;
  errorMsg.value = "";
  try {
    profile.value = await getMyProfile();
    fillForm(profile.value);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  errorMsg.value = "";
  try {
    profile.value = await updateMyProfile({
      nickname: form.nickname.trim() || null,
      avatarUrl: form.avatarUrl.trim() || null,
      bio: form.bio.trim() || null
    });
    fillForm(profile.value);
    showToast("个人资料已保存");
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

onMounted(loadProfile);
</script>
