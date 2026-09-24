import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Terminal,
  Zap,
  Check,
  Copy,
  Play,
  RefreshCw,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
  Network,
  Radio,
  ArrowRight,
  ExternalLink,
  Sliders,
  Search,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  Clock,
  RadioTower,
  Wifi,
  Workflow
} from 'lucide-react';
import {
  MIKROTIK_MCP_CATEGORIES,
  FLEET_DEVICES,
  CURATED_EXAMPLE_PROMPTS as EXAMPLE_MCP_PROMPTS,
  McpCategory,
  McpToolItem,
  FleetDevice
} from '../data/mikrotikMcpCatalog';
import { FirewallFilterRule, IPAddressConfig, InterfaceState, FirewallNATRule } from '../types';

interface MikroTikMcpConsoleProps {
  filterRules: FirewallFilterRule[];
  setFilterRules: React.Dispatch<React.SetStateAction<FirewallFilterRule[]>>;
  ips: IPAddressConfig[];
  setIps: React.Dispatch<React.SetStateAction<IPAddressConfig[]>>;
  interfaces: InterfaceState[];
  setInterfaces: React.Dispatch<React.SetStateAction<InterfaceState[]>>;
  natRules: FirewallNATRule[];
  setNatRules: React.Dispatch<React.SetStateAction<FirewallNATRule[]>>;
  addLog: (source: string, message: string, type: 'info' | 'warning' | 'error' | 'command') => void;
}

interface ExecutedStep {
  tool: string;
  args: any;
  description: string;
  cliCommand?: string;
  durationMs: number;
  status: 'success' | 'error';
  result?: any;
}

