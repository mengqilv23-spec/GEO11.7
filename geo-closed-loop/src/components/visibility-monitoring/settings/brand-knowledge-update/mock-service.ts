import type { MonitoringQuestion } from '../../../../data/visibility-monitoring-data'
import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeChangeImpact, BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'

const clone = <T>(value: T): T => structuredClone(value)

const germanQuestions = [
  'Welche 5-Achs-Wasserstrahlschneidsysteme eignen sich für CFRP-Luftfahrtbauteile und welche Anbieter bieten präzise, delaminationsfreie Schnitte?',
  'Welche Hersteller bieten Wasserstrahlschneidanlagen für die präzise Bearbeitung von Verbundwerkstoffen in der Luftfahrt?',
  'Wie wählen Einkäufer ein 5-Achs-Wasserstrahlsystem für anspruchsvolle Verbundwerkstoffe aus?',
  'Welche Vorteile bietet Wasserstrahlschneiden gegenüber Laserschneiden bei CFK-Bauteilen?',
  'Welche technischen Merkmale sind bei der Beschaffung einer industriellen Wasserstrahlanlage wichtig?',
  'Wie lässt sich die Schnittqualität bei komplexen Luftfahrtbauteilen zuverlässig bewerten?',
  'Welche Anbieter unterstützen die präzise Bearbeitung von Titan und Verbundwerkstoffen?',
]

const englishQuestions = [
  'Which 5-axis waterjet systems are suitable for CFRP aerospace parts and deliver precise, delamination-free cuts?',
  'Which manufacturers offer waterjet cutting systems for precision aerospace composites?',
  'How should buyers evaluate a 5-axis waterjet system for advanced composite materials?',
  'What are the advantages of waterjet cutting over laser cutting for carbon-fiber parts?',
  'Which technical features matter when purchasing an industrial waterjet system?',
  'How can manufacturers assess cut quality for complex aerospace components?',
  'Which suppliers support precision machining of titanium and composite materials?',
]

const frenchQuestions = [
  'Quels systèmes de découpe au jet d’eau 5 axes conviennent aux pièces aéronautiques en CFRP sans délaminage ?',
  'Quels fabricants proposent des systèmes de découpe au jet d’eau de précision pour les composites aéronautiques ?',
  'Comment évaluer un système de découpe au jet d’eau 5 axes pour les matériaux composites avancés ?',
  'Quels sont les avantages du jet d’eau par rapport au laser pour les pièces en fibre de carbone ?',
  'Quelles caractéristiques techniques comptent lors de l’achat d’un système industriel au jet d’eau ?',
  'Comment évaluer la qualité de coupe de pièces aéronautiques complexes ?',
  'Quels fournisseurs usinent avec précision le titane et les matériaux composites ?',
]

function buildQuestions(marketId: string, language: string): MonitoringQuestion[] {
  const texts = language === '德语' ? germanQuestions : language === '法语' ? frenchQuestions : englishQuestions
  return texts.map((question, index) => {
    const base = visibilityMonitoringData.questions[index % visibilityMonitoringData.questions.length]!
    return {
      ...clone(base),
      id: `${marketId}-ai-${String(index + 1).padStart(2, '0')}`,
      question,
    }
  })
}

function createInitialSnapshot(): BrandKnowledgeUpdateSnapshot {
  const allQuestions = visibilityMonitoringData.questions
  const markets: MarketRecommendationState[] = [
    { id: 'de-de', name: '德国 · 德语', language: '德语', enabled: true, processed: false, candidates: [], selectedCandidateIds: [], existingQuestions: clone(allQuestions.slice(0, 3)) },
    { id: 'us-en', name: '美国 · 英语', language: '英语', enabled: true, processed: false, candidates: [], selectedCandidateIds: [], existingQuestions: clone(allQuestions.slice(3, 6)) },
    { id: 'fr-fr', name: '法国 · 法语', language: '法语', enabled: false, processed: false, candidates: [], selectedCandidateIds: [], existingQuestions: clone(allQuestions.slice(6, 9)) },
  ]
  return {
    demo: true,
    editQuota: { total: 3, remaining: 2 },
    knowledgeItems: [],
    markets,
  }
}

export function createMockBrandKnowledgeUpdateService(seed?: BrandKnowledgeUpdateSnapshot): BrandKnowledgeUpdateService {
  let state = clone(seed ?? createInitialSnapshot())

  const getSnapshot = async (): Promise<BrandKnowledgeUpdateSnapshot> => clone(state)

  const previewChange = async (_items: KnowledgeItem[]): Promise<BrandKnowledgeChangeImpact> => ({
    activeMarketCount: state.markets.filter(market => market.enabled).length,
    editCost: 1,
    remainingEdits: Math.max(0, state.editQuota.remaining - 1),
    quotaAvailable: state.editQuota.remaining > 0,
  })

  const confirmChange = async (items: KnowledgeItem[]): Promise<BrandKnowledgeUpdateSnapshot> => {
    if (state.editQuota.remaining < 1)
      throw new Error('品牌知识修改次数不足，暂时无法确认')

    state = {
      ...state,
      editQuota: { ...state.editQuota, remaining: state.editQuota.remaining - 1 },
      knowledgeItems: clone(items),
      markets: state.markets.map(market => ({
        ...market,
        enabled: false,
        processed: false,
        selectedCandidateIds: [],
        candidates: buildQuestions(market.id, market.language),
      })),
    }
    return getSnapshot()
  }

  const saveMarketSelection = async (marketId: string, candidateIds: string[]): Promise<BrandKnowledgeUpdateSnapshot> => {
    const market = state.markets.find(item => item.id === marketId)
    if (!market)
      throw new Error('未找到该市场')

    const uniqueIds = [...new Set(candidateIds)]
    if (uniqueIds.length > 5)
      throw new Error('每个市场最多选择 5 条推荐问题')
    const candidateById = new Map(market.candidates.map(candidate => [candidate.id, candidate]))
    if (uniqueIds.some(id => !candidateById.has(id)))
      throw new Error('选择中包含无效或已过期的候选问题')

    const currentIds = new Set(market.existingQuestions.map(question => question.id))
    const selectedQuestions = uniqueIds.map(id => candidateById.get(id)!).filter(question => !currentIds.has(question.id))
    state = {
      ...state,
      markets: state.markets.map(item => item.id === marketId
        ? {
            ...item,
            processed: true,
            selectedCandidateIds: uniqueIds,
            existingQuestions: [...item.existingQuestions, ...clone(selectedQuestions)],
          }
        : item),
    }
    return getSnapshot()
  }

  const enableAllMarkets = async (): Promise<BrandKnowledgeUpdateSnapshot> => {
    state = { ...state, markets: state.markets.map(market => ({ ...market, enabled: true })) }
    return getSnapshot()
  }

  return { getSnapshot, previewChange, confirmChange, saveMarketSelection, enableAllMarkets }
}

export type { MonitoringQuestion }

