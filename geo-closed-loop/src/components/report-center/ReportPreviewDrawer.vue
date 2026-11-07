<script setup lang="ts">
import type { ReportRecord } from '../../data/report-center-data'
import { computed } from 'vue'
import { visibilityMonitoringData } from '../../data/visibility-monitoring-data'
import Drawer from '../ui/ce/drawer/Drawer.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = defineProps<{ report: ReportRecord | null, open: boolean }>()
const emit = defineEmits<{ close: [], selectQuestion: [questionId: string] }>()

const questions = computed(() => {
  const ids = props.report?.questionIds ?? []
  return ids.map(id => visibilityMonitoringData.questions.find(question => question.id === id)).filter(question => question != null)
})
const statusLabel = computed(() => props.report?.status === 'generated' ? '已生成快照' : '结构预览 · 尚未生成正式报告')

function close() {
  emit('close')
}
</script>

<template>
  <Drawer
    :open="open"
    :title="report?.title ?? '报告预览'"
    eyebrow="报告详情"
    :description="report ? `${report.date} · ${report.period}` : undefined"
    :size="980"
    close-label="关闭报告预览"
    class="report-preview-drawer"
    @close="close"
    @update:open="value => !value && close()"
  >
    <div v-if="report" class="report-preview">
      <section class="report-preview__hero">
        <div class="report-preview__hero-copy">
          <span class="report-preview__eyebrow">{{ report.type === 'weekly' ? '周期监测' : report.type === 'monthly' ? '月度复盘' : '季度汇报' }}</span>
          <h3>{{ report.summary }}</h3>
          <p>范围：{{ report.period }} <span aria-hidden="true">·</span> {{ visibilityMonitoringData.overview.brand }} <span aria-hidden="true">·</span> {{ visibilityMonitoringData.overview.market }} · {{ visibilityMonitoringData.overview.language }}</p>
        </div>
        <span class="report-preview__status" :class="report.status === 'generated' ? 'is-generated' : 'is-outline'">
          <AppIcon :name="report.status === 'generated' ? 'check' : 'clock'" :size="14" aria-hidden="true" />{{ statusLabel }}
        </span>
      </section>

      <section class="report-preview__section report-preview__overview">
        <div class="report-preview__section-heading">
          <div><span class="report-preview__overline">OVERVIEW</span><h3>报告概览</h3></div>
          <span class="report-preview__muted">基于当前监测配置与演示快照</span>
        </div>
        <div class="report-preview__stats">
          <article><span>当前监测问题</span><strong>{{ visibilityMonitoringData.overview.questionCount }} 条</strong><small>完整监测问题集</small></article>
          <article><span>AI 平台</span><strong>{{ visibilityMonitoringData.overview.platformCount }} 个</strong><small>当前监测配置</small></article>
          <article><span>报告章节</span><strong>{{ report.sections.length }} 项</strong><small>结论与证据索引</small></article>
        </div>
      </section>

      <section class="report-preview__section">
        <div class="report-preview__section-heading">
          <div><span class="report-preview__overline">CONTENTS</span><h3>报告结构</h3></div>
          <span class="report-preview__muted">{{ report.sections.length }} 个章节</span>
        </div>
        <ol class="report-preview__contents">
          <li v-for="(section, index) in report.sections" :key="section.title" class="report-preview__chapter report-preview__section--row">
            <span class="report-preview__index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><h4>{{ section.title }}</h4><p>{{ section.summary }}</p></div>
            <AppIcon class="report-preview__row-mark" name="openExternal" :size="16" aria-hidden="true" />
          </li>
        </ol>
      </section>

      <section class="report-preview__section">
        <div class="report-preview__section-heading">
          <div><span class="report-preview__overline">EVIDENCE</span><h3>关键问题证据</h3></div>
          <span class="report-preview__muted">点击问题查看回答、引用与采样详情</span>
        </div>
        <div v-if="questions.length" class="report-preview__questions">
          <article v-for="question in questions" :key="question.id" class="report-preview__question">
            <div class="report-preview__question-id">
              {{ question.id }}
            </div>
            <div class="report-preview__question-copy">
              <h4>{{ question.question }}</h4>
              <p>{{ question.persona }} <span aria-hidden="true">·</span> {{ question.type }} <span aria-hidden="true">·</span> {{ question.platformResults.length }} 个平台结果</p>
            </div>
            <button type="button" :data-report-question="question.id" @click="emit('selectQuestion', question.id)">
              查看证据 <AppIcon name="arrowRight" :size="14" aria-hidden="true" />
            </button>
          </article>
        </div>
        <div v-else class="report-preview__empty">
          当前报告暂无可关联的问题记录。
        </div>
      </section>

      <aside class="report-preview__notice">
        <AppIcon name="info" :size="16" aria-hidden="true" />
        <p>此页面为产品内报告预览。演示数据不代表真实业务结论；正式导出与分享能力尚未接入。</p>
      </aside>
    </div>
  </Drawer>
