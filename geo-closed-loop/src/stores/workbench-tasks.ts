import type { GeoTask } from '../data/geo-data'
import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { cloneGeoTask, initialTasks } from '../data/geo-data'
import { publishedContentTasks } from '../data/published-content-tasks'

export const useWorkbenchTasksStore = defineStore('workbench-tasks', () => {
  const tasks = reactive<GeoTask[]>([...initialTasks, ...publishedContentTasks].map(cloneGeoTask))

  function findTask(taskId: string | undefined) {
    return tasks.find(task => task.id === taskId)
  }

  return { tasks, findTask }
})
