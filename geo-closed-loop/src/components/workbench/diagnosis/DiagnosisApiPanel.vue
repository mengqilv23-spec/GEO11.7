<script setup lang="ts">
import type { DiagnosisGap, DiagnosisIssue, DiagnosisPage, DiagnosisStrategy } from '../../../api/diagnosis'
import { computed, shallowRef } from 'vue'
import Drawer from '../../ui/ce/drawer/Drawer.vue'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import GeoPageIntro from '../shared/GeoPageIntro.vue'

defineProps<{
  issues: DiagnosisPage<DiagnosisIssue>
  gaps: DiagnosisPage<DiagnosisGap>
  strategies: DiagnosisPage<DiagnosisStrategy>
  loading: boolean
  errors: { issues: string, gaps: string, strategies: string }
  detail: { kind: 'issue', data: DiagnosisIssue } | { kind: 'strategy', data: DiagnosisStrategy } | null
  detailLoading: boolean
  detailError: string
}>()

const emit = defineEmits<{ retry: [], detail: [kind: 'issue' | 'strategy', id: number], closeDetail: [] }>()
const selectedDetail = shallowRef<{ kind: 'issue' | 'strategy', id: number } | null>(null)
const detailOpen = computed(() => selectedDetail.value !== null)

function openDetail(kind: 'issue' | 'strategy', id: number) {
  selectedDetail.value = { kind, id }
  emit('detail', kind, id)
}

function closeDetail() {
  selectedDetail.value = null
  emit('closeDetail')
}

function coverage(value: number | null) {
  return value === null ? '—' : `${value}%`
}
</script>

