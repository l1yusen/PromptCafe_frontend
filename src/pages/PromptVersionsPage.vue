<template>
  <div class="embedded-prompt-subpage">
    <div class="detail-scroll">
      <main class="detail-pane version-embed-pane">
        <div class="subpage-topbar">
          <h2 class="subpage-heading">历史版本</h2>
          <div class="subpage-topbar-actions">
            <button type="button" class="text-btn" :disabled="loading" @click="loadAll">刷新</button>
            <button type="button" class="text-btn" @click="goBack">← 返回</button>
          </div>
        </div>

        <p v-if="promptTitle" class="version-prompt-title">{{ promptTitle }}</p>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="version-toolbar">
          <button
            type="button"
            class="text-btn sm primary-inline"
            :disabled="comparePick.length !== 2 || loading"
            @click="goCompare"
          >
            打开版本对比
          </button>
          <span class="muted version-hint">勾选两个版本号后，进入左右对比页。</span>
        </div>

        <div class="manual-snap-row">
          <input
            v-model="manualNoteDraft"
            class="manual-note-input"
            type="text"
            maxlength="200"
            placeholder="手动快照备注（可选）"
            :disabled="loading || manualSaving"
          />
          <button type="button" class="text-btn sm" :disabled="loading || manualSaving" @click="runManualSnapshot">
            手动保存版本
          </button>
        </div>

        <div v-if="loading" class="muted version-loading">加载中…</div>
        <div v-else-if="!rows.length" class="muted version-empty">暂无版本记录</div>
        <div v-else class="version-table-wrap">
          <table class="version-table">
            <thead>
              <tr>
                <th class="col-check" />
                <th>版本</th>
                <th>时间</th>
                <th>备注</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td class="col-check">
                  <input
                    type="checkbox"
                    :checked="comparePick.includes(row.versionNumber)"
                    @change="onCompareCheck(row.versionNumber, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td>v{{ row.versionNumber }}</td>
                <td class="muted td-time">{{ formatTime(row.createdAt) }}</td>
                <td class="td-note">{{ row.note?.trim() || "—" }}</td>
                <td class="col-actions">
                  <button type="button" class="text-btn sm" @click="runRollback(row)">回溯</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "../api/prompts";
import { ApiError } from "../api/http";
import type { PromptVersionRecord } from "../api/types";

const route = useRoute();
const router = useRouter();

const promptHubToast = inject<(message: string, durationMs?: number) => void>("promptHubToast", () => {});

const promptId = computed(() => String(route.params.id ?? "").trim());

const promptTitle = ref("");
const rows = ref<PromptVersionRecord[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const comparePick = ref<number[]>([]);
const manualNoteDraft = ref("");
const manualSaving = ref(false);

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

function showToast(message: string) {
  promptHubToast(message, 2400);
}

function goBack() {
  const id = promptId.value;
  if (id) void router.push({ name: "home-main", query: { prompt: id } });
  else void router.push({ name: "home-main" });
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

async function loadVersions() {
  const id = promptId.value;
  if (!id) {
    errorMsg.value = "无效的 Prompt ID";
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    rows.value = await api.listPromptVersions(id);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
  await loadPromptTitle();
  await loadVersions();
}

function onCompareCheck(versionNumber: number, checked: boolean) {
  if (checked) {
    if (comparePick.value.includes(versionNumber)) return;
    if (comparePick.value.length >= 2) {
      comparePick.value = [comparePick.value[1]!, versionNumber];
    } else {
      comparePick.value = [...comparePick.value, versionNumber];
    }
  } else {
    comparePick.value = comparePick.value.filter((x) => x !== versionNumber);
  }
}

function goCompare() {
  const id = promptId.value;
  if (!id || comparePick.value.length !== 2) return;
  const [a, b] = comparePick.value;
  router.push({
    name: "prompt-versions-compare",
    params: { id },
    query: { from: String(a), to: String(b) }
  });
}

async function runRollback(row: PromptVersionRecord) {
  const id = promptId.value;
  if (!id) return;
  if (!confirm(`将当前 Prompt 回溯到 v${row.versionNumber} 的内容？会生成新版本号。`)) return;
  errorMsg.value = "";
  try {
    await api.rollbackPromptVersion(id, row.id);
    showToast("已回溯");
    await loadAll();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  }
}

async function runManualSnapshot() {
  const id = promptId.value;
  if (!id) return;
  manualSaving.value = true;
  errorMsg.value = "";
  try {
    const note = manualNoteDraft.value.trim();
    await api.createManualPromptVersion(id, note ? { note } : undefined);
    showToast("已保存版本快照");
    manualNoteDraft.value = "";
    await loadAll();
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : String(e);
  } finally {
    manualSaving.value = false;
  }
}

onMounted(() => {
  loadAll();
});

watch(promptId, () => {
  comparePick.value = [];
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
.version-embed-pane {
  max-width: 960px;
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
.subpage-topbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}
.version-prompt-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}
.version-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.version-hint {
  font-size: 12px;
}
.manual-snap-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
.manual-note-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  background: #fff;
}
.manual-note-input:focus {
  outline: none;
  border-color: #93b4f7;
  box-shadow: 0 0 0 2px rgba(147, 180, 247, 0.2);
}
.version-loading,
.version-empty {
  padding: 16px 0;
  font-size: 13px;
}
.version-table-wrap {
  overflow: auto;
  border: 1px solid #e7e9f0;
  border-radius: 10px;
}
.version-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.version-table th,
.version-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #f0f2f7;
  vertical-align: top;
}
.version-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  font-size: 12px;
}
.version-table tr:last-child td {
  border-bottom: none;
}
.col-check {
  width: 36px;
  text-align: center;
}
.col-actions {
  width: 72px;
  white-space: nowrap;
}
.td-time {
  white-space: nowrap;
  font-size: 12px;
}
.td-note {
  max-width: 280px;
  word-break: break-word;
}
.muted {
  color: #9099ab;
}
.primary-inline {
  border-color: #2f67ea !important;
  color: #2f67ea !important;
  font-weight: 600;
}
</style>
