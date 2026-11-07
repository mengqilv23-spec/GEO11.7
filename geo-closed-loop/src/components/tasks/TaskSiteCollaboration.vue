<script setup lang="ts">
import type { GeoTask } from '../../data/geo-data'
import type { TaskBrief, TaskWorkflow } from '../../workflows/task-workflow'
import Card from '../ui/ce/card/Card.vue'
import Tag from '../ui/ce/tag/Tag.vue'
import { computed } from 'vue'

const props = defineProps<{
  task: GeoTask
  brief: TaskBrief
  site: TaskWorkflow['site']
  methods: string[]
  statusLabel: string
  statusTone: 'blue' | 'green' | 'red' | 'neutral'
}>()
const previewHref = computed(() => `${import.meta.env.BASE_URL}optimization/tasks/${encodeURIComponent(props.task.id)}/preview`)
</script>

<template>
  <Card class="tw-site-card">
    <header class="tw-site-header">
      <div class="tw-site-heading">
        <span class="tw-site-mark" aria-hidden="true">AI</span>
        <h2>AI 建站执行</h2>
      </div>
      <Tag :tone="statusTone">
        {{ statusLabel }}
      </Tag>
    </header>
    <div class="tw-site-body">
      <section class="tw-site-block tw-site-task" data-test="site-task-card">
        <div class="tw-site-column-head">
          <h3>确认后提交的执行任务</h3>
          <span>{{ task.id }} · V{{ task.workflow?.output.revision ?? 1 }}</span>
        </div>
        <dl class="tw-site-fields">
          <div class="tw-site-field">
            <dt>目标站点</dt><dd>{{ site.targetSite || '待确认' }}</dd>
          </div>
          <div class="tw-site-field">
            <dt>目标页面</dt><dd>{{ site.targetPage || brief.executionTarget }}</dd>
          </div>
          <div class="tw-site-field">
            <dt>变更类型</dt><dd>{{ task.type === 'repair' ? '官网结构与技术' : site.changeType || '官网内容更新' }}</dd>
          </div>
          <div class="tw-site-field">
            <dt>执行内容</dt><dd>{{ methods.join('、') || '待确认执行方法' }}</dd>
          </div>
          <div class="tw-site-field tw-site-field--wide">
            <dt>事实边界</dt><dd>{{ site.factBoundary || '仅使用客户已确认的业务事实' }}</dd>
          </div>
          <div class="tw-site-field tw-site-field--wide">
            <dt>验收条件</dt><dd>{{ site.acceptance || brief.acceptance }}</dd>
          </div>
        </dl>
      </section>
      <section class="tw-site-block tw-site-status" data-test="site-execution-status" aria-label="执行状态">
        <div class="tw-site-column-head">
          <h3>执行状态</h3>
          <span>{{ site.attempts ? `第 ${site.attempts} 次提交` : '等待执行' }}</span>
        </div>
        <template v-if="task.type === 'repair' && task.progress === 'site_returned'">
          <p class="tw-site-waiting" role="status">
            {{ site.result || '官网已返回处理结果，详细回传内容待加载。' }}
          </p>
        </template>
        <template v-else-if="site.preview || site.result">
          <dl class="tw-site-fields tw-site-result-fields">
            <div class="tw-site-field">
              <dt>修改摘要</dt><dd>{{ site.requirements || '按已确认执行包完成页面修改。' }}</dd>
            </div>
            <div class="tw-site-field">
              <dt>预览版本</dt><dd><a v-if="site.preview" :href="previewHref" target="_blank" rel="noopener noreferrer">{{ site.preview }} · 打开预览</a><span v-else>尚未生成</span></dd>
            </div>
            <div class="tw-site-field">
              <dt>自动检查</dt><dd>{{ site.result || '检查结果待回传' }}</dd>
            </div>
          </dl>
        </template>
        <p v-else class="tw-site-waiting">
          {{ task.type === 'repair' ? '技术修复已提交官网，等待官网回传处理结果。' : 'AI 建站接收任务后，将在这里返回修改摘要、预览版本、变更 Diff 和自动检查结果。' }}
        </p>
      </section>
    </div>
  </Card>
</template>

