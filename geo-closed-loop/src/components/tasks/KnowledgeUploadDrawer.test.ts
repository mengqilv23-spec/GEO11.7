import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import KnowledgeUploadDrawer from './KnowledgeUploadDrawer.vue'

function mountDrawer() {
  return mount(KnowledgeUploadDrawer, {
    props: { open: true, taskId: 'T-8' },
    global: {
      stubs: {
        Drawer: {
          props: ['open', 'title', 'eyebrow'],
          template: '<div v-if="open" data-test="drawer"><p>{{ eyebrow }}</p><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></div>',
        },
        DropdownSelect: {
          props: ['modelValue', 'options', 'ariaLabel'],
          emits: ['update:modelValue'],
          template: '<select :aria-label="ariaLabel" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">请选择标签</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
      },
    },
  })
}

describe('knowledge upload drawer', () => {
  it('matches the upload copy and keeps submission disabled until all required fields are ready', () => {
    const wrapper = mountDrawer()

    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('上传知识资料')
    expect(wrapper.get('[data-test="drawer"] > p').text()).toBe('T-8 · 知识库资料')
    expect(wrapper.text()).toContain('此处只负责上传资料。上传完成后，请前往 AI 建站知识库进行内容解析；解析完成后，再从知识库刷新并选择。')
    expect(wrapper.text()).toContain('资料标签 *')
    expect(wrapper.text()).toContain('资料名称 *')
    expect(wrapper.text()).toContain('上传文件 *')
    expect(wrapper.find('.tw-upload-file__icon svg.lucide-upload').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-tag-toggle"] svg.lucide-plus').exists()).toBe(true)
    expect((wrapper.get('[data-test="upload-file-submit"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('creates a label outside the dropdown and selects it immediately', async () => {
    const wrapper = mountDrawer()

    await wrapper.get('[data-test="create-tag-toggle"]').trigger('click')
    await wrapper.get('[data-test="new-tag-input"]').setValue('  新资料类目  ')
    await wrapper.get('[data-test="create-tag-submit"]').trigger('click')

    expect(wrapper.get('[aria-label="资料标签"]').element).toHaveProperty('value', '新资料类目')
    expect(wrapper.find('[data-test="new-tag-input"]').exists()).toBe(false)
  })

  it('records a local upload intent without claiming that the file was uploaded or parsed', async () => {
    const wrapper = mountDrawer()
    const file = new File(['draft'], 'product-spec.pdf', { type: 'application/pdf' })
    const input = wrapper.get('[data-test="upload-file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')
    await wrapper.get('[aria-label="资料标签"]').setValue('品牌事实')
    await wrapper.get('[data-test="upload-name"]').setValue('2026 产品规格资料')
    await wrapper.get('[data-test="upload-file-submit"]').trigger('click')

    expect(wrapper.emitted('submitted')?.[0]).toEqual([{
      tag: '品牌事实',
      name: '2026 产品规格资料',
      fileName: 'product-spec.pdf',
      fileSize: 5,
    }])
    expect(wrapper.text()).toContain('文件尚未实际上传')
    expect(wrapper.text()).toContain('AI 建站知识库')
    expect(wrapper.find('.tw-upload-result__icon svg.lucide-check').exists()).toBe(true)
  })

  it('does not bubble the file picker cancel event out of the upload form', async () => {
    const wrapper = mountDrawer()
    const parentCancel = vi.fn()
    wrapper.get('.tw-upload-form').element.addEventListener('cancel', parentCancel)

    await wrapper.get('[data-test="upload-file"]').trigger('cancel')

    expect(parentCancel).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})

