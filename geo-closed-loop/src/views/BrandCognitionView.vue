<script setup lang="ts">
import type { BrandCognitionQuestion } from '../data/brand-cognition-data'
import type { MonitoringPlatformId } from '../data/visibility-monitoring-data'
import { computed, shallowRef } from 'vue'
import GeoDrawer from '../components/workbench/shared/GeoDrawer.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { brandCognitionPlatforms, brandCognitionQuestions } from '../data/brand-cognition-data'

const onlyGaps = shallowRef(false)
const selectedQuestion = shallowRef<BrandCognitionQuestion | null>(null)

const visibleQuestions = computed(() => onlyGaps.value
  ? brandCognitionQuestions.filter(question => !question.hasOwnedCitation)
  : brandCognitionQuestions)

const summary = computed(() => {
  const withCitations = brandCognitionQuestions.filter(question => question.hasCitations)
  const covered = withCitations.filter(question => question.hasOwnedCitation)
  const articles = new Map<string, boolean>()
  for (const question of brandCognitionQuestions) {
    for (const citation of question.citations)
      articles.set(citation.key, citation.isOwned)
  }
  const ownedArticles = [...articles.values()].filter(Boolean).length
  return {
    questions: brandCognitionQuestions.length,
    articles: articles.size,
    ownedArticles,
    thirdPartyArticles: articles.size - ownedArticles,
    coverageRate: withCitations.length ? Math.round(covered.length / withCitations.length * 100) : 0,
    covered: covered.length,
    withCitations: withCitations.length,
    gaps: withCitations.length - covered.length,
  }
})

function platformLabel(id: MonitoringPlatformId) {
  return brandCognitionPlatforms.find(platform => platform.id === id)?.label ?? id
}
function firstCitations(question: BrandCognitionQuestion) {
  return question.citations.slice(0, 2)
}
function openQuestion(question: BrandCognitionQuestion) {
  selectedQuestion.value = question
}
function closeQuestion() {
  selectedQuestion.value = null
}
</script>

