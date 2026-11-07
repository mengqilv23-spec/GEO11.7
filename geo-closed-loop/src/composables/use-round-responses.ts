import type { PageResult, RoundResponseDetail, RoundResponseRecord } from '../api/monitoring'
import { computed, ref, shallowRef } from 'vue'
import { getResponseDetail, getRoundResponses } from '../api/monitoring'

function emptyPage(): PageResult<RoundResponseRecord> {
  return { records: [], total: 0, size: 10, current: 1, pages: 0 }
}

export function useRoundResponses() {
  const page = shallowRef(emptyPage())
  const listLoading = ref(false)
  const listError = ref('')
  const detail = shallowRef<RoundResponseDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const hasMore = computed(() => page.value.current < page.value.pages)
  let requestSequence = 0
  let detailSequence = 0
  let currentRoundId = 0
  let currentQuestionId = 0

  async function open(roundId: number, questionId: number) {
    currentRoundId = roundId
    currentQuestionId = questionId
    const requestId = ++requestSequence
    page.value = emptyPage()
    listError.value = ''
    detail.value = null
    detailError.value = ''
    listLoading.value = true
    try {
      const result = await getRoundResponses(roundId, { pageNum: 1, pageSize: 10, questionId })
      if (requestId === requestSequence)
        page.value = result
    }
    catch (cause) {
      if (requestId === requestSequence)
        listError.value = cause instanceof Error ? cause.message : '回答列表加载失败'
    }
    finally {
      if (requestId === requestSequence)
        listLoading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || listLoading.value || !currentRoundId || !currentQuestionId)
      return
    const requestId = requestSequence
    listLoading.value = true
    listError.value = ''
    try {
      const nextPage = await getRoundResponses(currentRoundId, { pageNum: page.value.current + 1, pageSize: 10, questionId: currentQuestionId })
      if (requestId === requestSequence)
        page.value = { ...nextPage, records: [...page.value.records, ...nextPage.records] }
    }
    catch (cause) {
      if (requestId === requestSequence)
        listError.value = cause instanceof Error ? cause.message : '回答列表加载失败'
    }
    finally {
      if (requestId === requestSequence)
        listLoading.value = false
    }
  }

  async function loadDetail(responseId: number) {
    const requestId = ++detailSequence
    detail.value = null
    detailError.value = ''
    detailLoading.value = true
    try {
      const result = await getResponseDetail(responseId)
      if (requestId === detailSequence)
        detail.value = result
    }
    catch (cause) {
      if (requestId === detailSequence)
        detailError.value = cause instanceof Error ? cause.message : '回答详情加载失败'
    }
    finally {
      if (requestId === detailSequence)
        detailLoading.value = false
    }
  }

  function close() {
    requestSequence++
    detailSequence++
    currentRoundId = 0
    currentQuestionId = 0
    page.value = emptyPage()
    detail.value = null
    listError.value = ''
    detailError.value = ''
    listLoading.value = false
    detailLoading.value = false
  }

  return { page, listLoading, listError, detail, detailLoading, detailError, hasMore, open, loadMore, loadDetail, close }
}

