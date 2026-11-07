import type { CompetitorRecord } from '../../../api/geo-config'
import type { CompetitorKnowledgeDraft } from '../../../types'
import { addCompetitor, getMarketCompetitors, updateCompetitor } from '../../../api/geo-config'

function toRecord(draft: CompetitorKnowledgeDraft, id: number | null): CompetitorRecord {
  return {
    id,
    competitorName: draft.name,
    domain: draft.domain || null,
    aliasNames: draft.alias || null,
    competitorDesc: draft.description || null,
    isCoreSov: 0,
    sourceType: 1,
    status: draft.confirmed ? 1 : 0,
  }
}

function toDraft(record: CompetitorRecord): CompetitorKnowledgeDraft {
  return {
    id: String(record.id),
    name: record.competitorName,
    domain: record.domain ?? '',
    alias: record.aliasNames ?? '',
    description: record.competitorDesc ?? '',
    confirmed: record.status === 1,
  }
}

export async function persistCompetitorDraft(draft: CompetitorKnowledgeDraft): Promise<{ draft: CompetitorKnowledgeDraft, record: CompetitorRecord }> {
  const id = Number(draft.id)
  const hasBackendId = Number.isSafeInteger(id) && id > 0
  const isNewDraft = draft.id.startsWith('competitor-')
  const input = {
    competitorName: draft.name,
    domain: draft.domain,
    aliasNames: draft.alias,
    competitorDesc: draft.description,
  }
  const competitorId = hasBackendId ? id : isNewDraft ? await addCompetitor(input) : draft.id === 'null' ? null : id
  if (!isNewDraft && !hasBackendId)
    await updateCompetitor(competitorId as number, input)
  else if (hasBackendId)
    await updateCompetitor(competitorId as number, input)

  const records = await getMarketCompetitors()
  const record = records.find(item => item.id === competitorId) ?? toRecord(draft, competitorId)
  return { draft: toDraft(record), record }
}

