<script setup lang="ts">
import type { MonitoringFrequency, MonitoringPlatform } from './monitoring-plan'
import { computed } from 'vue'
import { Button, SegmentedControl, Tag } from '../../ui/ce'
import AppIcon from '../../ui/icons/AppIcon.vue'
import OnboardingHelp from '../shared/OnboardingHelp.vue'
import OnboardingSteps from '../shared/OnboardingSteps.vue'
import { monitoringFrequencyOptions, monitoringPlatformOptions, toggleMonitoringPlatform } from './monitoring-plan'

const props = defineProps<{
  currentStep: number
  steps: string[]
  frequency: MonitoringFrequency
  platforms: MonitoringPlatform[]
  marketSetup?: boolean
  market?: string
  planName?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  frequencyChanged: [frequency: MonitoringFrequency]
  platformsChanged: [platforms: MonitoringPlatform[]]
}>()

const visibleFrequency = computed<MonitoringFrequency>(() => 'weekly')
const frequencyOptions = computed(() => monitoringFrequencyOptions.map(option => ({
  ...option,
  disabled: true,
})))
const executionRule = computed(() => {
  const label = monitoringFrequencyOptions.find(option => option.value === visibleFrequency.value)?.label ?? '每周'
  return `系统将按${label}自动采集，具体执行日期与时间由系统按规则安排。`
})
const availablePlatforms = monitoringPlatformOptions

function togglePlatform(platform: MonitoringPlatform) {
  emit('platformsChanged', toggleMonitoringPlatform(props.platforms, platform))
}
</script>

<template>
  <div class="monitoring-plan-step">
    <header class="page-header">
      <div class="page-header__title-row">
        <h1 class="page-header__title">
          {{ marketSetup ? '设置该市场采集计划' : '设置首次采集计划' }}
        </h1>
        <OnboardingHelp label="采集计划说明" :message="marketSetup ? '单独设置该市场的采集频率和 AI 平台；不同市场的计划互不影响。采集日期与执行时间由系统按固定规则执行。' : '品牌知识、买家人设和监测问题已经准备完成。最后确认采集频率和 AI 平台即可开始首次监测。采集日期与执行时间由系统按固定规则执行，无需用户配置。'" />
      </div>
    </header>

    <OnboardingSteps :current-step="currentStep" :steps="steps" />

    <p v-if="marketSetup" class="monitoring-plan-step__market">
      当前配置市场：<strong>{{ market || '尚未设置' }}</strong>。为该市场配置自动采集频率与 AI 平台。
    </p>

    <section class="knowledge-panel monitoring-plan-step__panel" aria-labelledby="monitoring-frequency-title">
      <div class="knowledge-panel__header">
        <div class="monitoring-plan-step__section-title">
          <h2 id="monitoring-frequency-title" class="knowledge-panel__title">
            采集频率
          </h2>
          <OnboardingHelp label="采集频率说明" message="设置系统自动采集的周期。采集日期与执行时间将按系统固定规则执行。" />
        </div>
        <Tag tone="neutral" variant="soft" size="sm">
          按套餐执行
        </Tag>
      </div>

      <div class="monitoring-plan-step__frequency">
        <SegmentedControl
          class="monitoring-plan-step__frequency-options"
          :model-value="visibleFrequency"
          :options="frequencyOptions"
          aria-labelledby="monitoring-frequency-title"
          name="monitoring-frequency"
          @update:model-value="emit('frequencyChanged', $event as MonitoringFrequency)"
        />
        <div class="monitoring-plan-step__rule">
          <span>系统执行规则</span>
          <strong>{{ executionRule }}</strong>
        </div>
      </div>
    </section>

    <section class="knowledge-panel monitoring-plan-step__panel" aria-labelledby="monitoring-platform-title">
      <div class="knowledge-panel__header">
        <div class="monitoring-plan-step__section-title">
          <h2 id="monitoring-platform-title" class="knowledge-panel__title">
            AI 平台
          </h2>
          <OnboardingHelp label="AI 平台说明" message="选择首次监测需要采集的平台" />
        </div>
        <Tag tone="neutral" variant="soft" size="sm">
          {{ availablePlatforms.filter(platform => !platform.disabled).length }} 个可选
        </Tag>
      </div>

      <div class="monitoring-plan-step__platforms" aria-label="选择 AI 平台">
        <Button
          v-for="platform in availablePlatforms"
          :key="platform.value"
          class="monitoring-plan-platform"
          variant="outline"
          :aria-pressed="platforms.includes(platform.value)"
          :disabled="saving || platform.disabled"
          @click="togglePlatform(platform.value)"
        >
          <span class="monitoring-plan-platform__content">
            <span class="monitoring-plan-platform__check" aria-hidden="true">
              <AppIcon v-if="platforms.includes(platform.value)" name="check" :size="14" aria-hidden="true" />
            </span>
            <span class="monitoring-plan-platform__identity">
              <span class="monitoring-plan-platform__mark" :data-platform="platform.markTone" aria-hidden="true">{{ platform.mark }}</span>
              <span class="monitoring-plan-platform__label">{{ platform.label }}</span>
              <span v-if="platform.hint" class="monitoring-plan-platform__hint">{{ platform.hint }}</span>
            </span>
          </span>
        </Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.monitoring-plan-step { display: grid; gap: var(--space-5); min-width: 0; }
