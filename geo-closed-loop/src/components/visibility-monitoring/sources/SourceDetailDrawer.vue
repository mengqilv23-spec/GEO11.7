<script setup lang="ts">
import type { CitedPage, MonitoringPlatformId, MonitoringQuestion, SourceDomain } from '../../../data/visibility-monitoring-data'
import { computed } from 'vue'
import Drawer from '../../ui/ce/drawer/Drawer.vue'

const props = withDefaults(defineProps<{
  source: SourceDomain | CitedPage | null
  open: boolean
  sources?: readonly SourceDomain[]
  pages?: readonly CitedPage[]
  questions?: readonly MonitoringQuestion[]
  platforms?: readonly { id: MonitoringPlatformId, label: string }[]
}>(), {
  sources: () => [],
  pages: () => [],
  questions: () => [],
  platforms: () => [],
})
const emit = defineEmits<{
  close: []
  selectQuestion: [questionId: string]
  selectPage: [pageId: string]
}>()

const page = computed(() => props.source && 'title' in props.source ? props.source : null)
const domain = computed(() => props.source && 'domain' in props.source ? props.source : null)
const domainPages = computed(() => domain.value
  ? domain.value.pageIds.map(id => props.pages.find(item => item.id === id)).filter((item): item is CitedPage => Boolean(item))
  : [])
const relatedQuestions = computed(() => {
  const ids = page.value?.questionIds ?? domainPages.value.flatMap(item => item.questionIds)
  return [...new Set(ids)].map(id => props.questions.find(question => question.id === id)).filter((item): item is MonitoringQuestion => Boolean(item))
})
const title = computed(() => domain.value?.domain ?? page.value?.title ?? '信源详情')
const eyebrow = computed(() => domain.value ? '来源域名详情' : page.value ? '被引页面详情' : '信源详情')
const platformLabels = computed(() => {
  const ids = domain.value?.platforms ?? page.value?.platforms ?? []
  return ids.map(id => props.platforms.find(item => item.id === id)?.label ?? id)
})
const platformStats = computed(() => domain.value?.platformStats ?? page.value?.platformStats ?? [])

function domainName(domainId: string) {
  return props.sources.find(item => item.id === domainId)?.domain ?? domainId
}
</script>

