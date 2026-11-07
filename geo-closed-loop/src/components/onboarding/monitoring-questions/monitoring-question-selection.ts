export const maxMonitoringQuestions = 5

export function canSelectMonitoringQuestion(
  id: string,
  selectedIds: readonly string[],
  limit = maxMonitoringQuestions,
) {
  return selectedIds.includes(id) || selectedIds.length < limit
}

export function limitSelectedQuestionIds(
  nextIds: readonly string[],
  currentIds: readonly string[],
  limit = maxMonitoringQuestions,
) {
  const next = new Set(nextIds)
  const current = new Set(currentIds)
  const retained = currentIds.filter(id => next.has(id))
  const added = nextIds.filter(id => !current.has(id))
  return [...retained, ...added].slice(0, limit)
}

