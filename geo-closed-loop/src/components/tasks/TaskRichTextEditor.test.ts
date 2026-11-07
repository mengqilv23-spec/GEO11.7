import { EditorContent } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskRichTextEditor from './TaskRichTextEditor.vue'

describe('taskRichTextEditor', () => {
  it('loads existing rich text and exposes the formatting controls', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p>日本市场服务说明</p>' },
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.get('.ProseMirror').text()).toContain('日本市场服务说明')
    expect(wrapper.find('button[aria-label="加粗"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="项目符号列表"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="editor-shortcuts"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="下划线"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="加粗"]').attributes('aria-keyshortcuts')).toBe('Control+B Meta+B')
    expect(wrapper.find('input[aria-label="文字颜色"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="插入链接"]').exists()).toBe(false)
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('emits HTML when content is changed', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p>初稿</p>' },
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    const editor = wrapper.get('.ProseMirror')
    editor.element.textContent = '更新后的初稿'
    await editor.trigger('input')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('更新后的初稿')
  })

  it('applies italic formatting without losing the selected text when the toolbar is pressed', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p>需要斜体的文字</p>' },
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    const editor = wrapper.findComponent(EditorContent).props('editor')
    editor?.commands.setTextSelection({ from: 1, to: '需要斜体的文字'.length + 1 })

    const italicButton = wrapper.find('button[aria-label="斜体"]')
    await italicButton.trigger('mousedown')
    await italicButton.trigger('click')

    const italicText = wrapper.get('.ProseMirror em')
    expect(italicText.text()).toBe('需要斜体的文字')
    expect(italicText.classes()).toContain('task-rich-italic')
  })

  it('strips pasted links because linking is not part of this editor', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p><a href="https://example.com">可编辑内容</a></p>' },
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    const editor = wrapper.get('.ProseMirror')

    expect(editor.text()).toBe('可编辑内容')
    expect(wrapper.find('.ProseMirror a').exists()).toBe(false)
  })

  it('previews a paragraph-level AI optimization and replaces only the selected text', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p>日本提供本地服务支持。</p><p>欢迎联系团队了解详情。</p>', aiOptimize: true },
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    const editor = wrapper.findComponent(EditorContent).props('editor')
    editor?.commands.setTextSelection({ from: 1, to: '日本提供本地服务支持。'.length + 1 })
    await wrapper.get('[data-test="open-ai-optimize"]').trigger('click')
    expect(wrapper.get('[data-test="ai-optimize-panel"]').text()).toContain('日本提供本地服务支持。')

    await wrapper.get('#task-ai-instruction').setValue('表达更专业，并突出本地服务')
    await wrapper.get('[data-test="generate-ai-preview"]').trigger('click')
    expect(wrapper.get('[data-test="ai-optimize-preview"]').text()).toContain('交互原型')
    await wrapper.get('[data-test="ai-optimize-preview"] textarea').setValue('日本团队提供本地化服务支持。')
    await wrapper.get('[data-test="replace-selected-text"]').trigger('click')

    expect(wrapper.get('.ProseMirror').text()).toBe('日本团队提供本地化服务支持。欢迎联系团队了解详情。')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('日本团队提供本地化服务支持。')
  })

  it('exposes a full-article regeneration action and previews the whole article scope', async () => {
    const wrapper = mount(TaskRichTextEditor, {
      props: { modelValue: '<p>第一段。</p><p>第二段。</p>', aiOptimize: true },
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    await wrapper.get('[data-test="regenerate-article"]').trigger('click')
    expect(wrapper.get('[data-test="ai-optimize-panel"] strong').text()).toBe('重新生成文章')
    expect(wrapper.get('.task-rich-editor__ai-warning').text()).toContain('替换整篇正文')
    expect(wrapper.get('[data-test="ai-optimize-panel"] .task-rich-editor__ai-source').text()).toContain('第一段。')
    expect(wrapper.get('[data-test="ai-optimize-panel"] .task-rich-editor__ai-source').text()).toContain('第二段。')
    await wrapper.get('#task-ai-instruction').setValue('按照 GEO 结构重写，保留已确认事实')
    await wrapper.get('[data-test="generate-ai-preview"]').trigger('click')
    expect((wrapper.get('[data-test="ai-optimize-preview"] textarea').element as HTMLTextAreaElement).value).toContain('第一段。')
    await wrapper.get('[data-test="ai-optimize-preview"] textarea').setValue('新的整篇内容。')
    await wrapper.get('[data-test="replace-selected-text"]').trigger('click')

    expect(wrapper.get('.ProseMirror').text()).toBe('新的整篇内容。')
    expect(wrapper.get('.ProseMirror').text()).not.toContain('第一段。')
  })

  it('requires a selection for paragraph AI and only charges quota when generating a preview', async () => {
    const wrapper = mount(TaskRichTextEditor, { props: { modelValue: '<p>待优化文字。</p>', aiOptimize: true } })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.get('[data-test="open-ai-optimize"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="selection-bubble"]').exists()).toBe(false)
    const editor = wrapper.findComponent(EditorContent).props('editor')
    editor?.commands.setTextSelection({ from: 1, to: 5 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="selection-bubble"]').text()).toContain('AI 润色')
    await wrapper.get('[data-test="open-ai-optimize"]').trigger('click')
    expect(wrapper.emitted('ai-call')).toBeUndefined()
    await wrapper.get('.task-rich-editor__ai-suggestions button').trigger('click')
    await wrapper.get('[data-test="generate-ai-preview"]').trigger('click')
    expect(wrapper.emitted('ai-call')).toHaveLength(1)
  })

  it('keeps a sourced claim in the article and lets the customer confirm it there', async () => {
    const claim = { id: 'claim-1', text: '日本提供本地服务。', source: '演示联网结果', confirmed: false }
    const wrapper = mount(TaskRichTextEditor, { props: {
      modelValue: '<p><span data-external-claim-id="claim-1">日本提供本地服务。</span></p>',
      externalClaims: [claim], canConfirmExternalClaims: true,
    } })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.get('[data-test="external-claim-summary"]').text()).toContain('1 处待确认')
    await wrapper.get('[data-external-claim-id="claim-1"]').trigger('click')
    expect(wrapper.get('[data-test="external-claim-card"]').text()).toContain('演示联网结果')
    await wrapper.get('.task-rich-editor__claim-confirm').trigger('click')
    expect(wrapper.emitted('confirm-external-claim')?.[0]).toEqual(['claim-1'])
  })
})

