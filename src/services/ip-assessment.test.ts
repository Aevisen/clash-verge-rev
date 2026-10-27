import { fetch } from '@tauri-apps/plugin-http'
import { beforeEach, expect, test, vi } from 'vitest'

import {
  getIpAssessment,
  isHttpsAssessmentUrl,
  type IpAssessmentProvider,
} from './ip-assessment'

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }))
vi.mock('./api', () => ({
  getIpInfo: vi.fn(async () => ({ ip: '203.0.113.10' })),
}))

const ipapi = (key: string): IpAssessmentProvider[] => [
  { type: 'ipapi', url: 'https://api.ipapi.is/', key },
]

const request = vi.mocked(fetch)
const publicResult = {
  ip: '203.0.113.8',
  asn: 64500,
  asOrganization: 'Example ISP',
  country: 'United States',
  countryCode: 'US',
  city: 'Seattle',
  fraudScore: 0,
  isResidential: true,
  isBroadcast: false,
}

beforeEach(() => request.mockReset())

test('uses public detection without a key and keeps missing flags unknown', async () => {
  request.mockResolvedValueOnce(Response.json(publicResult))
  const result = await getIpAssessment([])
  expect(result).toMatchObject({
    provider: 'IPPure',
    ip: '203.0.113.8',
    riskScore: 0,
    networkType: 'residential',
    broadcast: false,
    flags: {
      proxy: null,
      vpn: null,
      tor: null,
      datacenter: false,
      abuser: null,
    },
  })
  expect(request.mock.calls[0][0]).toBe('https://my.ippure.com/v1/info')
})

test('uses the key only in a POST body and preserves keyed flags without inventing a score', async () => {
  request.mockResolvedValueOnce(
    Response.json({
      ip: '203.0.113.9',
      company: { name: 'Example Host', type: 'hosting' },
      asn: { asn: 64501, org: 'Example Host' },
      location: { country_code: 'US' },
      is_proxy: false,
      is_vpn: true,
      is_tor: false,
      is_datacenter: true,
      is_abuser: false,
    }),
  )
  const result = await getIpAssessment(ipapi('secret-key'))
  expect(result).toMatchObject({
    provider: 'ipapi.is',
    riskScore: null,
    flags: { vpn: true, proxy: false },
  })
  expect(request.mock.calls[0][0]).toBe('https://api.ipapi.is/')
  expect(request.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    body: '{"key":"secret-key"}',
    maxRedirections: 0,
  })
})

test.each([
  Response.json({ error: 'Invalid key' }),
  new Response('', { status: 429 }),
])(
  'falls back to public detection after a keyed rejection',
  async (response) => {
    request
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(Response.json(publicResult))
    expect(await getIpAssessment(ipapi('bad-key'))).toMatchObject({
      provider: 'IPPure',
      fallback: true,
    })
    expect(request).toHaveBeenCalledTimes(2)
  },
)

test('rejects malformed addresses and never treats an invalid risk score as clean', async () => {
  request.mockResolvedValueOnce(
    Response.json({ ...publicResult, fraudScore: -1 }),
  )
  expect((await getIpAssessment([])).riskScore).toBeNull()
  request.mockResolvedValueOnce(
    Response.json({ ip: 'not-an-ip', fraudScore: 0 }),
  )
  await expect(getIpAssessment([])).rejects.toThrow('IP assessment unavailable')
})

test('recognizes documented non-boolean VPN detections', async () => {
  request.mockResolvedValueOnce(
    Response.json({ ip: '203.0.113.9', is_vpn: 'NordVPN' }),
  )
  expect((await getIpAssessment(ipapi('key'))).flags.vpn).toBe(true)
})

test('works on WebViews without AbortSignal.timeout', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout')!
  Reflect.deleteProperty(AbortSignal, 'timeout')
  try {
    request.mockResolvedValueOnce(Response.json(publicResult))
    expect((await getIpAssessment([])).riskScore).toBe(0)
  } finally {
    Object.defineProperty(AbortSignal, 'timeout', descriptor)
  }
})

test('maps cleanip.io risk records, sends the key only as a header and leaves unreported items empty', async () => {
  request.mockResolvedValueOnce(
    Response.json({
      ok: true,
      ip: '203.0.113.10',
      geo: { country_code: 'US', country_en: 'United States' },
      network: { asn: 64502, isp: 'Example ISP' },
      purity: { ip_type: 'Residential' },
      risk: {
        is_proxy: false,
        is_vpn: true,
        dnsbl_count: 2,
        abuse_reports: 0,
        abuse_report_window_days: 90,
        proxycheck_risk: 8,
        proxycheck_device_address_count: 3,
        network_abuser: { score: 0.002 },
        risk_score: 12,
      },
    }),
  )
  const result = await getIpAssessment([
    { type: 'cleanip', url: 'https://api.cleanip.io/', key: 'cip_test' },
  ])
  expect(result).toMatchObject({
    provider: 'cleanip.io',
    networkType: 'residential',
    riskScore: 12,
    checks: { proxy: false, vpn: true, dnsbl: true, reports: false, tor: null },
    metrics: {
      proxyRisk: 8,
      sharedDevices: 3,
      networkAbuse: 0.002,
      dnsbl: 2,
      reports: 0,
      reportDays: 90,
      publicLists: null,
    },
  })
  expect(request.mock.calls[0][0]).toBe(
    'https://api.cleanip.io/api/v2/203.0.113.10',
  )
  expect(request.mock.calls[0][1]).toMatchObject({
    method: 'GET',
    headers: { 'X-API-Key': 'cip_test' },
    maxRedirections: 0,
  })
})

test.each(['ipapi', 'cleanip'] as const)(
  'never sends a %s key to an HTTP provider',
  async (type) => {
    request.mockResolvedValueOnce(Response.json(publicResult))
    const result = await getIpAssessment([
      { type, url: 'http://example.invalid', key: 'secret-key' },
    ])
    expect(result).toMatchObject({ provider: 'IPPure', fallback: true })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toBe('https://my.ippure.com/v1/info')
  },
)

test('accepts HTTPS or the default address and rejects unsafe or malformed addresses', () => {
  expect(isHttpsAssessmentUrl('')).toBe(true)
  expect(isHttpsAssessmentUrl(' https://api.example.com/custom ')).toBe(true)
  for (const url of [
    'http://example.com',
    'not a URL',
    '//example.com',
    'file:///tmp/key',
  ]) {
    expect(isHttpsAssessmentUrl(url)).toBe(false)
  }
})

test('tries the next provider when the first one is rejected', async () => {
  request
    .mockResolvedValueOnce(Response.json({ ok: false, error: 'quota' }))
    .mockResolvedValueOnce(
      Response.json({ ip: '203.0.113.9', is_vpn: false, is_crawler: true }),
    )
  const result = await getIpAssessment([
    { type: 'cleanip', url: '', key: 'cip_test' },
    ...ipapi('key'),
  ])
  expect(result).toMatchObject({
    provider: 'ipapi.is',
    fallback: false,
    checks: { crawler: true, dnsbl: null },
  })
})
