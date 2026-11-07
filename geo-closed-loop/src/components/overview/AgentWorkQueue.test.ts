import type { OverviewQueueItem } from '../../data/overview-data'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DropdownSelect from '../ui/ce/dropdown-select/DropdownSelect.vue'
import AgentWorkQueue from './AgentWorkQueue.vue'

const items: OverviewQueueItem[] = [
  { id: 'F-1', kind: 'finding', title: 'Product Schema 缺失', summary: '待修复结构化数据。', priority: 'P0', source: '结构化数据', status: '待处理', nextAction: '查看诊断详情' },
  { id: 'GS-1', kind: 'strategy', title: '补齐专家档案', summary: '资料待运营审核。', priority: 'P1', source: '品牌实体', status: '待运营审核', nextAction: '查看并确认策略' },
  { id: 'T-1', kind: 'task', title: '航空采购 FAQ', summary: '进入任务当前阶段。', priority: 'P1', source: '官网内容', status: 'Brief 待确认', nextAction: '确认任务 Brief' },
]

describe('agent work queue', () => {
  it('places the source label in the white filter header as a right-aligned tag', () => {
    const wrapper = mount(AgentWorkQueue, { props: { items } })
    const header = wrapper.get('.agent-queue__filters')
    const sourceTag = wrapper.get('.agent-queue__source-tag')

    expect(header.classes()).toContain('agent-queue__filters--header')
    expect(sourceTag.element.parentElement).toBe(header.element)
    expect(sourceTag.text()).toBe('数据源：诊断与策略 + 优化中心 + 可见性监测')
    expect(wrapper.find('.overview-section-heading .agent-queue__source-tag').exists()).toBe(false)
    wrapper.unmount()
  })

  it('filters by priority and source, then restores all items', async () => {
    const wrapper = mount(AgentWorkQueue, { props: { items } })
    expect(wrapper.findAll('.agent-queue__item')).toHaveLength(3)
    const filters = wrapper.findAllComponents(DropdownSelect)
    expect(filters).toHaveLength(2)
    expect(wrapper.findAll('select')).toHaveLength(0)

    filters[0]!.vm.$emit('update:modelValue', 'P0')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.agent-queue__item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Product Schema 缺失')

    filters[0]!.vm.$emit('update:modelValue', 'all')
    filters[1]!.vm.$emit('update:modelValue', '品牌实体')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.agent-queue__item')).toHaveLength(1)
    expect(wrapper.text()).toContain('补齐专家档案')

    filters[1]!.vm.$emit('update:modelValue', 'all')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.agent-queue__item')).toHaveLength(3)
    wrapper.unmount()
  })

  it('shows only the requested confirmation action on each queue item', () => {
    const wrapper = mount(AgentWorkQueue, { props: { items: [items[0]!] } })

    const actions = wrapper.findAll('.agent-queue__actions .ce-button')
    expect(actions).toHaveLength(1)
    expect(actions[0]!.text()).toBe('查看并确认')
    expect(actions[0]!.attributes('data-variant')).toBe('outline')
    expect(actions[0]!.find('.lucide-arrow-right').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('查看监测结果')
    expect(wrapper.text()).not.toContain('进入对应业务模块处理')
    expect(wrapper.text()).not.toContain('概览负责聚合、提醒与跳转')
    wrapper.unmount()
  })

  it('emits the selected queue item without mutating it', async () => {
    const sourceItem = { ...items[0]! }
    const wrapper = mount(AgentWorkQueue, { props: { items: [sourceItem] } })

    const actions = wrapper.findAll('.agent-queue__actions .ce-button')
    await actions[0]!.trigger('click')

    expect(wrapper.emitted('openItem')?.[0]).toEqual([sourceItem])
    expect(sourceItem).toEqual(items[0])
    wrapper.unmount()
  })
})

