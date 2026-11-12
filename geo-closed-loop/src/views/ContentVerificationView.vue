<script setup lang="ts">
import type { ContentVerificationItem } from '../data/content-verification-data'
import { computed, shallowRef } from 'vue'
import Button from '../components/ui/ce/button/Button.vue'
import AppIcon from '../components/ui/icons/AppIcon.vue'
import GeoDrawer from '../components/workbench/shared/GeoDrawer.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { contentVerificationItems } from '../data/content-verification-data'

const selectedItem = shallowRef<ContentVerificationItem | null>(null)

const summary = computed(() => {
  const questions = contentVerificationItems.flatMap(item => item.questions)
  const platforms = new Set(questions.flatMap(question => question.answers.map(answer => answer.platform)))
  return {
    published: contentVerificationItems.length,
    questions: questions.length,
    platforms: platforms.size,
    sampleDate: contentVerificationItems.map(item => item.lastChecked).filter(Boolean).sort().at(-1) ?? '',
  }
})

function citedQuestionCount(item: ContentVerificationItem) {
  return item.questions.filter(question => question.state === 'cited').length
}
function citedPlatformCount(item: ContentVerificationItem) {
  return new Set(item.questions.flatMap(question => question.answers.map(answer => answer.platform))).size
}
function openItem(item: ContentVerificationItem) {
  selectedItem.value = item
}
function closeItem() {
  selectedItem.value = null
}
</script>

