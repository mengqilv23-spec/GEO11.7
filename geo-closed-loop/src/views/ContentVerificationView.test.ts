import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetContentProductionStore, useContentProductionStore } from '../stores/content-production'
import ContentVerificationView from './ContentVerificationView.vue'

function mountView() {
  return mount(ContentVerificationView, {
    global: {
      stubs: {
        GeoPageIntro: {
          props: ['title'],
          template: '<header><h1 data-test="intro">{{ title }}</h1><slot name="actions" /></header>',
        },
        GeoDrawer: {
          props: ['open', 'title', 'subtitle'],
          template: '<aside v-if="open" data-test="drawer"><h2>{{ title }}</h2><p>{{ subtitle }}</p><slot /><slot name="footer" /></aside>',
        },
        RouterLink: { template: '<a><slot /></a>' },
        Toast: {
          props: ['open'],
          template: '<div v-if="open" data-test="toast"><slot /></div>',
        },
        TaskRichTextEditor: {
          props: ['modelValue', 'label'],
          emits: ['update:modelValue'],
          template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  })
}

describe('content verification view', () => {
  beforeEach(() => {
    resetContentProductionStore()
  })

  it('shows the quota, creation action, filters and every production stage', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="intro"]').text()).toBe('品牌内容核验')
    expect(wrapper.find('[data-test="create-content"]').exists()).toBe(true)
    expect(wrapper.find('.cv-quota').exists()).toBe(true)
    expect(wrapper.get('.cv-quota__copy > span').text()).toBe('已发布的内容')
    expect(wrapper.get('.cv-quota__copy strong').text()).toContain('8')
    expect(wrapper.get('.cv-quota__copy strong').text()).toContain('20')
    expect(wrapper.text()).toContain('专业版 · 共 20 篇')
    expect(wrapper.findAll('.cv-stat > span').map(item => item.text())).toEqual(['剩余可发布', '已核验的内容'])
    expect(wrapper.findAll('.cv-stat strong').map(item => item.text())).toEqual(['12', '6'])
    expect(wrapper.findAll('.cv-filter button').map(button => button.text())).toEqual(['全部', '进行中', '待确认', '待核验', '已核验'])
    expect(wrapper.findAll('thead th').map(item => item.text())).toEqual(['序号', '任务序号', '内容', '状态', '核验问题', '发布状态', '操作'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(9)

    expect(wrapper.get('[data-content-id="CV-2601"]').text()).toContain('待确认')
    expect(wrapper.get('[data-content-id="CV-2601"] .cv-link').text()).toBe('内容确认')
    expect(wrapper.get('[data-content-id="CV-2602"]').text()).toContain('待核验')
    expect(wrapper.get('[data-content-id="CV-2602"]').text()).toContain('待选择')
    expect(wrapper.get('[data-content-id="CV-2602"] .cv-link').text()).toBe('选择问题')
    expect(wrapper.get('[data-task-id="T-2407"]').text()).toContain('已核验')
    expect(wrapper.get('[data-task-id="T-2407"] .cv-link').text()).toBe('查看核验')

    expect(wrapper.text()).not.toContain('待客户确认')
    expect(wrapper.text()).not.toContain('提交客户')
    expect(wrapper.text()).not.toContain('查看进度')
    expect(wrapper.text()).not.toContain('客户已驳回')
    wrapper.unmount()
  })

  it('uses the same status groups as the filter tabs', async () => {
    const wrapper = mountView()
    const statusTexts = () => wrapper.findAll('tbody .cv-stage').map(item => item.text())
    const filterButton = (label: string) => wrapper.findAll('.cv-filter button').find(button => button.text() === label)!

    expect(new Set(statusTexts())).toEqual(new Set(['待确认', '待核验', '已核验']))
    expect(statusTexts()).not.toContain('AI 检查完成')

    await filterButton('待确认').trigger('click')
    expect(statusTexts()).toEqual(['待确认'])
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-content-id'))).toEqual(['CV-2601'])

    await filterButton('待核验').trigger('click')
    expect(statusTexts()).toEqual(['待核验', '待核验'])

    await filterButton('已核验').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(6)

    await filterButton('进行中').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)

    await filterButton('全部').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(9)
    wrapper.unmount()
  })

  it('treats a previous detection round as a read-only archive', async () => {
    const wrapper = mountView()

    await wrapper.get('.cv-round-select select').setValue('r1')
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-task-id'))).toEqual(['T-2406', 'T-2405', 'T-2404'])
    expect(wrapper.find('.cv-filter').exists()).toBe(false)
    expect(wrapper.get('.cv-card__head').text()).toContain('只能查看')

    await wrapper.get('[data-task-id="T-2404"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    await drawer.get('[data-test="step-questions"]').trigger('click')
    expect(drawer.text()).not.toContain('重新核验')

    await drawer.findAll('button').find(button => button.text() === '关闭')!.trigger('click')
    await wrapper.get('.cv-round-select select').setValue('all')
    expect(wrapper.findAll('tbody tr')).toHaveLength(9)
    expect(wrapper.find('.cv-filter').exists()).toBe(true)
    wrapper.unmount()
  })

  it('publishes directly from the reviewed content without a confirmation action', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.text()).toContain('确认的内容')
    expect(drawer.find('[data-test="confirm-content"]').exists()).toBe(false)
    expect(drawer.find('[data-test="submit-client"]').exists()).toBe(false)
    expect(drawer.find('[data-test="edit-content"]').exists()).toBe(true)
    expect(drawer.find('[data-test="publish-blog"]').exists()).toBe(true)
    expect(drawer.text()).not.toContain('客户确认')
    expect(drawer.text()).not.toContain('等待客户确认')

    await drawer.get('[data-test="publish-blog"]').trigger('click')
    expect(store.findItem('CV-2601')?.stage).toBe('questions_pending')
    expect(store.findItem('CV-2601')?.clientConfirmation?.status).toBe('confirmed')
    expect(store.findItem('CV-2601')?.publishedAt).toBeTruthy()
    expect(store.findItem('CV-2601')?.url).toBeUndefined()
    wrapper.unmount()
  })

  it('returns a failed publish to the content step with its reason', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    await drawer.get('[data-test="simulate-failure"]').setValue(true)
    await drawer.get('[data-test="publish-blog"]').trigger('click')

    const item = store.findItem('CV-2601')!
    expect(item.stage).toBe('ai_checked')
    expect(item.publishedAt).toBeUndefined()
    expect(item.clientConfirmation).toBeUndefined()
    expect(item.publishError).toBeTruthy()
    expect(drawer.get('[data-test="publish-error"]').text()).toContain(item.publishError!)
    expect(drawer.get('[data-test="detail-title"]').element).toHaveProperty('value', item.title)
    expect(wrapper.get('[data-content-id="CV-2601"]').text()).toContain('发布失败')
    // The failed publish sends the operator back to content; the publish step
    // must not stay highlighted while the content page is open.
    expect(drawer.get('[data-test="step-content"]').element.closest('li')!.className).toContain('is-active')
    expect(drawer.get('[data-test="step-publish"]').element.closest('li')!.className).not.toContain('is-current')

    await drawer.get('[data-test="step-publish"]').trigger('click')
    await drawer.get('[data-test="publish-blog"]').trigger('click')
    expect(store.findItem('CV-2601')?.stage).toBe('questions_pending')
    expect(store.findItem('CV-2601')?.publishError).toBeUndefined()
    wrapper.unmount()
  })

  it('stays on the content step when a saved check moves the data stage forward', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    await drawer.get('[data-test="step-content"]').trigger('click')
    await drawer.get('.cpd-form').trigger('submit')

    expect(store.findItem('CV-2601')?.stage).toBe('ai_checked')
    const contentStep = drawer.get('[data-test="step-content"]').element.closest('li')!
    const publishStep = drawer.get('[data-test="step-publish"]').element.closest('li')!
    // The page being viewed is selected even though its data stage is complete.
    expect(contentStep.className).toContain('is-current')
    expect(contentStep.className).not.toContain('is-done')
    expect(publishStep.className).not.toContain('is-current')

    await drawer.get('[data-test="next-step"]').trigger('click')
    expect(publishStep.className).toContain('is-current')
    expect(contentStep.className).not.toContain('is-active')
    expect(contentStep.className).toContain('is-done')
    wrapper.unmount()
  })

  it('selects a completed step when the operator navigates back to it', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const contentStep = drawer.get('[data-test="step-content"]').element.closest('li')!
    const publishStep = drawer.get('[data-test="step-publish"]').element.closest('li')!
    // The drawer opens on the next pending step, so the completed content step
    // is checked. Going back to it makes it the selected step again.
    expect(contentStep.className).toContain('is-done')
    expect(publishStep.className).toContain('is-current')

    await drawer.get('[data-test="step-content"]').trigger('click')
    expect(contentStep.className).toContain('is-current')
    expect(contentStep.className).not.toContain('is-done')
    expect(publishStep.className).not.toContain('is-current')
    wrapper.unmount()
  })

  it('does not advance to the result step when a verification question is selected', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2602"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const questionStep = drawer.get('[data-test="step-questions"]').element.closest('li')!
    const resultStep = drawer.get('[data-test="step-results"]').element.closest('li')!
    expect(questionStep.className).toContain('is-current')

    await drawer.findAll('.cpd-question-option input')[0]!.setValue(true)

    expect(store.findItem('CV-2602')?.questions[0]?.confirmed).toBe(true)
    // Choosing a question does not complete the question step; verification
    // still has to start, so the step stays selected instead of checked.
    expect(questionStep.className).toContain('is-current')
    expect(questionStep.className).not.toContain('is-done')
    expect(resultStep.className).not.toContain('is-current')
    wrapper.unmount()
  })

  it('commits a custom verification question on blur instead of every keystroke', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2602"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const customOption = drawer.findAll('.cpd-question-option input').at(-1)!
    await customOption.setValue(true)
    const input = drawer.get('.cpd-question__input')

    await input.setValue('自定义核验问题')
    expect(store.findItem('CV-2602')?.questions).toHaveLength(0)
    expect(drawer.get('[data-test="step-questions"]').element.closest('li')!.className).toContain('is-current')
    expect(drawer.get('[data-test="step-results"]').element.closest('li')!.className).not.toContain('is-current')

    await input.trigger('blur')
    expect(store.findItem('CV-2602')?.questions[0]?.question).toBe('自定义核验问题')
    expect(drawer.get('[data-test="step-questions"]').element.closest('li')!.className).toContain('is-current')
    expect(drawer.get('[data-test="step-questions"]').element.closest('li')!.className).not.toContain('is-done')
    expect(drawer.get('[data-test="step-results"]').element.closest('li')!.className).not.toContain('is-current')
    wrapper.unmount()
  })

  it('allows returning to edit and rechecking before publishing', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    await drawer.get('[data-test="edit-content"]').trigger('click')
    expect(drawer.findAll('.cpd-form .cpd-field > span').map(label => label.text())).toEqual(['标题', '正文'])
    await drawer.get('[data-test="detail-title"]').setValue('APW CFRP 分层控制（修订）')
    await drawer.get('.cpd-form').trigger('submit')

    const item = store.findItem('CV-2601')!
    expect(item.stage).toBe('ai_checked')
    expect(item.title).toBe('APW CFRP 分层控制（修订）')
    expect(item.clientConfirmation).toBeUndefined()

    await drawer.get('[data-test="step-publish"]').trigger('click')
    expect(drawer.find('[data-test="confirm-content"]').exists()).toBe(false)
    expect(drawer.find('[data-test="publish-blog"]').exists()).toBe(true)

    await drawer.get('[data-test="publish-blog"]').trigger('click')
    expect(store.findItem('CV-2601')?.stage).toBe('questions_pending')
    wrapper.unmount()
  })

  it('creates an AI draft and opens it for editing', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()

    await wrapper.get('[data-test="create-content"]').trigger('click')
    const createDrawer = wrapper.get('[data-test="drawer"]')
    expect(createDrawer.text()).toContain('AI 写核验文章')
    expect(createDrawer.text()).toContain('内容确认')

    await createDrawer.get('[data-test="create-theme"]').setValue('五轴水刀 · CFRP 分层控制指南')
    await createDrawer.get('.cp-form').trigger('submit')
    await flushPromises()

    const item = store.state.items.find(entry => entry.title.includes('CFRP 分层控制指南'))!
    expect(item.stage).toBe('draft')
    expect(store.state.items).toHaveLength(10)

    const detail = wrapper.get('[data-test="drawer"]')
    expect(detail.get('[data-test="detail-title"]').element).toHaveProperty('value', item.title)
    expect(wrapper.find('.cv-filter').exists()).toBe(true)
    wrapper.unmount()
  })

  it('opens a published verification result with answers and snapshot downloads', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-task-id="T-2407"] .cv-title').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cpd-step__label').map(step => step.text())).toEqual(['内容', '确认内容并发布', '核验问题', '核验结果'])
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    expect(drawer.get('[data-test="verification-return-status"]').text()).toContain('核验成功')
    expect(drawer.get('.cv-result__question').text()).toBe('APW 是不是做钛合金切割？')
    expect(drawer.text()).toContain('围绕钛合金零件加工的行业回答')
    expect(drawer.findAll('.cv-platform__name').map(item => item.text())).toEqual(['ChatGPT', 'Google AI'])
    expect(drawer.findAll('.cv-snapshot-link')).toHaveLength(2)
    expect(drawer.find('.cv-citation').exists()).toBe(false)
    expect(drawer.text()).not.toContain('重新核验')
    expect(drawer.text()).not.toContain('专家')
    expect(drawer.text()).not.toContain('运营')

    await drawer.findAll('button').find(button => button.text() === '关闭')!.trigger('click')
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('starts verification from the ready demo and returns the success state', async () => {
    const wrapper = mountView()
    const store = useContentProductionStore()
    const row = wrapper.get('[data-content-id="CV-DEMO-READY"]')

    expect(row.text()).toContain('过了核验时间的问题')
    expect(row.text()).toContain('待核验')
    expect(row.get('.cv-link').text()).toBe('开始核验')

    await row.get('.cv-title').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const start = drawer.findAll('button').find(button => button.text() === '开始核验')
    expect(start).toBeTruthy()

    await start!.trigger('click')
    // The question step is only complete once verification starts, and the
    // result step becomes active before the request returns.
    expect(drawer.get('[data-test="step-questions"]').element.closest('li')!.className).toContain('is-done')
    expect(drawer.get('[data-test="step-results"]').element.closest('li')!.className).toContain('is-current')
    expect(drawer.text()).toContain('核验中...')
    await flushPromises()

    expect(store.findItem('CV-DEMO-READY')?.stage).toBe('verified')
    expect(drawer.get('[data-test="verification-return-status"]').text()).toContain('核验成功')
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    wrapper.unmount()
  })

  it('shows the first-round aero verification result', async () => {
    const wrapper = mountView()

    await wrapper.get('.cv-round-select select').setValue('r1')
    await wrapper.get('[data-task-id="T-2406"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    expect(drawer.get('.cv-result__question').text()).toBe('APW 是不是做航空复材切割？')
    expect(drawer.text()).toContain('围绕航空制造水刀设备选型的行业回答')
    expect(drawer.text()).not.toContain('次采集')
    expect(drawer.findAll('.cv-snapshot-link')).toHaveLength(2)
    wrapper.unmount()
  })
})
