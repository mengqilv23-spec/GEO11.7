<script setup lang="ts">
import DiagnosisContent from '../components/workbench/diagnosis/DiagnosisContent.vue'
import { useGeoWorkbenchRouteContext } from '../composables/workbench-route-context'

const workbench = useGeoWorkbenchRouteContext()
</script>

<template>
  <div class="geo-diagnosis-view">
    <DiagnosisContent
      :findings="workbench.findings"
      :personas="workbench.personas"
      :active-persona="workbench.activePersona.value"
      :strategies="workbench.strategies"
      :all-strategies="workbench.strategies"
      :tasks="workbench.tasks"
      :strategy-layer="workbench.strategyLayer.value"
      :service-mode="workbench.serviceMode.value"
      :role="workbench.role.value"
      :highlighted-strategy="workbench.highlightedStrategy.value"
      @select-finding="workbench.toggleFinding"
      @select-all-findings="workbench.selectAllFindings"
      @approve-selected-findings="workbench.approveSelectedFindings"
      @select-persona="workbench.activePersona.value = $event"
      @set-strategy-layer="workbench.strategyLayer.value = $event"
      @open-strategy="workbench.openStrategy"
      @confirm-strategy="workbench.confirmStrategy"
      @go-optimization="workbench.openFlow('optimization')"
      @open-flow="workbench.openFlow('diagnosis')"
      @open-audit="workbench.openAudit"
      @open-audit-check="workbench.openAuditCheck"
      @open-pending="workbench.openPending"
    />
  </div>
</template>

