import { fetch } from '@tauri-apps/plugin-http'
import isIP from 'validator/es/lib/isIP'

import { getIpInfo } from './api'

export type IpAssessmentProviderType = 'ipapi' | 'cleanip'

export interface IpAssessmentProvider {
  type: IpAssessmentProviderType
  url: string
  key: string
}

export const IP_ASSESSMENT_PROVIDER_URLS: Record<
  IpAssessmentProviderType,
  string
> = {
  ipapi: 'https://api.ipapi.is/',
  cleanip: 'https://api.cleanip.io',
}

export const isHttpsAssessmentUrl = (value: string) => {
  if (!value.trim()) return true
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

export const RISK_CHECK_GROUPS = {
  anonymity: [
    'proxy',
    'vpn',
    'tor',
    'anonymous',
    'crawler',
    'residentialProxy',
    'relay',
  ],
  abuse: [
    'commentSpam',
    'forumSpam',
    'harvester',
    'abuser',
    'threatIntel',
    'fraud',
  ],
  blacklist: [
    'dnsbl',
    'honeypot',
    'botnet',
    'malware',
    'publicList',
    'compromised',
  ],
  attack: [
    'reports',
    'multiReports',
    'knownAttacker',
    'localThreat',
    'loginAttack',
    'registrationAttack',
  ],
} as const

type RiskCheckId =
  (typeof RISK_CHECK_GROUPS)[keyof typeof RISK_CHECK_GROUPS][number]

interface IpRiskMetrics {
  proxyRisk: number | null
  sharedDevices: number | null
  // Fraction 0-1 of abusive addresses in the registered network or ASN.
  networkAbuse: number | null
  dnsbl: number | null
  publicLists: number | null
  reports: number | null
  reportDays: number | null
}

export interface IpAssessment {
  ip: string
  provider: 'IPPure' | 'ipapi.is' | 'cleanip.io'
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
  // true = recorded, false = checked and clear, null = provider did not report it.
  checks: Record<RiskCheckId, boolean | null>
  metrics: IpRiskMetrics
}

const NETWORK_TYPES = ['residential', 'hosting', 'mobile', 'business'] as const

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const flag = (value: unknown) => (typeof value === 'boolean' ? value : null)
const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
const positive = (value: unknown) => {
  const n = count(value)
  return n === null ? null : n > 0
}
const score100 = (value: unknown) => {
  const n = count(value)
  return n !== null && n <= 100 ? n : null
}
const networkType = (value: string): IpAssessment['networkType'] => {
  const type = value.toLowerCase()
  return (NETWORK_TYPES as readonly string[]).includes(type)
    ? (type as IpAssessment['networkType'])
    : 'unknown'
}

const emptyChecks = () =>
  Object.fromEntries(
    Object.values(RISK_CHECK_GROUPS)
      .flat()
      .map((id) => [id, null]),
  ) as Record<RiskCheckId, boolean | null>

const emptyMetrics = (): IpRiskMetrics => ({
  proxyRisk: null,
  sharedDevices: null,
  networkAbuse: null,
  dnsbl: null,
  publicLists: null,
  reports: null,
  reportDays: null,
})

const withTimeout = async <T>(run: (signal: AbortSignal) => Promise<T>) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    return await run(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

const readJson = async (response: Response) => {
  if (!response.ok) throw new Error('IP assessment unavailable')
  const data = record(await response.json())
  if (data.error || data.ok === false)
    throw new Error('IP assessment unavailable')
  return data
}

const requestIppure = () =>
  withTimeout(async (signal): Promise<IpAssessment> => {
    const data = await readJson(
      await fetch('https://my.ippure.com/v1/info', {
        method: 'GET',
        connectTimeout: 8_000,
        signal,
      }),
    )
    if (!isIP(text(data.ip))) throw new Error('IP assessment unavailable')
    const residential = flag(data.isResidential)
    return {
      ip: text(data.ip),
      provider: 'IPPure',
      fallback: false,
      checkedAt: Date.now(),
      organization: text(data.asOrganization),
      asn: typeof data.asn === 'number' ? `AS${data.asn}` : '',
      location: [text(data.country), text(data.city)]
        .filter(Boolean)
        .join(' · '),
      countryCode: text(data.countryCode),
      networkType:
        residential === true
          ? 'residential'
          : residential === false
            ? 'hosting'
            : 'unknown',
      broadcast: flag(data.isBroadcast),
      riskScore: score100(data.fraudScore),
      flags: {
        proxy: null,
        vpn: null,
        tor: null,
        datacenter: residential === null ? null : !residential,
        abuser: null,
      },
      checks: emptyChecks(),
      metrics: emptyMetrics(),
    }
  })

const requestIpapi = (provider: IpAssessmentProvider) =>
  withTimeout(async (signal): Promise<IpAssessment> => {
    const data = await readJson(
      await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: provider.key }),
        maxRedirections: 0,
        connectTimeout: 8_000,
        signal,
      }),
    )
    if (!isIP(text(data.ip))) throw new Error('IP assessment unavailable')
    const company = record(data.company)
    const asn = record(data.asn)
    const location = record(data.location)
    const vpn = data.is_vpn != null ? Boolean(data.is_vpn) : null
    // e.g. "0.0012 (Low)": share of abusive addresses in the network.
    const abuserScore = Math.max(
      ...[company.abuser_score, asn.abuser_score]
        .map((value) => Number.parseFloat(text(value)))
        .filter((value) => Number.isFinite(value) && value >= 0),
    )
    return {
      ip: text(data.ip),
      provider: 'ipapi.is',
      fallback: false,
      checkedAt: Date.now(),
      organization: text(company.name) || text(asn.org),
      asn: typeof asn.asn === 'number' ? `AS${asn.asn}` : '',
      location: [text(location.country), text(location.city)]
        .filter(Boolean)
        .join(' · '),
      countryCode: text(location.country_code),
      networkType:
        data.is_mobile === true
          ? 'mobile'
          : data.is_datacenter === true
            ? 'hosting'
            : networkType(text(company.type)),
      broadcast: null,
      riskScore: null,
      flags: {
        proxy: flag(data.is_proxy),
        vpn,
        tor: flag(data.is_tor),
        datacenter: flag(data.is_datacenter),
        abuser: flag(data.is_abuser),
      },
      checks: {
        ...emptyChecks(),
        proxy: flag(data.is_proxy),
        vpn,
        tor: flag(data.is_tor),
        crawler: flag(data.is_crawler),
        abuser: flag(data.is_abuser),
      },
      metrics: {
        ...emptyMetrics(),
        networkAbuse: Number.isFinite(abuserScore) ? abuserScore : null,
      },
    }
  })

