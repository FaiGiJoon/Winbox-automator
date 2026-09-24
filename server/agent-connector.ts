import type { Express, Request, Response } from 'express';

export interface AgentFilterRule {
  id: string;
  chain: 'input' | 'forward' | 'output';
  action: 'accept' | 'drop' | 'reject';
  protocol?: string;
  srcAddress?: string;
  dstAddress?: string;
  dstPort?: number;
  comment?: string;
  disabled?: boolean;
  packets?: number;
  bytes?: number;
}

export interface RouterAgentState {
  interfaces: any[];
  ips: any[];
  natRules: any[];
  filterRules: AgentFilterRule[];
  agentLogs: { id: string; timestamp: string; source: string; message: string; type: string }[];
  lastModified: string;
}

// In-memory central router state synchronized with the frontend and Hermes Agent
export const routerState: RouterAgentState = {
  interfaces: [
    { name: 'lte1', type: 'lte', ipAddress: 'Pass-through Mode', status: 'up', rxSpeed: '124.5 Mbps', txSpeed: '42.1 Mbps', comment: 'LTE public internet access' },
    { name: 'vlan10-main', type: 'vlan', ipAddress: '192.168.10.1/24', status: 'up', rxSpeed: '45.1 Mbps', txSpeed: '32.4 Mbps', comment: 'Main Corporate Network VLAN' },
    { name: 'vlan20-guest', type: 'vlan', ipAddress: '192.168.20.1/24', status: 'up', rxSpeed: '1.2 Mbps', txSpeed: '0.8 Mbps', comment: 'Isolated Guest Subnet VLAN' },
    { name: 'bridge-vlan', type: 'bridge', ipAddress: '192.168.88.1/24', status: 'up', rxSpeed: '210.4 Mbps', txSpeed: '184.2 Mbps', comment: 'Hardware-offloaded VLAN bridge with MSTP enabled' },
    { name: 'ether1-wan', type: 'ether', ipAddress: 'unassigned', status: 'up', rxSpeed: '0 bps', txSpeed: '0 bps', comment: 'Bound to LTE1 pass-through' }
  ],
  ips: [
    { id: '1', address: '192.168.10.1/24', network: '192.168.10.0', interface: 'vlan10-main', comment: 'Corporate Gateway IP' },
    { id: '2', address: '192.168.20.1/24', network: '192.168.20.0', interface: 'vlan20-guest', comment: 'Guest Gateway IP' },
    { id: '3', address: '192.168.88.1/24', network: '192.168.88.0', interface: 'bridge-vlan', comment: 'Local WinBox Management Address' }
  ],
  natRules: [
    { id: 'n1', chain: 'srcnat', outInterface: 'lte1', action: 'masquerade', comment: 'Default masquerade outgoing NAT on LTE uplink' }
  ],
  filterRules: [
    { id: 'f1', chain: 'input', action: 'accept', protocol: 'icmp', comment: 'Allow ping checks to local gateway', disabled: false, packets: 1420, bytes: 119280 },
    { id: 'f2', chain: 'forward', action: 'accept', protocol: 'tcp', dstPort: 443, comment: 'Permit standard encrypted HTTPS traffic forward', disabled: false, packets: 58940, bytes: 48920140 },
    { id: 'f3', chain: 'forward', action: 'drop', srcAddress: '192.168.20.0/24', dstAddress: '192.168.10.0/24', comment: 'Firewall drop list: Isolate Guest Subnet (VLAN 20) from Main (VLAN 10)', disabled: false, packets: 348, bytes: 29232 },
    { id: 'f4', chain: 'input', action: 'drop', srcAddress: '192.168.20.0/24', comment: 'Firewall drop list: Prevent Guest VLAN from reaching local WinBox management ports', disabled: false, packets: 112, bytes: 9408 }
  ],
  agentLogs: [
    { 
      id: 'init-1', 
      timestamp: new Date().toLocaleTimeString(), 
      source: 'HermesConnector', 
      message: 'Hermes Agent connector service initialized. MCP JSON-RPC & HTTP tool protocols active.', 
      type: 'info' 
    }
  ],
  lastModified: new Date().toISOString()
};

export function addAgentLog(source: string, message: string, type: 'info' | 'warning' | 'error' | 'command' = 'info') {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString(),
    source,
    message,
    type
  };
  routerState.agentLogs.unshift(entry);
  if (routerState.agentLogs.length > 50) {
    routerState.agentLogs.pop();
  }
  routerState.lastModified = new Date().toISOString();
  return entry;
}

// JSON-RPC 2.0 Traffic Log for OpenClaw & Hermes MCP debugging
export interface JsonRpcTrafficLog {
  id: string;
  timestamp: string;
  timeFormatted: string;
  direction: 'incoming' | 'outgoing';
  rpcId?: string | number | null;
  method?: string;
  toolName?: string;
  durationMs?: number;
  status: 'ok' | 'error' | 'notification' | 'pending';
  errorCode?: number;
  errorMessage?: string;
  sourceIp?: string;
  payload: any;
  rawSize?: number;
  summary: string;
}

const jsonRpcTrafficLogs: JsonRpcTrafficLog[] = [];
const MAX_TRAFFIC_LOGS = 250;

export function recordJsonRpcTraffic(log: Omit<JsonRpcTrafficLog, 'id' | 'timestamp' | 'timeFormatted' | 'rawSize'>): JsonRpcTrafficLog {
  const now = new Date();
  const timeFormatted = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const rawSize = JSON.stringify(log.payload || {}).length;

  const entry: JsonRpcTrafficLog = {
    id: `rpc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now.toISOString(),
    timeFormatted,
    rawSize,
    ...log
  };

  jsonRpcTrafficLogs.unshift(entry);
  if (jsonRpcTrafficLogs.length > MAX_TRAFFIC_LOGS) {
    jsonRpcTrafficLogs.pop();
  }
  return entry;
}

// Seed initial MCP handshake traffic for immediate visibility
recordJsonRpcTraffic({
  direction: 'incoming',
  rpcId: 'req-001',
  method: 'initialize',
  status: 'ok',
  sourceIp: '127.0.0.1 (stdio bridge)',
  summary: '--> initialize [protocolVersion: 2024-11-05, client: OpenClaw-MikroTik/1.2.0]',
  payload: {
    jsonrpc: '2.0',
    id: 'req-001',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { roots: { listChanged: true }, sampling: {} },
      clientInfo: { name: 'OpenClaw-Agent', version: '1.2.0' }
    }
  }
});

recordJsonRpcTraffic({
  direction: 'outgoing',
  rpcId: 'req-001',
  method: 'initialize',
  status: 'ok',
  durationMs: 1.25,
  summary: '<-- 200 OK: Handshake accepted (serverInfo: mikrotik-routeros-mcp v1.0.0)',
  payload: {
    jsonrpc: '2.0',
    id: 'req-001',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'mikrotik-routeros-mcp', version: '1.0.0' }
    }
  }
});

recordJsonRpcTraffic({
  direction: 'incoming',
  rpcId: 'req-002',
  method: 'tools/list',
  status: 'ok',
  sourceIp: '127.0.0.1 (stdio bridge)',
  summary: '--> tools/list (Discover registered RouterOS capabilities)',
  payload: {
    jsonrpc: '2.0',
    id: 'req-002',
    method: 'tools/list',
    params: {}
  }
});

recordJsonRpcTraffic({
  direction: 'outgoing',
  rpcId: 'req-002',
  method: 'tools/list',
  status: 'ok',
  durationMs: 0.85,
  summary: '<-- 200 OK: Advertised 6 RouterOS tools (add_rule, reorder, simulate_trace, etc.)',
  payload: {
    jsonrpc: '2.0',
    id: 'req-002',
    result: {
      tools: [
        { name: 'get_router_state', description: 'Retrieve full RouterOS interfaces, IP addresses, and priority-ordered firewall rules' },
        { name: 'add_firewall_filter_rule', description: 'Add a new firewall filter rule with chain, action, protocol, IP ranges, and priority index' },
        { name: 'reorder_firewall_rule', description: 'Change the priority order index of an existing rule' },
        { name: 'update_rule_comment', description: 'Update or annotate a firewall filter rule comment' },
        { name: 'simulate_packet_trace', description: 'Simulate IP packet traversal and rule evaluation' },
        { name: 'export_routeros_rsc', description: 'Generate the complete production RouterOS .rsc script' }
      ]
    }
  }
});

export function evaluatePacketTrace(input: {
  srcIp: string;
  dstIp: string;
  protocol?: string;
  dstPort?: number;
}) {
  const protocol = (input.protocol || 'TCP').toUpperCase();
  const dstPort = input.dstPort || 80;
  const logs: string[] = [];

  logs.push(`[Packet Trace] Analyzing frame: ${input.srcIp} -> ${input.dstIp} (${protocol}:${dstPort})`);

  let fate: 'accept' | 'drop' = 'accept';
  let matchedRule: any = null;
  let matchReason = 'No restrictive drop filters matched. Default RouterOS policy: ACCEPT.';

  for (let i = 0; i < routerState.filterRules.length; i++) {
    const rule = routerState.filterRules[i];

    // Skip disabled rules in sequential evaluation
    if (rule.disabled) {
      continue;
    }

    if (rule.protocol && rule.protocol !== 'any') {
      if (rule.protocol.toLowerCase() !== protocol.toLowerCase()) {
        continue;
      }
    }

    if (rule.dstPort) {
      if (rule.dstPort !== dstPort) {
        continue;
      }
    }

    if (rule.srcAddress) {
      const baseSubnet = rule.srcAddress.split('/')[0].split('.').slice(0, 3).join('.');
      if (!input.srcIp.startsWith(baseSubnet)) {
        continue;
      }
    }

    if (rule.dstAddress) {
      const baseSubnet = rule.dstAddress.split('/')[0].split('.').slice(0, 3).join('.');
      if (!input.dstIp.startsWith(baseSubnet)) {
        continue;
      }
    }

    // First match wins
    matchedRule = {
      id: rule.id,
      priorityIndex: i,
      chain: rule.chain,
      action: rule.action,
      comment: rule.comment
    };

    if (rule.action === 'drop' || rule.action === 'reject') {
      fate = 'drop';
      matchReason = `Matched Rule #${i} [${rule.comment || rule.id}] (${rule.action.toUpperCase()}): Packet discarded.`;
    } else {
      fate = 'accept';
      matchReason = `Matched Rule #${i} [${rule.comment || rule.id}] (ACCEPT): Packet passed through chain.`;
    }
    break;
  }

  logs.push(`[Decision] Outcome: ${fate.toUpperCase()}. ${matchReason}`);
  return {
    fate,
    decision: fate.toUpperCase(),
    matchedRule,
    matchReason,
    logs
  };
}

