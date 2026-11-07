<script setup lang="ts">
import { computed } from 'vue'
import OptimizationContent from '../components/workbench/optimization/OptimizationContent.vue'
import { useGeoWorkbenchRouteContext } from '../composables/workbench-route-context'

const context = useGeoWorkbenchRouteContext()
const taskFilter = computed({
  get: () => context.taskFilter.value,
  set: value => context.taskFilter.value = value,
})
const tasks = computed(() => context.visibleTasks.value)
const role = computed(() => context.role.value)
</script>

<template>
  <OptimizationContent
    :tasks="tasks"
    :all-tasks="context.tasks"
    :strategies="context.strategies"
    :filter="taskFilter"
    :role="role"
    :service-mode="context.serviceMode.value"
    @set-filter="taskFilter = $event"
    @open-task="context.openTask"
    @open-flow="context.openFlow('optimization')"
  />
</template>

