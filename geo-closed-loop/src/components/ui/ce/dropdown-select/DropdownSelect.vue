<script setup lang="ts">
import type { DropdownSelectOption, DropdownSelectPlacement, DropdownSelectTriggerAppearance } from './types'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import AppIcon from '../../icons/AppIcon.vue'
import { restoreOverlayFocus } from '../overlay/overlay-manager'
import { useModalBlocked } from '../overlay/useModalBlocked'
import { useOverlayLayer } from '../overlay/useOverlayLayer'
import { useOverlayScope } from '../overlay/useOverlayScope'

interface DropdownSelectProps {
  modelValue?: string | null
  options: readonly DropdownSelectOption[]
  ariaLabel: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  ariaBusy?: boolean
  disabled?: boolean
  selectedIndicator?: string | null
  triggerAppearance?: DropdownSelectTriggerAppearance
  placement?: DropdownSelectPlacement
  panelWidth?: string | number
  minWidth?: string | number
  maxHeight?: string | number
  emptyContent?: unknown
  panelHeader?: unknown
  footer?: unknown
}

const props = withDefaults(defineProps<DropdownSelectProps>(), {
  disabled: false,
  selectedIndicator: '✓',
  triggerAppearance: 'outline',
  placement: 'bottom-start',
  panelWidth: '100%',
  maxHeight: '70vh',
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string, option: DropdownSelectOption]
}>()

const usesDefaultCheckIcon = computed(() => props.selectedIndicator === '✓')

const overlayScope = useOverlayScope()
const blocked = useModalBlocked()
const trigger = shallowRef<HTMLButtonElement | null>(null)
const panel = shallowRef<HTMLElement | null>(null)
const openState = ref(false)
const activeValue = ref<string | null>(null)
const listId = `ce-dropdown-list-${Math.random().toString(36).slice(2, 10)}`
const valueId = `ce-dropdown-value-${Math.random().toString(36).slice(2, 10)}`
const geometry = ref({ left: 8, top: 8, maxHeight: '70vh', width: 'calc(100vw - 16px)', triggerWidth: 0 })
const searchText = ref('')
const searchAt = ref(0)

const selected = computed(() => props.options.find(option => option.value === props.modelValue))
const usable = computed(() => props.options.filter(option => !option.disabled))
const active = computed(() => usable.value.find(option => option.value === activeValue.value) ?? usable.value[0])
const visible = computed(() => openState.value && !props.disabled && !(overlayScope.scope === 'assistant' && blocked.value))

useOverlayLayer({
  open: visible,
  onEscape: () => close(true),
  getElement: () => panel.value,
})

function close(restore = false) {
  openState.value = false
  if (restore)
    restoreOverlayFocus(trigger.value)
}

function show(last = false) {
  if (props.disabled || (overlayScope.scope === 'assistant' && blocked.value))
    return
  searchText.value = ''
  searchAt.value = 0
  activeValue.value = (last ? usable.value.at(-1) : selected.value ?? usable.value[0])?.value ?? null
  openState.value = true
  nextTick(() => {
    updateGeometry()
    panel.value?.querySelector<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true })
  })
}

function choose(option: DropdownSelectOption | undefined) {
  if (!visible.value || !option || option.disabled)
    return
  close(true)
  if (option.value !== props.modelValue) {
    emit('update:modelValue', option.value)
    emit('change', option.value, option)
  }
}

function handleListKeydown(event: KeyboardEvent) {
  if (event.isComposing)
    return
  const index = active.value ? usable.value.findIndex(option => option.value === active.value?.value) : -1
  let next: DropdownSelectOption | undefined
  if (event.key === 'ArrowDown') {
    next = usable.value[(index + 1 + usable.value.length) % usable.value.length]
  }
  else if (event.key === 'ArrowUp') {
    next = usable.value[(index - 1 + usable.value.length) % usable.value.length]
  }
  else if (event.key === 'Home') {
    next = usable.value[0]
  }
  else if (event.key === 'End') {
    next = usable.value.at(-1)
  }
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(active.value)
    return
  }
  else if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
    return
  }
  else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const now = Date.now()
    searchText.value = now - searchAt.value > 700 ? event.key : `${searchText.value}${event.key}`
    searchAt.value = now
    const term = searchText.value.toLocaleLowerCase()
    const currentIndex = Math.max(index, 0)
    const ordered = [...usable.value.slice(currentIndex + 1), ...usable.value.slice(0, currentIndex + 1)]
    next = ordered.find(option => option.label.toLocaleLowerCase().startsWith(term))
  }
  else {
    return
  }
  event.preventDefault()
  if (next)
    activeValue.value = next.value
}

