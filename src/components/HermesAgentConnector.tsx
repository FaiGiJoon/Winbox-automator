import React, { useState, useEffect } from 'react';
import {
  Bot,
  Terminal,
  Cpu,
  Zap,
  Check,
  Copy,
  Download,
  Play,
  RefreshCw,
  FileCode,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Network
} from 'lucide-react';
import { FirewallFilterRule, IPAddressConfig, InterfaceState, FirewallNATRule } from '../types';
import HermesToolYamlGenerator from './HermesToolYamlGenerator';

interface HermesAgentConnectorProps {
  filterRules: FirewallFilterRule[];
  setFilterRules: React.Dispatch<React.SetStateAction<FirewallFilterRule[]>>;
  ips: IPAddressConfig[];
  interfaces: InterfaceState[];
  natRules: FirewallNATRule[];
  addLog: (source: string, message: string, type: 'info' | 'warning' | 'error' | 'command') => void;
}

export default function HermesAgentConnector({
  filterRules,
  setFilterRules,
  ips,
  interfaces,
  natRules,
  addLog
}: HermesAgentConnectorProps) {
  const [activeSetupTab, setActiveSetupTab] = useState<'mcp' | 'tool-yaml' | 'skill' | 'bridge'>('mcp');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Live MCP Simulator State
  const [testAction, setTestAction] = useState<string>('simulate');
  const [isExecutingTest, setIsExecutingTest] = useState<boolean>(false);
  const [testRequestPayload, setTestRequestPayload] = useState<string>('');
  const [testResponsePayload, setTestResponsePayload] = useState<string>('');
  const [agentLogs, setAgentLogs] = useState<Array<{ id: string; timestamp: string; source: string; message: string; type: string }>>([]);

  // Base URL calculation
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sync state to server
  const syncStateToServer = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/agent/state/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interfaces,
          ips,
          natRules,
          filterRules
        })
      });
      if (res.ok) {
        setLastSyncTime(new Date().toLocaleTimeString());
        addLog('HermesConnector', 'Synchronized live router state with Hermes Agent engine.', 'info');
      }
    } catch (err: any) {
      console.error('Failed to sync router state:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch agent logs
  const fetchAgentLogs = async () => {
    try {
      const res = await fetch('/api/agent/state');
      if (res.ok) {
        const data = await res.json();
        if (data.agentLogs) {
          setAgentLogs(data.agentLogs);
        }
        // If server rules changed via agent, update local rules
        if (data.filterRules && JSON.stringify(data.filterRules) !== JSON.stringify(filterRules)) {
          setFilterRules(data.filterRules.map((r: any) => ({
            id: r.id,
            chain: r.chain,
            action: r.action,
            protocol: r.protocol,
            srcAddress: r.srcAddress,
            dstAddress: r.dstAddress,
            dstPort: r.dstPort,
            comment: r.comment
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch agent state:', err);
    }
  };

  useEffect(() => {
    syncStateToServer();
    fetchAgentLogs();
    const interval = setInterval(fetchAgentLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update sample payload when test action changes
  useEffect(() => {
    let payloadObj: any = {};
    if (testAction === 'initialize') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'hermes-agent-cli', version: '0.4.2' }
        }
      };
    } else if (testAction === 'tools_list') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };
    } else if (testAction === 'simulate') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'simulate_packet_trace',
          arguments: {
            srcIp: '192.168.20.55',
            dstIp: '192.168.10.15',
            protocol: 'TCP',
            dstPort: 80
          }
        }
      };
    } else if (testAction === 'add_rule') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'add_firewall_filter_rule',
          arguments: {
            chain: 'forward',
            action: 'drop',
            protocol: 'tcp',
            dstPort: 23,
            comment: 'Hermes Agent security: Block legacy Telnet access',
            priorityPosition: 0
          }
        }
      };
    } else if (testAction === 'update_comment') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'update_rule_comment',
          arguments: {
            priorityIndex: 0,
            comment: 'Hermes Agent audit: Critical top-priority rule enforced'
          }
        }
      };
    } else if (testAction === 'reorder') {
      payloadObj = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'reorder_firewall_rule',
          arguments: {
            fromPriority: Math.min(1, filterRules.length - 1),
            toPriority: 0
          }
        }
      };
    }
    setTestRequestPayload(JSON.stringify(payloadObj, null, 2));
  }, [testAction, filterRules.length]);

  // Execute MCP Test
  const runMcpTest = async () => {
    setIsExecutingTest(true);
    try {
      const parsedReq = JSON.parse(testRequestPayload);
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedReq)
      });
      const data = await res.json();
      setTestResponsePayload(JSON.stringify(data, null, 2));

      // Refresh server state into UI
      await fetchAgentLogs();
      addLog('HermesConnector', `Executed MCP simulation method: ${parsedReq.method} ${parsedReq.params?.name || ''}`, 'command');
    } catch (err: any) {
      setTestResponsePayload(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsExecutingTest(false);
    }
  };

  // Setup Snippets
  const mcpConfigSnippet = `# Add this to ~/.hermes/config.yaml under mcp: servers:
mcp:
  servers:
    mikrotik_routeros:
      url: "${baseUrl}/api/mcp"
      transport: "http"`;

  const mcpCommandSnippet = `# Alternatively run via CLI bridge (stdio mode):
npx -y hermes-mikrotik-bridge --url "${baseUrl}/api/mcp"`;

  const toolYamlSnippet = `# Save to ~/.hermes/tools/routeros/tool.yaml
name: mikrotik_routeros
description: "Programmatic MikroTik RouterOS management: manage priority firewall filter rules, isolate VLANs, inspect IPs, simulate packet paths, and export .rsc configs."
version: "1.0.0"
type: "http"
base_url: "${baseUrl}"

endpoints:
  get_router_state:
    path: "/api/agent/state"
    method: "GET"
    description: "Get full router configuration, interfaces, IPs, and priority-ordered firewall filter rules"

  add_firewall_rule:
    path: "/api/agent/rules/add"
    method: "POST"
    description: "Add a firewall filter rule with chain, action, and comment"
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
      dstPort: "dstPort"`;

  const skillMdSnippet = `---
name: mikrotik-routeros
description: "Expert network engineering skill for MikroTik RouterOS: manage firewall filter rules, maintain strict VLAN isolation, reorder rule priority, test with packet trace simulator, and export .rsc scripts."
tools:
  - mikrotik_routeros
---

# MikroTik RouterOS Skill for Hermes Agent

This skill equips Hermes Agent to query, organize, and safeguard MikroTik RouterOS devices and network simulations.

## Key Operational Guidelines

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
   - Annotate every rule with clear comments using \`update_rule_comment\` so network operations personnel understand the security purpose of the rule.`;

  const bridgeSnippet = `#!/usr/bin/env node
/**
 * Hermes Agent / OpenClaw Stdio-to-HTTP MCP Bridge for MikroTik RouterOS
 * Usage: node bridge.js --url "${baseUrl}/api/mcp"
 */
const readline = require('readline');

const targetUrl = "${baseUrl}/api/mcp";
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const payload = JSON.parse(trimmed);
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    process.stdout.write(JSON.stringify(data) + '\\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message } }) + '\\n');
  }
});`;

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Hermes Agent & OpenClaw Connector
                  </h2>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    MCP JSON-RPC & HTTP Ready
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Connect open-source AI agents (Hermes Agent, OpenClaw, Cursor, Claude) to query, audit, configure, and simulate MikroTik RouterOS firewall rules and VLANs.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={syncStateToServer}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              title="Sync current React table rules and configuration to server agent engine"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-cyan-400' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Router State'}
            </button>

            <a
              href="/api/agent/export.rsc"
              download="routeros-config.rsc"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg shadow-cyan-950/20"
            >
              <Download size={13} />
              Export .RSC Script
            </a>
          </div>
        </div>

        {/* Quick URL Endpoints Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-900/80">
          <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">MCP Server Endpoint</span>
              <code className="text-xs text-cyan-300 font-mono">/api/mcp</code>
            </div>
            <button
              onClick={() => handleCopy(`${baseUrl}/api/mcp`, 'mcp-url')}
              className="p-1.5 text-zinc-500 hover:text-cyan-300 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Copy Full MCP URL"
            >
              {copiedId === 'mcp-url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
            <div
              className="cursor-pointer group"
              onClick={() => setActiveSetupTab('tool-yaml')}
              title="Click to open JSON & tool.yaml Generator"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Hermes Tool Manifest</span>
                <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1 rounded">Generator</span>
              </div>
              <code className="text-xs text-zinc-300 group-hover:text-cyan-300 font-mono transition-colors">/api/hermes/tool.yaml</code>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveSetupTab('tool-yaml')}
                className="p-1.5 text-zinc-500 hover:text-cyan-300 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Configure and Generate tool.yaml"
              >
                <Code2 size={14} />
              </button>
              <a
                href="/api/hermes/tool.yaml"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-zinc-500 hover:text-cyan-300 rounded hover:bg-zinc-900 transition-colors"
                title="Open Raw Manifest"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Hermes Skill Document</span>
              <code className="text-xs text-zinc-300 font-mono">/api/hermes/SKILL.md</code>
            </div>
            <a
              href="/api/hermes/SKILL.md"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-500 hover:text-cyan-300 rounded hover:bg-zinc-900 transition-colors"
              title="Open Skill"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Tester & Setup Guides */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Live MCP / Agent Simulator */}
        <div className="xl:col-span-6 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Interactive MCP & Agent Test Console
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Test agent calls live</span>
            </div>

            {/* Test Action Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Select Agent Action to Simulate
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'simulate', label: 'Packet Trace', desc: 'Simulate L2/L3 flow' },
                  { id: 'initialize', label: 'Handshake', desc: 'MCP initialize' },
                  { id: 'tools_list', label: 'List Tools', desc: 'List MCP capabilities' },
                  { id: 'add_rule', label: 'Add Rule', desc: 'Add filter rule via agent' },
                  { id: 'update_comment', label: 'Annotate', desc: 'Update rule comment' },
                  { id: 'reorder', label: 'Reorder', desc: 'Elevate rule priority' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTestAction(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      testAction === item.id
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-[#050508] border-zinc-900 text-zinc-400 hover:border-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Request Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>Agent JSON-RPC 2.0 Request (`POST /api/mcp`)</span>
                <button
                  onClick={() => handleCopy(testRequestPayload, 'req-copy')}
                  className="hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {copiedId === 'req-copy' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <textarea
                value={testRequestPayload}
                onChange={(e) => setTestRequestPayload(e.target.value)}
                rows={6}
                className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runMcpTest}
              disabled={isExecutingTest}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExecutingTest ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {isExecutingTest ? 'Executing Agent Call...' : 'Execute Tool Call via MCP'}
            </button>

            {/* Response Payload */}
            {testResponsePayload && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Server Response
                  </span>
                  <button
                    onClick={() => handleCopy(testResponsePayload, 'res-copy')}
                    className="hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {copiedId === 'res-copy' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="w-full bg-[#050508] border border-zinc-800/80 rounded-xl p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56">
                  {testResponsePayload}
                </pre>
              </div>
            )}
          </div>

          {/* Live Agent Activity Log */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap size={13} className="text-cyan-400" />
                Live Agent Audit & Activity Log
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">
                Auto-refreshed from engine
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
              {agentLogs.length === 0 ? (
                <div className="text-zinc-600 italic text-center py-4">No agent calls recorded yet.</div>
              ) : (
                agentLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded-lg bg-[#050508] border border-zinc-900 flex items-start gap-2.5">
                    <span className="text-zinc-500 text-[10px] shrink-0 mt-0.5">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded shrink-0 uppercase ${
                      log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      log.type === 'command' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' :
                      log.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {log.source}
                    </span>
                    <span className="text-zinc-300 break-words flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Hermes Agent Setup Wizard */}
        <div className="xl:col-span-6 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Hermes Agent Setup Guide
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Follows Hermes Docs</span>
            </div>

            {/* Setup Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-[#050508] border border-zinc-900 rounded-xl">
              {[
                { id: 'mcp', label: '1. MCP Server', subtitle: 'config.yaml' },
                { id: 'tool-yaml', label: '2. tool.yaml Generator', subtitle: 'JSON Utility & YAML' },
                { id: 'skill', label: '3. Skill Package', subtitle: 'SKILL.md' },
                { id: 'bridge', label: '4. CLI Bridge', subtitle: 'Stdio bridge' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSetupTab(tab.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-start cursor-pointer ${
                    activeSetupTab === tab.id
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-bold">{tab.label}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">{tab.subtitle}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: MCP Server Setup */}
            {activeSetupTab === 'mcp' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-zinc-300 space-y-1.5">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles size={14} /> Recommended Integration: MCP Server
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    As stated in the Hermes documentation, MCP (Model Context Protocol) is the fastest and cleanest way to connect Hermes to external tool providers.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Add to <code className="text-zinc-200 font-mono">~/.hermes/config.yaml</code>:</span>
                    <button
                      onClick={() => handleCopy(mcpConfigSnippet, 'mcp-snippet')}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      {copiedId === 'mcp-snippet' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === 'mcp-snippet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                    {mcpConfigSnippet}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    How to Test in Hermes Agent:
                  </h4>
                  <div className="p-3 bg-[#050508] border border-zinc-900 rounded-xl space-y-2 text-[11px] text-zinc-400 font-mono">
                    <div>
                      <span className="text-zinc-600">$</span> hermes chat
                    </div>
                    <div className="text-cyan-300 italic">
                      "Hermes, inspect the MikroTik firewall rules and verify that the Guest Subnet (VLAN 20) is properly isolated from the Main Subnet (VLAN 10)."
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: tool.yaml HTTP Manifest & JSON Generator Utility */}
            {activeSetupTab === 'tool-yaml' && (
              <HermesToolYamlGenerator baseUrl={baseUrl} />
            )}

            {/* Tab 3: SKILL.md Package */}
            {activeSetupTab === 'skill' && (
              <div className="space-y-4 text-xs">
                <p className="text-zinc-400 text-[11px]">
                  Wrap your tool in a skill folder with <code className="text-zinc-200 font-mono">SKILL.md</code> so Hermes Agent understands when and how to manage top-to-bottom rule priority and VLAN isolation.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>File: <code className="text-zinc-200 font-mono">~/.hermes/skills/routeros/SKILL.md</code></span>
                    <div className="flex items-center gap-3">
                      <a
                        href="/api/hermes/SKILL.md"
                        download="SKILL.md"
                        className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={12} /> Download
                      </a>
                      <button
                        onClick={() => handleCopy(skillMdSnippet, 'skill-md-snippet')}
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        {copiedId === 'skill-md-snippet' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === 'skill-md-snippet' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-72">
                    {skillMdSnippet}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: CLI Stdio Bridge */}
            {activeSetupTab === 'bridge' && (
              <div className="space-y-4 text-xs">
                <p className="text-zinc-400 text-[11px]">
                  For local agent runners like OpenClaw or local Hermes CLI running over standard input/output (stdio), run this bridge script on your machine to proxy stdio JSON-RPC calls to this cloud applet.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Script: <code className="text-zinc-200 font-mono">bridge.js</code></span>
                    <button
                      onClick={() => handleCopy(bridgeSnippet, 'bridge-snippet')}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      {copiedId === 'bridge-snippet' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === 'bridge-snippet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-72">
                    {bridgeSnippet}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
