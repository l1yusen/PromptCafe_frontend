<template>
  <div class="embedded-prompt-subpage">
    <div class="detail-scroll">
      <main class="detail-pane compare-embed-pane">
        <div class="subpage-topbar">
          <h2 class="subpage-heading">版本对比</h2>
          <button type="button" class="text-btn" @click="goVersions">← 返回</button>
        </div>

        <p v-if="promptTitle" class="compare-prompt-title">{{ promptTitle }}</p>
        <p v-if="pairLabel" class="meta muted compare-pair">{{ pairLabel }}</p>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <div v-if="loading" class="muted compare-loading">加载对比…</div>

        <div v-else-if="diffData" class="compare-diff-body">
          <section class="diff-block">
            <h4 class="diff-block-title">标题</h4>
            <div class="diff-cols">
              <textarea
                readonly
                class="compare-readonly-ta"
                rows="2"
                :class="{ 'compare-field-diff': titleChanged }"
                :value="diffData.fromVersion.title"
              />
              <textarea
                readonly
                class="compare-readonly-ta"
                rows="2"
                :class="{ 'compare-field-diff': titleChanged }"
                :value="diffData.toVersion.title"
              />
            </div>
          </section>

          <section class="diff-block">
            <h4 class="diff-block-title">简介</h4>
            <div class="diff-cols">
              <textarea
                readonly
                class="compare-readonly-ta compare-readonly-tall"
                rows="5"
                :class="{ 'compare-field-diff': descChanged }"
                :value="descFromLeft"
              />
              <textarea
                readonly
                class="compare-readonly-ta compare-readonly-tall"
                rows="5"
                :class="{ 'compare-field-diff': descChanged }"
                :value="descFromRight"
              />
            </div>
          </section>

          <section class="diff-block">
            <h4 class="diff-block-title">系统提示词</h4>
            <div class="diff-cols">
              <div class="diff-textbox diff-textbox-code">
                <div
                  v-for="(line, i) in systemDiffRows"
                  :key="'sl-' + i"
                  class="diff-line pre"
                  :class="diffLineClass(line, 'left')"
                >
                  {{ line.left || " " }}
                </div>
              </div>
              <div class="diff-textbox diff-textbox-code">
                <div
                  v-for="(line, i) in systemDiffRows"
                  :key="'sr-' + i"
                  class="diff-line pre"
                  :class="diffLineClass(line, 'right')"
                >
                  {{ line.right || " " }}
                </div>
              </div>
            </div>
          </section>

          <section class="diff-block">
            <h4 class="diff-block-title">用户提示词</h4>
            <div class="diff-cols">
              <div class="diff-textbox diff-textbox-code">
                <div
                  v-for="(line, i) in userDiffRows"
                  :key="'ul-' + i"
                  class="diff-line pre"
                  :class="diffLineClass(line, 'left')"
                >
                  {{ line.left || " " }}
                </div>
              </div>
              <div class="diff-textbox diff-textbox-code">
                <div
                  v-for="(line, i) in userDiffRows"
                  :key="'ur-' + i"
                  class="diff-line pre"
                  :class="diffLineClass(line, 'right')"
                >
                  {{ line.right || " " }}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "../api/prompts";
import { ApiError } from "../api/http";
import type { PromptVersionDiffData } from "../api/types";
import { alignTextByLines } from "../util/lineDiff";
import { diffLineClass } from "../util/promptVersionDiffDisplay";

const route = useRoute();
const router = useRouter();

const promptId = computed(() => String(route.params.id ?? "").trim());
const fromVN = computed(() => parseInt(String(route.query.from ?? ""), 10));
const toVN = computed(() => parseInt(String(route.query.to ?? ""), 10));

const promptTitle = ref("");
const diffData = ref<PromptVersionDiffData | null>(null);
const loading = ref(false);
const errorMsg = ref("");

