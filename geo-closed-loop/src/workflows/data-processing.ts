import { computed, shallowRef } from 'vue'

export type ProcessingPage = 'visibility-monitoring' | 'diagnosis' | 'optimization'
type ProcessingState = { startedAt: number, completed: number }

const storageKey = 'geo-data-processing:v1'
// The prototype advances quickly so the complete interaction can be reviewed locally.
const stageDuration = 6000
const pages: ProcessingPage[] = ['visibility-monitoring', 'diagnosis', 'optimization']
const labels: Record<ProcessingPage, string> = {
  'visibility-monitoring': '可见性监测',
  diagnosis: '诊断与策略',
  optimization: '优化中心',
}

function readState(): ProcessingState | null {
  try {
    const value = localStorage.getItem(storageKey)
    if (!value) return null
    const parsed = JSON.parse(value) as ProcessingState
    return Number.isFinite(parsed.startedAt) && Number.isFinite(parsed.completed) ? parsed : null
  }
  catch { return null }
}

const state = shallowRef<ProcessingState | null>(readState())
const now = shallowRef(Date.now())

function save(next: ProcessingState) {
  state.value = next
  try { localStorage.setItem(storageKey, JSON.stringify(next)) }
  catch { /* The current tab still shows the transition. */ }
}

export function startDataProcessing() {
  now.value = Date.now()
  save({ startedAt: now.value, completed: 0 })
}

export function updateDataProcessing(): ProcessingPage[] {
  now.value = Date.now()
  if (!state.value) return []
  const completed = Math.min(3, Math.floor((now.value - state.value.startedAt) / stageDuration))
  if (completed <= state.value.completed) return []
  const newlyCompleted = pages.slice(state.value.completed, completed)
  save({ ...state.value, completed })
  return newlyCompleted
}

export function useDataProcessing() {
  const hasRun = computed(() => state.value !== null)
  const completed = computed(() => state.value?.completed ?? 3)
  const running = computed(() => !!state.value && completed.value < 3)
  const isReady = (page: ProcessingPage) => computed(() => completed.value > pages.indexOf(page))
  const currentStep = computed(() => pages[Math.min(completed.value, 2)])
  return { hasRun, completed, running, isReady, currentStep, labels }
}

