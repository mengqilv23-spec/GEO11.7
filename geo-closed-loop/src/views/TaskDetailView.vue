<script setup lang="ts">
import type { UserRole } from '../data/geo-data'
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskWorkspace from '../components/tasks/TaskWorkspace.vue'
import { useGeoWorkbenchRouteContext } from '../composables/workbench-route-context'
import { auditFindings, cloneGeoTask, officialContentSnapshot } from '../data/geo-data'
import { ensureWorkflow } from '../workflows/task-workflow'

const route = useRoute()
const router = useRouter()
const context = useGeoWorkbenchRouteContext()
const task = computed(() => {
  const source = context.tasks.find(item => item.id === route.params.taskId)
  if (!source)
    return undefined
  if (source.id === 'T-2501' && route.query?.preview === 'code-review') {
    const previewTask = cloneGeoTask(source)
    const finding = auditFindings.find(item => item.id === 'F9')!
    previewTask.name = '官网地址与已确认资料不一致'
    previewTask.source = 'F9'
    previewTask.type = 'web'
    previewTask.destination = '官网内容'
    previewTask.progress = context.serviceMode.value === 'agent' ? 'client_review' : 'human'
    previewTask.contentFormat = 'code'
    previewTask.evidence = finding.evidence
    previewTask.auditContent = officialContentSnapshot(finding)
    const workflow = ensureWorkflow(previewTask)
    workflow.briefStatus = 'confirmed'
    workflow.brief.goal = '统一官网企业地址与已确认资料'
    workflow.brief.executionTarget = '官网公共 Schema 与元信息'
    return previewTask
  }
  if (source.id !== 'T-2502' || route.query?.preview !== 'content-review')
    return source

  // A disposable, ready-to-review fixture makes the new content controls immediately previewable.
  const previewTask = cloneGeoTask(source)
  previewTask.progress = 'human'
  const workflow = ensureWorkflow(previewTask)
  workflow.briefStatus = 'confirmed'
  workflow.brief.goal = '日本代理合作与本地服务说明页'
  workflow.brief.executionTarget = '日本市场官网内容页'
  workflow.output = {
    title: '日本代理合作与本地服务说明页',
    revision: 2,
    body: [
      '<h2>面向日本市场的本地服务与合作支持</h2>',
      '<p>日本市场的采购团队在评估水刀切割设备时，除了关注设备能力，也需要了解安装、操作培训、日常维护和服务响应方式。</p>',
      '<p>APW Waterjet 可围绕日本客户的项目需求，沟通本地服务支持与代理合作安排。具体覆盖地区、响应时效和服务内容，以双方确认的合作方案为准。</p>',
      '<h2>代理合作如何开展</h2>',
      '<p>代理合作可围绕客户需求沟通、设备选型、项目协调和售后协作展开。合作范围、职责边界及交付条件需结合具体项目确认，未经确认的服务承诺不作为固定政策。</p>',
      '<p>开始沟通前，建议准备目标应用材料、加工需求、现场条件和所需支持，以便双方确认适用方案与后续服务安排。</p>',
      '<h2>确认适用范围</h2>',
      '<p>如需了解日本市场的代理合作与本地支持，请联系 APW Waterjet 团队，进一步确认适用地区、合作条件和服务安排。</p>',
    ].join(''),
  }
  return previewTask
})
const testRole = shallowRef<UserRole | null>(null)
const clientPreview = computed(() => testRole.value === 'client')
const role = computed(() => context.serviceMode.value === 'agent' ? 'client' : testRole.value ?? context.role.value)
const serviceMode = computed(() => context.serviceMode.value)

watch(() => [route.params.taskId, context.tasks.some(item => item.id === route.params.taskId)] as const, ([taskId]) => {
  testRole.value = null
  if (!context.tasks.some(item => item.id === taskId))
    void router.replace({ name: 'optimization' })
}, { immediate: true })

function setTestRole(nextRole: UserRole) {
  testRole.value = nextRole
}

function goBack() {
  if (typeof window.history.state?.back === 'string') {
    router.back()
    return
  }
  void router.replace({ name: 'optimization' })
}
</script>

<template>
  <TaskWorkspace
    v-if="task"
    :task="task"
    :role="role"
    :service-mode="serviceMode"
    :client-preview="clientPreview"
    @back="goBack"
    @set-test-role="setTestRole"
  />
</template>

