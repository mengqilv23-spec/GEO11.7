import { isReadOnlyFinding } from '../workflows/finding-treatment'
import type { AuditFinding, GeoTask, Priority, Strategy } from './geo-data'

export interface OverviewQueueItem {
  id: string
  kind: 'finding' | 'strategy' | 'task'
  title: string
  summary: string
  priority: Priority
  source: string
  status: string
  nextAction: string
  owner?: string
  actionLabel?: string
  secondaryActionLabel?: string
}

/** The initial overview snapshot mirrors the three confirmation items in the design. */
export const overviewQueuePreview: OverviewQueueItem[] = [
  {
    id: 'candidate-competitors',
    kind: 'strategy',
    title: '发现 3 个潜在新竞品候选',
    summary: '近 3 轮监测中，Flow X、Techni Waterjet、STM 达到系统提示条件，等待确认是否纳入正式竞品监测。',
    priority: 'P1',
    source: '可见性监测',
    status: '潜在竞品',
    nextAction: '逐个确认竞品候选',
    owner: 'Agent',
    actionLabel: '查看并确认',
    secondaryActionLabel: '查看监测结果',
  },
  {
    id: 'delivery-capacity-brief',
    kind: 'task',
    title: '交期与产能页优化',
    summary: 'Agent 已生成 Task 草稿，Brief 与交期 / SLA 事实需要你确认。',
    priority: 'P0',
    source: '优化中心',
    status: '待确认',
    nextAction: '确认 Task Brief',
    owner: '客户',
    actionLabel: '去确认',
  },
  {
    id: 'certification-entity-brief',
    kind: 'task',
    title: '认证与品牌实体完善',
    summary: '认证编号及适用范围需要你确认后，Agent 才能继续执行。',
    priority: 'P1',
    source: '优化中心',
    status: '待确认',
    nextAction: '确认认证事实',
    owner: '客户',
    actionLabel: '去确认',
  },
]

const actionableTaskProgress = new Set<GeoTask['progress']>([
  'brief',
  'client_content_review',
  'human',
  'client_review',
  'publish',
  'site_submit',
  'site_failed',
  'site_publish',
])
const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 } as const

const taskStatus: Record<GeoTask['progress'], { status: string, nextAction: string }> = {
  brief: { status: 'Brief 待确认', nextAction: '确认任务 Brief' },
  todo: { status: '待执行', nextAction: '查看任务' },
  running: { status: '执行中', nextAction: '查看进度' },
  client_content_review: { status: '待确认文案', nextAction: '确认文案结果' },
  human: { status: '待专家审核', nextAction: '审核执行结果' },
  client_review: { status: '待确认', nextAction: '确认业务事实' },
  publish: { status: '待发布', nextAction: '确认发布' },
  site_submit: { status: '待提交 AI 建站', nextAction: '提交执行' },
  site_submitted: { status: '已提交 AI 建站', nextAction: '查看执行进度' },
  site_running: { status: 'AI 建站执行中', nextAction: '查看执行进度' },
  site_returned: { status: '官网已返回处理结果', nextAction: '查看修复结果' },
  site_verifying: { status: '验证中', nextAction: '查看验证结果' },
  site_publish: { status: '待确认发布', nextAction: '确认发布' },
  site_failed: { status: '执行失败', nextAction: '查看并处理' },
  recheck: { status: '等待 Re-check', nextAction: '查看监测结果' },
  done: { status: '已完成', nextAction: '查看任务' },
}

export function buildOverviewQueue(
  findings: readonly AuditFinding[],
  strategies: readonly Strategy[],
  tasks: readonly GeoTask[],
): OverviewQueueItem[] {
  const findingItems = findings
    .filter(finding => !isReadOnlyFinding(finding) && ['待处理', '待官网运营审核', '待专家审核'].includes(finding.status))
    .map(finding => ({
      id: finding.id,
      kind: 'finding' as const,
      title: finding.title,
      summary: finding.detail,
      priority: finding.priority,
      source: finding.check,
      status: finding.status === '待官网运营审核' ? '待专家审核' : finding.status,
      nextAction: ['待官网运营审核', '待专家审核'].includes(finding.status) ? '查看专家审核' : '查看诊断详情',
    }))

  const strategyItems = strategies
    .filter(strategy => !strategy.businessGapRecorded && !strategy.confirmed && !strategy.ignored)
    .map(strategy => ({
      id: strategy.id,
      kind: 'strategy' as const,
      title: strategy.title,
      summary: strategy.evidence,
      priority: strategy.priority,
      source: strategy.source,
    status: '待专家审核',
    nextAction: '查看并确认策略',
    }))

  const taskItems = tasks
    .filter(task => actionableTaskProgress.has(task.progress))
    .map(task => ({
      id: task.id,
      kind: 'task' as const,
      title: task.name,
      summary: '进入任务处理当前阶段。',
      priority: 'P1' as const,
      source: task.source,
      status: taskStatus[task.progress].status,
      nextAction: taskStatus[task.progress].nextAction,
    }))

  return [...findingItems, ...strategyItems, ...taskItems]
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
}

