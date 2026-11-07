<script setup lang="ts">
import type { ContentPreviewLabels, PreviewItem } from './types'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import Button from '../button/Button.vue'
import { useInteractionScope } from '../interaction/useInteractionScope'
import Spinner from '../spinner/Spinner.vue'

const props = defineProps<{
  item: PreviewItem
  source: string | null
  poster?: string
  labels: ContentPreviewLabels
}>()
const emit = defineEmits<{ retry: [] }>()
const LOAD_TIMEOUT_MS = 15_000
const MAX_TEXT_LENGTH = 100_000

const scope = useInteractionScope()
const status = shallowRef<'loading' | 'ready' | 'failed'>('loading')
const mounted = shallowRef(false)
const media = useTemplateRef<HTMLMediaElement>('media')
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  mounted.value = true
  if ('src' in props.item && props.source) {
    timer = setTimeout(() => {
      if (mounted.value && scope.value.isCurrent() && status.value === 'loading')
        status.value = 'failed'
    }, LOAD_TIMEOUT_MS)
  }
})

onBeforeUnmount(() => {
  mounted.value = false
  if (timer)
    clearTimeout(timer)
  const element = media.value
  if (element) {
    element.pause()
    element.removeAttribute('src')
    element.load()
  }
})

function settle(next: 'ready' | 'failed') {
  if (!mounted.value || !scope.value.isCurrent())
    return
  status.value = status.value === 'failed' ? 'failed' : next
  if (timer)
    clearTimeout(timer)
}
</script>

<template>
  <p v-if="item.kind === 'unsupported'" class="ce-content-preview-message">
    {{ labels.unsupported }}
  </p>
  <template v-else-if="item.kind === 'text'">
    <pre class="ce-content-preview-text">{{ item.text.slice(0, MAX_TEXT_LENGTH) }}</pre>
    <p v-if="item.text.length > MAX_TEXT_LENGTH" class="ce-content-preview-message" role="status">
      {{ labels.textTruncated }}
    </p>
  </template>
  <div v-else-if="!source || status === 'failed'" class="ce-content-preview-state" role="status">
    <p>{{ labels.failed }}</p>
    <Button v-if="source" :aria-label="labels.retry" @click="emit('retry')">
      {{ labels.retry }}
    </Button>
  </div>
  <template v-else>
    <div v-if="status === 'loading'" class="ce-content-preview-loading" role="status">
      <Spinner aria-hidden="true" />
      {{ labels.loading }}
    </div>
    <div class="ce-content-preview-stage" :aria-busy="status === 'loading'">
      <img
        v-if="item.kind === 'image'"
        :src="source"
        :alt="item.alt ?? item.name"
        class="ce-content-preview-image"
        referrerpolicy="no-referrer"
        @load="settle('ready')"
        @error="settle('failed')"
      >
      <iframe
        v-else-if="item.kind === 'pdf'"
        :src="source"
        :title="item.name"
        class="ce-content-preview-pdf"
        tabindex="0"
        sandbox=""
        referrerpolicy="no-referrer"
        @load="settle('ready')"
        @error="settle('failed')"
      />
      <video
        v-else-if="item.kind === 'video'"
        ref="media"
        :src="source"
        :poster="poster"
        class="ce-content-preview-video"
        controls
        preload="metadata"
        tabindex="0"
        :aria-label="item.name"
        @loadedmetadata="settle('ready')"
        @error="settle('failed')"
      />
      <audio
        v-else-if="item.kind === 'audio'"
        ref="media"
        :src="source"
        class="ce-content-preview-audio"
        controls
        preload="metadata"
        tabindex="0"
        :aria-label="item.name"
        @loadedmetadata="settle('ready')"
        @error="settle('failed')"
      />
    </div>
  </template>
</template>

