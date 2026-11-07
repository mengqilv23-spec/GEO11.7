<script setup lang="ts">
import type { ReportFilter, ReportRecord, ReportType } from '../../data/report-center-data'
import { computed } from 'vue'
import { filterReports } from '../../data/report-center-data'
import OverviewInfoIcon from '../overview/OverviewInfoIcon.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = withDefaults(defineProps<{
  reports: readonly ReportRecord[]
  modelValue: ReportFilter
  counts?: Partial<Record<ReportFilter, number>>
  pageNum?: number
  pageSize?: number
  total?: number
  loading?: boolean
  error?: string
  siteId?: string | null
  marketId?: number | null
}>(), { pageNum: 1, pageSize: 20, total: 0, loading: false, error: '' })
const emit = defineEmits<{
  'update:modelValue': [value: ReportFilter]
  'changePage': [page: number]
}>()

const filterOptions: Array<{ value: ReportFilter, label: string }> = [
  { value: 'all', label: '全部报告' },
  { value: 'weekly', label: '周报' },
  { value: 'monthly', label: '月报' },
  { value: 'quarterly', label: '季报' },
  { value: 'adhoc', label: '次报' },
]
const counts = computed(() => Object.fromEntries(
  filterOptions.map(({ value }) => [value, props.counts?.[value] ?? (value === 'all' ? props.reports.length : props.reports.filter(report => report.type === value).length)]),
) as Record<ReportFilter, number>)
const visibleReports = computed(() => filterReports(props.reports, props.modelValue))
const emptyLabel = computed(() => ({ all: '暂无已生成报告', weekly: '暂无周报', monthly: '暂无月报', quarterly: '暂无季度报告', adhoc: '暂无次报' })[props.modelValue])
const reportLabels: Record<ReportType, string> = { weekly: '周报', monthly: '月报', quarterly: '季报', adhoc: '次报' }
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
function reportHref(reportId: string) {
  const query = new URLSearchParams()
  if (props.siteId !== null && props.siteId !== undefined)
    query.set('siteId', String(props.siteId))
  if (props.marketId !== null && props.marketId !== undefined)
    query.set('marketId', String(props.marketId))
  const queryString = query.toString()
  const suffix = queryString ? `?${queryString}` : ''
  return `/reports/${encodeURIComponent(reportId)}${suffix}`
}
</script>

