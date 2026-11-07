<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useServerMarkets } from '../../composables/use-server-markets'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = withDefaults(defineProps<{
  popoverOnly?: boolean
}>(), {
  popoverOnly: false,
})

const emit = defineEmits<{
  selected: [marketId: number]
  dismissed: []
}>()
const router = useRouter()
const marketContext = useServerMarkets()
const open = ref(props.popoverOnly)
const root = ref<HTMLElement | null>(null)

function onDocumentPointerDown(event: PointerEvent) {
  // In the workbench toolbar the parent owns the shared popover lifecycle.
  if (props.popoverOnly)
    return
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    open.value = false
    emit('dismissed')
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (props.popoverOnly)
    return
  if (event.key === 'Escape' && open.value) {
    open.value = false
    emit('dismissed')
  }
}

async function selectMarket(id: number) {
  if (marketContext.switching.value)
    return
  if (id === marketContext.activeMarketId.value) {
    open.value = false
    return
  }
  try {
    await marketContext.activate(id)
    open.value = false
    emit('selected', id)
    // All subsequent business endpoints use the backend session's active market context.
    router.go(0)
  }
  catch {
    // The composable exposes the backend error in the popover; keep it open for retry.
  }
}

function retryLoad() {
  void marketContext.load()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  void marketContext.load()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div ref="root" class="market-switcher" :class="{ 'market-switcher--popover-only': props.popoverOnly }">
    <button
      v-if="!props.popoverOnly"
      class="market-switcher__trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="market-switcher__label">市场 / 语言</span>
      <span class="market-switcher__divider" aria-hidden="true" />
      <strong>{{ marketContext.activeMarket.value?.title ?? (marketContext.loading.value ? '加载市场中…' : '未选择市场') }}</strong>
      <AppIcon name="chevronDown" :size="14" class="market-switcher__chevron" :class="{ 'is-open': open }" />
    </button>

    <div v-if="open" class="market-switcher__popover" :class="{ 'market-switcher__popover--embedded': props.popoverOnly }" role="menu" aria-label="市场列表">
      <p class="market-switcher__caption">
        市场列表
      </p>
      <div v-if="marketContext.error.value" class="market-switcher__error" role="alert">
        <span>{{ marketContext.error.value }}</span>
        <button type="button" @click="retryLoad">
          重试
        </button>
      </div>
      <p v-else-if="marketContext.loading.value && !marketContext.items.value.length" class="market-switcher__empty" aria-live="polite">
        正在加载市场…
      </p>
      <p v-else-if="!marketContext.items.value.length" class="market-switcher__empty">
        暂无可用市场
      </p>
      <button
        v-for="market in marketContext.items.value"
        :key="market.id"
        class="market-switcher__option"
        :class="{ 'is-current': market.id === marketContext.activeMarketId.value }"
        type="button"
        role="menuitemradio"
        :aria-checked="market.id === marketContext.activeMarketId.value"
        :disabled="marketContext.switching.value || (!market.enabled && market.id !== marketContext.activeMarketId.value)"
        @click="selectMarket(market.id)"
      >
        <span class="market-switcher__flag" aria-hidden="true">🌐</span>
        <span class="market-switcher__market">{{ market.title }}</span>
        <span v-if="market.id === marketContext.activeMarketId.value" class="market-switcher__status is-current">当前</span>
        <span v-else class="market-switcher__status" :class="{ 'is-pending': !market.enabled }">{{ market.enabled ? '已启用' : '待配置' }}</span>
      </button>
      <p class="market-switcher__footnote">
        市场及启用状态由 GEO 服务提供
      </p>
    </div>
  </div>
</template>

<style scoped>
.market-switcher { position: relative; z-index: 30; width: min(320px, 100%); }
.market-switcher--popover-only { width: 100%; }
.market-switcher__trigger { display: flex; width: 100%; min-height: 40px; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: 11px; background: var(--background-primary); color: var(--text-primary); text-align: left; cursor: pointer; }
.market-switcher__trigger:focus-visible,.market-switcher__option:focus-visible,.market-switcher__error button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.market-switcher__label { color: var(--text-muted); font-size: 12px; font-weight: 600; white-space: nowrap; }
.market-switcher__divider { width: 1px; height: 16px; background: var(--border-divider); }
.market-switcher__trigger strong { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.market-switcher__chevron { flex: 0 0 auto; margin-left: auto; color: var(--text-muted); transition: transform 140ms ease; }
.market-switcher__chevron.is-open { transform: rotate(180deg); }
.market-switcher__popover { position: absolute; top: calc(100% + 8px); right: 0; box-sizing: border-box; width: min(380px, calc(100vw - 24px)); max-height: min(380px, calc(100vh - 110px)); overflow-y: auto; padding: 12px; border: 1px solid color-mix(in srgb, var(--action-accent) 20%, var(--border-default)); border-radius: 16px; background: radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--action-accent) 7%, transparent), transparent 60%), var(--background-primary); box-shadow: 0 20px 52px rgb(25 43 70 / 18%), 0 4px 14px color-mix(in srgb, var(--action-accent) 10%, transparent); }
.market-switcher__popover--embedded { position: static; width: 100%; max-height: min(420px, calc(100vh - 140px)); padding: 2px; border: 0; border-radius: 0; box-shadow: none; }
.market-switcher__caption { margin: 0 4px 10px; color: var(--text-secondary); font-size: 13px; font-weight: 650; }
.market-switcher__option { display: flex; width: 100%; min-height: 42px; align-items: center; gap: 10px; padding: 7px 10px; border: 1px solid transparent; border-radius: 11px; background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; transition: background 140ms ease, border-color 140ms ease, transform 140ms ease; }
.market-switcher__option:hover { background: var(--action-subtle-background); }
.market-switcher__option.is-current { border-color: color-mix(in srgb, var(--action-accent) 18%, transparent); background: linear-gradient(105deg, color-mix(in srgb, var(--action-accent) 10%, var(--background-primary)), color-mix(in srgb, var(--action-accent) 4%, var(--background-primary))); }
.market-switcher__option:hover:not(:disabled) { transform: translateY(-1px); }
.market-switcher__option:disabled { cursor: wait; opacity: .65; }
.market-switcher__flag { font-size: 16px; line-height: 1; }
.market-switcher__market { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
.market-switcher__status { padding: 3px 8px; border-radius: 999px; background: var(--status-success-background); color: var(--status-success-foreground); font-size: 11px; font-weight: 650; white-space: nowrap; }
.market-switcher__status.is-current { color: var(--action-accent); background: var(--background-primary); }
.market-switcher__status.is-pending { color: var(--text-muted); background: var(--background-secondary); }
.market-switcher__error { display: grid; gap: 8px; margin: 8px; padding: 10px; border-radius: 8px; background: var(--status-error-background); color: var(--status-error-foreground); font-size: var(--font-size-caption); }
.market-switcher__error button { justify-self: start; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
.market-switcher__empty { margin: 8px; color: var(--text-muted); font-size: var(--font-size-caption); }
.market-switcher__footnote { margin: 10px 4px 0; padding: 10px 0 0; border-top: 1px solid color-mix(in srgb, var(--action-accent) 12%, var(--border-divider)); color: var(--text-muted); font-size: 11px; line-height: 16px; }
@media (max-width: 680px) { .market-switcher { width: min(100%, 320px); } .market-switcher__trigger { gap: 7px; padding-inline: 10px; } .market-switcher__trigger strong { font-size: 13px; } .market-switcher__popover { width: min(360px, calc(100vw - 24px)); } }
</style>

