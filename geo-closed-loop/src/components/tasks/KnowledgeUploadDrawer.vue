<script setup lang="ts">
import type { DropdownSelectOption } from '../ui/ce/dropdown-select/types'
import { computed, shallowRef, watch } from 'vue'
import { knowledgeLibrary } from '../../workflows/task-workflow'
import Button from '../ui/ce/button/Button.vue'
import Drawer from '../ui/ce/drawer/Drawer.vue'
import DropdownSelect from '../ui/ce/dropdown-select/DropdownSelect.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

export interface KnowledgeUploadDraft {
  tag: string
  name: string
  fileName: string
  fileSize: number
}

const props = defineProps<{ open: boolean, taskId: string }>()
const emit = defineEmits<{
  close: []
  submitted: [draft: KnowledgeUploadDraft]
}>()

const selectedTag = shallowRef('')
const name = shallowRef('')
const file = shallowRef<File | null>(null)
const creatingTag = shallowRef(false)
const newTagName = shallowRef('')
const customTags = shallowRef<string[]>([])
const staged = shallowRef(false)
const tagOptions = computed<DropdownSelectOption[]>(() => {
  const values = new Set([...knowledgeLibrary.map(item => item.tag), '客户案例', ...customTags.value])
  return [...values].map(value => ({ value, label: value }))
})
const canSubmit = computed(() => Boolean(selectedTag.value && name.value.trim() && file.value) && !staged.value)

watch(() => props.open, (open) => {
  if (open) {
    selectedTag.value = ''
    name.value = ''
    file.value = null
    creatingTag.value = false
    newTagName.value = ''
    staged.value = false
  }
})

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function createTag() {
  const value = newTagName.value.trim()
  if (!value)
    return
  if (!customTags.value.includes(value) && !tagOptions.value.some(option => option.value === value))
    customTags.value = [...customTags.value, value]
  selectedTag.value = value
  newTagName.value = ''
  creatingTag.value = false
}

function submit() {
  if (!canSubmit.value || !file.value)
    return
  staged.value = true
  emit('submitted', {
    tag: selectedTag.value,
    name: name.value.trim(),
    fileName: file.value.name,
    fileSize: file.value.size,
  })
}
</script>

<template>
  <Drawer
    :open="open"
    :eyebrow="`${taskId} · 知识库资料`"
    title="上传知识资料"
    :size="600"
    close-label="关闭上传资料"
    class="tw-knowledge-upload-drawer"
    @close="emit('close')"
  >
    <div class="tw-upload-form">
      <p class="tw-upload-notice">
        此处只负责上传资料。上传完成后，请前往 AI 建站知识库进行内容解析；解析完成后，再从知识库刷新并选择。
      </p>

      <div class="tw-upload-field">
        <div class="tw-upload-label-row">
          <label class="tw-upload-label" for="tw-upload-tag">资料标签 <b aria-hidden="true">*</b></label>
          <Button v-if="!creatingTag" variant="text" data-test="create-tag-toggle" @click="creatingTag = true">
            <AppIcon name="add" :size="14" /> 新建标签
          </Button>
        </div>
        <DropdownSelect
          id="tw-upload-tag"
          v-model="selectedTag"
          :options="tagOptions"
          v-bind="{ ariaLabel: '资料标签' }"
          panel-width="100%"
          empty-content="暂无标签"
        />
        <div v-if="creatingTag" class="tw-upload-tag-create">
          <input
            v-model="newTagName"
            data-test="new-tag-input"
            maxlength="30"
            aria-label="新标签名称"
            placeholder="输入标签名称"
            @keydown.enter.prevent="createTag"
            @keydown.esc="creatingTag = false"
          >
          <div class="tw-upload-tag-actions">
            <Button size="sm" variant="primary" data-test="create-tag-submit" :disabled="!newTagName.trim()" @click="createTag">
              创建并选中
            </Button>
            <Button size="sm" variant="outline" class="tw-upload-tag-cancel" @click="creatingTag = false">
              取消
            </Button>
          </div>
        </div>
        <p class="tw-upload-hint">
          选择已有标签，或新建一个便于后续检索的标签。
        </p>
      </div>

      <label class="tw-field" for="tw-upload-name">
        <span>资料名称 <b aria-hidden="true">*</b></span>
        <input id="tw-upload-name" v-model="name" data-test="upload-name" maxlength="100" placeholder="例如：2026 年产品规格与认证资料">
      </label>

      <div class="tw-upload-field">
        <span class="tw-upload-label">上传文件 <b aria-hidden="true">*</b></span>
        <label class="tw-upload-file" :class="{ 'has-file': file }">
          <input data-test="upload-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json" @change="chooseFile" @cancel.stop>
          <span class="tw-upload-file__icon" aria-hidden="true"><AppIcon name="upload" :size="22" /></span>
          <span class="tw-upload-file__copy">
            <strong>{{ file?.name || '选择需要上传的资料' }}</strong>
            <small>{{ file ? `${(file.size / 1024).toFixed(1)} KB · 已选择` : '支持常见文档格式，选择文件后即可提交' }}</small>
          </span>
          <span class="tw-upload-file__action">{{ file ? '更换文件' : '选择文件' }}</span>
        </label>
      </div>

      <div v-if="staged" class="tw-upload-result" role="status" data-test="upload-staged">
        <span class="tw-upload-result__icon" aria-hidden="true"><AppIcon name="check" :size="16" /></span>
        <div>
          <strong>上传流程已登记</strong>
          <p>当前为前端演示，文件尚未实际上传。请前往 AI 建站知识库上传并解析，完成后再回到“调整已有资料”刷新选择。</p>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="emit('close')">
        {{ staged ? '返回任务' : '取消' }}
      </Button>
      <Button v-if="!staged" variant="primary" data-test="upload-file-submit" :disabled="!canSubmit" @click="submit">
        上传资料
      </Button>
    </template>
  </Drawer>
</template>

