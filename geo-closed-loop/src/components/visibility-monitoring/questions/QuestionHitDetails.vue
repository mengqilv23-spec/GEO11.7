<script setup lang="ts">
import type { MonitoringPlatformId, MonitoringQuestion } from '../../../data/visibility-monitoring-data'
import MetricDefinitionButton from '../../overview/MetricDefinitionButton.vue'

const props = defineProps<{ questions: readonly MonitoringQuestion[], platforms: readonly { id: MonitoringPlatformId, label: string }[] }>()
const emit = defineEmits<{ selectQuestion: [questionId: string] }>()
function platformLabel(id: MonitoringPlatformId) {
  return props.platforms.find(platform => platform.id === id)?.label ?? id
}
</script>

<template>
  <section class="vm-card vm-table-card">
    <div class="vm-section-head">
      <div><h2>问答命中明细</h2><p>查看问题在 AI 平台中的提及、引用与排名表现。</p></div><span class="vm-pill">{{ questions.length }} 条问题</span>
    </div>
    <div class="vm-table-scroll" tabindex="0" aria-label="问答命中明细表，可横向滚动">
      <table>
        <thead>
          <tr>
            <th scope="col">
              监测问题
            </th><th scope="col">
              AI 平台提及 <MetricDefinitionButton id="soa" />
            </th><th scope="col">
              是否提及竞品
            </th><th scope="col">
              是否引用官网 <MetricDefinitionButton id="officialCitation" />
            </th><th scope="col">
              位置 <MetricDefinitionButton id="rank" />
            </th><th scope="col">
              趋势（较上期）
            </th><th scope="col">
              查看详情
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="question in questions" :key="question.id">
            <th scope="row">
              <span class="vm-question-id">{{ question.id }}</span><span class="vm-question-text">{{ question.question }}</span><small>{{ [question.persona, question.stage].filter(Boolean).join(' · ') }}</small>
            </th>
            <td>
              <div class="vm-platform-list">
                <span v-for="result in question.platformResults" :key="result.platform" class="vm-platform" :class="{ 'is-mentioned': result.ownBrandMentioned }">{{ platformLabel(result.platform) }} <b>{{ result.rank ? `第 ${result.rank} 位` : '未提及' }}</b></span>
              </div>
            </td>
            <td><span class="vm-status" :class="question.competitors.length ? 'is-yes' : 'is-no'">{{ question.competitors.length ? `是 · ${question.competitors.join('、')}` : '否' }}</span></td>
            <td><span class="vm-status" :class="question.officialSiteCited ? 'is-yes' : 'is-no'">{{ question.officialSiteCited ? '已引用官网' : '未引用官网' }}</span></td>
            <td><span>{{ question.rank ? `第 ${question.rank} 位` : '未进入排名' }}</span></td><td><small :class="`trend-${question.trend}`">{{ question.trend === 'up' ? '↑ 上升' : question.trend === 'down' ? '↓ 下降' : '→ 持平' }}</small></td>
            <td>
              <button class="vm-link geo-table-detail-button" type="button" @click="emit('selectQuestion', question.id)">
                查看详情
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.vm-card { min-width: 0; padding: 20px; background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 12px; }
.vm-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.vm-section-head h2 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-section-head p { margin: 4px 0 0; color: var(--text-secondary); }
.vm-pill { flex: 0 0 auto; padding: 5px 12px; color: var(--text-secondary); background: var(--background-subtle); border-radius: 999px; }
.vm-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
table { width: 100%; min-width: 1120px; border-collapse: collapse; text-align: left; }
thead { background: var(--background-subtle); color: var(--text-secondary); }
th, td { padding: 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
th { font-weight: 600; white-space: nowrap; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
tbody th { width: 360px; font-weight: 400; white-space: normal; }
.vm-question-id { display: inline-block; margin-right: 8px; color: var(--text-muted); font-size: 12px; font-weight: 600; }
.vm-question-text { font-weight: 500; overflow-wrap: anywhere; }
small { display: block; margin-top: 5px; color: var(--text-muted); font-weight: 400; }
.vm-platform-list { display: grid; gap: 5px; }
.vm-platform { color: var(--text-secondary); white-space: nowrap; }
.vm-platform b { color: var(--text-muted); font-weight: 500; }
.vm-platform.is-mentioned b { color: var(--status-success-foreground); }
.vm-status { display: inline-flex; max-width: 180px; padding: 3px 8px; border-radius: 999px; white-space: normal; }
.is-yes { color: var(--status-success-foreground); background: var(--status-success-background); }
.is-no { color: var(--status-error-foreground); background: var(--status-error-background); }
.trend-up { color: var(--status-success-foreground); }
.trend-down { color: var(--status-warning-foreground); }
.vm-link { padding: 0; color: var(--action-accent); background: none; border: 0; font: inherit; cursor: pointer; white-space: nowrap; }
.vm-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
@media (max-width: 520px) { .vm-card { padding: 16px; } .vm-section-head { flex-direction: column; } }
</style>

