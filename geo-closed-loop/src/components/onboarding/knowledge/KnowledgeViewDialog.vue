<script setup lang="ts">
import type { KnowledgeItem } from '../../../types'
import { shallowRef, watch } from 'vue'
import { Button, Modal } from '../../ui/ce'
import KnowledgeReadOnlyPanel from './KnowledgeReadOnlyPanel.vue'

type KnowledgeViewTab = 'brand' | 'product' | 'market' | 'competitor'

const props = defineProps<{
  items: KnowledgeItem[]
  initialTab: string | undefined
}>()

const open = defineModel<boolean>('open', { default: false })
const tabs: Array<{ id: KnowledgeViewTab, label: string, itemId: string }> = [
  { id: 'brand', label: '品牌信息', itemId: 'brand' },
  { id: 'product', label: '核心产品', itemId: 'product' },
  { id: 'market', label: '市场与语言', itemId: 'market' },
  { id: 'competitor', label: '竞争对手', itemId: 'competitor' },
]
const activeTab = shallowRef<KnowledgeViewTab>('brand')

function resetTab(tab: string | undefined) {
  activeTab.value = tabs.some(item => item.id === tab) ? tab as KnowledgeViewTab : 'brand'
}

watch([open, () => props.initialTab], ([isOpen, tab]) => {
  if (isOpen)
    resetTab(tab)
})

function itemFor(tab: KnowledgeViewTab) {
  const itemId = tabs.find(item => item.id === tab)?.itemId
  return props.items.find(item => item.id === itemId)
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  let targetIndex: number | undefined
  if (event.key === 'ArrowRight')
    targetIndex = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft')
    targetIndex = (index - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home')
    targetIndex = 0
  else if (event.key === 'End')
    targetIndex = tabs.length - 1
  if (targetIndex === undefined)
    return
  event.preventDefault()
  activeTab.value = tabs[targetIndex].id
  document.getElementById(`knowledge-view-tab-${activeTab.value}`)?.focus()
}
</script>

<template>
  <Modal
    v-model:open="open"
    class="knowledge-view-modal"
    title="查看品牌知识"
    width="min(560px, calc(100vw - 32px))"
    :footer="undefined"
    :show-close="false"
    confirm-text="关闭"
    cancel-text="关闭"
    processing-text="关闭中…"
    close-label="关闭品牌知识查看"
  >
    <div class="knowledge-view">
      <nav class="knowledge-view__tabs" role="tablist" aria-label="品牌知识分类">
        <button
          v-for="(tab, index) in tabs"
          :id="`knowledge-view-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          class="knowledge-view__tab"
          :class="{ 'knowledge-view__tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`knowledge-view-panel-${tab.id}`"
          @click="activeTab = tab.id"
          @keydown="handleTabKeydown($event, index)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="knowledge-view__content">
        <section
          v-for="tab in tabs"
          v-show="activeTab === tab.id"
          :id="`knowledge-view-panel-${tab.id}`"
          :key="tab.id"
          class="knowledge-view__panel"
          role="tabpanel"
          :aria-labelledby="`knowledge-view-tab-${tab.id}`"
          tabindex="0"
        >
          <KnowledgeReadOnlyPanel :item="itemFor(tab.id)" />
        </section>
      </div>
    </div>

    <template #footer>
      <Button class="knowledge-view__close" variant="primary" @click="open = false">
        关闭
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.knowledge-view { min-width: 0; }
.knowledge-view__tabs { display: flex; gap: 22px; overflow-x: auto; border-bottom: 1px solid #e9edf4; }
.knowledge-view__tab { position: relative; flex: 0 0 auto; min-width: 0; min-height: 38px; padding: 8px 2px 9px; border: 0; color: #74839a; background: transparent; font: inherit; font-size: 14px; line-height: 20px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.knowledge-view__tab:hover { color: #263b5a; }
.knowledge-view__tab:focus-visible { z-index: 1; outline: 2px solid var(--focus-ring); outline-offset: -3px; }
.knowledge-view__tab--active { color: var(--action-accent); background: #fff; }
.knowledge-view__tab--active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--action-accent); content: ''; }
.knowledge-view__content { padding-top: 8px; }
.knowledge-view__panel { min-width: 0; outline: none; }
:global(dialog.ce-modal-root.knowledge-view-modal) { --modal-inset: 16px; --modal-title-font-size: 16px; --modal-title-line-height: 22px; --modal-title-font-weight: 600; --modal-foreground: #263b5a; width: min(560px, calc(100vw - 32px)); max-height: min(620px, calc(100vh - 40px)); }
:global(dialog.ce-modal-root.knowledge-view-modal .ce-modal) { max-height: min(620px, calc(100vh - 40px)); }
:global(dialog.ce-modal-root.knowledge-view-modal .ce-modal-header) { padding-bottom: 8px; }
:global(dialog.ce-modal-root.knowledge-view-modal .ce-modal-footer) { padding-top: 14px; }
:global(dialog.ce-modal-root.knowledge-view-modal .knowledge-view__close) { min-height: 32px; padding-inline: 12px; font-size: 14px; }
@media (max-width: 520px) {
  .knowledge-view__tabs { gap: 16px; }
  .knowledge-view__tab { font-size: 12px; }
  :global(dialog.ce-modal-root.knowledge-view-modal) { --modal-inset: 12px; }
}
</style>

