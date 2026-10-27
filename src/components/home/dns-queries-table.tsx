import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import type { DnsQueryState } from '@/utils/dns-query'

export const DnsQueriesTable = ({ data }: { data: DnsQueryState }) => {
  const { t } = useTranslation()

  return (
    <>
      <TableContainer sx={{ flex: 1, maxHeight: 240 }}>
        <Table
          stickyHeader
          size="small"
          aria-label={t('home.network.dns.title')}
          sx={{
            tableLayout: 'fixed',
            minWidth: 500,
            '& th': {
              color: 'text.secondary',
              bgcolor: 'background.paper',
              whiteSpace: 'nowrap',
            },
            '& td, & th': { px: 1, py: 0.8, borderColor: 'divider' },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '16%' }}>
                {t('home.network.dns.time')}
              </TableCell>
              <TableCell sx={{ width: '26%' }}>
                {t('home.network.dns.domain')}
              </TableCell>
              <TableCell sx={{ width: '12%' }}>
                {t('home.network.dns.type')}
              </TableCell>
              <TableCell sx={{ width: '30%' }}>
                {t('home.network.dns.answer')}
              </TableCell>
              <TableCell>{t('home.network.dns.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.records.map((record) => (
              <TableRow key={record.id} hover>
                <TableCell
                  sx={{
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {dayjs(record.time).format('HH:mm:ss')}
                </TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>
                  {record.domain}
                </TableCell>
                <TableCell>{record.queryType}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>
                  <Typography variant="body2">{record.answer}</Typography>
                  {record.upstream && (
                    <Typography variant="caption" color="text.secondary">
                      {record.upstream}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={
                      record.status === 'error'
                        ? 'error'
                        : record.status === 'cache'
                          ? 'info'
                          : 'default'
                    }
                    label={t(`home.network.dns.statuses.${record.status}`)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.records.length && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('home.network.dns.empty')}
            </Typography>
          </Box>
        )}
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        {t('home.network.dns.description')}
      </Typography>
    </>
  )
}
