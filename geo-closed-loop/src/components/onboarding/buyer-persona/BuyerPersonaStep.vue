<script setup lang="ts">
import type { BuyerPersona } from '../../../types'
import type { DropdownSelectOption } from '../../ui/ce'
import { computed, shallowRef } from 'vue'
import { Button, Tag } from '../../ui/ce'
import OnboardingHelp from '../shared/OnboardingHelp.vue'
import OnboardingSteps from '../shared/OnboardingSteps.vue'
import { buyerPersonaTypeOptions, maxBuyerPersonas, purchaseStageOptions } from './buyer-persona-options'
import BuyerPersonaEditorDialog from './BuyerPersonaEditorDialog.vue'

const props = defineProps<{
  currentStep: number
  steps: string[]
  personas: BuyerPersona[]
  market: string
  marketSetup?: boolean
  typeOptions?: readonly DropdownSelectOption[]
  stageOptions?: readonly DropdownSelectOption[]
  persistPersonas?: (personas: BuyerPersona[]) => Promise<BuyerPersona[]>
  saving?: boolean
}>()

const emit = defineEmits<{
  saved: [personas: BuyerPersona[]]
  removeRequested: [id: string]
}>()

const editorOpen = shallowRef(false)
const editorMode = shallowRef<'add' | 'edit'>('add')
const personaTypeName = (value: string) => (props.typeOptions ?? buyerPersonaTypeOptions).find(option => option.value === value)?.label ?? value
const purchaseStageName = (value: string) => (props.stageOptions ?? purchaseStageOptions).find(option => option.value === value)?.label ?? value
const countLabel = computed(() => `已添加 ${props.personas.length} / ${maxBuyerPersonas}`)
const optionalPersonaFields = ['actualRole', 'industry', 'companySize', 'decisionRole', 'purchaseTrigger', 'purchaseBudget', 'purchaseCycle', 'discoveryChannel'] as const
const optionalInfoCount = (persona: BuyerPersona) => optionalPersonaFields.filter(field => Boolean(persona[field]?.trim())).length

function openEditor(mode: 'add' | 'edit') {
  editorMode.value = mode
  editorOpen.value = true
}

function removePersona(id: string) {
  emit('removeRequested', id)
}

function handlePersonasSaved(personas: BuyerPersona[]) {
  // Keep the step-level model authoritative so a parent refresh cannot leave
  // the editor open in its empty/add-another state.
  editorOpen.value = false
  emit('saved', personas)
}
</script>

<template>
  <div class="buyer-persona-step">
    <header class="page-header">
      <div>
        <div class="page-header__title-row">
          <h1 class="page-header__title">
            {{ marketSetup ? '维护该市场的买家人设' : '维护首次监测买家人设' }}
          </h1>
          <OnboardingHelp label="买家人设说明" :message="marketSetup ? '为当前市场单独维护需要监测的买家角色；各市场的人设配置互不影响。' : '从固定的 6 类中选择本次需要维护的人设。点击“添加买家角色”可在一个弹窗里维护多套。'" />
        </div>
      </div>
      <Button variant="outline" :disabled="saving || personas.length >= maxBuyerPersonas" @click="openEditor('add')">
        {{ marketSetup ? '+ 新增该市场买家角色' : '+ 新增买家角色' }}
      </Button>
    </header>

    <OnboardingSteps :current-step="currentStep" :steps="steps" />

    <p class="buyer-persona-step__market">
      {{ marketSetup ? '当前配置市场：' : '当前分析市场：' }}<strong>{{ market || '尚未设置' }}</strong>{{ marketSetup ? '。为该市场添加需监测的人设，配置仅对此市场生效。' : '。请按需添加人设，类型限以下 6 类。' }}
    </p>

    <section class="knowledge-panel buyer-persona-step__panel" aria-labelledby="buyer-persona-panel-title">
      <div class="knowledge-panel__header">
        <div class="buyer-persona-step__section-title">
          <h2 id="buyer-persona-panel-title" class="knowledge-panel__title">
            {{ marketSetup ? '该市场买家人设' : '当前买家人设' }}
          </h2>
          <OnboardingHelp label="当前买家人设说明" :message="marketSetup ? '仅添加该市场实际需要监测的人设。每套必填人设类型和采购阶段，其余信息均为选填。' : '仅添加实际需要用于监测的人设。每套必填人设类型和采购阶段，其余信息均为选填。'" />
        </div>
        <Tag tone="neutral" variant="soft" size="sm">
          {{ countLabel }}
        </Tag>
      </div>

      <div v-if="personas.length" class="buyer-persona-step__list">
        <article v-for="(persona, index) in personas" :key="persona.id" class="buyer-persona-card">
          <div class="buyer-persona-card__heading">
            <div>
              <span class="buyer-persona-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
              <h3>{{ personaTypeName(persona.type) }}</h3>
            </div>
            <div class="buyer-persona-card__actions">
              <Button variant="outline" size="sm" :disabled="saving" @click="openEditor('edit')">
                编辑
              </Button>
              <Button variant="outline" tone="danger" size="sm" :disabled="saving" :aria-label="`删除${personaTypeName(persona.type)}`" @click="removePersona(persona.id)">
                删除
              </Button>
            </div>
          </div>
          <div class="buyer-persona-card__summary">
            <p>采购阶段：{{ purchaseStageName(persona.purchaseStage) }}</p>
            <p>{{ optionalInfoCount(persona) ? `已补充 ${optionalInfoCount(persona)} 项选填信息` : '未填写选填信息' }}</p>
          </div>
        </article>
      </div>

      <div v-else class="buyer-persona-step__empty">
        <strong>{{ marketSetup ? '还没有添加该市场的买家人设' : '还没有添加买家人设' }}</strong>
        <p>{{ marketSetup ? '从固定的 6 类中选择该市场实际需要监测的角色。' : '从固定的 6 类中选择实际需要维护的角色。' }}</p>
        <Button variant="outline" :disabled="saving" @click="openEditor('add')">
          {{ marketSetup ? '+ 添加该市场人设' : '+ 添加买家人设' }}
        </Button>
      </div>

      <p class="buyer-persona-step__note">
        AI 已根据当前品牌、产品与市场生成默认值；用户仅需确认或修改买家信息与采购信息。
      </p>
    </section>

    <BuyerPersonaEditorDialog v-model:open="editorOpen" :personas="personas" :mode="editorMode" :type-options="typeOptions" :stage-options="stageOptions" :persist-personas="persistPersonas" @saved="handlePersonasSaved" />
  </div>
