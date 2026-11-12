import type { GeoTask } from '../data/geo-data'

/**
 * Code content is injected into the page rather than previewed as an article.
 * F9 address fixes produce public schema/meta markup, so existing saved tasks
 * are recognized without requiring a data migration.
 */
export function isCodeContentTask(task: GeoTask) {
  if (task.type !== 'web')
    return false
  return task.contentFormat === 'code' || /(?:^|[^A-Z0-9])F9(?:\D|$)/i.test(task.source)
}
