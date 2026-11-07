<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string
    label?: string
    placeholder?: string
    error?: string
    disabled?: boolean
    readonly?: boolean
    rows?: number
  }>(),
  {
    label: '',
    placeholder: '',
    error: '',
    disabled: false,
    readonly: false,
    rows: 4,
  },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="ui-textarea-field">
    <label v-if="label" class="ui-textarea-field__label" :for="id">{{ label }}</label>
    <textarea
      :id="id"
      v-model="model"
      class="ui-textarea"
      :class="{ 'ui-textarea--error': error }"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <p v-if="error" :id="`${id}-error`" class="ui-textarea-field__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.ui-textarea-field {
  display: grid;
  gap: var(--space-1);
}

.ui-textarea-field__label {
  margin-bottom: var(--space-1);
  color: var(--text-primary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
}

.ui-textarea {
  width: 100%;
  min-height: 88px;
  padding: var(--space-3);
  color: var(--text-primary);
  background: var(--background-primary);
  border: 1px solid var(--border-control);
  border-radius: var(--radius-control);
  font: inherit;
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  font-weight: var(--weight-regular);
  resize: vertical;
  transition: background-color var(--motion-fast), border-color var(--motion-fast), outline-color var(--motion-fast);
}

.ui-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 1;
}

.ui-textarea:hover:not(:disabled):not(:read-only):not([aria-invalid='true']) {
  border-color: var(--action-accent);
}

.ui-textarea:focus {
  outline: none;
}

.ui-textarea:focus-visible {
  border-color: var(--action-accent);
  outline: var(--outline-width-focus) solid var(--focus-ring);
  outline-offset: var(--input-focus-offset);
}

.ui-textarea--error {
  border-color: var(--status-error-foreground);
}

.ui-textarea--error:focus-visible {
  border-color: var(--status-error-foreground);
  outline-color: var(--status-error-foreground);
}

.ui-textarea:disabled {
  color: var(--text-disabled);
  background: var(--background-disabled);
  cursor: not-allowed;
}

.ui-textarea:read-only {
  background: var(--background-secondary);
  cursor: default;
}

.ui-textarea-field__error {
  margin: 0;
  color: var(--status-error-foreground);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
}
</style>