function updateGeometry() {
  const anchor = trigger.value
  const popup = panel.value
  if (!anchor || !popup)
    return
  const rect = anchor.getBoundingClientRect()
  const viewport = window.visualViewport
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const originX = viewport?.offsetLeft ?? 0
  const originY = viewport?.offsetTop ?? 0
  const inset = 8
  const gap = 4
  const popupWidth = Math.min(popup.getBoundingClientRect().width || rect.width, Math.max(0, viewportWidth - inset * 2))
  const popupHeight = popup.getBoundingClientRect().height
  const left = props.placement.endsWith('end')
    ? rect.right - popupWidth
    : props.placement.endsWith('center')
      ? rect.left + (rect.width - popupWidth) / 2
      : rect.left
  const below = Math.max(0, originY + viewportHeight - rect.bottom - gap - inset)
  const above = Math.max(0, rect.top - originY - gap - inset)
  const useTop = props.placement.startsWith('top')
    ? above >= popupHeight || above >= below
    : below < popupHeight && above > below
  const top = useTop ? rect.top - gap - popupHeight : rect.bottom + gap
  const maxHeight = Math.min(
    typeof props.maxHeight === 'number' ? props.maxHeight : Number.POSITIVE_INFINITY,
    Math.max(0, useTop ? above : below),
  )
  geometry.value = {
    left: Math.max(originX + inset, Math.min(left, originX + viewportWidth - popupWidth - inset)),
    top: Math.max(originY + inset, Math.min(top, originY + viewportHeight - Math.min(popupHeight, maxHeight) - inset)),
    maxHeight: Number.isFinite(maxHeight)
      ? `${maxHeight}px`
      : (typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : (props.maxHeight ?? '70vh')),
    width: `${Math.max(0, viewportWidth - inset * 2)}px`,
    triggerWidth: rect.width,
  }
}

const focusableSelector = 'button, a[href], input, select, textarea, [contenteditable="true"], [tabindex]'
function isFocusable(element: HTMLElement) {
  if (element.matches(':disabled,[hidden],[inert],input[type="hidden"]') || element.tabIndex < 0)
    return false
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden')
      return false
  }
  return true
}

function handlePanelKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !panel.value)
    return
  const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>(focusableSelector)).filter(isFocusable)
  const boundary = event.shiftKey ? focusable[0] : focusable.at(-1)
  if (document.activeElement === boundary || event.target === boundary)
    close(true)
}

function handleOutside(event: PointerEvent | FocusEvent) {
  const target = event.target
  if (target instanceof Node && !panel.value?.contains(target) && !trigger.value?.contains(target))
    close()
}

