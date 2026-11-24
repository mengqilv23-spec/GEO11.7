<script setup lang="ts">
import type { ContentProductionGroup, ContentProductionItem, ContentProductionStage } from '../data/content-production-data'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { getActivePlan } from '../api/geo-config'
import ContentProductionCreateDrawer from '../components/content-verification/ContentProductionCreateDrawer.vue'
import ContentProductionDetailDrawer from '../components/content-verification/ContentProductionDetailDrawer.vue'
import Button from '../components/ui/ce/button/Button.vue'
import Toast from '../components/ui/ce/toast/Toast.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import {
  contentProductionSummary,
  contentStageGroup,
  contentStageGroupLabel,
  monthlyContentLimitForPlan,
} from '../data/content-production-data'
import { contentVerificationRounds } from '../data/content-verification-data'
import { useContentProductionStore } from '../stores/content-production'

type ContentFilter = 'all' | ContentProductionGroup

const store = useContentProductionStore()
const selectedId = shallowRef<string | null>(null)
const createOpen = ref(false)
const filter = ref<ContentFilter>('all')
const contentLimit = ref(20)
const planName = ref('专业版')
const toastOpen = ref(false)
const toastMessage = ref('')
const toastMessageId = ref(0)
const toastVariant = ref<'success' | 'warning' | 'error'>('success')

