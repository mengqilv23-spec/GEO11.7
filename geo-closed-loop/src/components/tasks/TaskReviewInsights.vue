<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  knowledgeCount?: number
  methodCount?: number
  externalPending?: number
  body?: string
}>()

function plainText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const paragraphs = computed(() => {
  const body = props.body ?? ''
  return body
    .split(/<\/(?:p|h[1-6]|li)>/i)
    .map(plainText)
    .filter(Boolean)
})
const longParagraphs = computed(() => paragraphs.value.filter(paragraph => paragraph.length > 180))
const headingCount = computed(() => (props.body?.match(/<h[1-6][\s>]/gi) ?? []).length)
const qualityChecks = computed(() => [
  { name: '知识依据', passed: (props.knowledgeCount ?? 0) > 0, issue: '未关联可核实资料' },
  { name: '执行方法', passed: (props.methodCount ?? 0) > 0, issue: '未选择执行方法' },
  { name: '外部信息核对', passed: (props.externalPending ?? 0) === 0, issue: `${props.externalPending ?? 0} 处待确认` },
  { name: '正文结构', passed: headingCount.value > 0, issue: '缺少小标题' },
])
const passedCount = computed(() => qualityChecks.value.filter(check => check.passed).length)
const issueCount = computed(() => qualityChecks.value.filter(check => !check.passed).length + (longParagraphs.value.length ? 1 : 0))
</script>

<template>
  <aside class="tw-review-insights" data-test="review-insights" aria-label="段落问题与自动检查">
    <section class="tw-review-insights__card" aria-labelledby="tw-review-issues-title">
      <header class="tw-review-insights__head">
        <h3 id="tw-review-issues-title">
          段落问题
        </h3>
        <span class="tw-review-insights__count">{{ issueCount }}</span>
      </header>
      <div v-if="longParagraphs.length" class="tw-review-insights__issue">
        <strong>结构与可读性</strong>
        <span>{{ longParagraphs.length }} 个长段落建议人工确认</span>
      </div>
      <p v-else-if="issueCount === 0" class="tw-review-insights__issue is-clear">
        未发现需要人工确认的段落。
      </p>
      <p v-else class="tw-review-insights__issue">
        请先补齐下方未通过的检查项。
      </p>
    </section>

    <section class="tw-review-insights__card" aria-labelledby="tw-review-quality-title">
      <header class="tw-review-insights__head">
        <h3 id="tw-review-quality-title">
          自动检查
        </h3>
        <span class="tw-review-insights__score">{{ passedCount }}/{{ qualityChecks.length }} 通过</span>
      </header>
      <ul class="tw-review-insights__checks" aria-label="自动检查维度">
        <li v-for="check in qualityChecks" :key="check.name" :class="{ 'is-failed': !check.passed }">
          <span class="tw-review-insights__check-icon" aria-hidden="true">{{ check.passed ? '✓' : '!' }}</span>
          <span>{{ check.name }}</span>
          <small>{{ check.passed ? '通过' : check.issue }}</small>
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.tw-review-insights { display:grid; align-content:start; gap:16px; min-width:0; }
.tw-review-insights__card { display:grid; gap:14px; padding:16px; border:1px solid var(--border-default); border-radius:12px; background:var(--background-primary); }
.tw-review-insights__head { display:flex; min-width:0; align-items:center; gap:8px; }
.tw-review-insights__head h3 { margin:0; color:var(--text-primary); font-size:16px; font-weight:650; line-height:24px; }
.tw-review-insights__count,.tw-review-insights__score { display:inline-flex; flex:none; align-items:center; padding:2px 8px; border-radius:999px; background:var(--status-warning-background); color:var(--status-warning-foreground); font-size:12px; font-weight:650; line-height:20px; }
.tw-review-insights__issue { display:grid; gap:6px; margin:0; padding:12px; border:1px solid var(--status-warning-border); border-radius:9px; background:color-mix(in srgb,var(--status-warning-background) 46%,var(--background-primary)); color:var(--text-secondary); font-size:14px; line-height:21px; }
.tw-review-insights__issue strong { color:var(--status-warning-foreground); font-size:13px; }
.tw-review-insights__issue.is-clear { border-color:var(--status-success-border); background:var(--status-success-background); }
.tw-review-insights__checks { display:grid; gap:6px; margin:0; padding:0; list-style:none; }
.tw-review-insights__checks li { display:grid; grid-template-columns:16px minmax(0,1fr) auto; align-items:center; gap:7px; color:var(--text-secondary); font-size:12px; line-height:18px; }
.tw-review-insights__check-icon { display:grid; width:16px; height:16px; place-items:center; border-radius:50%; background:var(--status-success-background,#e8f7ee); color:var(--status-success-foreground,#21834e); font-size:11px; font-weight:700; }
.tw-review-insights__checks li.is-failed { color:var(--status-warning-foreground); }
.tw-review-insights__checks li.is-failed .tw-review-insights__check-icon { background:var(--status-warning-background); }
.tw-review-insights__checks small { color:var(--text-muted); font-size:11px; text-align:right; }
.tw-review-insights__checks li.is-failed small { color:var(--status-warning-foreground); }
</style>
