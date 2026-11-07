import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDiagnosisStore = defineStore('diagnosis', () => {
  const selectedGap = ref('')

  function focusGap(name: string) {
    selectedGap.value = name
  }

  function clearFocusedGap() {
    selectedGap.value = ''
  }

  return {
    selectedGap,
    focusGap,
    clearFocusedGap,
  }
})