watch(visible, (isVisible) => {
  if (!isVisible)
    return
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('focusin', handleOutside)
  window.addEventListener('resize', updateGeometry)
  window.addEventListener('scroll', updateGeometry, true)
})
watch(visible, (isVisible, wasVisible) => {
  if (isVisible || !wasVisible)
    return
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('focusin', handleOutside)
  window.removeEventListener('resize', updateGeometry)
  window.removeEventListener('scroll', updateGeometry, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('focusin', handleOutside)
  window.removeEventListener('resize', updateGeometry)
  window.removeEventListener('scroll', updateGeometry, true)
})

const portalTarget = computed(() => trigger.value?.closest('dialog') ?? overlayScope.container.value ?? document.body)
const resolvedPanelWidth = computed(() => {
  if (typeof props.panelWidth === 'number')
    return `${props.panelWidth}px`
  const percentage = /^(\d+(?:\.\d+)?)%$/.exec(props.panelWidth.trim())
  const triggerWidth = geometry.value.triggerWidth || trigger.value?.getBoundingClientRect().width
  if (percentage && triggerWidth)
    return `${triggerWidth * Number(percentage[1]) / 100}px`
  return props.panelWidth
})
const panelStyle = computed(() => ({
  left: `${geometry.value.left}px`,
  top: `${geometry.value.top}px`,
  width: resolvedPanelWidth.value,
  minWidth: props.minWidth == null
    ? undefined
    : `min(${typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth}, ${geometry.value.width})`,
  maxWidth: geometry.value.width,
  maxHeight: geometry.value.maxHeight,
}))
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="ce-button ce-dropdown-select__trigger"
    :data-open="visible ? 'true' : undefined"
    :data-trigger-appearance="triggerAppearance"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-describedby="[ariaDescribedby, selected ? valueId : undefined].filter(Boolean).join(' ') || undefined"
    :aria-busy="ariaBusy ? 'true' : undefined"
    aria-haspopup="listbox"
    :aria-expanded="visible ? 'true' : 'false'"
    :aria-controls="visible ? listId : undefined"
    @click="visible ? close(true) : show()"
    @keydown.arrow-down.prevent="show()"
    @keydown.arrow-up.prevent="show(true)"
  >
    <span class="ce-dropdown-select__label">{{ selected?.label ?? ariaLabel }}</span>
    <AppIcon name="chevronDown" :size="16" class="ce-dropdown-select__arrow" focusable="false" />
  </button>
  <span v-if="selected" :id="valueId" hidden>{{ selected.label }}</span>
  <Teleport v-if="visible" :to="portalTarget">
    <div ref="panel" class="ce-dropdown-select__panel" data-open="true" :style="panelStyle" @keydown="handlePanelKeydown">
      <div v-if="panelHeader != null || $slots.panelHeader" class="ce-dropdown-select__header">
        <slot name="panelHeader">
          {{ panelHeader }}
        </slot>
      </div>
      <div :id="listId" role="listbox" tabindex="0" class="ce-dropdown-select__list" :aria-label="ariaLabel" :aria-activedescendant="active ? `${listId}-${active.value}` : undefined" @keydown="handleListKeydown">
        <template v-if="options.length">
          <div
            v-for="option in options"
            :id="`${listId}-${option.value}`"
            :key="option.value"
            class="ce-dropdown-select__option"
            role="option"
            :aria-label="option.ariaLabel ?? option.label"
            :aria-selected="option.value === modelValue ? 'true' : 'false'"
            :aria-disabled="option.disabled ? 'true' : undefined"
            :data-active="option.value === active?.value ? 'true' : undefined"
            :style="{ paddingLeft: `${8 + (option.depth ?? 0) * 16}px` }"
            @click="choose(option)"
            @pointermove="option.disabled ? undefined : (activeValue = option.value)"
          >
            <span v-if="selectedIndicator !== null" class="ce-dropdown-select__check" aria-hidden="true">
              <AppIcon v-if="option.value === modelValue && usesDefaultCheckIcon" name="check" :size="14" />
              <template v-else>{{ option.value === modelValue ? selectedIndicator : '' }}</template>
            </span>
            <span v-if="option.icon != null" aria-hidden="true">{{ option.icon }}</span>
            <span class="ce-dropdown-select__option-content">
              <slot name="option" :option="option" :state="{ selected: option.value === modelValue, disabled: !!option.disabled, active: option.value === active?.value }">{{ option.label }}</slot>
            </span>
          </div>
        </template>
        <div v-else class="ce-dropdown-select__empty">
          <slot name="empty">
            {{ emptyContent }}
          </slot>
        </div>
      </div>
      <div v-if="footer != null || $slots.footer" class="ce-dropdown-select__footer">
        <slot name="footer">
          {{ footer }}
        </slot>
      </div>
    </div>
  </Teleport>
</template>

