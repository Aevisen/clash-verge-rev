import { expect, test } from 'vitest'

import { appendDnsQueries, parseDnsQueryLog } from './dns-query'

const event = (payload: string) => JSON.stringify({ type: 'debug', payload })

test('reads upstream replies, cache hits and failures from Mihomo DNS logs', () => {
  expect(
    parseDnsQueryLog(
      event('[DNS] example.com --> [203.0.113.8] A from udp://1.1.1.1:53'),
      100,
    ),
  ).toEqual({
    time: 100,
    domain: 'example.com',
    queryType: 'A',
    answer: '[203.0.113.8]',
    upstream: 'udp://1.1.1.1:53',
    status: 'response',
  })
  expect(
    parseDnsQueryLog(
      event(
        '[DNS] cache hit example.com --> [2001:db8::8] AAAA, expire at 2026-10-27 19:00:00',
      ),
      101,
    ),
  ).toMatchObject({
    queryType: 'AAAA',
    answer: '[2001:db8::8]',
    status: 'cache',
    upstream: '',
  })
  expect(
    parseDnsQueryLog(
      event(
        '[DNS Server] Exchange ;example.com.\tIN\tA failed: all DNS requests failed',
      ),
      102,
    ),
  ).toMatchObject({
    domain: 'example.com',
    queryType: 'A',
    status: 'error',
    answer: 'all DNS requests failed',
  })
})

test('ignores non-result DNS events and malformed log messages', () => {
  for (const value of [
    event('[DNS] resolve example.com A from udp://1.1.1.1:53'),
    event('[TCP] example.com:443'),
    'invalid json',
    '{}',
    'null',
    JSON.stringify({ payload: 1 }),
  ]) {
    expect(parseDnsQueryLog(value)).toBeNull()
  }
})

test('keeps empty answers without inventing an address or DNS success code', () => {
  expect(
    parseDnsQueryLog(
      event(
        '[DNS] example.com --> [] HTTPS from https://dns.example/dns-query',
      ),
      1,
    ),
  ).toMatchObject({
    queryType: 'HTTPS',
    answer: '[]',
    status: 'response',
  })
})

test('retains the newest 200 observations while counting truncated batches', () => {
  const item = parseDnsQueryLog(
    event('[DNS] example.com --> [203.0.113.8] A from udp://1.1.1.1:53'),
    1,
  )!
  const initial = { total: 0, records: [] }
  const first = appendDnsQueries(
    initial,
    Array.from({ length: 200 }, () => item),
    250,
  )
  expect(first.total).toBe(250)
  expect(first.records).toHaveLength(200)
  expect(first.records[0].id).toBe(250)
  expect(first.records[199].id).toBe(51)
  const next = appendDnsQueries(
    first,
    [{ ...item, domain: 'latest.example' }],
    1,
  )
  expect(next.total).toBe(251)
  expect(next.records[0]).toMatchObject({ id: 251, domain: 'latest.example' })
  expect(next.records[199].id).toBe(52)
  expect(initial).toEqual({ total: 0, records: [] })
})
