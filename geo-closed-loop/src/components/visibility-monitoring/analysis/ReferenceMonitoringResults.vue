<script setup lang="ts">
import type { CitedPage, MonitoringQuestion, SourceDomain, TrendMode, VisibilityTab } from '../../../data/visibility-monitoring-data'
import { shallowRef, watch } from 'vue'
import { referenceMonitoringResults as data } from '../../../data/reference-monitoring-results'
import QuestionDetailDrawer from '../questions/QuestionDetailDrawer.vue'
import QuestionHitDetails from '../questions/QuestionHitDetails.vue'
import SourceDetailDrawer from '../sources/SourceDetailDrawer.vue'
import SourceDomainTracking from '../sources/SourceDomainTracking.vue'
import BrandMentionAnalysis from './BrandMentionAnalysis.vue'

const props = defineProps<{ activeTab: VisibilityTab }>()
const trendMode = shallowRef<TrendMode>('overall')
const selectedQuestion = shallowRef<MonitoringQuestion | null>(null)
const selectedSource = shallowRef<SourceDomain | CitedPage | null>(null)
function openQuestion(id: string) {
  selectedSource.value = null
  selectedQuestion.value = data.relatedQuestions.find(question => question.id === id) ?? null
}
function openSource(id: string) {
  selectedQuestion.value = null
  selectedSource.value = data.sources.find(source => source.id === id) ?? data.citedPages.find(page => page.id === id) ?? null
}
watch(() => props.activeTab, () => {
  selectedQuestion.value = null
  selectedSource.value = null
})
</script>

<template>
  <section :id="`visibility-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`visibility-tab-${activeTab}`" class="reference-monitoring-results">
    <BrandMentionAnalysis
      v-if="activeTab === 'brand'"
      v-model="trendMode"
      :weeks="data.weeks" :overall-series="data.overallSeries" :series="data.trendSeries"
      :engine-series="data.engineSeries" :persona-series="data.personaSeries"
      :competitors="data.competitors" :personas="data.personas" :topics="data.topics" :intents="data.intents"
      :topic-cells="data.topicCells" :intent-cells="data.intentCells"
    />
    <QuestionHitDetails v-else-if="activeTab === 'questions'" :questions="data.questions" :platforms="data.platforms" @select-question="openQuestion" />
    <SourceDomainTracking v-else :sources="data.sources" :pages="data.citedPages" :platforms="data.platforms" @select-source="openSource" />
    <QuestionDetailDrawer
      :question="selectedQuestion" :open="!!selectedQuestion" :platforms="data.platforms"
      :pages="data.citedPages" :sources="data.sources" :brand="data.overview.brand"
      @close="selectedQuestion = null" @select-source="openSource"
    />
    <SourceDetailDrawer
      :source="selectedSource" :open="!!selectedSource" :sources="data.sources" :pages="data.citedPages"
      :questions="data.relatedQuestions" :platforms="data.platforms"
      @close="selectedSource = null" @select-page="openSource" @select-question="openQuestion"
    />
  </section>
</template>

