<script setup lang="ts">
import type { SamplingFrequency } from '../../../data/visibility-monitoring-data'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { monitoringPlatformOptions } from '../../onboarding/monitoring-plan/monitoring-plan'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'

const props = defineProps<{ open: boolean, frequency: SamplingFrequency, selectedPlatforms: readonly string[], planName: string, saving?: boolean, error?: string }>()
const emit = defineEmits<{ close: [], save: [settings: { frequency: SamplingFrequency, platforms: string[] }] }>()
const dialog = shallowRef<HTMLDialogElement | null>(null)
const frequency = shallowRef<SamplingFrequency>('weekly')
const selectedPlatforms = shallowRef<string[]>([...props.selectedPlatforms])
const availablePlatforms = computed(() => monitoringPlatformOptions.map(platform => ({ id: platform.value, label: platform.label, enabled: !platform.disabled, hint: platform.hint })))
const frequencyOptions = computed(() => [
  { id: 'weekly' as const, label: '每周' },
])
watch(() => props.open, (open) => {
  if (!dialog.value)
    return
  if (open) {
    frequency.value = 'weekly'
    selectedPlatforms.value = [...props.selectedPlatforms]
    if (!dialog.value.open)
      dialog.value.showModal()
  }
  else if (dialog.value.open) {
    dialog.value.close()
  }
}, { flush: 'post' })
watch(() => props.selectedPlatforms, (value) => {
  if (props.open)
    selectedPlatforms.value = [...value]
})
onMounted(() => {
  if (props.open)
    dialog.value?.showModal()
})
function togglePlatform(id: string, checked: boolean) {
  selectedPlatforms.value = checked ? [...new Set([...selectedPlatforms.value, id])] : selectedPlatforms.value.filter(platform => platform !== id)
}
function save() {
  emit('save', { frequency: 'weekly', platforms: selectedPlatforms.value.filter(id => availablePlatforms.value.some(platform => platform.id === id && platform.enabled)) })
}
function handleClose() {
  if (props.open)
    emit('close')
}
onBeforeUnmount(() => {
  if (dialog.value?.open)
    dialog.value.close()
})
</script>

<template>
  <dialog ref="dialog" class="vm-settings" aria-labelledby="vm-settings-title" @close="handleClose">
    <header class="vm-settings__head">
      <h2 id="vm-settings-title">
        调整采集频率与平台
      </h2><button type="button" aria-label="关闭设置" @click="emit('close')">
        <AppIcon name="close" :size="18" aria-hidden="true" />
      </button>
    </header>
    <form class="vm-settings__body" @submit.prevent="save">
      <fieldset>
        <legend>采集频率</legend><div class="vm-frequency">
          <label v-for="item in frequencyOptions" :key="item.id" :class="{ 'is-selected': frequency === item.id, 'is-locked': frequency !== item.id }"><input type="radio" name="frequency" :value="item.id" :checked="frequency === item.id" disabled>{{ item.label }}</label>
        </div>
      </fieldset>
      <fieldset>
        <legend>AI 平台</legend><p v-if="props.error" class="vm-settings__error" role="alert">
          {{ props.error }}
        </p><p v-else-if="!availablePlatforms.length" class="vm-settings__note">
          暂无平台选项，或平台配置尚未加载成功。
        </p><div class="vm-platform-grid">
          <label v-for="platform in availablePlatforms" :key="platform.id" :class="{ 'is-disabled': !platform.enabled }"><input type="checkbox" :value="platform.id" :checked="platform.enabled && selectedPlatforms.includes(platform.id)" :disabled="!platform.enabled" @change="togglePlatform(platform.id, ($event.target as HTMLInputElement).checked)"><span>{{ platform.label }}</span><small v-if="platform.hint">{{ platform.hint }}</small></label>
        </div>
      </fieldset>
      <p class="vm-settings__note">
        当前采集计划按每周执行，执行日期与时间由系统安排。
      </p>
    </form>
    <footer class="vm-settings__foot">
      <button type="button" @click="emit('close')">
        取消
      </button><button class="is-primary" type="button" :disabled="props.saving || !availablePlatforms.length" :aria-busy="props.saving" @click="save">
        <Spinner v-if="props.saving" variant="ring" aria-hidden="true" />
        保存当前设置
      </button>
    </footer>
  </dialog>
</template>

<style scoped>
.vm-settings { width: min(720px, calc(100vw - 32px)); max-width: none; max-height: 92vh; padding: 0; color: var(--text-primary); background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 16px; box-shadow: var(--shadow-floating); }
.vm-settings::backdrop { background: rgb(15 23 42 / 48%); }
.vm-settings__head, .vm-settings__foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 22px; border-bottom: 1px solid var(--border-default); }
.vm-settings__head h2 { margin: 0; font-size: 16px; }
.vm-settings__head button { display: grid; width: 30px; height: 30px; place-items: center; background: none; border: 0; font-size: 20px; line-height: 1; cursor: pointer; }
.vm-settings__body { display: grid; gap: 18px; max-height: 64vh; overflow-y: auto; padding: 18px 22px; }
fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
legend { margin-bottom: 10px; font-weight: 600; }
legend span { color: var(--text-muted); font-weight: 400; }
.vm-frequency { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.vm-frequency label { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: 10px; cursor: pointer; }
.vm-frequency label.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.vm-frequency label.is-locked { color: var(--text-muted); background: var(--background-subtle); }
.vm-frequency input, .vm-platform-grid input { accent-color: var(--action-accent); }
.vm-platform-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; }
.vm-platform-grid label { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.vm-platform-grid label small { color: var(--text-muted); font-size: 12px; }
.vm-platform-grid label.is-disabled { color: var(--text-muted); cursor: not-allowed; }
.vm-settings__note { margin: 0; padding: 10px 12px; color: var(--text-secondary); background: var(--background-subtle); border-radius: 8px; }
.vm-settings__foot { justify-content: flex-end; border-top: 1px solid var(--border-default); border-bottom: 0; background: var(--background-subtle); }
.vm-settings__foot button { min-height: 34px; padding: 5px 12px; color: var(--action-accent); background: var(--background-primary); border: 1px solid var(--border-control); border-radius: 9px; font: inherit; font-size: 14px; line-height: 18px; cursor: pointer; }
.vm-settings__foot button.is-primary { color: var(--action-primary-foreground); background: var(--action-primary-background); border-color: var(--action-primary-background); }
.vm-settings__foot button.is-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; --spinner-size: 16px; --spinner-color: currentColor; }
@media (max-width: 520px) { .vm-settings__body { padding: 14px 16px; } .vm-settings__head, .vm-settings__foot { padding: 10px 16px; } .vm-frequency { grid-template-columns: 1fr; } }
</style>

