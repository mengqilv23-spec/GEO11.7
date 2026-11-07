import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { AuditCheck, AuditFinding, GeoPage, GeoTask, Persona, ServiceMode, Strategy, StrategyLayer, TaskFilter, UserRole } from '../data/geo-data'
import { inject } from 'vue'

export interface GeoWorkbenchRouteContext {
  findings: AuditFinding[]
  personas: Persona[]
  activePersona: Ref<string>
  strategies: Strategy[]
  tasks: GeoTask[]
  strategyLayer: Ref<StrategyLayer>
  serviceMode: Ref<ServiceMode>
  role: Ref<UserRole>
  highlightedStrategy: Ref<string | undefined>
  taskFilter: Ref<TaskFilter>
  visibleTasks: ComputedRef<GeoTask[]>
  navigate: (page: GeoPage) => Promise<void>
  toggleFinding: (id: string) => void
  selectAllFindings: (ids: string[]) => void
  approveSelectedFindings: () => void
  openStrategy: (strategy: Strategy) => void
  confirmStrategy: (strategy: Strategy) => void
  openFlow: (page: GeoPage) => void
  openAudit: (finding: AuditFinding) => void
  openAuditCheck: (check: AuditCheck) => void
  openPending: () => void
  openBaseline: (kind: 'scope' | 'rounds') => void
  openTask: (task: GeoTask) => void
  openTaskSource: (task: GeoTask) => void
}

export const geoWorkbenchRouteContextKey: InjectionKey<GeoWorkbenchRouteContext> = Symbol('geo-workbench-route-context')

export function useGeoWorkbenchRouteContext() {
  const context = inject(geoWorkbenchRouteContextKey)
  if (!context)
    throw new Error('GEO route views must be rendered inside GeoWorkbenchLayout')
  return context
}

