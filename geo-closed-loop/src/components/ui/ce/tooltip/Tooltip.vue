<script setup lang="ts">
import type { VNode, VNodeChild } from 'vue'
import {
  cloneVNode,
  computed,
  isVNode,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  useSlots,

  watch,
} from 'vue'
import { useModalBlocked } from '../overlay/useModalBlocked'
import { useOverlayLayer } from '../overlay/useOverlayLayer'
import { useOverlayScope } from '../overlay/useOverlayScope'

type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left'
type TooltipVariant = 'default' | 'callout'

interface TooltipProps {
  /** 简短说明内容，不应包含按钮或链接。 */
  content: unknown
  /** 仅在触发元素的文字实际被截断时显示。 */
  overflowOnly?: boolean
  /** 首选方向，空间不足时由宿主布局处理。 */
  placement?: TooltipPlacement
  /** Optional visual treatment for longer, instructional tooltip content. */
  variant?: TooltipVariant
  /** 禁用提示，不影响子元素原有行为。 */
  disabled?: boolean
}

const props = withDefaults(defineProps<TooltipProps>(), {
  overflowOnly: false,
  placement: 'top',
  variant: 'default',
  disabled: false,
})

const slots = useSlots()
const overlayScope = useOverlayScope()
const blocked = useModalBlocked()
const trigger = shallowRef<HTMLElement | null>(null)
const tooltip = shallowRef<HTMLElement | null>(null)
const tooltipPosition = shallowRef<{ left: number, top: number } | null>(null)
const overflowing = ref(false)
const open = ref(false)
const tooltipId = `ce-tooltip-${Math.random().toString(36).slice(2, 10)}`
let measureCleanup: (() => void) | undefined
let openTimer: number | undefined

function hasTooltipContent(content: unknown): boolean {
  if (Array.isArray(content))
    return content.some(hasTooltipContent)
  return content !== null
    && content !== undefined
    && content !== ''
    && typeof content !== 'boolean'
}

function flattenContent(content: unknown): VNodeChild[] {
  if (Array.isArray(content))
    return content.flatMap(flattenContent)
  if (content === null || content === undefined || content === '' || typeof content === 'boolean')
    return []
  return [content as VNodeChild]
}

const contentNodes = computed(() => flattenContent(props.content))
const enabled = computed(() => (
  !props.disabled
  && hasTooltipContent(props.content)
  && (!props.overflowOnly || overflowing.value)
))
const visible = computed(() => (
  enabled.value
  && open.value
  && !(overlayScope.scope === 'assistant' && blocked.value)
))

useOverlayLayer({
  open: visible,
  onEscape: () => { open.value = false },
  element: trigger,
})

function elementFromRef(value: unknown): HTMLElement | null {
  if (value instanceof HTMLElement)
    return value
  if (value && typeof value === 'object' && '$el' in value) {
    const el = (value as { $el?: unknown }).$el
    return el instanceof HTMLElement ? el : null
  }
  return null
}

function sourceVNode(): VNode | null {
  const candidates = slots.default?.() ?? []
  const vnode = candidates.find(candidate => isVNode(candidate) && candidate.type !== Comment)
  return vnode && isVNode(vnode) ? vnode : null
}

function syncTriggerVNode(vnode: VNode) {
  trigger.value = elementFromRef(vnode.el)
}

const source = computed(() => sourceVNode())
const sourceProps = computed(() => source.value?.props ?? {})
const sourceDescription = computed(() => String(sourceProps.value['aria-describedby'] ?? '').trim())
const sourceTabIndex = computed(() => sourceProps.value.tabindex ?? sourceProps.value.tabIndex)
const triggerTabIndex = computed(() => (
  sourceTabIndex.value ?? (props.overflowOnly && enabled.value ? 0 : undefined)
))
const triggerDescription = computed(() => (
  [sourceDescription.value, visible.value ? tooltipId : undefined].filter(Boolean).join(' ') || undefined
))

function handleFocusIn() {
  if (enabled.value)
    open.value = true
}

function handleMouseEnter() {
  if (!enabled.value)
    return
  window.clearTimeout(openTimer)
  openTimer = window.setTimeout(() => {
    openTimer = undefined
    if (enabled.value)
      open.value = true
  }, 300)
}

function handleMouseLeave(event: MouseEvent) {
  window.clearTimeout(openTimer)
  openTimer = undefined
  if (tooltip.value && event.relatedTarget instanceof Node && tooltip.value.contains(event.relatedTarget))
    return
  open.value = false
}

function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (trigger.value?.contains(next) || tooltip.value?.contains(next)))
    return
  open.value = false
}

function measureOverflow() {
  const element = trigger.value
  if (!element || !props.overflowOnly) {
    overflowing.value = false
    return
  }
  const next = (
    element.clientWidth > 0 && element.scrollWidth > element.clientWidth
  ) || (
    element.clientHeight > 0 && element.scrollHeight > element.clientHeight
  )
  overflowing.value = next
  if (!next)
    open.value = false
}