export default function MikroTikMcpConsole({
  filterRules,
  setFilterRules,
  ips,
  setIps,
  interfaces,
  setInterfaces,
  natRules,
  setNatRules,
  addLog
}: MikroTikMcpConsoleProps) {
  // Navigation tabs inside MikroTik MCP Console
  const [activeSubTab, setActiveSubTab] = useState<'prompt' | 'catalog' | 'safemode' | 'transports' | 'fleet'>('prompt');

  // Active fleet router selection
  const [selectedDevice, setSelectedDevice] = useState<FleetDevice>(FLEET_DEVICES[0]);

  // Prompt execution state
  const [promptText, setPromptText] = useState<string>(
    'Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool from .10 to .100, and masquerade out to WAN.'
  );
  const [isArmingSafeMode, setIsArmingSafeMode] = useState<boolean>(true);
  const [isExecutingPrompt, setIsExecutingPrompt] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{
    prompt: string;
    device: string;
    stepsCount: number;
    steps: ExecutedStep[];
    summary: string;
  } | null>(null);

  // Safe mode state
  const [safeModeStatus, setSafeModeStatus] = useState<{
    active: boolean;
    sessionTimeout: number;
    uncommittedChanges: number;
    armedAt: string | null;
  }>({
    active: false,
    sessionTimeout: 300,
    uncommittedChanges: 0,
    armedAt: null
  });
  const [isSafeModeLoading, setIsSafeModeLoading] = useState<boolean>(false);

  // Catalog browser state
  const [selectedCategory, setSelectedCategory] = useState<McpCategory>(MIKROTIK_MCP_CATEGORIES[0]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<McpToolItem>(MIKROTIK_MCP_CATEGORIES[0].tools[0]);
  const [toolParamValues, setToolParamValues] = useState<Record<string, any>>({});
  const [directToolOutput, setDirectToolOutput] = useState<any | null>(null);
  const [isExecutingDirectTool, setIsExecutingDirectTool] = useState<boolean>(false);

  // Transport & SSE testing
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [sseEvents, setSseEvents] = useState<string[]>([]);

  // AI IDE Terminal & Client Selection State
  const [selectedClientTab, setSelectedClientTab] = useState<'claude' | 'hermes' | 'ide' | 'curl'>('claude');
  const [interactiveCliInput, setInteractiveCliInput] = useState<string>(
    'hermes run "Spin up a Guest VLAN on ether1 (id 200) with IP 192.168.200.1/24, a DHCP pool from .10 to .100, and masquerade"'
  );
  const [interactiveCliHistory, setInteractiveCliHistory] = useState<Array<{ text: string; type: 'cmd' | 'output' | 'success' | 'info' | 'error' }>>([
    { text: '$ # MikroTik MCP Terminal Connector initialized. Ready for Claude, Hermes or cURL network changes.', type: 'info' },
    { text: '$ # Enter a plain-English network change below to test terminal execution directly against RouterOS.', type: 'info' }
  ]);
  const [isInteractiveCliRunning, setIsInteractiveCliRunning] = useState<boolean>(false);

  // Base URL calculation
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Safe Mode status on mount and when changed
  const fetchSafeModeStatus = async () => {
    try {
      const res = await fetch('/api/mcp/safe-mode');
      if (res.ok) {
        const data = await res.json();
        setSafeModeStatus({
          active: data.active,
          sessionTimeout: data.sessionTimeout || 300,
          uncommittedChanges: data.uncommittedChanges || 0,
          armedAt: data.armedAt || null
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSafeModeStatus();
    const timer = setInterval(fetchSafeModeStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  // Update default param values when selecting a tool
  useEffect(() => {
    if (selectedTool) {
      const defaults: Record<string, any> = {};
      selectedTool.params.forEach(p => {
        if (p.default !== undefined) {
          defaults[p.name] = p.default;
        } else if (p.enum && p.enum.length > 0) {
          defaults[p.name] = p.enum[0];
        } else if (p.name.includes('ip') || p.name.includes('address')) {
          defaults[p.name] = '192.168.200.1/24';
        } else if (p.name === 'interface') {
          defaults[p.name] = 'ether1';
        } else if (p.name === 'vlan_id') {
          defaults[p.name] = 200;
        } else if (p.name === 'name') {
          defaults[p.name] = 'vlan200';
        } else {
          defaults[p.name] = '';
        }
      });
      setToolParamValues(defaults);
      setDirectToolOutput(null);
    }
  }, [selectedTool]);

  // Safe mode actions
  const handleToggleSafeMode = async () => {
    setIsSafeModeLoading(true);
    try {
      const endpoint = safeModeStatus.active ? '/api/mcp/safe-mode/rollback' : '/api/mcp/safe-mode/enable';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        addLog('MikroTik-MCP', data.message || 'Safe-mode toggled', safeModeStatus.active ? 'warning' : 'info');
        await fetchSafeModeStatus();
      }
    } catch (err: any) {
      addLog('MikroTik-MCP', `Safe Mode operation failed: ${err.message}`, 'error');
    } finally {
      setIsSafeModeLoading(false);
    }
  };

  const handleCommitSafeMode = async () => {
    setIsSafeModeLoading(true);
    try {
      const res = await fetch('/api/mcp/safe-mode/commit', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        addLog('MikroTik-MCP', data.message || 'Safe-mode committed', 'info');
        await fetchSafeModeStatus();
      }
    } catch (err: any) {
      addLog('MikroTik-MCP', `Commit failed: ${err.message}`, 'error');
    } finally {
      setIsSafeModeLoading(false);
    }
  };

  const handleRollbackSafeMode = async () => {
    setIsSafeModeLoading(true);
    try {
      const res = await fetch('/api/mcp/safe-mode/rollback', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        addLog('MikroTik-MCP', data.message || 'Safe-mode rollback performed', 'warning');
        // Refresh local router states
        const stateRes = await fetch('/api/agent/state');
        if (stateRes.ok) {
          const st = await stateRes.json();
          if (st.interfaces) setInterfaces(st.interfaces);
          if (st.ips) setIps(st.ips);
          if (st.natRules) setNatRules(st.natRules);
          if (st.filterRules) setFilterRules(st.filterRules);
        }
        await fetchSafeModeStatus();
      }
    } catch (err: any) {
      addLog('MikroTik-MCP', `Rollback failed: ${err.message}`, 'error');
    } finally {
      setIsSafeModeLoading(false);
    }
  };

  // Run plain English prompt through MikroTik MCP
  const handleRunPrompt = async () => {
    if (!promptText.trim()) return;
    setIsExecutingPrompt(true);
    setExecutionResult(null);

    addLog('MikroTik-MCP', `Evaluating prompt for ${selectedDevice.name}: "${promptText}"`, 'info');

    try {
      let finalPrompt = promptText;
      if (isArmingSafeMode && !promptText.toLowerCase().includes('safe-mode')) {
        finalPrompt = `[safe-mode enabled] ${promptText}`;
      }

      const res = await fetch('/api/mcp/run-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          device: selectedDevice.name,
          execute: true
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setExecutionResult(data);

      // Sync updated state from server to parent App state
      const stateRes = await fetch('/api/agent/state');
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        if (stateData.interfaces) setInterfaces(stateData.interfaces);
        if (stateData.ips) setIps(stateData.ips);
        if (stateData.natRules) setNatRules(stateData.natRules);
        if (stateData.filterRules) setFilterRules(stateData.filterRules);
      }

      await fetchSafeModeStatus();
      addLog('MikroTik-MCP', `Executed ${data.stepsCount} tool calls in order. ${data.summary}`, 'info');
    } catch (err: any) {
      addLog('MikroTik-MCP', `Prompt execution error: ${err.message}`, 'error');
    } finally {
      setIsExecutingPrompt(false);
    }
  };

  // Direct tool execution from Catalog
  const handleExecuteCatalogTool = async () => {
    if (!selectedTool) return;
    setIsExecutingDirectTool(true);
    setDirectToolOutput(null);

    try {
      const payload = {
        jsonrpc: '2.0',
        id: `call-${Date.now().toString().slice(-4)}`,
        method: 'tools/call',
        params: {
          name: selectedTool.name,
          arguments: toolParamValues
        }
      };

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setDirectToolOutput(data);

      // Refresh states
      const stateRes = await fetch('/api/agent/state');
      if (stateRes.ok) {
        const st = await stateRes.json();
        if (st.interfaces) setInterfaces(st.interfaces);
        if (st.ips) setIps(st.ips);
        if (st.natRules) setNatRules(st.natRules);
        if (st.filterRules) setFilterRules(st.filterRules);
      }

      await fetchSafeModeStatus();
      addLog('MikroTik-MCP', `Direct tool ${selectedTool.name} dispatched via JSON-RPC.`, 'command');
    } catch (err: any) {
      setDirectToolOutput({ error: err.message });
      addLog('MikroTik-MCP', `Tool dispatch failed: ${err.message}`, 'error');
    } finally {
      setIsExecutingDirectTool(false);
    }
  };

  // SSE test connection
  const toggleSseStream = () => {
    if (sseStatus === 'connected') {
      setSseStatus('disconnected');
      setSseEvents(prev => [...prev, `[${new Date().toLocaleTimeString()}] SSE stream closed.`]);
      return;
    }

    setSseStatus('connecting');
    const evtSource = new EventSource('/api/mcp/sse');

    evtSource.onopen = () => {
      setSseStatus('connected');
      setSseEvents(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connected to /api/mcp/sse transport.`]);
    };

    evtSource.addEventListener('endpoint', (e: any) => {
      setSseEvents(prev => [...prev.slice(-20), `[endpoint] ${e.data}`]);
    });

    evtSource.addEventListener('message', (e: any) => {
      setSseEvents(prev => [...prev.slice(-20), `[message] ${e.data}`]);
    });

    evtSource.addEventListener('ping', (e: any) => {
      setSseEvents(prev => [...prev.slice(-20), `[heartbeat] ${e.data}`]);
    });

    evtSource.onerror = () => {
      setSseStatus('disconnected');
      setSseEvents(prev => [...prev.slice(-20), `[error] Connection lost to SSE transport.`]);
      evtSource.close();
    };
  };

  // Run prompt from the interactive terminal emulator
  const handleRunInteractiveCli = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun !== undefined ? cmdToRun : interactiveCliInput).trim();
    if (!rawCmd || isInteractiveCliRunning) return;

    setIsInteractiveCliRunning(true);
    let promptToExecute = rawCmd;
    if (promptToExecute.startsWith('hermes run ')) {
      promptToExecute = promptToExecute.replace(/^hermes run\s+["']?/, '').replace(/["']?$/, '');
    } else if (promptToExecute.startsWith('claude prompt ')) {
      promptToExecute = promptToExecute.replace(/^claude prompt\s+["']?/, '').replace(/["']?$/, '');
    } else if (promptToExecute.startsWith('prompt ')) {
      promptToExecute = promptToExecute.replace(/^prompt\s+["']?/, '').replace(/["']?$/, '');
    }

    setInteractiveCliHistory(prev => [
      ...prev,
      { text: `$ ${rawCmd}`, type: 'cmd' },
      { text: `⚡ Evaluating network intent for ${selectedDevice.name}...`, type: 'info' }
    ]);

    try {
      const res = await fetch('/api/mcp/run-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `[safe-mode enabled] ${promptToExecute}`,
          device: selectedDevice.name,
          execute: true
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const newLines: Array<{ text: string; type: 'cmd' | 'output' | 'success' | 'info' | 'error' }> = [];
      newLines.push({ text: `✓ Resolved ${data.stepsCount} MCP tool calls in sequence:`, type: 'info' });

      data.steps.forEach((st: any, idx: number) => {
        newLines.push({
          text: `  [${idx + 1}/${data.stepsCount}] ${st.tool}(${JSON.stringify(st.args || {})})`,
          type: 'output'
        });
        if (st.cliCommand) {
          newLines.push({
            text: `       CLI: ${st.cliCommand}`,
            type: 'output'
          });
        }
        newLines.push({
          text: `       Verdict: ${st.status.toUpperCase()} (${st.durationMs}ms) · ${st.description}`,
          type: 'success'
        });
      });

      newLines.push({ text: `✓ ${data.summary}`, type: 'success' });
      newLines.push({ text: `✓ Safe-Mode: ARMED (1 pending commit to NVRAM)`, type: 'info' });

      setInteractiveCliHistory(prev => [...prev, ...newLines]);

      // Sync state with parent app
      const stateRes = await fetch('/api/agent/state');
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        if (stateData.interfaces) setInterfaces(stateData.interfaces);
        if (stateData.ips) setIps(stateData.ips);
        if (stateData.natRules) setNatRules(stateData.natRules);
        if (stateData.filterRules) setFilterRules(stateData.filterRules);
      }
      await fetchSafeModeStatus();
      addLog('MikroTik-MCP', `Terminal prompt executed: "${promptToExecute}" (${data.stepsCount} tools)`, 'info');
    } catch (err: any) {
      setInteractiveCliHistory(prev => [
        ...prev,
        { text: `✗ Error executing MCP prompt: ${err.message}`, type: 'error' }
      ]);
    } finally {
      setIsInteractiveCliRunning(false);
    }
  };

  // Filtered categories for search
  const filteredCategories = MIKROTIK_MCP_CATEGORIES.filter(cat => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    const matchCat = cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
    const matchTool = cat.tools.some(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    return matchCat || matchTool;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: MikroTik MCP Server Bridge */}
      <div className="bg-[#0b0b12] border border-[#161628] p-6 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  MikroTik MCP Server
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    RouterOS-native
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full font-mono">
                    MIT Licensed
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Open-source MCP bridge (<span className="text-emerald-400 font-mono">jeff-nasseri/mikrotik-mcp</span>) · Talk to RouterOS in plain English. No web UI clicks. No Winbox tabs.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300 font-bold">19</span> tool categories
              </div>
              <span className="text-zinc-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-zinc-300 font-bold">170+</span> RouterOS tools
              </div>
              <span className="text-zinc-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-zinc-300 font-bold">3</span> transports (stdio · SSE · HTTP)
              </div>
              <span className="text-zinc-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Shield size={13} className={safeModeStatus.active ? 'text-amber-400' : 'text-zinc-500'} />
                Safe Mode: <span className={safeModeStatus.active ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                  {safeModeStatus.active ? `Armed (${safeModeStatus.uncommittedChanges} pending)` : 'Disarmed'}
                </span>
              </div>
            </div>
          </div>

          {/* Router Fleet Selector & Safe Mode Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0e0e1a] border border-zinc-800 rounded-xl p-2 flex items-center gap-3">
              <div className="flex items-center gap-2 pl-1">
                <RadioTower size={14} className="text-emerald-400" />
                <span className="text-[11px] font-mono text-zinc-400">Target Router:</span>
              </div>
              <select
                aria-label="Target Router"
                value={selectedDevice.id}
                onChange={(e) => {
                  const dev = FLEET_DEVICES.find(d => d.id === e.target.value);
                  if (dev) setSelectedDevice(dev);
                }}
                className="bg-black/60 text-xs font-mono text-emerald-300 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {FLEET_DEVICES.map(dev => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.model})
                  </option>
                ))}
              </select>
            </div>

            {/* Safe Mode Status & Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSafeMode}
                disabled={isSafeModeLoading}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  safeModeStatus.active
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                }`}
                title="Toggle RouterOS Safe-Mode rollback insurance"
              >
                <Shield size={14} className={safeModeStatus.active ? 'text-amber-400 animate-pulse' : 'text-zinc-500'} />
                {safeModeStatus.active ? 'Safe-Mode Armed' : 'Arm Safe-Mode'}
              </button>

              {safeModeStatus.active && (
                <>
                  <button
                    onClick={handleCommitSafeMode}
                    disabled={isSafeModeLoading}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Commit changes permanently to RouterOS NVRAM"
                  >
                    <Check size={13} />
                    Commit
                  </button>
                  <button
                    onClick={handleRollbackSafeMode}
                    disabled={isSafeModeLoading}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Roll back all uncommitted changes immediately"
                  >
                    <RotateCcw size={13} />
                    Rollback
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-[#161628]">
          <button
            onClick={() => setActiveSubTab('prompt')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'prompt'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
            }`}
          >
            <Sparkles size={14} />
            Plain-English AI Prompt
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
            }`}
          >
            <Layers size={14} />
            19 Categories &amp; 170+ Tools
          </button>

          <button
            onClick={() => setActiveSubTab('safemode')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'safemode'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
            }`}
          >
            <Shield size={14} />
            Safe Mode &amp; Rollback
            {safeModeStatus.active && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('transports')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'transports'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
            }`}
          >
            <Terminal size={14} />
            Claude &amp; Hermes Terminal Connector
          </button>

          <button
            onClick={() => setActiveSubTab('fleet')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'fleet'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
            }`}
          >
            <RadioTower size={14} />
            RouterOS Fleet ({FLEET_DEVICES.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PLAIN ENGLISH PROMPT EXECUTOR */}
      {activeSubTab === 'prompt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Prompt Input Panel */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Ask MikroTik MCP</h3>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Target: <span className="text-emerald-400">{selectedDevice.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono tracking-wider text-zinc-500 mb-2">
                  Describe what you want to configure:
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={4}
                  placeholder="e.g. Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool from .10 to .100, and masquerade out to WAN."
                  className="w-full bg-[#050508] border border-zinc-800 focus:border-emerald-500/80 rounded-xl p-3.5 text-xs text-zinc-200 font-mono focus:outline-none transition-colors leading-relaxed"
                />
              </div>

              {/* Execution Options */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={isArmingSafeMode}
                    onChange={(e) => setIsArmingSafeMode(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Wrap in <span className="text-amber-400 font-mono">Safe-Mode</span> (auto-rollback on fault)</span>
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Timeout: 300s
                </span>
              </div>

              {/* Execute Action Button */}
              <button
                onClick={handleRunPrompt}
                disabled={isExecutingPrompt || !promptText.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {isExecutingPrompt ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Resolving MCP tools &amp; applying to RouterOS...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run MikroTik MCP Tools</span>
                  </>
                )}
              </button>

              {/* Example Prompts Library */}
              <div className="pt-2 border-t border-zinc-900 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Curated Prompts from MCP Docs:</span>
                  <span className="text-[10px] font-mono text-zinc-600">click to load</span>
                </div>
                <div className="space-y-1.5">
                  {EXAMPLE_MCP_PROMPTS.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPromptText(ex.prompt)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#06060a] border border-zinc-800/60 hover:border-emerald-500/40 hover:bg-zinc-900/40 transition-all text-xs group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-zinc-300 group-hover:text-emerald-300 transition-colors">
                          {ex.title}
                        </span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {ex.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono truncate">
                        "{ex.prompt}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Execution Transcript & RouterOS Result */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-4 min-h-[460px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Execution Transcript</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    Model Context Protocol v2024-11-05
                  </span>
                </div>

                {executionResult ? (
                  <div className="space-y-4">
                    {/* Plain English Summary Response */}
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5">
                      <div className="text-[11px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={12} />
                        Claude / Assistant Response:
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        {executionResult.summary}
                      </p>
                    </div>

                    {/* Step-by-step Tool Execution Pipeline */}
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase font-mono text-zinc-500 tracking-wider">
                        Executed {executionResult.stepsCount} MCP Tools in Sequence:
                      </div>

                      <div className="space-y-2">
                        {executionResult.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-[#050509] border border-zinc-800/80 rounded-xl p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <code className="text-xs font-mono font-bold text-emerald-400">
                                  {step.tool}
                                </code>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {step.durationMs}ms
                              </span>
                            </div>

                            <div className="text-xs text-zinc-300 font-medium pl-7 flex items-center gap-1.5">
                              <Check size={12} className="text-emerald-400 shrink-0" />
                              <span>{step.description}</span>
                            </div>

                            {step.cliCommand && (
                              <div className="pl-7 pt-1">
                                <div className="bg-black/80 border border-zinc-900 rounded p-2 text-[11px] font-mono text-zinc-400 flex items-center justify-between gap-2">
                                  <span className="truncate">{step.cliCommand}</span>
                                  <button
                                    onClick={() => copyToClipboard(step.cliCommand!, `cli-${idx}`)}
                                    className="text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer"
                                    title="Copy CLI command"
                                  >
                                    {copiedKey === `cli-${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                      <Workflow className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <p className="text-xs font-bold text-zinc-300">Ready to execute MCP tools</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Enter any RouterOS task in plain English or select a curated prompt. The MCP server will parse it, call the necessary <code className="text-emerald-400">mikrotik_*</code> tools in order, and update the router state safely.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Live State Indicator */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Router State Synchronized</span>
                </div>
                <span>{interfaces.length} Interfaces · {ips.length} IPs · {filterRules.length} Filters</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: 19 CATEGORIES & 170+ TOOLS CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Category List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-[#0a0a10] border border-[#141424] p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Categories ({MIKROTIK_MCP_CATEGORIES.length})
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">170+ tools</span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter category or tool..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full bg-[#050508] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Category Scroll List */}
              <div className="space-y-1 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const freshCat = MIKROTIK_MCP_CATEGORIES.find(c => c.id === cat.id) || cat;
                      setSelectedCategory(freshCat);
                      if (freshCat.tools.length > 0) setSelectedTool(freshCat.tools[0]);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory.id === cat.id
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-[#06060a] border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{cat.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[200px]">{cat.description}</div>
                    </div>
                    <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400 shrink-0">
                      {cat.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Tools in Category & Parameter Inspector */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedCategory.name} Category
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      {selectedCategory.tools.length} Tools
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedCategory.description}
                  </p>
                </div>
              </div>

              {/* Tool selector buttons */}
              <div className="flex flex-wrap gap-2">
                {selectedCategory.tools.map(tool => (
                  <button
                    key={tool.name}
                    onClick={() => setSelectedTool(tool)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedTool.name === tool.name
                        ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-[#050509] border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span>{tool.name}</span>
                    {tool.isSafeModeSensitive && (
                      <Shield size={11} className={selectedTool.name === tool.name ? 'text-black' : 'text-amber-400'} />
                    )}
                  </button>
                ))}
              </div>

              {/* Selected Tool Details & Interactive Parameter Form */}
              {selectedTool && (
                <div className="bg-[#050508] border border-zinc-800/80 rounded-xl p-4 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-mono font-bold text-emerald-400">
                        {selectedTool.name}
                      </h4>
                      {selectedTool.isSafeModeSensitive && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                          <Shield size={10} /> Safe-mode sensitive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300">
                      {selectedTool.description}
                    </p>
                  </div>

                  {/* Generated CLI preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-zinc-500">RouterOS CLI Command:</span>
                    <div className="bg-black border border-zinc-900 p-2.5 rounded-lg font-mono text-xs text-zinc-300 flex items-center justify-between gap-2">
                      <span className="text-emerald-300">{selectedTool.cliCommand(toolParamValues)}</span>
                      <button
                        onClick={() => copyToClipboard(selectedTool.cliCommand(toolParamValues), 'cli-tool')}
                        className="text-zinc-600 hover:text-zinc-300 shrink-0 cursor-pointer"
                        title="Copy CLI command"
                      >
                        {copiedKey === 'cli-tool' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Parameters input grid */}
                  {selectedTool.params.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-900">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">Tool Parameters:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTool.params.map(param => (
                          <div key={param.name} className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                              <span>{param.name}</span>
                              {param.required && <span className="text-rose-400">*</span>}
                              <span className="text-zinc-600 text-[9px]">({param.type})</span>
                            </label>
                            {param.enum ? (
                              <select
                                aria-label={param.name}
                                value={toolParamValues[param.name] || ''}
                                onChange={(e) => setToolParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                              >
                                {param.enum.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={toolParamValues[param.name] ?? ''}
                                onChange={(e) => setToolParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                                placeholder={param.description}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                              />
                            )}
                            <p className="text-[10px] text-zinc-500">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispatch Button */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={handleExecuteCatalogTool}
                      disabled={isExecutingDirectTool}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      {isExecutingDirectTool ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Execute Tool via MCP JSON-RPC</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-zinc-500">
                      Dispatches to <code className="text-zinc-400">/api/mcp</code>
                    </span>
                  </div>

                  {/* Direct output */}
                  {directToolOutput && (
                    <div className="mt-3 p-3 bg-black border border-zinc-900 rounded-lg font-mono text-xs space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">JSON-RPC Result:</div>
                      <pre className="text-emerald-400 overflow-x-auto text-[11px] max-h-48 scrollbar-thin">
                        {JSON.stringify(directToolOutput, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SAFE MODE SESSION & ROLLBACK */}
      {activeSubTab === 'safemode' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#0a0a10] border border-[#141424] p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${safeModeStatus.active ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">RouterOS Safe Mode Engine</h3>
                    <p className="text-xs text-zinc-400">Automatic rollback protection against accidental lockouts</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${safeModeStatus.active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-800 text-zinc-400'}`}>
                  {safeModeStatus.active ? 'Armed & Active' : 'Disarmed'}
                </span>
              </div>

              <div className="p-4 bg-[#050508] border border-zinc-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Status:</span>
                    <span className={safeModeStatus.active ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                      {safeModeStatus.active ? 'PROTECTED' : 'UNARMED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Uncommitted:</span>
                    <span className="text-emerald-400 font-bold">{safeModeStatus.uncommittedChanges} changes</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Session Timeout:</span>
                    <span className="text-zinc-300">{safeModeStatus.sessionTimeout} seconds</span>
                  </div>
                </div>

                {safeModeStatus.armedAt && (
                  <div className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-900">
                    Armed at: <span className="font-mono text-zinc-300">{safeModeStatus.armedAt}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleToggleSafeMode}
                  disabled={isSafeModeLoading}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                    safeModeStatus.active
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  }`}
                >
                  <Shield size={14} />
                  {safeModeStatus.active ? 'Disarm Safe-Mode' : 'Arm Safe-Mode (Snapshot Router)'}
                </button>

                {safeModeStatus.active && (
                  <>
                    <button
                      onClick={handleCommitSafeMode}
                      disabled={isSafeModeLoading}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Check size={14} />
                      Commit Changes to NVRAM
                    </button>
                    <button
                      onClick={handleRollbackSafeMode}
                      disabled={isSafeModeLoading}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
                    >
                      <RotateCcw size={14} />
                      Emergency Rollback Now
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-400" />
                How MikroTik Safe Mode Works
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Safe Mode arms a state snapshot before sensitive operations (like adjusting firewall filter rules, reconfiguring management IP addresses, or modifying VLAN interfaces).
              </p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>If connection to the router drops or a session timeout occurs, RouterOS automatically restores the previous state.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>Once verified, calling <code className="text-emerald-400 font-mono">mikrotik_safe_mode_commit()</code> commits changes permanently.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>Calling <code className="text-rose-400 font-mono">mikrotik_safe_mode_rollback()</code> immediately undoes all uncommitted changes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CLAUDE & HERMES TERMINAL CONNECTOR */}
      {activeSubTab === 'transports' && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">AI IDE Terminal &amp; Agent Connector</h3>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  No GUI Required
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-3xl">
                Direct bridge for users who prefer prompting network changes straight inside their AI IDE terminal (Claude Code, Hermes Agent CLI, Cursor, Windsurf, or cURL). All changes trigger Safe-Mode rollback protection on RouterOS.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <span className="text-zinc-500">Active Router:</span>
              <span className="text-emerald-400 bg-black/60 px-2.5 py-1 rounded-lg border border-zinc-800">
                {selectedDevice.name} ({selectedDevice.ip})
              </span>
            </div>
          </div>

          {/* Quickstart Client Configurations & Live Interactive Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 Columns: Client Setup Tabs (Claude, Hermes, IDE, cURL) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-4">
                {/* Client Tabs */}
                <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-3">
                  <button
                    onClick={() => setSelectedClientTab('claude')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedClientTab === 'claude'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Claude (Code / Desktop)
                  </button>
                  <button
                    onClick={() => setSelectedClientTab('hermes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedClientTab === 'hermes'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Hermes Agent CLI
                  </button>
                  <button
                    onClick={() => setSelectedClientTab('ide')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedClientTab === 'ide'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Cursor / Windsurf
                  </button>
                  <button
                    onClick={() => setSelectedClientTab('curl')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedClientTab === 'curl'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Terminal cURL
                  </button>
                </div>

                {/* Tab 1: Claude Setup */}
                {selectedClientTab === 'claude' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>1. Claude Code CLI (Terminal Add)</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Add this MCP server directly to your local Claude Code terminal session in one command:
                      </p>
                      <div className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-purple-300 flex items-center justify-between gap-2">
                        <span className="truncate select-all">{`claude mcp add mikrotik -- transport sse "${baseUrl}/api/mcp/sse"`}</span>
                        <button
                          onClick={() => copyToClipboard(`claude mcp add mikrotik -- transport sse "${baseUrl}/api/mcp/sse"`, 'claude-cli')}
                          className="text-zinc-500 hover:text-white shrink-0 cursor-pointer"
                          title="Copy command"
                        >
                          {copiedKey === 'claude-cli' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>2. Claude Desktop (<code className="text-purple-400 font-mono text-[11px]">claude_desktop_config.json</code>)</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify({
                            mcpServers: {
                              mikrotik: {
                                url: `${baseUrl}/api/mcp/sse`
                              }
                            }
                          }, null, 2), 'claude-desktop-cfg')}
                          className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                        >
                          {copiedKey === 'claude-desktop-cfg' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>Copy Config</span>
                        </button>
                      </div>
                      <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-zinc-300 overflow-x-auto scrollbar-thin">
{`{
  "mcpServers": {
    "mikrotik": {
      "url": "${baseUrl}/api/mcp/sse"
    }
  }
}`}
                      </pre>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-zinc-900">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">Example prompt to type in Claude:</span>
                      <div className="bg-[#06060c] p-2.5 rounded-lg border border-purple-900/30 text-xs text-purple-200 font-mono">
                        "Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool from .10 to .100, and masquerade out to WAN."
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Hermes Agent Setup */}
                {selectedClientTab === 'hermes' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>1. Install Hermes Tool Manifest</span>
                        <a
                          href={`${baseUrl}/api/hermes/tool.yaml`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>View tool.yaml</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Download the strict JSON Schema manifest directly into your Hermes Agent tool directory:
                      </p>
                      <div className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-emerald-300 flex items-center justify-between gap-2">
                        <span className="truncate select-all">{`mkdir -p ~/.hermes/tools/routeros && curl -s "${baseUrl}/api/hermes/tool.yaml" -o ~/.hermes/tools/routeros/tool.yaml`}</span>
                        <button
                          onClick={() => copyToClipboard(`mkdir -p ~/.hermes/tools/routeros && curl -s "${baseUrl}/api/hermes/tool.yaml" -o ~/.hermes/tools/routeros/tool.yaml`, 'hermes-install')}
                          className="text-zinc-500 hover:text-white shrink-0 cursor-pointer"
                          title="Copy install command"
                        >
                          {copiedKey === 'hermes-install' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                      <div className="text-xs font-bold text-white">2. Run Hermes Terminal Prompt</div>
                      <p className="text-xs text-zinc-400">Execute autonomous network changes from any shell:</p>
                      <div className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-300 flex items-center justify-between gap-2">
                        <span className="text-emerald-300 select-all">{`hermes run "Isolate guest VLAN 20 from corporate VLAN 10 and flush DNS cache"`}</span>
                        <button
                          onClick={() => copyToClipboard(`hermes run "Isolate guest VLAN 20 from corporate VLAN 10 and flush DNS cache"`, 'hermes-cmd')}
                          className="text-zinc-500 hover:text-white shrink-0 cursor-pointer"
                          title="Copy command"
                        >
                          {copiedKey === 'hermes-cmd' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Cursor & Windsurf */}
                {selectedClientTab === 'ide' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Cursor &amp; Windsurf MCP Configuration</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify({
                            mcpServers: {
                              "mikrotik-routeros": {
                                url: `${baseUrl}/api/mcp/sse`
                              }
                            }
                          }, null, 2), 'ide-cfg')}
                          className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                        >
                          {copiedKey === 'ide-cfg' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>Copy .cursor/mcp.json</span>
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Create or edit <code className="text-cyan-400 font-mono text-[11px]">.cursor/mcp.json</code> or configure Windsurf Cascade:
                      </p>
                      <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-cyan-300 overflow-x-auto scrollbar-thin">
{`{
  "mcpServers": {
    "mikrotik-routeros": {
      "url": "${baseUrl}/api/mcp/sse"
    }
  }
}`}
                      </pre>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-zinc-900">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">Prompting in Cursor Composer / Chat:</span>
                      <div className="bg-[#06080c] p-2.5 rounded-lg border border-cyan-900/30 text-xs text-cyan-200 font-mono">
                        @mikrotik Create WireGuard interface wg0 on port 13231 and add peer 10.10.0.2/32
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Terminal cURL */}
                {selectedClientTab === 'curl' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>Direct Terminal Prompt One-Liner</span>
                        <button
                          onClick={() => copyToClipboard(`curl -s -X POST "${baseUrl}/api/mcp/run-prompt" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool, and masquerade"}' | jq .`, 'curl-oneliner')}
                          className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                        >
                          {copiedKey === 'curl-oneliner' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>Copy cURL</span>
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Paste directly into your bash/zsh terminal to run network prompts without an IDE:
                      </p>
                      <pre className="bg-[#050508] border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-amber-300 overflow-x-auto scrollbar-thin">
{`curl -s -X POST "${baseUrl}/api/mcp/run-prompt" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Spin up a Guest VLAN on ether1 (id 200), give it 192.168.200.1/24, a DHCP pool, and masquerade"}' | jq .`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* SSE Live Protocol Inspector */}
              <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live SSE Transport Stream</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] font-mono uppercase text-zinc-400">{sseStatus}</span>
                    <button
                      onClick={toggleSseStream}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        sseStatus === 'connected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500 text-black hover:bg-emerald-400'
                      }`}
                    >
                      {sseStatus === 'connected' ? 'Disconnect' : 'Connect SSE'}
                    </button>
                  </div>
                </div>
                <div className="bg-black border border-zinc-900 rounded-xl p-2.5 font-mono text-[10px] max-h-32 overflow-y-auto scrollbar-thin space-y-0.5">
                  {sseEvents.length === 0 ? (
                    <div className="text-zinc-600 py-3 text-center">
                      Stream idle. Click "Connect SSE" to listen for live JSON-RPC frames.
                    </div>
                  ) : (
                    sseEvents.map((evt, idx) => (
                      <div key={idx} className="text-zinc-400 leading-tight">
                        <span className="text-emerald-400">&gt;</span> {evt}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Interactive In-Browser Terminal Tester */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#07070c] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[500px]">
                {/* Terminal Window Header */}
                <div className="bg-[#0f0f18] px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 ml-2">
                      terminal — mikrotik-mcp-connector ({selectedDevice.name})
                    </span>
                  </div>
                  <button
                    onClick={() => setInteractiveCliHistory([
                      { text: '$ # Terminal cleared. Ready for Claude, Hermes or cURL network changes.', type: 'info' }
                    ])}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Terminal Log Output Area */}
                <div className="p-4 font-mono text-xs space-y-1.5 overflow-y-auto flex-1 max-h-[380px] scrollbar-thin">
                  {interactiveCliHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed whitespace-pre-wrap break-all ${
                        item.type === 'cmd'
                          ? 'text-white font-bold'
                          : item.type === 'success'
                          ? 'text-emerald-400'
                          : item.type === 'error'
                          ? 'text-rose-400'
                          : item.type === 'info'
                          ? 'text-zinc-500'
                          : 'text-zinc-300'
                      }`}
                    >
                      {item.text}
                    </div>
                  ))}
                  {isInteractiveCliRunning && (
                    <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Claude/Hermes agent applying network changes via MikroTik MCP...</span>
                    </div>
                  )}
                </div>

                {/* Preset Prompt Chips */}
                <div className="px-4 py-2 bg-[#0c0c14] border-t border-zinc-900 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-mono text-zinc-500 mr-1">Quick Prompts:</span>
                  {[
                    'Guest VLAN on ether1 (id 200)',
                    'Add static DNS portal.lan -> 192.168.88.10',
                    'Flush DNS resolver cache memory',
                    'Add WireGuard wg0 on port 13231'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInteractiveCliInput(preset);
                        handleRunInteractiveCli(preset);
                      }}
                      disabled={isInteractiveCliRunning}
                      className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Terminal Input Bar */}
                <div className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2">
                  <span className="text-emerald-400 font-mono font-bold text-xs pl-1">$</span>
                  <input
                    type="text"
                    value={interactiveCliInput}
                    onChange={(e) => setInteractiveCliInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRunInteractiveCli();
                      }
                    }}
                    placeholder='Type prompt or "hermes run ..."'
                    className="flex-1 bg-transparent border-none text-xs text-zinc-100 font-mono focus:outline-none placeholder-zinc-600"
                  />
                  <button
                    onClick={() => handleRunInteractiveCli()}
                    disabled={isInteractiveCliRunning || !interactiveCliInput.trim()}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isInteractiveCliRunning ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} className="fill-current" />
                    )}
                    <span>Run</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: ROUTEROS FLEET (MULTI-ROUTER) */}
      {activeSubTab === 'fleet' && (
        <div className="space-y-4">
          <div className="bg-[#0a0a10] border border-[#141424] p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RadioTower size={16} className="text-emerald-400" />
                  RouterOS Fleet Management
                </h3>
                <p className="text-xs text-zinc-400">Manage multiple MikroTik routers across your campus from a single MCP prompt.</p>
              </div>
              <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                {FLEET_DEVICES.length} Routers Registered
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FLEET_DEVICES.map(dev => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDevice.id === dev.id
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-[#06060a] border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-white">{dev.name}</span>
                    <span className={`w-2 h-2 rounded-full ${dev.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-zinc-400">
                    <div>Model: <span className="text-zinc-200">{dev.model}</span></div>
                    <div>IP: <span className="text-emerald-400">{dev.ip}:{dev.port}</span></div>
                    <div>OS: <span className="text-zinc-300">{dev.routerOsVersion}</span></div>
                    <div>Uptime: <span className="text-zinc-400">{dev.uptime}</span></div>
                    <div>CPU: <span className="text-zinc-400">{dev.cpuLoad}</span></div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500 truncate">
                    {dev.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
