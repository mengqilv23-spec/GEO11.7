<script setup lang="ts">
import type { BrandKnowledgeDraft } from '../../../types'
import { Input, Tag } from '../../ui/ce'
import Textarea from '../../ui/Textarea.vue'

defineProps<{ errors: Record<string, string> }>()
const model = defineModel<BrandKnowledgeDraft>({ required: true })
</script>

<template>
  <section class="knowledge-section" role="group" aria-labelledby="knowledge-tab-brand">
    <div class="knowledge-section__heading">
      <h3>品牌信息</h3>
      <p>完善品牌基本信息，帮助 AI 更准确地理解品牌主体、行业语境与品牌定位。</p>
    </div>

    <div class="knowledge-form-grid">
      <div class="knowledge-field">
        <div class="knowledge-field__heading">
          <label for="brand-name">品牌名称 <span aria-hidden="true">*</span></label>
          <Tag tone="green" variant="soft" size="sm">
            企业知识库
          </Tag>
        </div>
        <Input id="brand-name" v-model="model.name" autocomplete="organization" :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'brand-name-error' : undefined" placeholder="请输入品牌名称" />
        <p v-if="errors.name" id="brand-name-error" class="knowledge-field__error" role="alert">
          {{ errors.name }}
        </p>
      </div>

      <div class="knowledge-field">
        <div class="knowledge-field__heading">
          <label for="brand-alias">品牌别名 / 对外称谓</label>
          <Tag tone="green" variant="soft" size="sm">
            企业知识库
          </Tag>
        </div>
        <Input id="brand-alias" v-model="model.alias" placeholder="例如：APW Waterjet · 安培威" />
      </div>

      <div class="knowledge-field knowledge-field--wide">
        <div class="knowledge-field__heading">
          <label for="brand-industry">主营行业 <span aria-hidden="true">*</span></label>
          <Tag tone="green" variant="soft" size="sm">
            企业知识库
          </Tag>
        </div>
        <Input id="brand-industry" v-model="model.industry" :aria-invalid="Boolean(errors.industry)" :aria-describedby="errors.industry ? 'brand-industry-error' : undefined" placeholder="可用“ / ”分隔多个领域" />
        <p v-if="errors.industry" id="brand-industry-error" class="knowledge-field__error" role="alert">
          {{ errors.industry }}
        </p>
      </div>

      <div class="knowledge-field knowledge-field--wide">
        <div class="knowledge-field__heading">
          <label for="brand-description">品牌定位 / 品牌描述 <span aria-hidden="true">*</span></label>
          <Tag tone="blue" variant="soft" size="sm">
            AI 已生成
          </Tag>
        </div>
        <Textarea id="brand-description" v-model="model.description" :aria-invalid="Boolean(errors.description)" :aria-describedby="errors.description ? 'brand-description-error' : undefined" placeholder="描述品牌定位、服务对象和核心价值" :rows="4" />
        <p v-if="errors.description" id="brand-description-error" class="knowledge-field__error" role="alert">
          {{ errors.description }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.knowledge-section { display: grid; gap: var(--space-6); }
.knowledge-section :deep(.ce-input:not(:focus-visible):not([aria-invalid="true"])) { border-color: var(--border-default); }
:deep(.ui-textarea) { border-color: var(--border-default); }
.knowledge-section__heading h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.knowledge-section__heading p { margin: var(--space-1) 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.knowledge-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-5) var(--space-4); }
.knowledge-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.knowledge-field--wide { grid-column: 1 / -1; }
.knowledge-field__heading { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
.knowledge-field__heading label { color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: var(--weight-semibold); }
.knowledge-field__heading label span { color: var(--status-error); }
.knowledge-field__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
@media (max-width: 760px) { .knowledge-form-grid { grid-template-columns: 1fr; } .knowledge-field--wide { grid-column: auto; } }
</style>