function observeOverflow() {
  measureCleanup?.()
  measureCleanup = undefined
  if (!trigger.value || !props.overflowOnly) {
    measureOverflow()
    return
  }

  measureOverflow()
  const element = trigger.value
  const resizeObserver = new ResizeObserver(measureOverflow)
  resizeObserver.observe(element)
  const mutationObserver = new MutationObserver(measureOverflow)
  mutationObserver.observe(element, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  })
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    mutationObserver.observe(ancestor, { attributes: true })
  }
  const fonts = document.fonts
  fonts?.addEventListener('loadingdone', measureOverflow)
  measureCleanup = () => {
    resizeObserver.disconnect()
    mutationObserver.disconnect()
    fonts?.removeEventListener('loadingdone', measureOverflow)
  }
}

watch([trigger, () => props.overflowOnly], observeOverflow, { flush: 'post' })
watch(enabled, (isEnabled) => {
  if (!isEnabled)
    open.value = false
})
onBeforeUnmount(() => {
  window.clearTimeout(openTimer)
  measureCleanup?.()
})

const teleportTarget = computed(() => (
  trigger.value?.closest('dialog')
  ?? overlayScope.container.value
  ?? document.body
))

function updateTooltipPosition() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) {
    tooltipPosition.value = null
    return
  }
  const gap = 6
  const positions: Record<TooltipPlacement, { left: number, top: number }> = {
    top: { left: rect.left + rect.width / 2, top: rect.top - gap },
    right: { left: rect.right + gap, top: rect.top + rect.height / 2 },
    bottom: { left: rect.left + rect.width / 2, top: rect.bottom + gap },
    left: { left: rect.left - gap, top: rect.top + rect.height / 2 },
  }
  const position = positions[props.placement]
  const element = tooltip.value
  if (!element) {
    tooltipPosition.value = position
    return
  }

  const { width, height } = element.getBoundingClientRect()
  const viewportPadding = 8
  const bounds = {
    left: viewportPadding,
    right: Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    top: viewportPadding,
    bottom: Math.max(viewportPadding, window.innerHeight - height - viewportPadding),
  }
  const boxLeft = props.placement === 'right'
    ? position.left
    : props.placement === 'left'
      ? position.left - width
      : position.left - width / 2
  const boxTop = props.placement === 'top'
    ? position.top - height
    : props.placement === 'bottom'
      ? position.top
      : position.top - height / 2
  const clampedLeft = Math.min(bounds.right, Math.max(bounds.left, boxLeft))
  const clampedTop = Math.min(bounds.bottom, Math.max(bounds.top, boxTop))
  const nextPosition = {
    left: props.placement === 'right'
      ? clampedLeft
      : props.placement === 'left'
        ? clampedLeft + width
        : clampedLeft + width / 2,
    top: props.placement === 'top'
      ? clampedTop + height
      : props.placement === 'bottom'
        ? clampedTop
        : clampedTop + height / 2,
  }
  tooltipPosition.value = nextPosition
  const arrowOffset = Math.max(0, Math.min(
    Math.max(0, height - 12),
    rect.top + rect.height / 2 - clampedTop - 6,
  ))
  element.style.setProperty('--ce-tooltip-arrow-top', `${arrowOffset}px`)
}

watch([visible, () => props.placement], ([isVisible], _previous, onCleanup) => {
  if (!isVisible) {
    tooltipPosition.value = null
    return
  }

  updateTooltipPosition()
  void nextTick(updateTooltipPosition)
  window.addEventListener('scroll', updateTooltipPosition, true)
  window.addEventListener('resize', updateTooltipPosition)
  window.visualViewport?.addEventListener('scroll', updateTooltipPosition)
  window.visualViewport?.addEventListener('resize', updateTooltipPosition)
  onCleanup(() => {
    window.removeEventListener('scroll', updateTooltipPosition, true)
    window.removeEventListener('resize', updateTooltipPosition)
    window.visualViewport?.removeEventListener('scroll', updateTooltipPosition)
    window.visualViewport?.removeEventListener('resize', updateTooltipPosition)
  })
}, { flush: 'post' })

const tooltipStyle = computed(() => {
  const position = tooltipPosition.value
  if (!position)
    return undefined
  return { left: `${position.left}px`, top: `${position.top}px` }
})

const triggerVNode = computed(() => {
  const vnode = source.value
  if (!vnode)
    return null
  return cloneVNode(vnode, mergeProps(vnode.props ?? {}, {
    'onVnodeMounted': syncTriggerVNode,
    'onVnodeUpdated': syncTriggerVNode,
    'aria-describedby': triggerDescription.value,
    'tabindex': triggerTabIndex.value,
    'onFocusin': handleFocusIn,
    'onFocusout': handleFocusOut,
    'onMouseenter': handleMouseEnter,
    'onMouseleave': handleMouseLeave,
  }))
})
</script>

<template>
  <component :is="triggerVNode" v-if="triggerVNode" />
  <Teleport v-if="visible" :to="teleportTarget">
    <div
      :id="tooltipId"
      ref="tooltip"
      class="ce-tooltip"
      role="tooltip"
      :data-placement="placement"
      :data-variant="variant"
      :style="tooltipStyle"
      @mouseenter="() => undefined"
      @mouseleave="open = false"
    >
      <div class="ce-tooltip__content">
        <template v-for="(item, index) in contentNodes" :key="index">
          <component :is="item" v-if="isVNode(item)" />
          <template v-else>
            {{ item }}
          </template>
        </template>
      </div>
    </div>
  </Teleport>
</template>

