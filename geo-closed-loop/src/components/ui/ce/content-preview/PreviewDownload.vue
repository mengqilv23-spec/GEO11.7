<script setup lang="ts">
import type { ContentPreviewLabels, PreviewItem } from './types'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import Button from '../button/Button.vue'
import { useInteractionScope } from '../interaction/useInteractionScope'

const props = defineProps<{
  item: PreviewItem
  labels: ContentPreviewLabels
  onDownload: (item: PreviewItem) => void | Promise<void>
}>()

const scope = useInteractionScope()
const downloading = shallowRef(false)
const downloadFailed = shallowRef(false)
const mounted = shallowRef(false)
const pending = shallowRef(false)

onMounted(() => {
  mounted.value = true
})
onBeforeUnmount(() => {
  mounted.value = false
})

async function download() {
  if (!mounted.value || !scope.value.isCurrent() || pending.value)
    return
  pending.value = true
  downloading.value = true
  downloadFailed.value = false
  try {
    await props.onDownload(props.item)
  }
  catch {
    if (mounted.value && scope.value.isCurrent())
      downloadFailed.value = true
  }
  finally {
    pending.value = false
    if (mounted.value && scope.value.isCurrent())
      downloading.value = false
  }
}
</script>

<template>
  <div class="ce-content-preview-download">
    <Button :loading="downloading" :aria-label="downloading ? labels.downloading : labels.download" @click="download">
      {{ downloading ? labels.downloading : labels.download }}
    </Button>
    <p v-if="downloadFailed" class="ce-content-preview-message" role="status">
      {{ labels.downloadFailed }}
    </p>
  </div>
</template>

