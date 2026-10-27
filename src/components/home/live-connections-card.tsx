import { ArrowForwardRounded, LinkOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useConnectionData } from '@/hooks/use-connection-data'
import { useSystemState } from '@/hooks/use-system-state'
import { useVisibility } from '@/hooks/use-visibility'
import parseTraffic from '@/utils/parse-traffic'

import { EnhancedCard } from './enhanced-card'

export const LiveConnectionsCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const visible = useVisibility()
  const { runningMode } = useSystemState()
  const running = runningMode !== 'NotRunning'
  const {
    response: { data },
  } = useConnectionData({ enabled: visible && running })
  const connections = running ? data.activeConnections : []

  return (
    <EnhancedCard
      title={t('home.network.connections')}
      icon={<LinkOutlined />}
      minHeight={230}
      action={
        <Button
          size="small"
          endIcon={<ArrowForwardRounded />}
          onClick={() => navigate('/connections')}
        >
          {t('home.network.viewAll')}
        </Button>
      }
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: 'baseline' }}
      >
        <Typography
          sx={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {connections.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('home.network.active')}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={t(running ? 'home.network.live' : 'home.network.stopped')}
          color={running ? 'success' : 'default'}
        />
      </Stack>
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
    </EnhancedCard>
  )
}
