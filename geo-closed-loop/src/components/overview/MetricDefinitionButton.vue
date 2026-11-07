<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { metricDefinitions } from '../../data/metric-definitions'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = defineProps<{ id: string }>()
const definition = computed(() => metricDefinitions[props.id])
const open = shallowRef(false)
const trigger = shallowRef<HTMLButtonElement | null>(null)
const panel = shallowRef<HTMLElement | null>(null)
const position = shallowRef({ left: 0, top: 0 })
const panelId = `metric-definition-${Math.random().toString(36).slice(2, 9)}`

function updatePosition() {
  if (!trigger.value || !panel.value)
    return

  const anchor = trigger.value.getBoundingClientRect()
  const box = panel.value.getBoundingClientRect()
  const gutter = 12
  const left = Math.min(window.innerWidth - box.width - gutter, Math.max(gutter, anchor.left))
  const below = anchor.bottom + 8
  const top = below + box.height <= window.innerHeight - gutter
    ? below
    : Math.max(gutter, anchor.top - box.height - 8)
  position.value = { left, top }
}

function close() {
  open.value = false
}

function handleOutside(event: PointerEvent) {
  const target = event.target
  if (target instanceof Node && !trigger.value?.contains(target) && !panel.value?.contains(target))
    close()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    close()
    trigger.value?.focus()
  }
}

function addListeners() {
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
}

function removeListeners() {
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    removeListeners()
    return
  }
  await nextTick()
  updatePosition()
  addListeners()
})

onBeforeUnmount(removeListeners)
</script>

<template>
  <span v-if="definition" class="metric-definition">
    <button ref="trigger" class="metric-definition__trigger" type="button" :aria-label="`查看${definition.name}定义`" :title="`查看${definition.name}定义`" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">
      <AppIcon name="help" :size="15" aria-hidden="true" focusable="false" />
    </button>
    <Teleport to="body">
      <section v-if="open" :id="panelId" ref="panel" class="metric-definition__popover" role="dialog" :aria-label="`${definition.name}定义`" :style="{ left: `${position.left}px`, top: `${position.top}px` }">
        <header class="metric-definition__header">
          <h2>{{ definition.name }}</h2>
          <button class="metric-definition__close" type="button" aria-label="关闭指标定义" @click="close">
            <AppIcon name="close" :size="16" aria-hidden="true" />
          </button>
        </header>
        <div class="metric-definition__body">
          <section>
            <h3>定义</h3>
            <p>{{ definition.definition }}</p>
          </section>
          <section v-if="definition.formula">
            <h3>计算公式</h3>
            <p class="metric-definition__formula">{{ definition.formula }}</p>
          </section>
          <section v-if="definition.dimensions">
            <h3>统计维度</h3>
            <p>{{ definition.dimensions }}</p>
          </section>
          <section>
            <h3>口径说明</h3>
            <ul>
              <li v-for="note in definition.notes" :key="note">
                {{ note }}
              </li>
            </ul>
          </section>
        </div>
      </section>
    </Teleport>
  </span>
</template>

<style scoped>
.metric-definition { display: inline-flex; vertical-align: middle; }
.metric-definition__trigger { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 50%; color: var(--text-muted); background: transparent; cursor: pointer; }
.metric-definition__trigger:hover { color: var(--action-accent); background: var(--action-subtle-background); }
.metric-definition__trigger:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.metric-definition__popover { position: fixed; z-index: 250; box-sizing: border-box; width: min(380px, calc(100vw - 24px)); max-height: min(72vh, 560px); overflow-y: auto; border: 1px solid var(--border-default); border-radius: 12px; color: var(--text-primary); background: var(--background-primary); box-shadow: 0 14px 38px rgb(20 35 60 / 20%); }
.metric-definition__header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 15px; border-bottom: 1px solid var(--border-divider); background: var(--background-primary); }
.metric-definition__header h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 650; }
.metric-definition__close { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0; border-radius: 6px; color: var(--text-muted); background: transparent; cursor: pointer; }
.metric-definition__close:hover { color: var(--text-primary); background: var(--background-subtle); }
.metric-definition__body { display: grid; gap: 13px; padding: 14px 15px 16px; color: var(--text-secondary); font-size: 12px; line-height: 1.65; }
.metric-definition__body h3 { margin: 0 0 4px; color: var(--text-primary); font-size: 12px; }
.metric-definition__body p { margin: 0; }
.metric-definition__formula { padding: 8px 10px; border-radius: 7px; color: var(--text-primary); background: var(--background-subtle); overflow-wrap: anywhere; }
.metric-definition__body ul { display: grid; gap: 5px; margin: 0; padding-left: 17px; }
</style>

