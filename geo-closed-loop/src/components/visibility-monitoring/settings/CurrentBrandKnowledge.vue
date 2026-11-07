<script setup lang="ts">
import type { KnowledgeItem } from '../../../types'
import { computed } from 'vue'

export type KnowledgeEditorTab = 'brand' | 'product' | 'market' | 'competitor'

const props = defineProps<{
  items: readonly KnowledgeItem[]
  pendingCompetitors?: readonly string[]
  errors?: readonly string[]
}>()

const emit = defineEmits<{
  edit: [tab: KnowledgeEditorTab]
  view: [tab: KnowledgeEditorTab]
  reviewCompetitors: []
}>()

function knowledge(id: string) {
  return props.items.find(item => item.id === id)
}

const dimensions = computed(() => {
  const brand = knowledge('brand')?.brand
  const market = knowledge('market')?.marketLanguage
  const products = knowledge('product')?.products ?? []
  const competitors = knowledge('competitor')?.competitors ?? []
  return [
    { id: 'brand', number: '01', title: '品牌信息', hint: '品牌名称与品牌定位', value: [brand?.name, brand?.description].filter(Boolean).join(' · '), tab: 'brand' as const },
    { id: 'product', number: '02', title: '核心产品', hint: '产品与主要应用场景', value: products.map(product => [product.name, product.useCase].filter(Boolean).join(' · ')).filter(Boolean).join('；'), tab: 'product' as const },
    { id: 'market', number: '03', title: '市场与语言', hint: '当前 GEO 分析上下文', value: [market?.market, market?.language].filter(Boolean).join(' · '), tab: 'market' as const },
    { id: 'competitors', number: '04', title: '竞争对手', hint: '用于竞品对比分析与监测', value: competitors.map(competitor => competitor.name).filter(Boolean).join(' · '), tab: 'competitor' as const },
  ]
})
const configuredCount = computed(() => dimensions.value.filter(dimension => dimension.value).length)

function viewDimension(tab: KnowledgeEditorTab) {
  emit('view', tab)
}
</script>