<template>
  <main class="geo-content geo-diagnosis geo-diagnosis-api">
    <GeoPageIntro
      variant="workbench"
      title="诊断与策略"
      help-label="诊断与策略说明"
      description="以下是前端本地模拟的诊断查询数据，可展开查看问题、人设 Gap 和候选策略明细。"
    />

    <p v-if="loading" class="diagnosis-state" role="status">
      正在加载诊断数据…
    </p>
    <button v-else-if="errors.issues && errors.gaps && errors.strategies" class="diagnosis-error" type="button" @click="emit('retry')">
      <span>本地模拟数据加载失败：{{ errors.issues }}</span>
      <strong>重试</strong>
    </button>
    <p v-else class="diagnosis-note" role="note">
      当前数据来自浏览器本地模拟；审核、修复和策略处理请在诊断工作台中操作。
    </p>

    <section class="diagnosis-section" aria-labelledby="diagnosis-issues-title">
      <header>
        <div>
          <h2 id="diagnosis-issues-title">
            诊断问题
          </h2><span>共 {{ issues.total }} 条</span>
        </div>
      </header>
      <p v-if="errors.issues" class="section-error" role="alert">
        {{ errors.issues }}
      </p>
      <p v-else-if="!loading && issues.records.length === 0" class="section-empty">
        暂无诊断问题
      </p>
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>问题</th><th>分类 / 类型</th><th>优先级</th><th>状态</th><th>页面与证据</th><th>整改建议</th></tr></thead>
          <tbody>
            <tr v-for="issue in issues.records" :key="issue.id">
              <td>
                <strong>{{ issue.findingTitle || '—' }}</strong><small>#{{ issue.id }} · {{ issue.dataSource || '来源未标注' }}</small><p>{{ issue.findingDesc || '—' }}</p><button class="detail-link" type="button" @click="openDetail('issue', issue.id)">
                  加载完整问题详情
                </button>
              </td>
              <td>{{ issue.checkCategory || '—' }}<small>{{ issue.taskType || '—' }} · {{ issue.ruleCode || '无规则编号' }}</small></td>
              <td>{{ issue.severity || '—' }}</td>
              <td>{{ issue.findingStatus || '—' }}</td>
              <td><a v-if="issue.pageUrl" :href="issue.pageUrl" target="_blank" rel="noreferrer">{{ issue.pageUrl }}</a><span v-else>—</span><small>{{ issue.evidence || '无证据描述' }}</small></td>
              <td>{{ issue.remediation || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!errors.issues && issues.total > issues.records.length" class="page-hint">
        当前显示 {{ issues.records.length }} / {{ issues.total }} 条（接口分页，每页 {{ issues.size }} 条）。
      </p>
    </section>

    <section class="diagnosis-section" aria-labelledby="diagnosis-gaps-title">
      <header>
        <div>
          <h2 id="diagnosis-gaps-title">
            人设决策因子 Gap
          </h2><span>共 {{ gaps.total }} 条</span>
        </div>
      </header>
      <p v-if="errors.gaps" class="section-error" role="alert">
        {{ errors.gaps }}
      </p>
      <p v-else-if="!loading && gaps.records.length === 0" class="section-empty">
        暂无人设 Gap 数据
      </p>
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>人设</th><th>阶段</th><th>决策因子</th><th>来源</th><th>我方覆盖</th><th>竞品覆盖</th></tr></thead>
          <tbody>
            <tr v-for="gap in gaps.records" :key="gap.id">
              <td>{{ gap.personaName || '—' }}</td><td>{{ gap.personaStage || '—' }}</td><td>{{ gap.personaFactorName || '—' }}<small>{{ gap.personaFactorType || '—' }} · #{{ gap.id }}</small></td><td>{{ gap.sourceType || '—' }}</td><td>{{ coverage(gap.ourCoverage) }}</td><td>{{ coverage(gap.competitorCoverage) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!errors.gaps && gaps.total > gaps.records.length" class="page-hint">
        当前显示 {{ gaps.records.length }} / {{ gaps.total }} 条（接口分页，每页 {{ gaps.size }} 条）。
      </p>
    </section>

    <section class="diagnosis-section" aria-labelledby="diagnosis-strategies-title">
      <header>
        <div>
          <h2 id="diagnosis-strategies-title">
            候选策略
          </h2><span>共 {{ strategies.total }} 条</span>
        </div>
      </header>
      <p v-if="errors.strategies" class="section-error" role="alert">
        {{ errors.strategies }}
      </p>
      <p v-else-if="!loading && strategies.records.length === 0" class="section-empty">
        暂无候选策略
      </p>
      <div v-else class="table-scroll">
        <table>
          <thead><tr><th>编号</th><th>优先级 / 类型</th><th>人设与决策因子</th><th>策略描述与执行方法</th><th>目标与知识</th></tr></thead>
          <tbody>
            <tr v-for="strategy in strategies.records" :key="strategy.id">
              <td>
                {{ strategy.strategyNo || `#${strategy.id}` }}<small>关联 Gap #{{ strategy.gapId ?? '—' }}</small><button class="detail-link" type="button" @click="openDetail('strategy', strategy.id)">
                  加载完整策略详情
                </button>
              </td><td>{{ strategy.priority || '—' }}<small>{{ strategy.taskType || '—' }}</small></td><td>{{ strategy.personaName || '—' }}<small>{{ strategy.personaFactorName || '—' }}</small></td><td>{{ strategy.strategyDesc || '—' }}<small>{{ strategy.agentMethod || '—' }}</small></td><td>{{ strategy.briefGoal || '—' }}<small>{{ strategy.briefAudience || '—' }} · {{ strategy.briefKnowledgeUsed || '无知识摘要' }}</small></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!errors.strategies && strategies.total > strategies.records.length" class="page-hint">
        当前显示 {{ strategies.records.length }} / {{ strategies.total }} 条（接口分页，每页 {{ strategies.size }} 条）。
      </p>
    </section>
    <Drawer :open="detailOpen" :title="selectedDetail?.kind === 'issue' ? '诊断问题详情' : '候选策略详情'" eyebrow="服务端详情" :size="640" close-label="关闭诊断详情" @close="closeDetail" @update:open="value => !value && closeDetail()">
      <p v-if="detailLoading" class="detail-state" role="status">
        <Spinner variant="ring" aria-hidden="true" />
      </p>
      <p v-else-if="detailError" class="detail-state detail-state--error" role="alert">
        {{ detailError }} <button v-if="selectedDetail" type="button" @click="emit('detail', selectedDetail.kind, selectedDetail.id)">
          重试
        </button>
      </p>
      <dl v-else-if="detail?.kind === 'issue'" class="detail-fields">
        <div><dt>标题</dt><dd>{{ detail.data.findingTitle || '—' }}</dd></div><div><dt>问题描述</dt><dd>{{ detail.data.findingDesc || '—' }}</dd></div><div><dt>来源 / 分类</dt><dd>{{ detail.data.dataSource || '—' }} · {{ detail.data.checkCategory || '—' }}</dd></div><div><dt>优先级 / 任务类型</dt><dd>{{ detail.data.severity || '—' }} · {{ detail.data.taskType || '—' }}</dd></div><div><dt>规则编号</dt><dd>{{ detail.data.ruleCode || '—' }}</dd></div><div><dt>问题状态</dt><dd>{{ detail.data.findingStatus || '—' }}</dd></div><div><dt>问题页面</dt><dd><a v-if="detail.data.pageUrl" :href="detail.data.pageUrl" target="_blank" rel="noreferrer">{{ detail.data.pageUrl }}</a><span v-else>—</span></dd></div><div><dt>证据</dt><dd>{{ detail.data.evidence || '—' }}</dd></div><div><dt>整改建议</dt><dd>{{ detail.data.remediation || '—' }}</dd></div>
      </dl>
      <dl v-else-if="detail?.kind === 'strategy'" class="detail-fields">
        <div><dt>策略编号 / 任务</dt><dd>{{ detail.data.strategyNo || `#${detail.data.id}` }} · #{{ detail.data.taskId }}</dd></div><div><dt>关联 Gap</dt><dd>{{ detail.data.gapId ?? '—' }}</dd></div><div><dt>人设 / 决策因子</dt><dd>{{ detail.data.personaName || '—' }} · {{ detail.data.personaFactorName || '—' }}</dd></div><div><dt>优先级 / 类型</dt><dd>{{ detail.data.priority || '—' }} · {{ detail.data.taskType || '—' }}</dd></div><div><dt>策略描述</dt><dd>{{ detail.data.strategyDesc || '—' }}</dd></div><div><dt>Agent 建议方法</dt><dd>{{ detail.data.agentMethod || '—' }}</dd></div><div><dt>任务目标</dt><dd>{{ detail.data.briefGoal || '—' }}</dd></div><div><dt>目标人设</dt><dd>{{ detail.data.briefAudience || '—' }}</dd></div><div><dt>知识列表</dt><dd>{{ detail.data.briefKnowledgeUsed || '—' }}</dd></div>
      </dl>
      <p v-else class="detail-state">
        选择一条问题或策略以读取完整详情。
      </p>
    </Drawer>
  </main>
</template>

<style scoped>
.geo-diagnosis-api { display: grid; gap: 18px; }
.diagnosis-state,.diagnosis-note,.diagnosis-error,.diagnosis-section { border: 1px solid var(--geo-border, var(--border-default)); border-radius: 14px; background: var(--geo-surface, var(--background-primary)); color: var(--geo-text, var(--text-primary)); }
.diagnosis-state,.diagnosis-note,.diagnosis-error { margin: 0; padding: 14px 18px; }
.diagnosis-note { color: var(--geo-text-2, var(--text-secondary)); background: var(--geo-fill, var(--background-secondary)); }
.diagnosis-error { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px; color: var(--status-error-foreground, #a42b2b); text-align: left; cursor: pointer; }
.diagnosis-section { min-width: 0; overflow: hidden; }
.diagnosis-section header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--geo-border, var(--border-default)); }
.diagnosis-section header div { display: flex; width: 100%; align-items: baseline; justify-content: space-between; gap: 12px; }
.diagnosis-section h2 { margin: 0; font-size: 17px; }
.diagnosis-section header span,.page-hint { color: var(--geo-text-3, var(--text-muted)); font-size: 13px; }
.table-scroll { max-width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th,td { min-width: 110px; padding: 13px 16px; border-bottom: 1px solid var(--geo-border, var(--border-default)); vertical-align: top; }
th { background: var(--geo-fill, var(--background-secondary)); color: var(--geo-text-2, var(--text-secondary)); font-size: 13px; font-weight: 650; white-space: nowrap; }
td { color: var(--geo-text-2, var(--text-secondary)); font-size: 13px; line-height: 1.55; }
td strong { color: var(--geo-text, var(--text-primary)); font-size: 14px; }
td small { display: block; margin-top: 5px; color: var(--geo-text-3, var(--text-muted)); overflow-wrap: anywhere; }
td p { max-width: 360px; margin: 6px 0 0; }
td a { color: var(--geo-brand, var(--action-accent)); overflow-wrap: anywhere; }
.section-empty,.section-error { margin: 0; padding: 22px 20px; color: var(--geo-text-3, var(--text-muted)); }
.section-error { color: var(--status-error-foreground, #a42b2b); }
.page-hint { margin: 0; padding: 10px 16px; }
.detail-link { display: block; margin-top: 8px; padding: 0; border: 0; color: var(--geo-brand, var(--action-accent)); background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.detail-state { margin: 0; padding: 16px; color: var(--geo-text-2, var(--text-secondary)); }
.detail-state[role="status"] { display: flex; min-height: 64px; align-items: center; justify-content: center; --spinner-color: var(--geo-brand, var(--action-accent)); }
.detail-state--error { color: var(--status-error-foreground, #a42b2b); }
.detail-fields { display: grid; gap: 0; margin: 0; }
.detail-fields > div { display: grid; grid-template-columns: minmax(120px, .35fr) 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--geo-border, var(--border-default)); }
.detail-fields dt { color: var(--geo-text-3, var(--text-muted)); }
.detail-fields dd { margin: 0; color: var(--geo-text, var(--text-primary)); overflow-wrap: anywhere; white-space: pre-wrap; }
.detail-fields a { color: var(--geo-brand, var(--action-accent)); }
</style>

