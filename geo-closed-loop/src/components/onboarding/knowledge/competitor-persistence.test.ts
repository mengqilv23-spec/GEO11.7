import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addCompetitor, getMarketCompetitors, updateCompetitor } from '../../../api/geo-config'
import { persistCompetitorDraft } from './competitor-persistence'

vi.mock('../../../api/geo-config', () => ({
  addCompetitor: vi.fn(),
  getMarketCompetitors: vi.fn(),
  updateCompetitor: vi.fn(),
}))

describe('persistCompetitorDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates an existing competitor and returns the refreshed record', async () => {
    vi.mocked(getMarketCompetitors).mockResolvedValue([{ id: 15, competitorName: 'Wix updated', domain: 'www.wix.com', aliasNames: 'Wix', competitorDesc: null, isCoreSov: 0, sourceType: 1, status: 1 }])
    const result = await persistCompetitorDraft({ id: '15', name: 'Wix updated', domain: 'www.wix.com', alias: 'Wix', description: '', confirmed: true })

    expect(updateCompetitor).toHaveBeenCalledWith(15, expect.objectContaining({ competitorName: 'Wix updated' }))
    expect(addCompetitor).not.toHaveBeenCalled()
    expect(result.record.id).toBe(15)
    expect(result.draft.name).toBe('Wix updated')
  })

  it('creates an unsaved competitor before refreshing the list', async () => {
    vi.mocked(addCompetitor).mockResolvedValue(27)
    vi.mocked(getMarketCompetitors).mockResolvedValue([])
    const result = await persistCompetitorDraft({ id: 'competitor-local', name: 'New competitor', domain: 'new.example', alias: '', description: '', confirmed: false })

    expect(addCompetitor).toHaveBeenCalledWith(expect.objectContaining({ competitorName: 'New competitor' }))
    expect(updateCompetitor).not.toHaveBeenCalled()
    expect(result.draft.id).toBe('27')
  })

  it('sends an existing draft with a missing backend ID to the update endpoint', async () => {
    vi.mocked(getMarketCompetitors).mockResolvedValue([])
    await persistCompetitorDraft({ id: 'null', name: 'Wix', domain: 'www.wix.com', alias: '', description: '', confirmed: true })
    expect(addCompetitor).not.toHaveBeenCalled()
    expect(updateCompetitor).toHaveBeenCalledWith(null, expect.anything())
  })
})

