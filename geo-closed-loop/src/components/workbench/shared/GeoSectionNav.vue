<script setup lang="ts">
import type { GeoPage } from '../../../data/geo-data'

defineProps<{
  activePage: GeoPage | 'overview' | 'visibility-monitoring' | 'report-center' | 'operations-review'
}>()

const navItems = [
  { page: 'overview', label: '概览', route: 'overview' },
  { page: 'visibility-monitoring', label: '可见性监测', route: 'visibility-monitoring' },
  { page: 'report-center', label: '报告中心', route: 'report-center' },
  { page: 'diagnosis', label: '诊断与策略', route: 'diagnosis' },
  { page: 'optimization', label: '优化中心', route: 'optimization' },
  { page: 'operations-review', label: '运营复盘与 Agent 升级', route: 'operations-review' },
] as const
</script>

<template>
  <nav class="geo-section-nav" aria-label="GEO 智能体页面">
    <RouterLink
      v-for="item in navItems"
      :key="item.page"
      class="geo-section-nav__item"
      :class="{ 'is-active': activePage === item.page }"
      :to="{ name: item.route }"
      :aria-current="activePage === item.page ? 'page' : undefined"
    >
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

