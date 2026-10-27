import { ipv4 } from 'cidr-block'
import isIP from 'validator/es/lib/isIP'

import type { NetworkInterfaceView } from '@/services/bindings'

export const getLanAddresses = (interfaces: NetworkInterfaceView[]) =>
  interfaces.flatMap(({ name, addr }) => {
    if (/^(utun|tun|tap|wintun|mihomo|clash)/i.test(name)) return []
    return addr.flatMap((address) => {
      const ip = address.V4?.ip
      if (!ip || !isIP(ip, 4)) return []
      const parsed = ipv4.address(ip)
      return parsed.isPrivateAddress() && !parsed.isLoopbackAddress()
        ? [{ name, ip }]
        : []
    })
  })
