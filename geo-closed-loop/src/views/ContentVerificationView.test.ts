import type { ServiceMode, UserRole } from '../data/geo-data'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { resetContentProductionStore, useContentProductionStore } from '../stores/content-production'
import ContentVerificationView from './ContentVerificationView.vue'

function mountViewWithRole(productMode: ServiceMode = 'managed', initialRole: UserRole = 'ops') {
  const role = ref<UserRole>(initialRole)
  const wrapper = mount(ContentVerificationView, {
    global: {
      provide: {
        [geoWorkbenchRouteContextKey as symbol]: {
          productMode: ref<ServiceMode>(productMode),
          role,
        },
      },
      stubs: {
        GeoPageIntro: {
          props: ['title'],
          template: '<header><h1 data-test="intro">{{ title }}</h1><slot name="actions" /></header>',
        },
        GeoDrawer: {
          props: ['open', 'title'],
          template: '<aside v-if="open" data-test="drawer"><h2>{{ title }}</h2><slot /><slot name="footer" /></aside>',
        },
        RouterLink: { template: '<a><slot /></a>' },
        Button: { template: '<button><slot /></button>' },
      },
    },
  })
  return { wrapper, role }
}

function mountView(productMode: ServiceMode = 'managed', role: UserRole = 'ops') {
  return mountViewWithRole(productMode, role).wrapper
}

