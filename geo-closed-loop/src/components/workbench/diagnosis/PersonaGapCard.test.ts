import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import PersonaGapCard from './PersonaGapCard.vue'

describe('personaGapCard icons', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders an external-link SVG beside the actionable gap', () => {
    const wrapper = mount(PersonaGapCard, {
      props: { gaps: [{ name: '本地服务', value: 42, linkedCount: 2, source: '官网' }] },
    })

    expect(wrapper.find('.geo-gap-link svg.lucide-arrow-up-right').exists()).toBe(true)
    expect(wrapper.text()).toContain('1. 本地服务')
  })
})

