<script setup lang="ts">
import OperationsReviewStandalone from '../components/operations-review/OperationsReviewStandalone.vue'
</script>

<template>
  <main class="operations-review-shell" aria-label="运营复盘与 Agent 升级">
    <OperationsReviewStandalone />
  </main>
</template>

<style scoped>
.operations-review-shell {
  width: 100%;
  min-width: 0;
}

.operations-review-shell :deep(.ops-review) {
  max-width: none;
  margin: 0;
  padding: 8px 0 24px;
}
</style>

