<script setup lang="ts">
import type { GeoPage, ServiceMode, UserRole } from '../../../data/geo-data'
import { shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import type { ProcessingPage } from '../../../workflows/data-processing'
import { useDataProcessing } from '../../../workflows/data-processing'
import MarketSwitcher from '../../market/MarketSwitcher.vue'
import GeoSectionNav from './GeoSectionNav.vue'

const props = defineProps<{
  activePage: GeoPage | 'overview' | 'visibility-monitoring' | 'brand-cognition' | 'report-center' | 'operations-review'
  serviceMode?: ServiceMode
  role: UserRole
}>()
const emit = defineEmits<{ 'update:role': [role: UserRole], 'update:serviceMode': [mode: ServiceMode] }>()
const router = useRouter()
const processing = useDataProcessing()
const statusOpen = shallowRef(false)
const processingPages: ProcessingPage[] = ['visibility-monitoring', 'diagnosis', 'optimization']
function openPage(page: ProcessingPage) {
  if (!processing.isReady(page).value) return
  statusOpen.value = false
  void router.push({ name: page, query: page === 'visibility-monitoring' ? {} : { version: props.serviceMode === 'agent' ? 'client' : 'managed' } })
}
</script>

<template>
  <div class="geo-workbench-toolbar">
    <div class="geo-workbench-toolbar__main">
      <GeoSectionNav :active-page="activePage" />
      <label v-if="activePage === 'diagnosis' || activePage === 'optimization'" class="geo-workbench-toolbar__role">
        <span>产品版本</span>
        <select aria-label="产品版本" :value="serviceMode || 'managed'" @change="emit('update:serviceMode', ($event.target as HTMLSelectElement).value as ServiceMode)">
          <option value="managed">AI + 专家 + 客户</option>
          <option value="agent">AI + 客户</option>
        </select>
      </label>
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
      <div class="geo-workbench-toolbar__processing">
        <button type="button" class="geo-workbench-toolbar__processing-trigger" :aria-expanded="statusOpen" aria-controls="geo-processing-status" @click="statusOpen = !statusOpen">
          <span v-if="processing.running.value" class="geo-workbench-toolbar__processing-dot" aria-hidden="true" />
          数据状态
          <span v-if="processing.running.value" class="geo-workbench-toolbar__processing-count">{{ processing.completed.value }}/3</span>
        </button>
        <div v-if="statusOpen" id="geo-processing-status" class="geo-workbench-toolbar__processing-panel" role="status">
          <strong>数据处理进度</strong>
          <p v-if="!processing.hasRun.value">暂无正在处理的数据</p>
          <p v-else-if="processing.running.value">预计需要 10～20 分钟</p>
          <p v-else>本轮数据已全部处理完成</p>
          <div v-if="processing.hasRun.value" class="geo-workbench-toolbar__processing-list">
            <button v-for="(page, index) in processingPages" :key="page" type="button" :disabled="!processing.isReady(page).value" @click="openPage(page)">
              <span>{{ processing.labels[page] }}</span>
              <small>{{ processing.completed.value > index ? '已完成 · 查看 →' : processing.completed.value === index ? '处理中' : '等待中' }}</small>
            </button>
          </div>
        </div>
      </div>
      <div class="geo-workbench-toolbar__market">
        <MarketSwitcher />
      </div>
    </div>
  </div>
</template>

<style scoped>
select { padding: 6px 10px; border: 1px solid var(--border-default); border-radius: 6px; background: var(--background-primary); color: var(--text-primary); font: inherit; }
.geo-workbench-toolbar__processing { position: relative; flex: 0 0 auto; }
.geo-workbench-toolbar__processing-trigger { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 10px; border: 1px solid var(--action-accent); border-radius: 8px; background: var(--action-subtle-background); color: var(--action-accent); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
.geo-workbench-toolbar__processing-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--action-accent); }
.geo-workbench-toolbar__processing-count { color: var(--action-accent); font-size: 12px; }
.geo-workbench-toolbar__processing-panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; box-sizing: border-box; width: 290px; max-width: calc(100vw - 32px); padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); box-shadow: var(--shadow-floating); }
.geo-workbench-toolbar__processing-panel strong { font-size: 14px; }
.geo-workbench-toolbar__processing-panel p { margin: 6px 0 12px; color: var(--text-secondary); font-size: 12px; }
.geo-workbench-toolbar__processing-list { display: grid; gap: 4px; }
.geo-workbench-toolbar__processing-list button { display: flex; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.geo-workbench-toolbar__processing-list button:hover:not(:disabled) { background: var(--background-subtle); }
.geo-workbench-toolbar__processing-list button:disabled { cursor: default; }
.geo-workbench-toolbar__processing-list small { color: var(--text-secondary); white-space: nowrap; }
</style>

