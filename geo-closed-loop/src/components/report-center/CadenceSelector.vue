<script setup lang="ts">
import type { ReportType } from '../../data/report-center-data'

defineProps<{ modelValue: ReportType }>()

const options: Array<{ value: ReportType, title: string, output: string, description: string }> = [
  { value: 'weekly', title: '每周监测', output: '周报 + 月报 + 季报', description: '每周生成周报，并按月、季度汇总生成月报和季报；当前监测快照可在概览与可见性监测中查看。' },
  { value: 'monthly', title: '每月监测', output: '月报 + 季报', description: '每月生成月报，并按季度汇总生成季报；该周期不生成周报。' },
]
</script>

<template>
  <section class="cadence-panel" aria-labelledby="cadence-title">
    <div class="panel-heading">
      <div>
        <h2 id="cadence-title">
          周期监测与报告
        </h2>
        <p>以下为不同监测周期可获得的正式报告类型</p>
      </div>
      <span class="current-config">当前配置：{{ options.find(option => option.value === modelValue)?.title.replace('监测', '') }}</span>
    </div>
    <div class="cadence-grid">
      <article
        v-for="option in options"
        :key="option.value"
        class="cadence-card"
        :class="{ 'is-current': modelValue === option.value }"
        :data-cadence="option.value"
      >
        <span class="cadence-card__top">
          <span>{{ option.title }}</span>
          <span v-if="modelValue === option.value" class="current-badge">当前</span>
        </span>
        <strong>{{ option.output }}</strong>
        <span class="cadence-card__description">{{ option.description }}</span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.cadence-panel { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.panel-heading h2 { margin: 0; color: var(--text-primary); font-size: var(--typography-section-title-font-size, 14px); line-height: var(--typography-section-title-line-height, 22px); font-weight: var(--weight-semibold); }
.panel-heading p { margin: 4px 0 0; color: var(--text-muted); font-size: 14px; }
.current-config { flex: 0 0 auto; padding: 2px 8px; border-radius: var(--radius-tag); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.cadence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cadence-card { display: grid; min-width: 0; min-height: 132px; align-content: start; gap: 10px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); color: var(--text-primary); background: #fff; text-align: left; }
.cadence-card.is-current { border-color: color-mix(in srgb, var(--action-accent) 48%, var(--border-default)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--action-accent) 8%, transparent); }
.cadence-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 14px; font-weight: 650; }
.current-badge { padding: 2px 8px; border-radius: var(--radius-tag); color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 8%, #fff); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.cadence-card > strong { font-size: 14px; line-height: 22px; font-weight: 600; }
.cadence-card__description { color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
@media (max-width: 880px) { .cadence-grid { grid-template-columns: 1fr; } .cadence-card { min-height: 0; } }
@media (max-width: 560px) { .cadence-panel { padding: 18px; } .panel-heading { flex-direction: column; } }
</style>

