<script setup lang="ts">
import { onMounted } from 'vue'
import GeoProductGuide from './components/guide/GeoProductGuide.vue'
import Spinner from './components/ui/ce/spinner/Spinner.vue'
import { useGeoContextStore } from './stores/geo-context'

const geoContext = useGeoContextStore()

function initializeContext() {
  void geoContext.initialize().catch(() => undefined)
}

onMounted(initializeContext)
</script>

<template>
  <main v-if="!geoContext.initialized" class="app-context-loading" aria-live="polite">
    <section v-if="geoContext.error && !geoContext.loading" class="app-context-error" role="alert">
      <p>{{ geoContext.error }}</p>
      <button type="button" @click="initializeContext">
        重试
      </button>
    </section>
    <Spinner v-else />
  </main>
  <template v-else>
    <RouterView />
    <GeoProductGuide />
  </template>
</template>

<style scoped>
.app-context-loading { display: grid; min-height: 100vh; place-items: center; padding: 24px; color: var(--text-secondary); }
.app-context-error { display: grid; justify-items: center; gap: 12px; color: var(--status-error-foreground); text-align: center; }
.app-context-error p { margin: 0; }
.app-context-error button { padding: 8px 16px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--background-primary); color: var(--text-primary); cursor: pointer; }
.app-context-error button:disabled { cursor: wait; opacity: 0.65; }
</style>

