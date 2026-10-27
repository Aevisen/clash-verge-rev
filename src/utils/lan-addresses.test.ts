import { expect, test } from 'vitest'

import { getLanAddresses } from './lan-addresses'

test('lists private IPv4 interfaces without loopback, TUN or public addresses', () => {
  const interfaces = [
    { name: 'lo0', addr: [{ V4: { ip: '127.0.0.1' } }], mac_addr: null },
    { name: 'utun1024', addr: [{ V4: { ip: '10.0.0.1' } }], mac_addr: null },
    {
      name: 'en0',
      addr: [{ V6: { ip: 'fe80::1' } }, { V4: { ip: '192.168.1.8' } }],
      mac_addr: null,
    },
    {
      name: 'Ethernet',
      addr: [{ V4: { ip: '172.16.4.8' } }, { V4: { ip: '8.8.8.8' } }],
      mac_addr: null,
    },
  ]
  expect(getLanAddresses(interfaces)).toEqual([
    { name: 'en0', ip: '192.168.1.8' },
    { name: 'Ethernet', ip: '172.16.4.8' },
  ])
})
