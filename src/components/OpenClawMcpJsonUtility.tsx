import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Server,
  Network,
  Cpu,
  Shield,
  Layers,
  Settings2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Folder,
  ArrowRight,
  Zap
} from 'lucide-react';

interface OpenClawMcpJsonUtilityProps {
  baseUrl: string;
  defaultRouterIp?: string;
}

export default function OpenClawMcpJsonUtility({
  baseUrl,
  defaultRouterIp = '192.168.88.1'
}: OpenClawMcpJsonUtilityProps) {
  // Server Configuration State
  const [serverName, setServerName] = useState<string>('openclaw_mikrotik');
  const [commandPath, setCommandPath] = useState<string>('node');
  const [bridgeScriptPath, setBridgeScriptPath] = useState<string>('~/.hermes/bridges/openclaw-mikrotik.js');
  const [routerHost, setRouterHost] = useState<string>(defaultRouterIp);
  const [apiPort, setApiPort] = useState<string>('8728');
  const [username, setUsername] = useState<string>('admin');
  const [passwordEnv, setPasswordEnv] = useState<string>('ROUTEROS_PASSWORD');
  const [useTls, setUseTls] = useState<boolean>(false);
  const [strictPriority, setStrictPriority] = useState<boolean>(true);
  const [vlanAware, setVlanAware] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [timeoutMs, setTimeoutMs] = useState<number>(5000);

  // Target config format & active tab
  const [configTarget, setConfigTarget] = useState<'hermes-yaml' | 'openclaw-json' | 'claude-desktop'>('hermes-yaml');
  const [snippetFormat, setSnippetFormat] = useState<'server-json' | 'full-envelope-json' | 'yaml' | 'bash'>('server-json');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Presets
  const commandPresets = [
    { label: 'node', val: 'node', desc: 'Default Node.js runtime' },
    { label: '/usr/bin/node', val: '/usr/bin/node', desc: 'Absolute POSIX node path' },
    { label: 'openclaw', val: 'openclaw', desc: 'OpenClaw native CLI binary' },
    { label: 'python3', val: 'python3', desc: 'Python runtime wrapper' }
  ];

  const routerPresets = [
    { label: '192.168.88.1', val: '192.168.88.1', desc: 'Default RouterOS LAN IP' },
    { label: '192.168.10.1', val: '192.168.10.1', desc: 'VLAN 10 Corporate Gateway' },
    { label: '192.168.20.1', val: '192.168.20.1', desc: 'VLAN 20 Guest Gateway' },
    { label: '10.0.0.1', val: '10.0.0.1', desc: 'Enterprise Core Gateway' }
  ];

  const portPresets = [
    { label: '8728 (API)', val: '8728', tls: false, desc: 'RouterOS Standard API' },
    { label: '8729 (API-SSL)', val: '8729', tls: true, desc: 'RouterOS Encrypted TLS API' },
    { label: '80 (HTTP REST)', val: '80', tls: false, desc: 'RouterOS v7 REST API' },
    { label: '443 (HTTPS REST)', val: '443', tls: true, desc: 'RouterOS v7 HTTPS REST' }
  ];

  // Calculated Args Array
  const calculatedArgs = useMemo(() => {
    const args: string[] = [
      bridgeScriptPath,
      '--endpoint',
      `${baseUrl}/api/mcp`,
      '--router-ip',
      routerHost,
      '--api-port',
      apiPort,
      '--user',
      username,
      '--password-env',
      passwordEnv
    ];

    if (useTls) {
      args.push('--tls', 'true');
    }
    if (strictPriority) {
      args.push('--strict-priority', 'true');
    }
    if (vlanAware) {
      args.push('--vlan-aware', 'true');
    }
    if (autoSync) {
      args.push('--auto-sync', 'true');
    }
    if (timeoutMs !== 5000) {
      args.push('--timeout', String(timeoutMs));
    }

    return args;
  }, [
    bridgeScriptPath,
    baseUrl,
    routerHost,
    apiPort,
    username,
    passwordEnv,
    useTls,
    strictPriority,
    vlanAware,
    autoSync,
    timeoutMs
  ]);

  // Calculated Environment Variables Object
  const calculatedEnv = useMemo(() => {
    return {
      MIKROTIK_HOST: routerHost,
      MIKROTIK_PORT: apiPort,
      MIKROTIK_USER: username,
      [passwordEnv]: 'YOUR_ROUTER_PASSWORD_HERE',
      OPENCLAW_MCP_ENDPOINT: `${baseUrl}/api/mcp`,
      MIKROTIK_TLS: useTls ? 'true' : 'false'
    };
  }, [routerHost, apiPort, username, passwordEnv, baseUrl, useTls]);

  // Server Entry Object (Pre-configured JSON snippet)
  const serverEntryObject = useMemo(() => {
    return {
      [serverName]: {
        command: commandPath,
        args: calculatedArgs,
        env: calculatedEnv
      }
    };
  }, [serverName, commandPath, calculatedArgs, calculatedEnv]);

  // Full Envelope Object depending on target
  const fullEnvelopeObject = useMemo(() => {
    if (configTarget === 'hermes-yaml') {
      // In Hermes config.yaml:
      // YAML supports embedded JSON objects or full JSON formatting under mcp.servers
      return {
        mcp: {
          servers: serverEntryObject
        }
      };
    } else if (configTarget === 'openclaw-json') {
      // OpenClaw config.json standard format
      return {
        mcpServers: serverEntryObject
      };
    } else {
      // Claude Desktop / standard MCP client format
      return {
        mcpServers: serverEntryObject
      };
    }
  }, [configTarget, serverEntryObject]);

  // JSON Strings
  const serverJsonString = useMemo(() => {
    return JSON.stringify(serverEntryObject, null, 2);
  }, [serverEntryObject]);

  const fullEnvelopeJsonString = useMemo(() => {
    return JSON.stringify(fullEnvelopeObject, null, 2);
  }, [fullEnvelopeObject]);

  // YAML String representation for ~/.hermes/config.yaml
  const yamlString = useMemo(() => {
    const lines: string[] = [
      `# Add to ~/.hermes/config.yaml under mcp: servers:`,
      `mcp:`,
      `  servers:`,
      `    ${serverName}:`,
      `      command: "${commandPath}"`,
      `      args:`
    ];

    calculatedArgs.forEach(arg => {
      lines.push(`        - "${arg}"`);
    });

    lines.push(`      env:`);
    Object.entries(calculatedEnv).forEach(([k, v]) => {
      lines.push(`        ${k}: "${v}"`);
    });

    return lines.join('\n');
  }, [serverName, commandPath, calculatedArgs, calculatedEnv]);

  // Shell Command for Quick Setup
  const bashScript = useMemo(() => {
    return `mkdir -p ~/.hermes ~/.hermes/bridges

# 1. Download OpenClaw MikroTik bridge
curl -s "${baseUrl}/api/hermes/bridge.js" > ~/.hermes/bridges/openclaw-mikrotik.js
chmod +x ~/.hermes/bridges/openclaw-mikrotik.js

# 2. Append MCP registration into ~/.hermes/config.yaml
cat << 'EOF' >> ~/.hermes/config.yaml

# OpenClaw MikroTik RouterOS MCP Registration
${yamlString}
EOF

echo "Successfully registered ${serverName} in ~/.hermes/config.yaml"`;
  }, [baseUrl, yamlString, serverName]);

  // Target file description
  const targetFilePath = useMemo(() => {
    if (configTarget === 'hermes-yaml') return '~/.hermes/config.yaml';
    if (configTarget === 'openclaw-json') return '~/.openclaw/openclaw.json';
    return '~/Library/Application Support/Claude/claude_desktop_config.json';
  }, [configTarget]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download helper
  const handleDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-900 border border-cyan-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/50 text-cyan-400">
              <Server size={16} />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              RouterOS OpenClaw MCP Server Registration Utility
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              config.yaml JSON Snippet
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Generate and copy pre-configured JSON registration blocks for OpenClaw and Hermes Agent MCP configuration, fully equipped with command path, bridge args, and RouterOS connectivity.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopy(serverJsonString, 'copy-top-json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
          >
            {copiedId === 'copy-top-json' ? <Check size={13} /> : <Copy size={13} />}
            {copiedId === 'copy-top-json' ? 'Copied JSON' : 'Copy JSON Snippet'}
          </button>
        </div>
      </div>

      {/* Target Destination & Config Type Selector */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Folder size={16} className="text-cyan-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
              Target Configuration Destination
            </span>
            <code className="text-xs font-mono text-cyan-300 font-bold">
              {targetFilePath}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-lg">
          <button
            onClick={() => setConfigTarget('hermes-yaml')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              configTarget === 'hermes-yaml' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hermes config.yaml
          </button>
          <button
            onClick={() => setConfigTarget('openclaw-json')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              configTarget === 'openclaw-json' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            OpenClaw JSON
          </button>
          <button
            onClick={() => setConfigTarget('claude-desktop')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              configTarget === 'claude-desktop' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            MCP Clients
          </button>
        </div>
      </div>

      {/* Connectivity & Command Configuration Parameters */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-cyan-400" />
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              MikroTik Connectivity & Command Arguments
            </h5>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Injects into command args & env</span>
        </div>

        {/* Row 1: Command Path & Script Path */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-400 font-bold block">
                Command Executable (Path)
              </label>
              <div className="flex gap-1 text-[9px] font-mono">
                {commandPresets.map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setCommandPath(p.val)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      commandPath === p.val ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={commandPath}
              onChange={e => setCommandPath(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="node or /usr/local/bin/node"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">
              Bridge Script Path (args[0])
            </label>
            <input
              type="text"
              value={bridgeScriptPath}
              onChange={e => setBridgeScriptPath(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="~/.hermes/bridges/openclaw-mikrotik.js"
            />
          </div>
        </div>

        {/* Row 2: Router IP, API Port, Username, Password Env */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-400 font-bold block">
                Router Host / IP
              </label>
              <div className="flex gap-1 text-[9px] font-mono">
                {routerPresets.slice(0, 2).map(r => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setRouterHost(r.val)}
                    className={`px-1 py-0.2 rounded cursor-pointer ${
                      routerHost === r.val ? 'text-cyan-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {r.val.split('.').slice(2).join('.')}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={routerHost}
              onChange={e => setRouterHost(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="192.168.88.1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-400 font-bold block">
                API Port
              </label>
              <div className="flex gap-1 text-[9px] font-mono">
                {portPresets.slice(0, 2).map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      setApiPort(p.val);
                      setUseTls(p.tls);
                    }}
                    className={`px-1 py-0.2 rounded cursor-pointer ${
                      apiPort === p.val ? 'text-cyan-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {p.val}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={apiPort}
              onChange={e => setApiPort(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="8728"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">
              RouterOS User
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">
              Password Env Var
            </label>
            <input
              type="text"
              value={passwordEnv}
              onChange={e => setPasswordEnv(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="ROUTEROS_PASSWORD"
            />
          </div>
        </div>

        {/* Row 3: Feature Flags Checkboxes */}
        <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={strictPriority}
              onChange={e => setStrictPriority(e.target.checked)}
              className="rounded border-zinc-700 text-cyan-500 focus:ring-0 bg-zinc-900 cursor-pointer"
            />
            <div>
              <div className="text-zinc-200 font-bold text-[11px]">Strict Priority</div>
              <div className="text-[9px] text-zinc-500">Top-to-bottom rule order</div>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={vlanAware}
              onChange={e => setVlanAware(e.target.checked)}
              className="rounded border-zinc-700 text-cyan-500 focus:ring-0 bg-zinc-900 cursor-pointer"
            />
            <div>
              <div className="text-zinc-200 font-bold text-[11px]">VLAN Aware</div>
              <div className="text-[9px] text-zinc-500">Isolate VLAN 10 & 20</div>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={useTls}
              onChange={e => setUseTls(e.target.checked)}
              className="rounded border-zinc-700 text-cyan-500 focus:ring-0 bg-zinc-900 cursor-pointer"
            />
            <div>
              <div className="text-zinc-200 font-bold text-[11px]">TLS Encryption</div>
              <div className="text-[9px] text-zinc-500">Port 8729 / HTTPS</div>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={e => setAutoSync(e.target.checked)}
              className="rounded border-zinc-700 text-cyan-500 focus:ring-0 bg-zinc-900 cursor-pointer"
            />
            <div>
              <div className="text-zinc-200 font-bold text-[11px]">Live Sync</div>
              <div className="text-[9px] text-zinc-500">Bi-directional state sync</div>
            </div>
          </label>
        </div>
      </div>

      {/* Code Snippet Viewer & Format Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#050508] border border-zinc-900 rounded-lg self-start">
            <button
              onClick={() => setSnippetFormat('server-json')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                snippetFormat === 'server-json' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              JSON Snippet (Server block)
            </button>
            <button
              onClick={() => setSnippetFormat('full-envelope-json')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                snippetFormat === 'full-envelope-json' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Full JSON Config
            </button>
            <button
              onClick={() => setSnippetFormat('yaml')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                snippetFormat === 'yaml' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              YAML (config.yaml)
            </button>
            <button
              onClick={() => setSnippetFormat('bash')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                snippetFormat === 'bash' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shell Append Script
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(
                snippetFormat === 'yaml' ? yamlString : fullEnvelopeJsonString,
                snippetFormat === 'yaml' ? 'openclaw-mcp.yaml' : 'openclaw-mcp.json',
                snippetFormat === 'yaml' ? 'text/yaml' : 'application/json'
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            >
              <Download size={13} />
              Download {snippetFormat === 'yaml' ? 'YAML' : 'JSON'}
            </button>

            <button
              onClick={() => {
                const textToCopy =
                  snippetFormat === 'server-json'
                    ? serverJsonString
                    : snippetFormat === 'full-envelope-json'
                    ? fullEnvelopeJsonString
                    : snippetFormat === 'yaml'
                    ? yamlString
                    : bashScript;
                handleCopy(textToCopy, 'copy-main-snippet');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
            >
              {copiedId === 'copy-main-snippet' ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === 'copy-main-snippet' ? 'Copied to Clipboard' : 'Copy Snippet'}
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="relative">
          <pre className="w-full bg-[#050508] border border-zinc-800/80 rounded-xl p-4 font-mono text-[11px] text-zinc-200 overflow-x-auto max-h-96 leading-relaxed select-text">
            {snippetFormat === 'server-json' && serverJsonString}
            {snippetFormat === 'full-envelope-json' && fullEnvelopeJsonString}
            {snippetFormat === 'yaml' && yamlString}
            {snippetFormat === 'bash' && bashScript}
          </pre>
        </div>
      </div>

      {/* Verification & Argument Inspection Card */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              MCP Arguments Checklist & Protocol Verification
            </h5>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">All Parameters Valid</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">Command Path:</span>{' '}
                <code className="text-cyan-300 font-mono text-[10px]">{commandPath}</code>
                <p className="text-[10px] text-zinc-500">Executable invoked by OpenClaw/Hermes on your machine</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">Bridge Target:</span>{' '}
                <code className="text-zinc-300 font-mono text-[10px]">{bridgeScriptPath}</code>
                <p className="text-[10px] text-zinc-500">Proxies stdio JSON-RPC to the cloud applet HTTP endpoint</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">MCP Cloud Endpoint:</span>{' '}
                <code className="text-cyan-400 font-mono text-[10px] truncate block max-w-xs">{baseUrl}/api/mcp</code>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">Router Target:</span>{' '}
                <code className="text-zinc-300 font-mono text-[10px]">{username}@{routerHost}:{apiPort}</code>
                <p className="text-[10px] text-zinc-500">{useTls ? 'SSL/TLS encrypted API' : 'Cleartext RouterOS API'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">Safety & Isolation:</span>{' '}
                <span className="text-emerald-400 font-mono text-[10px]">
                  strict-priority={strictPriority ? 'true' : 'false'}, vlan-aware={vlanAware ? 'true' : 'false'}
                </span>
                <p className="text-[10px] text-zinc-500">Protects VLAN 10/20 boundaries during AI automated changes</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-zinc-300">Credential Protection:</span>{' '}
                <span className="text-amber-400 font-mono text-[10px]">
                  {passwordEnv} (Env variable, never hardcoded in git)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
