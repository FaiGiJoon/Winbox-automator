import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Trash2, ChevronRight, Terminal, Activity, 
  Server, Video, Network, ShieldCheck, AlertTriangle, CheckCircle, Info
} from 'lucide-react';

interface PingPacket {
  seq: number;
  ip: string;
  bytes: number;
  ttl: number;
  rtt: number | null; // null represents timeout/loss
  status: 'success' | 'timeout' | 'unreachable';
  timestamp: string;
}

type Mode = 'manual' | 'scenario';
type ScenarioType = 'nvr_surveillance' | 'hp_ilo_mgmt' | 'sd_wan_sla';

export default function PingLatencyTool() {
  const [activeMode, setActiveMode] = useState<Mode>('manual');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('nvr_surveillance');

  // Manual parameters
  const [targetIp, setTargetIp] = useState('8.8.8.8');
  const [packetSize, setPacketSize] = useState(56);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [ttl, setTtl] = useState(64);
  const [routingTable, setRoutingTable] = useState('main');
  const [interfaceBind, setInterfaceBind] = useState('any');

  // Diagnostic Simulation controls (can override default values)
  const [lossSimulation, setLossSimulation] = useState(false);
  const [congestionSimulation, setCongestionSimulation] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<PingPacket[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const seqRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Quick preset targets for manual mode
  const manualPresets = [
    { label: '8.8.8.8 (Google DNS)', value: '8.8.8.8', desc: 'Global WAN lookup' },
    { label: '1.1.1.1 (Cloudflare DNS)', value: '1.1.1.1', desc: 'Secure high-perf CDN' },
    { label: '192.168.88.1 (Local Bridge)', value: '192.168.88.1', desc: 'Default local gateway' },
    { label: '10.0.10.15 (VLAN 10 NVR)', value: '10.0.10.15', desc: 'CCTV streaming recorder' },
    { label: '10.99.1.45 (HP iLO)', value: '10.99.1.45', desc: 'Out-of-band IPMI board' }
  ];

  // RouterOS-like default targets and setups for real-world scenarios
  const scenarios = {
    nvr_surveillance: {
      title: 'NVR CCTV RTSP Streaming Test',
      ip: '10.0.10.15',
      size: 1500, // Large frames representing full MTU camera packets
      interval: 200, // Frequent probes representing constant video streaming load
      ttl: 64,
      routingTable: 'main',
      interface: 'bridge-vlan',
      lossThreshold: 1.0, // NVR streams degrade with >1% packet loss
      jitterThreshold: 15.0, // High jitter (>15ms) drops keyframes (H.264/H.265 stutter)
      description: 'Tests local NVR performance under simulated constant RTSP feed loads over trunked VLAN 10. Assesses frame drops, MTU path fragmentation, and Jitter Buffer limits.'
    },
    hp_ilo_mgmt: {
      title: 'HP iLO Out-of-Band Controller',
      ip: '10.99.1.45',
      size: 64, // Small standard packets
      interval: 1000, // Standard interval
      ttl: 64,
      routingTable: 'OOB-Mgmt', // Dedicated Management VRF
      interface: 'ether24-ilo',
      lossThreshold: 0.0, // Out-of-band management must have 0% packet loss
      jitterThreshold: 35.0, // High tolerance for control packets but 0 drops
      description: 'Simulates diagnostic tests through a dedicated OOB-Mgmt routing table (VRF) to an HP iLO remote controller connected on isolated access port ether24.'
    },
    sd_wan_sla: {
      title: 'Multi-Location SD-WAN SLA Gateway',
      ip: '192.168.120.254', // IPsec/WireGuard VPN endpoint at distant branch
      size: 1420, // VPN-clamped MSS size
      interval: 500, // Faster tracking
      ttl: 128, // High TTL for multi-hop location routing
      routingTable: 'VPN-Tunnel',
      interface: 'wireguard1',
      lossThreshold: 0.5, // Strict branch-office tunnel requirements
      jitterThreshold: 10.0, // VoIP and terminal sessions need <10ms jitter
      description: 'Checks site-to-site VPN link SLA performance across multiple locations. Diagnoses tunnel route stability, path MTU limits (1420B), and branch gateway delays.'
    }
  };

  // Synchronize scenario parameters when selecting another scenario
  useEffect(() => {
    if (activeMode === 'scenario') {
      const config = scenarios[selectedScenario];
      setTargetIp(config.ip);
      setPacketSize(config.size);
      setIntervalMs(config.interval);
      setTtl(config.ttl);
      setRoutingTable(config.routingTable);
      setInterfaceBind(config.interface);
    }
  }, [selectedScenario, activeMode]);

  // Helper to pad columns for Mikrotik RouterOS terminal styling
  const pad = (str: string, length: number) => {
    return str.padEnd(length, ' ').slice(0, length);
  };

  // Auto scroll terminal logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Active ping execution loop
  useEffect(() => {
    if (isRunning) {
      // Print initialization header in command-line format
      setLogs(prev => {
        const next = [...prev];
        const routeTableText = routingTable !== 'main' ? ` routing-table=${routingTable}` : '';
        const interfaceText = interfaceBind !== 'any' ? ` interface=${interfaceBind}` : '';
        
        if (next.length === 0 || prev[prev.length - 1].includes('stopped') || prev[prev.length - 1].includes('complete')) {
          next.push(`  /tool ping address=${targetIp} size=${packetSize} interval=${intervalMs}ms ttl=${ttl}${routeTableText}${interfaceText}`);
          next.push(`  ${pad('SEQ', 5)} ${pad('HOST', 16)} ${pad('SIZE', 6)} ${pad('TTL', 4)} ${pad('TIME', 10)} ${pad('STATUS', 10)}`);
        }
        return next;
      });

      intervalIdRef.current = setInterval(() => {
        sendICMPProbe();
      }, intervalMs);
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRunning, targetIp, packetSize, intervalMs, ttl, routingTable, interfaceBind, lossSimulation, congestionSimulation]);

  const sendICMPProbe = () => {
    const currentSeq = seqRef.current++;
    const timestamp = new Date().toLocaleTimeString();
    
    // Default baseline parameters according to the selected target/scenario
    let baseRtt = 15;
    let jitter = 3;
    let baseLossPercent = 0;

    if (activeMode === 'scenario') {
      if (selectedScenario === 'nvr_surveillance') {
        baseRtt = 1.2; // Local LAN bridge latency is very low
        jitter = 0.5;
        // Cameras sometimes drop raw large frames on unoffloaded software bridges
        baseLossPercent = 0.2; 
      } else if (selectedScenario === 'hp_ilo_mgmt') {
        baseRtt = 2.4; // Direct server access port
        jitter = 0.3;
        baseLossPercent = 0;
      } else if (selectedScenario === 'sd_wan_sla') {
        baseRtt = 28.5; // Multi-hop site VPN
        jitter = 4.1;
        baseLossPercent = 0.1;
      }
    } else {
      // Manual mode defaults
      if (targetIp === '192.168.88.1') {
        baseRtt = 1.0;
        jitter = 0.2;
      } else if (targetIp === '10.0.10.15') {
        baseRtt = 1.5;
        jitter = 0.6;
      } else if (targetIp === '10.99.1.45') {
        baseRtt = 2.5;
        jitter = 0.4;
      } else if (targetIp === '1.1.1.1') {
        baseRtt = 8.4;
        jitter = 1.5;
      } else if (targetIp === '8.8.8.8') {
        baseRtt = 14.2;
        jitter = 2.8;
      } else {
        baseRtt = 32.0;
        jitter = 9.0;
      }
    }

    // Apply simulation modifiers
    if (congestionSimulation) {
      baseRtt += 140.0 + Math.random() * 80.0;
      jitter += 35.0;
    }

    if (lossSimulation) {
      baseLossPercent += 25; // Introduce 25% synthetic packet loss
    }

    // Roll for packet loss
    const roll = Math.random() * 100;
    const isLost = roll < baseLossPercent;

    let newPacket: PingPacket;

    if (isLost) {
      const isUnreachable = Math.random() > 0.6;
      const statusText = isUnreachable ? 'unreachable' : 'timeout';
      newPacket = {
        seq: currentSeq,
        ip: targetIp,
        bytes: packetSize,
        ttl: ttl,
        rtt: null,
        status: isUnreachable ? 'unreachable' : 'timeout',
        timestamp
      };

      const logMsg = `  ${pad(String(currentSeq), 5)} ${pad(targetIp, 16)} ${pad(String(packetSize), 6)} ${pad('', 4)} ${pad('', 10)} ${pad(statusText, 10)}`;
      setLogs(prev => [...prev, logMsg]);
    } else {
      const actualRtt = Math.max(0.1, parseFloat((baseRtt + (Math.random() - 0.5) * jitter).toFixed(1)));
      newPacket = {
        seq: currentSeq,
        ip: targetIp,
        bytes: packetSize,
        ttl: ttl,
        rtt: actualRtt,
        status: 'success',
        timestamp
      };

      const logMsg = `  ${pad(String(currentSeq), 5)} ${pad(targetIp, 16)} ${pad(String(packetSize), 6)} ${pad(String(ttl), 4)} ${pad(actualRtt + 'ms', 10)} ${pad('ok', 10)}`;
      setLogs(prev => [...prev, logMsg]);
    }

    setHistory(prev => [...prev, newPacket].slice(-50));
  };

  const handleStartStop = () => {
    if (isRunning) {
      setIsRunning(false);
      setLogs(prev => [...prev, `  -- ping stopped by user --`]);
    } else {
      setIsRunning(true);
    }
  };

  const handleClear = () => {
    setHistory([]);
    setLogs([]);
    seqRef.current = 0;
    setIsRunning(false);
  };

  // Compile statistics
  const successfulPackets = history.filter(p => p.status === 'success');
  const totalPackets = history.length;
  const lostPackets = history.filter(p => p.status !== 'success').length;
  const packetLossPercent = totalPackets > 0 ? parseFloat(((lostPackets / totalPackets) * 100).toFixed(1)) : 0;

  const rtts = successfulPackets.map(p => p.rtt as number);
  const minRtt = rtts.length > 0 ? Math.min(...rtts) : 0;
  const maxRtt = rtts.length > 0 ? Math.max(...rtts) : 0;
  const avgRtt = rtts.length > 0 ? parseFloat((rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(1)) : 0;

  // Calculate Jitter (average consecutive packet variance)
  let computedJitter = 0;
  if (rtts.length > 1) {
    let sumDeviations = 0;
    for (let i = 1; i < rtts.length; i++) {
      sumDeviations += Math.abs(rtts[i] - rtts[i - 1]);
    }
    computedJitter = parseFloat((sumDeviations / (rtts.length - 1)).toFixed(1));
  }

  // Determine SLA Thresholds according to scenario mode
  let lossLimit = 1.0; 
  let jitterLimit = 15.0;
  let slaTitle = 'General Connectivity';

  if (activeMode === 'scenario') {
    lossLimit = scenarios[selectedScenario].lossThreshold;
    jitterLimit = scenarios[selectedScenario].jitterThreshold;
    slaTitle = scenarios[selectedScenario].title;
  }

  // Check if SLA standards are violated
  const isSlaViolated = totalPackets > 3 && (packetLossPercent > lossLimit || computedJitter > jitterLimit);
  const isSlaPerfect = totalPackets > 3 && !isSlaViolated;

  // Render SVG charts setup
  const chartPackets = history.slice(-30);
  const chartHeight = 140;
  const chartWidth = 500;
  const paddingLeft = 35;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 20;

  const maxValInChart = chartPackets.reduce((max, p) => (p.rtt && p.rtt > max ? p.rtt : max), 10);
  const yMax = Math.ceil(maxValInChart * 1.2 / 10) * 10 || 50;

  const getCoordinates = () => {
    if (chartPackets.length < 2) return [];
    const usableWidth = chartWidth - paddingLeft - paddingRight;
    const usableHeight = chartHeight - paddingTop - paddingBottom;

    return chartPackets.map((packet, index) => {
      const x = paddingLeft + (index / (chartPackets.length - 1)) * usableWidth;
      const rttVal = packet.rtt !== null ? packet.rtt : 0;
      const y = paddingTop + usableHeight - (rttVal / yMax) * usableHeight;
      return { x, y, packet, isLost: packet.rtt === null };
    });
  };

  const coords = getCoordinates();
  
  let linePath = '';
  let areaPath = '';
  if (coords.length > 0) {
    coords.forEach((c, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      linePath += `${command} ${c.x} ${c.y} `;
    });

    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const bottomY = chartHeight - paddingBottom;
    areaPath = linePath + ` L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Context-aware troubleshooting recommendations citing MikroTik forums/KB
  const getTroubleshootingAdvice = () => {
    if (totalPackets < 3) {
      return {
        issue: 'Awaiting sufficient probes...',
        remedy: 'Initiate standard or scenario probes to collect path metrics.',
        reference: 'RouterOS /tool ping references'
      };
    }

    if (packetLossPercent > 0) {
      if (activeMode === 'scenario' && selectedScenario === 'nvr_surveillance' && packetSize >= 1500) {
        return {
          issue: 'Large NVR RTSP Frame Loss (Path MTU)',
          remedy: 'Raw 1500-byte packets are dropping. Ensure the bridge has VLAN filtering hardware-offloaded. Check if the switch-chip CPU port is congested, or lower the MTU/clamping rules.',
          command: '/interface bridge settings set allow-fast-path=yes',
          reference: 'MikroTik Wiki: Bridge VLAN Filtering & L3 Hardware Offloading'
        };
      }
      if (activeMode === 'scenario' && selectedScenario === 'hp_ilo_mgmt') {
        return {
          issue: 'HP iLO Out-of-Band Routing Leak',
          remedy: 'OOB Management packets are dropping. Verify routing table isolation. Ensure the bridge port has "pvid" matching the management VLAN and untrusted ports are blocked from broadcasting.',
          command: '/interface bridge port set [find interface=ether24-ilo] pvid=99 frame-types=admit-only-untagged-and-priority-tagged',
          reference: 'MikroTik Forum [MUM QoS]: Dedicated Out-of-Band (OOB) VRF Isolation'
        };
      }
      if (activeMode === 'scenario' && selectedScenario === 'sd_wan_sla') {
        return {
          issue: 'VPN Tunnel Fragment Drops',
          remedy: 'Site-to-site VPN overhead reduces path MTU (usually 1420B for WireGuard/IPsec). Clamp TCP MSS on transit traffic to avoid silent drops of oversized frames.',
          command: '/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn action=change-mss new-mss=1360 comment="Clamp VPN MSS"',
          reference: 'MikroTik Knowledge Base: PMTUD & Clamping TCP MSS'
        };
      }
      return {
        issue: 'General Packet Loss Detected',
        remedy: 'Verify link auto-negotiation and physical duplex mismatch. Set up Netwatch monitoring to automate gateway failover if thresholds break.',
        command: '/tool netwatch add host=' + targetIp + ' interval=5s timeout=1s down-script=":log error \\"Gateway Down\\""',
        reference: 'RouterOS Forum: Troubleshooting physical Layer 2 interface drops'
      };
    }

    if (computedJitter > jitterLimit) {
      if (selectedScenario === 'nvr_surveillance') {
        return {
          issue: 'High Jitter on NVR Video Feed (>15ms)',
          remedy: 'H.264/H.265 streams are stuttering. Enable Queue trees with priority queues (DSCP matching CS5/Video) to safeguard RTSP latency against bulk file transfers.',
          command: '/queue tree add name=NVR_Priority parent=global packet-mark=video_traffic priority=2',
          reference: 'MikroTik Wiki: Quality of Service (QoS) & DSCP Video Prioritization'
        };
      }
      return {
        issue: 'Buffer Bloat & Intermittent Latency Spikes',
        remedy: 'Dynamic latency variance detected. Ensure Queue types utilize FQ-CoDel or SFQ instead of standard FIFO buffer tails to eliminate priority queue starvation.',
        command: '/queue simple add name=SLA_Limit target=192.168.0.0/16 queue=fq-codel/fq-codel',
        reference: 'MikroTik Forum: Bufferbloat remedies with FQ-CoDel in RouterOS v7'
      };
    }

    return {
      issue: 'SLA Performance Stable',
      remedy: 'Path metrics align with industry thresholds. No congestion or routing table leaks detected on interface ' + interfaceBind + '.',
      reference: 'MikroTik RFC-2544 SLA benchmarking complete'
    };
  };

  const advice = getTroubleshootingAdvice();

  return (
    <div className="bg-[#0c0c12] border border-zinc-850 rounded-xl p-5 space-y-5" id="ping-latency-tool">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3.5 gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} className={isRunning ? "text-cyan-400 animate-pulse" : "text-zinc-500"} />
            ICMP Ping & Real-Time Jitter Diagnostic Tool
          </h3>
          <p className="text-[11px] text-zinc-500">
            Verify network path latency, analyze jitter limits for video surveillance feeds, and troubleshoot VRF routing tables.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStartStop}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-950/40 hover:border-red-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square size={11} fill="currentColor" />
              Stop Diagnostic
            </button>
          ) : (
            <button
              onClick={handleStartStop}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded bg-cyan-950/20 text-cyan-400 border border-cyan-900/40 hover:bg-cyan-950/40 hover:border-cyan-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={11} fill="currentColor" />
              Start Diagnostic
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 bg-zinc-950 border border-zinc-900 rounded transition-colors cursor-pointer"
            title="Clear stats"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Mode selectors */}
      <div className="flex border-b border-zinc-900 pb-1.5 gap-4">
        <button
          onClick={() => {
            if (!isRunning) {
              setActiveMode('manual');
            }
          }}
          disabled={isRunning}
          className={`pb-1 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeMode === 'manual' 
              ? 'text-cyan-400 border-cyan-500' 
              : 'text-zinc-500 border-transparent hover:text-zinc-300 disabled:opacity-50'
          }`}
        >
          Manual ICMP Ping
        </button>
        <button
          onClick={() => {
            if (!isRunning) {
              setActiveMode('scenario');
            }
          }}
          disabled={isRunning}
          className={`pb-1 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeMode === 'scenario' 
              ? 'text-cyan-400 border-cyan-500' 
              : 'text-zinc-500 border-transparent hover:text-zinc-300 disabled:opacity-50'
          }`}
        >
          Real-World Scenario SLA Tests
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: Parameters & Scenarios Setup */}
        <div className="lg:col-span-4 space-y-4">
          {activeMode === 'manual' ? (
            <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
                Target Configuration
              </span>

              {/* IP Input */}
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Target IP</label>
                <input
                  type="text"
                  placeholder="8.8.8.8"
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-zinc-750 disabled:opacity-50"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Presets</label>
                <div className="space-y-1">
                  {manualPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        if (!isRunning) {
                          setTargetIp(preset.value);
                        }
                      }}
                      disabled={isRunning}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-mono transition-colors flex items-center justify-between border ${
                        targetIp === preset.value
                          ? 'bg-cyan-950/10 border-cyan-900/30 text-cyan-400'
                          : 'bg-zinc-950/20 border-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 disabled:hover:bg-transparent'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <ChevronRight size={10} className="text-zinc-600" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
                Active Scenario Test Suite
              </span>

              <div className="space-y-2">
                <button
                  onClick={() => !isRunning && setSelectedScenario('nvr_surveillance')}
                  disabled={isRunning}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    selectedScenario === 'nvr_surveillance'
                      ? 'bg-cyan-950/10 border-cyan-900/40 text-cyan-400'
                      : 'bg-zinc-950/30 border-zinc-900/60 text-zinc-400 hover:bg-zinc-900/40 disabled:opacity-50'
                  }`}
                >
                  <Video size={16} className="mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold block">Local CCTV / NVR Streaming</span>
                    <p className="text-[10px] text-zinc-500 leading-tight">1500B full frames, CS5 Video Priority, high-speed 200ms probe intervals.</p>
                  </div>
                </button>

                <button
                  onClick={() => !isRunning && setSelectedScenario('hp_ilo_mgmt')}
                  disabled={isRunning}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    selectedScenario === 'hp_ilo_mgmt'
                      ? 'bg-cyan-950/10 border-cyan-900/40 text-cyan-400'
                      : 'bg-zinc-950/30 border-zinc-900/60 text-zinc-400 hover:bg-zinc-900/40 disabled:opacity-50'
                  }`}
                >
                  <Server size={16} className="mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold block">HP iLO OOB Server Control</span>
                    <p className="text-[10px] text-zinc-500 leading-tight">Isolated 64B queries targeting private OOB-Mgmt VRF routing tables.</p>
                  </div>
                </button>

                <button
                  onClick={() => !isRunning && setSelectedScenario('sd_wan_sla')}
                  disabled={isRunning}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    selectedScenario === 'sd_wan_sla'
                      ? 'bg-cyan-950/10 border-cyan-900/40 text-cyan-400'
                      : 'bg-zinc-950/30 border-zinc-900/60 text-zinc-400 hover:bg-zinc-900/40 disabled:opacity-50'
                  }`}
                >
                  <Network size={16} className="mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold block">Multi-Site VPN SLA Gateway</span>
                    <p className="text-[10px] text-zinc-500 leading-tight">1420B VPN-clamped MSS over site WireGuard, fast 500ms intervals.</p>
                  </div>
                </button>
              </div>

              {/* Scenario Description Card */}
              <div className="bg-zinc-950/80 p-2.5 border border-zinc-900 rounded text-[10px] text-zinc-400 leading-normal">
                <div className="flex gap-1 items-center font-bold text-zinc-300 mb-1">
                  <Info size={11} className="text-cyan-400" />
                  <span>Scenario Parameters</span>
                </div>
                {scenarios[selectedScenario].description}
              </div>
            </div>
          )}

          {/* RouterOS Advanced parameters */}
          <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
              RouterOS Probe Parameters
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Frame Size (B)</label>
                <input
                  type="number"
                  min="32"
                  max="1500"
                  value={packetSize}
                  onChange={(e) => setPacketSize(parseInt(e.target.value) || 56)}
                  disabled={isRunning || activeMode === 'scenario'}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-xs font-mono text-zinc-300 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Interval</label>
                <select
                  value={intervalMs}
                  onChange={(e) => setIntervalMs(parseInt(e.target.value))}
                  disabled={isRunning || activeMode === 'scenario'}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-xs text-zinc-300 focus:outline-none disabled:opacity-50"
                >
                  <option value="200">200 ms (Fast)</option>
                  <option value="500">500 ms</option>
                  <option value="1000">1000 ms (Std)</option>
                  <option value="2000">2000 ms</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Routing Table (VRF)</label>
                <input
                  type="text"
                  value={routingTable}
                  onChange={(e) => setRoutingTable(e.target.value)}
                  disabled={isRunning || activeMode === 'scenario'}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-xs text-zinc-300 font-mono focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 uppercase font-bold">Bind Interface</label>
                <input
                  type="text"
                  value={interfaceBind}
                  onChange={(e) => setInterfaceBind(e.target.value)}
                  disabled={isRunning || activeMode === 'scenario'}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-xs text-zinc-300 font-mono focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Diagnostic inject switches */}
            <div className="space-y-1.5 pt-1 border-t border-zinc-900">
              <label className="text-[9px] text-zinc-500 uppercase font-bold block">Inject Link Conditions</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-1.5 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                  <input
                    type="checkbox"
                    checked={lossSimulation}
                    onChange={(e) => setLossSimulation(e.target.checked)}
                    className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                  />
                  25% Drop Loss
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-1.5 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                  <input
                    type="checkbox"
                    checked={congestionSimulation}
                    onChange={(e) => setCongestionSimulation(e.target.checked)}
                    className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                  />
                  VPN Congestion
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Chart, Stats HUD, Real-time logs & Troubleshooting advices */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          {/* Diagnostic & SLA Status Indicator */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Real-Time Stats Overview */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-950/60 border border-zinc-900 p-2.5 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Sent / Recv / Lost</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xs font-bold font-mono text-white">{totalPackets}</span>
                  <span className="text-zinc-600 text-xs">/</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">{successfulPackets.length}</span>
                  {lostPackets > 0 && (
                    <>
                      <span className="text-zinc-600 text-xs">/</span>
                      <span className="text-xs font-bold font-mono text-red-400">{lostPackets}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-2.5 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Packet Loss</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xs font-bold font-mono ${packetLossPercent > lossLimit ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                    {packetLossPercent}%
                  </span>
                  <span className="text-[8px] text-zinc-600 ml-1 font-mono">limit:{lossLimit}%</span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-2.5 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Avg Latency</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xs font-bold font-mono text-cyan-400">{avgRtt} ms</span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-2.5 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block font-mono">Jitter (Variance)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xs font-bold font-mono ${computedJitter > jitterLimit ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>
                    {computedJitter} ms
                  </span>
                  <span className="text-[8px] text-zinc-600 ml-1 font-mono">limit:{jitterLimit}ms</span>
                </div>
              </div>
            </div>

            {/* SLA PASS/FAIL banner */}
            <div className="md:col-span-4 flex items-center justify-center bg-zinc-950/80 border border-zinc-900 rounded p-2.5 text-center">
              {totalPackets <= 3 ? (
                <div className="text-zinc-500 text-[11px] font-mono flex items-center gap-1.5">
                  <Activity size={12} className="text-zinc-500" />
                  Analyzing SLA Link...
                </div>
              ) : isSlaPerfect ? (
                <div className="text-emerald-400 text-[11px] font-bold font-mono flex flex-col items-center justify-center gap-0.5">
                  <div className="flex items-center gap-1">
                    <CheckCircle size={13} className="text-emerald-400 fill-emerald-950/30" />
                    SLA STABLE
                  </div>
                  <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">{slaTitle}</span>
                </div>
              ) : (
                <div className="text-red-400 text-[11px] font-bold font-mono flex flex-col items-center justify-center gap-0.5">
                  <div className="flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={13} className="text-red-400 fill-red-950/30" />
                    SLA VIOLATED
                  </div>
                  <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">{slaTitle}</span>
                </div>
              )}
            </div>
          </div>

          {/* RTT Scope Line Chart */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded p-3 space-y-1.5">
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block">
              RTT Scope Chart ({yMax} ms max scale)
            </span>

            <div className="relative border border-zinc-900 rounded bg-zinc-950/40 overflow-hidden">
              {history.length < 2 ? (
                <div className="h-[140px] flex flex-col items-center justify-center text-center text-zinc-600 italic text-xs space-y-1">
                  <span className="text-[10px]">Awaiting probe output...</span>
                </div>
              ) : (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[140px] select-none">
                  {/* Grid Lines */}
                  {[0, 0.5, 1].map((ratio, i) => {
                    const usableHeight = chartHeight - paddingTop - paddingBottom;
                    const y = paddingTop + usableHeight - ratio * usableHeight;
                    const value = Math.round(ratio * yMax);
                    return (
                      <g key={i} className="opacity-30">
                        <line 
                          x1={paddingLeft} 
                          y1={y} 
                          x2={chartWidth - paddingRight} 
                          y2={y} 
                          stroke="#27272a" 
                          strokeWidth="1" 
                          strokeDasharray="2,2" 
                        />
                        <text 
                          x={paddingLeft - 6} 
                          y={y + 3} 
                          fill="#71717a" 
                          fontSize="7" 
                          fontFamily="monospace" 
                          textAnchor="end"
                        >
                          {value}
                        </text>
                      </g>
                    );
                  })}

                  {/* Line Path */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="#22d3ee" 
                      strokeWidth="1.5" 
                      strokeLinecap="round"
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Nodes & Loss Indicators */}
                  {coords.map((c, i) => {
                    if (c.isLost) {
                      return (
                        <g key={i}>
                          <line x1={c.x - 2.5} y1={paddingTop + 5} x2={c.x + 2.5} y2={paddingTop + 10} stroke="#ef4444" strokeWidth="1.5" />
                          <line x1={c.x + 2.5} y1={paddingTop + 5} x2={c.x - 2.5} y2={paddingTop + 10} stroke="#ef4444" strokeWidth="1.5" />
                        </g>
                      );
                    }

                    const isLast = i === coords.length - 1;
                    return (
                      <circle 
                        key={i}
                        cx={c.x} 
                        cy={c.y} 
                        r={isLast ? "2.5" : "1.5"} 
                        fill={isLast ? "#22d3ee" : "#0891b2"} 
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* RouterOS Forum & Knowledge Base Diagnostics Report */}
          <div className="bg-zinc-950/80 border border-zinc-900 rounded p-3 space-y-2">
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
              <ShieldCheck size={12} />
              RouterOS Forum & Knowledge-Base Diagnostic Report
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Path Issue Detected</span>
                <p className="text-zinc-200 font-bold leading-snug">{advice.issue}</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed mt-1">{advice.remedy}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">MikroTik CLI Forum Remedy</span>
                {advice.command ? (
                  <div className="bg-black/80 border border-zinc-900 rounded p-1.5 font-mono text-[10px] text-emerald-400 select-all overflow-x-auto whitespace-pre">
                    {advice.command}
                  </div>
                ) : (
                  <div className="text-zinc-500 italic text-[11px] pt-1">
                    No remedial commands required. Link conforms to SLAs.
                  </div>
                )}
                <div className="text-[10px] text-zinc-500 flex gap-1 items-center mt-1">
                  <span className="text-cyan-600 font-bold">Ref:</span>
                  <span className="underline select-all truncate">{advice.reference}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CLI Logs Stream */}
          <div className="space-y-1 flex-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
              RouterOS ICMP Ping Terminal Console
            </span>

            <div className="bg-black border border-zinc-900 rounded p-2.5 font-mono text-[10px] leading-relaxed overflow-y-auto h-[110px] shadow-inner space-y-0.5">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-700 italic">
                  <span>Ping session inactive. Click "Start Diagnostic" above to launch RouterOS probes.</span>
                </div>
              ) : (
                logs.map((log, index) => {
                  let color = 'text-zinc-400';
                  if (log.includes(' ok')) color = 'text-cyan-400';
                  else if (log.includes('timeout') || log.includes('unreachable')) color = 'text-red-400 font-bold';
                  else if (log.includes('/tool ping')) color = 'text-white font-bold';

                  return (
                    <div key={index} className={`${color} whitespace-pre`}>
                      {log}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
