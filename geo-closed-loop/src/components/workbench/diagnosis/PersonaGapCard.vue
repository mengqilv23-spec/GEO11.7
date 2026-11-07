<script setup lang="ts">
import type { PersonaGap } from '../../../data/geo-data'
import { storeToRefs } from 'pinia'
import { useDiagnosisStore } from '../../../stores/diagnosis'
import ActionCard from '../../ui/ce/card/ActionCard.vue'
import Card from '../../ui/ce/card/Card.vue'
import Tag from '../../ui/ce/tag/Tag.vue'
import Tooltip from '../../ui/ce/tooltip/Tooltip.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'

interface PersonaGapItem extends PersonaGap {
  linkedCount: number
}

defineProps<{
  gaps: PersonaGapItem[]
}>()

const diagnosisStore = useDiagnosisStore()
const { selectedGap } = storeToRefs(diagnosisStore)
</script>

<template>
  <Card class="geo-gap-card">
    <div class="geo-card-head">
      <div class="geo-gap-card__title">
        <strong>当前人设的认知缺口</strong>
        <Tooltip content="Gap 指的是竞品正向覆盖率与我方正向覆盖率的差值">
          <span class="geo-help geo-gap-help" tabindex="0" aria-label="Gap 说明">?</span>
        </Tooltip>
      </div>
    </div>
    <div class="geo-gap-list">
      <ActionCard
        v-for="(gap, index) in gaps"
        :key="gap.name"
        class="geo-gap-row"
        :class="{ 'is-active': selectedGap === gap.name }"
        :aria-pressed="selectedGap === gap.name"
        @click="diagnosisStore.focusGap(gap.name)"
      >
        <span class="geo-gap-row__top">
          <span class="geo-gap-link">
            {{ index + 1 }}. {{ gap.name }} <AppIcon name="openExternal" :size="14" aria-hidden="true" />
          </span>
          <Tag class="geo-gap-score" tone="orange" variant="text" size="sm">
            Gap {{ gap.value }}
          </Tag>
        </span>
        <span v-if="gap.source" class="geo-gap-row__meta">
          <Tag v-if="gap.source" class="geo-gap-source" tone="neutral" variant="soft" size="sm">
            {{ gap.source }}
          </Tag>
        </span>
        <span class="geo-gap-row__foot">
          <small class="geo-gap-hint">点击可聚焦下方策略</small>
          <Tag class="geo-gap-linked-count" tone="blue" variant="soft" size="sm">
            关联策略 {{ gap.linkedCount }}
          </Tag>
        </span>
      </ActionCard>
    </div>
  </Card>
</template>

