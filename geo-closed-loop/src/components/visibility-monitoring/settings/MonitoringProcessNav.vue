<script setup lang="ts">
import AppIcon from '../../ui/icons/AppIcon.vue'

const steps: Array<{ id: number, label: string, detail: string }> = [
  { id: 1, label: '品牌知识', detail: '查看品牌知识配置' },
  { id: 2, label: '买家人设', detail: '查看买家人设配置' },
  { id: 3, label: '监测问题', detail: '查看监测问题配置' },
  { id: 4, label: '采样执行', detail: '查看采样执行状态' },
  { id: 5, label: '监测结果', detail: '查看轮次结果' },
]

const activeStep = defineModel<number>({ required: true })
</script>

<template>
  <nav class="vm-process" aria-label="监测流程">
    <div class="vm-process__heading">
      <h2>当前监测流程</h2>
      <p>点击步骤查看配置、采样状态与轮次结果</p>
    </div>
    <ol class="vm-process__steps" role="tablist" aria-label="监测流程步骤">
      <li v-for="step in steps" :key="step.id" class="vm-workflow-step">
        <button
          :id="`visibility-step-${step.id}`"
          type="button"
          role="tab"
          :aria-selected="activeStep === step.id"
          :aria-controls="`visibility-stage-${step.id}`"
          :class="{ 'is-active': activeStep === step.id }"
          @click="activeStep = step.id"
        >
          <span class="vm-process__status" :class="{ 'is-current': activeStep === step.id }" aria-hidden="true"><AppIcon name="circle" :size="8" /></span>
          <span class="vm-process__copy">
            <span class="vm-process__label">{{ step.id }}. {{ step.label }}</span>
            <span class="vm-process__detail">{{ step.detail }}</span>
          </span>
        </button>
        <AppIcon v-if="step.id < steps.length" class="vm-process__chevron" name="chevronRight" :size="14" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.vm-process { min-width: 0; padding: 14px 16px 16px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.vm-process__heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.vm-process__heading h2 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: 22px; }
.vm-process__heading p { margin: 0; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-process__steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.vm-workflow-step { position: relative; min-width: 0; padding-right: 22px; }
.vm-workflow-step > button { display: flex; width: 100%; min-height: 54px; align-items: flex-start; gap: 8px; padding: 7px; border: 1px solid transparent; border-radius: 10px; color: var(--text-primary); background: transparent; text-align: left; font: inherit; cursor: pointer; }
.vm-workflow-step > button:hover { background: var(--background-secondary); }
.vm-workflow-step > button.is-active { border-color: var(--action-accent); background: var(--action-subtle-background); }
.vm-workflow-step > button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.vm-process__status { display: grid; flex: 0 0 20px; width: 20px; height: 20px; place-items: center; margin-top: 1px; border-radius: 50%; color: var(--status-success-foreground); background: var(--status-success-background); font-size: 12px; font-weight: 700; }
.vm-process__status.is-current { color: var(--action-accent); background: var(--action-subtle-background); }
.vm-process__copy { display: grid; min-width: 0; gap: 4px; }
.vm-process__label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 600; white-space: nowrap; }
.vm-process__detail { color: var(--text-muted); font-size: 11px; line-height: 16px; }
.vm-process__badge { display: inline-grid; flex: 0 0 22px; width: 22px; min-width: 22px; height: 22px; box-sizing: border-box; place-items: center; padding: 0; border-radius: 50%; color: var(--status-warning-foreground); background: var(--status-warning-background); font-size: 11px; line-height: 1; text-align: center; font-variant-numeric: tabular-nums; }
.vm-process__chevron { position: absolute; top: 12px; right: 3px; color: var(--text-muted); font-size: 22px; line-height: 22px; }
@media (max-width: 900px) { .vm-process__steps { grid-template-columns: repeat(5, minmax(156px, 1fr)); overflow-x: auto; padding-bottom: 6px; } }
@media (max-width: 600px) { .vm-process { padding: 14px; } .vm-process__steps { margin: 0 -4px; } }
</style>