<template>
  <div class="geo-page bc-page">
    <GeoPageIntro title="企业认知" help-label="企业认知说明" description="查看 AI 在企业相关问题上的引用来源，判断被引用的文章是否来自我方发布内容。" />

    <section class="bc-summary" aria-label="企业认知概览">
      <article class="bc-stat">
        <span>认知问题</span><strong>{{ summary.questions }}</strong><small>当前监测问题范围</small>
      </article>
      <article class="bc-stat">
        <span>被引文章</span><strong>{{ summary.articles }}</strong><small>我方 {{ summary.ownedArticles }} · 第三方 {{ summary.thirdPartyArticles }}</small>
      </article>
      <article class="bc-stat">
        <span>自有内容引用率</span><strong>{{ summary.coverageRate }}%</strong><small>{{ summary.covered }} / {{ summary.withCitations }} 个问题引用了我方内容</small>
      </article>
      <article class="bc-stat">
        <span>未引用我方内容</span><strong>{{ summary.gaps }}</strong><small>需要补充自有内容的问题</small>
      </article>
    </section>

    <section class="bc-card">
      <div class="bc-card__head">
        <div>
          <h2>问题引用来源</h2>
          <p>按问题查看 AI 回答引用了哪些文章；当前按官网 / 自有域名判断是否属于我方发布。</p>
        </div>
        <label class="bc-gap-filter">
          <input v-model="onlyGaps" type="checkbox">
          <span>只看未引用我方内容</span>
        </label>
      </div>
      <div class="bc-table-scroll" tabindex="0" aria-label="企业认知引用来源表，可横向滚动">
        <table>
          <thead>
            <tr>
              <th scope="col">
                认知问题
              </th>
              <th scope="col">
                AI 平台
              </th>
              <th scope="col">
                被引文章
              </th>
              <th scope="col">
                来源归属
              </th>
              <th scope="col">
                最近监测
              </th>
              <th scope="col">
                详情
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in visibleQuestions" :key="question.id">
              <th scope="row">
                <span class="bc-type">{{ question.type }}</span>
                <strong>{{ question.question }}</strong>
                <small>{{ question.persona }}</small>
              </th>
              <td>
                <span v-if="question.platforms.length" class="bc-platform-list">
                  <span v-for="platform in question.platforms" :key="platform" class="bc-platform-chip">{{ platformLabel(platform) }}</span>
                </span>
                <span v-else class="bc-muted">暂无</span>
              </td>
              <td>
                <template v-if="question.citations.length">
                  <span class="bc-count">{{ question.citations.length }} 篇</span>
                  <div class="bc-citation-preview">
                    <span v-for="citation in firstCitations(question)" :key="citation.key">{{ citation.title }}</span>
                    <small v-if="question.citations.length > 2">+{{ question.citations.length - 2 }}</small>
                  </div>
                </template>
                <span v-else class="bc-muted">暂无引用</span>
              </td>
              <td>
                <div v-if="question.citations.length" class="bc-ownership">
                  <span class="bc-owned" :class="{ 'is-zero': !question.ownedCount }">我方 {{ question.ownedCount }}</span>
                  <span class="bc-third">第三方 {{ question.thirdPartyCount }}</span>
                  <span v-if="!question.hasOwnedCitation" class="bc-gap">未引用我方内容</span>
                </div>
                <span v-else class="bc-muted">—</span>
              </td>
              <td>{{ question.lastChecked || '—' }}</td>
              <td>
                <button class="bc-link" type="button" @click="openQuestion(question)">
                  查看引用
                </button>
              </td>
            </tr>
            <tr v-if="!visibleQuestions.length">
              <td colspan="6" class="bc-empty">
                当前筛选下没有问题。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <GeoDrawer
      :open="!!selectedQuestion"
      :title="selectedQuestion?.question ?? ''"
      eyebrow="企业认知 · 引用来源"
      :subtitle="selectedQuestion ? `${selectedQuestion.type} · ${selectedQuestion.persona} · 最近监测 ${selectedQuestion.lastChecked || '—'}` : undefined"
      :size="860"
      @close="closeQuestion"
    >
      <div v-if="selectedQuestion" class="bc-detail">
        <div class="bc-detail__summary">
          <span><strong>{{ selectedQuestion.citations.length }}</strong> 篇被引文章</span>
          <span class="bc-owned"><strong>{{ selectedQuestion.ownedCount }}</strong> 篇我方发布</span>
          <span class="bc-third"><strong>{{ selectedQuestion.thirdPartyCount }}</strong> 篇第三方</span>
          <span v-if="!selectedQuestion.hasOwnedCitation" class="bc-gap">未引用我方内容</span>
        </div>
        <section v-for="group in selectedQuestion.platformGroups" :key="group.platform" class="bc-platform-section">
          <header class="bc-platform-section__head">
            <span class="bc-platform-chip">{{ platformLabel(group.platform) }}</span>
            <span class="bc-platform-section__meta">{{ group.citations.length }} 篇引用</span>
          </header>
          <details class="bc-answer">
            <summary>查看 AI 回答</summary>
            <p>{{ group.answer }}</p>
          </details>
          <div v-if="group.citations.length" class="bc-citation-list">
            <article v-for="citation in group.citations" :key="citation.key" class="bc-citation">
              <div class="bc-citation__head">
                <a :href="citation.url" target="_blank" rel="noopener noreferrer">{{ citation.title }}</a>
                <span class="bc-domain">{{ citation.domain }}</span>
                <span :class="citation.isOwned ? 'bc-owned' : 'bc-third'">{{ citation.isOwned ? '我方发布' : '第三方' }}</span>
              </div>
              <p>{{ citation.excerpt }}</p>
            </article>
          </div>
          <p v-else class="bc-muted">
            该平台回答没有记录引用文章。
          </p>
        </section>
        <p v-if="!selectedQuestion.platformGroups.length" class="bc-empty">
          当前问题暂无平台回答记录。
        </p>
      </div>
    </GeoDrawer>
  </div>
