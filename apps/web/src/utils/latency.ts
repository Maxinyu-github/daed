import type { TFunction } from 'i18next'
import type { NodeLatencyProbeResult } from '~/apis'

export type LatencyTone = 'good' | 'medium' | 'bad' | 'failed' | 'unknown'

export function hasMeasuredLatency(result?: NodeLatencyProbeResult) {
  return Number.isFinite(result?.latencyMs)
}

export function formatLatencyLabel(result: NodeLatencyProbeResult | undefined, t: TFunction) {
  if (!result) {
    return undefined
  }
  if (typeof result.latencyMs === 'number') {
    return `${result.latencyMs} ms`
  }
  if (result.alive === false) {
    return t('latency.failed')
  }
  return t('latency.unavailable')
}

export function getLatencyTone(result: NodeLatencyProbeResult | undefined): LatencyTone {
  if (!result) return 'unknown'
  if (typeof result.latencyMs === 'number') {
    if (result.latencyMs < 100) return 'good'
    if (result.latencyMs < 300) return 'medium'
    return 'bad'
  }
  if (result.alive === false) return 'failed'
  return 'unknown'
}

/**
 * Tailwind classes for a small inline latency badge (text + bg + border) for a tone.
 * Uses tokens that exist in the project's tailwind config / shadcn theme.
 */
export function latencyToneBadgeClass(tone: LatencyTone): string {
  switch (tone) {
    case 'good':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'medium':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'bad':
      return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
    case 'failed':
      return 'border-muted-foreground/30 bg-muted text-muted-foreground line-through'
    case 'unknown':
    default:
      return 'border-muted-foreground/20 bg-muted/60 text-muted-foreground'
  }
}

/**
 * Aggregate stats across a list of latency probe results — useful for group health summary.
 */
export function summarizeLatencies(results: Array<NodeLatencyProbeResult | undefined>) {
  const measured = results
    .map((r) => (r && typeof r.latencyMs === 'number' ? r.latencyMs : null))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)

  const total = results.length
  const aliveCount = results.filter((r) => r && r.alive !== false).length
  const measuredCount = measured.length

  if (measuredCount === 0) {
    return { total, aliveCount, measuredCount, min: null, median: null }
  }

  const min = measured[0]
  const mid = Math.floor(measuredCount / 2)
  const median = measuredCount % 2 === 1 ? measured[mid] : Math.round((measured[mid - 1] + measured[mid]) / 2)

  return { total, aliveCount, measuredCount, min, median }
}