</template>

<style scoped>
.buyer-persona-step { display: grid; gap: var(--space-5); }
.buyer-persona-step .page-header { margin-bottom: 0; }
.buyer-persona-step :deep(.onboarding-steps) { margin-bottom: 0; }
.buyer-persona-step__market { margin: 0; padding: 0 var(--space-2); color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.buyer-persona-step__market strong { color: var(--text-primary); font-weight: var(--weight-semibold); }
.buyer-persona-step__panel { overflow: hidden; border-radius: var(--radius-metric); }
.buyer-persona-step__panel :deep(.knowledge-panel__header .ce-tag) { border-radius: var(--radius-control); }
.buyer-persona-step__section-title { display: inline-flex; align-items: center; gap: var(--space-2); }
.buyer-persona-step__list { display: grid; gap: var(--space-4); padding: var(--space-surface-content); }
.buyer-persona-card { min-width: 0; padding: var(--space-5); border: 1px solid var(--border-default); border-radius: var(--radius-metric); background: var(--background-primary); }
.buyer-persona-card__heading,.buyer-persona-card__heading > div:first-child,.buyer-persona-card__actions { display: flex; align-items: center; gap: var(--space-3); }
.buyer-persona-card__heading { justify-content: space-between; }
.buyer-persona-card__index { display: inline-grid; width: 36px; height: 36px; place-items: center; border-radius: var(--radius-control); color: var(--action-accent); background: var(--action-subtle-background); font-family: var(--font-family-mono); font-size: var(--font-size-caption); font-weight: var(--weight-semibold); }
.buyer-persona-card__heading h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.buyer-persona-card__summary { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-divider); }
.buyer-persona-card__summary p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); overflow-wrap: anywhere; }
.buyer-persona-step__empty { display: grid; justify-items: center; gap: var(--space-3); margin: var(--space-5); padding: clamp(32px, 5vw, 56px) var(--space-4); border: 1px dashed var(--color-border-brand); border-radius: var(--radius-card); background: var(--background-secondary); text-align: center; }
.buyer-persona-step__empty strong { color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); }
.buyer-persona-step__empty p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.buyer-persona-step__note { margin: 0 var(--space-5) var(--space-5); padding: var(--space-4); border-radius: var(--radius-control); color: var(--text-secondary); background: var(--background-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
@media (max-width: 600px) { .buyer-persona-step .page-header { align-items: flex-start; flex-direction: column; } .buyer-persona-card__heading { align-items: flex-start; } .buyer-persona-card__actions { gap: var(--space-1); } }
</style>

