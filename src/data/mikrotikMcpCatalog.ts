export interface McpParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  default?: any;
  enum?: string[];
}

export interface McpToolItem {
  name: string;
  category: string;
  description: string;
  cliCommand: (args: any) => string;
  params: McpParam[];
  isSafeModeSensitive?: boolean;
}

export interface McpCategory {
  id: string;
  name: string;
  toolCount: number;
  badge: string;
  description: string;
  tools: McpToolItem[];
}

export interface FleetDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  model: string;
  routerOsVersion: string;
  role: string;
  status: 'online' | 'standby' | 'offline';
  uptime: string;
  cpuLoad: string;
}

export const FLEET_DEVICES: FleetDevice[] = [
  {
    id: 'edge-core-01',
    name: 'edge-router-core',
    ip: '192.168.88.1',
    port: 22,
    model: 'CCR2004-16G-2S+',
    routerOsVersion: 'v7.16.2 (Stable)',
    role: 'Primary Core Gateway & BGP',
    status: 'online',
    uptime: '42d 18h 12m',
    cpuLoad: '4%'
  },
  {
    id: 'branch-vlan-02',
    name: 'branch-office-gw',
    ip: '10.200.1.1',
    port: 22,
    model: 'RB5009UG+S+IN',
    routerOsVersion: 'v7.16.1',
    role: 'Branch Office & WireGuard Hub',
    status: 'online',
    uptime: '19d 04h 55m',
    cpuLoad: '7%'
  },
  {
    id: 'wireless-ap-03',
    name: 'campus-capsman-ctl',
    ip: '192.168.10.2',
    port: 22,
    model: 'CRS326-24G-2S+RM',
    routerOsVersion: 'v7.15.3',
    role: 'Distribution Switch & CAPsMAN v2',
    status: 'online',
    uptime: '61d 22h 40m',
    cpuLoad: '2%'
  },
  {
    id: 'lte-backup-04',
    name: 'backup-lte-gateway',
    ip: '192.168.99.1',
    port: 22,
    model: 'LtAP mini LTE kit',
    routerOsVersion: 'v7.16.2',
    role: 'Cellular Out-of-Band Redundancy',
    status: 'standby',
    uptime: '104d 11h 02m',
    cpuLoad: '1%'
  }
];

