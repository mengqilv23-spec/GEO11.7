<script setup lang="ts">
import AppIcon from './icons/AppIcon.vue'

defineProps<{
  current: number
  items: string[]
}>()
</script>

<template>
  <nav class="ui-stepper" aria-label="引导步骤">
    <ol class="ui-stepper__list">
      <li
        v-for="(item, index) in items"
        :key="item"
        class="ui-stepper__item"
        :class="{ 'ui-stepper__item--active': index === current, 'ui-stepper__item--done': index < current }"
        :aria-current="index === current ? 'step' : undefined"
      >
        <span class="ui-stepper__content">
          <span class="ui-stepper__indicator" aria-hidden="true">
            <AppIcon v-if="index < current" name="check" :size="14" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span class="ui-stepper__label">{{ item }}</span>
        </span>
        <span v-if="index < items.length - 1" class="ui-stepper__line" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.ui-stepper {
  padding: var(--space-4) var(--space-5);
  background: var(--background-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
}

.ui-stepper__list {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ui-stepper__item {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  color: var(--text-muted);
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.ui-stepper__item:last-child {
  flex: 0 0 auto;
}

.ui-stepper__content {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.ui-stepper__indicator {
  display: inline-grid;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--border-default);
  border-radius: 50%;
  font-size: var(--font-size-caption);
}

.ui-stepper__label {
  min-width: 0;
  margin-left: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-stepper__line {
  flex: 1 1 auto;
  min-width: var(--space-3);
  height: 1px;
  margin: 0 var(--space-3);
  background: var(--border-default);
}

.ui-stepper__item--active,
.ui-stepper__item--done {
  color: var(--action-accent);
  font-weight: var(--weight-semibold);
}

.ui-stepper__item--active .ui-stepper__indicator,
.ui-stepper__item--done .ui-stepper__indicator {
  color: var(--primitive-white);
  background: var(--action-accent);
  border-color: var(--action-accent);
}

.ui-stepper__item--done .ui-stepper__line {
  background: var(--action-accent);
}

@media (max-width: 520px) {
  .ui-stepper {
    padding: var(--space-3);
  }

  .ui-stepper__list {
    display: grid;
  }

  .ui-stepper__item {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    grid-template-rows: auto auto;
    flex: none;
    align-items: start;
    justify-content: initial;
  }

  .ui-stepper__content {
    display: contents;
    padding: 0;
    background: transparent;
  }

  .ui-stepper__indicator {
    grid-column: 1;
    grid-row: 1;
  }

  .ui-stepper__label {
    grid-column: 2;
    grid-row: 1;
    margin-left: 0;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
  }

  .ui-stepper__line {
    position: static;
    grid-column: 1;
    grid-row: 2;
    width: 1px;
    min-width: 1px;
    height: 16px;
    margin: 0 auto;
    transform: none;
  }
}
</style>