const pairLabel = computed(() => {
  if (!diffData.value) return "";
  const a = diffData.value.fromVersion.versionNumber;
  const b = diffData.value.toVersion.versionNumber;
  return `v${a} ↔ v${b}`;
});

const titleChanged = computed(() => {
  const d = diffData.value;
  if (!d) return false;
  return (d.fromVersion.title ?? "") !== (d.toVersion.title ?? "");
});

const descChanged = computed(() => {
  const d = diffData.value;
  if (!d) return false;
  return normDesc(d.fromVersion.description) !== normDesc(d.toVersion.description);
});

function normDesc(v: string | null | undefined) {
  return (v ?? "").trim();
}

const descFromLeft = computed(() => diffData.value?.fromVersion.description ?? "");
const descFromRight = computed(() => diffData.value?.toVersion.description ?? "");

const systemDiffRows = computed(() => {
  const d = diffData.value;
  if (!d) return [];
  return alignTextByLines(d.fromVersion.systemPrompt ?? "", d.toVersion.systemPrompt ?? "");
});

const userDiffRows = computed(() => {
  const d = diffData.value;
  if (!d) return [];
  return alignTextByLines(d.fromVersion.userPrompt ?? "", d.toVersion.userPrompt ?? "");
});

function goVersions() {
  const id = promptId.value;
  if (id) router.push({ name: "prompt-versions", params: { id } });
  else router.push({ name: "home-main" });
}

async function loadPromptTitle() {
  const id = promptId.value;
  if (!id) return;
  try {
    const d = await api.getPrompt(id);
    promptTitle.value = d.title;
  } catch {
    promptTitle.value = "";
  }
}

async function loadDiff() {
  const id = promptId.value;
  const from = fromVN.value;
  const to = toVN.value;
  errorMsg.value = "";
  diffData.value = null;
  if (!id) {
    errorMsg.value = "无效的 Prompt ID";
    return;
  }
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    errorMsg.value = "请从「历史版本」页勾选两个版本后进入对比（缺少 from / to 版本号）。";
    return;
  }
  loading.value = true;
  try {
    diffData.value = await api.diffPromptVersions(id, from, to);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
  await loadPromptTitle();
  await loadDiff();
}

onMounted(() => {
  loadAll();
});

watch([promptId, () => route.query.from, () => route.query.to], () => {
  loadAll();
});
</script>

<style scoped>
.embedded-prompt-subpage {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.compare-embed-pane {
  max-width: 1000px;
}
.subpage-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.subpage-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}
.compare-prompt-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}
.compare-pair {
  margin: 0 0 16px;
  font-size: 13px;
}
.compare-loading {
  padding: 20px 0;
  font-size: 13px;
}
.compare-diff-body {
  padding-top: 4px;
}
.diff-block {
  margin-bottom: 20px;
}
.diff-block-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}
.diff-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.compare-readonly-ta {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 44px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.45;
  font-family: inherit;
  color: #374151;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fff;
}
.compare-readonly-ta:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.2);
}
.compare-readonly-tall {
  min-height: 120px;
}
.compare-field-diff {
  border-color: #f59e0b;
  background: #fffbeb;
}
.diff-textbox {
  min-width: 0;
  border: 1px solid #e2e6f0;
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
  box-sizing: border-box;
}
.diff-textbox-tall {
  max-height: min(200px, 28vh);
  overflow: auto;
}
.diff-textbox-code {
  max-height: min(360px, 42vh);
  overflow: auto;
  background: #fafbfe;
}
.diff-line {
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.diff-line.diff-removed {
  background: #fee2e2;
}
.diff-line.diff-added {
  background: #dcfce7;
}
.diff-line.diff-changed {
  background: #fef9c3;
}
.diff-line.diff-blank {
  background: #f8fafc;
  color: #94a3b8;
}
.meta {
  color: #6b7280;
}
.muted {
  color: #9099ab;
}
@media (max-width: 900px) {
  .diff-cols {
    grid-template-columns: 1fr;
  }
}
</style>
