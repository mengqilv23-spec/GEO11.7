import type { BrandMetric, PageResult, PersonaMetric, PlatformMetric, QuestionHit, RoundDetail, RoundSummary, SourceDomainMetric, SourcePageMetric } from '../api/monitoring'
import { computed, ref, shallowRef } from 'vue'
import { getBrandMetrics, getPersonaMetrics, getPlatformMetrics, getQuestionHits, getRoundDetail, getRounds, getSourceDomains, getSourcePages } from '../api/monitoring'

export interface CumulativeSamplingSummary {
  executedCount: number
  plannedCount: number
  validCount: number
  roundCount: number
  periodStart: string
  periodEnd: string
  complete: boolean
}

export function useMonitoringRound() {
  const round = shallowRef<RoundSummary | null>(null)
  const detail = shallowRef<RoundDetail | null>(null)
  const brandMetrics = shallowRef<BrandMetric[]>([])
  const platformMetrics = shallowRef<PlatformMetric[]>([])
  const personaMetrics = shallowRef<PersonaMetric[]>([])
  const questionHits = shallowRef<QuestionHit[]>([])
  const sourceDomains = shallowRef<PageResult<SourceDomainMetric> | null>(null)
  const sourcePages = shallowRef<PageResult<SourcePageMetric> | null>(null)
  const cumulativeSampling = shallowRef<CumulativeSamplingSummary | null>(null)
  const loading = ref(false)
  const error = ref('')
  const empty = computed(() => !loading.value && !error.value && round.value === null)

  function clearSnapshot() {
    round.value = null
    detail.value = null
    brandMetrics.value = []
    platformMetrics.value = []
    personaMetrics.value = []
    questionHits.value = []
    sourceDomains.value = null
    sourcePages.value = null
    cumulativeSampling.value = null
  }

  async function load() {
    if (loading.value)
      return
    loading.value = true
    error.value = ''
    clearSnapshot()
    try {
      const firstPage = await getRounds({ pageNum: 1, pageSize: 100 })
      const roundPages = await Promise.all(Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) => getRounds({ pageNum: index + 2, pageSize: 100 })))
      const allRounds = [...firstPage.records, ...roundPages.flatMap(result => result.records)]
      const latestRound = allRounds[0]
      if (!latestRound) {
        loading.value = false
        return
      }

      round.value = latestRound
      const [roundDetail, brands, platforms, personas, questions, domains, pages] = await Promise.all([
        getRoundDetail(latestRound.id),
        getBrandMetrics(latestRound.id),
        getPlatformMetrics(latestRound.id),
        getPersonaMetrics(latestRound.id),
        getQuestionHits(latestRound.id),
        getSourceDomains(latestRound.id, 1, 50),
        getSourcePages(latestRound.id, 1, 50),
      ])
      detail.value = roundDetail
      const historicalDetails = await Promise.allSettled(allRounds.map(item => item.id === latestRound.id ? Promise.resolve(roundDetail) : getRoundDetail(item.id)))
      const complete = historicalDetails.every(result => result.status === 'fulfilled')
      if (complete) {
        const details = historicalDetails.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
        const dates = details.map(item => item.monitorDate).sort()
        cumulativeSampling.value = {
          executedCount: details.reduce((total, item) => total + item.finishedSampleCount, 0),
          plannedCount: details.reduce((total, item) => total + item.totalSample, 0),
          validCount: details.reduce((total, item) => total + item.validSample, 0),
          roundCount: details.length,
          periodStart: dates[0] ?? latestRound.monitorDate,
          periodEnd: dates.at(-1) ?? latestRound.monitorDate,
          complete: true,
        }
      }
      else {
        cumulativeSampling.value = { executedCount: 0, plannedCount: 0, validCount: 0, roundCount: allRounds.length, periodStart: '', periodEnd: '', complete: false }
      }
      brandMetrics.value = brands
      platformMetrics.value = platforms
      personaMetrics.value = personas
      questionHits.value = questions
      sourceDomains.value = domains
      sourcePages.value = pages
    }
    catch (cause) {
      clearSnapshot()
      error.value = cause instanceof Error ? cause.message : '监测轮次数据加载失败'
    }
    finally {
      loading.value = false
    }
  }

  return { round, detail, brandMetrics, platformMetrics, personaMetrics, questionHits, sourceDomains, sourcePages, cumulativeSampling, loading, error, empty, load }
}

