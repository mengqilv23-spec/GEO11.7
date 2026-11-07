<script setup lang="ts">
import type { KnowledgeItem } from '../../../types'
import { Button } from '../../ui/ce'

defineProps<{
  item: KnowledgeItem
}>()

const emit = defineEmits<{
  edit: [item: KnowledgeItem]
}>()
</script>

<template>
  <article class="knowledge-card">
    <div class="knowledge-card__index">
      {{ item.index }}
    </div>
    <div class="knowledge-card__body">
      <h3>{{ item.title }}</h3>
      <p class="knowledge-card__summary">
        {{ item.summary }}
      </p>
    </div>
    <Button class="knowledge-card__edit" variant="outline" size="sm" @click="emit('edit', item)">
      <span aria-hidden="true">✎</span>
      编辑
    </Button>
  </article>
</template>

