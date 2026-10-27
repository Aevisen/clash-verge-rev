import { fetch } from '@tauri-apps/plugin-http'
import isIP from 'validator/es/lib/isIP'

export interface IpAssessment {
  ip: string
  provider: 'IPPure' | 'ipapi.is'
  fallback: boolean
  checkedAt: number
  organization: string
  asn: string
  location: string
  countryCode: string
  networkType: 'residential' | 'hosting' | 'mobile' | 'business' | 'unknown'
  broadcast: boolean | null
  riskScore: number | null
  flags: Record<
    'proxy' | 'vpn' | 'tor' | 'datacenter' | 'abuser',
    boolean | null
  >
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const flag = (value: unknown) => (typeof value === 'boolean' ? value : null)

async function requestAssessment(apiKey: string): Promise<IpAssessment> {
  const keyed = !!apiKey
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(
      keyed ? 'https://api.ipapi.is/' : 'https://my.ippure.com/v1/info',
      {
        method: keyed ? 'POST' : 'GET',
        ...(keyed && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: apiKey }),
        }),
        connectTimeout: 8_000,
        signal: controller.signal,
      },
    )
    if (!response.ok) throw new Error('IP assessment unavailable')
    const data = record(await response.json())
    if (data.error || !isIP(text(data.ip)))
      throw new Error('IP assessment unavailable')

    const company = record(data.company)
    const asn = record(data.asn)
    const location = record(data.location)
    const networkType = text(company.type)
    const residential = flag(data.isResidential)
    const score = data.fraudScore
    return {
      ip: text(data.ip),
      provider: keyed ? 'ipapi.is' : 'IPPure',
      fallback: false,
      checkedAt: Date.now(),
      organization: keyed
        ? text(company.name) || text(asn.org)
        : text(data.asOrganization),
      asn:
        typeof (keyed ? asn.asn : data.asn) === 'number'
          ? `AS${keyed ? asn.asn : data.asn}`
          : '',
      location: [
        keyed ? location.country : data.country,
        keyed ? location.city : data.city,
      ]
        .filter((value) => typeof value === 'string' && value)
        .join(' · '),
      countryCode: text(keyed ? location.country_code : data.countryCode),
      networkType: keyed
        ? data.is_mobile === true
          ? 'mobile'
          : data.is_datacenter === true
            ? 'hosting'
            : ['residential', 'hosting', 'mobile', 'business'].includes(
                  networkType,
                )
              ? (networkType as IpAssessment['networkType'])
              : 'unknown'
        : residential === true
          ? 'residential'
          : residential === false
            ? 'hosting'
            : 'unknown',
      broadcast: keyed ? null : flag(data.isBroadcast),
      riskScore:
        !keyed &&
        typeof score === 'number' &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100
          ? score
          : null,
      flags: {
        proxy: keyed ? flag(data.is_proxy) : null,
        vpn: keyed && data.is_vpn != null ? Boolean(data.is_vpn) : null,
        tor: keyed ? flag(data.is_tor) : null,
        datacenter: keyed
          ? flag(data.is_datacenter)
          : residential === null
            ? null
            : !residential,
        abuser: keyed ? flag(data.is_abuser) : null,
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function getIpAssessment(apiKey: string): Promise<IpAssessment> {
  if (apiKey.trim()) {
    try {
      return await requestAssessment(apiKey.trim())
    } catch {
      // Never log provider errors: they may contain credentials.
    }
  }
  try {
    return { ...(await requestAssessment('')), fallback: !!apiKey.trim() }
  } catch {
    throw new Error('IP assessment unavailable')
  }
}
