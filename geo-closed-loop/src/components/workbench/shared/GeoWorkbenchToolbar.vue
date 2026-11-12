<script setup lang="ts">
import type { GeoPage, ServiceMode, UserRole } from '../../../data/geo-data'
import MarketSwitcher from '../../market/MarketSwitcher.vue'
import GeoSectionNav from './GeoSectionNav.vue'

defineProps<{
  activePage: GeoPage | 'overview' | 'visibility-monitoring' | 'content-verification' | 'report-center' | 'operations-review'
  serviceMode?: ServiceMode
  role: UserRole
}>()
const emit = defineEmits<{ 'update:role': [role: UserRole], 'update:serviceMode': [mode: ServiceMode] }>()
</script>

<template>
  <div class="geo-workbench-toolbar">
    <div class="geo-workbench-toolbar__main">
      <GeoSectionNav :active-page="activePage" />
      <div v-if="serviceMode !== 'agent'" class="geo-workbench-toolbar__role" aria-label="本地模拟角色">
        <span>本地角色</span>
        <div class="geo-role-switch" role="group" aria-label="切换体验角色">
          <button type="button" :aria-pressed="role === 'ops'" :class="{ 'is-active': role === 'ops' }" @click="emit('update:role', 'ops')">
            专家
          </button>
          <button type="button" :aria-pressed="role === 'client'" :class="{ 'is-active': role === 'client' }" @click="emit('update:role', 'client')">
            客户
          </button>
        </div>
      </div>
      <div class="geo-workbench-toolbar__market">
        <MarketSwitcher />
      </div>
    </div>
  </div>
</template>


