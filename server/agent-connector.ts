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
    { id: 'f1', chain: 'input', action: 'accept', protocol: 'icmp', comment: 'Allow ping checks to local gateway' },
    { id: 'f2', chain: 'forward', action: 'accept', protocol: 'tcp', dstPort: 443, comment: 'Permit standard encrypted HTTPS traffic forward' },
    { id: 'f3', chain: 'forward', action: 'drop', srcAddress: '192.168.20.0/24', dstAddress: '192.168.10.0/24', comment: 'Firewall drop list: Isolate Guest Subnet (VLAN 20) from Main (VLAN 10)' },
    { id: 'f4', chain: 'input', action: 'drop', srcAddress: '192.168.20.0/24', comment: 'Firewall drop list: Prevent Guest VLAN from reaching local WinBox management ports' }
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
    if (rule.protocol && rule.protocol !== 'any') cmd += ` protocol=${rule.protocol}`;
    if (rule.srcAddress) cmd += ` src-address=${rule.srcAddress}`;
    if (rule.dstAddress) cmd += ` dst-address=${rule.dstAddress}`;
    if (rule.dstPort) cmd += ` dst-port=${rule.dstPort}`;
    if (rule.comment) cmd += ` comment="${rule.comment}"`;
    lines.push(`${cmd} # Priority #${idx}`);
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
  }
];

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
        comment: args.comment || 'Added via Hermes Agent'
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

  // Hermes Agent tool.yaml Manifest
  app.get('/api/hermes/tool.yaml', (req: Request, res: Response) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    const baseUrl = `${proto}://${host}`;

    const yaml = `# Hermes Agent Tool Manifest: MikroTik RouterOS
# Save to: ~/.hermes/tools/routeros/tool.yaml
name: mikrotik_routeros
description: "Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export."
version: "1.0.0"
type: "http"
base_url: "${baseUrl}"

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
`;
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(yaml);
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
    const body = req.body;

    const handleSingleRpc = (rpc: any) => {
      const { id, method, params } = rpc;

      if (!method) {
        return {
          jsonrpc: '2.0',
          id: id || null,
          error: { code: -32600, message: 'Invalid Request: missing method' }
        };
      }

      // Initialize handshake
      if (method === 'initialize') {
        addAgentLog('MCP', 'Received MCP initialize handshake from AI agent client', 'info');
        return {
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
      }

      // Ping
      if (method === 'ping') {
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };
      }

      // List available tools
      if (method === 'tools/list') {
        addAgentLog('MCP', `Listed ${MCP_TOOLS.length} RouterOS tools to AI agent`, 'info');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS
          }
        };
      }

      // Call tool
      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        addAgentLog('MCP', `AI Agent executing MCP tool: "${toolName}"`, 'command');

        try {
          const resultData = executeMcpTool(toolName, toolArgs);
          return {
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
        } catch (err: any) {
          addAgentLog('MCP', `Error executing MCP tool "${toolName}": ${err.message}`, 'error');
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: err.message || 'Tool execution error'
            }
          };
        }
      }

      // Notifications / other methods
      if (method.startsWith('notifications/')) {
        return null;
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
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
}
