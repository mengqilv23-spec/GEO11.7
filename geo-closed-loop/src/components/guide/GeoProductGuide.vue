<script setup lang="ts">
import type { GuideRect } from './guide-targets'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { geoGuideModules, guideModuleForRoute } from '../../data/geo-product-guide'
import Button from '../ui/ce/button/Button.vue'
import { guideTargets } from './guide-targets'

const props = withDefaults(defineProps<{ storageKey?: string }>(), { storageKey: 'geo-product-guide:v1:dismissed' })
const route = useRoute()
const router = useRouter()
const isOnboarding = computed(() => route.name === 'onboarding')
const open = ref(false)
const selectedId = ref(guideModuleForRoute(route.name).id)
const stepIndex = ref(0)
const selected = computed(() => geoGuideModules.find(module => module.id === selectedId.value) ?? geoGuideModules[0]!)
const step = computed(() => selected.value.steps[stepIndex.value]!)
const targetSpec = computed(() => guideTargets[selectedId.value]?.[stepIndex.value])
const layer = shallowRef<HTMLElement | null>(null)
const card = shallowRef<HTMLElement | null>(null)
const launcher = shallowRef<HTMLElement | null>(null)
const target = shallowRef<HTMLElement | null>(null)
const highlight = shallowRef<GuideRect | null>(null)
const position = shallowRef({ left: 16, top: 16, side: 'none' })
const locating = ref(false)
const message = ref('')
let generation = 0
let navigating = false
let observer: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let deadline: ReturnType<typeof setTimeout> | undefined
let frame = 0

function visibleTarget() {
  return Array.from(document.querySelectorAll<HTMLElement>(targetSpec.value?.selector ?? ':not(*)')).find(element => {
    const rect = element.getBoundingClientRect()
    return !element.closest('[hidden], [aria-hidden="true"]') && rect.width > 0 && rect.height > 0
  }) ?? null
}
function measure() {
  if (!open.value) return
  target.value = visibleTarget()
  const rect = target.value?.getBoundingClientRect()
  const width = document.documentElement.clientWidth || window.innerWidth
  const height = window.innerHeight
  highlight.value = rect && rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width ? {
    left: Math.max(4, rect.left - 6), top: Math.max(4, rect.top - 6),
    width: Math.max(0, Math.min(width - 4, rect.right + 6) - Math.max(4, rect.left - 6)),
    height: Math.max(0, Math.min(height - 4, rect.bottom + 6) - Math.max(4, rect.top - 6)),
  } : null
  const bounds = card.value?.getBoundingClientRect()
  position.value = { left: Math.max(16, width - (bounds?.width || 360) - 24), top: Math.max(16, height - (bounds?.height || 360) - 24), side: 'fixed' }
}
function queueMeasure() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}
function stopWaiting() {
  clearTimeout(deadline)
  observer?.disconnect()
  resizeObserver?.disconnect()
  target.value?.removeAttribute('data-geo-guide-target')
}
async function locate() {
  if (!open.value) return
  const ticket = ++generation
  stopWaiting()
  locating.value = false
  message.value = ''
  highlight.value = null
  target.value = null
  await nextTick()
  if (layer.value?.showPopover && !layer.value.matches(':popover-open')) layer.value.showPopover()
  const currentModule = guideModuleForRoute(route.name).id
  if (!targetSpec.value?.preserveModule && currentModule !== selectedId.value && route.name !== selected.value.route) {
    navigating = true
    await router.push({ name: selected.value.route, query: selected.value.route === 'onboarding' ? { ...route.query, preview: '1' } : { ...route.query } }).finally(() => { navigating = false })
    if (ticket !== generation || !open.value) return
  }
  locating.value = true
  function found() {
    if (ticket !== generation || !open.value) return
    const element = visibleTarget()
    if (!element) return
    clearTimeout(deadline)
    locating.value = false
    message.value = ''
    element.setAttribute('data-geo-guide-target', '')
    element.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    resizeObserver?.observe(element)
    queueMeasure()
  }
  for (const selector of targetSpec.value?.activate ?? []) {
    document.querySelector<HTMLElement>(selector)?.click()
    await nextTick()
    if (ticket !== generation || !open.value) return
  }
  observer = new MutationObserver(found)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] })
  found()
  if (locating.value) deadline = setTimeout(() => {
    if (ticket !== generation) return
    locating.value = false
    message.value = targetSpec.value?.unavailable ?? '当前页面尚未展示此区域。'
  }, 2000)
  measure()
}

