<script setup lang="ts">
import type { CitedPage, MonitoringPlatformId, SourceDomain } from '../../../data/visibility-monitoring-data'

const props = defineProps<{ sources: readonly SourceDomain[], pages: readonly CitedPage[], platforms: readonly { id: MonitoringPlatformId, label: string }[] }>()
const emit = defineEmits<{ selectSource: [sourceId: string] }>()
function platformNames(ids: MonitoringPlatformId[]) {
  return ids.map(id => ({ id, label: props.platforms.find(platform => platform.id === id)?.label ?? id }))
}
function domainName(id: string) {
  return props.sources.find(source => source.id === id)?.domain ?? id
}
</script>

<template>
  <div class="vm-source-stack">
    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>信源域名追踪</h2><p>观察 AI 回答引用的外部域名、引用频率与品牌/竞品关联。</p></div><span class="vm-pill">{{ sources.length }} 个域名</span>
      </div>
      <div class="vm-table-scroll" tabindex="0" aria-label="来源域名表，可横向滚动">
        <table>
          <thead><tr><th>来源域名</th><th>命中问题数</th><th>引用次数</th><th>引用平台</th><th>我方是否提及</th><th>是否被竞品引用</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="source in sources" :key="source.id">
              <th scope="row">
                <button type="button" class="vm-link vm-domain" @click="emit('selectSource', source.id)">
                  {{ source.domain }}
                </button>
              </th><td>{{ source.questionCount }}</td><td>{{ source.citationCount }}</td><td><span class="vm-platform-list"><span v-for="platform in platformNames(source.platforms)" :key="platform.id" class="vm-platform-chip"><i :class="`platform-${platform.id}`" />{{ platform.label }}</span></span></td><td><span class="vm-status" :class="source.ownBrandMentioned ? 'is-yes' : 'is-no'">{{ source.ownBrandMentioned ? '是' : '否' }}</span></td><td><span v-if="source.competitors.length" class="vm-chip-list"><span class="vm-status is-confirmed">是</span><span v-for="competitor in source.competitors" :key="competitor">{{ competitor }}</span></span><span v-else class="vm-status is-no">否</span></td><td class="vm-table-action-cell">
                <button class="vm-link geo-table-detail-button" type="button" @click="emit('selectSource', source.id)">
                  查看详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>被引页面追踪</h2><p>页面级引用记录与对应问题。</p></div>
      </div>
      <div class="vm-table-scroll" tabindex="0" aria-label="被引用页面表，可横向滚动">
        <table>
          <thead><tr><th>被引页面</th><th>来源域名</th><th>命中问题数</th><th>引用次数</th><th>引用平台</th><th>引用内容摘要</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="page in pages" :key="page.id">
              <th scope="row">
                <button type="button" class="vm-link vm-page-title" @click="emit('selectSource', page.id)">
                  {{ page.title }}
                </button>
              </th><td>{{ domainName(page.domainId) }}</td><td>{{ page.questionIds.length }}</td><td>{{ page.citations }}</td><td><span class="vm-platform-list"><span v-for="platform in platformNames(page.platforms)" :key="platform.id" class="vm-platform-chip"><i :class="`platform-${platform.id}`" />{{ platform.label }}</span></span></td><td class="vm-summary">
                {{ page.summary }}
              </td><td class="vm-table-action-cell">
                <button class="vm-link geo-table-detail-button" type="button" @click="emit('selectSource', page.id)">
                  查看详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.vm-source-stack { display: grid; gap: 24px; }
.vm-card { min-width: 0; padding: 20px; background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 12px; }
.vm-section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.vm-section-head h2 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-section-head p { margin: 4px 0 0; color: var(--text-secondary); }
.vm-pill { flex: 0 0 auto; padding: 5px 12px; background: var(--background-subtle); border-radius: 999px; color: var(--text-secondary); }
.vm-table-scroll { max-width: 100%; overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
table { width: 100%; min-width: 920px; border-collapse: collapse; text-align: left; }
th, td { padding: 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
thead { color: var(--text-secondary); background: var(--background-subtle); }
th { font-weight: 600; white-space: nowrap; }
tbody th { white-space: normal; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.vm-link { padding: 0; color: var(--action-accent); background: transparent; border: 0; font: inherit; text-align: left; cursor: pointer; }
.vm-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.vm-domain { font-family: var(--font-family-mono); overflow-wrap: anywhere; }
.vm-page-title { min-width: 180px; }
.vm-summary { min-width: 220px; color: var(--text-secondary); }
.vm-table-action-cell { width: 112px; min-width: 112px; white-space: nowrap; vertical-align: middle; }
.vm-table-action-cell .vm-link { display: inline-block; white-space: nowrap; }
.vm-status, .vm-chip-list span { display: inline-flex; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.is-yes { color: var(--status-success-foreground); background: var(--status-success-background); }
.is-no { color: var(--status-error-foreground); background: var(--status-error-background); }
.vm-chip-list { display: flex; flex-wrap: wrap; gap: 4px; }
.vm-chip-list span { color: var(--action-accent); background: var(--action-subtle-background); }
.vm-chip-list .is-confirmed { color: var(--action-accent); background: var(--action-subtle-background); }
.vm-platform-list { display: flex; flex-wrap: wrap; gap: 5px; min-width: 126px; }
.vm-platform-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border: 1px solid var(--border-default); border-radius: 999px; color: var(--text-secondary); font-size: 11px; white-space: nowrap; }
.vm-platform-chip i { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; }
.platform-perplexity { background: #7c3aed !important; }
.platform-google-ai { background: #f59e0b !important; }
.platform-gemini { background: #059669 !important; }
.platform-ai-mode { background: #0891b2 !important; }
@media (max-width: 520px) { .vm-card { padding: 16px; } .vm-section-head { flex-direction: column; } }
</style>

