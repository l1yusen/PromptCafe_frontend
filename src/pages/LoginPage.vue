<template>
  <div class="login-page">
    <div class="login-card">
      <h1>登录 PromptHub</h1>
      <p class="hint">
        当前部署尚未完成初始化，请先您创建一个管理员账户，再进入网页开始工作。
      </p>

      <div class="form-item">
        <label for="username">用户名</label>
        <input id="username" v-model="username" type="text" />
      </div>

      <div class="form-item">
        <label for="password">密码</label>
        <input id="password" v-model="password" type="password" />
      </div>

      <button type="button" @click="goHome">登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const username = ref("");
const password = ref("");
const router = useRouter();

const goHome = async () => {
  await router.push("/");
};
</script>