function launch() {
  selectedId.value = guideModuleForRoute(route.name).id
  stepIndex.value = 0
  open.value = true
}
function dismiss() {
  generation++
  stopWaiting()
  cancelAnimationFrame(frame)
  layer.value?.hidePopover?.()
  open.value = false
  try { localStorage.setItem(props.storageKey, '1') } catch { /* Session dismissal still works without storage. */ }
  launcher.value?.focus({ preventScroll: true })
}
function selectModule(event: Event) {
  selectedId.value = (event.target as HTMLSelectElement).value
  stepIndex.value = 0
}
function next() {
  if (stepIndex.value < selected.value.steps.length - 1) stepIndex.value++
}
function handleKey(event: KeyboardEvent) {
  if (event.key === 'F1' || (open.value && event.key === 'Escape')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.key === 'Escape') dismiss()
    else if (!open.value) launch()
  }
}
watch([open, selectedId, stepIndex], () => { if (open.value) void locate() }, { flush: 'post' })
watch(open, async (value) => {
  if (value) { await nextTick(); card.value?.focus({ preventScroll: true }) }
})
watch(() => route.name, () => {
  if (!open.value) selectedId.value = guideModuleForRoute(route.name).id
  else if (!navigating && !targetSpec.value?.preserveModule && guideModuleForRoute(route.name).id !== selectedId.value) {
    selectedId.value = guideModuleForRoute(route.name).id
    stepIndex.value = 0
  }
})
onMounted(() => {
  window.addEventListener('keydown', handleKey, true)
  window.addEventListener('resize', queueMeasure)
  document.addEventListener('scroll', queueMeasure, true)
  if (isOnboarding.value) return
  let dismissed = false
  try { dismissed = localStorage.getItem(props.storageKey) === '1' } catch { /* Show the first-entry guide when storage is unavailable. */ }
  if (!dismissed) launch()
})
onBeforeUnmount(() => {
  generation++
  stopWaiting()
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', handleKey, true)
  window.removeEventListener('resize', queueMeasure)
  document.removeEventListener('scroll', queueMeasure, true)
})
</script>

<template>
  <button v-if="!isOnboarding" ref="launcher" type="button" class="geo-guide-launcher" aria-haspopup="dialog" :aria-expanded="open" title="使用引导（F1）" @click="launch"><span aria-hidden="true">?</span> 使用引导</button>
  <Teleport to="body">
    <div v-if="open" ref="layer" popover="manual" class="geo-guide-layer">
      <div v-if="highlight" class="geo-guide-highlight" :style="{ left: `${highlight.left}px`, top: `${highlight.top}px`, width: `${highlight.width}px`, height: `${highlight.height}px` }" />
      <aside ref="card" class="geo-guide-card" role="dialog" tabindex="-1" aria-labelledby="geo-guide-title" :style="{ left: `${position.left}px`, top: `${position.top}px` }" :data-placement="position.side">
        <header>
          <select aria-label="选择引导模块" :value="selectedId" @change="selectModule"><option v-for="module in geoGuideModules" :key="module.id" :value="module.id">{{ module.title }}</option></select>
          <button type="button" class="geo-guide-close" aria-label="关闭使用引导" @click="dismiss">×</button>
        </header>
        <div class="geo-guide-content" aria-live="polite">
          <span class="geo-guide-step">{{ stepIndex + 1 }} / {{ selected.steps.length }}</span>
          <h2 id="geo-guide-title">{{ step.title }}</h2>
          <p v-if="stepIndex === 0" class="geo-guide-introduction">{{ selected.introduction }}</p>
          <p>{{ step.description }}</p>
          <p class="geo-guide-action">{{ step.action }}</p>
          <p v-if="locating" class="geo-guide-notice" role="status">正在定位功能区域…</p>
          <template v-else-if="message || !highlight">
            <p class="geo-guide-notice" role="status">{{ message || '此区域当前未展示，请切回对应功能或重新定位。' }}</p>
            <button type="button" class="geo-guide-retry" @click="locate">重新定位</button>
          </template>
        </div>
        <footer>
          <button type="button" class="geo-guide-skip" @click="dismiss">跳过</button>
          <Button size="sm" :disabled="stepIndex === 0" @click="stepIndex--">上一步</Button>
          <Button size="sm" variant="primary" @click="stepIndex === selected.steps.length - 1 ? dismiss() : next()">{{ stepIndex === selected.steps.length - 1 ? '结束引导' : '下一步' }}</Button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
