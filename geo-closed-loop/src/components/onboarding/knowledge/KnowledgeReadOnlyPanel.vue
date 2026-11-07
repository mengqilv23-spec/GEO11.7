<script setup lang="ts">
import type { KnowledgeItem } from '../../../types'

defineProps<{ item: KnowledgeItem | undefined }>()

function display(value: string | undefined) {
  return value?.trim() || '—'
}
</script>

<template>
  <section v-if="item" class="knowledge-readonly" :class="`knowledge-readonly--${item.id}`">
    <template v-if="item.id === 'brand'">
      <dl class="knowledge-readonly__brand-grid">
        <div><dt>品牌名称</dt><dd>{{ display(item.brand?.name) }}</dd></div>
        <div><dt>品牌别名 / 对外称谓</dt><dd>{{ display(item.brand?.alias) }}</dd></div>
        <div><dt>主营行业</dt><dd>{{ display(item.brand?.industry) }}</dd></div>
        <div><dt>品牌定位</dt><dd>{{ display(item.brand?.description) }}</dd></div>
        <div class="knowledge-readonly__brand-website">
          <dt>品牌官网</dt><dd>{{ display(item.brand?.website) }}</dd>
        </div>
      </dl>
    </template>

    <template v-else-if="item.id === 'product'">
      <p v-if="!item.products?.length" class="knowledge-readonly__empty">
        尚未添加核心产品
      </p>
      <article v-for="product in item.products" :key="product.id" class="knowledge-readonly__entry">
        <header class="knowledge-readonly__entry-header">
          <h3>{{ display(product.name) }}</h3>
          <span v-if="product.isPrimary" class="knowledge-readonly__tag">主推产品</span>
        </header>
        <dl class="knowledge-readonly__details">
          <dt>核心产品 <span aria-hidden="true">*</span></dt><dd>{{ display(product.name) }}</dd>
          <dt>使用场景 <span aria-hidden="true">*</span></dt><dd>{{ display(product.useCase) }}</dd>
          <dt>核心能力 / 卖点</dt><dd>{{ display(product.strengths) }}</dd>
          <dt>客户群体</dt><dd>{{ display(product.customerGroup) }}</dd>
          <dt>是否是主推产品</dt><dd>{{ product.isPrimary ? '是' : '否' }}</dd>
        </dl>
      </article>
    </template>

    <template v-else-if="item.id === 'market'">
      <dl class="knowledge-readonly__market-grid">
        <div><dt>目标市场</dt><dd>{{ display(item.marketLanguage?.market) }}</dd></div>
        <div><dt>监测语言</dt><dd>{{ display(item.marketLanguage?.language) }}</dd></div>
      </dl>
    </template>

    <template v-else>
      <p v-if="!item.competitors?.length" class="knowledge-readonly__empty">
        尚未选择竞品
      </p>
      <article v-for="competitor in item.competitors" :key="competitor.id" class="knowledge-readonly__entry">
        <header class="knowledge-readonly__competitor-header">
          <span class="knowledge-readonly__monogram" aria-hidden="true">{{ competitor.name.slice(0, 2).toUpperCase() }}</span>
          <div class="knowledge-readonly__competitor-identity">
            <h3>{{ display(competitor.name) }}</h3>
            <div>
              <span v-if="competitor.confirmed" class="knowledge-readonly__tag">已确认</span>
              <span class="knowledge-readonly__domain">{{ display(competitor.domain) }}</span>
            </div>
          </div>
        </header>
        <dl class="knowledge-readonly__details">
          <dt>竞品名称 <span aria-hidden="true">*</span></dt><dd>{{ display(competitor.name) }}</dd>
          <dt>竞品域名 <span aria-hidden="true">*</span></dt><dd>{{ display(competitor.domain) }}</dd>
          <dt>竞品别名</dt><dd>{{ display(competitor.alias) }}</dd>
          <dt>竞品介绍</dt><dd>{{ display(competitor.description) }}</dd>
        </dl>
      </article>
    </template>
  </section>
</template>

<style scoped>
.knowledge-readonly { min-width: 0; }
.knowledge-readonly__brand-grid,.knowledge-readonly__market-grid { display: grid; grid-template-columns: minmax(0, 1fr); margin: 0; }
.knowledge-readonly__brand-grid > div,.knowledge-readonly__market-grid > div { display: grid; grid-template-columns: 112px minmax(0, 1fr); align-items: start; gap: 12px; min-width: 0; padding: 10px 2px; border-bottom: 1px solid #edf1f6; }
.knowledge-readonly dt { color: #8493aa; font-size: 12px; line-height: 17px; font-weight: 600; }
.knowledge-readonly dd { min-width: 0; margin: 0; color: #344663; font-size: 14px; line-height: 21px; font-weight: 550; overflow-wrap: anywhere; white-space: pre-wrap; }
.knowledge-readonly__entry { min-width: 0; padding: 12px; border: 1px solid #edf1f6; border-radius: 8px; background: #fafbfd; }
.knowledge-readonly__entry + .knowledge-readonly__entry { margin-top: var(--space-4); }
.knowledge-readonly__entry-header { display: flex; align-items: center; gap: var(--space-3); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-divider); }
.knowledge-readonly__entry-header h3,.knowledge-readonly__competitor-identity h3 { margin: 0; color: #263b5a; font-size: 15px; line-height: 21px; font-weight: 650; }
.knowledge-readonly__tag { display: inline-flex; align-items: center; min-height: 28px; padding: 2px 12px; border-radius: 999px; color: var(--status-success-foreground); background: var(--status-success-background); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: var(--weight-semibold); white-space: nowrap; }
.knowledge-readonly__details { display: grid; grid-template-columns: minmax(104px, 0.3fr) minmax(0, 1fr); gap: 7px 10px; margin: 10px 0 0; padding: 0 4px; }
.knowledge-readonly__details dt { align-self: start; color: #8493aa; font-size: 12px; line-height: 18px; }
.knowledge-readonly__details dt span { color: var(--status-error); }
.knowledge-readonly__details dd { margin: 0; color: #344663; font-size: 14px; line-height: 21px; }
.knowledge-readonly__competitor-header { display: flex; align-items: center; gap: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-divider); }
.knowledge-readonly__monogram { display: grid; width: 64px; height: 64px; flex: none; place-items: center; border-radius: 16px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 24px; font-weight: var(--weight-semibold); }
.knowledge-readonly__competitor-identity { display: grid; gap: var(--space-2); min-width: 0; }
.knowledge-readonly__competitor-identity > div { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.knowledge-readonly__domain { color: var(--text-muted); overflow-wrap: anywhere; }
.knowledge-readonly__empty { margin: 0; color: var(--text-secondary); }
@media (max-width: 520px) {
  .knowledge-readonly__brand-grid > div,.knowledge-readonly__market-grid > div { grid-template-columns: 88px minmax(0, 1fr); gap: 8px; }
  .knowledge-readonly__details { grid-template-columns: minmax(88px, 0.4fr) minmax(0, 1fr); padding: 0; }
}
</style>