const requestCleanip = (provider: IpAssessmentProvider) =>
  withTimeout(async (signal): Promise<IpAssessment> => {
    // The keyed API looks up a given address, so resolve the egress IP first.
    const { ip } = await getIpInfo()
    if (!isIP(ip)) throw new Error('IP assessment unavailable')
    const data = await readJson(
      await fetch(
        `${provider.url.replace(/\/+$/, '')}/api/v2/${encodeURIComponent(ip)}`,
        {
          method: 'GET',
          headers: { 'X-API-Key': provider.key },
          maxRedirections: 0,
          connectTimeout: 8_000,
          signal,
        },
      ),
    )
    if (!isIP(text(data.ip))) throw new Error('IP assessment unavailable')
    const geo = record(data.geo)
    const network = record(data.network)
    const purity = record(data.purity)
    const risk = record(data.risk)
    const honeypotTypes = text(risk.honeypot_type).toLowerCase().split(',')
    const honeypotChecked = risk.honeypot_checked === true
    const threatfoxChecked = risk.threatfox_checked === true
    const threatType = text(risk.threatfox_threat_type)
    const threatHits = positive(risk.threatfox_hits)
    const commentSpam = positive(risk.proxycheck_attack_comment_spam)
    const fraudScores = [
      record(data.scamalytics).scam_score,
      record(data.ipqs).ipqs_fraud_score,
    ]
      .map(score100)
      .filter((value) => value !== null)
    const publicLists = count(risk.ipsum_lists)
    const reports = count(risk.abuse_reports)
    const broadcastLabel = text(network.native_or_broadcast).toLowerCase()
    const networkAbuse = count(record(risk.network_abuser).score)
    return {
      ip: text(data.ip),
      provider: 'cleanip.io',
      fallback: false,
      checkedAt: Date.now(),
      organization: text(network.isp) || text(network.asn_org),
      asn: typeof network.asn === 'number' ? `AS${network.asn}` : '',
      location: [text(geo.country_en) || text(geo.country), text(geo.city_en)]
        .filter(Boolean)
        .join(' · '),
      countryCode: text(geo.country_code),
      networkType:
        risk.is_mobile === true
          ? 'mobile'
          : networkType(text(purity.ip_type)) !== 'unknown'
            ? networkType(text(purity.ip_type))
            : risk.is_datacenter === true
              ? 'hosting'
              : 'unknown',
      broadcast:
        broadcastLabel === 'broadcast'
          ? true
          : broadcastLabel === 'native'
            ? false
            : null,
      riskScore: score100(risk.risk_score),
      flags: {
        proxy: flag(risk.is_proxy),
        vpn: flag(risk.is_vpn),
        tor: flag(risk.is_tor),
        datacenter: flag(risk.is_datacenter),
        abuser: flag(risk.is_abuser),
      },
      checks: {
        proxy: flag(risk.is_proxy),
        vpn: flag(risk.is_vpn),
        tor: flag(risk.is_tor),
        anonymous: flag(risk.is_anonymous),
        crawler: flag(risk.is_crawler),
        residentialProxy: flag(risk.is_residential_proxy),
        relay: flag(risk.is_relay),
        commentSpam:
          commentSpam === true || risk.honeypot_comment_spam === true
            ? true
            : (commentSpam ?? flag(risk.honeypot_comment_spam)),
        forumSpam: flag(risk.sfs_appears),
        harvester: honeypotChecked ? honeypotTypes.includes('harvester') : null,
        abuser: flag(risk.is_abuser),
        threatIntel: threatfoxChecked ? !!threatHits : threatHits,
        fraud: fraudScores.length ? Math.max(...fraudScores) >= 50 : null,
        dnsbl: positive(risk.dnsbl_count),
        honeypot: honeypotChecked ? honeypotTypes.includes('suspicious') : null,
        botnet: threatfoxChecked
          ? !!threatHits && threatType === 'botnet_cc'
          : null,
        malware: threatfoxChecked
          ? !!threatHits && ['payload_delivery', 'payload'].includes(threatType)
          : null,
        publicList:
          (publicLists ?? 0) > 0 ||
          !!risk.spamhaus_drop ||
          risk.spamhaus_asn_drop === true
            ? true
            : risk.public_list_checked === true
              ? false
              : null,
        compromised: flag(risk.proxycheck_compromised),
        reports: positive(risk.abuse_reports),
        multiReports:
          count(risk.abuse_distinct_users) === null
            ? null
            : (count(risk.abuse_distinct_users) ?? 0) > 1,
        knownAttacker:
          risk.is_whitelisted === true ? false : flag(risk.is_threat),
        localThreat: positive(risk.own_recent_threat_events_30d),
        loginAttack: positive(risk.proxycheck_attack_login),
        registrationAttack: positive(risk.proxycheck_attack_registration),
      },
      metrics: {
        proxyRisk: score100(risk.proxycheck_risk),
        sharedDevices: count(risk.proxycheck_device_address_count),
        networkAbuse,
        dnsbl: count(risk.dnsbl_count),
        publicLists:
          publicLists ?? (risk.public_list_checked === true ? 0 : null),
        reports,
        reportDays: count(risk.abuse_report_window_days),
      },
    }
  })

export async function getIpAssessment(
  providers: IpAssessmentProvider[],
): Promise<IpAssessment> {
  const usable = providers.filter((provider) => provider.key.trim())
  for (const provider of usable) {
    try {
      const url =
        provider.url.trim() || IP_ASSESSMENT_PROVIDER_URLS[provider.type]
      if (!isHttpsAssessmentUrl(url)) continue
      return await (provider.type === 'cleanip'
        ? requestCleanip
        : requestIpapi)({
        ...provider,
        url,
        key: provider.key.trim(),
      })
    } catch {
      // Never log provider errors: they may contain credentials.
    }
  }
  try {
    return { ...(await requestIppure()), fallback: usable.length > 0 }
  } catch {
    throw new Error('IP assessment unavailable')
  }
}