<template>
  <section class="vm-current-knowledge vm-card" aria-labelledby="vm-current-knowledge-title">
    <section v-if="pendingCompetitors?.length" class="vm-current-knowledge__pending" aria-label="待确认竞品推荐">
      <header>
        <strong>待确认</strong><span>{{ pendingCompetitors.length }}</span>
      </header>
      <div class="vm-current-knowledge__pending-row">
        <div>
          <h4>发现 {{ pendingCompetitors.length }} 个潜在新竞品候选</h4>
          <p>{{ pendingCompetitors.join('、') }} · 请查看并确认是否加入竞品监测</p>
        </div>
        <button type="button" @click="emit('reviewCompetitors')">
          查看并确认
        </button>
      </div>
    </section>
    <p v-for="error in errors" :key="error" class="vm-current-knowledge__error" role="alert">
      {{ error }}
    </p>
    <header class="vm-current-knowledge__header">
      <div class="vm-current-knowledge__title">
        <h3 id="vm-current-knowledge-title">
          当前品牌知识
        </h3>
      </div>
      <div class="vm-current-knowledge__actions">
        <button type="button" class="vm-current-knowledge__manage" @click="emit('edit', 'brand')">
          维护品牌知识
        </button>
        <span class="vm-current-knowledge__count">{{ configuredCount }} 项资料</span>
      </div>
    </header>

    <div class="vm-current-knowledge__grid">
      <article v-for="dimension in dimensions" :key="dimension.id" class="vm-knowledge-item">
        <div class="vm-knowledge-item__top">
          <span class="vm-knowledge-item__number">{{ dimension.number }}</span>
          <div class="vm-knowledge-item__label">
            <h4>
              {{ dimension.title }}
            </h4>
            <p>
              {{ dimension.hint }}
            </p>
          </div>
        </div>
        <div class="vm-knowledge-item__details">
          <p class="vm-knowledge-item__value" :title="dimension.value || undefined">
            {{ dimension.value }}
          </p>
          <button type="button" class="vm-knowledge-item__view" @click="viewDimension(dimension.tab)">
            查看
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.vm-card { min-width: 0; padding: 18px; border: 0; border-radius: 0; background: transparent; }
.vm-current-knowledge { display: grid; gap: 14px; }
.vm-current-knowledge__pending { display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--status-warning-border, #f3c66d); border-radius: 12px; background: var(--status-warning-background, #fff9e9); }
.vm-current-knowledge__pending > header { display: flex; align-items: center; justify-content: space-between; color: var(--status-warning-foreground, #9a5a14); font-size: 13px; }
.vm-current-knowledge__pending > header span { display: grid; min-width: 22px; height: 22px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--status-warning-foreground, #9a5a14) 10%, transparent); font-size: 11px; font-weight: 700; }
.vm-current-knowledge__pending-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--status-warning-foreground, #9a5a14) 24%, white); border-radius: 10px; background: var(--background-primary); }
.vm-current-knowledge__pending-row h4 { margin: 0; color: var(--text-primary); font-size: 14px; }
.vm-current-knowledge__pending-row p { margin: 4px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.vm-current-knowledge__pending-row button { flex: 0 0 auto; min-height: 34px; padding: 5px 11px; border: 1px solid var(--action-accent); border-radius: 8px; color: var(--text-on-accent, white); background: var(--action-accent); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.vm-current-knowledge__error { margin: 0; padding: 9px 12px; border-radius: 8px; color: var(--status-error-foreground); background: var(--status-error-background); font-size: 12px; }
.vm-current-knowledge__header, .vm-current-knowledge__title, .vm-knowledge-item__top, .vm-current-knowledge__actions { display: flex; align-items: center; }
.vm-current-knowledge__header { justify-content: space-between; gap: 12px; }
.vm-current-knowledge__title { gap: 8px; }
.vm-current-knowledge__actions { gap: 10px; }
.vm-current-knowledge__header h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: 24px; }
.vm-current-knowledge__count { padding: 4px 9px; border-radius: 999px; color: var(--status-success-foreground); background: var(--status-success-background); font-size: 12px; font-weight: 650; white-space: nowrap; }
.vm-current-knowledge__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.vm-knowledge-item { display: grid; grid-template-rows: auto minmax(0, 1fr); align-self: stretch; gap: 8px; min-width: 0; min-height: 156px; padding: 14px 16px; border: 1px solid color-mix(in srgb, var(--action-accent) 13%, var(--border-default)); border-radius: 12px; background: linear-gradient(145deg, var(--background-primary), color-mix(in srgb, var(--action-subtle-background) 35%, var(--background-primary))); box-shadow: 0 2px 8px rgb(38 59 90 / 4%); }
.vm-knowledge-item__top { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: start; gap: 9px; min-width: 0; }
.vm-knowledge-item__number { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 12px; font-weight: 700; }
.vm-knowledge-item__label { min-width: 0; }
.vm-knowledge-item__label h4 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 20px; }
.vm-knowledge-item__label p { margin: 2px 0 0; color: var(--text-muted); font-size: 11px; line-height: 16px; }
.vm-knowledge-item__details { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: minmax(0, 1fr) auto; align-items: end; gap: 6px 12px; min-width: 0; margin-top: 2px; }
.vm-knowledge-item__value { grid-column: 1 / -1; grid-row: 1; align-self: start; min-width: 0; margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 500; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
.vm-knowledge-item__view { grid-column: 2; grid-row: 2; justify-self: end; flex: 0 0 auto; margin: 0; padding: 4px 10px; border: 1px solid var(--action-subtle-border, var(--border-default)); border-radius: 8px; color: var(--action-accent); background: var(--action-subtle-background); font: inherit; font-size: 12px; line-height: 18px; font-weight: 650; cursor: pointer; }
.vm-current-knowledge__manage { min-height: 36px; padding: 6px 12px; border: 1px solid var(--action-accent); border-radius: 8px; color: var(--action-accent); background: var(--background-primary); font: inherit; font-size: 12px; line-height: 18px; font-weight: 650; cursor: pointer; }
.vm-current-knowledge__manage:hover { background: var(--action-subtle-background); }
.vm-knowledge-item__view:focus-visible, .vm-current-knowledge__manage:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; border-radius: 3px; }
@media (max-width: 720px) { .vm-current-knowledge__grid { grid-template-columns: 1fr; } .vm-current-knowledge__pending-row { align-items: flex-start; flex-direction: column; } }
</style>

