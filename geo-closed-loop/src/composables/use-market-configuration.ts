import type { BrandInfoRecord, BrandProductRecord, BuyerPersonaRecord, CompetitorRecord, MarketThemeRecord, MonitoringQuestionRecord, RecommendationRecord, SelectedPlatformRecord } from '../api/geo-config'
import { ref } from 'vue'
import { getBrandInfo, getBrandProducts, getMarketCompetitors, getMarketPersonas, getMarketPlatforms, getMarketQuestions, getMarketThemes, getRecommendationItems } from '../api/geo-config'

export function useMarketConfiguration() {
  const brand = ref<BrandInfoRecord | null>(null)
  const products = ref<BrandProductRecord[]>([])
  const competitors = ref<CompetitorRecord[]>([])
  const personas = ref<BuyerPersonaRecord[]>([])
  const questions = ref<MonitoringQuestionRecord[]>([])
  const themes = ref<MarketThemeRecord[]>([])
  const platforms = ref<SelectedPlatformRecord[]>([])
  const competitorRecommendations = ref<RecommendationRecord[]>([])
  const loading = ref(false)
  const errors = ref({ brand: '', competitors: '', competitorRecommendations: '', personas: '', questions: '', themes: '', platforms: '' })

  async function load() {
    loading.value = true
    brand.value = null
    products.value = []
    competitors.value = []
    personas.value = []
    questions.value = []
    themes.value = []
    platforms.value = []
    competitorRecommendations.value = []
    errors.value = { brand: '', competitors: '', competitorRecommendations: '', personas: '', questions: '', themes: '', platforms: '' }
    const results = await Promise.allSettled([
      Promise.all([getBrandInfo(), getBrandProducts()]),
      getMarketCompetitors(),
      getMarketPersonas(),
      getMarketQuestions(),
      getMarketThemes(),
      getMarketPlatforms(),
      getRecommendationItems({ recommendType: 3, itemStatus: 1 }),
    ] as const)
    if (results[0]?.status === 'fulfilled') {
      brand.value = results[0].value[0]
      products.value = results[0].value[1]
    }
    else {
      errors.value.brand = errorMessage(results[0]?.reason, '品牌资料加载失败')
    }
    if (results[1]?.status === 'fulfilled')
      competitors.value = results[1].value
    else errors.value.competitors = errorMessage(results[1]?.reason, '竞品加载失败')
    if (results[2]?.status === 'fulfilled')
      personas.value = results[2].value
    else errors.value.personas = errorMessage(results[2]?.reason, '买家人设加载失败')
    if (results[3]?.status === 'fulfilled')
      questions.value = results[3].value
    else errors.value.questions = errorMessage(results[3]?.reason, '监测问题加载失败')
    if (results[4]?.status === 'fulfilled')
      themes.value = results[4].value
    else errors.value.themes = errorMessage(results[4]?.reason, '主题关键词加载失败')
    if (results[5]?.status === 'fulfilled')
      platforms.value = results[5].value
    else errors.value.platforms = errorMessage(results[5]?.reason, 'AI 平台加载失败')
    if (results[6]?.status === 'fulfilled')
      competitorRecommendations.value = results[6].value
    else errors.value.competitorRecommendations = errorMessage(results[6]?.reason, '竞品推荐加载失败')
    loading.value = false
  }

  return { brand, products, competitors, personas, questions, themes, platforms, competitorRecommendations, loading, errors, load }
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

