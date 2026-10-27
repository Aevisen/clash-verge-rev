import { ArrowForwardRounded, LinkOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useConnectionData } from '@/hooks/use-connection-data'
import { useDnsQueryData } from '@/hooks/use-dns-query-data'
import { useSystemState } from '@/hooks/use-system-state'
import { useVisibility } from '@/hooks/use-visibility'
import parseTraffic from '@/utils/parse-traffic'

import { DnsQueriesTable } from './dns-queries-table'
import { EnhancedCard } from './enhanced-card'

export const LiveConnectionsCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'connections' | 'dns'>('connections')
  const visible = useVisibility()
  const { runningMode } = useSystemState()
  const running = runningMode !== 'NotRunning'
  const {
    response: { data },
  } = useConnectionData({ enabled: visible && running })
  const connections = running ? data.activeConnections : []
  const { data: dnsData, clear: clearDnsQueries } = useDnsQueryData(
    visible && running && tab === 'dns',
  )
  const dnsQueries = running ? dnsData : { total: 0, records: [] }

  return (
    <EnhancedCard
      title={t('home.network.activity')}
      icon={<LinkOutlined />}
      minHeight={230}
      action={
        tab === 'connections' ? (
          <Button
            size="small"
            endIcon={<ArrowForwardRounded />}
            onClick={() => navigate('/connections')}
          >
            {t('home.network.viewAll')}
          </Button>
        ) : (
          <Button
            size="small"
            onClick={clearDnsQueries}
            disabled={!dnsQueries.total}
          >
            {t('shared.actions.clear')}
          </Button>
        )
      }
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          aria-label={t('home.network.activity')}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 38,
            maxWidth: '100%',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              minHeight: 38,
              minWidth: 0,
              px: 1.5,
              mr: 0.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              textTransform: 'none',
            },
            '& .MuiTab-root.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            },
          }}
        >
          <Tab
            value="connections"
            id="network-tab-connections"
            aria-controls="network-panel-connections"
            label={t('home.network.activeCount', {
              count: connections.length,
            })}
          />
          <Tab
            value="dns"
            id="network-tab-dns"
            aria-controls="network-panel-dns"
            label={t('home.network.dns.count', { count: dnsQueries.total })}
          />
        </Tabs>
        <Chip
          size="small"
          variant="outlined"
          label={t(running ? 'home.network.live' : 'home.network.stopped')}
          color={running ? 'success' : 'default'}
        />
      </Stack>
      <Box
        role="tabpanel"
        id={`network-panel-${tab}`}
        aria-labelledby={`network-tab-${tab}`}
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}
      >
        {tab === 'dns' ? (
          <DnsQueriesTable data={dnsQueries} />
        ) : (
          <TableContainer sx={{ flex: 1 }}>
            <Table
              size="small"
              aria-label={t('home.network.connections')}
              sx={{
                tableLayout: 'fixed',
                minWidth: 430,
                '& th': {
                  color: 'text.secondary',
                  bgcolor: 'action.hover',
                  whiteSpace: 'nowrap',
                },
                '& td, & th': { px: 1, py: 0.8, borderColor: 'divider' },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '20%' }}>
                    {t('home.network.process')}
                  </TableCell>
                  <TableCell sx={{ width: '34%' }}>
                    {t('home.network.destination')}
                  </TableCell>
                  <TableCell sx={{ width: '22%' }}>
                    {t('home.network.outbound')}
                  </TableCell>
                  <TableCell align="right">
                    {t('home.components.traffic.legends.download')}
                  </TableCell>
                  <TableCell align="right">
                    {t('home.components.traffic.legends.upload')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connections.slice(0, 4).map((connection) => {
                  const target =
                    connection.metadata.host ||
                    connection.metadata.destinationIP ||
                    '—'
                  const outbound = connection.chains.join(' → ') || '—'
                  return (
                    <TableRow key={connection.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          title={connection.metadata.process}
                        >
                          {connection.metadata.process || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          title={`${target}:${connection.metadata.destinationPort}`}
                        >
                          {target}:{connection.metadata.destinationPort}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap title={outbound}>
                          {outbound}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {parseTraffic(connection.download).join(' ')}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {parseTraffic(connection.upload).join(' ')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {!connections.length && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('home.network.noConnections')}
                </Typography>
              </Box>
            )}
          </TableContainer>
        )}
      </Box>
    </EnhancedCard>
  )
}