<template>
  <div class="geo-page cv-page">
    <GeoPageIntro
      title="品牌内容核验"
      help-label="品牌内容核验说明"
      description="每个内容对应一条官网发布任务；系统围绕已发布内容中的企业事实生成核验问题，记录 AI 回答中是否出现官网。"
    />

    <section class="cv-summary" aria-label="品牌内容核验概览">
      <article class="cv-stat">
        <span>已发布在官网的内容</span><strong>{{ summary.published }}</strong><small>已进入品牌内容核验</small>
      </article>
      <article class="cv-stat">
        <span>核验问题</span><strong>{{ summary.questions }}</strong><small>围绕企业事实生成</small>
      </article>
      <article class="cv-stat">
        <span>覆盖平台</span><strong>{{ summary.platforms }}</strong><small>本轮监测的 AI 平台</small>
      </article>
    </section>

    <p class="cv-sample-note">
      <AppIcon name="info" :size="14" />
      <span>
        引用结果来自 {{ summary.sampleDate || '本轮监测样本' }} 的监测样本，可点击详情查看查询结果
      </span>
    </p>

    <section class="cv-card">
      <div class="cv-card__head">
        <div>
          <h2>内容核验清单</h2>
          <p>按任务序号追溯内容；核验问题围绕企业事实生成，结果记录到具体 AI 平台与来源。</p>
        </div>
      </div>

      <div class="cv-table-scroll" tabindex="0" aria-label="品牌内容核验清单，可横向滚动">
        <table>
          <thead>
            <tr>
              <th scope="col">
                序号
              </th>
              <th scope="col">
                核验问题
              </th>
              <th scope="col">
                任务名
              </th>
              <th scope="col">
                任务序号
              </th>
              <th scope="col">
                AI 引用结果
              </th>
              <th scope="col">
                最近核验
              </th>
              <th scope="col">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in contentVerificationItems" :key="item.taskId" :data-task-id="item.taskId">
              <td class="cv-index">
                {{ index + 1 }}
              </td>
              <td>
                <template v-if="item.questions.length">
                  <span class="cv-count">{{ item.questions.length }} 个</span>
                  <small class="cv-question-preview">{{ item.questions[0]!.question }}</small>
                </template>
                <template v-else>
                  <span class="cv-muted">—</span>
                  <small class="cv-question-preview">内容发布后才能生成核验问题。</small>
                </template>
              </td>
              <td class="cv-task-name">
                {{ item.taskName }}
              </td>
              <td>
                <RouterLink class="cv-task-link" :to="{ name: 'task-detail', params: { taskId: item.taskId } }">
                  {{ item.taskId }}
                  <AppIcon name="arrowRight" :size="13" />
                </RouterLink>
              </td>
              <td>
                <span class="cv-result is-success">{{ citedQuestionCount(item) }} / {{ item.questions.length }} 个问题有官网</span>
                <small class="cv-platform-summary">{{ citedPlatformCount(item) }} 个平台回答有官网</small>
              </td>
              <td>
                <span v-if="item.lastChecked">{{ item.lastChecked }}</span>
                <span v-else class="cv-muted">—</span>
              </td>
              <td>
                <button class="cv-link" type="button" @click="openItem(item)">
                  查看核验
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <GeoDrawer
      :open="!!selectedItem"
      :title="selectedItem?.contentTitle ?? ''"
      eyebrow="品牌内容核验"
      :subtitle="selectedItem ? `${selectedItem.taskId} · ${selectedItem.publishedAt}` : undefined"
      :size="920"
      @close="closeItem"
    >
      <div v-if="selectedItem" class="cv-detail">
        <div class="cv-detail__meta">
          <span><strong>任务序号</strong><RouterLink :to="{ name: 'task-detail', params: { taskId: selectedItem.taskId } }">{{ selectedItem.taskId }}</RouterLink></span>
          <span><strong>内容版本</strong>V{{ selectedItem.revision }}</span>
          <span><strong>发布日期</strong>{{ selectedItem.publishedAt || '—' }}</span>
          <span v-if="selectedItem.platformCount"><strong>核验样本</strong>{{ selectedItem.platformCount }} 个平台</span>
          <span><strong>最近核验</strong>{{ selectedItem.lastChecked || '—' }}</span>
        </div>

        <a v-if="selectedItem.url" class="cv-detail__url" :href="selectedItem.url" target="_blank" rel="noopener noreferrer">
          {{ selectedItem.url }}
          <AppIcon name="externalLink" :size="14" />
        </a>

        <div class="cv-facts" aria-label="内容核验要点">
          <span v-for="fact in selectedItem.keyFacts" :key="fact">{{ fact }}</span>
        </div>

        <section class="cv-questions" aria-label="核验问题与 AI 回答">
          <article v-for="(question, index) in selectedItem.questions" :key="question.id" class="cv-question">
            <header class="cv-question__head">
              <span class="cv-question__index">Q{{ index + 1 }}</span>
              <div class="cv-question__copy">
                <h3>{{ question.question }}</h3>
                <p>{{ question.intent }} · 围绕企业事实生成</p>
              </div>
            </header>

            <div class="cv-platform-list">
              <article v-for="answer in question.answers" :key="answer.platform" class="cv-platform">
                <header class="cv-platform__head">
                  <span class="cv-platform__name">{{ answer.platformLabel }}</span>
                </header>

                <details class="cv-answer">
                  <summary>查看 AI 回答</summary>
                  <p>{{ answer.answer }}</p>
                </details>

                <div v-if="answer.citations.length" class="cv-citations">
                  <a
                    v-for="citation in answer.citations"
                    :key="citation.key"
                    class="cv-citation"
                    :href="citation.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div class="cv-citation__head">
                      <strong>{{ citation.title }}</strong>
                      <span class="cv-citation__badge" :class="{ 'is-primary': citation.isPrimary }">{{ citation.isPrimary ? '官网引用' : '其他来源' }}</span>
                    </div>
                    <span class="cv-citation__domain">{{ citation.domain }}</span>
                    <p>{{ citation.excerpt }}</p>
                  </a>
                </div>
                <p v-else class="cv-muted cv-no-citation">
                  回答提及官网，未记录引用链接。
                </p>
              </article>
            </div>
          </article>
        </section>
      </div>

      <template #footer>
        <RouterLink v-if="selectedItem" class="cv-footer-task" :to="{ name: 'task-detail', params: { taskId: selectedItem.taskId } }">
          查看关联任务
        </RouterLink>
        <Button type="button" @click="closeItem">
          关闭
        </Button>
      </template>
    </GeoDrawer>
  </div>
</template>

