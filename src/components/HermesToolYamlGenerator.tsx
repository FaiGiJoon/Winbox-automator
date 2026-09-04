import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Settings2,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  Terminal,
  Code2,
  Plus,
  Trash2,
  RefreshCw,
  Folder,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface ToolEndpointDef {
  key: string;
  name: string;
  category: 'Firewall' | 'VLAN & Security' | 'Interfaces' | 'System';
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  description: string;
  headers?: Record<string, string>;
  body_params?: Record<string, string>;
  query_params?: Record<string, string>;
  selected: boolean;
  isCustom?: boolean;
}

const DEFAULT_OPERATIONS: ToolEndpointDef[] = [
  {
    key: 'get_router_state',
    name: 'Get Router State & Priority Rules',
    category: 'Firewall',
    path: '/api/agent/state',
    method: 'GET',
    description: 'Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall filter rules',
    selected: true
  },
  {
    key: 'add_firewall_rule',
    name: 'Add Firewall Filter Rule',
    category: 'Firewall',
    path: '/api/agent/rules/add',
    method: 'POST',
    description: 'Add a firewall filter rule with chain, action, protocol, addresses, ports, priority position, and comment',
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
    },
    selected: true
  },
  {
    key: 'delete_firewall_rule',
    name: 'Delete Firewall Rule',
    category: 'Firewall',
    path: '/api/agent/rules/delete',
    method: 'POST',
    description: 'Delete a firewall filter rule by its ID or priority index',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      ruleId: 'ruleId',
      priorityIndex: 'priorityIndex'
    },
    selected: true
  },
  {
    key: 'update_rule_comment',
    name: 'Update Rule Documentation / Comment',
    category: 'Firewall',
    path: '/api/agent/rules/comment',
    method: 'POST',
    description: 'Update documentation comment on an existing firewall rule for audit and compliance logging',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      ruleId: 'ruleId',
      priorityIndex: 'priorityIndex',
      comment: 'comment'
    },
    selected: true
  },
  {
    key: 'reorder_firewall_rule',
    name: 'Reorder Rule Priority',
    category: 'Firewall',
    path: '/api/agent/rules/reorder',
    method: 'POST',
    description: 'Change the priority order of a firewall filter rule (first matching rule evaluates first)',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      fromPriority: 'fromPriority',
      toPriority: 'toPriority'
    },
    selected: true
  },
  {
    key: 'simulate_packet_trace',
    name: 'Simulate Packet Trace & VLAN Isolation',
    category: 'VLAN & Security',
    path: '/api/agent/simulate',
    method: 'POST',
    description: 'Run packet simulation to test whether firewall rules accept or drop traffic between subnets (e.g. VLAN 20 to 10)',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      srcIp: 'srcIp',
      dstIp: 'dstIp',
      protocol: 'protocol',
      dstPort: 'dstPort'
    },
    selected: true
  },
  {
    key: 'get_interface_stats',
    name: 'Interface Traffic & Link States',
    category: 'Interfaces',
    path: '/api/agent/interfaces/stats',
    method: 'GET',
    description: 'Query interface traffic rates (RX/TX Mbps), link states, and packet statistics',
    selected: true
  },
  {
    key: 'export_routeros_rsc',
    name: 'Export Production .RSC Script',
    category: 'System',
    path: '/api/agent/export.rsc',
    method: 'GET',
    description: 'Generate complete production MikroTik RouterOS v7 .rsc CLI configuration export script',
    selected: true
  }
];

interface HermesToolYamlGeneratorProps {
  baseUrl: string;
}

