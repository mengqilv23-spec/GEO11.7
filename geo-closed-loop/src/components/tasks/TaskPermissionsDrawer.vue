<script setup lang="ts">
import Button from '../ui/ce/button/Button.vue'
import Drawer from '../ui/ce/drawer/Drawer.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const permissions = [
  { ability: '诊断问题审核', agent: '生成诊断与证据', client: '确认处理、忽略或暂缓' },
  { ability: '候选策略审核', agent: '建议方法、排序与去重', client: '采纳或填写原因忽略' },
  { ability: 'Task Brief', agent: '生成目标与专业方法', client: '补充资料和说明、确认执行' },
  { ability: '内容审核', agent: '生成及自动质检', client: '只读，通过 / 拒绝' },
  { ability: '官网执行', agent: '自动提交与验证（模拟）', client: '确认变更、异常时补充要求' },
  { ability: '外部信源', agent: '生成与交付内容', client: '确认后自行发布' },
]
</script>

<template>
  <Drawer
    :open="open"
    eyebrow="角色与权限"
    title="诊断与策略 / 优化中心权限边界"
    :size="720"
    close-label="关闭权限说明"
    close-text="关闭"
    class="task-permissions-drawer"
    @close="emit('close')"
  >
    <div class="tp-content">
      <p class="tp-principle">
        <strong>角色原则：</strong>AI 负责生成、质检与执行；客户负责审核和确认。
      </p>
      <div class="tp-table-scroll" role="region" tabindex="0" aria-label="角色权限对照表，可横向滚动">
        <table class="tp-table">
          <thead>
            <tr>
              <th scope="col">
                能力
              </th>
              <th scope="col">
                Agent
              </th>
              <th scope="col">
                客户
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in permissions" :key="permission.ability">
              <th scope="row">
                {{ permission.ability }}
              </th>
              <td>{{ permission.agent }}</td>
              <td>{{ permission.client }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <Button class="tp-acknowledge" variant="primary" @click="emit('close')">
        知道了
      </Button>
    </template>
  </Drawer>
</template>

<style scoped>
.tp-content {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.tp-principle {
  margin: 0;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--background-secondary);
  color: var(--text-secondary);
  line-height: 1.6;
}

.tp-principle strong {
  color: var(--text-primary);
}

.tp-table-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  border: 1px solid var(--border-default);
  border-radius: 12px;
}

.tp-table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  table-layout: fixed;
  color: var(--text-secondary);
}

.tp-table th,
.tp-table td {
  padding: 14px 8px;
  border-bottom: 1px solid var(--border-default);
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  overflow-wrap: normal;
}

.tp-table tr > :nth-child(1) {
  width: 26%;
}

.tp-table tr > :nth-child(2) {
  width: 19%;
}

.tp-table tr > :nth-child(3) {
  width: 28%;
}

.tp-table tr > :nth-child(4) {
  width: 27%;
}

.tp-table thead th {
  background: var(--background-secondary);
  color: var(--text-primary);
  font-weight: 650;
}

.tp-table tbody th {
  color: var(--text-secondary);
  font-weight: 500;
  text-align: center;
}

.tp-table tbody tr:last-child th,
.tp-table tbody tr:last-child td {
  border-bottom: 0;
}

.tp-table-scroll:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.tp-acknowledge {
  width: 100%;
}

:deep(.ce-drawer.task-permissions-drawer) {
  inset-inline: 0;
  margin-inline: auto;
}

:deep(.ce-drawer-footer) {
  justify-content: stretch;
}
</style>