<style scoped>
.cv-page { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.cv-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.cv-stat { display: grid; gap: 6px; min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-stat > span { color: var(--text-secondary); font-size: 12px; }
.cv-stat strong { color: var(--text-primary); font-size: 26px; line-height: 34px; font-weight: 600; }
.cv-stat small { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-sample-note { display: flex; align-items: flex-start; gap: 8px; margin: -10px 0 0; color: var(--text-muted); font-size: 12px; line-height: 19px; }
.cv-sample-note svg { flex: 0 0 auto; margin-top: 2px; }
.cv-card { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.cv-card__head h2 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.cv-card__head p { margin: 4px 0 0; color: var(--text-secondary); }
.cv-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
table { width: 100%; min-width: 1020px; border-collapse: collapse; text-align: left; }
thead { color: var(--text-secondary); background: var(--background-subtle); }
th, td { padding: 12px; border-bottom: 1px solid var(--border-default); vertical-align: middle; }
th { font-weight: 600; white-space: nowrap; }
tbody tr:last-child td { border-bottom: 0; }
.cv-index { width: 56px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.cv-task-name { min-width: 230px; font-weight: 500; overflow-wrap: anywhere; }
.cv-task-link { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; color: var(--action-accent); font-size: 12px; line-height: 18px; text-decoration: none; overflow-wrap: anywhere; }
.cv-task-link:hover { text-decoration: underline; }
.cv-task-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cv-count { display: block; color: var(--text-primary); font-weight: 600; }
.cv-question-preview { display: block; max-width: 230px; margin-top: 5px; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cv-result { display: inline-flex; padding: 3px 8px; border-radius: 999px; font-size: 11px; line-height: 17px; white-space: nowrap; }
.cv-result.is-success { color: var(--status-success-foreground); background: var(--status-success-background); }
.cv-platform-summary { display: block; max-width: 220px; margin-top: 6px; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-muted { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-link { padding: 0; color: var(--action-accent); background: none; border: 0; font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; }
.cv-link:hover { text-decoration: underline; }
.cv-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.cv-detail { display: grid; gap: 16px; min-width: 0; }
.cv-detail__meta { display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); color: var(--text-secondary); font-size: 12px; line-height: 19px; }
.cv-detail__meta span { display: inline-flex; align-items: center; gap: 6px; }
.cv-detail__meta strong { color: var(--text-muted); font-weight: 400; }
.cv-detail__meta a { color: var(--action-accent); text-decoration: none; }
.cv-detail__meta a:hover { text-decoration: underline; }
.cv-detail__url { display: inline-flex; align-items: flex-start; gap: 4px; color: var(--action-accent); font-size: 12px; line-height: 18px; text-decoration: none; overflow-wrap: anywhere; }
.cv-detail__url:hover { text-decoration: underline; }
.cv-facts { display: flex; flex-wrap: wrap; gap: 6px; }
.cv-facts span { display: inline-flex; padding: 4px 9px; border: 1px solid var(--border-default); border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; line-height: 18px; }
.cv-questions { display: grid; gap: 14px; }
.cv-question { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-question__head { display: flex; align-items: flex-start; gap: 10px; }
.cv-question__index { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: var(--action-subtle-background); color: var(--action-accent); font-size: 12px; font-weight: 600; }
.cv-question__copy { flex: 1 1 auto; min-width: 0; }
.cv-question__copy h3 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; overflow-wrap: anywhere; }
.cv-question__copy p { margin: 3px 0 0; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-platform-list { display: grid; gap: 8px; }
.cv-platform { padding: 12px; border: 1px solid var(--border-default); border-radius: 9px; background: var(--background-subtle); }
.cv-platform__head { display: flex; align-items: center; gap: 10px; }
.cv-platform__name { color: var(--text-primary); font-size: 13px; font-weight: 600; }
.cv-answer { margin-top: 8px; }
.cv-answer summary { color: var(--text-secondary); font-size: 12px; line-height: 18px; cursor: pointer; }
.cv-answer p { margin: 8px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 21px; white-space: pre-wrap; overflow-wrap: anywhere; }
.cv-citations { display: grid; gap: 7px; margin-top: 10px; }
.cv-citation { display: block; padding: 10px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--background-primary); color: inherit; text-decoration: none; }
.cv-citation:hover { border-color: var(--action-accent); }
.cv-citation:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cv-citation__head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.cv-citation__head strong { color: var(--text-primary); font-size: 12px; line-height: 18px; font-weight: 500; overflow-wrap: anywhere; }
.cv-citation__badge { display: inline-flex; padding: 2px 7px; border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 10px; line-height: 16px; white-space: nowrap; }
.cv-citation__badge.is-primary { color: var(--status-success-foreground); background: var(--status-success-background); }
.cv-citation__domain { display: block; margin-top: 3px; color: var(--text-muted); font-family: var(--font-family-mono); font-size: 10px; line-height: 16px; }
.cv-citation p { margin: 6px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 19px; }
.cv-no-citation { margin: 8px 0 0; }
.cv-footer-task { margin-right: auto; color: var(--action-accent); font-size: 13px; line-height: 20px; text-decoration: none; }
.cv-footer-task:hover { text-decoration: underline; }
.cv-footer-task:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
@media (max-width: 900px) { .cv-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cv-card__head { flex-direction: column; } }
@media (max-width: 560px) { .cv-page { gap: 18px; } .cv-summary { grid-template-columns: 1fr; } .cv-card { padding: 16px; } }
</style>
