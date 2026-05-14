<template>
  <div class="login-page">
    <div class="login-card">
      <h1>注册 PromptHub</h1>
      <p class="hint">创建账号后将自动登录，并进入 Prompt 工作台。</p>

      <div class="form-item">
        <label for="username">用户名</label>
        <input id="username" v-model="form.username" type="text" autocomplete="username" />
      </div>

      <div class="form-item">
        <label for="email">邮箱</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" />
      </div>

      <div class="form-item">
        <label for="nickname">昵称</label>
        <input id="nickname" v-model="form.nickname" type="text" />
      </div>

      <div class="form-item">
        <label for="password">密码</label>
        <input id="password" v-model="form.password" type="password" autocomplete="new-password" @keydown.enter="submit" />
      </div>

      <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
      <button type="button" :disabled="loading" @click="submit">{{ loading ? "注册中…" : "注册" }}</button>
      <p class="auth-switch">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { register } from "../api/auth";
import { ApiError } from "../api/http";

const router = useRouter();
const loading = ref(false);
const errorMsg = ref("");
const form = reactive({
  username: "",
  email: "",
  nickname: "",
  password: ""
});

async function submit() {
  errorMsg.value = "";
  const username = form.username.trim();
  const email = form.email.trim();
  if (!username || !email || !form.password) {
    errorMsg.value = "用户名、邮箱与密码不能为空";
    return;
  }
  loading.value = true;
  try {
    await register({
      username,
      email,
      password: form.password,
      nickname: form.nickname.trim() || undefined
    });
    await router.push("/");
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>
