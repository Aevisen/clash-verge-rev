import {
  CheckRounded,
  GppMaybeOutlined,
  RemoveRounded,
  WarningAmberRounded,
} from '@mui/icons-material'
import { Box, Chip, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useDnsLeak } from '@/hooks/use-dns-leak'
import { useIpAssessment } from '@/hooks/use-ip-assessment'
import { useWebrtcLeak } from '@/hooks/use-webrtc-leak'
import { RISK_CHECK_GROUPS, type IpAssessment } from '@/services/ip-assessment'
import { getDnsLeakStatus, getWebrtcLeakState } from '@/utils/ip-leak-state'

import { IpPanelTitle } from './ip-assessment-panel'

const EMPTY = '—'

const Metric = ({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: ReactNode
  note?: string
  tone?: 'warning.main' | 'success.main'
}) => (
  <Box
    sx={{
      p: 1.25,
      borderRadius: 1.5,
      bgcolor: 'action.hover',
      minWidth: 0,
    }}
  >
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.4,
        fontVariantNumeric: 'tabular-nums',
        color: tone,
      }}
      noWrap
    >
      {value}
    </Typography>
    {note && (
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        component="div"
        title={note}
      >
        {note}
      </Typography>
    )}
  </Box>
)

const CheckChip = ({
  label,
  value,
}: {
  label: string
  value: boolean | null
}) => (
  <Chip
    size="small"
    variant="outlined"
    color={value === true ? 'warning' : value === false ? 'success' : 'default'}
    icon={
      value === true ? (
        <WarningAmberRounded />
      ) : value === false ? (
        <CheckRounded />
      ) : (
        <RemoveRounded />
      )
    }
    label={label}
    sx={value === null ? { borderStyle: 'dashed', opacity: 0.6 } : undefined}
  />
)

const useWebrtcState = (egressIps: string[]) => {
  const { data, isLoading, error } = useWebrtcLeak()
  if (isLoading) return { state: 'checking' as const, leaked: [] }
  if (error || data === undefined)
    return { state: 'unknown' as const, leaked: [] }
  if (data === null) return { state: 'unsupported' as const, leaked: [] }
  return getWebrtcLeakState(data, egressIps)
}

// Resolvers outside the exit country point to lookups bypassing the proxy; anycast can blur this.
const useDnsState = () => {
  const { data, isLoading, error } = useDnsLeak()
  if (isLoading)
    return { state: 'checking' as const, countries: [], servers: 0 }
  if (error) return { state: 'failed' as const, countries: [], servers: 0 }
  if (!data) return { state: 'unknown' as const, countries: [], servers: 0 }
  const countries = [
    ...new Set(data.servers.map((server) => server.country).filter(Boolean)),
  ]
  return {
    state: getDnsLeakStatus(
      data.exitCountry,
      data.servers.map((server) => server.country),
    ),
    countries,
    servers: data.servers.length,
  }
}

export const IpRiskPanel = ({ egressIp }: { egressIp?: string }) => {
  const { t } = useTranslation()
  const { data } = useIpAssessment()
  const webrtc = useWebrtcState(
    [egressIp, data?.ip].filter((ip): ip is string => !!ip),
  )
  const dns = useDnsState()
  const metrics: Partial<IpAssessment['metrics']> = data?.metrics ?? {}
  const checks: Partial<IpAssessment['checks']> = data?.checks ?? {}
  const values = Object.values(checks)
  const fmt = (value: number | null | undefined, key?: string) =>
    value == null ? EMPTY : key ? t(key, { count: value }) : value

  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <IpPanelTitle
          icon={<GppMaybeOutlined fontSize="small" />}
          color="primary"
          title={t('home.network.risk.title')}
        />
        <Typography variant="caption" color="text.secondary">
          {t('home.network.risk.summary', {
            hit: values.filter((value) => value === true).length,
            clear: values.filter((value) => value === false).length,
            unknown: values.filter((value) => value == null).length,
          })}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
          gap: 1,
        }}
      >
        <Metric
          label={t('home.network.risk.metrics.proxyRisk')}
          value={
            metrics.proxyRisk == null ? EMPTY : `${metrics.proxyRisk} / 100`
          }
        />
        <Metric
          label={t('home.network.risk.metrics.sharedDevices')}
          value={fmt(metrics.sharedDevices, 'home.network.risk.units.devices')}
        />
        <Metric
          label={t('home.network.risk.metrics.networkAbuse')}
          value={
            metrics.networkAbuse == null
              ? EMPTY
              : `${(metrics.networkAbuse * 100).toFixed(2)}%`
          }
        />
        <Metric
          label="DNSBL"
          value={fmt(metrics.dnsbl, 'home.network.risk.units.entries')}
        />
        <Metric
          label={t('home.network.risk.metrics.publicLists')}
          value={fmt(metrics.publicLists, 'home.network.risk.units.lists')}
        />
        <Metric
          label={
            metrics.reportDays
              ? t('home.network.risk.metrics.reportsDays', {
                  days: metrics.reportDays,
                })
              : t('home.network.risk.metrics.reports')
          }
          value={fmt(metrics.reports, 'home.network.risk.units.entries')}
        />
        <Metric
          label={t('home.network.risk.metrics.webrtc')}
          value={t(`home.network.risk.webrtc.${webrtc.state}`)}
          tone={
            webrtc.state === 'leak'
              ? 'warning.main'
              : webrtc.state === 'safe' || webrtc.state === 'blocked'
                ? 'success.main'
                : undefined
          }
          note={webrtc.leaked.join(', ') || undefined}
        />
        <Metric
          label={t('home.network.risk.metrics.dns')}
          value={t(`home.network.risk.dns.${dns.state}`)}
          tone={
            dns.state === 'mismatch'
              ? 'warning.main'
              : dns.state === 'safe'
                ? 'success.main'
                : undefined
          }
          note={
            dns.servers
              ? `${dns.countries.join(', ')} · ${t('home.network.risk.dns.servers', { count: dns.servers })}`
              : undefined
          }
        />
      </Box>

      {(
        Object.keys(RISK_CHECK_GROUPS) as (keyof typeof RISK_CHECK_GROUPS)[]
      ).map((group) => {
        const ids = RISK_CHECK_GROUPS[group]
        const known = ids.filter((id) => checks[id] != null)
        const hits = ids.filter((id) => checks[id] === true)
        return (
          <Stack
            key={group}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'flex-start' }}
          >
            <Box sx={{ width: 64, flexShrink: 0, pt: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t(`home.network.risk.groups.${group}`)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {known.length ? `${hits.length} / ${known.length}` : EMPTY}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {ids.map((id) => (
                <CheckChip
                  key={id}
                  label={t(`home.network.risk.checks.${id}`)}
                  value={checks[id] ?? null}
                />
              ))}
            </Box>
          </Stack>
        )
      })}

      <Typography variant="caption" color="text.secondary">
        {t('home.network.risk.legend')}
      </Typography>
    </Stack>
  )
}