export default function HermesToolYamlGenerator({ baseUrl }: HermesToolYamlGeneratorProps) {
  // Generator Configuration State
  const [toolName, setToolName] = useState<string>('mikrotik_routeros');
  const [description, setDescription] = useState<string>(
    'Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export.'
  );
  const [version, setVersion] = useState<string>('1.0.0');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(baseUrl);
  const [authScheme, setAuthScheme] = useState<'none' | 'bearer' | 'apiKey'>('none');
  const [authToken, setAuthToken] = useState<string>('hermes_routeros_secret_token');
  const [outputView, setOutputView] = useState<'yaml' | 'json' | 'bash'>('yaml');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Operations List
  const [operations, setOperations] = useState<ToolEndpointDef[]>(DEFAULT_OPERATIONS);

  // Custom Operation Builder & JSON Importer
  const [showCustomBuilder, setShowCustomBuilder] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<{
    key: string;
    name: string;
    path: string;
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    description: string;
    category: 'Firewall' | 'VLAN & Security' | 'Interfaces' | 'System';
    bodyParams: string;
  }>({
    key: 'backup_router_state',
    name: 'Backup Router Snapshot',
    path: '/api/agent/backup',
    method: 'POST',
    description: 'Create an atomic configuration snapshot on the router',
    category: 'System',
    bodyParams: 'name: name, comment: comment'
  });

  const targetDirectory = `~/.hermes/tools/${toolName || 'routeros'}`;
  const targetFilePath = `${targetDirectory}/tool.yaml`;

  // Toggle selection
  const toggleOperation = (key: string) => {
    setOperations(prev =>
      prev.map(op => (op.key === key ? { ...op, selected: !op.selected } : op))
    );
  };

  // Preset Filters
  const applyPreset = (preset: 'all' | 'firewall' | 'vlan' | 'none') => {
    setOperations(prev =>
      prev.map(op => {
        if (preset === 'all') return { ...op, selected: true };
        if (preset === 'none') return { ...op, selected: false };
        if (preset === 'firewall') {
          return {
            ...op,
            selected: op.category === 'Firewall' || op.key === 'get_router_state'
          };
        }
        if (preset === 'vlan') {
          return {
            ...op,
            selected: op.key === 'get_router_state' || op.key === 'simulate_packet_trace' || op.key === 'export_routeros_rsc'
          };
        }
        return op;
      })
    );
  };

  // Remove custom operation
  const removeCustomOperation = (key: string) => {
    setOperations(prev => prev.filter(op => op.key !== key));
  };

  // Add custom operation from form
  const handleAddCustomOperation = () => {
    if (!customForm.key.trim() || !customForm.path.trim()) return;

    let parsedBodyParams: Record<string, string> | undefined = undefined;
    if (customForm.bodyParams.trim()) {
      parsedBodyParams = {};
      customForm.bodyParams.split(',').forEach(item => {
        const [k, v] = item.split(':').map(s => s.trim());
        if (k) parsedBodyParams![k] = v || k;
      });
    }

    const newOp: ToolEndpointDef = {
      key: customForm.key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: customForm.name || customForm.key,
      category: customForm.category,
      path: customForm.path.startsWith('/') ? customForm.path : `/${customForm.path}`,
      method: customForm.method,
      description: customForm.description || 'Custom MikroTik Agent endpoint',
      headers: customForm.method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
      body_params: parsedBodyParams,
      selected: true,
      isCustom: true
    };

    setOperations(prev => [...prev.filter(op => op.key !== newOp.key), newOp]);
    setShowCustomBuilder(false);
  };

  // Import raw JSON into generator
  const handleImportJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.name) setToolName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.version) setVersion(parsed.version);
      if (parsed.base_url) setCustomBaseUrl(parsed.base_url);

      if (parsed.endpoints && typeof parsed.endpoints === 'object') {
        const importedOps: ToolEndpointDef[] = Object.entries(parsed.endpoints).map(([k, v]: [string, any]) => ({
          key: k,
          name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'System',
          path: v.path || '/api/agent',
          method: (v.method || 'GET').toUpperCase() as any,
          description: v.description || '',
          headers: v.headers,
          body_params: v.body_params,
          query_params: v.query_params,
          selected: true,
          isCustom: true
        }));

        setOperations(prev => {
          const existingKeys = new Set(importedOps.map(op => op.key));
          return [...prev.filter(op => !existingKeys.has(op.key)), ...importedOps];
        });
      }
      setJsonInput('');
      setShowCustomBuilder(false);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON format');
    }
  };

  // Construct JSON Schema Object
  const generatedJsonObject = useMemo(() => {
    const selectedOps = operations.filter(op => op.selected);

    const endpointsObj: Record<string, any> = {};

    selectedOps.forEach(op => {
      const ep: Record<string, any> = {
        path: op.path,
        method: op.method,
        description: op.description
      };

      // Header handling including auth
      const headers: Record<string, string> = { ...(op.headers || {}) };
      if (authScheme === 'bearer') {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else if (authScheme === 'apiKey') {
        headers['X-RouterOS-Key'] = authToken;
      }

      if (Object.keys(headers).length > 0) {
        ep.headers = headers;
      }

      if (op.body_params && Object.keys(op.body_params).length > 0) {
        ep.body_params = op.body_params;
      }

      if (op.query_params && Object.keys(op.query_params).length > 0) {
        ep.query_params = op.query_params;
      }

      endpointsObj[op.key] = ep;
    });

    return {
      name: toolName || 'mikrotik_routeros',
      description: description,
      version: version || '1.0.0',
      type: 'http',
      base_url: customBaseUrl || baseUrl,
      endpoints: endpointsObj
    };
  }, [operations, toolName, description, version, customBaseUrl, baseUrl, authScheme, authToken]);

  // Construct YAML String according to Hermes Agent specification
  const generatedYaml = useMemo(() => {
    const lines: string[] = [
      `# Hermes Agent Tool Manifest: MikroTik RouterOS`,
      `# Destination: ${targetFilePath}`,
      `# Documentation: https://hermes-agent.readthedocs.io`,
      ``,
      `name: ${generatedJsonObject.name}`,
      `description: ${JSON.stringify(generatedJsonObject.description)}`,
      `version: "${generatedJsonObject.version}"`,
      `type: "${generatedJsonObject.type}"`,
      `base_url: "${generatedJsonObject.base_url}"`,
      ``,
      `endpoints:`
    ];

    const entries = Object.entries(generatedJsonObject.endpoints);
    if (entries.length === 0) {
      lines.push(`  # No operations selected. Toggle operations above to include them.`);
    } else {
      entries.forEach(([key, ep]: [string, any], idx) => {
        lines.push(`  ${key}:`);
        lines.push(`    path: "${ep.path}"`);
        lines.push(`    method: "${ep.method}"`);
        lines.push(`    description: ${JSON.stringify(ep.description)}`);

        if (ep.headers && Object.keys(ep.headers).length > 0) {
          lines.push(`    headers:`);
          Object.entries(ep.headers).forEach(([hk, hv]) => {
            lines.push(`      ${hk}: "${hv}"`);
          });
        }

        if (ep.body_params && Object.keys(ep.body_params).length > 0) {
          lines.push(`    body_params:`);
          Object.entries(ep.body_params).forEach(([pk, pv]) => {
            lines.push(`      ${pk}: "${pv}"`);
          });
        }

        if (ep.query_params && Object.keys(ep.query_params).length > 0) {
          lines.push(`    query_params:`);
          Object.entries(ep.query_params).forEach(([qk, qv]) => {
            lines.push(`      ${qk}: "${qv}"`);
          });
        }

        if (idx < entries.length - 1) {
          lines.push(``);
        }
      });
    }

    return lines.join('\n');
  }, [generatedJsonObject, targetFilePath]);

  const generatedJson = useMemo(() => {
    return JSON.stringify(generatedJsonObject, null, 2);
  }, [generatedJsonObject]);

  // Shell installation script
  const generatedBashCommand = useMemo(() => {
    return `mkdir -p ${targetDirectory}
cat << 'EOF' > ${targetFilePath}
${generatedYaml}
EOF
echo "Saved tool manifest to ${targetFilePath}"`;
  }, [targetDirectory, targetFilePath, generatedYaml]);

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

  const selectedCount = operations.filter(o => o.selected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-900 border border-cyan-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/50 text-cyan-400">
              <Code2 size={16} />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              MikroTik tool.yaml JSON Utility
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Hermes Tools Directory
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Generate and customize the <code className="text-zinc-200 font-mono">tool.yaml</code> manifest for MikroTik RouterOS operations, or inspect the JSON schema representation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus size={13} className="text-cyan-400" />
            {showCustomBuilder ? 'Close Editor' : 'Add Custom JSON Endpoint'}
          </button>
        </div>
      </div>

      {/* Target Directory Path Indicator */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Folder size={16} className="text-amber-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
              Hermes Tools Directory Target
            </span>
            <code className="text-xs font-mono text-cyan-300 font-bold">
              {targetFilePath}
            </code>
          </div>
        </div>

        <button
          onClick={() => handleCopy(targetFilePath, 'target-path')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {copiedId === 'target-path' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copiedId === 'target-path' ? 'Copied Path' : 'Copy Path'}
        </button>
      </div>

      {/* Custom JSON Endpoint Importer / Editor Drawer */}
      {showCustomBuilder && (
        <div className="bg-[#08080d] border border-cyan-900/40 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Extend Tool Manifest (Custom JSON Endpoint)
              </h5>
            </div>
            <span className="text-[10px] text-zinc-500">Inject custom MikroTik operations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Form */}
            <div className="space-y-3 bg-[#050508] border border-zinc-900 rounded-lg p-3">
              <span className="text-[11px] font-bold text-zinc-300 block">Operation Field Builder</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block">Key (Snake Case)</label>
                  <input
                    type="text"
                    value={customForm.key}
                    onChange={e => setCustomForm({ ...customForm, key: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                    placeholder="e.g. reboot_router"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block">HTTP Method</label>
                  <select
                    value={customForm.method}
                    onChange={e => setCustomForm({ ...customForm, method: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Path</label>
                <input
                  type="text"
                  value={customForm.path}
                  onChange={e => setCustomForm({ ...customForm, path: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                  placeholder="/api/agent/custom"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Description (Agent Guidance)</label>
                <input
                  type="text"
                  value={customForm.description}
                  onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                  placeholder="Explain what this action performs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Body Parameters (Comma separated key:value)</label>
                <input
                  type="text"
                  value={customForm.bodyParams}
                  onChange={e => setCustomForm({ ...customForm, bodyParams: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                  placeholder="param1: param1, param2: param2"
                />
              </div>

              <button
                onClick={handleAddCustomOperation}
                className="w-full py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Add Endpoint to Manifest
              </button>
            </div>

            {/* Paste Raw JSON */}
            <div className="space-y-3 bg-[#050508] border border-zinc-900 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-300 block">Or Paste Raw JSON Endpoint Spec</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Paste existing tool manifest JSON to merge endpoints into this generator.
                </p>
                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder={`{\n  "endpoints": {\n    "custom_ping": {\n      "path": "/api/agent/ping",\n      "method": "POST",\n      "description": "Ping router target"\n    }\n  }\n}`}
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded p-2 text-[11px] font-mono text-zinc-300 mt-2 focus:outline-none focus:border-cyan-600"
                />
                {jsonError && (
                  <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle size={11} /> {jsonError}
                  </div>
                )}
              </div>

              <button
                onClick={handleImportJson}
                disabled={!jsonInput.trim()}
                className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Parse & Merge JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest Configuration Bar */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-cyan-400" />
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Tool Metadata & Network Configuration
            </h5>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">YAML Header Values</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Tool Name</label>
            <input
              type="text"
              value={toolName}
              onChange={e => setToolName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="mikrotik_routeros"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Base URL (Router / Applet Host)</label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={e => setCustomBaseUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="http://localhost:3000"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Auth Header Type</label>
            <select
              value={authScheme}
              onChange={e => setAuthScheme(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="none">None (Direct Ingress)</option>
              <option value="bearer">Bearer Token (Authorization)</option>
              <option value="apiKey">API Key (X-RouterOS-Key)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Version</label>
            <input
              type="text"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="1.0.0"
            />
          </div>
        </div>

        {authScheme !== 'none' && (
          <div className="pt-2">
            <label className="text-[10px] text-cyan-400 font-bold block mb-1">
              {authScheme === 'bearer' ? 'Secret Bearer Token' : 'X-RouterOS-Key Value'}
            </label>
            <input
              type="text"
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              className="w-full bg-zinc-900 border border-cyan-800/40 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono text-xs"
              placeholder="Enter authentication secret or token"
            />
          </div>
        )}
      </div>

      {/* Operations Selector Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-cyan-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Select Common MikroTik Operations ({selectedCount}/{operations.length})
            </h5>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-zinc-500 mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('all')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
            >
              All (8)
            </button>
            <button
              onClick={() => applyPreset('firewall')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 cursor-pointer"
            >
              Firewall Only
            </button>
            <button
              onClick={() => applyPreset('vlan')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 cursor-pointer"
            >
              VLAN & Audit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {operations.map(op => (
            <div
              key={op.key}
              onClick={() => toggleOperation(op.key)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                op.selected
                  ? 'bg-zinc-900/80 border-cyan-700/60 shadow-sm'
                  : 'bg-[#050508] border-zinc-900/90 opacity-60 hover:opacity-80'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={op.selected}
                  onChange={() => {}}
                  className="rounded border-zinc-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-bold text-zinc-100 truncate">{op.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${
                        op.method === 'GET'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : op.method === 'POST'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {op.method}
                    </span>
                  </div>

                  {op.isCustom && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeCustomOperation(op.key);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                      title="Remove custom operation"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {op.description}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <code className="text-[10px] font-mono text-cyan-400 truncate">
                    {op.path}
                  </code>
                  <span className="text-[9px] font-mono text-zinc-500">
                    key: {op.key}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Code Output Display */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#050508] border border-zinc-900 rounded-lg self-start">
            <button
              onClick={() => setOutputView('yaml')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'yaml' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              YAML (tool.yaml)
            </button>
            <button
              onClick={() => setOutputView('json')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'json' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              JSON (tool.json)
            </button>
            <button
              onClick={() => setOutputView('bash')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'bash' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shell Install Command
            </button>
          </div>

          <div className="flex items-center gap-2">
            {outputView === 'yaml' && (
              <>
                <button
                  onClick={() => handleDownload(generatedYaml, 'tool.yaml', 'text/yaml')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download tool.yaml
                </button>
                <button
                  onClick={() => handleCopy(generatedYaml, 'copy-yaml')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
                >
                  {copiedId === 'copy-yaml' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === 'copy-yaml' ? 'Copied tool.yaml' : 'Copy tool.yaml'}
                </button>
              </>
            )}

            {outputView === 'json' && (
              <>
                <button
                  onClick={() => handleDownload(generatedJson, 'tool.json', 'application/json')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download tool.json
                </button>
                <button
                  onClick={() => handleCopy(generatedJson, 'copy-json')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
                >
                  {copiedId === 'copy-json' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === 'copy-json' ? 'Copied JSON' : 'Copy JSON'}
                </button>
              </>
            )}

            {outputView === 'bash' && (
              <button
                onClick={() => handleCopy(generatedBashCommand, 'copy-bash')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
              >
                {copiedId === 'copy-bash' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === 'copy-bash' ? 'Copied Command' : 'Copy Shell Command'}
              </button>
            )}
          </div>
        </div>

        {/* Code Content Box */}
        <div className="relative">
          <pre className="w-full bg-[#050508] border border-zinc-800/80 rounded-xl p-4 font-mono text-[11px] text-zinc-200 overflow-x-auto max-h-96 leading-relaxed select-text">
            {outputView === 'yaml' && generatedYaml}
            {outputView === 'json' && generatedJson}
            {outputView === 'bash' && generatedBashCommand}
          </pre>
        </div>
      </div>

      {/* How to use in Hermes Agent CLI */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-2.5">
        <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          How to Test with Hermes Agent CLI
        </h5>
        <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg space-y-2 font-mono text-[11px]">
          <div className="text-zinc-500"># 1. Create the tool directory and paste the tool.yaml:</div>
          <div className="text-cyan-300">
            mkdir -p {targetDirectory} && cp tool.yaml {targetFilePath}
          </div>
          <div className="text-zinc-500 pt-1"># 2. Launch Hermes chat and prompt the agent:</div>
          <div className="text-zinc-300">
            $ hermes chat
          </div>
          <div className="text-emerald-400 italic pl-3">
            &quot;Use the {toolName} tool to query the firewall rules, then simulate traffic from 192.168.20.55 to 192.168.10.15 to confirm Guest VLAN isolation.&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
