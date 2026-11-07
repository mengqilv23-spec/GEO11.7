<script setup lang="ts">
import type { ReportRecord } from '../../data/report-center-data'
import { computed } from 'vue'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = withDefaults(defineProps<{
  report: ReportRecord | null
  remaining: number | null
  quotaTotal: number
  quotaReady: boolean
  canGenerate: boolean
  questionCount?: number
  platformCount?: number
}>(), {
  questionCount: 20,
  platformCount: 6,
})

const emit = defineEmits<{
  generate: [context: { scopeLabel: string, questionCount: number, platformCount: number }]
}>()

const marketNames: Record<string, string> = {
  de: '德国',
  jp: '日本',
  ja: '日本',
  us: '美国',
  gb: '英国',
  cn: '中国',
  fr: '法国',
  es: '西班牙',
  it: '意大利',
  ca: '加拿大',
  au: '澳大利亚',
}

const languageNames: Record<string, string> = {
  de: '德语',
  en: '英语',
  ja: '日语',
  jp: '日语',
  zh: '中文',
  fr: '法语',
  es: '西班牙语',
  it: '意大利语',
  ko: '韩语',
  pt: '葡萄牙语',
  ru: '俄语',
}

function formatScopeSummary(value: string | undefined): string {
  const [market = '', language = ''] = (value || '德国/德语')
    .split(/[/·]/, 2)
    .map(part => part.trim())

  const marketLabel = marketNames[market.toLowerCase()] || market
  const languageLabel = languageNames[language.toLowerCase()] || language

  return [marketLabel, languageLabel].filter(Boolean).join(' × ')
}

const scopeLabel = computed(() => formatScopeSummary(props.report?.scopeSummary))
function requestGenerate() {
  emit('generate', {
    scopeLabel: scopeLabel.value,
    questionCount: props.questionCount,
    platformCount: props.platformCount,
  })
}

const quotaExhausted = computed(() => props.quotaReady && props.quotaTotal > 0 && props.remaining === 0)
const quotaLabel = computed(() => {
  if (!props.quotaReady)
    return '额度加载中…'
  if (props.quotaTotal === 0)
    return '本月不限次数'
  if (props.remaining === null)
    return '额度暂不可用'
  if (props.remaining === 0)
    return '本月已无剩余次数'
  return `本月剩余 ${props.remaining} 次`
})
</script>

<template>
  <section class="latest-report" aria-labelledby="latest-report-title">
    <div class="latest-report__top">
      <div class="latest-report__heading">
        <span class="latest-report__icon" aria-hidden="true">✦</span>
        <h2 id="latest-report-title">
          最新报告
        </h2>
        <span class="report-info" role="img" title="汇总当前监测配置与最近一次采样结果" aria-label="最新报告说明"><AppIcon name="help" :size="16" aria-hidden="true" /></span>
      </div>
      <div class="latest-report__actions">
        <button
          class="report-primary-button"
          data-testid="generate-latest"
          type="button"
          :disabled="!canGenerate || remaining === 0"
          :title="canGenerate ? undefined : '额度或监测范围暂不可用'"
          @click="requestGenerate"
        >
          {{ remaining === 0 ? '本月次数已用完' : '生成最新报告' }}
        </button>
        <div class="quota-control" aria-label="本月报告额度">
          <span
            data-testid="quota-count"
            :class="{ 'quota-control__message--exhausted': quotaExhausted }"
            class="quota-control__message"
            role="status"
          >{{ quotaLabel }}</span>
        </div>
      </div>
    </div>
    <div class="latest-report__meta" data-testid="monitoring-scope" aria-label="当前监测范围与配置">
      <strong>{{ scopeLabel }}</strong>
      <span>{{ questionCount }} 条问题</span>
      <span>{{ platformCount }} 个 AI 平台</span>
    </div>
  </section>
</template>

<style scoped>
.latest-report { position: relative; display: grid; min-width: 0; gap: 14px; overflow: hidden; padding: 16px 24px 18px; border: 1px solid color-mix(in srgb, var(--action-accent) 28%, var(--border-default)); border-radius: 16px; background: radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--action-accent) 9%, transparent) 0%, transparent 52%), linear-gradient(115deg, color-mix(in srgb, var(--action-accent) 2%, var(--background-primary)) 0%, var(--background-primary) 42%); box-shadow: 0 10px 28px color-mix(in srgb, var(--action-accent) 7%, transparent), inset 0 1px 0 color-mix(in srgb, white 80%, transparent); }
.latest-report::before { position: absolute; top: 0; left: 24px; width: 76px; height: 3px; border-radius: 0 0 3px 3px; background: linear-gradient(90deg, var(--action-accent), color-mix(in srgb, var(--action-accent) 28%, transparent)); content: ''; }
.latest-report__top { position: relative; display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 14px; border-bottom: 1px solid color-mix(in srgb, var(--action-accent) 12%, var(--border-divider)); }
.latest-report__heading { display: flex; align-items: center; gap: 12px; }
.latest-report__icon { display: grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg, color-mix(in srgb, var(--action-accent) 78%, #9d8cff), var(--action-accent)); box-shadow: 0 7px 16px color-mix(in srgb, var(--action-accent) 24%, transparent); font-size: 23px; line-height: 1; }
.latest-report__heading h2 { margin: 0; color: var(--text-primary); font-size: 16px; line-height: 24px; font-weight: 600; }
.report-info { display: inline-grid; width: 16px; height: 16px; place-items: center; color: var(--text-muted); }
.latest-report__meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; margin-top: 0; color: var(--text-secondary); font-size: 14px; line-height: 22px; }
.latest-report__meta > * { min-width: 0; padding: 2px 14px; }
.latest-report__meta > * + * { border-left: 1px solid var(--border-divider); }
.latest-report__meta > :first-child { padding-left: 0; }
.latest-report__meta strong { color: var(--text-primary); font-weight: 600; }
.latest-report__actions { display: flex; flex: 0 0 auto; align-items: center; gap: 16px; }
.report-primary-button { min-height: 36px; padding: 0 12px; border: 1px solid var(--action-accent); border-radius: var(--radius-control); color: var(--text-on-accent, #fff); background: var(--action-accent); font: inherit; font-size: 14px; line-height: 22px; font-weight: 600; cursor: pointer; transition: background-color var(--motion-fast), border-color var(--motion-fast); }
.report-primary-button:hover:not(:disabled) { background: var(--action-primary-hover, var(--action-accent)); border-color: var(--action-primary-hover, var(--action-accent)); }
.report-primary-button:disabled { cursor: not-allowed; opacity: 0.58; }
.quota-control { display: flex; align-items: center; gap: 12px; white-space: nowrap; color: var(--text-secondary); font-size: 13px; line-height: 20px; }
.quota-control__message { color: var(--text-secondary); }
.quota-control__message--exhausted { color: var(--status-error-foreground, #b91c1c); font-weight: 600; }
.report-primary-button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
@media (max-width: 880px) { .latest-report__top { align-items: flex-start; flex-direction: column; } .latest-report__actions { width: 100%; justify-content: space-between; } }
@media (max-width: 560px) { .latest-report { padding: 16px; } .latest-report::before { left: 16px; } .latest-report__top { gap: 12px; padding-bottom: 12px; } .latest-report__meta { grid-template-columns: 1fr; gap: 8px; } .latest-report__meta > * { padding: 0; } .latest-report__meta > * + * { border-left: 0; } .latest-report__actions { align-items: flex-start; flex-direction: column; } .report-primary-button { width: 100%; } }
</style>

