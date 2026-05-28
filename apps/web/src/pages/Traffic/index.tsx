import type { FlowRecord, FlowsFilterInput } from '~/apis'
import dayjs from 'dayjs'
import { Eraser, Filter, ListTree, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useClearFlowsMutation, useFlowsQuery } from '~/apis'
import { Section } from '~/components/Section'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { TrafficOverview } from '~/pages/Orchestrate/TrafficOverview'

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  if (value < 1024) return `${value.toFixed(0)} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(value < 10 * 1024 ** 2 ? 1 : 0)} MB`
  return `${(value / 1024 ** 3).toFixed(1)} GB`
}

function safeBytes(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function matchesFilter(flow: FlowRecord, filter: FlowsFilterInput) {
  if (filter.groupName && flow.groupName !== filter.groupName) return false
  if (filter.nodeId && flow.nodeId !== filter.nodeId) return false
  if (filter.outboundName && flow.outboundName !== filter.outboundName) return false
  if (filter.ruleText) {
    const haystack = `${flow.matchedRuleText ?? ''} #${flow.matchedRuleIndex ?? ''}`.toLowerCase()
    if (!haystack.includes(filter.ruleText.toLowerCase())) return false
  }
  if (filter.domain) {
    const target = (flow.dstDomain ?? flow.dstIp ?? '').toLowerCase()
    if (!target.includes(filter.domain.toLowerCase())) return false
  }
  if (filter.process) {
    const proc = (flow.processName ?? '').toLowerCase()
    if (!proc.includes(filter.process.toLowerCase())) return false
  }
  return true
}

export function TrafficPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FlowsFilterInput>({})
  const flowsQuery = useFlowsQuery({ first: 500, refetchIntervalMs: 3_000 })
  const clearFlowsMutation = useClearFlowsMutation()

  const allFlows = flowsQuery.data?.edges ?? []
  const flows = useMemo(() => allFlows.filter((f) => matchesFilter(f, filter)), [allFlows, filter])

  const backendUnavailable = !!flowsQuery.error && allFlows.length === 0

  return (
    <div className="flex flex-col gap-6">
      <TrafficOverview />

      <Section
        title={t('traffic.title')}
        icon={<ListTree className="h-5 w-5" />}
        bordered
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => flowsQuery.refetch()}
              loading={flowsQuery.isFetching}
              aria-label={t('actions.refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearFlowsMutation
                  .mutateAsync()
                  .then(() => toast.success(t('traffic.cleared')))
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : t('traffic.clearFailed'))
                  })
              }}
              loading={clearFlowsMutation.isPending}
              aria-label={t('traffic.clearRecords')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </>
        }
      >
        <Card withBorder padding="md" className="mb-4">
          <CardContent className="flex flex-wrap items-end gap-3 p-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>{t('traffic.filters.title')}</span>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground" htmlFor="flow-filter-domain">
                {t('traffic.filters.domain')}
              </label>
              <Input
                id="flow-filter-domain"
                value={filter.domain ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, domain: e.target.value || undefined }))}
                placeholder={t('traffic.filters.domainPlaceholder')}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground" htmlFor="flow-filter-rule">
                {t('traffic.filters.rule')}
              </label>
              <Input
                id="flow-filter-rule"
                value={filter.ruleText ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, ruleText: e.target.value || undefined }))}
                placeholder={t('traffic.filters.rulePlaceholder')}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground" htmlFor="flow-filter-outbound">
                {t('traffic.filters.outbound')}
              </label>
              <Input
                id="flow-filter-outbound"
                value={filter.outboundName ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, outboundName: e.target.value || undefined }))}
                placeholder={t('traffic.filters.outboundPlaceholder')}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground" htmlFor="flow-filter-process">
                {t('traffic.filters.process')}
              </label>
              <Input
                id="flow-filter-process"
                value={filter.process ?? ''}
                onChange={(e) => setFilter((f) => ({ ...f, process: e.target.value || undefined }))}
                placeholder={t('traffic.filters.processPlaceholder')}
              />
            </div>
            {Object.values(filter).some((v) => !!v) && (
              <Button variant="ghost" size="sm" onClick={() => setFilter({})}>
                {t('actions.reset')}
              </Button>
            )}
          </CardContent>
        </Card>

        {backendUnavailable ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTree />
              </EmptyMedia>
              <EmptyTitle>{t('traffic.unavailableTitle')}</EmptyTitle>
              <EmptyDescription>{t('traffic.unavailableDescription')}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <code className="text-xs text-muted-foreground break-all">
                {flowsQuery.error instanceof Error ? flowsQuery.error.message : String(flowsQuery.error)}
              </code>
            </EmptyContent>
          </Empty>
        ) : flows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTree />
              </EmptyMedia>
              <EmptyTitle>{t('traffic.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('traffic.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-xl border bg-card">
            <div className="max-h-[640px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t('traffic.columns.time')}</TableHead>
                    <TableHead>{t('traffic.columns.protocol')}</TableHead>
                    <TableHead>{t('traffic.columns.source')}</TableHead>
                    <TableHead>{t('traffic.columns.destination')}</TableHead>
                    <TableHead>{t('traffic.columns.process')}</TableHead>
                    <TableHead>{t('traffic.columns.rule')}</TableHead>
                    <TableHead>{t('traffic.columns.outbound')}</TableHead>
                    <TableHead className="text-right">{t('traffic.columns.traffic')}</TableHead>
                    <TableHead>{t('traffic.columns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flows.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {dayjs(flow.startedAt).format('HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {flow.l4proto}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        <span className="font-mono">{flow.srcIp}</span>
                        <span className="text-muted-foreground">:{flow.srcPort}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          {flow.dstDomain && <span className="font-medium">{flow.dstDomain}</span>}
                          <span className="font-mono text-muted-foreground">
                            {flow.dstIp}:{flow.dstPort}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{flow.processName ?? '-'}</TableCell>
                      <TableCell className="text-xs">
                        {flow.matchedRuleText ? (
                          <span title={flow.matchedRuleText} className="line-clamp-2 max-w-[260px] break-all">
                            {typeof flow.matchedRuleIndex === 'number' && (
                              <span className="mr-1 font-mono text-muted-foreground">
                                #{flow.matchedRuleIndex}
                              </span>
                            )}
                            {flow.matchedRuleText}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">{flow.outboundName}</span>
                          {(flow.groupName || flow.nodeName) && (
                            <span className="text-muted-foreground">
                              {[flow.groupName, flow.nodeName].filter(Boolean).join(' → ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs">
                        <div>↑ {formatBytes(safeBytes(flow.uploadBytes))}</div>
                        <div>↓ {formatBytes(safeBytes(flow.downloadBytes))}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={flow.endedAt ? 'secondary' : 'default'}>
                          {flow.endedAt ? t('traffic.status.closed') : t('traffic.status.active')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              {t('traffic.recordsCount', { shown: flows.length, total: allFlows.length })}
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
