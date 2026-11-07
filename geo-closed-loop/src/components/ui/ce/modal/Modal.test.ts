import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MessageModal from './MessageModal.vue'
import Modal from './Modal.vue'

describe('modal', () => {
  it('forwards its consumer class to the dialog root', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: false,
        class: 'consumer-modal',
        title: '标题',
        confirmText: '确认',
        cancelText: '取消',
        closeLabel: '关闭',
        processingText: '处理中',
      },
    })

    await wrapper.setProps({ open: true })

    expect(wrapper.find('dialog.ce-modal-root.consumer-modal').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders the MessageModal tone icon as SVG and keeps the close label', () => {
    const wrapper = mount(MessageModal, {
      props: {
        open: true,
        title: '确认删除',
        message: '此操作不可撤销',
        tone: 'danger',
        showClose: true,
        closeLabel: '关闭弹窗',
        confirmText: '确认',
        cancelText: '取消',
        processingText: '处理中',
      },
    })

    expect(wrapper.find('svg.lucide-triangle-alert').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="关闭弹窗"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="关闭弹窗"] svg.lucide-x').exists()).toBe(true)
    wrapper.unmount()
  })
})

