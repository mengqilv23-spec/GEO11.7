import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { expect, it, vi } from 'vitest'
import type { GeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import { geoWorkbenchRouteContextKey } from '../../composables/workbench-route-context'
import { strategies } from '../../data/geo-data'
import { createVerificationTask } from '../../workflows/client-diagnosis'
import { ensureWorkflow } from '../../workflows/task-workflow'
import TaskWorkspace from './TaskWorkspace.vue'

const verificationLabels = {
  'add-content': '官网具备该能力，但尚未介绍',
  'edit-content': '官网已有介绍，但表达不明确',
  'technical': '内容完整，但存在读取障碍',
  'external': '需要补充第三方来源',
  'business-gap': '实际不具备该能力',
} as const

it.each(['add-content', 'edit-content', 'external', 'technical', 'business-gap'] as const)('records a verified %s cause without publishing or creating a follow-up flow', async (outcome) => {
  const parent = reactive({ ...strategies[0]!, confirmed: true })
  const tasks = reactive<Parameters<typeof createVerificationTask>[0]>([])
  const task = createVerificationTask(tasks, parent)
  ensureWorkflow(task)
  task.progress = 'human'
  const context = reactive({ strategies: [parent], tasks, findings: [], openFlow: vi.fn(), navigate: vi.fn(), openTask: vi.fn(), openStrategy: vi.fn() }) as unknown as GeoWorkbenchRouteContext
  const wrapper = mount(TaskWorkspace, { props: { task }, global: { provide: { [geoWorkbenchRouteContextKey as symbol]: context }, stubs: { Drawer: true } } })
  expect(wrapper.find('.task-rich-editor').exists()).toBe(false)
  expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
  await wrapper.get('.tw-content-panel select').setValue(outcome)
  await wrapper.get('.tw-content-panel textarea').setValue('核查记录：已核对现有资料及原始回答，确认本次原因。')
  await wrapper.findAll('button').find(button => button.text() === '保存核查结论并完成')!.trigger('click')
  expect(task.progress).toBe('done')
  expect(task.workflow?.site.attempts).toBe(0)
  expect(task.verificationFollowupId).toBeUndefined()
  expect(tasks).toHaveLength(1)
  expect(context.strategies).toHaveLength(1)
  expect(context.findings).toHaveLength(0)
  expect(parent.businessGapRecorded).toBeUndefined()
  expect(parent.gapFacts).toBeUndefined()
  const reminder = wrapper.get('[data-test="verification-reminder"]').text()
  expect(reminder).toContain(verificationLabels[outcome])
  expect(reminder).toContain('仅作提醒，不会自动生成后续任务或流程')
  wrapper.unmount()
})

