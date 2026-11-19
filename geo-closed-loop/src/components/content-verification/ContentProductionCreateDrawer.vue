<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useContentProductionStore } from '../../stores/content-production'
import Button from '../ui/ce/button/Button.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import GeoDrawer from '../workbench/shared/GeoDrawer.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [itemId: string] }>()
const store = useContentProductionStore()
const error = ref('')

const aiForm = reactive({
  theme: '',
  targetQuestion: '',
  audience: '航空复材加工技术主管',
  market: '德国',
  notes: '具体参数、交期与服务范围需结合项目确认。',
})

function close() {
  emit('close')
}

// The theme carries the confirmed facts; split its segments instead of asking
// the operator to retype them in a separate field.
function factsFromTheme(value: string) {
  return value.split(/[\n，,、/·|]/).map(item => item.trim()).filter(Boolean)
}

function createAiDraft() {
  if (!aiForm.theme.trim()) {
    error.value = '请填写文章主题。'
    return
  }
  const item = store.createFromBrief({
    brief: {
      theme: aiForm.theme.trim(),
      targetQuestion: aiForm.targetQuestion.trim(),
      audience: aiForm.audience.trim(),
      market: aiForm.market.trim(),
      notes: aiForm.notes.trim(),
    },
    keyFacts: factsFromTheme(aiForm.theme),
  })
  resetForm()
  emit('created', item.id)
  close()
}

function resetForm() {
  error.value = ''
  aiForm.theme = ''
  aiForm.targetQuestion = ''
}
</script>

<template>
  <GeoDrawer
    :open="open"
    title="AI 写核验文章"
    eyebrow="品牌内容核验"
    subtitle="生成初稿后经 AI 检查、客户确认并发布到官网 Blog"
    :size="720"
    @close="close"
  >
    <div class="cp-create">
      <div class="cp-channel">
        <AppIcon name="globe" :size="16" />
        <span>发布渠道</span>
        <strong>官网 Blog</strong>
        <small>无需选择页面或栏目</small>
      </div>

      <form class="cp-form" @submit.prevent="createAiDraft">
        <label class="cp-field">
          <span>文章主题</span>
          <input v-model="aiForm.theme" data-test="create-theme" placeholder="例如：五轴水刀 · CFRP 分层控制指南">
        </label>
        <label class="cp-field">
          <span>目标核验问题</span>
          <input v-model="aiForm.targetQuestion" placeholder="例如：APW 如何控制 CFRP 切割分层？">
        </label>
        <div class="cp-form__row">
          <label class="cp-field">
            <span>目标读者</span>
            <input v-model="aiForm.audience">
          </label>
          <label class="cp-field">
            <span>目标市场</span>
            <input v-model="aiForm.market">
          </label>
        </div>
        <label class="cp-field">
          <span>需要确认的边界</span>
          <textarea v-model="aiForm.notes" rows="3" />
        </label>
        <p v-if="error" class="cp-error" role="alert">
          {{ error }}
        </p>
        <div class="cp-form__actions">
          <Button type="submit" variant="primary">
            AI 生成 Blog 初稿
          </Button>
        </div>
      </form>
    </div>

    <template #footer>
      <Button type="button" @click="close">
        取消
      </Button>
    </template>
  </GeoDrawer>
</template>

<style scoped>
.cp-create { display: grid; gap: 16px; min-width: 0; }
.cp-channel { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; line-height: 19px; }
.cp-channel strong { color: var(--text-primary); font-weight: 600; }
.cp-channel small { color: var(--text-muted); }
.cp-form { display: grid; gap: 14px; }
.cp-form__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cp-field { display: grid; gap: 6px; min-width: 0; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cp-field > span { color: var(--text-primary); font-weight: 500; }
.cp-field input, .cp-field textarea { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; }
.cp-field textarea { resize: vertical; min-height: 72px; }
.cp-field input:focus-visible, .cp-field textarea:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cp-form__actions { display: flex; justify-content: flex-end; padding-top: 4px; }
.cp-error { margin: 0; color: var(--status-error-foreground, #b91c1c); font-size: 12px; line-height: 18px; }
@media (max-width: 560px) { .cp-form__row { grid-template-columns: 1fr; } }
</style>
