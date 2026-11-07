<script setup lang="ts">
import Modal from '../ui/ce/modal/Modal.vue'

defineProps<{
  open: boolean
  scopeLabel: string
  questionCount: number
  platformCount: number
  remaining: number | null
  unlimited: boolean
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'confirm': []
}>()
</script>

<template>
  <Modal
    class="generate-latest-dialog"
    :open="open"
    title="生成最新报告"
    :width="720"
    confirm-text="生成最新报告"
    cancel-text="取消"
    close-label="关闭弹窗"
    processing-text="正在提交生成任务…"
    :loading="loading"
    :confirm-disabled="!unlimited && (remaining === null || remaining <= 0)"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  >
    <div class="generate-latest-dialog__content">
      <p class="generate-latest-dialog__intro">
        基于当前监测配置重新采集数据，生成最新报告。
      </p>

      <dl class="generate-latest-dialog__facts">
        <div class="generate-latest-dialog__fact">
          <dt>市场 × 语言</dt>
          <dd>{{ scopeLabel }}</dd>
        </div>
        <div class="generate-latest-dialog__fact">
          <dt>监测问题</dt>
          <dd>{{ questionCount }} 条</dd>
        </div>
        <div class="generate-latest-dialog__fact">
          <dt>AI 平台</dt>
          <dd>{{ platformCount }} 个</dd>
        </div>
      </dl>

      <p class="generate-latest-dialog__quota" role="status">
        <template v-if="unlimited">
          本月不限次数，本次不会消耗生成权益。
        </template>
        <template v-else-if="remaining !== null">
          本月剩余 {{ remaining }} 次生成权益，本次将消耗 1 次。
        </template>
        <template v-else>
          当前无法确认剩余生成次数，请稍后重试。
        </template>
      </p>

      <p class="generate-latest-dialog__note">
        仅生成监测结果，不启动诊断、策略或优化流程。
      </p>
      <p v-if="error" class="generate-latest-dialog__error" role="alert">
        {{ error }}
      </p>
    </div>
  </Modal>
</template>

<style scoped>
.generate-latest-dialog__content { display: grid; gap: 14px; color: var(--text-secondary); }
:global(.generate-latest-dialog .ce-modal-header) { padding: 18px 20px 12px; }
:global(.generate-latest-dialog .ce-modal-body) { padding: 0 20px 18px; }
:global(.generate-latest-dialog .ce-modal-footer) { padding: 0 20px 18px; }
.generate-latest-dialog__intro { margin: 0; color: var(--text-primary); font-size: 15px; line-height: 1.5; }
.generate-latest-dialog__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; }
.generate-latest-dialog__fact { display: grid; min-width: 0; gap: 6px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-subtle); }
.generate-latest-dialog__fact dt { color: var(--text-muted); font-size: 12px; }
.generate-latest-dialog__fact dd { margin: 0; color: var(--text-primary); font-size: 16px; font-weight: 600; }
.generate-latest-dialog__quota { margin: 0; padding: 12px; border: 1px solid var(--action-accent); border-radius: var(--radius-control); color: var(--action-accent); background: var(--action-subtle-background); font-size: 13px; line-height: 1.5; }
.generate-latest-dialog__note { margin: 0; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.generate-latest-dialog__error { margin: 0; color: var(--status-error-foreground, #b91c1c); font-size: 14px; line-height: 1.5; }
@media (max-width: 640px) { .generate-latest-dialog__facts { grid-template-columns: 1fr; } }
</style>

