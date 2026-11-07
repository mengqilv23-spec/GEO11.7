import type { DiagnosisGap, DiagnosisIssue, DiagnosisPage, DiagnosisStrategy } from '../api/diagnosis'
import { ref, shallowRef } from 'vue'
import { getDiagnosisGaps, getDiagnosisIssue, getDiagnosisIssues, getDiagnosisStrategies, getDiagnosisStrategy } from '../api/diagnosis'

function emptyPage<T>(size: number): DiagnosisPage<T> {
  return { records: [], total: 0, size, current: 1, pages: 0 }
}

type DiagnosisDetailState = { kind: 'issue', data: DiagnosisIssue } | { kind: 'strategy', data: DiagnosisStrategy } | null

export function useDiagnosisData() {
  const issues = ref(emptyPage<DiagnosisIssue>(20))
  const gaps = ref(emptyPage<DiagnosisGap>(100))
  const strategies = ref(emptyPage<DiagnosisStrategy>(100))
  const loading = ref(false)
  const errors = ref({ issues: '', gaps: '', strategies: '' })
  const detail = shallowRef<DiagnosisDetailState>(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  let requestSequence = 0
  let detailSequence = 0

  async function load(siteId: string | null) {
    const requestId = ++requestSequence
    issues.value = emptyPage(20)
    gaps.value = emptyPage(100)
    strategies.value = emptyPage(100)
    errors.value = { issues: '', gaps: '', strategies: '' }
    closeDetail()
    if (!siteId || siteId.trim().length === 0) {
      errors.value = { issues: '缺少有效站点 ID，无法查询诊断数据。', gaps: '缺少有效站点 ID，无法查询诊断数据。', strategies: '缺少有效站点 ID，无法查询诊断数据。' }
      loading.value = false
      return
    }

    loading.value = true
    const [issueResult, gapResult, strategyResult] = await Promise.allSettled([
      getDiagnosisIssues({ siteId, pageNum: 1, pageSize: 20 }),
      getDiagnosisGaps({ siteId, pageNum: 1, pageSize: 100 }),
      getDiagnosisStrategies({ siteId, pageNum: 1, pageSize: 100 }),
    ])
    if (requestId !== requestSequence)
      return

    if (issueResult.status === 'fulfilled')
      issues.value = issueResult.value
    else
      errors.value.issues = issueResult.reason instanceof Error ? issueResult.reason.message : '诊断问题加载失败'

    if (gapResult.status === 'fulfilled')
      gaps.value = gapResult.value
    else
      errors.value.gaps = gapResult.reason instanceof Error ? gapResult.reason.message : '人设 Gap 加载失败'

    if (strategyResult.status === 'fulfilled')
      strategies.value = strategyResult.value
    else
      errors.value.strategies = strategyResult.reason instanceof Error ? strategyResult.reason.message : '候选策略加载失败'

    loading.value = false
  }

  async function loadDetail(kind: 'issue' | 'strategy', id: number, siteId: string) {
    const requestId = ++detailSequence
    detail.value = null
    detailError.value = ''
    detailLoading.value = true
    try {
      const data = kind === 'issue' ? await getDiagnosisIssue(id, siteId) : await getDiagnosisStrategy(id, siteId)
      if (requestId === detailSequence) {
        detail.value = kind === 'issue'
          ? { kind, data: data as DiagnosisIssue }
          : { kind, data: data as DiagnosisStrategy }
      }
    }
    catch (cause) {
      if (requestId === detailSequence)
        detailError.value = cause instanceof Error ? cause.message : '诊断详情加载失败'
    }
    finally {
      if (requestId === detailSequence)
        detailLoading.value = false
    }
  }

  function closeDetail() {
    detailSequence++
    detail.value = null
    detailError.value = ''
    detailLoading.value = false
  }

  return { issues, gaps, strategies, loading, errors, detail, detailLoading, detailError, load, loadDetail, closeDetail }
}

