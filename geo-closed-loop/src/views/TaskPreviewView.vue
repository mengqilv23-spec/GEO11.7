<script setup lang="ts">
import type { GeoTask } from '../data/geo-data'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import { ensureWorkflow } from '../workflows/task-workflow'

const route = useRoute()
const taskId = String(route.params.taskId || '')
const taskStore = useWorkbenchTasksStore()

function storedTask(): GeoTask | undefined {
  if (typeof window === 'undefined') return undefined
  for (const mode of ['managed', 'agent']) {
    try {
      const snapshot = JSON.parse(window.localStorage.getItem(`geo-workbench:${mode}`) || '{}') as { tasks?: GeoTask[] }
      const match = snapshot.tasks?.find(item => item.id === taskId)
      if (match) {
        if (match.workflow)
          ensureWorkflow(match)
        return match
      }
    }
    catch { /* Fall back to the in-memory task. */ }
  }
}

const task = computed(() => taskStore.findTask(taskId) ?? storedTask())
const title = computed(() => task.value?.workflow?.output.title || task.value?.name || '发布内容预览')
const body = computed(() => task.value?.workflow?.output.body || '')
const version = computed(() => task.value?.workflow?.output.revision ?? 1)

const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'SVG', 'MATH'])
const ALLOWED_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'BLOCKQUOTE', 'BR', 'SPAN', 'A'])

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function previewMarkup(value: string) {
  if (!value)
    return ''
  if (/<(?:p|h[1-6]|ul|ol|blockquote|div)\b/i.test(value))
    return value
  return value.split('\n').map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('')
}

function sanitizePreviewHtml(value: string) {
  if (!value)
    return ''
  const document = new DOMParser().parseFromString(previewMarkup(value), 'text/html')
  for (const node of [...document.body.querySelectorAll('*')]) {
    if (!node.isConnected)
      continue
    if (DROP_TAGS.has(node.tagName)) {
      node.remove()
      continue
    }
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes)
      continue
    }
    for (const attribute of [...node.attributes]) {
      const keepLink = node.tagName === 'A' && attribute.name === 'href' && /^https?:\/\//i.test(attribute.value)
      if (!keepLink)
        node.removeAttribute(attribute.name)
    }
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }
  return document.body.innerHTML
}

const previewHtml = computed(() => sanitizePreviewHtml(body.value))
</script>

<template>
  <div class="task-preview-page">
    <header class="task-preview-bar">
      <div><strong>APW Waterjet</strong><span>发布内容预览 · {{ taskId }} · V{{ version }}</span></div>
      <button type="button" @click="$router.back()">关闭预览</button>
    </header>
    <main v-if="task" class="task-preview-document">
      <span class="task-preview-badge">预览环境 · 尚未发布</span>
      <h1>{{ title }}</h1>
      <p class="task-preview-meta">此链接用于客户核对官网即将发布的内容，确认发布前不会影响线上内容。</p>
      <article v-if="previewHtml" class="task-preview-article" v-html="previewHtml" />
      <p v-else class="task-preview-empty">预览内容尚未生成。</p>
    </main>
    <main v-else class="task-preview-document"><h1>预览内容不可用</h1><p>请返回任务详情，等待官网重新生成预览链接。</p></main>
  </div>
</template>

<style scoped>
.task-preview-page { min-height:100vh; background:#f5f7fb; color:#1d2433; font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif; }
.task-preview-bar { display:flex; min-height:64px; align-items:center; justify-content:space-between; gap:20px; padding:0 32px; border-bottom:1px solid #e2e6ee; background:#fff; }
.task-preview-bar div { display:flex; align-items:baseline; gap:14px; }
.task-preview-bar strong { font-size:18px; }
.task-preview-bar span { color:#7b879b; font-size:13px; }
.task-preview-bar button { padding:8px 14px; border:1px solid #d8deea; border-radius:8px; background:#fff; color:#4053ff; font:inherit; cursor:pointer; }
.task-preview-document { box-sizing:border-box; width:min(920px,calc(100% - 32px)); margin:32px auto; padding:48px 56px 64px; border:1px solid #e1e6ef; border-radius:14px; background:#fff; box-shadow:0 10px 34px rgb(35 48 83 / 7%); }
.task-preview-badge { display:inline-flex; padding:5px 9px; border-radius:6px; background:#eef1ff; color:#4053ff; font-size:12px; font-weight:650; }
h1 { margin:20px 0 10px; font-size:34px; line-height:1.35; }
.task-preview-meta { margin:0 0 34px; padding-bottom:24px; border-bottom:1px solid #e6eaf1; color:#7b879b; font-size:14px; }
.task-preview-article { color:#384457; font-size:16px; line-height:1.9; overflow-wrap:anywhere; }
.task-preview-article :deep(h1),.task-preview-article :deep(h2),.task-preview-article :deep(h3),.task-preview-article :deep(h4) { margin:32px 0 12px; color:#1d2433; line-height:1.45; }
.task-preview-article :deep(h1:first-child),.task-preview-article :deep(h2:first-child),.task-preview-article :deep(h3:first-child) { margin-top:0; }
.task-preview-article :deep(h2) { font-size:22px; }
.task-preview-article :deep(h3) { font-size:18px; }
.task-preview-article :deep(p) { margin:0 0 20px; white-space:pre-wrap; }
.task-preview-article :deep(ul),.task-preview-article :deep(ol) { margin:0 0 20px; padding-left:24px; }
.task-preview-article :deep(li) { margin:6px 0; }
.task-preview-article :deep(li p) { margin:0; }
.task-preview-article :deep(blockquote) { margin:0 0 20px; padding:8px 16px; border-left:3px solid #cbd3e3; color:#5c697e; }
.task-preview-article :deep(a) { color:#4053ff; }
.task-preview-empty { color:#7b879b; font-size:16px; }
@media(max-width:640px) { .task-preview-bar { padding:0 16px; }.task-preview-bar div { display:grid; gap:1px; }.task-preview-document { margin:16px auto; padding:28px 22px 40px; }h1 { font-size:26px; } }
</style>
