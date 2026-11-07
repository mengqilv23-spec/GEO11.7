<script setup lang="ts">
import type { BuyerPersonaRecord } from '../../../api/geo-config'
import type { DropdownSelectOption } from '../../ui/ce/dropdown-select/types'
import Drawer from '../../ui/ce/drawer/Drawer.vue'

defineProps<{
  persona: BuyerPersonaRecord | null
  open: boolean
  personaTypeOptions: readonly DropdownSelectOption[]
  purchaseStageOptions: readonly DropdownSelectOption[]
  companyScaleOptions: readonly DropdownSelectOption[]
  decisionRoleOptions: readonly DropdownSelectOption[]
}>()

const emit = defineEmits<{ close: [] }>()

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || '—'
}

function localizedValue(options: readonly DropdownSelectOption[], value: string | null | undefined) {
  if (!value?.trim())
    return '—'
  return options.find(option => option.value === value)?.label ?? value
}

function localizedList(options: readonly DropdownSelectOption[], values: string[] | null | undefined) {
  return values?.length ? values.map(value => localizedValue(options, value)).join('、') : '—'
}

function listOrDash(value: string[] | null | undefined) {
  return value?.length ? value.join('、') : '—'
}
</script>

<template>
  <Drawer
    :open="open"
    title="查看买家人设"
    :eyebrow="persona?.personaName || '买家人设详情'"
    :description="persona ? `人设类型：${localizedValue(personaTypeOptions, persona.personaType)}` : undefined"
    :size="720"
    close-label="关闭买家人设详情"
    class="vm-persona-drawer"
    @close="emit('close')"
    @update:open="value => !value && emit('close')"
  >
    <div v-if="persona" class="vm-persona-detail">
      <section class="vm-persona-detail__section" aria-labelledby="vm-persona-main-title">
        <div class="vm-persona-detail__heading">
          <div>
            <h3 id="vm-persona-main-title">
              人设信息
            </h3>
            <p>当前市场接口返回的买家角色配置</p>
          </div>
        </div>
        <dl class="vm-persona-detail__grid">
          <div><dt>人设名称</dt><dd>{{ valueOrDash(persona.personaName) }}</dd></div>
          <div><dt>人设类型</dt><dd>{{ localizedValue(personaTypeOptions, persona.personaType) }}</dd></div>
          <div><dt>采购阶段</dt><dd>{{ localizedList(purchaseStageOptions, persona.purchaseStages) }}</dd></div>
          <div><dt>实际职位</dt><dd>{{ valueOrDash(persona.actualPosition) }}</dd></div>
          <div><dt>所属行业</dt><dd>{{ valueOrDash(persona.industry) }}</dd></div>
          <div><dt>企业规模</dt><dd>{{ localizedValue(companyScaleOptions, persona.companyScale) }}</dd></div>
          <div><dt>决策角色</dt><dd>{{ localizedValue(decisionRoleOptions, persona.decisionRole) }}</dd></div>
          <div><dt>采购触发场景</dt><dd>{{ valueOrDash(persona.purchaseTrigger) }}</dd></div>
          <div><dt>采购预算</dt><dd>{{ valueOrDash(persona.purchaseBudget) }}</dd></div>
          <div><dt>采购周期</dt><dd>{{ valueOrDash(persona.purchaseCycle) }}</dd></div>
          <div><dt>了解渠道</dt><dd>{{ valueOrDash(persona.infoChannels) }}</dd></div>
          <div><dt>关注主题</dt><dd>{{ listOrDash(persona.focusTopics) }}</dd></div>
          <div class="vm-persona-detail__wide">
            <dt>人设描述</dt><dd>{{ valueOrDash(persona.description) }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </Drawer>
</template>

<style scoped>
.vm-persona-drawer { --ce-drawer-size: min(720px, 94vw); }
.vm-persona-detail { display: grid; gap: 16px; min-width: 0; }
.vm-persona-detail__section { min-width: 0; padding: 18px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.vm-persona-detail__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.vm-persona-detail__heading h3 { margin: 0; color: var(--text-primary); font-size: 15px; line-height: 22px; font-weight: 650; }
.vm-persona-detail__heading p { margin: 4px 0 0; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-persona-detail__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; }
.vm-persona-detail__grid > div { display: grid; align-content: start; gap: 7px; min-width: 0; padding: 12px 13px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); }
.vm-persona-detail__grid dt { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-persona-detail__grid dd { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 21px; font-weight: 550; overflow-wrap: anywhere; white-space: pre-wrap; }
.vm-persona-detail__grid .vm-persona-detail__wide { grid-column: 1 / -1; }
@media (max-width: 560px) { .vm-persona-detail__section { padding: 14px; } .vm-persona-detail__grid { grid-template-columns: 1fr; } .vm-persona-detail__grid .vm-persona-detail__wide { grid-column: auto; } }
</style>

