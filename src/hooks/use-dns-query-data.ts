import { MihomoWebSocket } from 'tauri-plugin-mihomo-api'

import {
  appendDnsQueries,
  parseDnsQueryLog,
  type DnsObservation,
  type DnsQueryState,
} from '@/utils/dns-query'

import { useMihomoWsSubscription } from './use-mihomo-ws-subscription'

const EMPTY_DNS_QUERIES: DnsQueryState = { total: 0, records: [] }

export const useDnsQueryData = (enabled: boolean) => {
  const { response, setData } = useMihomoWsSubscription<DnsQueryState>({
    storageKey: 'mihomo_dns_queries_date',
    buildSubscriptKey: (date) => (enabled ? `getDnsQueries-${date}` : null),
    fallbackData: EMPTY_DNS_QUERIES,
    // The debug subscription does not change the core's configured log level.
    connect: () => MihomoWebSocket.connect_logs('DEBUG'),
    setupHandlers: ({ next, scheduleReconnect }) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      let received = 0
      const buffer: DnsObservation[] = []

      const flush = () => {
        timer = null
        if (!received) return
        const incoming = buffer.splice(0)
        const count = received
        received = 0
        next(null, (current) =>
          appendDnsQueries(current ?? EMPTY_DNS_QUERIES, incoming, count),
        )
      }

      return {
        handleMessage: (message) => {
          if (message.startsWith('Websocket error')) {
            void scheduleReconnect()
            return
          }
          const observation = parseDnsQueryLog(message)
          if (!observation) return
          buffer.push(observation)
          received++
          if (buffer.length > 200) buffer.shift()
          if (!timer) timer = setTimeout(flush, 100)
        },
        cleanup: () => {
          if (timer) clearTimeout(timer)
          flush()
        },
      }
    },
  })

  const clear = () => setData(EMPTY_DNS_QUERIES)

  return { data: response.data ?? EMPTY_DNS_QUERIES, clear }
}
