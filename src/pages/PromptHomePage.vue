<template>
  <div class="prompt-page">
    <aside class="left-nav">
      <div class="brand">Prompts</div>
      <nav>
        <button class="nav-item active">我的Prompt</button>
        <button class="nav-item">社区</button>
        <button class="nav-item">公告</button>
      </nav>
      <div class="nav-bottom">设置</div>
    </aside>

    <section class="main-shell">
      <header class="top-bar">
        <div class="title">PromptHub 网页版</div>
        <div class="top-actions">
          <button class="text-btn">新建</button>
          <button class="text-btn">导出</button>
          <button class="text-btn" @click="goLogin">退出登录</button>
        </div>
      </header>

      <div class="workspace">
        <aside class="folder-pane">
          <div class="pane-title">我的 Prompt</div>
          <div class="pane-tab active">文本</div>
          <div class="pane-tab">收藏</div>
        </aside>

        <aside class="list-pane">
          <div class="list-header">共 1 个</div>
          <div class="list-item active">1111</div>
        </aside>

        <main class="detail-pane">
          <h2>1111</h2>
          <p class="meta">2026/5/11 22:37:27 · v3</p>

          <div class="field">
            <div class="label">系统提示词</div>
            <div class="value">算法二分</div>
          </div>

          <div class="field">
            <div class="label">用户提示词</div>
            <div class="value">啊啊啊小范文发这问鹅鹅(aiaa)fefatw</div>
          </div>

          <footer class="bottom-actions">
            <button class="primary ghost">复制 Prompt</button>
            <button class="primary">AI 测试</button>
            <button class="light">历史版本</button>
            <button class="danger">删除</button>
          </footer>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
const goLogin = async () => {
  await router.push("/login");
};
</script>
