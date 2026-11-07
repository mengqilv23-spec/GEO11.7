import type { MonitoringQuestion } from '../../../../data/visibility-monitoring-data'
import type { KnowledgeItem } from '../../../../types'

export interface BrandKnowledgeEditQuota {
  total: number
  remaining: number
}

export interface MarketRecommendationState {
  id: string
  name: string
  language: string
  enabled: boolean
  processed: boolean
  candidates: MonitoringQuestion[]
  selectedCandidateIds: string[]
  existingQuestions: MonitoringQuestion[]
}

export interface BrandKnowledgeUpdateSnapshot {
  demo: boolean
  editQuota: BrandKnowledgeEditQuota
  knowledgeItems: KnowledgeItem[]
  markets: MarketRecommendationState[]
}

export interface BrandKnowledgeChangeImpact {
  activeMarketCount: number
  editCost: number
  remainingEdits: number
  quotaAvailable: boolean
}

export interface BrandKnowledgeUpdateService {
  getSnapshot: () => Promise<BrandKnowledgeUpdateSnapshot>
  previewChange: (items: KnowledgeItem[]) => Promise<BrandKnowledgeChangeImpact>
  confirmChange: (items: KnowledgeItem[]) => Promise<BrandKnowledgeUpdateSnapshot>
  saveMarketSelection: (marketId: string, candidateIds: string[]) => Promise<BrandKnowledgeUpdateSnapshot>
  enableAllMarkets: () => Promise<BrandKnowledgeUpdateSnapshot>
}

