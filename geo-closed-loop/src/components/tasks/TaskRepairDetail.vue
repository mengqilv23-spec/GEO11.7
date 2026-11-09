<script setup lang="ts">
import type { GeoTask } from '../../data/geo-data'
import type { TaskWorkflow } from '../../workflows/task-workflow'
import { computed } from 'vue'
import { isDirectRepairTask } from '../../workflows/direct-repair'
import Card from '../ui/ce/card/Card.vue'
import Tag from '../ui/ce/tag/Tag.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = defineProps<{
  task: GeoTask
  site: TaskWorkflow['site']
  statusLabel: string
  statusTone: 'blue' | 'green' | 'red' | 'neutral'
}>()

const repairReason = '技术问题已定位到官网，由官网处理流程返回修复结果。'
const description = computed(() => props.task.evidence || props.task.name || '官网结构与技术')
const returned = computed(() => props.task.completionOutcome !== 'expired-unexecuted' && ['site_returned', 'site_verifying', 'site_failed', 'site_publish', 'recheck', 'done'].includes(props.task.progress))
const result = computed(() => props.site.result || (returned.value ? `${description.value}；官网已返回处理结果。` : ''))
const resultIcon = computed(() => props.task.progress === 'site_failed' ? 'warning' : 'check')
</script>

<template>
  <div class="tw-repair-detail">
    <Card v-if="task.completionOutcome === 'expired-unexecuted'" class="tw-repair-result-card" data-test="repair-expired-result">
      <header class="tw-repair-result-card__heading"><div><span class="tw-repair-result-card__eyebrow">任务已完成</span><h2>未执行优化</h2></div><Tag tone="neutral">已关闭</Tag></header>
      <p>新一轮监测生成时，本任务仍未提交官网，已按时限关闭，不能继续处理。</p>
    </Card>
    <Card v-if="returned" class="tw-repair-result-card" data-test="repair-result" data-state="returned">
      <header class="tw-repair-result-card__heading">
        <div>
          <span class="tw-repair-result-card__eyebrow">官网回传</span>
          <h2>官网处理结果</h2>
        </div>
        <Tag :tone="statusTone">
          {{ statusLabel }}
        </Tag>
      </header>
      <div class="tw-repair-result-card__content" :class="`is-${statusTone}`">
        <span class="tw-repair-result-card__icon" aria-hidden="true">
          <AppIcon :name="resultIcon" :size="19" />
        </span>
        <div>
          <p role="status">
            {{ result }}
          </p>
        </div>
      </div>
    </Card>

    <Card class="tw-repair-section" data-test="repair-health-info">
      <header class="tw-repair-section__heading">
        <div>
          <h2>官网 GEO 体检信息</h2>
          <p>问题定位与处理依据</p>
        </div>
      </header>
      <dl class="tw-repair-fields">
        <div class="tw-repair-field">
          <dt>问题性质与处理方式</dt><dd>{{ isDirectRepairTask(task) ? '官网技术 · 直接处理' : '信息口径 · 确认后处理' }}</dd>
        </div>
        <div class="tw-repair-field">
          <dt>所属检查项</dt><dd>{{ task.factor || '官网 GEO 体检' }}</dd>
        </div>
        <div class="tw-repair-field">
          <dt>当前状态</dt>
          <dd>
            <Tag :tone="statusTone" size="sm">
              {{ statusLabel }}
            </Tag>
          </dd>
        </div>
        <div class="tw-repair-field tw-repair-field--wide">
          <dt>问题描述</dt><dd>{{ description }}</dd>
        </div>
        <div class="tw-repair-field tw-repair-field--wide">
          <dt>为什么这样处理</dt><dd>{{ repairReason }}</dd>
        </div>
      </dl>

      <section class="tw-repair-scope" data-test="repair-description">
        <header class="tw-repair-scope__heading">
          <div>
            <h3>技术方案及内容</h3>
          </div>
        </header>
        <div class="tw-repair-section__body">
          <p class="tw-repair-description">
            {{ description }}
          </p>
          <div v-if="task.methods.length" class="tw-repair-methods">
            <span v-for="method in task.methods" :key="method">{{ method }}</span>
          </div>
        </div>
      </section>
    </Card>
  </div>
</template>

