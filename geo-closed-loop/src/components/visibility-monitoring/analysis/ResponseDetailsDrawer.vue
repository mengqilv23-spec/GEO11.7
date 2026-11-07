<script setup lang="ts">
import { watch } from 'vue'
import { useRoundResponses } from '../../../composables/use-round-responses'
import Drawer from '../../ui/ce/drawer/Drawer.vue'
import Spinner from '../../ui/ce/spinner/Spinner.vue'

const props = defineProps<{
  open: boolean
  roundId: number
  questionId: number
  questionText: string
}>()
const emit = defineEmits<{ close: [] }>()
const responses = useRoundResponses()

watch(() => [props.open, props.roundId, props.questionId] as const, ([open, roundId, questionId]) => {
  if (open)
    void responses.open(roundId, questionId)
  else
    responses.close()
}, { immediate: true })

function platformName(platform: string | null | undefined) {
  if (!platform)
    return '平台未返回'
  return ({ chatgpt: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity', google_ai: 'Google AI', claude: 'Claude', copilot: 'Copilot' } as Record<string, string>)[platform.toLowerCase()] ?? platform
}

function collectStatus(status: number) {
  return ({ 1: '有效回答', 2: '无效回答', 3: '采集失败' } as Record<number, string>)[status] ?? '未知状态'
}

function judged(value: number | null | undefined, yes = '是', no = '否') {
  return value === 1 ? yes : value === 0 ? no : '待判定'
}

function tendency(value: number | null | undefined) {
  return value === 1 ? '推荐' : value === -1 ? '不推荐' : value === 0 ? '中性' : '待判定'
}

function sentiment(value: number | null | undefined) {
  return value === 1 ? '正面' : value === -1 ? '负面' : value === 0 ? '中性' : '未判定'
}
</script>

<template>
  <Drawer :open="open" :title="questionText || '监测回答详情'" eyebrow="本轮真实采集记录" description="回答、引用及判定数据均来自当前轮次接口；未返回字段按待判定或暂无展示。" :size="900" close-label="关闭回答详情" @close="emit('close')" @update:open="value => !value && emit('close')">
    <div class="round-responses">
      <section class="response-list" aria-label="本题采集记录">
        <header><h3>采集记录</h3><span>共 {{ responses.page.value.total }} 条</span></header>
        <p v-if="responses.listLoading.value && !responses.page.value.records.length" role="status">
          正在加载采集记录…
        </p>
        <p v-else-if="responses.listError.value" class="is-error" role="alert">
          {{ responses.listError.value }} <button type="button" @click="responses.open(roundId, questionId)">
            重试
          </button>
        </p>
        <p v-else-if="!responses.page.value.records.length" class="is-empty">
          当前问题在本轮没有采集记录。
        </p>
        <div v-else class="response-list__scroll" role="region" tabindex="0" aria-label="采集记录列表，可纵向滚动">
          <table>
            <thead><tr><th>平台</th><th>采集状态</th><th>提及</th><th>重复序号</th><th>采集时间</th><th>详情</th></tr></thead>
            <tbody>
              <tr v-for="record in responses.page.value.records" :key="record.id">
                <td>{{ platformName(record.platform) }}</td>
                <td>{{ collectStatus(record.collectStatus) }}<small v-if="record.failReason">{{ record.failReason }}</small></td>
                <td>{{ judged(record.isMentioned) }}</td><td>{{ record.repeatNo ?? '—' }}</td><td>{{ record.collectTime || '—' }}</td>
                <td>
                  <button type="button" :data-response-id="record.id" @click="responses.loadDetail(record.id)">
                    查看回答
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button v-if="responses.hasMore.value" class="load-more" type="button" :disabled="responses.listLoading.value" :aria-busy="responses.listLoading.value" @click="responses.loadMore()">
          <Spinner v-if="responses.listLoading.value" variant="ring" aria-hidden="true" />
          加载更多
        </button>
      </section>

      <section v-if="responses.detailLoading.value || responses.detailError.value || responses.detail.value" class="response-detail" aria-label="回答原文详情">
        <p v-if="responses.detailLoading.value" role="status">
          正在加载回答详情…
        </p>
        <p v-else-if="responses.detailError.value" class="is-error" role="alert">
          {{ responses.detailError.value }}
        </p>
        <template v-else-if="responses.detail.value">
          <header><div><h3>{{ platformName(responses.detail.value.platform) }} · 原始回答</h3><p>{{ responses.detail.value.modelVersion || '模型版本未返回' }} · {{ responses.detail.value.collectTime || '采集时间未返回' }}</p></div><span>{{ collectStatus(responses.detail.value.collectStatus) }}</span></header>
          <p v-if="responses.detail.value.failReason" class="response-failure">
            {{ responses.detail.value.failReason }}
          </p>
          <div class="response-judgments">
            <span>我方提及：{{ judged(responses.detail.value.isMentioned) }}</span>
            <span>推荐倾向：{{ tendency(responses.detail.value.recommendTendency) }}</span>
            <span>官网引用：{{ judged(responses.detail.value.isOfficialCited) }}</span>
            <span>事实判断：{{ responses.detail.value.factStatus === 1 ? '正确' : responses.detail.value.factStatus === -1 ? '错误' : responses.detail.value.factStatus === 0 ? '无法判断' : '未返回' }}</span>
            <span>情感：{{ sentiment(responses.detail.value.sentiment) }}</span>
            <span>位次：{{ responses.detail.value.hasRank === 1 && responses.detail.value.brandRank != null ? `第 ${responses.detail.value.brandRank} 位 / ${responses.detail.value.rankTotal ?? '—'}` : '未返回' }}</span>
          </div>
          <h4>原始 Prompt</h4><pre>{{ responses.detail.value.promptContent || '接口未返回 Prompt' }}</pre>
          <h4>回答正文</h4><pre>{{ responses.detail.value.responseContent || '接口未返回回答正文' }}</pre>
          <h4>引用链接（{{ responses.detail.value.citationLinks?.length ?? 0 }}）</h4>
          <ul v-if="responses.detail.value.citationLinks?.length">
            <li v-for="(citation, index) in responses.detail.value.citationLinks" :key="`${citation.url}-${index}`">
              <a :href="citation.url" target="_blank" rel="noreferrer">{{ citation.title || citation.url }}</a><small>{{ citation.url }}</small>
            </li>
          </ul>
          <p v-else class="is-empty">
            该回答没有返回引用链接。
          </p>
          <h4>竞品命中（{{ responses.detail.value.competitorHits?.length ?? 0 }}）</h4>
          <ul v-if="responses.detail.value.competitorHits?.length">
            <li v-for="(hit, index) in responses.detail.value.competitorHits" :key="`${hit.competitorId}-${index}`">
              {{ hit.competitorName }} · 提及 {{ hit.mentionCount ?? '—' }} 次 · {{ tendency(hit.recommendTendency) }} · {{ judged(hit.isOfficialCited, '引用官网') }}
            </li>
          </ul>
          <p v-else class="is-empty">
            接口未返回竞品命中记录。
          </p>
          <a v-if="responses.detail.value.htmlSnapshotUrl" :href="responses.detail.value.htmlSnapshotUrl" target="_blank" rel="noreferrer">打开平台 HTML 快照</a>
        </template>
      </section>
    </div>
  </Drawer>
</template>

<style scoped>
.round-responses { display: grid; gap: 18px; min-width: 0; }
.response-list,.response-detail { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); color: var(--text-primary); }
.response-list header,.response-detail header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: var(--text-secondary); }
h3 { margin: 0; font-size: 15px; }
.response-list header span,.response-detail header span,.response-detail header p { color: var(--text-muted); font-size: 12px; }
.response-detail header p { margin: 4px 0 0; }
.response-list__scroll { max-height: 360px; overflow: auto; border: 1px solid var(--border-default); border-radius: 9px; }
table { width: 100%; min-width: 700px; border-collapse: collapse; text-align: left; }
thead { position: sticky; top: 0; background: var(--background-subtle); color: var(--text-secondary); }
th,td { padding: 10px 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
td small { display: block; max-width: 220px; margin-top: 4px; color: var(--status-error-foreground); }
button { padding: 5px 9px; border: 1px solid var(--border-default); border-radius: 7px; color: var(--action-accent); background: var(--background-primary); font: inherit; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
.load-more { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px auto 0; --spinner-size: 16px; --spinner-color: currentColor; }
.is-empty,.is-error { margin: 0; padding: 12px; color: var(--text-muted); }
.is-error,.response-failure { color: var(--status-error-foreground); }
.response-detail { display: grid; gap: 8px; }
.response-detail h4 { margin: 10px 0 0; font-size: 13px; }
.response-detail pre { max-height: 360px; overflow: auto; margin: 0; padding: 12px; border-radius: 8px; background: var(--background-subtle); color: var(--text-primary); font: inherit; font-size: 13px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.response-detail ul { display: grid; gap: 8px; margin: 0; padding-left: 20px; color: var(--text-secondary); }
.response-detail li small { display: block; overflow-wrap: anywhere; color: var(--text-muted); }
.response-detail a { color: var(--action-accent); overflow-wrap: anywhere; }
.response-judgments { display: flex; flex-wrap: wrap; gap: 8px; }
.response-judgments span { padding: 4px 8px; border-radius: 999px; background: var(--background-subtle); color: var(--text-secondary); font-size: 12px; }
</style>

