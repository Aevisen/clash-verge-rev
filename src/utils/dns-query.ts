export interface DnsObservation {
  time: number
  domain: string
  queryType: string
  answer: string
  upstream: string
  status: 'response' | 'cache' | 'error'
}

export interface DnsQueryState {
  total: number
  records: (DnsObservation & { id: number })[]
}

export const parseDnsQueryLog = (
  message: string,
  time = Date.now(),
): DnsObservation | null => {
  let payload: unknown
  try {
    const log: unknown = JSON.parse(message)
    if (typeof log !== 'object' || log === null || !('payload' in log))
      return null
    payload = log.payload
  } catch {
    return null
  }
  if (typeof payload !== 'string') return null

  const response = /^\[DNS\] (\S+) --> (.*?) ([A-Z][A-Z0-9]*) from (.+)$/.exec(
    payload,
  )
  if (response)
    return {
      time,
      domain: response[1].replace(/\.$/, ''),
      answer: response[2],
      queryType: response[3],
      upstream: response[4],
      status: 'response',
    }

  const cached =
    /^\[DNS\] cache hit (\S+) --> (.*?) ([A-Z][A-Z0-9]*), expire at .+$/.exec(
      payload,
    )
  if (cached)
    return {
      time,
      domain: cached[1].replace(/\.$/, ''),
      answer: cached[2],
      queryType: cached[3],
      upstream: '',
      status: 'cache',
    }

  const failed =
    /^\[DNS Server\] Exchange ;?(\S+)\s+IN\s+([A-Z][A-Z0-9]*) failed: (.+)$/.exec(
      payload,
    )
  if (failed)
    return {
      time,
      domain: failed[1].replace(/\.$/, ''),
      answer: failed[3],
      queryType: failed[2],
      upstream: '',
      status: 'error',
    }
  return null
}

export const appendDnsQueries = (
  current: DnsQueryState,
  incoming: DnsObservation[],
  received: number,
): DnsQueryState => ({
  total: current.total + received,
  records: [
    ...incoming
      .map((record, index) => ({
        ...record,
        id: current.total + received - incoming.length + index + 1,
      }))
      .reverse(),
    ...current.records,
  ].slice(0, 200),
})