</template>

<style scoped>
.report-preview { display: grid; gap: 20px; padding: 22px 28px 32px; color: var(--text-primary); }
.report-preview__hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-secondary); }
.report-preview__hero-copy { min-width: 0; }
.report-preview__eyebrow, .report-preview__overline { color: var(--action-accent); font-size: 11px; font-weight: 750; letter-spacing: .1em; }
.report-preview__hero h3 { max-width: 690px; margin: 8px 0 13px; font-size: 21px; line-height: 1.5; letter-spacing: -.02em; }
.report-preview__hero p { margin: 0; color: var(--text-muted); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.report-preview__status { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 2px 8px; border-radius: var(--radius-tag); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; }
.report-preview__status.is-generated { color: var(--status-success-foreground); background: var(--status-success-background); }
.report-preview__status.is-outline { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.report-preview__section { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.report-preview__section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.report-preview__section-heading h3 { margin: 4px 0 0; font-size: var(--font-size-section-title); line-height: 24px; font-weight: var(--weight-semibold); }
.report-preview__muted { color: var(--text-muted); font-size: 12px; }
.report-preview__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.report-preview__stats article { display: grid; gap: 6px; min-height: 96px; align-content: center; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--background-subtle); }
.report-preview__stats article > span, .report-preview__stats small { color: var(--text-muted); font-size: 12px; }
.report-preview__stats strong { color: var(--text-primary); font-size: 22px; line-height: 1.15; }
.report-preview__contents, .report-preview__questions { display: grid; gap: 9px; margin: 0; padding: 0; list-style: none; }
.report-preview__section--row { display: grid; grid-template-columns: 40px minmax(0, 1fr) 20px; align-items: center; gap: 12px; padding: 14px 16px; border-radius: var(--radius-control); background: var(--background-subtle); }
.report-preview__index { color: var(--action-accent); font-size: 12px; font-weight: 750; font-variant-numeric: tabular-nums; }
.report-preview__section--row h4, .report-preview__question h4 { margin: 0; font-size: 14px; line-height: 1.5; }
.report-preview__section--row p { margin: 3px 0 0; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.report-preview__row-mark { color: var(--border-control); }
.report-preview__question { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.report-preview__question-id { display: grid; width: 38px; height: 38px; place-items: center; border-radius: var(--radius-control); color: var(--action-accent); background: var(--action-subtle-background); font-size: 11px; font-weight: 700; }
.report-preview__question-copy { min-width: 0; }
.report-preview__question-copy h4 { overflow-wrap: anywhere; }
.report-preview__question-copy p { margin: 4px 0 0; color: var(--text-muted); font-size: 12px; }
.report-preview__question button { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 0; border-radius: var(--radius-control); color: var(--action-accent); background: transparent; font: inherit; font-size: var(--font-size-body); font-weight: 600; white-space: nowrap; cursor: pointer; }
.report-preview__question button:hover { background: color-mix(in srgb, var(--action-accent) 7%, var(--background-primary)); }
.report-preview__question button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.report-preview__empty { padding: 24px; border: 1px dashed var(--border-control); border-radius: var(--radius-control); color: var(--text-muted); text-align: center; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.report-preview__notice { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border: 1px solid var(--border-default); border-radius: var(--radius-control); color: var(--text-secondary); background: var(--background-secondary); }
.report-preview__notice > span { display: grid; width: 18px; height: 18px; flex: 0 0 auto; place-items: center; border: 1px solid currentColor; border-radius: 50%; color: var(--action-accent); font-size: 11px; font-weight: 700; }
.report-preview__notice p { margin: 0; font-size: 12px; line-height: 1.55; }
@media (max-width: 640px) { .report-preview { gap: 14px; padding: 16px; } .report-preview__hero { flex-direction: column; padding: 19px; } .report-preview__hero h3 { font-size: 18px; } .report-preview__section { padding: 17px; } .report-preview__section-heading { align-items: flex-start; flex-direction: column; gap: 5px; } .report-preview__stats { grid-template-columns: 1fr; } .report-preview__stats article { min-height: 84px; } .report-preview__question { grid-template-columns: 38px minmax(0, 1fr); gap: 10px; } .report-preview__question button { grid-column: 2; justify-self: start; padding-left: 0; } }
</style>