.monitoring-plan-step .page-header { margin-bottom: 0; }
.monitoring-plan-step :deep(.onboarding-steps) { margin-bottom: 0; }
.monitoring-plan-step__panel { min-width: 0; overflow: hidden; }
.monitoring-plan-step__section-title { display: inline-flex; align-items: center; gap: var(--space-2); }
.monitoring-plan-step__market { margin: 0; padding: 0 var(--space-2); color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.monitoring-plan-step__market strong { color: var(--text-primary); font-weight: var(--weight-semibold); }
.monitoring-plan-step__frequency { display: grid; gap: var(--space-3); padding: var(--space-surface-content); }
.monitoring-plan-step__label { color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: var(--weight-medium); }
.monitoring-plan-step__frequency-options { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__label) { position: relative; display: inline-flex; align-items: center; }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__input) { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__option) { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; padding: var(--space-2) var(--space-4); border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--background-primary); color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: var(--weight-medium); cursor: pointer; transition: border-color var(--motion-fast), background-color var(--motion-fast), color var(--motion-fast); }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__input:checked + .ce-segmented__option) { border-color: var(--action-accent); background: var(--action-subtle-background); color: var(--action-accent); }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__input:disabled:not(:checked) + .ce-segmented__option) { border-color: var(--border-default); background: var(--background-secondary); color: var(--text-muted); cursor: not-allowed; }
.monitoring-plan-step__frequency-options :deep(.ce-segmented__input:focus-visible + .ce-segmented__option) { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.monitoring-plan-step__rule { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: var(--space-4); margin-top: var(--space-2); padding: var(--space-3) var(--space-4); border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--background-secondary); color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.monitoring-plan-step__rule strong { color: var(--text-secondary); font-weight: var(--weight-semibold); text-align: right; }
.monitoring-plan-step__platforms { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-3); width: min(100%, 960px); margin-inline: 0; padding: var(--space-4); }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform) { min-width: 0; min-height: 52px; justify-content: stretch; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); color: var(--text-primary); text-align: left; box-shadow: none; transition: border-color var(--motion-fast), background-color var(--motion-fast); }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform:hover:not(:disabled)) { border-color: var(--border-strong, var(--border-default)); background: var(--background-secondary); box-shadow: none; }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform[aria-pressed='true']) { border-color: var(--action-accent); background: var(--action-subtle-background); color: var(--text-primary); }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform[aria-pressed='true']:hover:not(:disabled)) { border-color: var(--action-accent); background: var(--action-subtle-background); }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform:disabled) { border-color: var(--border-default); background: var(--background-secondary); color: var(--text-muted); opacity: 1; cursor: not-allowed; }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform:disabled .monitoring-plan-platform__identity) { color: var(--text-muted); }
.monitoring-plan-step :deep(.ce-button.monitoring-plan-platform:focus-visible) { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.monitoring-plan-platform :deep(.ce-button__content) { display: block; width: 100%; }
.monitoring-plan-platform__content,.monitoring-plan-platform__identity { display: flex; min-width: 0; align-items: center; }
.monitoring-plan-platform__content { justify-content: flex-start; gap: 6px; }
.monitoring-plan-platform__identity { flex: 1 1 auto; gap: 4px; color: var(--text-primary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: var(--weight-semibold); }
.monitoring-plan-platform__label { flex: 0 0 auto; white-space: nowrap; }
.monitoring-plan-platform__hint { margin-left: auto; color: var(--text-muted); font-size: 11px; font-weight: var(--weight-medium); white-space: nowrap; }
.monitoring-plan-platform__mark { display: inline-grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--background-primary); color: var(--text-primary); font-size: 21px; line-height: 1; }
.monitoring-plan-platform__mark[data-platform='perplexity'] { font-size: 22px; font-weight: var(--weight-semibold); }
.monitoring-plan-platform__mark[data-platform='google'] { color: #4285f4; }
.monitoring-plan-platform__mark[data-platform='gemini'] { color: #7568f5; }
.monitoring-plan-platform__mark[data-platform='ai-mode'] { color: #4983f5; }
.monitoring-plan-platform__check { display: inline-grid; width: 16px; height: 16px; flex: 0 0 16px; place-items: center; border: 1px solid var(--border-strong, var(--border-default)); border-radius: 3px; background: var(--background-primary); color: transparent; }
.monitoring-plan-platform[aria-pressed='true'] .monitoring-plan-platform__check { border-color: var(--action-accent); background: var(--action-accent); color: var(--text-on-accent, #fff); }
.monitoring-plan-platform__check svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.2; }
@media (max-width: 900px) { .monitoring-plan-step__platforms { grid-template-columns: repeat(5, minmax(132px, 1fr)); overflow-x: auto; } }
@media (max-width: 560px) { .monitoring-plan-step__platforms { padding: var(--space-3); } .monitoring-plan-step__rule { align-items: flex-start; flex-direction: column; gap: var(--space-1); } .monitoring-plan-step__rule strong { text-align: left; } }
</style>

