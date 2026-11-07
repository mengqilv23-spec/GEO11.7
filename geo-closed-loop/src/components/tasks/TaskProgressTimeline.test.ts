import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskProgressTimeline from './TaskProgressTimeline.vue'

describe('taskProgressTimeline icons', () => {
  it('renders a decorative SVG for completed steps and keeps upcoming step numbers', () => {
    const wrapper = mount(TaskProgressTimeline, {
      props: {
        steps: [
          { title: 'Brief', detail: '任务确认', state: 'done' },
          { title: '内容准备', detail: '生成与审核', state: 'current' },
          { title: '发布', detail: '官网上线', state: 'upcoming' },
        ],
      },
    })

    expect(wrapper.find('li.done svg.lucide-check').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('.tw-flow-steps li > span').map(node => node.text())).toEqual(['', '2', '3'])
  })
})

