<script setup lang="ts">
import type { BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { computed } from 'vue'
import Button from '../../../ui/ce/button/Button.vue'
import Modal from '../../../ui/ce/modal/Modal.vue'
import Spinner from '../../../ui/ce/spinner/Spinner.vue'

const props = withDefaults(defineProps<{
  open: boolean
  snapshot?: BrandKnowledgeUpdateSnapshot | null
  pendingAction?: string | null
  error?: string | null
}>(), { snapshot: null, pendingAction: null, error: null })

const emit = defineEmits<{
  processMarket: [marketId: string]
  enableAll: []
  close: []
  retry: []
}>()

const allMarketsPaused = computed(() => {
  const markets = props.snapshot?.markets ?? []
  return markets.length > 0 && markets.every(market => !market.enabled)
})
const allMarketsEnabled = computed(() => {
  const markets = props.snapshot?.markets ?? []
  return markets.length > 0 && markets.every(market => market.enabled)
})

function pendingCount(market: MarketRecommendationState): number {
  return Math.max(0, market.candidates.length - market.selectedCandidateIds.length)
}
</script>

<template>
  <Modal
    class="market-recommendation-list"
    :open="open"
    title="各市场监测问题"
    :width="720"
    :footer="null"
    confirm-text=""
    cancel-text=""
    close-label="关闭市场列表"
    processing-text="正在更新市场状态…"
    :show-cancel="false"
    :loading="pendingAction === 'enable-all'"
    @close="emit('close')"
  >
    <div class="market-list">
      <p class="market-list__intro">
        品牌知识已保存，推荐问题按市场分别生成。加入或移出问题都在对应市场的“监测问题”列表中操作。
      </p>

      <div v-if="error" class="market-list__error" role="alert">
        <span>{{ error }}</span>
        <Button size="xs" variant="outline" aria-label="重试市场操作" @click="emit('retry')">
          重试
        </Button>
      </div>

      <div v-if="snapshot?.markets.length" class="market-list__rows">
        <article v-for="market in snapshot.markets" :key="market.id" class="market-row">
          <div class="market-row__main">
            <div class="market-row__title">
              <h3>{{ market.name }}</h3>
              <span class="market-row__status" :class="market.enabled ? 'is-enabled' : 'is-paused'">
                <span class="market-row__status-dot" aria-hidden="true" />
                {{ market.enabled ? '已启用' : '已暂停' }}
              </span>
            </div>
            <p class="market-row__meta">
              <template v-if="market.processed">
                已处理 · 已加入 {{ market.selectedCandidateIds.length }} 条推荐问题
              </template>
              <template v-else>
                待处理 · {{ pendingCount(market) }} 条推荐问题
              </template>
              <span v-if="market.candidates.length === 0 && !market.processed"> · 暂无候选</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            :aria-label="`处理${market.name}的推荐问题`"
            :disabled="Boolean(pendingAction)"
            @click="emit('processMarket', market.id)"
          >
            {{ market.processed ? '查看已选问题' : '处理监测问题' }}
          </Button>
        </article>
      </div>
      <div v-else-if="snapshot" class="market-list__empty" role="status">
        <strong>当前没有需要处理的市场</strong>
        <span>市场状态已由服务同步。</span>
      </div>
      <p v-else class="market-list__loading" role="status">
        <Spinner variant="ring" aria-hidden="true" />
      </p>

      <div v-if="snapshot?.markets.length" class="market-list__footer">
        <p v-if="allMarketsPaused">
          未调整的市场保留现有监测问题。所有市场当前已暂停，可通过统一入口一次开启全部市场。
        </p>
        <p v-else-if="allMarketsEnabled">
          未调整的市场保留现有监测问题。所有市场当前已开启。
        </p>
        <p v-else>
          未调整的市场保留现有监测问题。可通过统一入口开启已暂停市场。
        </p>
        <Button class="is-primary" variant="primary" size="sm" :disabled="Boolean(pendingAction) || allMarketsEnabled" :loading="pendingAction === 'enable-all'" @click="emit('enableAll')">
          {{ allMarketsEnabled ? '全部市场已开启' : '开启全部市场' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:global(dialog.ce-modal-root.market-recommendation-list) {
  --modal-inset: 20px;
  --modal-title-font-size: 17px;
  --modal-title-line-height: 24px;
  width: min(720px, calc(100vw - 32px));
  max-height: min(680px, calc(100vh - 32px));
}

:global(dialog.ce-modal-root.market-recommendation-list .ce-modal) {
  max-height: min(680px, calc(100vh - 32px));
}

:global(dialog.ce-modal-root.market-recommendation-list .ce-modal-header) {
  padding-bottom: 10px;
}

:global(dialog.ce-modal-root.market-recommendation-list .ce-modal-body) {
  padding-bottom: 20px;
}

.market-list {
  display: grid;
  gap: 14px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}

.market-list__intro,
.market-list__footer p,
.market-row__meta {
  margin: 0;
  color: var(--text-secondary);
}

.market-list__loading { display: flex; min-height: 64px; align-items: center; justify-content: center; --spinner-color: var(--action-accent); }

.market-list__rows {
  display: grid;
  gap: 12px;
}

.market-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: var(--background-subtle);
}

.market-row__main {
  min-width: 0;
}

.market-row__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.market-row__title h3 {
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 620;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.market-row__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.market-row__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
}

.market-row__status.is-enabled .market-row__status-dot { background: var(--status-success, #16845b); }
.market-row__status.is-paused .market-row__status-dot { background: var(--status-warning, #c17c16); }
.market-row__meta { margin-top: 4px; font-size: var(--font-size-caption); line-height: var(--line-height-caption); overflow-wrap: anywhere; }

.market-list__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--background-subtle);
  color: var(--text-secondary);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.market-list__empty {
  display: grid;
  gap: 4px;
  padding: 20px 0;
  color: var(--text-secondary);
}

.market-list__empty strong { color: var(--text-primary); font-weight: 600; }
.market-list__empty span { color: var(--text-muted); font-size: var(--font-size-body); line-height: var(--line-height-body); }

.market-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
}

.market-list__footer p { min-width: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }

@media (max-width: 560px) {
  :global(dialog.ce-modal-root.market-recommendation-list) { --modal-inset: 16px; }
  .market-row { align-items: flex-start; gap: 10px; }
  .market-row :deep(.ce-button) { flex: 0 0 auto; }
  .market-list__footer { align-items: stretch; flex-direction: column; }
}
</style>

