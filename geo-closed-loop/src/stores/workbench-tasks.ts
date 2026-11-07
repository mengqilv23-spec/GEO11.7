import type { GeoTask } from '../data/geo-data'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { cloneGeoTask, initialTasks } from '../data/geo-data'

export const useWorkbenchTasksStore = defineStore('workbench-tasks', () => {
  const tasks = reactive<GeoTask[]>(initialTasks.map(cloneGeoTask))

  function findTask(taskId: string | undefined) {
    return tasks.find(task => task.id === taskId)
  }

  return { tasks, findTask }
})