<template>
  <section class="reports-panel" aria-labelledby="reports-title">
    <div class="reports-panel__heading">
      <div>
        <div class="reports-panel__title">
          <h2 id="reports-title">
            已生成报告
          </h2>
          <OverviewInfoIcon label="报告列表说明" title="按报告类型和时间查看监测结果、趋势、证据与可信度。" />
        </div>
      </div>
      <span class="sort-hint">按时间倒序</span>
    </div>
    <div class="reports-layout">
      <nav class="report-filter" aria-label="报告类型筛选">
        <h3>报告类型</h3>
        <button
          v-for="option in filterOptions"
          :key="option.value"
          type="button"
          :data-report-filter="option.value"
          :aria-pressed="modelValue === option.value"
          :class="{ 'is-active': modelValue === option.value }"
          @click="emit('update:modelValue', option.value)"
        >
          <span>{{ option.label }}</span><span class="filter-count">{{ counts[option.value] }}</span>
        </button>
      </nav>
      <div class="report-results" aria-live="polite">
        <p v-if="error" class="report-request-state is-error" role="alert">
          {{ error }}
        </p>
        <p v-else-if="loading" class="report-request-state" role="status">
          正在加载报告…
        </p>
        <template v-else-if="visibleReports.length">
          <article v-for="report in visibleReports" :key="report.id" class="report-card">
            <div class="report-card__type" :class="`is-${report.type}`">
              {{ reportLabels[report.type] }}
            </div>
            <div class="report-card__main">
              <div class="report-card__title-row">
                <div>
                  <h3>{{ report.title }}</h3>
                  <p class="report-card__date">
                    {{ report.date }} · {{ report.period }}
                  </p>
                </div>
              </div>
              <p v-if="report.summary" class="report-card__summary">
                <strong>汇报重点</strong>{{ report.summary }}
              </p>
              <div class="report-tags">
                <span v-for="tag in report.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="report-card__actions">
              <span class="report-status" :class="report.empty ? 'is-empty' : `is-${report.status}`">
                {{ report.empty ? '暂无数据' : ({ generated: '已生成', outline: '结构预览', generating: '生成中', failed: '生成失败', archived: '已归档' })[report.status] }}
              </span>
              <a v-if="!report.empty" class="report-card__action" :href="reportHref(report.id)" :data-open-report="report.id" target="_blank" rel="noopener noreferrer">
                {{ report.status === 'generated' || report.status === 'archived' ? '查看报告' : '查看详情' }}<AppIcon name="arrowRight" :size="12" aria-hidden="true" />
              </a>
            </div>
          </article>
        </template>
        <div v-else class="report-empty" role="status">
          <h3>{{ emptyLabel }}</h3>
          <p>{{ visibleReports.length === 0 && total === 0 ? '该类型当前没有报告记录。' : '切换报告类型查看其他报告。' }}</p>
        </div>
        <nav v-if="!loading && !error && pageCount > 1" class="report-pagination" aria-label="报告列表分页">
          <button type="button" :disabled="pageNum <= 1" @click="emit('changePage', pageNum - 1)">
            上一页
          </button>
          <span>第 {{ pageNum }} / {{ pageCount }} 页 · 共 {{ total }} 条</span>
          <button type="button" :disabled="pageNum >= pageCount" @click="emit('changePage', pageNum + 1)">
            下一页
          </button>
        </nav>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reports-panel { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.reports-panel__title { display: flex; align-items: center; gap: 8px; }
.reports-panel__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.reports-panel__heading h2 { margin: 0; color: var(--text-primary); font-size: var(--typography-section-title-font-size, 14px); line-height: var(--typography-section-title-line-height, 22px); font-weight: var(--weight-semibold); }
.reports-panel__heading p { margin: 4px 0 0; color: var(--text-muted); font-size: 14px; }
.sort-hint { flex: 0 0 auto; padding: 2px 8px; border-radius: var(--radius-tag); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.reports-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); align-items: start; gap: 16px; }
.report-filter { display: grid; gap: 5px; padding: 14px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-subtle); }
.report-filter h3 { margin: 0 0 6px; padding: 0 8px; color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; }
.report-filter button { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 10px; min-height: 40px; padding: 0 10px; border: 0; border-radius: 8px; color: var(--text-secondary); background: transparent; text-align: left; font: inherit; font-size: 14px; cursor: pointer; }
.report-filter button:hover { background: var(--background-hover); }
.report-filter button.is-active { color: var(--text-on-accent, #fff); background: var(--action-accent); font-weight: 600; }
.filter-count { display: inline-grid; min-width: 24px; height: 24px; place-items: center; padding: 0 6px; border-radius: var(--radius-tag); color: var(--text-secondary); background: var(--background-primary); font-size: var(--font-size-caption); }
.report-filter button:focus-visible, .report-card__action:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.report-results { display: grid; min-width: 0; gap: 12px; }
.report-card { display: grid; min-width: 0; grid-template-columns: 70px minmax(0, 1fr) auto; align-items: start; gap: 16px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); transition: border-color var(--motion-fast), background-color var(--motion-fast); }
.report-card:hover { border-color: var(--action-subtle-border, var(--border-control)); background: var(--background-secondary); }
.report-card__type { display: inline-grid; min-height: 28px; place-items: center; padding: 2px 8px; border-radius: var(--radius-tag); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; }
.report-card__type.is-weekly { color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 11%, var(--background-primary)); }
.report-card__type.is-monthly { color: var(--status-success-foreground); background: var(--status-success-background); }
.report-card__type.is-quarterly { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.report-card__type.is-adhoc { color: var(--text-secondary); background: var(--background-subtle); }
.report-card__main { min-width: 0; }
.report-card__title-row { display: flex; align-items: flex-start; gap: 12px; }
.report-card__title-row h3 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.report-card__date { margin: 3px 0 0; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.report-status { flex: 0 0 auto; padding: 2px 8px; border-radius: var(--radius-tag); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; }
.report-status.is-ready, .report-status.is-generated { color: var(--status-success-foreground); background: var(--status-success-background); }
.report-status.is-empty { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.report-status.is-outline { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.report-status.is-generating { color: var(--action-accent); background: var(--action-subtle-background); }
.report-status.is-failed { color: var(--status-error-foreground, #b91c1c); background: var(--status-error-background, #fef2f2); }
.report-status.is-archived { color: var(--text-muted); background: var(--background-subtle); }
.report-card__actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 2px; white-space: nowrap; }
.report-card__summary { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; color: var(--text-secondary); font-size: 14px; line-height: 1.55; }
.report-card__summary strong { color: var(--text-primary); }
.report-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.report-tags span { padding: 2px 8px; border: 1px solid var(--border-default); border-radius: var(--radius-tag); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.report-card__action { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; color: var(--action-accent); background: transparent; font: inherit; font-size: 13px; line-height: 20px; font-weight: 650; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background-color var(--motion-fast), color var(--motion-fast); }
.report-card__action:hover { background: var(--action-subtle-background); text-decoration: none; }
.report-card__action svg { transition: transform 160ms ease; }
.report-card__action:hover svg { transform: translateX(3px); }
.report-empty { display: grid; min-height: 240px; align-content: center; justify-items: center; padding: 24px; border: 1px dashed var(--border-control); border-radius: 12px; color: var(--text-secondary); text-align: center; }
.report-empty h3 { margin: 0 0 4px; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.report-empty p { margin: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.report-request-state { margin: 0; padding: 18px; color: var(--text-muted); }
.report-request-state.is-error { border: 1px solid var(--status-error-border, #fecaca); border-radius: 10px; color: var(--status-error-foreground, #b91c1c); background: var(--status-error-background, #fef2f2); }
.report-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; padding-top: 8px; color: var(--text-muted); font-size: 12px; }
.report-pagination button { min-height: 30px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 7px; background: var(--background-primary); color: var(--text-secondary); cursor: pointer; }
.report-pagination button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 880px) { .reports-layout { grid-template-columns: 1fr; } .report-filter { display: flex; overflow-x: auto; align-items: center; gap: 4px; padding: 8px; } .report-filter h3 { flex: 0 0 auto; margin: 0 6px 0 2px; } .report-filter button { flex: 0 0 auto; } }
@media (max-width: 620px) { .reports-panel { padding: 18px; } .reports-panel__heading { flex-direction: column; } .report-card { grid-template-columns: 58px minmax(0, 1fr); gap: 10px; padding: 14px; } .report-card__type { padding: 0 6px; font-size: 12px; } .report-card__actions { grid-column: 2; justify-content: flex-start; } .report-card__title-row { flex-direction: column; } }
</style>

