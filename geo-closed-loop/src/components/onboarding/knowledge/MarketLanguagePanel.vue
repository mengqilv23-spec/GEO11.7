<script setup lang="ts">
import type { MarketLanguageDraft } from '../../../types'
import type { DropdownSelectOption } from '../../ui/ce'
import { DropdownSelect, Tag } from '../../ui/ce'

withDefaults(defineProps<{ errors: Record<string, string>, readOnly?: boolean }>(), { readOnly: false })
const model = defineModel<MarketLanguageDraft>({ required: true })

const marketOptions: DropdownSelectOption[] = [
  { value: '德国', label: '德国（主市场）' },
  { value: '美国', label: '美国' },
  { value: '日本', label: '日本' },
  { value: '英国', label: '英国' },
  { value: '法国', label: '法国' },
  { value: '中国', label: '中国' },
]

const languageOptions: DropdownSelectOption[] = [
  { value: '德语', label: '德语' },
  { value: '英语', label: '英语' },
  { value: '日语', label: '日语' },
  { value: '法语', label: '法语' },
  { value: '中文', label: '中文' },
]
</script>

<template>
  <section class="knowledge-section" role="group" aria-labelledby="knowledge-tab-market">
    <div class="knowledge-section__heading">
      <h3>市场与语言</h3>
      <p>设置目标市场与语言，作为后续问题生成、可见性分析与内容优化的基础上下文。</p>
    </div>

    <div class="market-grid">
      <div class="market-field">
        <div class="market-field__heading">
          <label id="market-label">目标市场 <span aria-hidden="true">*</span></label>
          <Tag tone="green" variant="soft" size="sm">
            已同步
          </Tag>
        </div>
        <p v-if="readOnly" class="market-field__value">
          {{ model.market || '未设置' }}
        </p>
        <DropdownSelect v-else v-model="model.market" :options="marketOptions" v-bind="{ ariaLabel: '目标市场', ariaLabelledby: 'market-label', ariaDescribedby: errors.market ? 'market-error' : undefined }" />
        <p v-if="errors.market" id="market-error" class="market-field__error" role="alert">
          {{ errors.market }}
        </p>
      </div>

      <div class="market-field">
        <div class="market-field__heading">
          <label id="language-label">语言 <span aria-hidden="true">*</span></label>
          <Tag tone="green" variant="soft" size="sm">
            已同步
          </Tag>
        </div>
        <p v-if="readOnly" class="market-field__value">
          {{ model.language || '未设置' }}
        </p>
        <DropdownSelect v-else v-model="model.language" :options="languageOptions" v-bind="{ ariaLabel: '语言', ariaLabelledby: 'language-label', ariaDescribedby: errors.language ? 'language-error' : undefined }" />
        <p v-if="errors.language" id="language-error" class="market-field__error" role="alert">
          {{ errors.language }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.knowledge-section { display: grid; gap: var(--space-6); }
.knowledge-section__heading h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.knowledge-section__heading p { margin: var(--space-1) 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.market-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.market-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.market-field__heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.market-field__heading label { color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: var(--weight-semibold); }
.market-field__heading label span { color: var(--status-error); }
.market-field__error { margin: 0; font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.market-field__value { display: flex; min-height: 40px; align-items: center; margin: 0; padding: 0 var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-control); color: var(--text-primary); background: var(--background-control-subtle); }
.market-field__error { color: var(--status-error); }
@media (max-width: 760px) { .market-grid { grid-template-columns: 1fr; } }
</style>

