import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  Info,
  Maximize2,
  Minimize2,
  Lock
} from 'lucide-react';
import { JsonRpcTrafficLog } from '../types';

interface JsonRpcTrafficTerminalProps {
  baseUrl: string;
  onRefreshState?: () => void;
  compact?: boolean;
}

export default function JsonRpcTrafficTerminal({
  baseUrl,
  onRefreshState,
  compact = false
}: JsonRpcTrafficTerminalProps) {
  const [logs, setLogs] = useState<JsonRpcTrafficLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'incoming' | 'outgoing' | 'error' | 'tools'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [lastInjectMessage, setLastInjectMessage] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const pollingTimerRef = useRef<any>(null);

  // Fetch traffic logs from server
  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/mcp/traffic?limit=150`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          // Sort ascending for natural top-to-bottom terminal feed
          const sorted = [...data.logs].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setLogs(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to fetch JSON-RPC traffic logs:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Live polling effect
  useEffect(() => {
    fetchLogs();

    if (isLivePolling) {
      pollingTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 1500);
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isLivePolling, baseUrl]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Clear server logs
  const handleClearLogs = async () => {
    try {
      await fetch(`${baseUrl}/api/mcp/traffic/clear`, { method: 'POST' });
      setLogs([]);
      setExpandedLogId(null);
    } catch (err) {
      console.error('Failed to clear traffic logs:', err);
    }
  };

  // Inject a test JSON-RPC packet to verify wire flow
  const handleInjectTest = async (action: 'ping' | 'initialize' | 'tools_list' | 'simulate_trace' | 'invalid_method') => {
    setIsInjecting(true);
    setLastInjectMessage(null);
    try {
      const res = await fetch(`${baseUrl}/api/mcp/traffic/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setLastInjectMessage(`Injected ${action} successfully`);
      setTimeout(() => setLastInjectMessage(null), 3000);
      // Immediately refresh logs
      await fetchLogs(true);
      if (onRefreshState) onRefreshState();
    } catch (err: any) {
      setLastInjectMessage(`Error injecting test: ${err.message}`);
    } finally {
      setIsInjecting(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export logs as JSON or formatted text file
  const handleExportLogs = (format: 'json' | 'log') => {
    let content = '';
    let mime = '';
    let filename = '';

    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
      mime = 'application/json';
      filename = `jsonrpc-traffic-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    } else {
      content = logs
        .map(l => {
          const arrow = l.direction === 'incoming' ? '-->' : '<--';
          const payloadStr = JSON.stringify(l.payload);
          return `[${l.timeFormatted}] ${arrow} [${l.direction.toUpperCase()}] status=${l.status} id=${l.rpcId ?? 'null'} method=${l.method || '-'} duration=${l.durationMs ?? 0}ms\n  ${payloadStr}\n`;
        })
        .join('\n');
      mime = 'text/plain';
      filename = `jsonrpc-traffic-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    }

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

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Direction / status filter
      if (directionFilter === 'incoming' && log.direction !== 'incoming') return false;
      if (directionFilter === 'outgoing' && log.direction !== 'outgoing') return false;
      if (directionFilter === 'error' && log.status !== 'error') return false;
      if (directionFilter === 'tools' && log.method !== 'tools/call' && log.method !== 'tools/list') return false;

      // Text search
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const summaryMatch = log.summary?.toLowerCase().includes(term);
      const methodMatch = log.method?.toLowerCase().includes(term);
      const toolMatch = log.toolName?.toLowerCase().includes(term);
      const idMatch = String(log.rpcId).toLowerCase().includes(term);
      const payloadMatch = JSON.stringify(log.payload || {}).toLowerCase().includes(term);
      const ipMatch = log.sourceIp?.toLowerCase().includes(term);

      return summaryMatch || methodMatch || toolMatch || idMatch || payloadMatch || ipMatch;
    });
  }, [logs, directionFilter, searchTerm]);

  // Metric stats
  const stats = useMemo(() => {
    const total = logs.length;
    const incoming = logs.filter(l => l.direction === 'incoming').length;
    const outgoing = logs.filter(l => l.direction === 'outgoing').length;
    const errors = logs.filter(l => l.status === 'error').length;
    return { total, incoming, outgoing, errors };
  }, [logs]);

  return (
    <div
      className={`rounded-2xl border border-[#1a1a2e] bg-[#030307] overflow-hidden flex flex-col shadow-2xl transition-all ${
        isMaximized ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'w-full'
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="bg-[#07070f] border-b border-zinc-900/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Left: Window Controls & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block border border-rose-600/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block border border-amber-600/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40" />
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            <span className="font-mono text-xs font-bold text-zinc-200 tracking-tight">
              openclaw-mcp-wire ~ JSON-RPC 2.0 Terminal
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 flex items-center gap-1">
              <Lock size={10} className="text-cyan-400" />
              READ-ONLY LOG
            </span>
          </div>
        </div>

        {/* Center: Live Polling & Stats Badge */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLivePolling ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className={isLivePolling ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isLivePolling ? 'LIVE SNIFFER' : 'PAUSED'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">{stats.total} frames</span>
            <span className="text-cyan-400">({stats.incoming} in</span>
            <span className="text-zinc-600">/</span>
            <span className="text-emerald-400">{stats.outgoing} out)</span>
            {stats.errors > 0 && (
              <span className="text-rose-400 font-bold">[{stats.errors} err]</span>
            )}
          </div>
        </div>

        {/* Right: Quick Terminal Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsLivePolling(!isLivePolling)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
              isLivePolling
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border-amber-800/60 font-bold'
            }`}
            title={isLivePolling ? 'Pause real-time updates' : 'Resume live real-time updates'}
          >
            {isLivePolling ? <Pause size={12} /> : <Play size={12} />}
            <span>{isLivePolling ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            <ArrowDownCircle size={14} />
          </button>

          <button
            onClick={() => fetchLogs(false)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Refresh logs now"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Clear all terminal logs"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={() => handleExportLogs('log')}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Export .log file"
          >
            <Download size={14} />
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? 'Restore view' : 'Maximize terminal'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Filter & Test Packet Quick Bar */}
      <div className="bg-[#05050a] border-b border-zinc-900 px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Search & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter method, ID, payload, error..."
              className="bg-zinc-950 border border-zinc-800/80 rounded-lg pl-8 pr-2.5 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 w-48 sm:w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'incoming', label: '--> REQ' },
              { id: 'outgoing', label: '<-- RES' },
              { id: 'tools', label: 'TOOLS' },
              { id: 'error', label: 'ERRORS' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDirectionFilter(f.id as any)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  directionFilter === f.id
                    ? 'bg-zinc-800 text-cyan-300 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Quick Wire Test Injections */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            <Send size={11} className="text-cyan-400" /> Test Wire:
          </span>
          <button
            onClick={() => handleInjectTest('ping')}
            disabled={isInjecting}
            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Send jsonrpc ping"
          >
            ping
          </button>
          <button
            onClick={() => handleInjectTest('initialize')}
            disabled={isInjecting}
            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Send MCP handshake"
          >
            initialize
          </button>
          <button
            onClick={() => handleInjectTest('tools_list')}
            disabled={isInjecting}
            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Query registered tools list"
          >
            tools/list
          </button>
          <button
            onClick={() => handleInjectTest('simulate_trace')}
            disabled={isInjecting}
            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Execute packet trace simulation via MCP"
          >
            tools/call:simulate
          </button>
          <button
            onClick={() => handleInjectTest('invalid_method')}
            disabled={isInjecting}
            className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Trigger method not found (-32601) error frame"
          >
            test error
          </button>
        </div>
      </div>

      {/* Injected test toast notification if any */}
      {lastInjectMessage && (
        <div className="px-4 py-1.5 bg-cyan-950/40 border-b border-cyan-800/40 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
          <Zap size={12} className="text-cyan-400 animate-pulse" />
          <span>{lastInjectMessage}</span>
        </div>
      )}

      {/* Terminal View Body */}
      <div
        ref={terminalScrollRef}
        className={`p-3 font-mono text-[11px] overflow-y-auto space-y-1 select-text bg-[#030307] ${
          isMaximized ? 'flex-1' : compact ? 'h-64' : 'h-96'
        }`}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 space-y-2">
            <Terminal size={32} className="text-zinc-700" />
            <div className="text-xs font-mono text-zinc-400">
              {logs.length === 0
                ? 'Listening on /api/mcp socket... No JSON-RPC frames captured yet.'
                : 'No frames match current search/filter.'}
            </div>
            <p className="text-[10px] text-zinc-600 max-w-sm">
              Connect OpenClaw, run Hermes Agent commands, or click any button in the "Test Wire" bar above to stream JSON-RPC 2.0 traffic into this view.
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isExpanded = expandedLogId === log.id;
            const isIncoming = log.direction === 'incoming';
            const isError = log.status === 'error';
            const isNotification = log.status === 'notification';

            return (
              <div
                key={log.id}
                className={`rounded-lg border transition-all ${
                  isExpanded
                    ? 'bg-[#080814] border-cyan-800/60 shadow-lg'
                    : isError
                    ? 'bg-rose-950/15 border-rose-900/30 hover:border-rose-800/50'
                    : 'bg-[#05050c] border-zinc-900/80 hover:border-zinc-800'
                }`}
              >
                {/* Single Log Row Header */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="px-2.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* Expand/Collapse Chevron */}
                    <span className="text-zinc-600 group-hover:text-cyan-400 shrink-0">
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>

                    {/* Frame Index & Time */}
                    <span className="text-zinc-600 text-[10px] shrink-0">
                      #{String(index + 1).padStart(3, '0')}
                    </span>
                    <span className="text-zinc-500 text-[10px] shrink-0">{log.timeFormatted}</span>

                    {/* Direction Badge */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 uppercase tracking-tight flex items-center gap-1 ${
                        isIncoming
                          ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60'
                          : isError
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          : isNotification
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      }`}
                    >
                      {isIncoming ? (
                        <>
                          <ArrowDownCircle size={10} /> REQ
                        </>
                      ) : isError ? (
                        <>
                          <AlertTriangle size={10} /> ERR
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle size={10} /> RES
                        </>
                      )}
                    </span>

                    {/* RPC ID */}
                    <span className="text-zinc-400 text-[10px] shrink-0 font-mono">
                      id:{log.rpcId !== undefined && log.rpcId !== null ? String(log.rpcId) : 'none'}
                    </span>

                    {/* Method or Summary */}
                    <span
                      className={`truncate text-[11px] ${
                        isError
                          ? 'text-rose-300 font-bold'
                          : isIncoming
                          ? 'text-cyan-300'
                          : 'text-zinc-300'
                      }`}
                    >
                      {log.summary}
                    </span>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex items-center gap-2 shrink-0 text-[10px]">
                    {log.durationMs !== undefined && (
                      <span className="text-zinc-500 group-hover:text-zinc-300">
                        ⚡ {log.durationMs}ms
                      </span>
                    )}

                    {log.rawSize !== undefined && (
                      <span className="text-zinc-600 hidden sm:inline">
                        {log.rawSize < 1024 ? `${log.rawSize} B` : `${(log.rawSize / 1024).toFixed(1)} KB`}
                      </span>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleCopy(JSON.stringify(log.payload, null, 2), log.id);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-cyan-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      title="Copy raw JSON-RPC frame"
                    >
                      {copiedId === log.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Frame Inspector */}
                {isExpanded && (
                  <div className="p-3 border-t border-zinc-900 bg-[#020206] space-y-2.5">
                    {/* Frame Metadata Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pb-2 border-b border-zinc-900/80">
                      <div>
                        <span className="text-zinc-600 block">Protocol Version:</span>
                        <code className="text-cyan-300">JSON-RPC 2.0</code>
                      </div>
                      <div>
                        <span className="text-zinc-600 block">Method:</span>
                        <code className="text-zinc-200">{log.method || '(none)'}</code>
                      </div>
                      <div>
                        <span className="text-zinc-600 block">Origin / Socket:</span>
                        <code className="text-zinc-300">{log.sourceIp || 'Internal Socket'}</code>
                      </div>
                      <div>
                        <span className="text-zinc-600 block">Execution Latency:</span>
                        <code className="text-emerald-400">{log.durationMs ? `${log.durationMs} ms` : 'N/A'}</code>
                      </div>
                    </div>

                    {/* Raw JSON Frame Viewer */}
                    <div className="relative">
                      <div className="flex items-center justify-between pb-1 text-[10px] text-zinc-500">
                        <span>Payload Data:</span>
                        <button
                          onClick={() => handleCopy(JSON.stringify(log.payload, null, 2), `full-${log.id}`)}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        >
                          {copiedId === `full-${log.id}` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedId === `full-${log.id}` ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                      <pre className="p-3 bg-[#000003] border border-zinc-900 rounded-lg overflow-x-auto text-[10.5px] leading-relaxed text-zinc-300 max-h-60 select-text">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Status Line */}
      <div className="bg-[#05050a] border-t border-zinc-900/90 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Sniffing: <code className="text-cyan-300">{baseUrl}/api/mcp</code></span>
          <span className="text-zinc-700">|</span>
          <span>Buffer: {logs.length} / 250 frames max</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Click any line to inspect raw JSON frame</span>
          <button
            onClick={() => handleExportLogs('json')}
            className="text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
