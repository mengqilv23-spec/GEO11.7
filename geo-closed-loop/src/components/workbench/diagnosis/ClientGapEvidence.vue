<script setup lang="ts">
import { computed } from 'vue'
import type { Persona } from '../../../data/geo-data'
import { diagnosisPlatforms, personaEvidence } from '../../../workflows/client-diagnosis'
import type { DiagnosisPlatform } from '../../../workflows/client-diagnosis'
import { useDiagnosisStore } from '../../../stores/diagnosis'

const props = defineProps<{ persona: Persona, linkedCount: (name: string) => number, platform: DiagnosisPlatform }>()
const emit = defineEmits<{ focus: [name: string], setPlatform: [platform: DiagnosisPlatform] }>()
const store = useDiagnosisStore()
const sample = computed(() => personaEvidence(props.persona, props.platform))
const visibleTopics = computed(() => sample.value.topics.filter(topic => topic.gap !== null && topic.gap > 0 && props.linkedCount(topic.name) > 0))
</script>

<template>
  <section class="client-gap-evidence">
    <div class="client-gap-head">
      <h3>关注点与品牌覆盖差距 <span title="买家关注度、我方与竞品覆盖率都以当前人设和平台下该关注点的有效回答数为分母；Gap = 买家关注度 − 我方覆盖率，仅展示 Gap 大于 0 且有关联策略的关注点。" aria-label="关注点与品牌覆盖差距说明">ⓘ</span></h3>
      <select :value="platform" aria-label="按 AI 平台筛选主题差距" @change="emit('setPlatform', ($event.target as HTMLSelectElement).value as DiagnosisPlatform)">
        <option value="全部平台">全部平台</option>
        <option v-for="item in diagnosisPlatforms" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>
    <div class="client-gap-list">
      <button v-for="(topic, index) in visibleTopics" :key="topic.name" type="button" class="client-gap-row" :class="{ 'is-active': store.selectedGap === topic.name }" :aria-pressed="store.selectedGap === topic.name" @click="emit('focus', topic.name)">
        <span class="client-gap-row__top"><span>{{ index + 1 }}. {{ topic.name }} ↗</span><b>Gap {{ topic.gap }}</b></span>
        <span class="client-gap-row__metrics">买家关注度 {{ topic.attention }}%（{{ topic.attentionHits }}/{{ topic.denominator }}） · 我方 {{ topic.own }}% · 竞品 {{ topic.rival }}%</span>
        <span class="client-gap-row__bottom"><small>点击筛选下方策略</small><em>关联策略 {{ linkedCount(topic.name) }}</em></span>
      </button>
      <p v-if="!visibleTopics.length" class="client-gap-empty">当前平台没有需要策略分析的覆盖差距。</p>
    </div>
  </section>

</template>

<style scoped>
.client-gap-evidence { min-width: 0; padding: 20px 24px; background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 12px; }
.client-gap-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border-default); }
h3 { margin: 0; font-size: 16px; }
h3 span { color: var(--text-secondary); font-weight: 400; cursor: help; }
.client-gap-head select { max-width: 150px; padding: 7px 9px; border: 1px solid var(--border-default); border-radius: 6px; background: var(--background-primary); color: var(--text-primary); font: inherit; font-size: 12px; }
.client-gap-empty { padding: 24px 0; color: var(--text-secondary); font-size: 13px; text-align: center; }
.client-gap-list { display: grid; }
.client-gap-row { display: grid; gap: 12px; width: 100%; padding: 15px 12px; border: 0; border-bottom: 1px solid var(--border-default); background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; font: inherit; }
.client-gap-row:last-child { border-bottom: 0; }
.client-gap-row:hover, .client-gap-row.is-active { background: var(--background-subtle); }
.client-gap-row__top, .client-gap-row__bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.client-gap-row__top b { flex: none; color: var(--action-accent); font-size: 14px; }
.client-gap-row__metrics { color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.client-gap-row__bottom small { color: var(--text-secondary); }
.client-gap-row__bottom em { flex: none; padding: 4px 8px; border-radius: 5px; background: var(--action-subtle-background); color: var(--action-accent); font-size: 12px; font-style: normal; }
</style>

