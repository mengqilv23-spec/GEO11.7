export interface GuideTarget { selector: string, activate?: string[], preserveModule?: boolean, unavailable?: string }

// Activation is limited to navigation and display controls; the guide never submits, generates or approves data.
export const guideTargets: Record<string, GuideTarget[]> = {
  overview: [
    { selector: '.overview-metrics__cards' },
    { selector: '.overview-metrics .visibility-chart' },
    { selector: '.platform-performance' },
    { selector: '.agent-queue' },
  ],
  'visibility-monitoring': [
    { selector: '#visibility-step-1', activate: ['#visibility-step-1'] },
    { selector: '#visibility-step-2', activate: ['#visibility-step-2'] },
    { selector: '#visibility-step-3', activate: ['#visibility-step-3'] },
    { selector: '#visibility-step-4', activate: ['#visibility-step-4'] },
    { selector: '#visibility-tab-brand', activate: ['#visibility-step-5', '#visibility-tab-brand'] },
    { selector: '#visibility-tab-questions', activate: ['#visibility-step-5', '#visibility-tab-questions'] },
    { selector: '#visibility-tab-sources', activate: ['#visibility-step-5', '#visibility-tab-sources'] },
  ],
  'report-center': [
    { selector: '.reports-panel, .report-prototype-view' },
    { selector: '.latest-report, .report-prototype-view' },
  ],
  diagnosis: [
    { selector: '.geo-audit-panel' },
    { selector: '.geo-persona-panel' },
    { selector: '.geo-strategy-panel' },
  ],
  optimization: [
    { selector: '.geo-optimization-summary' },
    { selector: '.geo-task-table-wrap' },
    { selector: '.tw-brief-workspace', activate: ['[data-guide-brief-task="true"]'], preserveModule: true, unavailable: '当前任务列表没有待确认 Brief 的内容任务，请先在优化中心筛选待确认任务。' },
  ],
  'task-detail': [
    { selector: '.task-rich-editor__toolbar', activate: ['[data-guide-task-tab="output"]'], unavailable: '先打开一条内容任务，再从“使用引导”查看该任务当前可用的编辑与审核区域。' },
    { selector: '.tw-review-insights', activate: ['[data-guide-task-tab="output"]'], unavailable: '先打开一条任务，再查看当前阶段的质检、版本和审核区域。' },
    { selector: '.tw-header', unavailable: '请从任务列表打开一条任务，再查看任务当前的处理阶段。' },
  ],
  'operations-review': [
    { selector: '.ops-review__kpis' },
    { selector: '.ops-review__tabs' },
  ],
  onboarding: [
    { selector: '.knowledge-grid' },
    { selector: '.onboarding-next-step', unavailable: '该区域在品牌资料确认后展示。可先完成当前配置，再从“使用引导”查看后续步骤。' },
  ],
  'market-setup': [
    { selector: '.market-setup-page__panel, .market-setup-page__body' },
    { selector: '.market-setup-page__footer' },
  ],
}

export interface GuideRect { left: number, top: number, width: number, height: number }
export function positionGuide(target: GuideRect | null, viewport: { width: number, height: number }, card: { width: number, height: number }) {
  const gap = 16
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)))
  if (!target) return { left: Math.max(gap, viewport.width - card.width - gap), top: Math.max(gap, viewport.height - card.height - gap), side: 'none' }
  const right = target.left + target.width
  const bottom = target.top + target.height
  const candidates = [
    { side: 'right', left: right + gap, top: target.top, fits: right + gap + card.width <= viewport.width - gap },
    { side: 'left', left: target.left - card.width - gap, top: target.top, fits: target.left - card.width - gap >= gap },
    { side: 'bottom', left: target.left, top: bottom + gap, fits: bottom + gap + card.height <= viewport.height - gap },
    { side: 'top', left: target.left, top: target.top - card.height - gap, fits: target.top - card.height - gap >= gap },
  ]
  const best = candidates.find(candidate => candidate.fits) ?? { side: 'bottom', left: right - card.width, top: bottom + gap }
  return { left: clamp(best.left, gap, viewport.width - card.width - gap), top: clamp(best.top, gap, viewport.height - card.height - gap), side: best.side }
}

