<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  knowledgeCount?: number
  methodCount?: number
  externalPending?: number
  body?: string
}>()

const headingCount = computed(() => (props.body?.match(/<h[1-6][\s>]/gi) ?? []).length)
const qualityChecks = computed(() => [
  { name: '知识依据', passed: (props.knowledgeCount ?? 0) > 0, issue: '未关联可核实资料' },
  { name: '执行方法', passed: (props.methodCount ?? 0) > 0, issue: '未选择执行方法' },
  { name: '外部信息核对', passed: (props.externalPending ?? 0) === 0, issue: `${props.externalPending ?? 0} 处待确认` },
  { name: '正文结构', passed: headingCount.value > 0, issue: '缺少小标题' },
])
const passedCount = computed(() => qualityChecks.value.filter(check => check.passed).length)
</script>

<template>
  <aside class="tw-review-insights" data-test="review-insights" aria-label="自动检查">
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
.tw-review-insights__score { display:inline-flex; flex:none; align-items:center; padding:2px 8px; border-radius:999px; background:var(--status-warning-background); color:var(--status-warning-foreground); font-size:12px; font-weight:650; line-height:20px; }
.tw-review-insights__checks { display:grid; gap:6px; margin:0; padding:0; list-style:none; }
.tw-review-insights__checks li { display:grid; grid-template-columns:16px minmax(0,1fr) auto; align-items:center; gap:7px; color:var(--text-secondary); font-size:12px; line-height:18px; }
.tw-review-insights__check-icon { display:grid; width:16px; height:16px; place-items:center; border-radius:50%; background:var(--status-success-background,#e8f7ee); color:var(--status-success-foreground,#21834e); font-size:11px; font-weight:700; }
.tw-review-insights__checks li.is-failed { color:var(--status-warning-foreground); }
.tw-review-insights__checks li.is-failed .tw-review-insights__check-icon { background:var(--status-warning-background); }
.tw-review-insights__checks small { color:var(--text-muted); font-size:11px; text-align:right; }
.tw-review-insights__checks li.is-failed small { color:var(--status-warning-foreground); }
</style>
