<script setup lang="ts">
import type { MonitoringSchedule, RoundDetail } from '../../../api/monitoring'
import type { CumulativeSamplingSummary } from '../../../composables/use-monitoring-round'
import MetricDefinitionButton from '../../overview/MetricDefinitionButton.vue'
import { Button } from '../../ui/ce'
import Spinner from '../../ui/ce/spinner/Spinner.vue'

defineProps<{
  schedule: MonitoringSchedule | null
  round: RoundDetail | null
  cumulative: CumulativeSamplingSummary | null
  questionCount: number
  platformCount: number
  loading: boolean
  error: string
}>()

const emit = defineEmits<{ editSettings: [] }>()

function scheduleLabel(schedule: MonitoringSchedule | null) {
  if (!schedule)
    return '尚未配置'
  const frequency: Record<MonitoringSchedule['scheduleType'], string> = { daily: '每天', weekly: '每周', monthly: '每月' }
  return `${frequency[schedule.scheduleType]} · 重复采集 ${schedule.repeatCount} 次`
}

function measurementTier(round: RoundDetail | null) {
  if (round?.measurementTier === 'decision') {
    return { label: '决策级', reason: '满足决策级采样覆盖、稳定性与数据校验要求。' }
  }
  return { label: '趋势级', reason: '适合观察品牌趋势与竞品变化；重大决策建议结合多轮数据判断。' }
}
function validRate(cumulative: CumulativeSamplingSummary | null) {
  return cumulative?.plannedCount ? (cumulative.validCount / cumulative.plannedCount * 100).toFixed(1) : '—'
}
function samplePeriod(cumulative: CumulativeSamplingSummary | null) {
  if (!cumulative?.complete || !cumulative.periodStart || !cumulative.periodEnd)
    return '累计周期暂不可用'
  return cumulative.periodStart === cumulative.periodEnd ? cumulative.periodStart : `${cumulative.periodStart} 至 ${cumulative.periodEnd}`
}
</script>

<template>
  <section class="sampling-summary" aria-labelledby="sampling-summary-title">
    <header class="sampling-summary__header">
      <div>
        <h2 id="sampling-summary-title">
          采样执行
        </h2><p>调度与质量指标均以当前市场的服务端计划和最近一轮结果为准。</p>
      </div>
      <Button variant="outline" :disabled="loading" @click="emit('editSettings')">
        调整采集频率与平台
      </Button>
    </header>
    <p v-if="error" class="sampling-summary__error" role="alert">
      采样数据加载失败：{{ error }}
    </p>
    <p v-else-if="loading" class="sampling-summary__state sampling-summary__state--loading" role="status">
      <Spinner variant="ring" aria-hidden="true" /> 加载中…
    </p>
    <template v-else>
      <div class="sampling-summary__schedule">
        <span>当前服务端计划 <MetricDefinitionButton id="samplingPlan" /></span><strong>{{ scheduleLabel(schedule) }}</strong><small>{{ schedule?.timezone ?? '时区未返回' }} · 已启用：{{ schedule ? (schedule.enabled === 1 ? '是' : '否') : '否' }}</small>
      </div>
      <div v-if="round" class="sampling-summary__metrics">
        <article><span>最近轮次 <MetricDefinitionButton id="latestRound" /></span><strong>第 {{ round.roundNo }} 轮 · {{ round.monitorDate }}</strong><small>最近一次执行结果</small></article>
        <article class="sampling-summary__cumulative">
          <span>当前问题集累计执行 <MetricDefinitionButton id="cumulativeExecutions" /></span><strong>{{ cumulative?.complete ? cumulative.executedCount.toLocaleString() : '暂不可用' }} 次</strong><small>{{ samplePeriod(cumulative) }} · 累计 {{ cumulative?.roundCount ?? 0 }} 轮</small>
        </article>
        <article><span>累计有效回答 <MetricDefinitionButton id="cumulativeValidAnswers" /></span><strong>{{ cumulative?.complete ? cumulative.validCount.toLocaleString() : '暂不可用' }} 条</strong><small>有效回答率 <MetricDefinitionButton id="validAnswerRate" /> {{ cumulative?.complete ? `${validRate(cumulative)}%` : '—' }}</small></article>
        <article><span>覆盖范围 <MetricDefinitionButton id="samplingCoverage" /></span><strong>{{ questionCount }} 个问题 · {{ platformCount }} 个平台</strong><small>当前配置的问题集与 AI 平台</small></article>
        <article class="sampling-summary__credibility">
          <span>测量等级 <MetricDefinitionButton id="measurementTier" /></span><strong>{{ measurementTier(round).label }}</strong><small>{{ measurementTier(round).reason }}</small>
        </article>
      </div>
      <p v-else class="sampling-summary__state">
        当前市场暂无监测轮次，完成首轮采集后将显示实际样本质量。
      </p>
    </template>
  </section>
</template>

<style scoped>
.sampling-summary { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--border-default); border-radius: 16px; background: var(--background-primary); color: var(--text-primary); }
.sampling-summary__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.sampling-summary__header h2 { margin: 0; font-size: 18px; }
.sampling-summary__header p { margin: 6px 0 0; color: var(--text-muted); font-size: 13px; }
.sampling-summary__schedule,.sampling-summary__metrics article { display: grid; gap: 6px; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-subtle); }
.sampling-summary__schedule span,.sampling-summary__metrics article span { color: var(--text-muted); font-size: 12px; }
.sampling-summary__schedule strong,.sampling-summary__metrics article strong { font-size: 16px; line-height: 1.45; }
.sampling-summary__schedule small,.sampling-summary__metrics article small { color: var(--text-muted); }
.sampling-summary__metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.sampling-summary__credibility small { max-width: 56ch; line-height: 1.5; }
.sampling-summary__hint { display: inline-flex; margin-left: 3px; color: var(--text-muted); cursor: help; }
.sampling-summary__state,.sampling-summary__error { margin: 0; padding: 14px 16px; border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); }
.sampling-summary__state--loading { display: flex; align-items: center; justify-content: center; gap: 8px; --spinner-color: var(--action-accent); }
.sampling-summary__error { color: var(--status-error-foreground); background: var(--status-error-background); }
@media (max-width: 620px) { .sampling-summary { padding: 16px; } .sampling-summary__header { flex-direction: column; } }
</style>

