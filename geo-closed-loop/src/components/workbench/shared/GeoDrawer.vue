<script setup lang="ts">
import type { DrawerSize } from '../../ui/ce/drawer/types'
import Button from '../../ui/ce/button/Button.vue'
import Drawer from '../../ui/ce/drawer/Drawer.vue'

withDefaults(defineProps<{ open: boolean, title: string, subtitle?: string, eyebrow?: string, size?: DrawerSize, titleFirst?: boolean, showFooter?: boolean }>(), {
  showFooter: true,
})
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Drawer
    :open="open"
    :title="title"
    :eyebrow="eyebrow"
    :description="subtitle"
    :size="size ?? 400"
    :title-first="titleFirst"
    :class="titleFirst ? 'geo-detail-drawer' : undefined"
    close-label="关闭详情"
    @close="emit('close')"
  >
    <slot />
    <template v-if="showFooter" #footer>
      <slot name="footer">
        <Button type="button" @click="emit('close')">
          关闭
        </Button>
      </slot>
    </template>
  </Drawer>
</template>

