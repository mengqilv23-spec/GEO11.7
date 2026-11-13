<script setup lang="ts">
import type { GeoPage } from '../../../data/geo-data'
import MarketSwitcher from '../../market/MarketSwitcher.vue'
import GeoSectionNav from './GeoSectionNav.vue'

defineProps<{
  activePage: GeoPage | 'overview' | 'visibility-monitoring' | 'content-verification' | 'report-center' | 'operations-review'
}>()
</script>

<template>
  <div class="geo-workbench-toolbar">
    <div class="geo-workbench-toolbar__main">
      <GeoSectionNav :active-page="activePage" />
      <div class="geo-workbench-toolbar__market">
        <MarketSwitcher />
      </div>
    </div>
  </div>
</template>