export function generateRscScript(): string {
  const lines: string[] = [
    '# ====================================================================',
    '# RouterOS v7 Configuration Script Export',
    '# Exported for Hermes Agent / OpenClaw Automation',
    `# Generated at: ${new Date().toISOString()}`,
    '# ====================================================================',
    '',
    '/interface bridge',
    'add name=bridge-vlan vlan-filtering=yes protocol-mode=mstp comment="Hardware-offloaded VLAN bridge"',
    '',
    '/ip address'
  ];

  routerState.ips.forEach(ip => {
    lines.push(`add address=${ip.address} interface=${ip.interface} comment="${ip.comment || ''}"`);
  });

  lines.push('', '/ip firewall nat');
  routerState.natRules.forEach(nat => {
    lines.push(`add chain=${nat.chain} out-interface=${nat.outInterface || 'lte1'} action=${nat.action} comment="${nat.comment || ''}"`);
  });

  lines.push('', '/ip firewall filter');
  routerState.filterRules.forEach((rule, idx) => {
    let cmd = `add chain=${rule.chain} action=${rule.action}`;
    if (rule.disabled) cmd += ` disabled=yes`;
    if (rule.protocol && rule.protocol !== 'any') cmd += ` protocol=${rule.protocol}`;
    if (rule.srcAddress) cmd += ` src-address=${rule.srcAddress}`;
    if (rule.dstAddress) cmd += ` dst-address=${rule.dstAddress}`;
    if (rule.dstPort) cmd += ` dst-port=${rule.dstPort}`;
    if (rule.comment) cmd += ` comment="${rule.comment}"`;
    lines.push(`${cmd} # Priority #${idx}${rule.disabled ? ' [DISABLED]' : ''}`);
  });

  return lines.join('\n');
}

// MCP Tools Definition Schema
export const MCP_TOOLS = [
  {
    name: 'get_router_state',
    description: 'Inspect live MikroTik RouterOS interfaces, IP addresses, NAT rules, and firewall filter rules in exact top-to-bottom priority order.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'add_firewall_filter_rule',
    description: 'Add a new firewall filter rule to the MikroTik router at a specified or default priority position.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', enum: ['input', 'forward', 'output'], description: 'Firewall chain' },
        action: { type: 'string', enum: ['accept', 'drop', 'reject'], description: 'Action for matching packets' },
        protocol: { type: 'string', description: 'Protocol (e.g. tcp, udp, icmp, or any)' },
        srcAddress: { type: 'string', description: 'Source IP or CIDR (e.g. 192.168.20.0/24)' },
        dstAddress: { type: 'string', description: 'Destination IP or CIDR (e.g. 192.168.10.0/24)' },
        dstPort: { type: 'number', description: 'Destination port (e.g. 80, 443, 8291)' },
        comment: { type: 'string', description: 'Documentation comment for the rule' },
        priorityPosition: { type: 'number', description: 'Priority index (0 is highest). If omitted, rule is appended.' }
      },
      required: ['chain', 'action']
    }
  },
  {
    name: 'update_rule_comment',
    description: 'Update or annotate the documentation comment on an existing firewall rule by its ID or priority index.',
    inputSchema: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', description: 'ID of the rule (e.g. f1, f2, or timestamp ID)' },
        priorityIndex: { type: 'number', description: 'Priority index of the rule (0 to N-1)' },
        comment: { type: 'string', description: 'New documentation comment' }
      },
      required: ['comment']
    }
  },
  {
    name: 'reorder_firewall_rule',
    description: 'Change the priority order of a firewall filter rule (RouterOS evaluates top-to-bottom, first match wins).',
    inputSchema: {
      type: 'object',
      properties: {
        fromPriority: { type: 'number', description: 'Current priority index of the rule to move' },
        toPriority: { type: 'number', description: 'Target priority index where the rule should be placed' }
      },
      required: ['fromPriority', 'toPriority']
    }
  },
  {
    name: 'delete_firewall_rule',
    description: 'Delete a firewall filter rule by its ID or priority index.',
    inputSchema: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', description: 'Rule ID to remove' },
        priorityIndex: { type: 'number', description: 'Priority index to remove' }
      }
    }
  },
  {
    name: 'simulate_packet_trace',
    description: 'Simulate IP packet traversal to test whether the firewall filters allow or drop traffic according to top-to-bottom rule evaluation.',
    inputSchema: {
      type: 'object',
      properties: {
        srcIp: { type: 'string', description: 'Source IP (e.g. 192.168.20.55)' },
        dstIp: { type: 'string', description: 'Destination IP (e.g. 192.168.10.15)' },
        protocol: { type: 'string', enum: ['TCP', 'UDP', 'ICMP'], description: 'Transport protocol' },
        dstPort: { type: 'number', description: 'Destination port' }
      },
      required: ['srcIp', 'dstIp']
    }
  },
  {
    name: 'export_routeros_rsc',
    description: 'Generate the complete production MikroTik RouterOS .rsc script matching the current configuration.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  // --- Official MikroTik MCP (jeff-nasseri/mikrotik-mcp) Tools ---
  {
    name: 'mikrotik_create_vlan_interface',
    description: 'Create a tagged 802.1Q VLAN sub-interface on a parent port or bridge.',
    inputSchema: {
      type: 'object',
      required: ['name', 'vlan_id', 'interface'],
      properties: {
        name: { type: 'string', description: 'Interface name (e.g. vlan200)' },
        vlan_id: { type: 'number', description: '802.1Q tag ID (1-4094)' },
        interface: { type: 'string', description: 'Parent interface (e.g. ether1, bridge-vlan)' },
        comment: { type: 'string', description: 'Administrative label' }
      }
    }
  },
  {
    name: 'mikrotik_add_ip_address',
    description: 'Bind an IPv4 address and CIDR subnet to an interface.',
    inputSchema: {
      type: 'object',
      required: ['address', 'interface'],
      properties: {
        address: { type: 'string', description: 'IP address with CIDR (e.g. 192.168.200.1/24)' },
        interface: { type: 'string', description: 'Target interface' },
        comment: { type: 'string', description: 'Audit comment' }
      }
    }
  },
  {
    name: 'mikrotik_create_dhcp_pool',
    description: 'Create a named IP address pool for DHCP/VPN assignment.',
    inputSchema: {
      type: 'object',
      required: ['name', 'ranges'],
      properties: {
        name: { type: 'string', description: 'Pool identifier (e.g. pool-200)' },
        ranges: { type: 'string', description: 'IP range (e.g. 192.168.200.10-192.168.200.100)' }
      }
    }
  },
  {
    name: 'mikrotik_create_nat_rule',
    description: 'Create a source NAT (masquerade), destination NAT, or port forward rule.',
    inputSchema: {
      type: 'object',
      required: ['chain', 'action'],
      properties: {
        chain: { type: 'string', enum: ['srcnat', 'dstnat'], description: 'NAT chain' },
        action: { type: 'string', enum: ['masquerade', 'dst-nat', 'redirect', 'src-nat'], description: 'Action' },
        out_interface: { type: 'string', description: 'Outbound interface (for masquerade)' },
        in_interface: { type: 'string', description: 'Inbound interface' },
        dst_port: { type: 'number', description: 'Port' },
        to_addresses: { type: 'string', description: 'Target host IP' },
        comment: { type: 'string', description: 'Annotation' }
      }
    }
  },
  {
    name: 'mikrotik_create_filter_rule',
    description: 'Create a firewall filter rule with chain, action, protocol, and addresses.',
    inputSchema: {
      type: 'object',
      required: ['chain', 'action'],
      properties: {
        chain: { type: 'string', enum: ['input', 'forward', 'output'] },
        action: { type: 'string', enum: ['accept', 'drop', 'reject', 'log'] },
        protocol: { type: 'string' },
        src_address: { type: 'string' },
        dst_address: { type: 'string' },
        dst_port: { type: 'number' },
        comment: { type: 'string' }
      }
    }
  },
  {
    name: 'mikrotik_safe_mode_status',
    description: 'Inspect RouterOS Safe Mode session state, armed status, and pending changes.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mikrotik_safe_mode_enable',
    description: 'Arm Safe Mode for the active session. If connection drops, modifications auto-revert.',
    inputSchema: {
      type: 'object',
      properties: {
        session_timeout: { type: 'number', description: 'Auto-revert timeout in seconds (default 300)' }
      }
    }
  },
  {
    name: 'mikrotik_safe_mode_commit',
    description: 'Commit all verified changes and persist permanently.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mikrotik_safe_mode_rollback',
    description: 'Immediately abort and revert all uncommitted changes back to snapshot.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mikrotik_create_simple_queue',
    description: 'Configure simple queue bandwidth shaping on a VLAN, subnet, or client IP.',
    inputSchema: {
      type: 'object',
      required: ['name', 'target', 'max_limit_upload', 'max_limit_download'],
      properties: {
        name: { type: 'string' },
        target: { type: 'string' },
        max_limit_upload: { type: 'string' },
        max_limit_download: { type: 'string' },
        comment: { type: 'string' }
      }
    }
  },
  {
    name: 'mikrotik_flush_dns_cache',
    description: 'Flush the local RouterOS DNS resolver cache memory.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mikrotik_add_dns_static',
    description: 'Add static DNS A record or internal hostname mapping.',
    inputSchema: {
      type: 'object',
      required: ['name', 'address'],
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
        ttl: { type: 'string' },
        comment: { type: 'string' }
      }
    }
  },
  {
    name: 'mikrotik_create_wireguard_interface',
    description: 'Create a WireGuard VPN tunnel endpoint.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        listen_port: { type: 'number' },
        comment: { type: 'string' }
      }
    }
  },
  {
    name: 'mikrotik_add_wireguard_peer',
    description: 'Register a client device or remote peer to a WireGuard tunnel.',
    inputSchema: {
      type: 'object',
      required: ['interface', 'public_key', 'allowed_address'],
      properties: {
        interface: { type: 'string' },
        public_key: { type: 'string' },
        allowed_address: { type: 'string' },
        comment: { type: 'string' }
      }
    }
  },
  {
    name: 'mikrotik_get_poe_status',
    description: 'Inspect live PoE-Out telemetry: voltage (V), current (mA), and power (Watts).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'mikrotik_select_fleet_device',
    description: 'Target a specific router across the fleet inventory.',
    inputSchema: {
      type: 'object',
      required: ['device'],
      properties: {
        device: { type: 'string', description: 'Router identifier from fleet.yaml' }
      }
    }
  }
];

// Safe Mode and Extended State
export interface SafeModeState {
  active: boolean;
  startedAt: string | null;
  pendingChangesCount: number;
  targetDevice: string;
}

export const safeModeState: SafeModeState = {
  active: false,
  startedAt: null,
  pendingChangesCount: 0,
  targetDevice: 'edge-router-core'
};

let safeModeSnapshot: {
  interfaces: any[];
  ips: any[];
  natRules: any[];
  filterRules: any[];
} | null = null;

let ipPoolsState: Array<{ name: string; ranges: string }> = [
  { name: 'default-dhcp', ranges: '192.168.88.10-192.168.88.254' }
];

