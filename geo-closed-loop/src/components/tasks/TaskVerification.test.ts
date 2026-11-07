import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { expect, it, vi } from 'vitest'
import type { GeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import { geoWorkbenchRouteContextKey } from '../../composables/workbench-route-context'
import { strategies } from '../../data/geo-data'
import { createVerificationTask } from '../../workflows/client-diagnosis'
import { ensureWorkflow } from '../../workflows/task-workflow'
import TaskWorkspace from './TaskWorkspace.vue'

it.each(['add-content', 'edit-content', 'external', 'technical', 'business-gap'] as const)('records a verified %s cause without publishing the investigation as content', async (outcome) => {
  const parent = reactive({ ...strategies[0]!, confirmed: true })
  const tasks = reactive<Parameters<typeof createVerificationTask>[0]>([])
  const task = createVerificationTask(tasks, parent)
  ensureWorkflow(task)
  task.progress = 'human'
  const context = reactive({ strategies: [parent], tasks, findings: [], openFlow: vi.fn(), navigate: vi.fn(), openTask: vi.fn(), openStrategy: vi.fn() }) as unknown as GeoWorkbenchRouteContext
  const wrapper = mount(TaskWorkspace, { props: { task, role: 'client', serviceMode: 'agent', clientPreview: false }, global: { provide: { [geoWorkbenchRouteContextKey as symbol]: context }, stubs: { Drawer: true } } })
  expect(wrapper.find('.task-rich-editor').exists()).toBe(false)
  expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
  await wrapper.get('.tw-content-panel select').setValue(outcome)
  await wrapper.get('.tw-content-panel textarea').setValue('核查记录：已核对现有资料及原始回答，确认本次原因。')
  await wrapper.findAll('button').find(button => button.text() === '保存核查结论并完成')!.trigger('click')
  expect(task.progress).toBe('done')
  expect(task.workflow?.site.attempts).toBe(0)
  if (outcome === 'business-gap') { expect(parent.businessGapRecorded).toBe(true); expect(context.strategies).toHaveLength(1) }
  else if (outcome === 'technical') { expect(context.findings).toHaveLength(1); expect(tasks[1]?.type).toBe('repair') }
  else { expect(context.strategies).toHaveLength(2); expect(context.strategies[1]?.confirmed).toBe(false); expect(context.strategies[1]?.gapFacts?.verified).toBe(true) }
  wrapper.unmount()
})