export const MIKROTIK_MCP_CATEGORIES: McpCategory[] = [
  {
    id: 'vlan',
    name: 'VLAN',
    toolCount: 5,
    badge: '5 tools',
    description: 'Create, list, get, update, and remove tagged interfaces on any parent port. IDs 1–4094.',
    tools: [
      {
        name: 'mikrotik_create_vlan_interface',
        category: 'VLAN',
        description: 'Create a tagged 802.1Q VLAN sub-interface on a parent port or bridge.',
        cliCommand: (args) => `/interface vlan add name=${args.name || 'vlan' + (args.vlan_id || 100)} vlan-id=${args.vlan_id || 100} interface=${args.interface || 'ether1'} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Interface identifier (e.g. vlan200)' },
          { name: 'vlan_id', type: 'number', required: true, description: '802.1Q tag ID (1 to 4094)' },
          { name: 'interface', type: 'string', required: true, description: 'Parent physical port or bridge' },
          { name: 'comment', type: 'string', required: false, description: 'Administrative note' }
        ]
      },
      {
        name: 'mikrotik_list_vlan_interfaces',
        category: 'VLAN',
        description: 'Retrieve all configured 802.1Q VLAN interfaces with their parent bonds and tags.',
        cliCommand: () => `/interface vlan print detail`,
        params: [
          { name: 'interface', type: 'string', required: false, description: 'Filter by parent interface' }
        ]
      },
      {
        name: 'mikrotik_get_vlan_interface',
        category: 'VLAN',
        description: 'Get detailed properties and counters for a specific VLAN interface.',
        cliCommand: (args) => `/interface vlan print where name="${args.name}"`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Target VLAN interface name' }
        ]
      },
      {
        name: 'mikrotik_update_vlan_interface',
        category: 'VLAN',
        description: 'Update MTU, tag ID, or administrative comment on an existing VLAN.',
        cliCommand: (args) => `/interface vlan set [find name="${args.name}"] ${args.vlan_id ? `vlan-id=${args.vlan_id}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Target VLAN interface name' },
          { name: 'vlan_id', type: 'number', required: false, description: 'New 802.1Q tag ID' },
          { name: 'comment', type: 'string', required: false, description: 'Updated comment' }
        ]
      },
      {
        name: 'mikrotik_remove_vlan_interface',
        category: 'VLAN',
        description: 'Remove a VLAN interface and detach any bound IP address configurations.',
        cliCommand: (args) => `/interface vlan remove [find name="${args.name}"]`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Target VLAN interface name' }
        ],
        isSafeModeSensitive: true
      }
    ]
  },
  {
    id: 'firewall',
    name: 'Firewall',
    toolCount: 9,
    badge: '9 tools',
    description: 'Filter rules across input, forward, output chains. Move, enable, disable, plus basic-setup helper.',
    tools: [
      {
        name: 'mikrotik_create_filter_rule',
        category: 'Firewall',
        description: 'Add a new firewall filter rule with chain, action, protocol, IP ranges, and priority.',
        cliCommand: (args) => `/ip firewall filter add chain=${args.chain || 'forward'} action=${args.action || 'drop'} ${args.protocol ? `protocol=${args.protocol}` : ''} ${args.src_address ? `src-address=${args.src_address}` : ''} ${args.dst_address ? `dst-address=${args.dst_address}` : ''} ${args.dst_port ? `dst-port=${args.dst_port}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'chain', type: 'string', required: true, enum: ['input', 'forward', 'output'], description: 'Packet filtering chain' },
          { name: 'action', type: 'string', required: true, enum: ['accept', 'drop', 'reject', 'log', 'fasttrack-connection'], description: 'Filtering action' },
          { name: 'protocol', type: 'string', required: false, enum: ['tcp', 'udp', 'icmp', 'any'], description: 'Transport protocol' },
          { name: 'src_address', type: 'string', required: false, description: 'Source IP or CIDR subnet' },
          { name: 'dst_address', type: 'string', required: false, description: 'Destination IP or CIDR subnet' },
          { name: 'dst_port', type: 'number', required: false, description: 'Destination port number' },
          { name: 'comment', type: 'string', required: false, description: 'Audit comment' }
        ],
        isSafeModeSensitive: true
      },
      {
        name: 'mikrotik_list_filter_rules',
        category: 'Firewall',
        description: 'List all firewall filter rules in strict top-to-bottom evaluation priority order.',
        cliCommand: (args) => `/ip firewall filter print ${args.chain ? `where chain="${args.chain}"` : ''}`,
        params: [
          { name: 'chain', type: 'string', required: false, enum: ['input', 'forward', 'output'], description: 'Optional chain filter' }
        ]
      },
      {
        name: 'mikrotik_move_filter_rule',
        category: 'Firewall',
        description: 'Reorder a firewall rule priority (first match wins in RouterOS).',
        cliCommand: (args) => `/ip firewall filter move ${args.from_index} ${args.to_index}`,
        params: [
          { name: 'from_index', type: 'number', required: true, description: 'Current index of rule' },
          { name: 'to_index', type: 'number', required: true, description: 'Destination priority slot' }
        ],
        isSafeModeSensitive: true
      },
      {
        name: 'mikrotik_enable_filter_rule',
        category: 'Firewall',
        description: 'Enable an existing firewall filter rule to start processing traffic.',
        cliCommand: (args) => `/ip firewall filter enable ${args.rule_id || args.index}`,
        params: [{ name: 'rule_id', type: 'string', required: true, description: 'Rule index or identifier' }]
      },
      {
        name: 'mikrotik_disable_filter_rule',
        category: 'Firewall',
        description: 'Disable a firewall rule without deleting it (bypasses packet evaluation).',
        cliCommand: (args) => `/ip firewall filter disable ${args.rule_id || args.index}`,
        params: [{ name: 'rule_id', type: 'string', required: true, description: 'Rule index or identifier' }]
      },
      {
        name: 'mikrotik_remove_filter_rule',
        category: 'Firewall',
        description: 'Permanently remove a firewall filter rule.',
        cliCommand: (args) => `/ip firewall filter remove ${args.rule_id || args.index}`,
        params: [{ name: 'rule_id', type: 'string', required: true, description: 'Rule index or identifier' }],
        isSafeModeSensitive: true
      },
      {
        name: 'mikrotik_setup_basic_firewall',
        category: 'Firewall',
        description: 'Generate standard baseline hardening: drop invalid, accept established/related, drop WAN input.',
        cliCommand: () => `/ip firewall filter add chain=input connection-state=established,related action=accept comment="defconf: accept established,related"\n/ip firewall filter add chain=input connection-state=invalid action=drop comment="defconf: drop invalid"\n/ip firewall filter add chain=input protocol=icmp action=accept comment="defconf: accept ICMP"\n/ip firewall filter add chain=input in-interface-list=!LAN action=drop comment="defconf: drop all not from LAN"`,
        params: []
      },
      {
        name: 'mikrotik_reset_rule_counters',
        category: 'Firewall',
        description: 'Reset packet and byte counters for specific or all filter rules.',
        cliCommand: (args) => `/ip firewall filter reset-counters ${args.rule_id || 'all'}`,
        params: [{ name: 'rule_id', type: 'string', required: false, description: 'Rule index or omit for all' }]
      },
      {
        name: 'mikrotik_inspect_raw_firewall',
        category: 'Firewall',
        description: 'View stateless prerouting RAW filter table for DDoS mitigations and SYN drops.',
        cliCommand: () => `/ip firewall raw print detail`,
        params: []
      }
    ]
  },
  {
    id: 'nat',
    name: 'NAT',
    toolCount: 8,
    badge: '8 tools',
    description: 'srcnat / dstnat / masquerade. Port forwards, redirects, move, enable, disable.',
    tools: [
      {
        name: 'mikrotik_create_nat_rule',
        category: 'NAT',
        description: 'Create a source NAT (masquerade), destination NAT (port forward), or redirect rule.',
        cliCommand: (args) => `/ip firewall nat add chain=${args.chain || 'srcnat'} action=${args.action || 'masquerade'} ${args.out_interface ? `out-interface=${args.out_interface}` : ''} ${args.dst_port ? `dst-port=${args.dst_port}` : ''} ${args.to_addresses ? `to-addresses=${args.to_addresses}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'chain', type: 'string', required: true, enum: ['srcnat', 'dstnat'], description: 'NAT chain' },
          { name: 'action', type: 'string', required: true, enum: ['masquerade', 'dst-nat', 'src-nat', 'redirect'], description: 'NAT action' },
          { name: 'out_interface', type: 'string', required: false, description: 'WAN uplink interface (for masquerade)' },
          { name: 'in_interface', type: 'string', required: false, description: 'Inbound interface (for port forward)' },
          { name: 'protocol', type: 'string', required: false, enum: ['tcp', 'udp'], description: 'Transport protocol' },
          { name: 'dst_port', type: 'number', required: false, description: 'Listening port' },
          { name: 'to_addresses', type: 'string', required: false, description: 'Target internal IP' },
          { name: 'to_ports', type: 'number', required: false, description: 'Target internal port' },
          { name: 'comment', type: 'string', required: false, description: 'Rule label' }
        ]
      },
      {
        name: 'mikrotik_list_nat_rules',
        category: 'NAT',
        description: 'List all active NAT rules, packet counters, and port forwards.',
        cliCommand: () => `/ip firewall nat print detail`,
        params: []
      },
      {
        name: 'mikrotik_remove_nat_rule',
        category: 'NAT',
        description: 'Remove a NAT rule by identifier.',
        cliCommand: (args) => `/ip firewall nat remove ${args.id}`,
        params: [{ name: 'id', type: 'string', required: true, description: 'Rule index' }]
      },
      {
        name: 'mikrotik_enable_nat_rule',
        category: 'NAT',
        description: 'Enable a disabled NAT rule.',
        cliCommand: (args) => `/ip firewall nat enable ${args.id}`,
        params: [{ name: 'id', type: 'string', required: true, description: 'Rule index' }]
      },
      {
        name: 'mikrotik_disable_nat_rule',
        category: 'NAT',
        description: 'Disable an active NAT rule.',
        cliCommand: (args) => `/ip firewall nat disable ${args.id}`,
        params: [{ name: 'id', type: 'string', required: true, description: 'Rule index' }]
      },
      {
        name: 'mikrotik_create_port_forward',
        category: 'NAT',
        description: 'Helper: Configure external port forward to internal service (e.g. Web, SSH).',
        cliCommand: (args) => `/ip firewall nat add chain=dstnat protocol=${args.protocol || 'tcp'} dst-port=${args.external_port} action=dst-nat to-addresses=${args.internal_ip} to-ports=${args.internal_port || args.external_port} comment="${args.comment || 'Port Forward via MCP'}"`,
        params: [
          { name: 'external_port', type: 'number', required: true, description: 'External listening port' },
          { name: 'internal_ip', type: 'string', required: true, description: 'Target LAN host IP' },
          { name: 'internal_port', type: 'number', required: false, description: 'Target host port' },
          { name: 'protocol', type: 'string', required: false, enum: ['tcp', 'udp'], description: 'Protocol' },
          { name: 'comment', type: 'string', required: false, description: 'Rule annotation' }
        ]
      },
      {
        name: 'mikrotik_move_nat_rule',
        category: 'NAT',
        description: 'Change evaluation order of NAT rules.',
        cliCommand: (args) => `/ip firewall nat move ${args.from_index} ${args.to_index}`,
        params: [
          { name: 'from_index', type: 'number', required: true, description: 'Current index' },
          { name: 'to_index', type: 'number', required: true, description: 'Target index' }
        ]
      },
      {
        name: 'mikrotik_get_nat_connections',
        category: 'NAT',
        description: 'Inspect live connection tracking table (conntrack entries).',
        cliCommand: () => `/ip firewall connection print`,
        params: []
      }
    ]
  },
  {
    id: 'dhcp',
    name: 'DHCP',
    toolCount: 6,
    badge: '6 tools',
    description: 'Servers, networks, pools. Gateway + DNS push, lease configuration.',
    tools: [
      {
        name: 'mikrotik_create_dhcp_server',
        category: 'DHCP',
        description: 'Bind a DHCP server to a subnet interface with address pool.',
        cliCommand: (args) => `/ip dhcp-server add name=${args.name} interface=${args.interface} address-pool=${args.address_pool} lease-time=${args.lease_time || '1d'} disabled=no`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'DHCP instance name' },
          { name: 'interface', type: 'string', required: true, description: 'Interface (e.g. vlan200 or bridge)' },
          { name: 'address_pool', type: 'string', required: true, description: 'Name of pre-allocated IP pool' },
          { name: 'lease_time', type: 'string', required: false, description: 'Lease duration (e.g. 12h, 1d)' }
        ]
      },
      {
        name: 'mikrotik_create_dhcp_network',
        category: 'DHCP',
        description: 'Define DHCP network parameters pushed to clients: gateway, subnet mask, DNS servers.',
        cliCommand: (args) => `/ip dhcp-server network add address=${args.address} gateway=${args.gateway} dns-server=${args.dns_servers || args.gateway} comment="${args.comment || ''}"`,
        params: [
          { name: 'address', type: 'string', required: true, description: 'Network CIDR (e.g. 192.168.200.0/24)' },
          { name: 'gateway', type: 'string', required: true, description: 'Default gateway IP' },
          { name: 'dns_servers', type: 'string', required: false, description: 'Comma-separated DNS server IPs' },
          { name: 'comment', type: 'string', required: false, description: 'Network description' }
        ]
      },
      {
        name: 'mikrotik_list_dhcp_leases',
        category: 'DHCP',
        description: 'List active and static DHCP client leases, hostnames, and MAC bindings.',
        cliCommand: () => `/ip dhcp-server lease print detail`,
        params: []
      },
      {
        name: 'mikrotik_make_lease_static',
        category: 'DHCP',
        description: 'Convert a dynamic client lease into a permanent static MAC reservation.',
        cliCommand: (args) => `/ip dhcp-server lease make-static [find address="${args.ip_address}"]`,
        params: [{ name: 'ip_address', type: 'string', required: true, description: 'Target client IP' }]
      },
      {
        name: 'mikrotik_remove_dhcp_lease',
        category: 'DHCP',
        description: 'Release/delete a DHCP lease.',
        cliCommand: (args) => `/ip dhcp-server lease remove [find address="${args.ip_address}"]`,
        params: [{ name: 'ip_address', type: 'string', required: true, description: 'Target client IP' }]
      },
      {
        name: 'mikrotik_get_dhcp_alerts',
        category: 'DHCP',
        description: 'Check for rogue DHCP servers detected on local LAN segments.',
        cliCommand: () => `/ip dhcp-server alert print detail`,
        params: []
      }
    ]
  },
  {
    id: 'ip-pool',
    name: 'IP Pool',
    toolCount: 7,
    badge: '7 tools',
    description: 'Named pools, range expansion, used-address inspection.',
    tools: [
      {
        name: 'mikrotik_create_dhcp_pool',
        category: 'IP Pool',
        description: 'Create a named IP address pool for DHCP, VPN, or Hotspot assignment.',
        cliCommand: (args) => `/ip pool add name=${args.name} ranges=${args.ranges} ${args.next_pool ? `next-pool=${args.next_pool}` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Pool identifier (e.g. pool-200)' },
          { name: 'ranges', type: 'string', required: true, description: 'IP range (e.g. 192.168.200.10-192.168.200.100)' },
          { name: 'next_pool', type: 'string', required: false, description: 'Continuation pool name' }
        ]
      },
      {
        name: 'mikrotik_list_ip_pools',
        category: 'IP Pool',
        description: 'List all configured IP pools and their configured boundaries.',
        cliCommand: () => `/ip pool print detail`,
        params: []
      },
      {
        name: 'mikrotik_get_pool_used_addresses',
        category: 'IP Pool',
        description: 'Inspect currently allocated addresses from a pool and their consumers.',
        cliCommand: (args) => `/ip pool used print ${args.pool_name ? `where pool="${args.pool_name}"` : ''}`,
        params: [{ name: 'pool_name', type: 'string', required: false, description: 'Filter by pool name' }]
      },
      {
        name: 'mikrotik_update_ip_pool',
        category: 'IP Pool',
        description: 'Expand or modify ranges of an existing IP pool.',
        cliCommand: (args) => `/ip pool set [find name="${args.name}"] ranges=${args.ranges}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Pool name' },
          { name: 'ranges', type: 'string', required: true, description: 'New IP ranges' }
        ]
      },
      {
        name: 'mikrotik_remove_ip_pool',
        category: 'IP Pool',
        description: 'Remove an unused IP pool.',
        cliCommand: (args) => `/ip pool remove [find name="${args.name}"]`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Pool name' }]
      },
      {
        name: 'mikrotik_get_pool_utilization',
        category: 'IP Pool',
        description: 'Calculate percentage utilization across all pools to identify exhaustion.',
        cliCommand: () => `/ip pool print stats`,
        params: []
      },
      {
        name: 'mikrotik_clean_expired_pool_leases',
        category: 'IP Pool',
        description: 'Clean up stale or stranded lease reservations from pool memory.',
        cliCommand: () => `/ip dhcp-server lease remove [find status=expired]`,
        params: []
      }
    ]
  },
  {
    id: 'safe-mode',
    name: 'Safe Mode',
    toolCount: 4,
    badge: '4 tools',
    description: 'Status, enable, commit, rollback sessions. Auto-revert on connection loss.',
    tools: [
      {
        name: 'mikrotik_safe_mode_status',
        category: 'Safe Mode',
        description: 'Query current RouterOS Safe-Mode session state and pending change count.',
        cliCommand: () => `# safe-mode status check: session state inspection`,
        params: []
      },
      {
        name: 'mikrotik_safe_mode_enable',
        category: 'Safe Mode',
        description: 'Arm Safe Mode for the active session. If connection drops, all modifications auto-revert.',
        cliCommand: () => `# [SAFE-MODE ARMED] Changes will automatically roll back if connection drops`,
        params: [
          { name: 'session_timeout', type: 'number', required: false, description: 'Auto-rollback timeout in seconds (default 300)' }
        ]
      },
      {
        name: 'mikrotik_safe_mode_commit',
        category: 'Safe Mode',
        description: 'Persist all verified changes and successfully exit Safe Mode.',
        cliCommand: () => `# [SAFE-MODE COMMITTED] Changes written permanently to NVRAM`,
        params: []
      },
      {
        name: 'mikrotik_safe_mode_rollback',
        category: 'Safe Mode',
        description: 'Immediately abort and revert all uncommitted changes back to the pre-session snapshot.',
        cliCommand: () => `# [SAFE-MODE ROLLBACK] Reverting all session delta commands`,
        params: []
      }
    ]
  },
  {
    id: 'ip-address',
    name: 'IP Address',
    toolCount: 4,
    badge: '4 tools',
    description: 'Bind, list, get, remove. Comments, network filters, dynamic detection.',
    tools: [
      {
        name: 'mikrotik_add_ip_address',
        category: 'IP Address',
        description: 'Bind a static IPv4 address and CIDR prefix to an interface.',
        cliCommand: (args) => `/ip address add address=${args.address} interface=${args.interface} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'address', type: 'string', required: true, description: 'IPv4 with CIDR (e.g. 192.168.200.1/24)' },
          { name: 'interface', type: 'string', required: true, description: 'Target interface (e.g. vlan200, ether1)' },
          { name: 'comment', type: 'string', required: false, description: 'Administrative comment' }
        ]
      },
      {
        name: 'mikrotik_list_ip_addresses',
        category: 'IP Address',
        description: 'List all bound IP addresses, networks, interfaces, and dynamic DHCP client flags.',
        cliCommand: () => `/ip address print detail`,
        params: []
      },
      {
        name: 'mikrotik_get_ip_address',
        category: 'IP Address',
        description: 'Get configuration for an IP address bound to a specific interface.',
        cliCommand: (args) => `/ip address print where interface="${args.interface}"`,
        params: [{ name: 'interface', type: 'string', required: true, description: 'Interface name' }]
      },
      {
        name: 'mikrotik_remove_ip_address',
        category: 'IP Address',
        description: 'Unbind and remove an IP address from an interface.',
        cliCommand: (args) => `/ip address remove [find address="${args.address}"]`,
        params: [{ name: 'address', type: 'string', required: true, description: 'Target IP with CIDR' }],
        isSafeModeSensitive: true
      }
    ]
  },
  {
    id: 'dns',
    name: 'DNS',
    toolCount: 15,
    badge: '15 tools',
    description: 'Static records, regexp blocklists, cache + statistics, DoH, and query testing.',
    tools: [
      {
        name: 'mikrotik_get_dns_settings',
        category: 'DNS',
        description: 'Read general RouterOS DNS resolver settings, active upstream servers, and cache limits.',
        cliCommand: () => `/ip dns print`,
        params: []
      },
      {
        name: 'mikrotik_set_upstream_dns',
        category: 'DNS',
        description: 'Configure primary and secondary upstream DNS resolvers (e.g. 1.1.1.1, 8.8.8.8).',
        cliCommand: (args) => `/ip dns set servers=${args.servers} allow-remote-requests=${args.allow_remote_requests !== false ? 'yes' : 'no'}`,
        params: [
          { name: 'servers', type: 'string', required: true, description: 'Comma-separated upstream DNS IPs (e.g. 1.1.1.1,8.8.8.8)' },
          { name: 'allow_remote_requests', type: 'boolean', required: false, description: 'Act as caching recursive resolver for LAN' }
        ]
      },
      {
        name: 'mikrotik_get_dns_stats',
        category: 'DNS',
        description: 'Inspect DNS cache hit ratio, memory usage, forwarder response latency, and active queries.',
        cliCommand: () => `/ip dns print stats`,
        params: []
      },
      {
        name: 'mikrotik_flush_dns_cache',
        category: 'DNS',
        description: 'Flush the local RouterOS DNS resolver cache memory.',
        cliCommand: () => `/ip dns cache flush`,
        params: []
      },
      {
        name: 'mikrotik_list_dns_cache',
        category: 'DNS',
        description: 'List active cached domain names, record types, remaining TTLs, and resolved addresses.',
        cliCommand: () => `/ip dns cache print detail`,
        params: []
      },
      {
        name: 'mikrotik_get_dns_cache_entry',
        category: 'DNS',
        description: 'Query specific cached domain entry or IP address in resolver memory.',
        cliCommand: (args) => `/ip dns cache print where name~"${args.name}"`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Domain name substring or IP' }]
      },
      {
        name: 'mikrotik_list_dns_static',
        category: 'DNS',
        description: 'List all static internal DNS A/AAAA records, CNAME aliases, and custom sinkholes.',
        cliCommand: () => `/ip dns static print detail`,
        params: []
      },
      {
        name: 'mikrotik_add_dns_static',
        category: 'DNS',
        description: 'Add an internal static DNS A/AAAA record or host mapping.',
        cliCommand: (args) => `/ip dns static add name=${args.name} address=${args.address} ${args.ttl ? `ttl=${args.ttl}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'FQDN (e.g. portal.internal.corp)' },
          { name: 'address', type: 'string', required: true, description: 'Target IP address (e.g. 192.168.10.5)' },
          { name: 'ttl', type: 'string', required: false, description: 'Time To Live (default 1d)' },
          { name: 'comment', type: 'string', required: false, description: 'Record comment' }
        ]
      },
      {
        name: 'mikrotik_get_dns_static',
        category: 'DNS',
        description: 'Get properties of a specific static DNS record by name.',
        cliCommand: (args) => `/ip dns static print where name="${args.name}"`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Exact domain name' }]
      },
      {
        name: 'mikrotik_update_dns_static',
        category: 'DNS',
        description: 'Update target address, TTL, or comment of an existing static DNS record.',
        cliCommand: (args) => `/ip dns static set [find name="${args.name}"] address=${args.address} ${args.ttl ? `ttl=${args.ttl}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Existing domain name' },
          { name: 'address', type: 'string', required: true, description: 'New IP address' },
          { name: 'ttl', type: 'string', required: false, description: 'New TTL' },
          { name: 'comment', type: 'string', required: false, description: 'New comment' }
        ]
      },
      {
        name: 'mikrotik_remove_dns_static',
        category: 'DNS',
        description: 'Delete a static DNS record by domain name.',
        cliCommand: (args) => `/ip dns static remove [find name="${args.name}"]`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Target domain name' }]
      },
      {
        name: 'mikrotik_add_dns_cname',
        category: 'DNS',
        description: 'Add a static DNS CNAME alias pointing to a canonical hostname.',
        cliCommand: (args) => `/ip dns static add name=${args.alias} cname=${args.target} type=CNAME comment="${args.comment || 'CNAME Alias'}"`,
        params: [
          { name: 'alias', type: 'string', required: true, description: 'Alias hostname (e.g. docs.local)' },
          { name: 'target', type: 'string', required: true, description: 'Canonical target (e.g. portal.internal.corp)' },
          { name: 'comment', type: 'string', required: false, description: 'Documentation note' }
        ]
      },
      {
        name: 'mikrotik_add_dns_adblock_regexp',
        category: 'DNS',
        description: 'Add a regex sinkhole rule to block telemetry/ads (NXDOMAIN response).',
        cliCommand: (args) => `/ip dns static add regexp="${args.pattern}" type=NXDOMAIN comment="${args.comment || 'AdBlock Sinkhole'}"`,
        params: [
          { name: 'pattern', type: 'string', required: true, description: 'Regular expression pattern (e.g. (.*\\.)?telemetry\\.apple\\.com)' },
          { name: 'comment', type: 'string', required: false, description: 'Adblock list or note' }
        ]
      },
      {
        name: 'mikrotik_set_dns_doh_server',
        category: 'DNS',
        description: 'Configure encrypted DNS-over-HTTPS (DoH) resolver endpoint with certificate verification.',
        cliCommand: (args) => `/ip dns set use-doh-server="${args.doh_url || 'https://cloudflare-dns.com/dns-query'}" verify-doh-cert=${args.verify_cert !== false ? 'yes' : 'no'}`,
        params: [
          { name: 'doh_url', type: 'string', required: true, description: 'DoH endpoint URL (e.g. https://cloudflare-dns.com/dns-query)' },
          { name: 'verify_cert', type: 'boolean', required: false, description: 'Enforce SSL root certificate validation' }
        ]
      },
      {
        name: 'mikrotik_test_dns_query',
        category: 'DNS',
        description: 'Execute a DNS resolution query test directly from RouterOS to test reachability.',
        cliCommand: (args) => `/put [:resolve ${args.domain || 'mikrotik.com'} ${args.server ? `server=${args.server}` : ''}]`,
        params: [
          { name: 'domain', type: 'string', required: true, description: 'Domain name to resolve' },
          { name: 'server', type: 'string', required: false, description: 'Specific DNS server IP to query' }
        ]
      }
    ]
  },
  {
    id: 'routes',
    name: 'Routes',
    toolCount: 14,
    badge: '14 tools',
    description: 'Static, default, blackhole. Active filters, table + cache inspection, path checks.',
    tools: [
      {
        name: 'mikrotik_add_route',
        category: 'Routes',
        description: 'Add a static route to the routing table.',
        cliCommand: (args) => `/ip route add dst-address=${args.dst_address || '0.0.0.0/0'} gateway=${args.gateway} ${args.distance ? `distance=${args.distance}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'dst_address', type: 'string', required: true, description: 'Destination CIDR (e.g. 0.0.0.0/0 or 10.0.0.0/8)' },
          { name: 'gateway', type: 'string', required: true, description: 'Next-hop IP or interface' },
          { name: 'distance', type: 'number', required: false, description: 'Administrative distance (metric)' },
          { name: 'comment', type: 'string', required: false, description: 'Route label' }
        ],
        isSafeModeSensitive: true
      },
      {
        name: 'mikrotik_list_routes',
        category: 'Routes',
        description: 'Display active routing table with next-hop reachability and status flags.',
        cliCommand: () => `/ip route print detail where active=yes`,
        params: []
      },
      {
        name: 'mikrotik_check_route_path',
        category: 'Routes',
        description: 'Check best-matching route and egress interface for an IP destination.',
        cliCommand: (args) => `/ip route check ${args.target_ip}`,
        params: [{ name: 'target_ip', type: 'string', required: true, description: 'Target destination IP' }]
      },
      {
        name: 'mikrotik_add_blackhole_route',
        category: 'Routes',
        description: 'Null-route (blackhole) malicious IP addresses or unwanted bogons.',
        cliCommand: (args) => `/ip route add dst-address=${args.subnet} type=blackhole comment="${args.comment || 'Blackhole'}"`,
        params: [
          { name: 'subnet', type: 'string', required: true, description: 'Target subnet to drop' },
          { name: 'comment', type: 'string', required: false, description: 'Reason for blackhole' }
        ]
      }
    ]
  },
  {
    id: 'wireguard',
    name: 'WireGuard',
    toolCount: 15,
    badge: '15 tools',
    description: 'Interfaces, peers, key management, client-config generation, allowed-IPs.',
    tools: [
      {
        name: 'mikrotik_create_wireguard_interface',
        category: 'WireGuard',
        description: 'Create a WireGuard VPN tunnel endpoint with auto-generated public/private keypair.',
        cliCommand: (args) => `/interface wireguard add name=${args.name || 'wg0'} listen-port=${args.listen_port || 13231} comment="${args.comment || 'WireGuard VPN'}"`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Interface name (e.g. wg0)' },
          { name: 'listen_port', type: 'number', required: false, description: 'UDP listening port (default 13231)' },
          { name: 'comment', type: 'string', required: false, description: 'Tunnel description' }
        ]
      },
      {
        name: 'mikrotik_add_wireguard_peer',
        category: 'WireGuard',
        description: 'Register a client device or remote gateway peer with allowed IP ranges.',
        cliCommand: (args) => `/interface wireguard peers add interface=${args.interface || 'wg0'} public-key="${args.public_key || 'CL13NT_PUB_K3Y='}" allowed-address=${args.allowed_address || '10.0.0.2/32'} ${args.endpoint_address ? `endpoint-address=${args.endpoint_address}` : ''} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'interface', type: 'string', required: true, description: 'WireGuard interface name' },
          { name: 'public_key', type: 'string', required: true, description: 'Peer Curve25519 public key' },
          { name: 'allowed_address', type: 'string', required: true, description: 'Allowed tunnel IP or CIDR (e.g. 10.0.0.2/32)' },
          { name: 'endpoint_address', type: 'string', required: false, description: 'Remote gateway IP for site-to-site' },
          { name: 'comment', type: 'string', required: false, description: 'Device name (e.g. John-iPhone)' }
        ]
      },
      {
        name: 'mikrotik_generate_wireguard_client_config',
        category: 'WireGuard',
        description: 'Generate complete ready-to-import .conf file for iPhone/Android/macOS WireGuard clients.',
        cliCommand: (args) => `# Export client .conf profile for peer ${args.peer_name || 'client'}`,
        params: [
          { name: 'interface', type: 'string', required: true, description: 'Tunnel name' },
          { name: 'peer_ip', type: 'string', required: true, description: 'Client tunnel IP (e.g. 10.0.0.2/24)' },
          { name: 'endpoint', type: 'string', required: true, description: 'Public WAN IP or DDNS hostname' }
        ]
      },
      {
        name: 'mikrotik_list_wireguard_peers',
        category: 'WireGuard',
        description: 'List active peers, latest handshake timestamps, and transfer RX/TX stats.',
        cliCommand: () => `/interface wireguard peers print detail`,
        params: []
      }
    ]
  },
  {
    id: 'queues',
    name: 'Queues',
    toolCount: 19,
    badge: '19 tools',
    description: 'Simple queues, queue trees, queue types. Rate limit per VLAN, per client.',
    tools: [
      {
        name: 'mikrotik_create_simple_queue',
        category: 'Queues',
        description: 'Apply bandwidth throttling and bandwidth caps on a subnet, client IP, or VLAN.',
        cliCommand: (args) => `/queue simple add name=${args.name} target=${args.target} max-limit=${args.max_limit_upload || '10M'}/${args.max_limit_download || '20M'} ${args.comment ? `comment="${args.comment}"` : ''}`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Queue name (e.g. guest-vlan-limit)' },
          { name: 'target', type: 'string', required: true, description: 'Target CIDR or interface (e.g. 192.168.200.0/24 or vlan200)' },
          { name: 'max_limit_upload', type: 'string', required: true, description: 'Upload cap (e.g. 10M, 512k)' },
          { name: 'max_limit_download', type: 'string', required: true, description: 'Download cap (e.g. 20M, 2M)' },
          { name: 'comment', type: 'string', required: false, description: 'Bandwidth policy explanation' }
        ]
      },
      {
        name: 'mikrotik_list_simple_queues',
        category: 'Queues',
        description: 'List all active bandwidth limiter queues and current packet drop counters.',
        cliCommand: () => `/queue simple print detail`,
        params: []
      },
      {
        name: 'mikrotik_set_queue_burst',
        category: 'Queues',
        description: 'Configure high-speed burst allowances for page loads before sustained throttling.',
        cliCommand: (args) => `/queue simple set [find name="${args.name}"] burst-limit=${args.burst_upload}/${args.burst_download} burst-threshold=${args.threshold} burst-time=8s`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Queue name' },
          { name: 'burst_upload', type: 'string', required: true, description: 'Burst upload (e.g. 30M)' },
          { name: 'burst_download', type: 'string', required: true, description: 'Burst download (e.g. 50M)' },
          { name: 'threshold', type: 'string', required: true, description: 'Average threshold rate' }
        ]
      }
    ]
  },
  {
    id: 'users',
    name: 'Users',
    toolCount: 18,
    badge: '18 tools',
    description: 'Local accounts, groups, policies, active sessions, SSH keys, exports.',
    tools: [
      {
        name: 'mikrotik_create_user',
        category: 'Users',
        description: 'Create a local RouterOS administrative or read-only operator account.',
        cliCommand: (args) => `/user add name=${args.username} group=${args.group || 'read'} password="${args.password || 'TemporaryPassword123!'}" ${args.allowed_address ? `allowed-address=${args.allowed_address}` : ''}`,
        params: [
          { name: 'username', type: 'string', required: true, description: 'Account username' },
          { name: 'group', type: 'string', required: true, enum: ['full', 'read', 'write'], description: 'Permission policy group' },
          { name: 'password', type: 'string', required: true, description: 'Initial account password' },
          { name: 'allowed_address', type: 'string', required: false, description: 'Subnet restriction (e.g. 192.168.10.0/24)' }
        ]
      },
      {
        name: 'mikrotik_list_active_sessions',
        category: 'Users',
        description: 'Inspect live logged-in WinBox, WebFig, and SSH administrator sessions.',
        cliCommand: () => `/user active print`,
        params: []
      },
      {
        name: 'mikrotik_add_ssh_key',
        category: 'Users',
        description: 'Import authorized public SSH key for passwordless automation.',
        cliCommand: (args) => `/user ssh-keys import public-key-file="${args.key_file}" user=${args.username}`,
        params: [
          { name: 'username', type: 'string', required: true, description: 'User account' },
          { name: 'key_file', type: 'string', required: true, description: 'Key filename on flash' }
        ]
      }
    ]
  },
  {
    id: 'backup-export',
    name: 'Backup & Export',
    toolCount: 10,
    badge: '10 tools',
    description: 'Binary backups, .rsc configuration exports, section dumps, file transfer, restore.',
    tools: [
      {
        name: 'mikrotik_export_rsc',
        category: 'Backup & Export',
        description: 'Generate a human-readable RouterOS CLI script export (.rsc) of current config.',
        cliCommand: (args) => `/export file=${args.filename || 'backup-config'} ${args.hide_passwords !== false ? 'hide-sensitive' : ''}`,
        params: [
          { name: 'filename', type: 'string', required: false, description: 'Target filename without extension' },
          { name: 'hide_passwords', type: 'boolean', required: false, description: 'Redact passwords and secrets' }
        ]
      },
      {
        name: 'mikrotik_create_binary_backup',
        category: 'Backup & Export',
        description: 'Create a full encrypted binary .backup file including SSL certificates and keys.',
        cliCommand: (args) => `/system backup save name=${args.filename || 'full-backup'} ${args.password ? `password="${args.password}"` : ''}`,
        params: [
          { name: 'filename', type: 'string', required: false, description: 'Backup name' },
          { name: 'password', type: 'string', required: false, description: 'AES-256 encryption password' }
        ]
      },
      {
        name: 'mikrotik_list_storage_files',
        category: 'Backup & Export',
        description: 'List files stored on internal flash / disk partitions.',
        cliCommand: () => `/file print`,
        params: []
      }
    ]
  },
  {
    id: 'logs',
    name: 'Logs',
    toolCount: 10,
    badge: '10 tools',
    description: 'Stream, filter by topic or severity, search, statistics, export, live monitor.',
    tools: [
      {
        name: 'mikrotik_get_logs',
        category: 'Logs',
        description: 'Retrieve recent system logs with topic filters and severity checks.',
        cliCommand: (args) => `/log print ${args.topic ? `where topics~"${args.topic}"` : ''}`,
        params: [
          { name: 'topic', type: 'string', required: false, description: 'Topic filter (e.g. firewall, wireless, dhcp, critical)' },
          { name: 'limit', type: 'number', required: false, description: 'Maximum log lines to return' }
        ]
      },
      {
        name: 'mikrotik_set_syslog_server',
        category: 'Logs',
        description: 'Forward RouterOS syslog messages to remote SIEM or logstash server.',
        cliCommand: (args) => `/system logging action add name=remote-siem target=remote remote=${args.remote_ip} remote-port=${args.port || 514}`,
        params: [
          { name: 'remote_ip', type: 'string', required: true, description: 'Syslog server IP' },
          { name: 'port', type: 'number', required: false, description: 'UDP port (default 514)' }
        ]
      }
    ]
  },
  {
    id: 'wireless',
    name: 'Wireless',
    toolCount: 18,
    badge: '18 tools',
    description: 'Interfaces, security profiles, access lists, network scan, registration table.',
    tools: [
      {
        name: 'mikrotik_scan_wireless',
        category: 'Wireless',
        description: 'Perform active RF spectral survey and neighbor AP scan on a wireless interface.',
        cliCommand: (args) => `/interface wifi scan ${args.interface || 'wifi1'} duration=5s`,
        params: [{ name: 'interface', type: 'string', required: true, description: 'Radio interface name' }]
      },
      {
        name: 'mikrotik_get_wifi_clients',
        category: 'Wireless',
        description: 'List associated WiFi stations, RSSI signal levels, TX/RX PHY rates, and CCQ.',
        cliCommand: () => `/interface wifi registration-table print detail`,
        params: []
      },
      {
        name: 'mikrotik_set_wifi_security_profile',
        category: 'Wireless',
        description: 'Create WPA3-Personal or Enterprise authentication profile.',
        cliCommand: (args) => `/interface wifi security add name=${args.name} authentication-types=wpa3-psk passphrase="${args.passphrase}"`,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Profile name' },
          { name: 'passphrase', type: 'string', required: true, description: 'Pre-shared key' }
        ]
      }
    ]
  },
  {
    id: 'interfaces',
    name: 'Interfaces',
    toolCount: 4,
    badge: '4 tools',
    description: 'List, get, enable, disable any interface — physical or virtual.',
    tools: [
      {
        name: 'mikrotik_list_interfaces',
        category: 'Interfaces',
        description: 'List all physical and virtual interfaces with link speeds and state.',
        cliCommand: () => `/interface print detail`,
        params: []
      },
      {
        name: 'mikrotik_enable_interface',
        category: 'Interfaces',
        description: 'Enable an interface port.',
        cliCommand: (args) => `/interface enable ${args.name}`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Interface name' }]
      },
      {
        name: 'mikrotik_disable_interface',
        category: 'Interfaces',
        description: 'Administratively shut down an interface.',
        cliCommand: (args) => `/interface disable ${args.name}`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Interface name' }],
        isSafeModeSensitive: true
      },
      {
        name: 'mikrotik_get_interface_counters',
        category: 'Interfaces',
        description: 'Retrieve real-time rx/tx byte counters, packet errors, and drops.',
        cliCommand: (args) => `/interface print stats where name="${args.name}"`,
        params: [{ name: 'name', type: 'string', required: true, description: 'Interface name' }]
      }
    ]
  },
  {
    id: 'ipv6',
    name: 'IPv6 Address',
    toolCount: 4,
    badge: '4 tools',
    description: 'IPv6 bindings under /ipv6 — advertise, EUI-64, prefix delegation, global vs link-local.',
    tools: [
      {
        name: 'mikrotik_add_ipv6_address',
        category: 'IPv6 Address',
        description: 'Assign a static IPv6 global or link-local address with prefix.',
        cliCommand: (args) => `/ipv6 address add address=${args.address} interface=${args.interface} advertise=${args.advertise !== false ? 'yes' : 'no'}`,
        params: [
          { name: 'address', type: 'string', required: true, description: 'IPv6 with prefix (e.g. 2001:db8::1/64)' },
          { name: 'interface', type: 'string', required: true, description: 'Interface name' },
          { name: 'advertise', type: 'boolean', required: false, description: 'Send Router Advertisements (SLAAC)' }
        ]
      },
      {
        name: 'mikrotik_list_ipv6_addresses',
        category: 'IPv6 Address',
        description: 'List all active IPv6 bindings, SLAAC autoconfig, and prefix delegations.',
        cliCommand: () => `/ipv6 address print detail`,
        params: []
      }
    ]
  },
  {
    id: 'poe',
    name: 'PoE',
    toolCount: 3,
    badge: '3 tools',
    description: 'Power-over-Ethernet monitoring — live PoE-out voltage, current, power, and per-port settings.',
    tools: [
      {
        name: 'mikrotik_get_poe_status',
        category: 'PoE',
        description: 'Inspect live PoE-Out telemetry: voltage (V), current (mA), and power (Watts) per port.',
        cliCommand: () => `/interface ethernet poe print detail`,
        params: []
      },
      {
        name: 'mikrotik_set_poe_mode',
        category: 'PoE',
        description: 'Configure PoE-Out mode (auto-on, forced-on, off) and power priority.',
        cliCommand: (args) => `/interface ethernet poe set ${args.port || 'ether2'} poe-out=${args.mode || 'auto-on'} priority=${args.priority || 10}`,
        params: [
          { name: 'port', type: 'string', required: true, description: 'Ethernet port name (e.g. ether2)' },
          { name: 'mode', type: 'string', required: true, enum: ['auto-on', 'forced-on', 'off'], description: 'Power state' },
          { name: 'priority', type: 'number', required: false, description: 'Load-shedding priority' }
        ]
      },
      {
        name: 'mikrotik_power_cycle_poe_port',
        category: 'PoE',
        description: 'Power-cycle an attached IP camera, access point, or VoIP phone by cutting PoE for 5s.',
        cliCommand: (args) => `/interface ethernet poe power-cycle ${args.port} duration=5s`,
        params: [{ name: 'port', type: 'string', required: true, description: 'Target port' }]
      }
    ]
  },
  {
    id: 'inventory',
    name: 'Fleet Inventory',
    toolCount: 4,
    badge: 'fleet',
    description: 'One server, many routers — a YAML fleet inventory with per-device targeting via device parameter.',
    tools: [
      {
        name: 'mikrotik_select_fleet_device',
        category: 'Fleet Inventory',
        description: 'Target a specific router across the fleet inventory for subsequent MCP commands.',
        cliCommand: (args) => `# Target device set to "${args.device || 'edge-router-core'}" (${args.host || '192.168.88.1'})`,
        params: [
          { name: 'device', type: 'string', required: true, description: 'Target router ID from fleet.yaml' }
        ]
      },
      {
        name: 'mikrotik_list_fleet_devices',
        category: 'Fleet Inventory',
        description: 'List all registered fleet routers, roles, software versions, and SSH endpoints.',
        cliCommand: () => `# Fleet Inventory Query: Returning registered cluster nodes`,
        params: []
      },
      {
        name: 'mikrotik_run_fleet_healthcheck',
        category: 'Fleet Inventory',
        description: 'Probe ping latency, CPU load, and RouterOS firmware status across all fleet devices.',
        cliCommand: () => `# Fleet ping probe: checking status of core, branch, and AP nodes`,
        params: []
      }
    ]
  }
];

// Ensure all categories accurately reflect their exact tool array length in badges and counts
MIKROTIK_MCP_CATEGORIES.forEach(cat => {
  cat.toolCount = cat.tools.length;
  cat.badge = `${cat.tools.length} tools`;
});

export interface CuratedExamplePrompt {
  title: string;
  badge: string;
  prompt: string;
  toolsSequence: Array<{
    tool: string;
    args: any;
    cli: string;
    description: string;
  }>;
  summary: string;
}

export const CURATED_EXAMPLE_PROMPTS: CuratedExamplePrompt[] = [
  {
    title: 'Guest VLAN with DHCP Pool & Masquerade (Official Docs Example)',
    badge: 'Classic 4-Tool Chain',
    prompt: 'Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool from .10 to .100, and masquerade out to WAN.',
    toolsSequence: [
      {
        tool: 'mikrotik_create_vlan_interface',
        args: { name: 'vlan200', vlan_id: 200, interface: 'ether1' },
        cli: '/interface vlan add name=vlan200 vlan-id=200 interface=ether1',
        description: 'vlan200 created on ether1 · tag 200'
      },
      {
        tool: 'mikrotik_add_ip_address',
        args: { address: '192.168.200.1/24', interface: 'vlan200' },
        cli: '/ip address add address=192.168.200.1/24 interface=vlan200',
        description: '192.168.200.1/24 bound to vlan200'
      },
      {
        tool: 'mikrotik_create_dhcp_pool',
        args: { name: 'pool-200', ranges: '192.168.200.10-192.168.200.100' },
        cli: '/ip pool add name=pool-200 ranges=192.168.200.10-192.168.200.100',
        description: 'Pool "pool-200" · 91 addresses'
      },
      {
        tool: 'mikrotik_create_nat_rule',
        args: { chain: 'srcnat', action: 'masquerade', out_interface: 'ether1' },
        cli: '/ip firewall nat add chain=srcnat action=masquerade out-interface=ether1',
        description: 'NAT rule added at index 0'
      }
    ],
    summary: 'Guest VLAN is live. vlan200 created with 802.1Q tag 200, gateway 192.168.200.1/24 established, DHCP pool pool-200 configured with 91 available addresses, and outbound masquerade NAT enabled on uplink. Want me to set a rate limit?'
  },
  {
    title: 'Management Port 22 Lockdown with Safe-Mode Session',
    badge: 'Safe-Mode Aware',
    prompt: 'Enable safe-mode, allow port 22 on input chain for management from 192.168.10.0/24 only, drop all other management input, and commit safe-mode.',
    toolsSequence: [
      {
        tool: 'mikrotik_safe_mode_enable',
        args: { session_timeout: 300 },
        cli: '# [SAFE-MODE ARMED] Changes will revert automatically on disconnect',
        description: 'Safe-mode session armed'
      },
      {
        tool: 'mikrotik_create_filter_rule',
        args: { chain: 'input', action: 'accept', protocol: 'tcp', dst_port: 22, src_address: '192.168.10.0/24', comment: 'Permit SSH from Corporate Admin Subnet' },
        cli: '/ip firewall filter add chain=input action=accept protocol=tcp dst-port=22 src-address=192.168.10.0/24 comment="Permit SSH from Corporate Admin Subnet"',
        description: 'Rule added: Allow SSH from 192.168.10.0/24'
      },
      {
        tool: 'mikrotik_create_filter_rule',
        args: { chain: 'input', action: 'drop', protocol: 'tcp', dst_port: 22, comment: 'Block unauthorized SSH from untrusted zones' },
        cli: '/ip firewall filter add chain=input action=drop protocol=tcp dst-port=22 comment="Block unauthorized SSH from untrusted zones"',
        description: 'Rule added: Drop SSH from all other subnets'
      },
      {
        tool: 'mikrotik_safe_mode_commit',
        args: {},
        cli: '# [SAFE-MODE COMMITTED] Changes written permanently to NVRAM',
        description: 'Safe-mode committed successfully'
      }
    ],
    summary: 'Safe-mode session armed and committed. Port 22 SSH input is now restricted strictly to administrators on 192.168.10.0/24, with all other ingress dropped.'
  },
  {
    title: 'WireGuard Tunnel wg0 with Client Peer for Mobile Device',
    badge: 'VPN Hub',
    prompt: 'Create WireGuard tunnel wg0 on port 13231, bind 10.0.0.1/24, and add a peer for iPhone (10.0.0.2/32).',
    toolsSequence: [
      {
        tool: 'mikrotik_create_wireguard_interface',
        args: { name: 'wg0', listen_port: 13231, comment: 'Remote Worker WireGuard Gateway' },
        cli: '/interface wireguard add name=wg0 listen-port=13231 comment="Remote Worker WireGuard Gateway"',
        description: 'WireGuard interface wg0 initialized on port 13231'
      },
      {
        tool: 'mikrotik_add_ip_address',
        args: { address: '10.0.0.1/24', interface: 'wg0', comment: 'WireGuard Gateway IP' },
        cli: '/ip address add address=10.0.0.1/24 interface=wg0 comment="WireGuard Gateway IP"',
        description: '10.0.0.1/24 bound to wg0'
      },
      {
        tool: 'mikrotik_add_wireguard_peer',
        args: { interface: 'wg0', public_key: 'hK9w89pX+3LmQjN1F8sT2uVwXyZaBcDeFgHiJkLmNoP=', allowed_address: '10.0.0.2/32', comment: 'iPhone Mobile Client' },
        cli: '/interface wireguard peers add interface=wg0 public-key="hK9w89pX+3LmQjN1F8sT2uVwXyZaBcDeFgHiJkLmNoP=" allowed-address=10.0.0.2/32 comment="iPhone Mobile Client"',
        description: 'Peer iPhone (10.0.0.2/32) registered to wg0'
      }
    ],
    summary: 'WireGuard VPN interface wg0 created on listening port 13231 with internal address 10.0.0.1/24. Client peer registered for iPhone with allowed-address 10.0.0.2/32.'
  },
  {
    title: 'Simple Queue Bandwidth Cap & DNS Cache Refresh',
    badge: 'QoS & DNS',
    prompt: 'Set simple queue rate limit 20M download and 10M upload on vlan20-guest and flush the DNS cache.',
    toolsSequence: [
      {
        tool: 'mikrotik_create_simple_queue',
        args: { name: 'queue-guest-limit', target: '192.168.20.0/24', max_limit_upload: '10M', max_limit_download: '20M', comment: 'Guest Subnet Bandwidth Shaping' },
        cli: '/queue simple add name=queue-guest-limit target=192.168.20.0/24 max-limit=10M/20M comment="Guest Subnet Bandwidth Shaping"',
        description: 'Queue "queue-guest-limit" active (10M/20M cap)'
      },
      {
        tool: 'mikrotik_flush_dns_cache',
        args: {},
        cli: '/ip dns cache flush',
        description: 'RouterOS DNS resolver cache flushed'
      }
    ],
    summary: 'Bandwidth rate limit established on 192.168.20.0/24 capped at 20 Mbps download and 10 Mbps upload. RouterOS local DNS cache has been flushed clean.'
  }
];