<template>
  <Drawer
    :open="open"
    :title="title"
    :eyebrow="eyebrow"
    :description="domain ? `本轮被引页面：${domainPages.length} 个` : page ? `来源域名：${domainName(page.domainId)}` : undefined"
    :size="960"
    close-label="关闭信源详情"
    class="vm-source-drawer"
    @close="emit('close')"
    @update:open="value => !value && emit('close')"
  >
    <div v-if="source" class="vm-source-body">
      <section class="vm-source-section">
        <div v-if="domain?.competitors.length" class="vm-competitor-line">
          <strong>竞品引用</strong><span v-for="competitor in domain.competitors" :key="competitor">{{ competitor }}</span>
        </div>
        <div class="vm-source-metrics">
          <article><span>命中问题数</span><strong>{{ domain?.questionCount ?? page?.questionIds.length }}</strong></article>
          <article><span>引用次数</span><strong>{{ domain?.citationCount ?? page?.citations }}</strong></article>
          <article><span>引用平台</span><strong>{{ platformLabels.length }} 个</strong></article>
          <article><span>我方是否提及</span><strong :class="(domain?.ownBrandMentioned ?? page?.ownBrandMentioned) ? 'is-yes' : 'is-no'">{{ (domain?.ownBrandMentioned ?? page?.ownBrandMentioned) ? '是' : '否' }}</strong></article>
        </div>
      </section>

      <section class="vm-source-section">
        <div class="vm-source-heading">
          <div><h3>{{ domain ? '各 AI 平台引用分布' : '引用内容明细' }}</h3><p>{{ domain ? '当前来源域名的引用拆分' : '被引页面的 AI 引用记录' }}</p></div>
        </div>
        <div v-if="platformStats.length" class="vm-source-table-scroll">
          <table>
            <thead>
              <tr>
                <th>AI 平台</th><th>引用次数</th><th>命中问题数</th><th v-if="domain">
                  被引页面数
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in platformStats" :key="stat.platform">
                <td>{{ platforms.find(item => item.id === stat.platform)?.label ?? stat.platform }}</td><td>{{ stat.citationCount }}</td><td>{{ stat.questionCount }}</td><td v-if="domain">
                  {{ 'pageCount' in stat ? stat.pageCount : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="vm-platform-chips">
          <span v-for="label in platformLabels" :key="label">{{ label }}</span><span v-if="!platformLabels.length" class="vm-muted-chip">暂无平台记录</span>
        </div>
      </section>

      <section v-if="domain" class="vm-source-section">
        <div class="vm-source-heading">
          <div><h3>被引页面</h3><p>该域名下关联的页面级引用记录</p></div>
          <span class="vm-count-chip">{{ domainPages.length }} 个</span>
        </div>
        <div v-if="domainPages.length" class="vm-source-table-scroll" role="region" tabindex="0" aria-label="来源页面列表，可横向滚动">
          <table>
            <thead><tr><th>页面标题 / 摘要</th><th>命中问题</th><th>引用次数</th><th>详情</th></tr></thead>
            <tbody>
              <tr v-for="item in domainPages" :key="item.id">
                <td><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></td><td>{{ item.questionIds.length }} 条</td><td>{{ item.citations }}</td><td>
                  <button type="button" class="vm-source-link geo-table-detail-button" :data-select-page="item.id" @click="emit('selectPage', item.id)">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="vm-source-empty">
          暂无页面级引用记录
        </p>
      </section>

      <section v-if="page" class="vm-source-section">
        <p class="vm-page-summary">
          {{ page.summary }}
        </p>
      </section>

      <section class="vm-source-section">
        <div class="vm-source-heading">
          <div><h3>关联问题</h3><p>这些监测问题引用了当前信源</p></div>
          <span class="vm-count-chip">{{ relatedQuestions.length }} 条</span>
        </div>
        <div v-if="relatedQuestions.length" class="vm-source-table-scroll" role="region" tabindex="0" aria-label="关联问题列表，可横向滚动">
          <table>
            <thead><tr><th>监测问题</th><th>买家人设</th><th>引用平台</th><th>详情</th></tr></thead>
            <tbody>
              <tr v-for="question in relatedQuestions" :key="question.id">
                <td><strong>{{ question.question }}</strong><small>{{ question.id }}</small></td><td>{{ question.persona }}</td><td>{{ question.platformResults.filter(result => result.citedPages.some(id => page?.id === id || domainPages.some(item => item.id === id))).map(result => props.platforms.find(platformItem => platformItem.id === result.platform)?.label ?? result.platform).join(' · ') }}</td><td>
                  <button type="button" class="vm-source-link geo-table-detail-button" :data-select-question="question.id" @click="emit('selectQuestion', question.id)">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="vm-source-empty">
          暂无可展开的问题明细
        </p>
      </section>
    </div>
  </Drawer>
</template>

<style scoped>
.vm-source-drawer { --ce-drawer-size: min(960px, 94vw); }
.vm-source-body { display: grid; gap: 16px; min-width: 0; }
.vm-source-section { min-width: 0; padding: 17px; border: 1px solid var(--border-default); border-radius: 13px; background: var(--background-primary); }
.vm-competitor-line { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--text-secondary); font-size: 12px; }
.vm-competitor-line span { padding: 4px 9px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); font-weight: 600; }
.vm-source-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.vm-source-metrics article { display: grid; min-width: 0; align-content: start; gap: 7px; padding: 13px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); }
.vm-source-metrics article > span { color: var(--text-muted); font-size: 12px; }
.vm-source-metrics strong { color: var(--text-primary); font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.vm-source-metrics small { color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.vm-source-metrics .is-yes { color: var(--status-success-foreground); }
.vm-source-metrics .is-no { color: var(--status-error-foreground); }
.vm-source-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.vm-source-heading h3 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-source-heading p { margin: 4px 0 0; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.vm-platform-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-platform-chips span, .vm-count-chip { display: inline-flex; align-items: center; padding: 5px 10px; border: 1px solid var(--border-default); border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; font-weight: 600; }
.vm-platform-chips .vm-muted-chip { color: var(--text-muted); font-weight: 400; }
.vm-data-note { margin: 10px 0 0; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.vm-source-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.vm-source-table-scroll:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.vm-source-table-scroll table { width: 100%; min-width: 620px; border-collapse: collapse; text-align: left; }
.vm-source-table-scroll th, .vm-source-table-scroll td { padding: 11px 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
.vm-source-table-scroll thead { color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; }
.vm-source-table-scroll tbody tr:last-child th, .vm-source-table-scroll tbody tr:last-child td { border-bottom: 0; }
.vm-source-table-scroll td strong { display: block; color: var(--text-primary); font-weight: 600; line-height: 1.5; }
.vm-source-table-scroll td small { display: block; margin-top: 4px; color: var(--text-muted); line-height: 1.5; }
.vm-source-link { padding: 0; border: 0; color: var(--action-accent); background: transparent; font: inherit; font-size: var(--font-size-body); font-weight: 600; cursor: pointer; white-space: nowrap; }
.vm-source-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.vm-source-empty, .vm-page-summary { margin: 0; padding: 13px; border-radius: var(--radius-control); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-body); line-height: var(--line-height-body); overflow-wrap: anywhere; }
.vm-page-summary { white-space: pre-wrap; }
@media (max-width: 780px) { .vm-source-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .vm-source-section { padding: 14px; } .vm-source-metrics { grid-template-columns: 1fr 1fr; } }
</style>

