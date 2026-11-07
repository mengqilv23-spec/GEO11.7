<script setup lang="ts">
import type { getReportSectionLabels } from '../../data/report-detail-data'
import { ref, watch } from 'vue'
import Modal from '../ui/ce/modal/Modal.vue'

type ReportSection = ReturnType<typeof getReportSectionLabels>[number]

const props = defineProps<{
  open: boolean
  sections: readonly ReportSection[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'export': [payload: { format: 'pdf' | 'html', sections: string[] }]
}>()

const selectedSections = ref<string[]>(props.open ? props.sections.map(([id]) => id) : [])

watch(() => props.open, (open) => {
  if (open)
    selectedSections.value = props.sections.map(([id]) => id)
})

function exportReport(format: 'pdf' | 'html') {
  if (!selectedSections.value.length)
    return

  emit('export', { format, sections: [...selectedSections.value] })
  emit('update:open', false)
}
</script>

<template>
  <Modal
    :open="open"
    title="选择导出内容"
    :width="584"
    confirm-text="导出"
    cancel-text="取消"
    close-label="关闭导出弹窗"
    processing-text="正在准备导出内容…"
    @update:open="emit('update:open', $event)"
  >
    <p class="export-description">
      未勾选的章节不会出现在 PDF 或下载的 HTML 中。
    </p>
    <fieldset class="export-sections">
      <legend class="visually-hidden">
        选择要导出的报告章节
      </legend>
      <label v-for="[id, label] in sections" :key="id" class="export-section-option">
        <input v-model="selectedSections" type="checkbox" :value="id">
        <span>{{ label }}</span>
      </label>
    </fieldset>
    <template #footer>
      <div class="export-actions">
        <button type="button" class="export-action export-action--secondary" :disabled="!selectedSections.length" @click="exportReport('pdf')">
          导出 PDF
        </button>
        <button type="button" class="export-action export-action--primary" :disabled="!selectedSections.length" @click="exportReport('html')">
          下载 HTML
        </button>
      </div>
    </template>
  </Modal>
</template>

<style>
.export-description { margin: 0 0 14px; color: #7c8999; font-size: 14px; }
.export-sections { display: grid; gap: 2px; margin: 0; padding: 0; border: 0; }
.export-section-option { display: flex; min-height: 46px; align-items: center; gap: 12px; color: #39475a; font-size: 15px; cursor: pointer; }
.export-section-option input { width: 18px; height: 18px; accent-color: #2563eb; }
.export-actions { display: grid; width: 100%; grid-template-columns: 1fr 1fr; gap: 12px; }
.export-action { min-height: 44px; border: 1px solid #d8e2ee; border-radius: 9px; background: #fff; color: #39475a; font: inherit; font-weight: 650; cursor: pointer; }
.export-action--primary { border-color: #2563eb; background: #2563eb; color: #fff; }
.export-action:hover:not(:disabled) { border-color: #93c5fd; }
.export-action--primary:hover:not(:disabled) { background: #1d4ed8; color: #fff; }
.export-action:disabled { opacity: .45; cursor: not-allowed; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }
</style>

