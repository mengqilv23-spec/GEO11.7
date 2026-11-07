<script setup lang="ts">
import type { BrandKnowledgeChangeImpact } from './types'
import Button from '../../../ui/ce/button/Button.vue'
import Modal from '../../../ui/ce/modal/Modal.vue'

withDefaults(defineProps<{ open: boolean, impact: BrandKnowledgeChangeImpact | null, pending: boolean, error?: string | null }>(), { error: null })
const emit = defineEmits<{ back: [], confirm: [], retryPreview: [] }>()
</script>

<template>
  <Modal
    class="brand-change-confirm"
    :open="open"
    title="确认修改品牌信息"
    :width="760"
    confirm-text=""
    cancel-text=""
    close-label="返回编辑"
    :processing-text="impact ? '正在确认并更新市场状态…' : '正在获取本次修改影响范围…'"
    :show-cancel="false"
    :loading="pending"
    :confirm-disabled="!impact?.quotaAvailable"
    @close="emit('back')"
  >
    <section class="change-confirm">
      <p class="change-confirm__intro">
        确认修改品牌知识并生成各市场的 AI 推荐问题？
      </p>
      <dl v-if="impact" class="change-confirm__summary">
        <div>
          <dt>影响范围</dt>
          <dd>全部已启用市场（{{ impact.activeMarketCount }} 个），确认后统一暂停</dd>
        </div>
        <div>
          <dt>本次修改</dt>
          <dd>将扣除 {{ impact.editCost }} 次品牌信息修改次数，确认后剩余 {{ impact.remainingEdits }} 次。</dd>
        </div>
        <div>
          <dt>后续处理</dt>
          <dd>到各市场的监测问题列表中选择加入推荐问题，或移出旧问题；未调整的市场保留现有问题。完成后可统一开启全部市场。</dd>
        </div>
        <div>
          <dt>数据对比</dt>
          <dd>新旧口径不做环比。</dd>
        </div>
      </dl>
      <p v-else class="change-confirm__loading" role="status">
        正在获取本次修改影响范围…
      </p>
      <p v-if="impact && !impact.quotaAvailable" class="change-confirm__error" role="alert">
        修改次数不足，暂时无法确认。请返回编辑或联系管理员。
      </p>
      <div v-if="error" class="change-confirm__error" role="alert">
        <span>{{ error }}</span>
        <Button size="xs" variant="outline" :disabled="pending" @click="emit('retryPreview')">
          重试
        </Button>
      </div>
    </section>
    <template #footer>
      <Button size="md" :disabled="pending" @click="emit('back')">
        返回编辑
      </Button>
      <Button class="is-primary" variant="primary" size="md" :disabled="!impact?.quotaAvailable || pending" :loading="pending" @click="emit('confirm')">
        确认修改并暂停市场
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
:global(dialog.ce-modal-root.brand-change-confirm) {
  --modal-inset: 20px;
  --modal-title-font-size: 17px;
  --modal-title-line-height: 24px;
  width: min(760px, calc(100vw - 32px));
}

:global(dialog.ce-modal-root.brand-change-confirm .ce-modal-header) {
  padding-bottom: 12px;
}

:global(dialog.ce-modal-root.brand-change-confirm .ce-modal-footer) {
  gap: 8px;
  padding-top: 4px;
}

.change-confirm {
  display: grid;
  gap: 12px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
}

.change-confirm__intro,
.change-confirm__loading,
.change-confirm__error {
  margin: 0;
}

.change-confirm__intro {
  color: var(--text-secondary);
}

.change-confirm__summary {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--background-subtle);
}

.change-confirm__summary div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
}

.change-confirm__summary dt {
  color: var(--text-muted);
}

.change-confirm__summary dd {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-weight: 550;
  overflow-wrap: anywhere;
}

.change-confirm__loading {
  color: var(--text-secondary);
}

.change-confirm__error {
  color: var(--text-danger, #b42318);
}

div.change-confirm__error { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

@media (max-width: 520px) {
  :global(dialog.ce-modal-root.brand-change-confirm) { --modal-inset: 16px; }
  .change-confirm__summary div { grid-template-columns: 1fr; gap: 2px; padding: 9px 0; }
}
</style>

