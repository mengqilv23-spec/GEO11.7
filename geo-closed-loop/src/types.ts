export interface BrandKnowledgeDraft {
  name: string
  alias: string
  website?: string
  industry: string
  description: string
}

export interface ProductKnowledgeDraft {
  id: string
  name: string
  useCase: string
  strengths: string
  customerGroup: string
  isPrimary: boolean
}

export interface MarketLanguageDraft {
  market: string
  language: string
}

export interface BuyerPersona {
  id: string
  type: string
  purchaseStage: string
  commonQuestions?: string
  actualRole: string
  industry: string
  companySize: string
  decisionRole: string
  purchaseTrigger: string
  purchaseBudget: string
  purchaseCycle: string
  discoveryChannel: string
}

export interface CompetitorKnowledgeDraft {
  id: string
  name: string
  domain: string
  alias: string
  description: string
  confirmed: boolean
}

export interface KnowledgeItem {
  id: string
  index: string
  title: string
  summary: string
  requirements: string
  brand?: BrandKnowledgeDraft
  products?: ProductKnowledgeDraft[]
  marketLanguage?: MarketLanguageDraft
  competitors?: CompetitorKnowledgeDraft[]
}