const items = computed(() => [...store.state.items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
const verifiedItems = computed(() => items.value.filter(item => item.stage === 'verified'))
const summary = computed(() => contentProductionSummary(items.value, contentLimit.value))
const progress = computed(() => `${Math.min(100, Math.round((summary.value.published / Math.max(1, summary.value.contentLimit)) * 100))}%`)
const canCreate = computed(() => !summary.value.exhausted)
const availableRounds = computed(() => contentVerificationRounds)
const activeRoundId = ref('all')
const isRoundView = computed(() => activeRoundId.value !== 'all')
const selectedItem = computed(() => selectedId.value ? store.findItem(selectedId.value) ?? null : null)

const filterTabs: Array<{ id: ContentFilter, label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'confirm', label: '待确认' },
  { id: 'verify', label: '待核验' },
  { id: 'verified', label: '已核验' },
]

const filteredItems = computed<ContentProductionItem[]>(() => {
  // A specific round is a read-only archive of that round's verified results.
  if (isRoundView.value)
    return verifiedItems.value.filter(item => item.roundId === activeRoundId.value)
  if (filter.value !== 'all')
    return items.value.filter(item => contentStageGroup(item.stage) === filter.value)
  return items.value
})

const listDescription = computed(() => isRoundView.value
  ? '历史检测轮次仅展示已完成的核验结果，只能查看。'
  : '发布前完成 AI 检查与内容确认；发布后生成核验问题，内容生效 48 小时后可开始核验。')

onMounted(async () => {
  try {
    const plan = await getActivePlan()
    contentLimit.value = plan.quota.monthlyContentLimit ?? monthlyContentLimitForPlan(plan.quota.planCode, plan.quota.planName)
    planName.value = plan.quota.planName
  }
  catch {
    contentLimit.value = 20
  }
})

function openCreate() {
  if (!canCreate.value) {
    notify('核验文章额度已用完，请先完成进行中的文章。', 'warning')
    return
  }
  createOpen.value = true
}

function handleCreated(itemId: string) {
  createOpen.value = false
  selectedId.value = itemId
}

function openItem(item: ContentProductionItem) {
  selectedId.value = item.id
}

function closeDetail() {
  selectedId.value = null
}

function notify(message: string, variant: 'success' | 'warning' | 'error' = 'success') {
  toastMessage.value = message
  toastVariant.value = variant
  toastMessageId.value += 1
  toastOpen.value = true
}

function closeToast() {
  toastOpen.value = false
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}

function actionLabel(stage: ContentProductionStage) {
  const labels: Record<ContentProductionStage, string> = {
    draft: '继续编辑',
    ai_checked: '内容确认',
    ready_to_publish: '发布 Blog',
    questions_pending: '选择问题',
    questions_confirmed: '开始核验',
    verifying: '核验中',
    verified: '查看核验',
  }
  return labels[stage]
}
</script>

<template>
  <div class="geo-page cv-page">
    <GeoPageIntro
      title="品牌内容核验"
      help-label="品牌内容核验说明"
      description="从 AI 写稿、内容确认、官网 Blog 发布到核验问题生成，记录每篇内容是否被 AI 引用。"
    >
      <template #actions>
        <Button type="button" variant="primary" :disabled="!canCreate" data-test="create-content" @click="openCreate">
          AI 写核验文章
        </Button>
      </template>
    </GeoPageIntro>

    <section class="cv-overview" aria-label="品牌内容核验概览">
      <article class="cv-quota" :class="{ 'is-exhausted': summary.exhausted }" aria-label="核验文章额度">
        <div class="cv-quota__main">
          <div class="cv-quota__copy">
            <span>已发布的内容</span>
            <strong>{{ summary.published }}<small>/ {{ summary.contentLimit }}</small></strong>
          </div>
          <div class="cv-quota__bar" role="progressbar" :aria-valuenow="summary.published" :aria-valuemin="0" :aria-valuemax="summary.contentLimit">
            <span :style="{ width: progress }" />
          </div>
        </div>
        <div class="cv-quota__side">
          <span>{{ planName }} · 共 {{ summary.contentLimit }} 篇</span>
          <small>按已发布到官网 Blog 累计</small>
        </div>
      </article>
      <article class="cv-stat">
        <span>剩余可发布</span>
        <strong>{{ summary.remaining }}</strong>
        <small>总额度内剩余篇数</small>
      </article>
      <article class="cv-stat">
        <span>已核验的内容</span><strong>{{ summary.verified }}</strong><small>已完成 AI 引用核验</small>
      </article>
    </section>
    <p v-if="summary.exhausted" class="cv-quota-note">
      核验文章额度已用完，仍可继续完成已创建的文章。
    </p>

    <div class="cv-list-meta">
      <label class="cv-round-select">
        <span>检测轮次</span>
        <select v-model="activeRoundId" aria-label="筛选检测轮次">
          <option value="all">
            全部
          </option>
          <option v-for="round in availableRounds" :key="round.id" :value="round.id">
            {{ round.label }} · {{ formatDate(round.date) }}
          </option>
        </select>
      </label>
    </div>

    <section class="cv-card">
      <div class="cv-card__head">
        <div>
          <h2>核验文章清单</h2>
          <p>{{ listDescription }}</p>
        </div>
        <div v-if="!isRoundView" class="cv-filter" role="tablist" aria-label="筛选核验文章">
          <button
            v-for="tab in filterTabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="filter === tab.id"
            :class="{ 'is-active': filter === tab.id }"
            @click="filter = tab.id"
          >
            {{ tab.label }}
          </button>
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
                任务序号
              </th>
              <th scope="col">
                内容
              </th>
              <th scope="col">
                状态
              </th>
              <th scope="col">
                核验问题
              </th>
              <th scope="col">
                发布状态
              </th>
              <th scope="col">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filteredItems"
              :key="item.id"
              :data-task-id="item.taskId"
              :data-content-id="item.id"
            >
              <td class="cv-index">
                {{ index + 1 }}
              </td>
              <td class="cv-task-id">
                {{ item.taskId ?? item.id }}
              </td>
              <td class="cv-content-cell">
                <button class="cv-title" type="button" @click="openItem(item)">
                  {{ item.title }}
                </button>
                <small v-if="item.brief.theme && !item.title.includes(item.brief.theme)">{{ item.brief.theme }}</small>
              </td>
              <td>
                <span class="cv-stage" :class="`is-${contentStageGroup(item.stage)}`">{{ contentStageGroupLabel(item.stage) }}</span>
              </td>
              <td class="cv-question-cell">
                <p v-if="item.questions.length" class="cv-question-text">
                  {{ item.questions[0]?.question }}
                </p>
                <span v-else class="cv-muted">{{ item.publishedAt ? '待选择' : '发布后生成' }}</span>
              </td>
              <td>
                <span v-if="item.publishedAt" class="cv-publish-status">已发布 {{ formatDate(item.publishedAt) }}</span>
                <span v-else-if="item.publishError" class="cv-publish-status is-failed">发布失败</span>
                <span v-else class="cv-muted">未发布</span>
              </td>
              <td>
                <button class="cv-link" type="button" @click="openItem(item)">
                  {{ actionLabel(item.stage) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!filteredItems.length" class="cv-empty">
        {{ isRoundView ? '当前检测轮次没有已完成的核验结果。' : '当前筛选下没有内容。' }}
      </div>
    </section>

    <ContentProductionCreateDrawer
      :open="createOpen"
      @close="createOpen = false"
      @created="handleCreated"
    />
    <ContentProductionDetailDrawer
      :open="!!selectedItem"
      :item="selectedItem"
      :historical="isRoundView"
      @close="closeDetail"
      @notify="notify"
    />
    <Toast :open="toastOpen" :message-id="toastMessageId" :variant="toastVariant" close-label="关闭提示" @close="closeToast">
      {{ toastMessage }}
    </Toast>
  </div>
</template>

<style scoped>
.cv-page { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.cv-overview { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 12px; }
.cv-quota { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-width: 0; padding: 16px 18px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-quota.is-exhausted { border-color: #f59e0b; background: #fffbeb; }
.cv-quota__main { display: flex; flex: 1 1 auto; align-items: center; gap: 14px; min-width: 0; }
.cv-quota__copy { display: grid; gap: 2px; min-width: 0; }
.cv-quota__copy > span { color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cv-quota__copy strong { color: var(--text-primary); font-size: 28px; line-height: 34px; font-weight: 600; font-variant-numeric: tabular-nums; }
.cv-quota__copy small { margin-left: 2px; color: var(--text-muted); font-size: 14px; font-weight: 400; }
.cv-quota__bar { flex: 1 1 56px; height: 8px; overflow: hidden; border-radius: 999px; background: var(--background-subtle); }
.cv-quota__bar span { display: block; height: 100%; border-radius: inherit; background: var(--action-accent); transition: width 180ms ease; }
.cv-quota__side { display: grid; flex: 0 0 auto; gap: 2px; text-align: right; }
.cv-quota__side span { color: var(--text-primary); font-size: 12px; line-height: 18px; font-weight: 500; }
.cv-quota__side small { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-quota-note { margin: -16px 0 0; color: #b45309; font-size: 12px; line-height: 19px; }
.cv-list-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 12px 16px; margin: -10px 0 0; }
.cv-round-select { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cv-round-select select { height: 32px; padding: 0 30px 0 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 12px; cursor: pointer; }
.cv-round-select select:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cv-stat { display: grid; gap: 6px; min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-stat > span { color: var(--text-secondary); font-size: 12px; }
.cv-stat strong { color: var(--text-primary); font-size: 26px; line-height: 34px; font-weight: 600; }
.cv-stat small { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-card { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.cv-card__head h2 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.cv-card__head p { margin: 4px 0 0; color: var(--text-secondary); }
.cv-filter { display: flex; flex-wrap: wrap; gap: 4px; padding: 3px; border: 1px solid var(--border-default); border-radius: 9px; background: var(--background-subtle); }
.cv-filter button { padding: 5px 9px; border: 0; border-radius: 6px; color: var(--text-secondary); background: transparent; font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; }
.cv-filter button:hover { color: var(--text-primary); background: var(--background-primary); }
.cv-filter button.is-active { color: var(--action-accent); background: var(--background-primary); box-shadow: 0 1px 2px rgb(15 23 42 / 8%); font-weight: 600; }
.cv-filter button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cv-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
table { width: 100%; min-width: 1060px; border-collapse: collapse; text-align: left; }
thead { color: var(--text-secondary); background: var(--background-subtle); }
th, td { padding: 12px; border-bottom: 1px solid var(--border-default); vertical-align: middle; }
th { font-weight: 600; white-space: nowrap; }
tbody tr:last-child td { border-bottom: 0; }
.cv-index { width: 56px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.cv-task-id { width: 100px; color: var(--text-secondary); font-size: 12px; line-height: 18px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.cv-content-cell { min-width: 280px; }
.cv-title { display: block; max-width: 100%; padding: 0; border: 0; color: var(--text-primary); background: none; font: inherit; font-size: 13px; line-height: 20px; font-weight: 500; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.cv-title:hover { color: var(--action-accent); }
.cv-title:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cv-content-cell small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.cv-stage { display: inline-flex; padding: 3px 8px; border-radius: 999px; color: var(--text-secondary); background: var(--background-subtle); font-size: 11px; line-height: 17px; white-space: nowrap; }
.cv-stage.is-active { color: #1d4ed8; background: #dbeafe; }
.cv-stage.is-confirm { color: #92400e; background: #fef3c7; }
.cv-stage.is-verify { color: #6d28d9; background: #ede9fe; }
.cv-stage.is-verified { color: #166534; background: #dcfce7; }
.cv-question-cell { min-width: 260px; max-width: 360px; }
.cv-question-text { margin: 0; color: var(--text-primary); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.cv-publish-status { color: var(--text-secondary); font-size: 12px; line-height: 18px; white-space: nowrap; }
.cv-publish-status.is-failed { color: var(--status-error-foreground); }
.cv-muted { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-link { padding: 0; color: var(--action-accent); background: none; border: 0; font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; }
.cv-link:hover { text-decoration: underline; }
.cv-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.cv-empty { padding: 24px 12px 8px; color: var(--text-muted); font-size: 12px; line-height: 19px; text-align: center; }
@media (max-width: 900px) { .cv-card__head { flex-direction: column; } .cv-quota__side { text-align: left; } .cv-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cv-quota { grid-column: 1 / -1; } }
@media (max-width: 560px) { .cv-page { gap: 18px; } .cv-overview { grid-template-columns: 1fr; } .cv-quota { grid-column: auto; } .cv-card { padding: 16px; } }
</style>