describe('content verification view', () => {
  beforeEach(() => {
    resetContentProductionStore()
  })

  it('shows the weekly quota and merges production drafts with published verification items', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="intro"]').text()).toBe('品牌内容核验')
    expect(wrapper.text()).toContain('本月核验文章')
    expect(wrapper.text()).toContain('专业版 · 每月 20 篇')
    expect(wrapper.text()).toContain('每月按已发布到官网 Blog 的核验文章计数')
    expect(wrapper.findAll('.cv-stat strong').map(item => item.text())).toEqual(['7', '6'])
    expect(wrapper.findAll('.cv-stat > span').map(item => item.text())).toEqual(['已发布的内容', '已核验的内容'])
    expect(wrapper.findAll('thead th').map(item => item.text())).toEqual(['序号', '任务序号', '内容', '状态', '核验问题', '发布状态', '操作'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
    expect(wrapper.get('[data-content-id="CV-2601"]').text()).toContain('待客户确认')
    expect(wrapper.get('[data-content-id="CV-2602"]').text()).toContain('待核验')
    expect(wrapper.get('[data-content-id="CV-2602"]').text()).toContain('待选择')
    expect(wrapper.get('[data-task-id="T-2404"] .cv-task-id').text()).toBe('T-2404')
    expect(wrapper.get('[data-task-id="T-2404"]').text()).toContain('已核验')
    expect(wrapper.get('[data-task-id="T-2404"]').text()).toContain('APW 是不是有五轴水刀系统？')
    expect(wrapper.get('[data-task-id="T-2404"]').text()).toContain('已发布 2026/9/12')
    expect(wrapper.find('[data-task-id="T-2404"] a').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the same status groups as the filter tabs', async () => {
    const wrapper = mountView()
    const statusTexts = () => wrapper.findAll('tbody .cv-stage').map(item => item.text())
    const filterButton = (label: string) => wrapper.findAll('.cv-filter button').find(button => button.text() === label)!

    expect(new Set(statusTexts())).toEqual(new Set(['已核验', '待客户确认', '待核验']))
    expect(statusTexts()).not.toContain('AI 检查完成')
    expect(statusTexts()).not.toContain('待确认问题')

    await filterButton('待核验').trigger('click')
    expect(statusTexts()).toEqual(['待核验'])

    await filterButton('待客户确认').trigger('click')
    expect(statusTexts()).toEqual(['待客户确认'])

    await filterButton('已核验').trigger('click')
    expect(statusTexts().every(text => text === '已核验')).toBe(true)

    await filterButton('进行中').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    wrapper.unmount()
  })

  it('filters a previous detection round as a read-only archive', async () => {
    const wrapper = mountView()

    await wrapper.get('.cv-round-select select').setValue('r1')
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-task-id'))).toEqual(['T-2406', 'T-2405', 'T-2404'])
    expect(wrapper.find('.cv-filter').exists()).toBe(false)
    expect(wrapper.get('.cv-card__head').text()).toContain('只能查看')

    await wrapper.get('[data-task-id="T-2404"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const questionTab = drawer.findAll('.cpd__tabs button').find(button => button.text() === '核验问题')
    await questionTab!.trigger('click')
    expect(drawer.text()).not.toContain('重新核验')

    await drawer.findAll('button').find(button => button.text() === '关闭')!.trigger('click')
    await wrapper.get('.cv-round-select select').setValue('all')
    expect(wrapper.findAll('tbody tr')).toHaveLength(8)
    expect(wrapper.find('.cv-filter').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the agent version read-only and scopes verification to available rounds', async () => {
    const wrapper = mountView('agent')

    expect(wrapper.get('[data-test="intro"]').text()).toBe('品牌内容核验')
    expect(wrapper.find('[data-test="create-content"]').exists()).toBe(false)
    expect(wrapper.find('.cv-quota').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('本月核验文章')
    expect(wrapper.find('.cv-sample-note').exists()).toBe(false)
    expect(wrapper.findAll('.cv-stat > span').map(item => item.text())).toEqual(['已发布的内容', '已核验的内容'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('待客户确认')
    expect(wrapper.text()).not.toContain('待确认问题')
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-task-id'))).toEqual(['T-2407', 'T-2408', 'T-2409'])
    expect(wrapper.get('[data-task-id="T-2407"]').text()).toContain('APW 是不是做钛合金切割？')
    expect(wrapper.find('[data-task-id="T-2404"]').exists()).toBe(false)

    const roundSelect = wrapper.get('.cv-round-select select')
    expect(roundSelect.findAll('option').map(option => option.text())).toEqual(['第一次检测 · 2026/9/15', '第二次检测 · 2026/9/17'])
    expect((roundSelect.element as HTMLSelectElement).value).toBe('r2')

    await roundSelect.setValue('r1')
    expect((roundSelect.element as HTMLSelectElement).value).toBe('r1')
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-task-id'))).toEqual(['T-2406', 'T-2405', 'T-2404'])
    expect(wrapper.get('[data-task-id="T-2404"]').text()).toContain('APW 是不是有五轴水刀系统？')
    expect(wrapper.find('[data-task-id="T-2407"]').exists()).toBe(false)

    await wrapper.get('[data-task-id="T-2404"] .cv-title').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cpd__tabs button').map(button => button.text())).toEqual(['已发布内容', '核验问题', '核验结果'])
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    expect(drawer.get('.cv-result__question').text()).toBe('APW 是不是有五轴水刀系统？')
    expect(drawer.text()).toContain('Hier ist eine detaillierte Analyse')
    expect(drawer.text()).not.toContain('次采集')
    expect(drawer.findAll('.cv-snapshot-link').map(link => link.text())).toEqual(['下载回答快照', '下载回答快照'])
    expect(drawer.find('details').exists()).toBe(false)
    expect(drawer.text()).not.toContain('重新核验')
    expect(drawer.text()).not.toContain('查看关联任务')

    await drawer.findAll('button').find(button => button.text() === '关闭')!.trigger('click')
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)

    await wrapper.get('.cv-round-select select').setValue('r2')
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-task-id'))).toEqual(['T-2407', 'T-2408', 'T-2409'])
    await wrapper.get('[data-task-id="T-2407"] .cv-title').trigger('click')
    expect(wrapper.get('[data-test="drawer"]').get('.cv-result__question').text()).toBe('APW 是不是做钛合金切割？')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('围绕钛合金零件加工的行业回答')
    expect(wrapper.get('[data-test="drawer"]').text()).not.toContain('次采集')
    wrapper.unmount()
  })

  it('hides creation and question confirmation from a client in managed mode', async () => {
    const wrapper = mountView('managed', 'client')

    expect(wrapper.find('[data-test="create-content"]').exists()).toBe(false)
    expect(wrapper.get('[data-content-id="CV-2602"] .cv-link').text()).toBe('查看问题')

    await wrapper.get('[data-content-id="CV-2602"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const questionTab = drawer.findAll('.cpd__tabs button').find(button => button.text() === '核验问题')
    await questionTab!.trigger('click')
    const buttonLabels = drawer.findAll('button').map(button => button.text())
    expect(buttonLabels).not.toContain('开始核验')
    expect(drawer.findAll('input[type="radio"]')).toHaveLength(0)
    expect(drawer.find('.cpd-question__input').exists()).toBe(false)
    expect(drawer.text()).toContain('运营尚未选择核验问题')
    wrapper.unmount()
  })

  it('shows a managed customer only content confirmation and read-only results', async () => {
    const wrapper = mountView('managed', 'client')

    expect(wrapper.get('[data-content-id="CV-2601"] .cv-link').text()).toBe('客户确认')
    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cpd__tabs button').map(button => button.text())).toEqual(['内容确认'])
    expect(drawer.text()).toContain('内容已提交，请确认内容与发布范围。')
    expect(drawer.text()).toContain('CFRP 分层控制')
    expect(drawer.find('[data-test="confirm-client"]').exists()).toBe(true)
    expect(drawer.find('[data-test="reject-client"]').exists()).toBe(true)
    expect(drawer.find('[data-test="submit-client"]').exists()).toBe(false)
    expect(drawer.find('[data-test="publish-blog"]').exists()).toBe(false)
    expect(drawer.find('[data-test="start-verification"]').exists()).toBe(false)

    await drawer.get('[data-test="client-comment"]').setValue('请补充服务范围。')
    await drawer.get('[data-test="reject-client"]').trigger('click')

    expect(drawer.text()).toContain('您已驳回，专家修改后会重新提交。')
    expect(drawer.text()).toContain('驳回意见：请补充服务范围。')
    expect(drawer.find('[data-test="confirm-client"]').exists()).toBe(false)
    expect(useContentProductionStore().findItem('CV-2601')?.stage).toBe('client_rejected')
    wrapper.unmount()
  })

  it('keeps customer confirmation out of the expert view', async () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-content-id="CV-2601"] .cv-link').text()).toBe('查看进度')
    await wrapper.get('[data-content-id="CV-2601"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cpd__tabs button').map(button => button.text())).toEqual(['内容', 'AI 检查', '发布', '核验问题', '核验结果'])
    expect(drawer.text()).toContain('等待客户确认')
    expect(drawer.text()).toContain('演示时可切换到左侧「客户」角色完成确认')
    expect(drawer.find('[data-test="confirm-client"]').exists()).toBe(false)
    expect(drawer.find('[data-test="reject-client"]').exists()).toBe(false)
    expect(drawer.find('[data-test="submit-client"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('locks verification until 48 hours after publishing', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-content-id="CV-2602"] .cv-link').trigger('click')
    const drawer = wrapper.get('[data-test="drawer"]')
    const questionTab = drawer.findAll('.cpd__tabs button').find(button => button.text() === '核验问题')
    await questionTab!.trigger('click')

    expect(drawer.text()).toContain('内容发布后需等待 48 小时生效')
    await drawer.findAll('.cpd-question-option input[type="radio"]')[0]!.setValue(true)
    expect(drawer.get('[data-test="start-verification"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('opens a cited content drawer with platform answers and snapshot downloads', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-task-id="T-2404"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.text()).toContain('T-2404')
    expect(drawer.text()).toContain('Hier ist eine detaillierte Analyse')
    expect(drawer.findAll('.cv-platform__name').map(item => item.text())).toEqual(['ChatGPT', 'Google AI'])
    expect(drawer.find('.cv-citation').exists()).toBe(false)
    expect(drawer.find('.cv-answer__official').exists()).toBe(false)
    const snapshot = drawer.get('.cv-snapshot-link')
    expect(snapshot.text()).toBe('下载回答快照')
    expect(snapshot.attributes('download')).toBe('T-2404-chatgpt.html')
    expect(snapshot.attributes('href')).toContain('data:text/html')

    const questionTab = drawer.findAll('.cpd__tabs button').find(button => button.text() === '核验问题')
    await questionTab!.trigger('click')
    expect(drawer.get('.cpd-question__text').text()).toBe('APW 是不是有五轴水刀系统？')
    expect(drawer.find('.cpd-question__input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows one aerospace verification question with platform answers', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-task-id="T-2406"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    expect(drawer.get('.cv-result__question').text()).toBe('APW 是不是做航空复材切割？')
    expect(drawer.text()).toContain('围绕航空制造水刀设备选型的行业回答')
    expect(drawer.text()).not.toContain('次采集')
    expect(drawer.findAll('.cv-platform__name').map(item => item.text())).toEqual(['ChatGPT', 'Google AI'])
    expect(drawer.get('.cv-snapshot-link').attributes('download')).toBe('T-2406-chatgpt.html')

    const questionTab = drawer.findAll('.cpd__tabs button').find(button => button.text() === '核验问题')
    await questionTab!.trigger('click')
    expect(drawer.get('.cpd-question__text').text()).toBe('APW 是不是做航空复材切割？')
    expect(drawer.find('.cpd-question__input').exists()).toBe(false)
    expect(drawer.text()).not.toContain('业务范围 / 航空复材')
    expect(drawer.text()).not.toContain('APW 是不是做钛合金切割？')
    wrapper.unmount()
  })

  it('runs a new article from AI draft through customer confirmation, Blog publishing, question confirmation and verification', async () => {
    const { wrapper, role } = mountViewWithRole()

    await wrapper.get('[data-test="create-content"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('AI 写核验文章')
    await wrapper.get('[data-test="create-theme"]').setValue('钛合金航空结构件 · 服务边界')
    expect(wrapper.get('.cp-form').text()).not.toContain('核心事实')
    await wrapper.get('.cp-form').trigger('submit')

    expect(wrapper.text()).toContain('钛合金航空结构件 · 服务边界')
    expect(wrapper.get('[data-test="detail-title"]').element).toBeTruthy()
    await flushPromises()
    expect(wrapper.find('[data-test="detail-body"] textarea').exists()).toBe(false)
    expect(wrapper.find('[data-test="detail-body"] .ProseMirror').text()).toContain('钛合金航空结构件')
    expect(wrapper.findAll('.cpd__tabs button').map(button => button.text())).toEqual(['内容', 'AI 检查', '发布', '核验问题', '核验结果'])

    await wrapper.get('[data-test="tab-check"]').trigger('click')
    const startCheck = wrapper.findAll('button').find(button => button.text() === '开始 AI 检查')
    expect(startCheck).toBeTruthy()
    await startCheck!.trigger('click')
    expect(wrapper.text()).toContain('AI 检查通过')

    await wrapper.get('[data-test="tab-publish"]').trigger('click')
    await wrapper.get('[data-test="submit-client"]').trigger('click')
    expect(wrapper.find('[data-test="confirm-client"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('等待客户确认')

    role.value = 'client'
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.cpd__tabs button').map(button => button.text())).toEqual(['内容确认'])
    await wrapper.get('[data-test="confirm-client"]').trigger('click')
    expect(wrapper.text()).toContain('您已确认，等待专家发布到官网 Blog。')

    role.value = 'ops'
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-test="publish-blog"]').trigger('click')

    expect(wrapper.text()).toContain('选择 1 个核验问题')
    expect(wrapper.text()).toContain('AI 已生成 5 个候选')
    const produced = useContentProductionStore().state.items.find(item => item.title.includes('钛合金航空结构件'))!
    produced.publishedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    await wrapper.vm.$nextTick()
    const options = wrapper.findAll('.cpd-question-option')
    expect(options).toHaveLength(6)
    expect(wrapper.get('[data-test="start-verification"]').attributes('disabled')).toBeDefined()

    await options[5]!.get('input[type="radio"]').setValue(true)
    expect(wrapper.find('.cpd-question__input').exists()).toBe(true)
    expect(wrapper.get('[data-test="start-verification"]').attributes('disabled')).toBeDefined()
    await wrapper.get('.cpd-question__input').setValue('APW Waterjet 的钛合金加工精度如何？')
    expect(wrapper.get('[data-test="start-verification"]').attributes('disabled')).toBeUndefined()

    await options[0]!.get('input[type="radio"]').setValue(true)
    expect(wrapper.find('.cpd-question__input').exists()).toBe(false)
    expect(wrapper.get('[data-test="start-verification"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-test="start-verification"]').trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 10))

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.findAll('.cv-result')).toHaveLength(1)
    expect(drawer.get('.cv-result__question').text()).toBe('APW Waterjet 是否提供钛合金航空结构件相关能力？')
    expect(drawer.findAll('.cv-platform__name').map(item => item.text())).toEqual(['ChatGPT', 'Google AI'])
    expect(drawer.text()).toContain('钛合金航空结构件 · 服务边界场景下覆盖')
    expect(drawer.findAll('.cv-snapshot-link')).toHaveLength(2)
    expect(drawer.find('.cv-citation').exists()).toBe(false)
    wrapper.unmount()
  })
})