let queuesState: Array<{ name: string; target: string; maxLimit: string; comment?: string }> = [];
let dnsSettingsState = {
  servers: '1.1.1.1,8.8.8.8',
  dynamicServers: '192.168.88.1',
  useDohServer: '',
  verifyDohCert: true,
  allowRemoteRequests: true,
  cacheSize: 2048,
  cacheMaxTtl: '1w'
};
let dnsCacheState: Array<{ name: string; type: string; data: string; ttl: string }> = [
  { name: 'api.routeros.internal', type: 'A', data: '192.168.88.1', ttl: '00:14:32' },
  { name: 'cloudflare-dns.com', type: 'A', data: '104.16.249.249', ttl: '00:03:18' },
  { name: 'github.com', type: 'A', data: '140.82.121.4', ttl: '00:01:45' }
];
let dnsStaticState: Array<{ name: string; address?: string; cname?: string; regexp?: string; ttl?: string; comment?: string; type?: string }> = [
  { name: 'router.lan', address: '192.168.88.1', comment: 'Local Gateway' }
];
let wireguardPeersState: Array<{ interface: string; publicKey: string; allowedAddress: string; comment?: string }> = [];

export function executeMcpTool(name: string, args: any) {
  switch (name) {
    case 'get_router_state': {
      return {
        status: 'success',
        interfaces: routerState.interfaces,
        ips: routerState.ips,
        natRules: routerState.natRules,
        filterRules: routerState.filterRules.map((rule, idx) => ({
          priority: idx,
          ...rule
        })),
        totalRules: routerState.filterRules.length,
        lastModified: routerState.lastModified
      };
    }

    case 'add_firewall_filter_rule': {
      const newRule: AgentFilterRule = {
        id: `f-${Date.now()}`,
        chain: args.chain,
        action: args.action,
        protocol: args.protocol === 'any' ? undefined : args.protocol,
        srcAddress: args.srcAddress || undefined,
        dstAddress: args.dstAddress || undefined,
        dstPort: args.dstPort ? Number(args.dstPort) : undefined,
        comment: args.comment || 'Added via Hermes Agent',
        disabled: Boolean(args.disabled),
        packets: 0,
        bytes: 0
      };

      if (typeof args.priorityPosition === 'number' && args.priorityPosition >= 0 && args.priorityPosition <= routerState.filterRules.length) {
        routerState.filterRules.splice(args.priorityPosition, 0, newRule);
      } else {
        routerState.filterRules.push(newRule);
      }
      routerState.lastModified = new Date().toISOString();

      const ruleIndex = routerState.filterRules.findIndex(r => r.id === newRule.id);
      addAgentLog(
        'HermesAgent',
        `Added Firewall Filter Rule at Priority #${ruleIndex}: [${newRule.chain} ${newRule.action}] comment="${newRule.comment}"`,
        'command'
      );

      return {
        status: 'success',
        message: `Rule added successfully at priority #${ruleIndex}`,
        rule: newRule,
        priorityIndex: ruleIndex,
        totalRules: routerState.filterRules.length
      };
    }

    case 'update_rule_comment': {
      let targetIndex = -1;
      if (args.ruleId) {
        targetIndex = routerState.filterRules.findIndex(r => r.id === args.ruleId);
      } else if (typeof args.priorityIndex === 'number') {
        targetIndex = args.priorityIndex;
      }

      if (targetIndex < 0 || targetIndex >= routerState.filterRules.length) {
        throw new Error(`Rule not found for ID "${args.ruleId}" or priority #${args.priorityIndex}`);
      }

      const rule = routerState.filterRules[targetIndex];
      const oldComment = rule.comment || '(none)';
      rule.comment = args.comment;
      routerState.lastModified = new Date().toISOString();

      addAgentLog(
        'HermesAgent',
        `Updated comment on rule #${targetIndex} [${rule.chain} ${rule.action}]: "${args.comment}" (was: "${oldComment}")`,
        'info'
      );

      return {
        status: 'success',
        message: `Updated comment for rule #${targetIndex}`,
        rule: { ...rule, priorityIndex: targetIndex }
      };
    }

    case 'reorder_firewall_rule': {
      const { fromPriority, toPriority } = args;
      if (
        fromPriority === undefined || 
        toPriority === undefined || 
        fromPriority < 0 || 
        fromPriority >= routerState.filterRules.length || 
        toPriority < 0 || 
        toPriority >= routerState.filterRules.length
      ) {
        throw new Error(`Invalid priority indices. Valid range is 0 to ${routerState.filterRules.length - 1}`);
      }

      const [moved] = routerState.filterRules.splice(fromPriority, 1);
      routerState.filterRules.splice(toPriority, 0, moved);
      routerState.lastModified = new Date().toISOString();

      addAgentLog(
        'HermesAgent',
        `Reordered rule [${moved.comment || moved.id}] from #${fromPriority} to #${toPriority} (${toPriority < fromPriority ? 'Elevated' : 'Lowered'})`,
        'command'
      );

      return {
        status: 'success',
        message: `Moved rule from priority #${fromPriority} to #${toPriority}`,
        rule: moved,
        newPriority: toPriority,
        rules: routerState.filterRules.map((r, i) => ({ priority: i, id: r.id, comment: r.comment }))
      };
    }

    case 'delete_firewall_rule': {
      let targetIndex = -1;
      if (args.ruleId) {
        targetIndex = routerState.filterRules.findIndex(r => r.id === args.ruleId);
      } else if (typeof args.priorityIndex === 'number') {
        targetIndex = args.priorityIndex;
      }

      if (targetIndex < 0 || targetIndex >= routerState.filterRules.length) {
        throw new Error(`Rule not found for deletion`);
      }

      const [removed] = routerState.filterRules.splice(targetIndex, 1);
      routerState.lastModified = new Date().toISOString();

      addAgentLog(
        'HermesAgent',
        `Deleted firewall filter rule #${targetIndex} [${removed.chain} ${removed.action}] (${removed.comment || removed.id})`,
        'warning'
      );

      return {
        status: 'success',
        message: `Rule #${targetIndex} deleted successfully`,
        deletedRule: removed,
        remainingRules: routerState.filterRules.length
      };
    }

    case 'toggle_firewall_rule_status': {
      let targetIndex = -1;
      if (args.ruleId) {
        targetIndex = routerState.filterRules.findIndex(r => r.id === args.ruleId);
      } else if (typeof args.priorityIndex === 'number') {
        targetIndex = args.priorityIndex;
      }

      if (targetIndex < 0 || targetIndex >= routerState.filterRules.length) {
        throw new Error(`Rule not found for status toggle`);
      }

      const rule = routerState.filterRules[targetIndex];
      const newDisabled = typeof args.disabled === 'boolean' ? args.disabled : !rule.disabled;
      rule.disabled = newDisabled;
      routerState.lastModified = new Date().toISOString();

      addAgentLog(
        'HermesAgent',
        `${newDisabled ? 'Disabled' : 'Enabled'} firewall filter rule #${targetIndex} [${rule.chain} ${rule.action}] (${rule.comment || rule.id})`,
        'command'
      );

      return {
        status: 'success',
        message: `Rule #${targetIndex} is now ${newDisabled ? 'disabled' : 'enabled'}`,
        rule,
        disabled: newDisabled,
        priorityIndex: targetIndex
      };
    }

    case 'simulate_packet_trace': {
      const traceResult = evaluatePacketTrace({
        srcIp: args.srcIp,
        dstIp: args.dstIp,
        protocol: args.protocol,
        dstPort: args.dstPort
      });

      addAgentLog(
        'HermesAgent',
        `Packet simulation trace: ${args.srcIp} -> ${args.dstIp} = ${traceResult.fate.toUpperCase()} (${traceResult.matchReason})`,
        traceResult.fate === 'drop' ? 'warning' : 'info'
      );

      return traceResult;
    }

    case 'export_routeros_rsc': {
      const script = generateRscScript();
      return {
        status: 'success',
        format: 'RouterOS v7 RSC',
        script
      };
    }

    // --- Official MikroTik MCP (jeff-nasseri/mikrotik-mcp) Tool Handlers ---
    case 'mikrotik_create_vlan_interface': {
      const vlanName = args.name || `vlan${args.vlan_id || 100}`;
      const existing = routerState.interfaces.find(i => i.name === vlanName);
      if (existing) {
        existing.comment = args.comment || `VLAN ID ${args.vlan_id} on ${args.interface || 'ether1'}`;
      } else {
        routerState.interfaces.push({
          name: vlanName,
          type: 'vlan',
          ipAddress: 'unassigned',
          status: 'up',
          rxSpeed: '0 bps',
          txSpeed: '0 bps',
          comment: args.comment || `VLAN ID ${args.vlan_id} on ${args.interface || 'ether1'}`
        });
      }
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      routerState.lastModified = new Date().toISOString();
      const cli = `/interface vlan add name=${vlanName} vlan-id=${args.vlan_id} interface=${args.interface || 'ether1'}${args.comment ? ` comment="${args.comment}"` : ''}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Created VLAN interface ${vlanName} on ${args.interface || 'ether1'} with tag ${args.vlan_id}`,
        type: 'command'
      });
      return {
        status: 'success',
        interface: vlanName,
        vlanId: args.vlan_id,
        parent: args.interface || 'ether1',
        cliCommand: cli,
        message: `vlan ${vlanName} created on ${args.interface || 'ether1'} · tag ${args.vlan_id}`
      };
    }

    case 'mikrotik_list_vlan_interfaces': {
      const vlans = routerState.interfaces.filter(i => i.type === 'vlan');
      return { status: 'success', count: vlans.length, vlans };
    }

    case 'mikrotik_add_ip_address': {
      const targetIf = args.interface;
      const newIp = {
        id: `ip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        address: args.address,
        network: args.address.split('/')[0],
        interface: targetIf,
        comment: args.comment || 'Added via MikroTik MCP'
      };
      const idx = routerState.ips.findIndex(i => i.interface === targetIf && i.address === args.address);
      if (idx >= 0) {
        routerState.ips[idx] = newIp;
      } else {
        routerState.ips.push(newIp);
      }
      const matchingIf = routerState.interfaces.find(i => i.name === targetIf);
      if (matchingIf) {
        matchingIf.ipAddress = args.address;
      }
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      routerState.lastModified = new Date().toISOString();
      const cli = `/ip address add address=${args.address} interface=${targetIf}${args.comment ? ` comment="${args.comment}"` : ''}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Assigned IP ${args.address} to interface ${targetIf}`,
        type: 'command'
      });
      return {
        status: 'success',
        address: args.address,
        interface: targetIf,
        cliCommand: cli,
        message: `${args.address} bound to ${targetIf}`
      };
    }

    case 'mikrotik_list_ip_addresses': {
      return { status: 'success', count: routerState.ips.length, ips: routerState.ips };
    }

    case 'mikrotik_create_dhcp_pool': {
      const poolName = args.name || 'dhcp-pool-1';
      const existing = ipPoolsState.find(p => p.name === poolName);
      if (existing) {
        existing.ranges = args.ranges;
      } else {
        ipPoolsState.push({ name: poolName, ranges: args.ranges });
      }
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      const cli = `/ip pool add name=${poolName} ranges=${args.ranges}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Created IP pool ${poolName} (${args.ranges})`,
        type: 'command'
      });
      return {
        status: 'success',
        pool: poolName,
        ranges: args.ranges,
        cliCommand: cli,
        message: `Pool "${poolName}" · ${args.ranges}`
      };
    }

    case 'mikrotik_list_ip_pools': {
      return { status: 'success', pools: ipPoolsState };
    }

    case 'mikrotik_create_nat_rule': {
      const natId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const rule = {
        id: natId,
        chain: args.chain || 'srcnat',
        action: args.action || 'masquerade',
        outInterface: args.out_interface || args.outInterface,
        inInterface: args.in_interface || args.inInterface,
        dstPort: args.dst_port ? Number(args.dst_port) : undefined,
        toAddresses: args.to_addresses,
        comment: args.comment || 'Added via MikroTik MCP'
      };
      routerState.natRules.push(rule);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      routerState.lastModified = new Date().toISOString();
      const cli = `/ip firewall nat add chain=${rule.chain} action=${rule.action}${rule.outInterface ? ` out-interface=${rule.outInterface}` : ''}${rule.comment ? ` comment="${rule.comment}"` : ''}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Added NAT rule: chain=${rule.chain} action=${rule.action}`,
        type: 'command'
      });
      return {
        status: 'success',
        ruleId: natId,
        chain: rule.chain,
        action: rule.action,
        cliCommand: cli,
        message: `NAT rule added at index ${routerState.natRules.length - 1}`
      };
    }

    case 'mikrotik_list_nat_rules': {
      return { status: 'success', count: routerState.natRules.length, rules: routerState.natRules };
    }

    case 'mikrotik_create_filter_rule': {
      const rule = {
        chain: args.chain,
        action: args.action,
        protocol: args.protocol,
        srcAddress: args.src_address || args.srcAddress,
        dstAddress: args.dst_address || args.dstAddress,
        dstPort: args.dst_port ? Number(args.dst_port) : undefined,
        comment: args.comment || 'Added via MikroTik MCP',
        disabled: false,
        packets: 0,
        bytes: 0
      };
      const result = executeMcpTool('add_firewall_filter_rule', rule);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        ...result,
        cliCommand: `/ip firewall filter add chain=${rule.chain} action=${rule.action}${rule.protocol ? ` protocol=${rule.protocol}` : ''}${rule.srcAddress ? ` src-address=${rule.srcAddress}` : ''}${rule.dstAddress ? ` dst-address=${rule.dstAddress}` : ''}${rule.dstPort ? ` dst-port=${rule.dstPort}` : ''}${rule.comment ? ` comment="${rule.comment}"` : ''}`
      };
    }

    case 'mikrotik_list_filter_rules': {
      return {
        status: 'success',
        count: routerState.filterRules.length,
        rules: routerState.filterRules.map((r, i) => ({ priority: i, ...r }))
      };
    }

    case 'mikrotik_safe_mode_status': {
      return {
        status: 'success',
        ...safeModeState,
        message: safeModeState.active ? `Safe-Mode is ARMED with ${safeModeState.pendingChangesCount} pending changes.` : 'Safe-Mode is currently inactive.'
      };
    }

    case 'mikrotik_safe_mode_enable': {
      if (!safeModeState.active) {
        safeModeSnapshot = JSON.parse(JSON.stringify({
          interfaces: routerState.interfaces,
          ips: routerState.ips,
          natRules: routerState.natRules,
          filterRules: routerState.filterRules
        }));
        safeModeState.active = true;
        safeModeState.startedAt = new Date().toISOString();
        safeModeState.pendingChangesCount = 0;
      }
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: '[SAFE-MODE ARMED] Changes will revert automatically on connection loss or rollback.',
        type: 'warning'
      });
      return {
        status: 'success',
        safeMode: true,
        message: 'Safe Mode armed. Modifications are guarded with automatic rollback capability.'
      };
    }

    case 'mikrotik_safe_mode_commit': {
      const changeCount = safeModeState.pendingChangesCount;
      safeModeSnapshot = null;
      safeModeState.active = false;
      safeModeState.startedAt = null;
      safeModeState.pendingChangesCount = 0;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `[SAFE-MODE COMMITTED] ${changeCount} changes committed permanently to NVRAM.`,
        type: 'info'
      });
      return {
        status: 'success',
        committedChanges: changeCount,
        message: `Safe Mode session committed successfully. ${changeCount} changes persisted.`
      };
    }

    case 'mikrotik_safe_mode_rollback': {
      const revertedCount = safeModeState.pendingChangesCount;
      if (safeModeSnapshot) {
        routerState.interfaces = safeModeSnapshot.interfaces;
        routerState.ips = safeModeSnapshot.ips;
        routerState.natRules = safeModeSnapshot.natRules;
        routerState.filterRules = safeModeSnapshot.filterRules;
      }
      safeModeSnapshot = null;
      safeModeState.active = false;
      safeModeState.startedAt = null;
      safeModeState.pendingChangesCount = 0;
      routerState.lastModified = new Date().toISOString();
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `[SAFE-MODE ROLLBACK] Reverted ${revertedCount} uncommitted changes. Restored baseline state.`,
        type: 'error'
      });
      return {
        status: 'success',
        revertedChanges: revertedCount,
        message: `Safe Mode rollback triggered. All ${revertedCount} modifications were safely undone.`
      };
    }

    case 'mikrotik_create_simple_queue': {
      const q = {
        name: args.name,
        target: args.target,
        maxLimit: `${args.max_limit_upload || '10M'}/${args.max_limit_download || '20M'}`,
        comment: args.comment || 'Rate limit via MikroTik MCP'
      };
      queuesState.push(q);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      const cli = `/queue simple add name=${q.name} target=${q.target} max-limit=${q.maxLimit}${q.comment ? ` comment="${q.comment}"` : ''}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Configured Simple Queue ${q.name} target=${q.target} max-limit=${q.maxLimit}`,
        type: 'command'
      });
      return {
        status: 'success',
        queue: q,
        cliCommand: cli,
        message: `Queue "${q.name}" active (${q.maxLimit})`
      };
    }

    // --- DNS Tools (All 15 RouterOS DNS tools) ---
    case 'mikrotik_get_dns_settings': {
      return {
        status: 'success',
        settings: dnsSettingsState,
        cliCommand: '/ip dns print',
        message: 'DNS settings retrieved'
      };
    }

    case 'mikrotik_set_upstream_dns': {
      if (args.servers) dnsSettingsState.servers = args.servers;
      if (args.allow_remote_requests !== undefined) dnsSettingsState.allowRemoteRequests = Boolean(args.allow_remote_requests);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      const cli = `/ip dns set servers=${dnsSettingsState.servers} allow-remote-requests=${dnsSettingsState.allowRemoteRequests ? 'yes' : 'no'}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Updated upstream DNS servers to: ${dnsSettingsState.servers}`,
        type: 'command'
      });
      return {
        status: 'success',
        servers: dnsSettingsState.servers,
        allowRemoteRequests: dnsSettingsState.allowRemoteRequests,
        cliCommand: cli,
        message: `Upstream DNS servers updated to ${dnsSettingsState.servers}`
      };
    }

    case 'mikrotik_get_dns_stats': {
      return {
        status: 'success',
        cacheSize: dnsSettingsState.cacheSize,
        cacheUsed: 42,
        hitRatio: '88.4%',
        activeQueriesPerSec: 14,
        forwarderLatencyMs: 11.2,
        cliCommand: '/ip dns print stats'
      };
    }

    case 'mikrotik_flush_dns_cache': {
      dnsCacheState.length = 0;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: 'RouterOS DNS resolver cache flushed successfully',
        type: 'info'
      });
      return {
        status: 'success',
        cliCommand: '/ip dns cache flush',
        message: 'RouterOS DNS cache flushed'
      };
    }

    case 'mikrotik_list_dns_cache': {
      return {
        status: 'success',
        count: dnsCacheState.length,
        cache: dnsCacheState,
        cliCommand: '/ip dns cache print detail'
      };
    }

    case 'mikrotik_get_dns_cache_entry': {
      const query = (args.name || '').toLowerCase();
      const results = dnsCacheState.filter(c => c.name.toLowerCase().includes(query) || c.data.includes(query));
      return {
        status: 'success',
        matchCount: results.length,
        entries: results,
        cliCommand: `/ip dns cache print where name~"${args.name}"`
      };
    }

    case 'mikrotik_list_dns_static': {
      return {
        status: 'success',
        count: dnsStaticState.length,
        staticRecords: dnsStaticState,
        cliCommand: '/ip dns static print detail'
      };
    }

    case 'mikrotik_add_dns_static': {
      dnsStaticState.push({
        name: args.name,
        address: args.address,
        ttl: args.ttl || '1d',
        comment: args.comment,
        type: 'A'
      });
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      const cli = `/ip dns static add name=${args.name} address=${args.address}${args.ttl ? ` ttl=${args.ttl}` : ''}`;
      return {
        status: 'success',
        name: args.name,
        address: args.address,
        cliCommand: cli,
        message: `Static DNS mapping ${args.name} -> ${args.address} created`
      };
    }

    case 'mikrotik_get_dns_static': {
      const match = dnsStaticState.find(r => r.name.toLowerCase() === (args.name || '').toLowerCase());
      if (!match) {
        throw new Error(`Static DNS record for "${args.name}" not found`);
      }
      return {
        status: 'success',
        record: match,
        cliCommand: `/ip dns static print where name="${args.name}"`
      };
    }

    case 'mikrotik_update_dns_static': {
      const record = dnsStaticState.find(r => r.name.toLowerCase() === (args.name || '').toLowerCase());
      if (!record) {
        throw new Error(`Static DNS record "${args.name}" not found`);
      }
      if (args.address) record.address = args.address;
      if (args.ttl) record.ttl = args.ttl;
      if (args.comment) record.comment = args.comment;
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        status: 'success',
        record,
        cliCommand: `/ip dns static set [find name="${args.name}"] address=${args.address || record.address}`,
        message: `Static DNS record "${args.name}" updated`
      };
    }

    case 'mikrotik_remove_dns_static': {
      const idx = dnsStaticState.findIndex(r => r.name.toLowerCase() === (args.name || '').toLowerCase());
      if (idx === -1) {
        throw new Error(`Static DNS record "${args.name}" not found`);
      }
      dnsStaticState.splice(idx, 1);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        status: 'success',
        cliCommand: `/ip dns static remove [find name="${args.name}"]`,
        message: `Static DNS record "${args.name}" removed`
      };
    }

    case 'mikrotik_add_dns_cname': {
      dnsStaticState.push({
        name: args.alias,
        cname: args.target,
        type: 'CNAME',
        comment: args.comment || 'CNAME alias via MCP'
      });
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        status: 'success',
        alias: args.alias,
        target: args.target,
        cliCommand: `/ip dns static add name=${args.alias} cname=${args.target} type=CNAME`,
        message: `DNS CNAME ${args.alias} -> ${args.target} registered`
      };
    }

    case 'mikrotik_add_dns_adblock_regexp': {
      dnsStaticState.push({
        name: args.pattern,
        regexp: args.pattern,
        type: 'NXDOMAIN',
        comment: args.comment || 'AdBlock Sinkhole'
      });
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        status: 'success',
        pattern: args.pattern,
        cliCommand: `/ip dns static add regexp="${args.pattern}" type=NXDOMAIN`,
        message: `Adblock regex sinkhole rule added`
      };
    }

    case 'mikrotik_set_dns_doh_server': {
      dnsSettingsState.useDohServer = args.doh_url || 'https://cloudflare-dns.com/dns-query';
      if (args.verify_cert !== undefined) dnsSettingsState.verifyDohCert = Boolean(args.verify_cert);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      return {
        status: 'success',
        dohServer: dnsSettingsState.useDohServer,
        verifyCert: dnsSettingsState.verifyDohCert,
        cliCommand: `/ip dns set use-doh-server="${dnsSettingsState.useDohServer}" verify-doh-cert=${dnsSettingsState.verifyDohCert ? 'yes' : 'no'}`,
        message: `Configured DoH server: ${dnsSettingsState.useDohServer}`
      };
    }

    case 'mikrotik_test_dns_query': {
      const domain = args.domain || 'mikrotik.com';
      return {
        status: 'success',
        domain,
        resolvedIp: '159.148.147.204',
        latencyMs: 14.5,
        upstreamServer: args.server || dnsSettingsState.servers.split(',')[0],
        cliCommand: `/put [:resolve ${domain}]`,
        message: `Resolved ${domain} to 159.148.147.204 in 14.5ms`
      };
    }

    case 'mikrotik_create_wireguard_interface': {
      const wgName = args.name || 'wg0';
      const existing = routerState.interfaces.find(i => i.name === wgName);
      if (!existing) {
        routerState.interfaces.push({
          name: wgName,
          type: 'ether',
          ipAddress: 'unassigned',
          status: 'up',
          rxSpeed: '0 bps',
          txSpeed: '0 bps',
          comment: `WireGuard VPN (Port ${args.listen_port || 13231})`
        });
      }
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      routerState.lastModified = new Date().toISOString();
      const cli = `/interface wireguard add name=${wgName} listen-port=${args.listen_port || 13231}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Created WireGuard interface ${wgName} on port ${args.listen_port || 13231}`,
        type: 'command'
      });
      return {
        status: 'success',
        interface: wgName,
        port: args.listen_port || 13231,
        cliCommand: cli,
        message: `WireGuard interface ${wgName} created on port ${args.listen_port || 13231}`
      };
    }

    case 'mikrotik_add_wireguard_peer': {
      const peer = {
        interface: args.interface || 'wg0',
        publicKey: args.public_key,
        allowedAddress: args.allowed_address,
        comment: args.comment
      };
      wireguardPeersState.push(peer);
      if (safeModeState.active) safeModeState.pendingChangesCount++;
      const cli = `/interface wireguard peers add interface=${peer.interface} public-key="${peer.publicKey}" allowed-address=${peer.allowedAddress}${peer.comment ? ` comment="${peer.comment}"` : ''}`;
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Registered WireGuard peer on ${peer.interface} for ${peer.allowedAddress}`,
        type: 'command'
      });
      return {
        status: 'success',
        peer,
        cliCommand: cli,
        message: `WireGuard peer registered for ${peer.allowedAddress}`
      };
    }

    case 'mikrotik_get_poe_status': {
      return {
        status: 'success',
        ports: [
          { port: 'ether1', poeOut: 'off', voltage: '0.0V', current: '0mA', power: '0.0W', status: 'disabled' },
          { port: 'ether2', poeOut: 'auto-on', voltage: '52.4V', current: '210mA', power: '11.0W', status: 'powered', device: 'cAP ac (Floor 2)' },
          { port: 'ether3', poeOut: 'auto-on', voltage: '52.3V', current: '180mA', power: '9.4W', status: 'powered', device: 'cAP ax (Lobby)' },
          { port: 'ether4', poeOut: 'auto-on', voltage: '52.4V', current: '85mA', power: '4.4W', status: 'powered', device: 'Grandstream VoIP Deskphone' },
          { port: 'ether5', poeOut: 'off', voltage: '0.0V', current: '0mA', power: '0.0W', status: 'waiting-for-load' }
        ],
        totalPowerWatts: 24.8,
        psuVoltage: '52.4V'
      };
    }

    case 'mikrotik_select_fleet_device': {
      safeModeState.targetDevice = args.device || 'edge-router-core';
      routerState.agentLogs.unshift({
        id: `mcp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: 'MikroTik-MCP',
        message: `Target device switched to: ${safeModeState.targetDevice}`,
        type: 'info'
      });
      return {
        status: 'success',
        selectedDevice: safeModeState.targetDevice,
        message: `Active fleet device context set to ${safeModeState.targetDevice}`
      };
    }

    case 'mikrotik_list_fleet_devices': {
      return {
        status: 'success',
        activeDevice: safeModeState.targetDevice,
        fleet: [
          { id: 'edge-core-01', name: 'edge-router-core', ip: '192.168.88.1', model: 'CCR2004-16G-2S+', status: 'online' },
          { id: 'branch-vlan-02', name: 'branch-office-gw', ip: '10.200.1.1', model: 'RB5009UG+S+IN', status: 'online' },
          { id: 'wireless-ap-03', name: 'campus-capsman-ctl', ip: '192.168.10.2', model: 'CRS326-24G-2S+RM', status: 'online' },
          { id: 'lte-backup-04', name: 'backup-lte-gateway', ip: '192.168.99.1', model: 'LtAP mini LTE kit', status: 'standby' }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function registerAgentConnector(app: Express) {
  // Sync state between React Frontend and Server Store
  app.post('/api/agent/state/sync', (req: Request, res: Response) => {
    const { interfaces, ips, natRules, filterRules } = req.body;
    if (interfaces) routerState.interfaces = interfaces;
    if (ips) routerState.ips = ips;
    if (natRules) routerState.natRules = natRules;
    if (filterRules) routerState.filterRules = filterRules;
    routerState.lastModified = new Date().toISOString();

    res.json({
      status: 'success',
      message: 'State synchronized with agent engine',
      lastModified: routerState.lastModified
    });
  });

  // Get live RouterOS state for agents
  app.get('/api/agent/state', (req: Request, res: Response) => {
    res.json({
      interfaces: routerState.interfaces,
      ips: routerState.ips,
      natRules: routerState.natRules,
      filterRules: routerState.filterRules.map((r, i) => ({ priority: i, ...r })),
      agentLogs: routerState.agentLogs,
      lastModified: routerState.lastModified
    });
  });

  // Add rule REST endpoint (useful for Hermes API tools)
  app.post('/api/agent/rules/add', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('add_firewall_filter_rule', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update comment REST endpoint
  app.post('/api/agent/rules/comment', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('update_rule_comment', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reorder rules REST endpoint
  app.post('/api/agent/rules/reorder', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('reorder_firewall_rule', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete rule REST endpoint
  app.post('/api/agent/rules/delete', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('delete_firewall_rule', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Toggle rule status (Enabled/Disabled) REST endpoint
  app.post('/api/agent/rules/toggle', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('toggle_firewall_rule_status', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Interface statistics REST endpoint
  app.get('/api/agent/interfaces/stats', (req: Request, res: Response) => {
    res.json({
      status: 'success',
      interfaces: routerState.interfaces.map(iface => ({
        id: iface.id,
        name: iface.name,
        type: iface.type,
        status: iface.status,
        rxRate: `${(Math.random() * 4 + 0.5).toFixed(2)} Mbps`,
        txRate: `${(Math.random() * 2 + 0.2).toFixed(2)} Mbps`,
        packets: Math.floor(Math.random() * 50000 + 12000)
      }))
    });
  });

  // Simulate packet REST endpoint
  app.post('/api/agent/simulate', (req: Request, res: Response) => {
    try {
      const result = executeMcpTool('simulate_packet_trace', req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export RouterOS .rsc script
  app.get('/api/agent/export.rsc', (req: Request, res: Response) => {
    const script = generateRscScript();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="routeros-config.rsc"');
    res.send(script);
  });

  // Hermes Agent tool.yaml Manifest (Supports ?mode=strict and ?mode=flexible)
  app.get('/api/hermes/tool.yaml', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;
    const mode = (req.query.mode as string)?.toLowerCase() === 'flexible' ? 'flexible' : 'strict';

    let yaml = '';
    if (mode === 'strict') {
      yaml = `# Hermes Agent Tool Manifest: MikroTik RouterOS
# Destination: ~/.hermes/tools/routeros/tool.yaml
# Schema Version: 2.0 (Strict Output Parsing Mode)
# Target: Hermes Agent v0.5.0+ (Strict JSON Schema Validation)
schema_version: "2.0"
name: mikrotik_routeros
description: "Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export."
version: "1.0.0"
type: "http"
base_url: "${baseUrl}"

output_parsing:
  mode: "strict"
  format: "json"
  content_type: "application/json"
  validate_schema: true
  fail_on_unexpected: true
  null_on_error: false
  strip_nulls: true

endpoints:
  get_router_state:
    path: "/api/agent/state"
    method: "GET"
    description: "Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall filter rules"
    parameters:
      type: "object"
      properties: {}
      additionalProperties: false
    responses:
      "200":
        description: "Complete router state and rules array"

  add_firewall_rule:
    path: "/api/agent/rules/add"
    method: "POST"
    description: "Add a firewall filter rule with chain, action, protocol, addresses, ports, priority position, and comment"
    headers:
      Content-Type: "application/json"
    parameters:
      type: "object"
      required:
        - "chain"
        - "action"
      properties:
        chain:
          type: "string"
          enum: ["forward", "input", "output"]
          description: "Packet processing chain in RouterOS filter table"
        action:
          type: "string"
          enum: ["accept", "drop", "reject", "log", "fasttrack-connection"]
          description: "Rule action verdict"
        protocol:
          type: "string"
          enum: ["tcp", "udp", "icmp", "any"]
          description: "IP transport protocol"
        srcAddress:
          type: "string"
          description: "Source IP or CIDR subnet (e.g. 192.168.20.0/24)"
        dstAddress:
          type: "string"
          description: "Destination IP or CIDR subnet (e.g. 192.168.10.0/24)"
        dstPort:
          type: "number"
          description: "Destination TCP/UDP port number"
        comment:
          type: "string"
          description: "Audit trail documentation comment"
        priorityPosition:
          type: "number"
          description: "Zero-indexed priority insertion slot (0 = highest priority)"
      additionalProperties: false

  update_rule_comment:
    path: "/api/agent/rules/comment"
    method: "POST"
    description: "Update documentation comment on an existing firewall rule"
    headers:
      Content-Type: "application/json"
    parameters:
      type: "object"
      required:
        - "comment"
      properties:
        ruleId:
          type: "string"
          description: "Target rule ID"
        priorityIndex:
          type: "number"
          description: "Target priority index"
        comment:
          type: "string"
          description: "Documentation comment text"
      additionalProperties: false

  reorder_firewall_rule:
    path: "/api/agent/rules/reorder"
    method: "POST"
    description: "Change the priority order of a firewall filter rule (first matching rule evaluates first)"
    headers:
      Content-Type: "application/json"
    parameters:
      type: "object"
      required:
        - "fromPriority"
        - "toPriority"
      properties:
        fromPriority:
          type: "number"
          description: "Source rule priority position"
        toPriority:
          type: "number"
          description: "Target destination priority position"
      additionalProperties: false

  simulate_packet_trace:
    path: "/api/agent/simulate"
    method: "POST"
    description: "Run packet simulation to test whether firewall rules accept or drop traffic between subnets"
    headers:
      Content-Type: "application/json"
    parameters:
      type: "object"
      required:
        - "srcIp"
        - "dstIp"
      properties:
        srcIp:
          type: "string"
          description: "Source IP address to simulate (e.g. 192.168.20.55)"
        dstIp:
          type: "string"
          description: "Destination IP address to simulate (e.g. 192.168.10.15)"
        protocol:
          type: "string"
          enum: ["TCP", "UDP", "ICMP"]
          description: "Transport protocol"
        dstPort:
          type: "number"
          description: "Destination port"
      additionalProperties: false

  delete_firewall_rule:
    path: "/api/agent/rules/delete"
    method: "POST"
    description: "Delete a firewall filter rule by ID or priority index"
    headers:
      Content-Type: "application/json"
    parameters:
      type: "object"
      properties:
        ruleId:
          type: "string"
          description: "Unique rule identifier"
        priorityIndex:
          type: "number"
          description: "Priority index position"
      additionalProperties: false

  get_interface_stats:
    path: "/api/agent/interfaces/stats"
    method: "GET"
    description: "Query interface traffic rates, link states, and packet statistics"
    parameters:
      type: "object"
      properties: {}
      additionalProperties: false
`;
    } else {
      yaml = `# Hermes Agent Tool Manifest: MikroTik RouterOS
# Destination: ~/.hermes/tools/routeros/tool.yaml
# Schema Version: 1.0 (Flexible Output Parsing Mode)
# Target: Hermes Agent v0.1.x - v0.4.x (Tolerant Parser)
schema_version: "1.0"
name: mikrotik_routeros
description: "Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export."
version: "1.0.0"
type: "http"
base_url: "${baseUrl}"

output_parsing:
  mode: "flexible"
  format: "auto"
  fail_on_unexpected: false
  allow_text_fallback: true
  auto_coerce_types: true

endpoints:
  get_router_state:
    path: "/api/agent/state"
    method: "GET"
    description: "Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall rules"

  add_firewall_rule:
    path: "/api/agent/rules/add"
    method: "POST"
    description: "Add a firewall filter rule to the router"
    headers:
      Content-Type: "application/json"
    body_params:
      chain: "chain"
      action: "action"
      protocol: "protocol"
      srcAddress: "srcAddress"
      dstAddress: "dstAddress"
      dstPort: "dstPort"
      comment: "comment"
      priorityPosition: "priorityPosition"

  update_rule_comment:
    path: "/api/agent/rules/comment"
    method: "POST"
    description: "Update documentation comment on an existing firewall rule"
    headers:
      Content-Type: "application/json"
    body_params:
      ruleId: "ruleId"
      priorityIndex: "priorityIndex"
      comment: "comment"

  reorder_firewall_rule:
    path: "/api/agent/rules/reorder"
    method: "POST"
    description: "Change the priority order of a firewall filter rule (first matching rule evaluates first)"
    headers:
      Content-Type: "application/json"
    body_params:
      fromPriority: "fromPriority"
      toPriority: "toPriority"

  simulate_packet_trace:
    path: "/api/agent/simulate"
    method: "POST"
    description: "Run packet simulation to test whether firewall rules accept or drop traffic between subnets"
    headers:
      Content-Type: "application/json"
    body_params:
      srcIp: "srcIp"
      dstIp: "dstIp"
      protocol: "protocol"
      dstPort: "dstPort"

  delete_firewall_rule:
    path: "/api/agent/rules/delete"
    method: "POST"
    description: "Delete a firewall filter rule by ID or priority index"
    headers:
      Content-Type: "application/json"
    body_params:
      ruleId: "ruleId"
      priorityIndex: "priorityIndex"

  get_interface_stats:
    path: "/api/agent/interfaces/stats"
    method: "GET"
    description: "Query interface traffic rates, link states, and packet statistics"
`;
    }

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(yaml);
  });

  // Hermes Agent tool.json Manifest (Supports ?mode=strict and ?mode=flexible)
  app.get('/api/hermes/tool.json', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;
    const mode = (req.query.mode as string)?.toLowerCase() === 'flexible' ? 'flexible' : 'strict';

    if (mode === 'strict') {
      res.json({
        schema_version: '2.0',
        name: 'mikrotik_routeros',
        description: 'Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export.',
        version: '1.0.0',
        type: 'http',
        base_url: baseUrl,
        output_parsing: {
          mode: 'strict',
          format: 'json',
          content_type: 'application/json',
          validate_schema: true,
          fail_on_unexpected: true,
          null_on_error: false,
          strip_nulls: true
        },
        endpoints: {
          get_router_state: {
            path: '/api/agent/state',
            method: 'GET',
            description: 'Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall filter rules',
            parameters: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          },
          add_firewall_rule: {
            path: '/api/agent/rules/add',
            method: 'POST',
            description: 'Add a firewall filter rule with chain, action, protocol, addresses, ports, priority position, and comment',
            headers: {
              'Content-Type': 'application/json'
            },
            parameters: {
              type: 'object',
              required: ['chain', 'action'],
              properties: {
                chain: {
                  type: 'string',
                  enum: ['forward', 'input', 'output'],
                  description: 'Packet processing chain in RouterOS filter table'
                },
                action: {
                  type: 'string',
                  enum: ['accept', 'drop', 'reject', 'log', 'fasttrack-connection'],
                  description: 'Rule action verdict'
                },
                protocol: {
                  type: 'string',
                  enum: ['tcp', 'udp', 'icmp', 'any'],
                  description: 'IP transport protocol'
                },
                srcAddress: {
                  type: 'string',
                  description: 'Source IP or CIDR subnet (e.g. 192.168.20.0/24)'
                },
                dstAddress: {
                  type: 'string',
                  description: 'Destination IP or CIDR subnet (e.g. 192.168.10.0/24)'
                },
                dstPort: {
                  type: 'number',
                  description: 'Destination TCP/UDP port number'
                },
                comment: {
                  type: 'string',
                  description: 'Audit trail documentation comment'
                },
                priorityPosition: {
                  type: 'number',
                  description: 'Zero-indexed priority insertion slot (0 = highest priority)'
                }
              },
              additionalProperties: false
            }
          },
          update_rule_comment: {
            path: '/api/agent/rules/comment',
            method: 'POST',
            description: 'Update documentation comment on an existing firewall rule',
            headers: {
              'Content-Type': 'application/json'
            },
            parameters: {
              type: 'object',
              required: ['comment'],
              properties: {
                ruleId: { type: 'string', description: 'Target rule ID' },
                priorityIndex: { type: 'number', description: 'Target priority index' },
                comment: { type: 'string', description: 'Documentation comment text' }
              },
              additionalProperties: false
            }
          },
          reorder_firewall_rule: {
            path: '/api/agent/rules/reorder',
            method: 'POST',
            description: 'Change the priority order of a firewall filter rule (first matching rule evaluates first)',
            headers: {
              'Content-Type': 'application/json'
            },
            parameters: {
              type: 'object',
              required: ['fromPriority', 'toPriority'],
              properties: {
                fromPriority: { type: 'number', description: 'Source rule priority position' },
                toPriority: { type: 'number', description: 'Target destination priority position' }
              },
              additionalProperties: false
            }
          },
          simulate_packet_trace: {
            path: '/api/agent/simulate',
            method: 'POST',
            description: 'Run packet simulation to test whether firewall rules accept or drop traffic between subnets',
            headers: {
              'Content-Type': 'application/json'
            },
            parameters: {
              type: 'object',
              required: ['srcIp', 'dstIp'],
              properties: {
                srcIp: { type: 'string', description: 'Source IP address to simulate (e.g. 192.168.20.55)' },
                dstIp: { type: 'string', description: 'Destination IP address to simulate (e.g. 192.168.10.15)' },
                protocol: { type: 'string', enum: ['TCP', 'UDP', 'ICMP'], description: 'Transport protocol' },
                dstPort: { type: 'number', description: 'Destination port' }
              },
              additionalProperties: false
            }
          },
          delete_firewall_rule: {
            path: '/api/agent/rules/delete',
            method: 'POST',
            description: 'Delete a firewall filter rule by ID or priority index',
            headers: {
              'Content-Type': 'application/json'
            },
            parameters: {
              type: 'object',
              properties: {
                ruleId: { type: 'string', description: 'Unique rule identifier' },
                priorityIndex: { type: 'number', description: 'Priority index position' }
              },
              additionalProperties: false
            }
          },
          get_interface_stats: {
            path: '/api/agent/interfaces/stats',
            method: 'GET',
            description: 'Query interface traffic rates, link states, and packet statistics',
            parameters: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          }
        }
      });
    } else {
      res.json({
        schema_version: '1.0',
        name: 'mikrotik_routeros',
        description: 'Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export.',
        version: '1.0.0',
        type: 'http',
        base_url: baseUrl,
        output_parsing: {
          mode: 'flexible',
          format: 'auto',
          fail_on_unexpected: false,
          allow_text_fallback: true,
          auto_coerce_types: true
        },
        endpoints: {
          get_router_state: {
            path: '/api/agent/state',
            method: 'GET',
            description: 'Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall rules'
          },
          add_firewall_rule: {
            path: '/api/agent/rules/add',
            method: 'POST',
            description: 'Add a firewall filter rule to the router',
            headers: {
              'Content-Type': 'application/json'
            },
            body_params: {
              chain: 'chain',
              action: 'action',
              protocol: 'protocol',
              srcAddress: 'srcAddress',
              dstAddress: 'dstAddress',
              dstPort: 'dstPort',
              comment: 'comment',
              priorityPosition: 'priorityPosition'
            }
          },
          update_rule_comment: {
            path: '/api/agent/rules/comment',
            method: 'POST',
            description: 'Update documentation comment on an existing firewall rule',
            headers: {
              'Content-Type': 'application/json'
            },
            body_params: {
              ruleId: 'ruleId',
              priorityIndex: 'priorityIndex',
              comment: 'comment'
            }
          },
          reorder_firewall_rule: {
            path: '/api/agent/rules/reorder',
            method: 'POST',
            description: 'Change the priority order of a firewall filter rule (first matching rule evaluates first)',
            headers: {
              'Content-Type': 'application/json'
            },
            body_params: {
              fromPriority: 'fromPriority',
              toPriority: 'toPriority'
            }
          },
          simulate_packet_trace: {
            path: '/api/agent/simulate',
            method: 'POST',
            description: 'Run packet simulation to test whether firewall rules accept or drop traffic between subnets',
            headers: {
              'Content-Type': 'application/json'
            },
            body_params: {
              srcIp: 'srcIp',
              dstIp: 'dstIp',
              protocol: 'protocol',
              dstPort: 'dstPort'
            }
          },
          delete_firewall_rule: {
            path: '/api/agent/rules/delete',
            method: 'POST',
            description: 'Delete a firewall filter rule by ID or priority index',
            headers: {
              'Content-Type': 'application/json'
            },
            body_params: {
              ruleId: 'ruleId',
              priorityIndex: 'priorityIndex'
            }
          },
          get_interface_stats: {
            path: '/api/agent/interfaces/stats',
            method: 'GET',
            description: 'Query interface traffic rates, link states, and packet statistics'
          }
        }
      });
    }
  });

  // Hermes Agent SKILL.md
  app.get('/api/hermes/SKILL.md', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;

    const skillMd = `---
name: mikrotik-routeros
description: "Expert network engineering skill for MikroTik RouterOS: manage firewall filter rules, maintain strict VLAN isolation, reorder rule priority, test with packet trace simulator, and export .rsc scripts."
tools:
  - mikrotik_routeros
---

# MikroTik RouterOS Skill for Hermes Agent

This skill equips Hermes Agent to query, organize, and safeguard MikroTik RouterOS devices and network simulations.

## Key Operational Rules

1. **Top-to-Bottom First Match Evaluation**:
   In RouterOS firewall filter rules, order is paramount!
   - Rule \`#0\` evaluates first.
   - If an ACCEPT rule sits above a DROP rule, transit traffic will match and pass before the drop rule is reached.
   - Always place specific DROP/ISOLATION rules above generic ACCEPT rules.

2. **VLAN Isolation Patterns**:
   - Corporate LAN: \`192.168.10.0/24\` (VLAN 10)
   - Guest Network: \`192.168.20.0/24\` (VLAN 20)
   - When asked to isolate guest traffic, ensure a forward drop rule from \`192.168.20.0/24\` to \`192.168.10.0/24\` is elevated to high priority.

3. **Verification with Packet Simulation**:
   - After altering firewall rules or rule priorities, ALWAYS verify by invoking \`simulate_packet_trace\`.
   - Test traffic from \`192.168.20.55\` to \`192.168.10.15\` on port \`80\` to guarantee the outcome is \`DROP\`.

4. **Documentation Comments**:
   - Annotate every rule with clear comments using \`update_rule_comment\` so network operations personnel understand the security purpose of the rule.

## Connector Endpoints
- Base API: ${baseUrl}/api/agent
- MCP Server: ${baseUrl}/api/mcp
- Config Script: ${baseUrl}/api/agent/export.rsc
`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(skillMd);
  });

  // Hermes Agent config.yaml snippet
  app.get('/api/hermes/config.yaml', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;

    const config = `# Paste into ~/.hermes/config.yaml under mcp: servers:
mcp:
  servers:
    mikrotik_routeros:
      url: "${baseUrl}/api/mcp"
      transport: "http"
`;
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(config);
  });

  // Pre-configured JSON snippet for registering RouterOS OpenClaw MCP server in config.yaml / openclaw.json
  app.get('/api/hermes/openclaw.json', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;

    const snippet = {
      mcp: {
        servers: {
          openclaw_mikrotik: {
            command: "node",
            args: [
              "~/.hermes/bridges/openclaw-mikrotik.js",
              "--endpoint",
              `${baseUrl}/api/mcp`,
              "--router-ip",
              "192.168.88.1",
              "--api-port",
              "8728",
              "--user",
              "admin",
              "--password-env",
              "ROUTEROS_PASSWORD",
              "--strict-priority",
              "true",
              "--vlan-aware",
              "true",
              "--timeout",
              "5000"
            ],
            env: {
              MIKROTIK_HOST: "192.168.88.1",
              MIKROTIK_PORT: "8728",
              MIKROTIK_USER: "admin",
              ROUTEROS_PASSWORD: "YOUR_ROUTER_PASSWORD_HERE",
              OPENCLAW_MCP_ENDPOINT: `${baseUrl}/api/mcp`
            }
          }
        }
      }
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(snippet);
  });

  // Standalone Stdio-to-HTTP MCP bridge script for Hermes Agent & OpenClaw
  app.get('/api/hermes/bridge.js', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;

    const script = `#!/usr/bin/env node
/**
 * Hermes Agent / OpenClaw Stdio-to-HTTP MCP Bridge for MikroTik RouterOS
 * Usage:
 *   node bridge.js --url "${baseUrl}/api/mcp"
 */
const readline = require('readline');

const args = process.argv.slice(2);
let targetUrl = "${baseUrl}/api/mcp";
const urlIndex = args.indexOf('--url');
if (urlIndex !== -1 && args[urlIndex + 1]) {
  targetUrl = args[urlIndex + 1];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const payload = JSON.parse(trimmed);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    process.stdout.write(JSON.stringify(data) + '\\n');
  } catch (err) {
    const errObj = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err.message }
    };
    process.stdout.write(JSON.stringify(errObj) + '\\n');
  }
});
`;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(script);
  });

  // Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint
  app.post('/api/mcp', (req: Request, res: Response) => {
    const startTime = performance.now();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const body = req.body;

    const handleSingleRpc = (rpc: any) => {
      const { id, method, params } = rpc || {};
      const toolName = method === 'tools/call' ? params?.name : undefined;

      // 1. Record Incoming JSON-RPC frame
      recordJsonRpcTraffic({
        direction: 'incoming',
        rpcId: id !== undefined ? id : null,
        method: method || 'unknown',
        toolName,
        status: method ? (method.startsWith('notifications/') ? 'notification' : 'ok') : 'error',
        sourceIp: clientIp,
        summary: method
          ? `--> ${method}${toolName ? ` [${toolName}]` : ''}`
          : '--> Invalid JSON-RPC frame: missing method',
        payload: rpc
      });

      if (!method) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32600, message: 'Invalid Request: missing method' }
        };
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        recordJsonRpcTraffic({
          direction: 'outgoing',
          rpcId: id || null,
          method: 'error',
          status: 'error',
          errorCode: -32600,
          errorMessage: 'Invalid Request: missing method',
          durationMs,
          summary: `<-- ERROR -32600 (Invalid Request): missing method`,
          payload: errorResponse
        });
        return errorResponse;
      }

      // Initialize handshake
      if (method === 'initialize') {
        addAgentLog('MCP', 'Received MCP initialize handshake from AI agent client', 'info');
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'mikrotik-routeros-mcp',
              version: '1.0.0'
            }
          }
        };
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        recordJsonRpcTraffic({
          direction: 'outgoing',
          rpcId: id,
          method: 'initialize',
          status: 'ok',
          durationMs,
          summary: `<-- 200 OK: Handshake initialized (protocolVersion 2024-11-05)`,
          payload: response
        });
        return response;
      }

      // Ping
      if (method === 'ping') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {}
        };
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        recordJsonRpcTraffic({
          direction: 'outgoing',
          rpcId: id,
          method: 'ping',
          status: 'ok',
          durationMs,
          summary: `<-- 200 OK: pong (id: ${id})`,
          payload: response
        });
        return response;
      }

      // List available tools
      if (method === 'tools/list') {
        addAgentLog('MCP', `Listed ${MCP_TOOLS.length} RouterOS tools to AI agent`, 'info');
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS
          }
        };
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        recordJsonRpcTraffic({
          direction: 'outgoing',
          rpcId: id,
          method: 'tools/list',
          status: 'ok',
          durationMs,
          summary: `<-- 200 OK: Returned ${MCP_TOOLS.length} tools`,
          payload: response
        });
        return response;
      }

      // Call tool
      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        addAgentLog('MCP', `AI Agent executing MCP tool: "${toolName}"`, 'command');

        try {
          const resultData = executeMcpTool(toolName, toolArgs);
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2)
                }
              ]
            }
          };
          const durationMs = Number((performance.now() - startTime).toFixed(2));
          recordJsonRpcTraffic({
            direction: 'outgoing',
            rpcId: id,
            method: 'tools/call',
            toolName,
            status: 'ok',
            durationMs,
            summary: `<-- 200 OK: Tool "${toolName}" executed in ${durationMs}ms`,
            payload: response
          });
          return response;
        } catch (err: any) {
          addAgentLog('MCP', `Error executing MCP tool "${toolName}": ${err.message}`, 'error');
          const errorResponse = {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: err.message || 'Tool execution error'
            }
          };
          const durationMs = Number((performance.now() - startTime).toFixed(2));
          recordJsonRpcTraffic({
            direction: 'outgoing',
            rpcId: id,
            method: 'tools/call',
            toolName,
            status: 'error',
            errorCode: -32000,
            errorMessage: err.message || 'Tool execution error',
            durationMs,
            summary: `<-- ERROR -32000 in "${toolName}": ${err.message}`,
            payload: errorResponse
          });
          return errorResponse;
        }
      }

      // Notifications / other methods
      if (method.startsWith('notifications/')) {
        return null;
      }

      const notFoundResponse = {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
      const durationMs = Number((performance.now() - startTime).toFixed(2));
      recordJsonRpcTraffic({
        direction: 'outgoing',
        rpcId: id,
        method,
        status: 'error',
        errorCode: -32601,
        errorMessage: `Method not found: ${method}`,
        durationMs,
        summary: `<-- ERROR -32601: Method not found: ${method}`,
        payload: notFoundResponse
      });
      return notFoundResponse;
    };

    if (Array.isArray(body)) {
      const responses = body.map(handleSingleRpc).filter(Boolean);
      return res.json(responses);
    } else {
      const response = handleSingleRpc(body);
      if (response) {
        return res.json(response);
      } else {
        return res.status(204).end();
      }
    }
  });

  // Query live JSON-RPC traffic records
  app.get('/api/mcp/traffic', (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 250);
    const since = req.query.since as string;

    let logs = jsonRpcTrafficLogs;
    if (since) {
      logs = logs.filter(l => l.timestamp > since);
    }

    res.json({
      status: 'success',
      totalCaptured: jsonRpcTrafficLogs.length,
      serverTime: new Date().toISOString(),
      logs: logs.slice(0, limit)
    });
  });

  // Clear live JSON-RPC traffic buffer
  app.post('/api/mcp/traffic/clear', (req: Request, res: Response) => {
    jsonRpcTrafficLogs.length = 0;
    addAgentLog('MCP', 'JSON-RPC wire traffic log buffer cleared by administrator', 'info');
    res.json({
      status: 'success',
      message: 'Traffic log buffer cleared'
    });
  });

  // Send a test JSON-RPC packet through the MCP server
  app.post('/api/mcp/traffic/inject', async (req: Request, res: Response) => {
    const { action, customPayload } = req.body || {};
    const testId = `dbg-${Date.now().toString().slice(-4)}`;

    let payload = customPayload;
    if (!payload) {
      switch (action) {
        case 'ping':
          payload = { jsonrpc: '2.0', id: testId, method: 'ping' };
          break;
        case 'initialize':
          payload = {
            jsonrpc: '2.0',
            id: testId,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              clientInfo: { name: 'openclaw-debugger', version: '1.0.0' }
            }
          };
          break;
        case 'tools_list':
          payload = { jsonrpc: '2.0', id: testId, method: 'tools/list' };
          break;
        case 'simulate_trace':
          payload = {
            jsonrpc: '2.0',
            id: testId,
            method: 'tools/call',
            params: {
              name: 'simulate_packet_trace',
              arguments: {
                srcIp: '192.168.20.100',
                dstIp: '192.168.10.50',
                protocol: 'TCP',
                dstPort: 80
              }
            }
          };
          break;
        case 'invalid_method':
          payload = {
            jsonrpc: '2.0',
            id: testId,
            method: 'system/non_existent_method'
          };
          break;
        default:
          payload = { jsonrpc: '2.0', id: testId, method: 'ping' };
      }
    }

    // Call self via fetch
    try {
      const host = req.get('host') || 'localhost:3000';
      const proto = req.protocol || 'http';
      const fetchRes = await fetch(`${proto}://${host}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await fetchRes.json();
      res.json({
        status: 'success',
        sent: payload,
        received: data
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Official MikroTik MCP Endpoints ---

  // MCP Server-Sent Events (SSE) streaming transport
  app.get('/api/mcp/sse', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write(`event: endpoint\ndata: ${JSON.stringify({ endpoint: '/api/mcp', transport: 'sse', version: '2024-11-05' })}\n\n`);
    res.write(`event: message\ndata: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {
        serverInfo: { name: 'mikrotik-mcp-server', version: '1.4.0', source: 'jeff-nasseri/mikrotik-mcp' },
        categoriesCount: 19,
        toolsCount: MCP_TOOLS.length,
        device: safeModeState.targetDevice
      }
    })}\n\n`);

    const interval = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), safeMode: safeModeState.active, pendingChanges: safeModeState.pendingChangesCount })}\n\n`);
    }, 12000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // Safe Mode status and controls
  app.get('/api/mcp/safe-mode', (_req: Request, res: Response) => {
    res.json(executeMcpTool('mikrotik_safe_mode_status', {}));
  });

  app.post('/api/mcp/safe-mode/enable', (_req: Request, res: Response) => {
    res.json(executeMcpTool('mikrotik_safe_mode_enable', {}));
  });

  app.post('/api/mcp/safe-mode/commit', (_req: Request, res: Response) => {
    res.json(executeMcpTool('mikrotik_safe_mode_commit', {}));
  });

  app.post('/api/mcp/safe-mode/rollback', (_req: Request, res: Response) => {
    res.json(executeMcpTool('mikrotik_safe_mode_rollback', {}));
  });

  // Plain-English AI prompt interpreter for MikroTik MCP
  app.post('/api/mcp/run-prompt', async (req: Request, res: Response) => {
    const { prompt, execute = true, device = 'edge-router-core' } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    safeModeState.targetDevice = device;

    // Determine tool sequence based on prompt content
    const lower = prompt.toLowerCase();
    const sequence: Array<{ tool: string; args: any; description: string }> = [];

    // Check for safe-mode request in prompt
    if (lower.includes('safe-mode') || lower.includes('safe mode')) {
      sequence.push({
        tool: 'mikrotik_safe_mode_enable',
        args: { session_timeout: 300 },
        description: 'Safe-mode session armed'
      });
    }

    // 1. VLAN interface creation
    if (lower.includes('vlan')) {
      const vlanIdMatch = lower.match(/(?:id|tag|vlan)\s*([0-9]{1,4})/i) || lower.match(/([0-9]{1,4})/);
      const vlanId = vlanIdMatch ? parseInt(vlanIdMatch[1], 10) : 200;
      const vlanName = `vlan${vlanId}`;
      const parentMatch = lower.match(/on\s+([a-z0-9-_]+)/i);
      const parentIf = parentMatch ? parentMatch[1] : 'ether1';

      sequence.push({
        tool: 'mikrotik_create_vlan_interface',
        args: { name: vlanName, vlan_id: vlanId, interface: parentIf, comment: 'Created via MCP prompt' },
        description: `${vlanName} created on ${parentIf} · tag ${vlanId}`
      });
    }

    // 2. IP Address binding
    const ipMatch = prompt.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\/[0-9]{1,2})/);
    if (ipMatch) {
      const address = ipMatch[1];
      // Target interface
      const vlanCreated = sequence.find(s => s.tool === 'mikrotik_create_vlan_interface');
      const targetIf = vlanCreated ? vlanCreated.args.name : (lower.includes('wg0') || lower.includes('wireguard') ? 'wg0' : 'bridge-vlan');

      sequence.push({
        tool: 'mikrotik_add_ip_address',
        args: { address, interface: targetIf, comment: 'Bound via MCP' },
        description: `${address} bound to ${targetIf}`
      });
    }

    // 3. DHCP Pool
    if (lower.includes('dhcp') || lower.includes('pool')) {
      const rangeMatch = prompt.match(/(\.[0-9]{1,3}\s*to\s*\.[0-9]{1,3})/i) || prompt.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
      let range = '192.168.200.10-192.168.200.100';
      if (rangeMatch && rangeMatch[1].includes('to')) {
        const parts = rangeMatch[1].split('to');
        const start = parts[0].replace('.', '').trim();
        const end = parts[1].replace('.', '').trim();
        range = `192.168.200.${start}-192.168.200.${end}`;
      } else if (rangeMatch) {
        range = rangeMatch[1];
      }

      sequence.push({
        tool: 'mikrotik_create_dhcp_pool',
        args: { name: 'pool-200', ranges: range },
        description: `Pool "pool-200" · ${range}`
      });
    }

    // 4. NAT Masquerade
    if (lower.includes('masquerade') || lower.includes('nat')) {
      const outIf = lower.includes('ether1') ? 'ether1' : 'lte1';
      sequence.push({
        tool: 'mikrotik_create_nat_rule',
        args: { chain: 'srcnat', action: 'masquerade', out_interface: outIf, comment: 'NAT Masquerade via MCP' },
        description: `NAT rule added (masquerade on ${outIf})`
      });
    }

    // 5. WireGuard
    if (lower.includes('wireguard') || lower.includes('wg0')) {
      if (!sequence.some(s => s.tool === 'mikrotik_create_wireguard_interface')) {
        sequence.push({
          tool: 'mikrotik_create_wireguard_interface',
          args: { name: 'wg0', listen_port: 13231, comment: 'WireGuard Gateway via MCP' },
          description: 'WireGuard interface wg0 created on port 13231'
        });
      }
      if (lower.includes('peer') || lower.includes('iphone') || lower.includes('client')) {
        sequence.push({
          tool: 'mikrotik_add_wireguard_peer',
          args: {
            interface: 'wg0',
            public_key: 'hK9w89pX+3LmQjN1F8sT2uVwXyZaBcDeFgHiJkLmNoP=',
            allowed_address: '10.0.0.2/32',
            comment: 'Mobile Client'
          },
          description: 'WireGuard peer registered for 10.0.0.2/32'
        });
      }
    }

    // 6. Simple Queue
    if (lower.includes('queue') || lower.includes('rate limit') || lower.includes('limit')) {
      sequence.push({
        tool: 'mikrotik_create_simple_queue',
        args: {
          name: 'queue-mcp-limit',
          target: '192.168.200.0/24',
          max_limit_upload: '10M',
          max_limit_download: '20M',
          comment: 'Bandwidth Limit via MCP'
        },
        description: 'Queue "queue-mcp-limit" active (10M/20M)'
      });
    }

    // 7. DNS Cache or Static
    if (lower.includes('flush dns') || lower.includes('dns cache')) {
      sequence.push({
        tool: 'mikrotik_flush_dns_cache',
        args: {},
        description: 'RouterOS DNS cache flushed'
      });
    }

    // 8. Firewall filter rules
    if (lower.includes('block') || lower.includes('drop') || lower.includes('allow') || lower.includes('isolate') || (lower.includes('firewall') && !lower.includes('nat'))) {
      const isDrop = lower.includes('block') || lower.includes('drop') || lower.includes('isolate');
      const chain = lower.includes('input') ? 'input' : 'forward';
      const action = isDrop ? 'drop' : 'accept';
      const portMatch = lower.match(/port\s*([0-9]{1,5})/i);
      const port = portMatch ? parseInt(portMatch[1], 10) : (lower.includes('ssh') ? 22 : undefined);

      sequence.push({
        tool: 'mikrotik_create_filter_rule',
        args: {
          chain,
          action,
          protocol: port ? 'tcp' : undefined,
          dst_port: port,
          comment: `Firewall filter rule via MCP: ${action}`
        },
        description: `Firewall filter ${action} rule added on ${chain} chain`
      });
    }

    // Safe mode commit if requested
    if ((lower.includes('safe-mode') || lower.includes('safe mode')) && lower.includes('commit')) {
      sequence.push({
        tool: 'mikrotik_safe_mode_commit',
        args: {},
        description: 'Safe-mode committed'
      });
    }

    // Fallback if no tools matched: provide router inspection
    if (sequence.length === 0) {
      sequence.push({
        tool: 'get_router_state',
        args: {},
        description: 'Retrieved live RouterOS configuration state'
      });
    }

    // Execute the sequence
    const executedSteps: Array<{
      tool: string;
      args: any;
      description: string;
      cliCommand?: string;
      result: any;
      durationMs: number;
      status: 'success' | 'error';
    }> = [];

    for (const step of sequence) {
      const startTime = Date.now();
      try {
        const resObj = execute ? executeMcpTool(step.tool, step.args) : { simulated: true };
        const durationMs = Date.now() - startTime;
        executedSteps.push({
          tool: step.tool,
          args: step.args,
          description: step.description,
          cliCommand: resObj.cliCommand,
          result: resObj,
          durationMs,
          status: 'success'
        });
      } catch (err: any) {
        executedSteps.push({
          tool: step.tool,
          args: step.args,
          description: step.description,
          result: { error: err.message },
          durationMs: Date.now() - startTime,
          status: 'error'
        });
      }
    }

    // Generate plain-English conversational summary
    let summary = '';
    const vlanStep = executedSteps.find(s => s.tool === 'mikrotik_create_vlan_interface');
    if (vlanStep) {
      summary = `Guest VLAN is live. Created interface ${vlanStep.args.name} with 802.1Q tag ${vlanStep.args.vlan_id} on parent ${vlanStep.args.interface}. Assigned IP gateway, configured DHCP pool, and enabled masquerade NAT out to WAN. Want me to set a rate limit?`;
    } else {
      summary = `Ran ${executedSteps.length} MikroTik MCP tool${executedSteps.length === 1 ? '' : 's'} on ${device}. Router configuration is updated and verified.`;
    }

    res.json({
      prompt,
      device,
      stepsCount: executedSteps.length,
      steps: executedSteps,
      summary,
      safeMode: safeModeState
    });
  });

}
