import {
  ContentCopyRounded,
  DevicesOutlined,
  RefreshOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useClash } from '@/hooks/use-clash'
import { useNetworkInterfaces } from '@/hooks/use-network'
import { showNotice } from '@/services/notice-service'
import { getLanAddresses } from '@/utils/lan-addresses'

import { EnhancedCard } from './enhanced-card'

export const LanIpCard = () => {
  const { t } = useTranslation()
  const { networkInterfaces, loading, error, mutate } = useNetworkInterfaces()
  const { clash, patchClash } = useClash()
  const [saving, setSaving] = useState(false)
  const addresses = getLanAddresses(networkInterfaces)

  return (
    <EnhancedCard
      title={t('home.network.lan')}
      icon={<DevicesOutlined />}
      minHeight={230}
      action={
        <Tooltip title={t('shared.actions.refresh')}>
          <IconButton
            size="small"
            aria-label={t('shared.actions.refresh')}
            disabled={loading}
            onClick={() => void mutate()}
          >
            <RefreshOutlined />
          </IconButton>
        </Tooltip>
      }
    >
      <Stack spacing={1.5} sx={{ height: '100%' }}>
        <Typography variant="caption" color="text.secondary">
          {t('home.network.localIpv4')}
        </Typography>
        <Box sx={{ maxHeight: 130, overflow: 'auto', flex: 1 }}>
          {loading && !addresses.length ? (
            <Skeleton height={50} />
          ) : error ? (
            <Alert severity="warning">{t('home.network.lanFailed')}</Alert>
          ) : !addresses.length ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('home.network.noLan')}
            </Typography>
          ) : (
            addresses.map(({ name, ip }) => (
              <Stack
                key={`${name}-${ip}`}
                direction="row"
                spacing={1}
                sx={{
                  mb: 1,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 26,
                      fontWeight: 700,
                      wordBreak: 'break-all',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {ip}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {name}
                  </Typography>
                </Box>
                <Tooltip title={t('home.network.copy')}>
                  <IconButton
                    size="small"
                    aria-label={`${t('home.network.copy')} ${ip}`}
                    onClick={() => {
                      void writeText(ip)
                        .then(() =>
                          showNotice.success(
                            'shared.feedback.notifications.common.copySuccess',
                          ),
                        )
                        .catch(showNotice.error)
                    }}
                  >
                    <ContentCopyRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))
          )}
        </Box>
        <Stack
          direction="row"
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('home.network.allowLan')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(
                clash?.['allow-lan']
                  ? 'home.network.enabled'
                  : 'home.network.disabled',
              )}
            </Typography>
          </Box>
          <Switch
            checked={!!clash?.['allow-lan']}
            disabled={!clash || saving}
            slotProps={{ input: { 'aria-label': t('home.network.allowLan') } }}
            onChange={async (_, checked) => {
              setSaving(true)
              try {
                await patchClash({ 'allow-lan': checked })
              } catch (err) {
                showNotice.error(err)
              } finally {
                setSaving(false)
              }
            }}
          />
        </Stack>
      </Stack>
    </EnhancedCard>
  )
}
