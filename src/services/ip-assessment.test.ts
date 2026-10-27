import { fetch } from '@tauri-apps/plugin-http'
import { beforeEach, expect, test, vi } from 'vitest'

import { getIpAssessment } from './ip-assessment'

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }))

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
  const result = await getIpAssessment('')
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
  const result = await getIpAssessment('secret-key')
  expect(result).toMatchObject({
    provider: 'ipapi.is',
    riskScore: null,
    flags: { vpn: true, proxy: false },
  })
  expect(request.mock.calls[0][0]).toBe('https://api.ipapi.is/')
  expect(request.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    body: '{"key":"secret-key"}',
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
    expect(await getIpAssessment('bad-key')).toMatchObject({
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
  expect((await getIpAssessment('')).riskScore).toBeNull()
  request.mockResolvedValueOnce(
    Response.json({ ip: 'not-an-ip', fraudScore: 0 }),
  )
  await expect(getIpAssessment('')).rejects.toThrow('IP assessment unavailable')
})

test('recognizes documented non-boolean VPN detections', async () => {
  request.mockResolvedValueOnce(
    Response.json({ ip: '203.0.113.9', is_vpn: 'NordVPN' }),
  )
  expect((await getIpAssessment('key')).flags.vpn).toBe(true)
})

test('works on WebViews without AbortSignal.timeout', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout')!
  Reflect.deleteProperty(AbortSignal, 'timeout')
  try {
    request.mockResolvedValueOnce(Response.json(publicResult))
    expect((await getIpAssessment('')).riskScore).toBe(0)
  } finally {
    Object.defineProperty(AbortSignal, 'timeout', descriptor)
  }
})
