import {
  CheckCircleOutlineRounded,
  LanguageOutlined,
  RefreshOutlined,
  ShieldOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useIpAssessment } from '@/hooks/use-ip-assessment'

import { EnhancedCard } from './enhanced-card'

export const IpAssessmentCard = ({ purity = false }: { purity?: boolean }) => {
  const { t } = useTranslation()
  const { data, error, isLoading, isFetching, refetch } = useIpAssessment()
  const [showIp, setShowIp] = useState(false)
  const flags = data ? Object.values(data.flags) : []
  const flagged = flags.some((value) => value === true)
  const complete = flags.length > 0 && flags.every((value) => value !== null)
  const status = flagged ? 'flagged' : complete ? 'unflagged' : 'unknown'
  const title = t(purity ? 'home.network.purity' : 'home.network.quality')

  return (
    <EnhancedCard
      title={title}
      icon={purity ? <ShieldOutlined /> : <LanguageOutlined />}
      iconColor={purity ? 'success' : 'primary'}
      minHeight={230}
      action={
        <Tooltip title={t('shared.actions.refresh')}>
          <IconButton
            aria-label={t('shared.actions.refresh')}
            size="small"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshOutlined />
          </IconButton>
        </Tooltip>
      }
    >
      {isLoading && !data ? (
        <Stack spacing={1} aria-label={t('home.network.loading')}>
          <Skeleton height={56} width="75%" />
          <Skeleton height={30} />
          <Skeleton height={30} width="60%" />
        </Stack>
      ) : error || !data ? (
        <Alert severity="warning">{t('home.network.failed')}</Alert>
      ) : (
        <Stack spacing={1.5} sx={{ height: '100%' }}>
          {data.fallback && (
            <Alert severity="info" sx={{ py: 0 }}>
              {t('home.network.fallback')}
            </Alert>
          )}
          {purity ? (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    data.riskScore === null
                      ? 'home.network.detection'
                      : 'home.network.riskScore',
                  )}
                </Typography>
                {data.riskScore !== null ? (
                  <>
                    <Typography
                      component="div"
                      sx={{
                        fontSize: 38,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {data.riskScore}
                      <Typography
                        component="span"
                        color="text.secondary"
                        sx={{ ml: 0.5 }}
                      >
                        / 100
                      </Typography>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={data.riskScore}
                      aria-label={t('home.network.riskScore')}
                      sx={{ height: 6, borderRadius: 3, mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('home.network.lowerBetter')}
                    </Typography>
                  </>
                ) : (
                  <Typography
                    sx={{ fontSize: 24, fontWeight: 650, my: 1 }}
                    color={
                      flagged
                        ? 'warning.main'
                        : complete
                          ? 'success.main'
                          : 'text.secondary'
                    }
                  >
                    {t(`home.network.${status}`)}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {(['proxy', 'vpn', 'tor', 'datacenter', 'abuser'] as const).map(
                  (name) => {
                    const value = data.flags[name]
                    return (
                      <Chip
                        key={name}
                        size="small"
                        variant="outlined"
                        color={
                          value === true
                            ? 'warning'
                            : value === false
                              ? 'success'
                              : 'default'
                        }
                        label={`${t(`home.network.flags.${name}`)} · ${t(value === null ? 'home.network.unknown' : value ? 'home.network.yes' : 'home.network.no')}`}
                      />
                    )
                  },
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t('home.network.referenceOnly')}
              </Typography>
            </>
          ) : (
            <>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 1.5,
                    fontWeight: 700,
                    color: 'primary.main',
                  }}
                >
                  {data.countryCode || 'IP'}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('home.network.egress')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 24, lg: 30 },
                      fontWeight: 700,
                      wordBreak: 'break-all',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {showIp ? data.ip : '•••.•••.•••.•••'}
                  </Typography>
                </Box>
                <Tooltip
                  title={t(
                    showIp ? 'home.network.hideIp' : 'home.network.showIp',
                  )}
                >
                  <IconButton
                    size="small"
                    aria-label={t(
                      showIp ? 'home.network.hideIp' : 'home.network.showIp',
                    )}
                    onClick={() => setShowIp(!showIp)}
                  >
                    {showIp ? (
                      <VisibilityOffOutlined />
                    ) : (
                      <VisibilityOutlined />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={t(`home.network.types.${data.networkType}`)}
                />
                <Chip
                  size="small"
                  icon={
                    data.riskScore === null && status === 'unflagged' ? (
                      <CheckCircleOutlineRounded />
                    ) : undefined
                  }
                  color={flagged ? 'warning' : 'default'}
                  label={
                    data.riskScore === null
                      ? t(`home.network.${status}`)
                      : t('home.network.score', { score: data.riskScore })
                  }
                />
                {data.broadcast !== null && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t(
                      data.broadcast
                        ? 'home.network.broadcast'
                        : 'home.network.native',
                    )}
                  />
                )}
              </Stack>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, wordBreak: 'break-word' }}
                >
                  {data.organization || t('home.network.unknown')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {[data.asn, data.location].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            </>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 'auto !important', pt: 1 }}
          >
            {data.provider} ·{' '}
            {t('home.network.checkedAt', {
              time: new Date(data.checkedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </Typography>
        </Stack>
      )}
    </EnhancedCard>
  )
}