</template>

<style scoped>
.bc-page { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.bc-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.bc-stat { display: grid; gap: 6px; min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.bc-stat > span { color: var(--text-secondary); font-size: 12px; }
.bc-stat strong { color: var(--text-primary); font-size: 26px; line-height: 34px; font-weight: 600; }
.bc-stat small { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.bc-card { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.bc-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.bc-card__head h2 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.bc-card__head p { margin: 4px 0 0; color: var(--text-secondary); }
.bc-gap-filter { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 12px; cursor: pointer; white-space: nowrap; }
.bc-gap-filter input { width: 15px; height: 15px; accent-color: var(--action-accent); }
.bc-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
table { width: 100%; min-width: 1040px; border-collapse: collapse; text-align: left; }
thead { color: var(--text-secondary); background: var(--background-subtle); }
th, td { padding: 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
th { font-weight: 600; white-space: nowrap; }
tbody th { width: 300px; font-weight: 400; white-space: normal; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.bc-type { display: inline-flex; margin-bottom: 5px; padding: 2px 7px; border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 11px; line-height: 17px; }
tbody th strong { display: block; font-weight: 500; overflow-wrap: anywhere; }
tbody th small { display: block; margin-top: 4px; color: var(--text-muted); font-weight: 400; }
.bc-platform-list { display: flex; flex-wrap: wrap; gap: 4px; min-width: 140px; }
.bc-platform-chip { display: inline-flex; align-items: center; padding: 3px 8px; border: 1px solid var(--border-default); border-radius: 999px; color: var(--text-secondary); font-size: 11px; line-height: 17px; white-space: nowrap; }
.bc-count { display: block; color: var(--text-primary); font-weight: 600; }
.bc-citation-preview { display: grid; gap: 3px; max-width: 320px; margin-top: 5px; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.bc-citation-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-citation-preview small { color: var(--text-muted); }
.bc-ownership { display: flex; flex-wrap: wrap; gap: 4px; min-width: 150px; }
.bc-owned, .bc-third, .bc-gap { display: inline-flex; padding: 3px 8px; border-radius: 999px; font-size: 11px; line-height: 17px; white-space: nowrap; }
.bc-owned { color: var(--status-success-foreground); background: var(--status-success-background); }
.bc-owned.is-zero { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.bc-third { color: var(--text-secondary); background: var(--background-subtle); }
.bc-gap { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.bc-muted { color: var(--text-muted); font-size: 12px; }
.bc-link { padding: 0; color: var(--action-accent); background: none; border: 0; font: inherit; cursor: pointer; white-space: nowrap; }
.bc-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.bc-empty { padding: 24px; color: var(--text-muted); text-align: center; }
.bc-detail { display: grid; gap: 16px; min-width: 0; }
.bc-detail__summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); color: var(--text-secondary); font-size: 12px; }
.bc-detail__summary strong { color: var(--text-primary); }
.bc-platform-section { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.bc-platform-section__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bc-platform-section__meta { color: var(--text-muted); font-size: 12px; }
.bc-answer { padding: 10px 12px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--background-subtle); }
.bc-answer summary { color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.bc-answer p { margin: 8px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 21px; white-space: pre-wrap; }
.bc-citation-list { display: grid; gap: 8px; }
.bc-citation { padding: 12px; border: 1px solid var(--border-default); border-radius: 9px; }
.bc-citation__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.bc-citation__head a { color: var(--action-accent); font-weight: 500; text-decoration: none; overflow-wrap: anywhere; }
.bc-citation__head a:hover { text-decoration: underline; }
.bc-domain { color: var(--text-muted); font-family: var(--font-family-mono); font-size: 11px; }
.bc-citation p { margin: 7px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 19px; }
@media (max-width: 900px) { .bc-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .bc-page { gap: 18px; } .bc-summary { grid-template-columns: 1fr; } .bc-card { padding: 16px; } .bc-card__head { flex-direction: column; } }
</style>
