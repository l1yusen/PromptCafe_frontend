<template>
  <div class="login-page">
    <div class="login-card">
      <h1>登录 PromptHub</h1>
      <p class="hint">
        使用用户名或邮箱登录，进入你的 Prompt 工作台。
      </p>

      <div class="form-item">
        <label for="account">用户名或邮箱</label>
        <input id="account" v-model="account" type="text" autocomplete="username" @keydown.enter="goHome" />
      </div>

      <div class="form-item">
        <label for="password">密码</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" @keydown.enter="goHome" />
      </div>

      <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
      <button type="button" :disabled="loading" @click="goHome">{{ loading ? "登录中…" : "登录" }}</button>
      <p class="auth-switch">还没有账号？<RouterLink to="/register">立即注册</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { login } from "../api/auth";
import { ApiError } from "../api/http";

const account = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const route = useRoute();
const router = useRouter();

const goHome = async () => {
  errorMsg.value = "";
  const accountValue = account.value.trim();
  if (!accountValue || !password.value) {
    errorMsg.value = "请输入用户名或邮箱与密码";
    return;
  }
  loading.value = true;
  try {
    await login({ account: accountValue, password: password.value });
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.push(redirect);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
};
</script>