:global([data-geo-guide-target]) { scroll-margin-top: 88px; scroll-margin-bottom: 16px; }
.geo-guide-launcher { position: fixed; top: 13px; right: 190px; z-index: 80; display: inline-flex; min-height: 38px; align-items: center; gap: 7px; padding: 8px 13px; border: 1px solid var(--border-default); border-radius: 999px; background: var(--background-primary); color: var(--action-accent); box-shadow: 0 2px 10px #2424510d; font: inherit; cursor: pointer; }
.geo-guide-launcher > span { display: grid; width: 18px; height: 18px; place-items: center; border: 1.5px solid currentColor; border-radius: 50%; font-size: 12px; font-weight: 600; }
.geo-guide-layer { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; overflow: hidden; background: transparent; color: var(--text-primary); pointer-events: none; z-index: 10000; }
.geo-guide-highlight { position: fixed; box-sizing: border-box; border: 2px solid var(--action-accent); border-radius: 12px; box-shadow: 0 0 0 9999px #181a3038; pointer-events: none; }

.geo-guide-card { position: fixed; box-sizing: border-box; display: flex; flex-direction: column; width: min(360px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; padding: 18px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); box-shadow: 0 12px 48px #20224526; pointer-events: auto; }
.geo-guide-card header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.geo-guide-card select { width: calc(100% - 32px); padding: 5px 0; border: 0; color: var(--text-secondary); background: var(--background-primary); font: inherit; font-size: 12px; cursor: pointer; }
.geo-guide-close { border: 0; background: transparent; color: var(--text-muted); font-size: 24px; line-height: 1; cursor: pointer; }
.geo-guide-step { display: block; margin: 14px 0 6px; color: var(--action-accent); font-size: 12px; }
.geo-guide-content h2 { margin: 0; font-size: 17px; line-height: 1.5; }
.geo-guide-content p { margin: 10px 0; color: var(--text-secondary); font-size: 13px; line-height: 1.75; }
.geo-guide-content .geo-guide-action { padding: 10px 12px; border-radius: 8px; color: var(--text-primary); background: var(--background-subtle); }
.geo-guide-content .geo-guide-notice { color: var(--text-muted); font-size: 12px; }
.geo-guide-card footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.geo-guide-skip, .geo-guide-retry { border: 0; color: var(--action-accent); background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.geo-guide-skip { margin-right: auto; color: var(--text-secondary); }
button:focus-visible, select:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
@media (max-width: 680px) { .geo-guide-launcher { top: 13px; right: 112px; padding-inline: 10px; } }
@media (max-width: 520px) { .geo-guide-launcher { right: 72px; width: 38px; padding: 0; justify-content: center; } .geo-guide-launcher > span { flex: none; } .geo-guide-launcher { font-size: 0; } }
</style>

