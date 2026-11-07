<script setup lang="ts">
import type { ReportDetailProfile } from '../../data/report-detail-data'
import { computed } from 'vue'

const props = defineProps<{
  details: NonNullable<ReportDetailProfile['competitorDetails']>
}>()

const sampleDenominator = computed(() => {
  const values = props.details.platformMatrix.flatMap(row => Object.values(row.values))
    .map(value => value.denominator)
    .filter((value): value is number => value !== null)
  return values.length ? Math.max(...values) : null
})

function formatCell(value: { value: string, numerator: number | null, denominator: number | null } | undefined, showSample: boolean): string {
  if (!value)
    return '—'
  const count = showSample && value.numerator !== null && value.denominator !== null
    ? `${value.numerator}/${value.denominator} · `
    : ''
  return `${count}${value.value}`
}
</script>

<template>
  <section class="competitor-breakdown">
    <header class="breakdown-heading">
      <h3 class="competitor-breakdown-title">
        差距拆解：本品与竞品同维对照
      </h3>
      <span>逐题回答中的品牌记录聚合；展示口径以接口返回为准</span>
    </header>

    <section class="breakdown-module">
      <header class="module-heading">
        <h4>1. AI 平台 × 品牌提及</h4>
        <span v-if="sampleDenominator !== null">样例回答命中数 / {{ sampleDenominator }} 条回答</span>
      </header>
      <div v-if="details.platformMatrix.length" class="table-wrap">
        <table class="platform-brand-table">
          <thead>
            <tr>
              <th>平台</th><th v-for="brand in details.brands" :key="brand">
                {{ brand }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in details.platformMatrix" :key="row.dimension">
              <th>{{ row.dimension }}</th>
              <td v-for="brand in details.brands" :key="brand">
                {{ formatCell(row.values[brand], true) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="module-empty">
        接口暂未返回平台 × 品牌对照数据。
      </p>
      <p v-if="details.narratives.gapPlatform" class="module-summary">
        <strong>模块总结：</strong>{{ details.narratives.gapPlatform }}
      </p>
    </section>

    <section class="breakdown-module">
      <header class="module-heading">
        <h4>2. 买家人设 × 意图 × 品牌提及</h4>
        <span>同一组问题与回答样例，按品牌出现次数计算</span>
      </header>
      <div v-if="details.personaIntentMatrix.length" class="table-wrap">
        <table class="persona-intent-brand-table">
          <thead>
            <tr>
              <th>人设 × 意图</th><th v-for="brand in details.brands" :key="brand">
                {{ brand }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in details.personaIntentMatrix" :key="row.dimension">
              <th>{{ row.dimension }}</th>
              <td v-for="brand in details.brands" :key="brand">
                {{ formatCell(row.values[brand], false) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="module-empty">
        接口暂未返回人设 × 意图 × 品牌对照数据。
      </p>
      <p v-if="details.narratives.gapPersonaIntent" class="module-summary">
        <strong>模块总结：</strong>{{ details.narratives.gapPersonaIntent }}
      </p>
    </section>
  </section>
</template>

<style scoped>
.competitor-breakdown {
  display: grid;
  gap: 16px;
  margin-top: 14px;
  padding: 18px;
  border: 1px solid #dbe4ef;
  border-radius: 10px;
  background: #fff;
}

.breakdown-heading,
.module-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.breakdown-heading h3,
.module-heading h4 {
  margin: 0;
  color: #1e293b;
}

.breakdown-heading h3 { font-size: 17px; }
.module-heading h4 { font-size: 15px; }
.breakdown-heading > span,
.module-heading > span { color: #8190a5; font-size: 12px; text-align: right; }

.breakdown-module {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #dbe4ef;
  border-radius: 9px;
}

.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: #526176; font-size: 13px; }
th, td { padding: 11px 12px; border-bottom: 1px solid #e4ebf3; text-align: left; vertical-align: top; }
thead th { background: #f6f8fb; color: #687991; font-weight: 600; white-space: nowrap; }
tbody th { color: #273449; font-weight: 600; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.module-summary { margin: 0; padding: 12px 14px; border-radius: 7px; background: #eef5ff; color: #45566d; line-height: 1.65; }
.module-summary strong { color: #1e293b; }
.module-empty { margin: 0; padding: 14px; border-radius: 7px; background: #f7f9fc; color: #8592a3; }

@media (max-width: 760px) {
  .competitor-breakdown { padding: 12px; }
  .breakdown-heading, .module-heading { align-items: flex-start; flex-direction: column; gap: 6px; }
  .breakdown-heading > span, .module-heading > span { text-align: left; }
  .breakdown-module { padding: 12px; }
}
</style>

<style>
html[data-theme='dark'] .competitor-breakdown {
  border-color: #354357;
  background: #182230;
  color: #e6edf7;
}

html[data-theme='dark'] .competitor-breakdown .breakdown-module {
  border-color: #354357;
  background: #1b2736;
}

html[data-theme='dark'] .competitor-breakdown .breakdown-heading h3,
html[data-theme='dark'] .competitor-breakdown .module-heading h4 { color: #e6edf7; }

html[data-theme='dark'] .competitor-breakdown .breakdown-heading > span,
html[data-theme='dark'] .competitor-breakdown .module-heading > span { color: #b5c2d3; }

html[data-theme='dark'] .competitor-breakdown table { color: #c1ccda; }
html[data-theme='dark'] .competitor-breakdown th,
html[data-theme='dark'] .competitor-breakdown td { border-bottom-color: #354357; color: #c1ccda; }
html[data-theme='dark'] .competitor-breakdown thead th { background: #263446; color: #d3deeb; }
html[data-theme='dark'] .competitor-breakdown tbody th { color: #dce5f1; }
html[data-theme='dark'] .competitor-breakdown tbody tr:hover { background: #233246; }

html[data-theme='dark'] .competitor-breakdown .module-summary {
  background: #1b2a3d;
  color: #c1ccda;
}

html[data-theme='dark'] .competitor-breakdown .module-summary strong { color: #e6edf7; }
html[data-theme='dark'] .competitor-breakdown .module-empty { background: #202b3a; color: #b5c2d3; }
</style>

