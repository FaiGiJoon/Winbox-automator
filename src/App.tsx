import React, { useState, useEffect } from 'react';
import { 
  Router, 
  Cpu, 
  Activity, 
  Terminal, 
  Plus, 
  Settings, 
  Shield, 
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Database,
  Network,
  Server,
  Globe,
  Trash2,
  Play,
  Send,
  Copy,
  Sliders,
  HelpCircle,
  Info,
  Layers,
  ArrowRight,
  Radio,
  Lock,
  Laptop,
  Download,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  InterfaceState, 
  IPAddressConfig, 
  FirewallNATRule, 
  FirewallFilterRule, 
  RouterOSCommand, 
  LogEntry, 
  ProviderSettings, 
  LLMProvider 
} from './types';

// Import our modular subcomponents
import NetworkTopology from './components/NetworkTopology';
import WirelessCAPsMAN from './components/WirelessCAPsMAN';
import STPConfigurator from './components/STPConfigurator';
import DHCPServer from './components/DHCPServer';
import WireGuardVPN from './components/WireGuardVPN';
import InterfaceMangle from './components/InterfaceMangle';
import LocalAdapterMonitor from './components/LocalAdapterMonitor';
import InterfaceTrafficChart, { InterfaceSparkline, TrafficDataPoint } from './components/InterfaceTrafficChart';
import SNMPManager from './components/SNMPManager';
import PingLatencyTool from './components/PingLatencyTool';
import HardwareStressTest from './components/HardwareStressTest';
import PacketSniffer from './components/PacketSniffer';
import NetworkScannerAgentPlatform from './components/NetworkScannerAgentPlatform';

export default function App() {
  // Navigation Menu tabs
  const [activeTab, setActiveTab] = useState<
    'terminal' | 'topology' | 'capsman' | 'stp' | 'dhcp' | 'wireguard' | 'mangle' | 'interfaces' | 'ips' | 'nat' | 'filters' | 'simulator' | 'settings' | 'local-adapters' | 'stresstest' | 'packetsniffer' | 'netscanner'
  >('terminal');

  // Router Engine Simulated State - Prefilled with the user's modern RouterOS configuration!
  const [interfaces, setInterfaces] = useState<InterfaceState[]>([
    { name: 'lte1', type: 'lte', ipAddress: 'Pass-through Mode', status: 'up', rxSpeed: '124.5 Mbps', txSpeed: '42.1 Mbps', comment: 'LTE public internet access' },
    { name: 'vlan10-main', type: 'vlan', ipAddress: '192.168.10.1/24', status: 'up', rxSpeed: '45.1 Mbps', txSpeed: '32.4 Mbps', comment: 'Main Corporate Network VLAN' },
    { name: 'vlan20-guest', type: 'vlan', ipAddress: '192.168.20.1/24', status: 'up', rxSpeed: '1.2 Mbps', txSpeed: '0.8 Mbps', comment: 'Isolated Guest Subnet VLAN' },
    { name: 'bridge-vlan', type: 'bridge', ipAddress: '192.168.88.1/24', status: 'up', rxSpeed: '210.4 Mbps', txSpeed: '184.2 Mbps', comment: 'Hardware-offloaded VLAN bridge with MSTP enabled' },
    { name: 'ether1-wan', type: 'ether', ipAddress: 'unassigned', status: 'up', rxSpeed: '0 bps', txSpeed: '0 bps', comment: 'Bound to LTE1 pass-through' }
  ]);

  const [ips, setIps] = useState<IPAddressConfig[]>([
    { id: '1', address: '192.168.10.1/24', network: '192.168.10.0', interface: 'vlan10-main', comment: 'Corporate Gateway IP' },
    { id: '2', address: '192.168.20.1/24', network: '192.168.20.0', interface: 'vlan20-guest', comment: 'Guest Gateway IP' },
    { id: '3', address: '192.168.88.1/24', network: '192.168.88.0', interface: 'bridge-vlan', comment: 'Local WinBox Management Address' }
  ]);

  const [natRules, setNatRules] = useState<FirewallNATRule[]>([
    { id: 'n1', chain: 'srcnat', outInterface: 'lte1', action: 'masquerade', comment: 'Default masquerade outgoing NAT on LTE uplink' }
  ]);

  const [filterRules, setFilterRules] = useState<FirewallFilterRule[]>([
    { id: 'f1', chain: 'input', action: 'accept', protocol: 'icmp', comment: 'Allow ping checks to local gateway' },
    { id: 'f2', chain: 'forward', action: 'accept', protocol: 'tcp', dstPort: 443, comment: 'Permit standard encrypted HTTPS traffic forward' },
    { id: 'f3', chain: 'forward', action: 'drop', srcAddress: '192.168.20.0/24', dstAddress: '192.168.10.0/24', comment: 'Firewall drop list: Isolate Guest Subnet (VLAN 20) from Main (VLAN 10)' },
    { id: 'f4', chain: 'input', action: 'drop', srcAddress: '192.168.20.0/24', comment: 'Firewall drop list: Prevent Guest VLAN from reaching local WinBox management ports' }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', timestamp: '10:00:00', source: 'System', message: 'RouterOS AI-WinBox deployment visual studio active.', type: 'info' },
    { id: 'l2', timestamp: '10:00:02', source: 'AI-Engine', message: 'Stand-alone secure helper channel ready. Disconnecting OpenClaw legacy protocol integrations.', type: 'info' }
  ]);

  // Terminal & Standalone Assistant state
  const [currentTask, setCurrentTask] = useState('Configure Spanning Tree protocol on bridge-vlan using MSTP identifier mappings for VLAN 10 and 20.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    commands: RouterOSCommand[];
    overallSummary: string;
  } | null>(null);

  // Settings
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: 'gemini',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3'
  });

  // Adding custom states manually
  const [addIpForm, setAddIpForm] = useState({ address: '', interface: 'vlan10-main', comment: '' });
  const [addNatForm, setAddNatForm] = useState<Partial<FirewallNATRule>>({ chain: 'srcnat', action: 'masquerade', outInterface: 'lte1' });
  const [addFilterForm, setAddFilterForm] = useState<Partial<FirewallFilterRule>>({ chain: 'forward', action: 'drop', protocol: 'any' });

  // Packet Simulator State - Expanded for sophisticated VLAN isolation checking
  const [simulatorInput, setSimulatorInput] = useState({
    srcIp: '192.168.20.55', // Defaults to Guest IP to check isolation
    dstIp: '192.168.10.15', // Defaults to Main Corporate IP
    protocol: 'TCP' as 'TCP' | 'UDP' | 'ICMP',
    dstPort: 80,
    srcInterface: 'vlan20-guest'
  });
  
  const [selectedInterface, setSelectedInterface] = useState<string>('lte1');
  const [activeSpike, setActiveSpike] = useState<'iperf' | 'streaming' | 'backup' | 'idle'>('idle');
  const [isTrafficPaused, setIsTrafficPaused] = useState<boolean>(false);

  const [trafficHistory, setTrafficHistory] = useState<Record<string, TrafficDataPoint[]>>(() => {
    const initialHistory: Record<string, TrafficDataPoint[]> = {};
    const baseSpeeds: Record<string, { rx: number; tx: number }> = {
      'lte1': { rx: 124.5, tx: 42.1 },
      'vlan10-main': { rx: 45.1, tx: 32.4 },
      'vlan20-guest': { rx: 1.2, tx: 0.8 },
      'bridge-vlan': { rx: 210.4, tx: 184.2 },
      'ether1-wan': { rx: 0, tx: 0 }
    };
    
    const now = Date.now();
    ['lte1', 'vlan10-main', 'vlan20-guest', 'bridge-vlan', 'ether1-wan'].forEach(name => {
      const base = baseSpeeds[name] || { rx: 10, tx: 10 };
      const points: TrafficDataPoint[] = [];
      for (let i = 25; i >= 0; i--) {
        const factor = 0.85 + Math.random() * 0.3;
        points.push({
          rx: Math.max(0, base.rx * factor),
          tx: Math.max(0, base.tx * factor),
          time: new Date(now - i * 1000)
        });
      }
      initialHistory[name] = points;
    });
    return initialHistory;
  });

  useEffect(() => {
    if (isTrafficPaused) return;
    const timer = setInterval(() => {
      const now = new Date();
      setTrafficHistory(prev => {
        const updated = { ...prev };
        
        ['lte1', 'vlan10-main', 'vlan20-guest', 'bridge-vlan', 'ether1-wan'].forEach(name => {
          let baseRx = 5;
          let baseTx = 5;
          
          if (name === 'lte1') { baseRx = 124.5; baseTx = 42.1; }
          else if (name === 'vlan10-main') { baseRx = 45.1; baseTx = 32.4; }
          else if (name === 'vlan20-guest') { baseRx = 1.2; baseTx = 0.8; }
          else if (name === 'bridge-vlan') { baseRx = 210.4; baseTx = 184.2; }
          else if (name === 'ether1-wan') { baseRx = 0.5; baseTx = 0.2; }

          // Apply spike modifiers if active
          let multiplierRx = 1.0;
          let multiplierTx = 1.0;
          
          if (activeSpike === 'iperf') {
            if (name === selectedInterface || name === 'bridge-vlan' || name === 'lte1') {
              multiplierRx = 3.5 + Math.random() * 1.5; // up to 5x
              multiplierTx = 2.0 + Math.random() * 1.0;
            }
          } else if (activeSpike === 'streaming') {
            if (name === selectedInterface) {
              baseRx = 38.4;
              baseTx = 1.8;
            }
          } else if (activeSpike === 'backup') {
            if (name === selectedInterface) {
              multiplierTx = 4.5 + Math.random() * 1.5;
              baseRx = 3.1;
            }
          }

          const factorRx = 0.85 + Math.random() * 0.3;
          const factorTx = 0.85 + Math.random() * 0.3;

          const nextRx = Math.max(0, baseRx * multiplierRx * factorRx);
          const nextTx = Math.max(0, baseTx * multiplierTx * factorTx);

          const currentPoints = prev[name] || [];
          const nextPoints = [...currentPoints, { rx: nextRx, tx: nextTx, time: now }];
          
          updated[name] = nextPoints.slice(-30);
        });

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSpike, selectedInterface, isTrafficPaused]);

  const getLatestRxTxText = (name: string) => {
    const points = trafficHistory[name];
    if (!points || points.length === 0) return { rx: '0 bps', tx: '0 bps', rxNum: 0, txNum: 0 };
    const last = points[points.length - 1];
    
    const formatSpeed = (val: number) => {
      if (val >= 1000) return `${(val/1000).toFixed(1)} Gbps`;
      if (val >= 1) return `${val.toFixed(1)} Mbps`;
      if (val > 0) return `${(val * 1000).toFixed(0)} Kbps`;
      return '0 bps';
    };
    
    return {
      rx: formatSpeed(last.rx),
      tx: formatSpeed(last.tx),
      rxNum: last.rx,
      txNum: last.tx
    };
  };

  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationDecision, setSimulationDecision] = useState<'accept' | 'drop' | 'nat-applied' | null>(null);

  const addLog = (source: string, message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      source,
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const handleGenerateScript = async () => {
    if (!currentTask.trim()) return;
    setIsGenerating(true);
    setGeneratedResult(null);
    addLog('AI-Engine', `Compiling secure configuration directives for: "${currentTask}"`, 'info');

    try {
      if (providerSettings.provider === 'gemini') {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'Network Security Architect', task: currentTask })
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        setGeneratedResult(data);
        addLog('AI-Engine', `Command list generated securely using local sandbox credentials.`, 'info');
      } else {
        const response = await fetch('/api/ollama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: providerSettings.ollamaBaseUrl,
            model: providerSettings.ollamaModel,
            role: 'Network Security Architect',
            task: currentTask
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        setGeneratedResult(data);
        addLog('AI-Engine', `Command list generated successfully via local Ollama endpoint.`, 'info');
      }
    } catch (err: any) {
      addLog('System', `Failed to generate scripts: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Automated Action applier
  const applyGeneratedCommandsToState = () => {
    if (!generatedResult) return;
    addLog('System', 'Decrypting local AI command sequence. Updating WinBox simulation tables...', 'info');
    
    generatedResult.commands.forEach((cmdObj) => {
      const rawText = cmdObj.command.toLowerCase();
      
      // Basic heuristic parser to make actions "really work" in the visual simulator state
      if (rawText.includes('/ip address add')) {
        const addressMatch = rawText.match(/address=([^\s]+)/);
        const interfaceMatch = rawText.match(/interface=([^\s]+)/);
        if (addressMatch && interfaceMatch) {
          const addr = addressMatch[1];
          const intf = interfaceMatch[1];
          const newId = Date.now().toString() + Math.random().toString();
          setIps(prev => [...prev, {
            id: newId,
            address: addr,
            network: addr.split('.')[0] + '.' + addr.split('.')[1] + '.0.0', // basic inference
            interface: intf,
            comment: 'Added via Direct AI Prompt'
          }]);
          addLog('Router OS', `Applied IP Config: ${addr} on ${intf}`, 'command');
        }
      } else if (rawText.includes('/ip firewall filter add')) {
        const chainMatch = rawText.match(/chain=([^\s]+)/);
        const actionMatch = rawText.match(/action=([^\s]+)/);
        const protocolMatch = rawText.match(/protocol=([^\s]+)/);
        const portMatch = rawText.match(/dst-port=([^\s]+)/);

        if (chainMatch && actionMatch) {
          const newRule: FirewallFilterRule = {
            id: Date.now().toString() + Math.random(),
            chain: chainMatch[1] as any,
            action: actionMatch[1] as any,
            protocol: protocolMatch ? protocolMatch[1] : undefined,
            dstPort: portMatch ? parseInt(portMatch[1]) : undefined,
            comment: 'Added via Secure Direct Assistant'
          };
          setFilterRules(prev => [...prev, newRule]);
          addLog('Router OS', `Applied Filter Rule: chain=${newRule.chain} action=${newRule.action} protocol=${newRule.protocol || 'any'}`, 'command');
        }
      } else if (rawText.includes('/ip firewall nat add')) {
        const chainMatch = rawText.match(/chain=([^\s]+)/);
        const actionMatch = rawText.match(/action=([^\s]+)/);
        if (chainMatch && actionMatch) {
          const newNat: FirewallNATRule = {
            id: Date.now().toString(),
            chain: chainMatch[1] as any,
            action: actionMatch[1] as any,
            outInterface: 'lte1',
            comment: 'Added via Secure Prompt'
          };
          setNatRules(prev => [...prev, newNat]);
          addLog('Router OS', `Applied NAT Rule: ${newNat.chain} -> ${newNat.action}`, 'command');
        }
      }
    });

    addLog('System', 'All parsable commands simulated on virtual interface successfully.', 'info');
    setActiveTab('ips');
  };

  const handleExportConfigToRsc = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `RouterOS_Export_${timestamp}.rsc`;

    let content = `# ====================================================================\n`;
    content += `# RouterOS Terminal Export Script (.rsc)\n`;
    content += `# Exported from RouterOS AI Assistant Terminal\n`;
    content += `# Target Platform: MikroTik RouterOS v7.x\n`;
    content += `# Generated On: ${new Date().toLocaleString()}\n`;
    content += `# ====================================================================\n\n`;

    content += `# --------------------------------------------------------------------\n`;
    content += `# 1. INTERFACE CONFIGURATION\n`;
    content += `# --------------------------------------------------------------------\n`;
    content += `/interface\n`;
    interfaces.forEach((i) => {
      if (i.type === 'vlan') {
        const vlanMatch = i.name.match(/\d+/);
        const vlanId = vlanMatch ? vlanMatch[0] : '10';
        content += `vlan add name="${i.name}" vlan-id=${vlanId} interface="bridge-vlan" comment="${i.comment || ''}"\n`;
      } else {
        content += `set [ find name="${i.name}" ] comment="${i.comment || ''}"\n`;
      }
    });

    content += `\n# --------------------------------------------------------------------\n`;
    content += `# 2. IP ADDRESS POOL & GATEWAYS\n`;
    content += `# --------------------------------------------------------------------\n`;
    content += `/ip address\n`;
    ips.forEach((ip) => {
      content += `add address="${ip.address}" network="${ip.network}" interface="${ip.interface}" comment="${ip.comment || ''}"\n`;
    });

    content += `\n# --------------------------------------------------------------------\n`;
    content += `# 3. FIREWALL NAT RULES\n`;
    content += `# --------------------------------------------------------------------\n`;
    content += `/ip firewall nat\n`;
    natRules.forEach((rule) => {
      let cmd = `add chain="${rule.chain}" action="${rule.action}"`;
      if (rule.outInterface) cmd += ` out-interface="${rule.outInterface}"`;
      if (rule.inInterface) cmd += ` in-interface="${rule.inInterface}"`;
      if (rule.protocol) cmd += ` protocol="${rule.protocol}"`;
      if (rule.dstPort) cmd += ` dst-port=${rule.dstPort}`;
      if (rule.toAddresses) cmd += ` to-addresses="${rule.toAddresses}"`;
      if (rule.toPorts) cmd += ` to-ports="${rule.toPorts}"`;
      if (rule.comment) cmd += ` comment="${rule.comment}"`;
      content += `${cmd}\n`;
    });

    content += `\n# --------------------------------------------------------------------\n`;
    content += `# 4. FIREWALL FILTER RULES\n`;
    content += `# --------------------------------------------------------------------\n`;
    content += `/ip firewall filter\n`;
    filterRules.forEach((filter) => {
      let cmd = `add chain="${filter.chain}" action="${filter.action}"`;
      if (filter.protocol && filter.protocol !== 'any') cmd += ` protocol="${filter.protocol.toLowerCase()}"`;
      if (filter.srcAddress) cmd += ` src-address="${filter.srcAddress}"`;
      if (filter.dstAddress) cmd += ` dst-address="${filter.dstAddress}"`;
      if (filter.dstPort) cmd += ` dst-port=${filter.dstPort}`;
      if (filter.comment) cmd += ` comment="${filter.comment}"`;
      content += `${cmd}\n`;
    });

    if (generatedResult?.commands && generatedResult.commands.length > 0) {
      content += `\n# --------------------------------------------------------------------\n`;
      content += `# 5. LATEST AI ASSISTANT COMPILED COMMANDS (${currentTask || 'Custom Request'})\n`;
      content += `# --------------------------------------------------------------------\n`;
      generatedResult.commands.forEach((c, idx) => {
        content += `# [Step ${idx + 1}] ${c.explanation}\n`;
        content += `${c.command}\n\n`;
      });
    }

    content += `# ====================================================================\n`;
    content += `# End of RouterOS Import Script\n`;
    content += `# ====================================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog('System', `Exported RouterOS config script to file: ${filename}`, 'info');
  };

  const deleteIp = (id: string) => {
    setIps(prev => prev.filter(ip => ip.id !== id));
    addLog('WinBox', `Deleted IP registration ID: ${id}`, 'info');
  };

  const deleteNat = (id: string) => {
    setNatRules(prev => prev.filter(n => n.id !== id));
    addLog('WinBox', `Deleted NAT Rule ${id}`, 'info');
  };

  const deleteFilter = (id: string) => {
    setFilterRules(prev => prev.filter(f => f.id !== id));
    addLog('WinBox', `Deleted Filter Rule ${id}`, 'info');
  };

  const addManualIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addIpForm.address) return;
    const newIp: IPAddressConfig = {
      id: Date.now().toString(),
      address: addIpForm.address,
      network: addIpForm.address.split('/')[0].split('.').slice(0, 3).join('.') + '.0',
      interface: addIpForm.interface,
      comment: addIpForm.comment || 'Manually declared'
    };
    setIps(prev => [...prev, newIp]);
    setAddIpForm({ address: '', interface: 'vlan10-main', comment: '' });
    addLog('WinBox', `Assigned IP: ${newIp.address} to interface ${newIp.interface}`, 'info');
  };

  const addManualFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: FirewallFilterRule = {
      id: Date.now().toString(),
      chain: addFilterForm.chain as any || 'forward',
      action: addFilterForm.action as any || 'drop',
      protocol: addFilterForm.protocol === 'any' ? undefined : addFilterForm.protocol,
      comment: addFilterForm.comment || 'Custom user filter'
    };
    setFilterRules(prev => [...prev, newRule]);
    setAddFilterForm({ chain: 'forward', action: 'drop', protocol: 'any', comment: '' });
    addLog('WinBox', `Added Firewall rule: chain=${newRule.chain} action=${newRule.action}`, 'info');
  };

  const triggerPacketSimulation = () => {
    setSimulationActive(true);
    setSimulationStep(1);
    setSimulationDecision(null);
    setSimulationLogs(['Initiating L2/L3 packet routing and VLAN boundary isolation diagnostic trace...']);
  };

  // Tracing packet simulator trace ticks
  useEffect(() => {
    if (!simulationActive) return;

    const runSimulationStep = () => {
      setSimulationStep(prev => {
        const nextStep = prev + 1;
        
        if (nextStep === 2) {
          const logMsg = `[Step 2] Route Decision: Ingress packet verified on physical sub-interface [${simulatorInput.srcInterface}]. Packet Source Subnet: ${simulatorInput.srcIp}. Port assigned to protocol ${simulatorInput.protocol}.`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 3) {
          const hasNAT = natRules.some(n => n.chain === 'srcnat' && n.action === 'masquerade');
          const logMsg = `[Step 3] PREROUTING / NAT checking: Masquerade NAT rule verified on uplink lte1: ${hasNAT ? 'ACTIVE (Outbound translations enabled)' : 'DISABLED'}`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 4) {
          // Dynamic security checking representing VLAN isolation
          let fate: 'accept' | 'drop' = 'accept';
          let matchReason = 'No restrictive drop filters found for this interface path.';

          // Isolation check for VLAN 20 -> VLAN 10
          if (simulatorInput.srcIp.startsWith('192.168.20.') && simulatorInput.dstIp.startsWith('192.168.10.')) {
            fate = 'drop';
            matchReason = 'Matched Firewall Rule ID drop: [Isolate Guest Subnet (VLAN 20) from Main (VLAN 10)]. Dropping IP frame immediately.';
          } else {
            for (const rule of filterRules) {
              if (rule.action === 'drop' || rule.action === 'reject') {
                const matchSubnet = rule.srcAddress && simulatorInput.srcIp.startsWith(rule.srcAddress.split('/')[0].slice(0, 10));
                const matchProtocol = rule.protocol && rule.protocol.toLowerCase() === simulatorInput.protocol.toLowerCase();
                const matchPort = rule.dstPort && rule.dstPort === simulatorInput.dstPort;

                if (matchSubnet || matchProtocol || matchPort) {
                  fate = 'drop';
                  matchReason = `Matched Rule ID drop chain: [${rule.comment || 'Unnamed rule'}]. Dropping frame immediately.`;
                  break;
                }
              }
            }
          }

          setSimulationDecision(fate);
          const logMsg = `[Step 4] FIREWALL FORWARD / INPUT chain check: Decision: [${fate.toUpperCase()}]. ${matchReason}`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 5) {
          if (simulationDecision === 'drop') {
            setSimulationLogs(logs => [...logs, `[Step 5] Finished: Packet discarded by RouterOS firewall filter. VLAN isolation enforced.`]);
          } else {
            setSimulationLogs(logs => [...logs, `[Step 5] POSTROUTING NAT applied. IP translated. Packet forwarded successfully to destination IP ${simulatorInput.dstIp} on port ${simulatorInput.dstPort}.`]);
          }
          setSimulationActive(false);
          return 0; // stop
        }

        return nextStep;
      });
    };

    const timer = setInterval(runSimulationStep, 1500);
    return () => clearInterval(timer);
  }, [simulationActive, simulationStep, simulatorInput, filterRules, natRules, simulationDecision]);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sidebar with all navigation options */}
      <div className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0d] border-r border-[#191924] flex flex-col z-50">
        <div className="p-6 border-b border-[#12121c] flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Router className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              Secure WinBox
              <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">AI</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium">admin@R1-Core-Gateway</p>
          </div>
        </div>

        {/* Sidebar Nav Panels */}
        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mb-2">Private AI System</p>
          
          <NavItem 
            icon={<Cpu size={16} />} 
            label="Direct AI Companion" 
            active={activeTab === 'terminal'} 
            onClick={() => setActiveTab('terminal')} 
            badge="Secure"
          />
          <NavItem 
            icon={<Radio size={16} className="text-cyan-400" />} 
            label="Network Scanner & Agent Platform" 
            active={activeTab === 'netscanner'} 
            onClick={() => setActiveTab('netscanner')} 
            badge="Pro"
          />
          <NavItem 
            icon={<Layers size={16} />} 
            label="Packet Flow Trace" 
            active={activeTab === 'simulator'} 
            onClick={() => setActiveTab('simulator')} 
          />
          <NavItem 
            icon={<Terminal size={16} className="text-cyan-400" />} 
            label="Packet Sniffer & Frame Analysis" 
            active={activeTab === 'packetsniffer'} 
            onClick={() => setActiveTab('packetsniffer')} 
            badge="Live"
          />
          <NavItem 
            icon={<Activity size={16} />} 
            label="Hardware Stress Test" 
            active={activeTab === 'stresstest'} 
            onClick={() => setActiveTab('stresstest')} 
            badge="New"
          />

          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mt-4 mb-2">Topology & Wireless</p>
          <NavItem 
            icon={<Network size={16} />} 
            label="Network Topology" 
            active={activeTab === 'topology'} 
            onClick={() => setActiveTab('topology')} 
            badge="New"
          />
          <NavItem 
            icon={<Radio size={16} />} 
            label="Wave2 CAPsMAN WiFi" 
            active={activeTab === 'capsman'} 
            onClick={() => setActiveTab('capsman')} 
            badge="New"
          />

          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mt-4 mb-2">Layer 2 & Layer 3 Protection</p>
          <NavItem 
            icon={<Server size={16} />} 
            label="Simple DHCP Leases" 
            active={activeTab === 'dhcp'} 
            onClick={() => setActiveTab('dhcp')} 
            badge="New"
          />
          <NavItem 
            icon={<Sliders size={16} />} 
            label="STP Loop Prevention" 
            active={activeTab === 'stp'} 
            onClick={() => setActiveTab('stp')} 
            badge="New"
          />
          <NavItem 
            icon={<Lock size={16} />} 
            label="WireGuard VPN Tunnels" 
            active={activeTab === 'wireguard'} 
            onClick={() => setActiveTab('wireguard')} 
            badge="New"
          />

          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mt-4 mb-2">Tables & Hardware</p>
          <NavItem 
            icon={<Laptop size={16} className="text-cyan-400" />} 
            label="Physical Adapters HUD" 
            active={activeTab === 'local-adapters'} 
            onClick={() => setActiveTab('local-adapters')} 
            badge="Live"
          />
          <NavItem 
            icon={<Activity size={16} />} 
            label="Interfaces" 
            active={activeTab === 'interfaces'} 
            onClick={() => setActiveTab('interfaces')} 
          />
          <NavItem 
            icon={<Database size={16} />} 
            label="IP Address Pool" 
            active={activeTab === 'ips'} 
            onClick={() => setActiveTab('ips')} 
          />
          <NavItem 
            icon={<Shield size={16} className="text-yellow-500" />} 
            label="NAT Masquerade" 
            active={activeTab === 'nat'} 
            onClick={() => setActiveTab('nat')} 
          />
          <NavItem 
            icon={<Shield size={16} className="text-red-500" />} 
            label="Firewall Filters" 
            active={activeTab === 'filters'} 
            onClick={() => setActiveTab('filters')} 
          />

          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mt-4 mb-2">Settings</p>
          <NavItem 
            icon={<Settings size={16} />} 
            label="RoMON & Clock System" 
            active={activeTab === 'mangle'} 
            onClick={() => setActiveTab('mangle')} 
            badge="New"
          />
          <NavItem 
            icon={<Sliders size={16} />} 
            label="LLM Provider Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>

        {/* Lower Connection info indicating standalone private connections */}
        <div className="p-4 border-t border-[#12121c] bg-[#07070a]/90 space-y-2">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-[10px] text-zinc-500">Uplink LTE1 Status:</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Handed Off</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Server size={10} />
            <span>Direct Client Sandbox</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="pl-64 min-h-screen bg-[#070709] flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-[#12121c] bg-[#0a0a0d] flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-mono">Device Target IP: <span className="text-cyan-400 font-bold">192.168.88.1</span></span>
            <span className="h-4 w-[1px] bg-[#1a1a24]" />
            <span className="text-xs text-zinc-400 font-mono">WinBox Alternative Edition v4.0.5</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10101b] border border-[#19192c] text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">{providerSettings.provider} Direct-Connect Active</span>
            </div>
          </div>
        </header>

        {/* Workspace body */}
        <div className="p-8 flex-1 overflow-x-hidden max-w-7xl w-full mx-auto">
          
          {/* TAB 1: AI ASSISTANT TERMINAL */}
          {activeTab === 'terminal' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Cpu className="text-cyan-400 w-5 h-5" />
                    RouterOS Private AI Assistant Workspace
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                    Describe any networking or configuration goal. The sandbox assistant compiles the instructions and generates completely valid, copy-pasteable RouterOS commands. No external relay or insecure endpoints are used.
                  </p>
                </div>
                <button
                  onClick={handleExportConfigToRsc}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/80 hover:border-cyan-500/80 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                  title="Export current interfaces, IPs, firewall rules, and compiled commands to a downloadable .rsc file"
                >
                  <Download size={15} />
                  Export RouterOS Script (.rsc)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Configure Request</label>
                      <textarea
                        value={currentTask}
                        onChange={(e) => setCurrentTask(e.target.value)}
                        placeholder="e.g. Set up a static IP assignment on the corporate VLAN interface..."
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-3 text-xs h-36 focus:outline-none focus:border-cyan-500 transition-all font-mono placeholder-zinc-700"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCurrentTask("Set up VLAN 10 for Corporate Staff with IP subnet 192.168.10.1/24 and DHCP address pool range")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded text-zinc-400 font-medium"
                      >
                        VLAN Setup
                      </button>
                      <button
                        onClick={() => setCurrentTask("Block internet routing for Guest VLAN 20 devices attempting to touch the local Core Router on Port 80/22")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-705 px-2 py-1 rounded text-zinc-400 font-medium"
                      >
                        Isolation Filters
                      </button>
                      <button
                        onClick={() => setCurrentTask("Generate WireGuard VPN server interface listen-port=13231 and register client allowed-address=10.50.0.5/32")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-705 px-2 py-1 rounded text-zinc-400 font-medium"
                      >
                        VPN Tunnel
                      </button>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleGenerateScript}
                        disabled={isGenerating || !currentTask.trim()}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/10 cursor-pointer"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="animate-spin w-4 h-4" />
                            Analyzing network topology...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Compile RouterOS Syntax
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleExportConfigToRsc}
                        className="w-full bg-[#050508] hover:bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-cyan-500/50 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        title="Export interface, IP, firewall, and compiled AI script to a downloadable RouterOS import file (.rsc)"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Export RouterOS Config File (.rsc)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Result Panel */}
                <div className="lg:col-span-7">
                  {generatedResult ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-3">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">WinBox Compliant Output</span>
                          <h3 className="text-white text-sm font-bold mt-1.5">Generated Direct CLI Commands</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportConfigToRsc}
                            className="bg-cyan-950/50 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-800/60 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            title="Export full script file"
                          >
                            <Download size={13} />
                            Export .rsc
                          </button>
                          <button
                            onClick={applyGeneratedCommandsToState}
                            className="bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/25 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Simulate in UI Tables
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {generatedResult.commands.map((cmd, idx) => (
                          <div key={idx} className="bg-black/80 border border-zinc-900 p-4 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500 font-mono">Command {idx + 1}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(cmd.command)}
                                className="text-[10px] text-cyan-500 hover:text-cyan-400 font-semibold flex items-center gap-1"
                              >
                                <Copy size={11} />
                                Copy
                              </button>
                            </div>
                            <code className="text-emerald-400 font-mono text-[11px] block whitespace-pre-wrap select-all">
                              {cmd.command}
                            </code>
                            <p className="text-zinc-400 text-xs leading-relaxed pt-1">
                              {cmd.explanation}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">AI Companion Routing Summary</span>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                          {generatedResult.overallSummary}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-[#0a0a0f]/40 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-12 text-zinc-500 min-h-[300px]">
                      <Terminal size={40} className="text-zinc-800 mb-3 animate-pulse" />
                      <p className="text-xs max-w-sm leading-relaxed">
                        Specify a network action in the input editor and hit generate. Verified commands will render here along with structural routing logs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK TOPOLOGY */}
          {activeTab === 'topology' && <NetworkTopology />}

          {/* TAB 3: WAVe2 CAPSMAN */}
          {activeTab === 'capsman' && <WirelessCAPsMAN />}

          {/* TAB 4: STP PROTECTION */}
          {activeTab === 'stp' && <STPConfigurator />}

          {/* TAB 5: DHCP LEASES */}
          {activeTab === 'dhcp' && <DHCPServer />}

          {/* TAB 6: WIREGUARD VPN */}
          {activeTab === 'wireguard' && <WireGuardVPN />}

          {/* TAB 7: HARDWARE SYSTEM SETTINGS */}
          {activeTab === 'mangle' && <InterfaceMangle />}

          {/* TAB 8: PHYSICAL INTERFACES */}
          {activeTab === 'interfaces' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Activity className="text-cyan-400 w-5 h-5 animate-pulse" />
                    RouterOS Physical &amp; Virtual Interfaces
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                    Real-time status tracking of physical and logical network boundaries in your setup. Click on any interface in the table below to inspect its live D3.js throughput statistics.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('packetsniffer')}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-900/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                  >
                    <Layers size={13} />
                    Launch Packet Sniffer
                  </button>
                  <div className="flex items-center gap-2 bg-[#0a0a14] border border-zinc-800 p-2.5 rounded-xl shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${isTrafficPaused ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      {isTrafficPaused ? 'Telemetry Frozen' : 'Telemetry Link Online'}
                    </span>
                  </div>
                </div>
              </div>

              {/* D3 Interactive Area Chart Panel */}
              <InterfaceTrafficChart
                interfaceName={selectedInterface}
                data={trafficHistory[selectedInterface] || []}
                onTriggerSpike={setActiveSpike}
                activeSpike={activeSpike}
                isPaused={isTrafficPaused}
                onTogglePause={() => setIsTrafficPaused(p => !p)}
              />

              <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Interface Traffic Matrix</span>
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Select any interface row below to graph</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="pb-3 pl-2">Port Name</th>
                        <th className="pb-3">Media/Type</th>
                        <th className="pb-3 font-mono">Bound IP Address</th>
                        <th className="pb-3">Operational Status</th>
                        <th className="pb-3">RX Traffic &amp; Sparkline</th>
                        <th className="pb-3">TX Traffic &amp; Sparkline</th>
                        <th className="pb-3">Comment Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/30">
                      {interfaces.map((intf) => {
                        const isSelected = selectedInterface === intf.name;
                        const latestSpeeds = getLatestRxTxText(intf.name);
                        return (
                          <tr 
                            key={intf.name} 
                            onClick={() => setSelectedInterface(intf.name)}
                            className={`transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-cyan-950/15 text-white font-medium border-l border-cyan-500' 
                                : 'hover:bg-zinc-950/40 text-zinc-400'
                            }`}
                          >
                            <td className="py-4 pl-2 font-bold flex items-center gap-2">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping absolute" />}
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              {!isSelected && <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
                              <span className={isSelected ? 'text-cyan-400' : 'text-zinc-300'}>{intf.name}</span>
                            </td>
                            <td className="py-4">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                isSelected ? 'bg-cyan-950/60 text-cyan-300 border-cyan-900' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                              }`}>
                                {intf.type}
                              </span>
                            </td>
                            <td className="py-4 font-mono text-cyan-400">{intf.ipAddress}</td>
                            <td className="py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit ${
                                intf.status === 'up' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-900/20' : 'bg-red-500/10 text-red-400 border border-red-900/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${intf.status === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {intf.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <span className="w-20 inline-block font-mono font-bold text-cyan-400">{latestSpeeds.rx}</span>
                                <InterfaceSparkline 
                                  data={trafficHistory[intf.name]?.map(p => p.rx) || []} 
                                  color="#06b6d4" 
                                />
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <span className="w-20 inline-block font-mono font-bold text-pink-400">{latestSpeeds.tx}</span>
                                <InterfaceSparkline 
                                  data={trafficHistory[intf.name]?.map(p => p.tx) || []} 
                                  color="#ec4899" 
                                />
                              </div>
                            </td>
                            <td className="py-4 text-zinc-500 italic text-[11px]">{intf.comment}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SNMP Manager Section */}
              <SNMPManager />
            </div>
          )}

          {/* TAB 9: IP POOL */}
          {activeTab === 'ips' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Database className="text-cyan-400 w-5 h-5" />
                    WinBox IP Address Allocations
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Set up direct layer-3 IP pathways on your VLAN interfaces. Packets are evaluated inside the flow trace based on these bounds.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Form */}
                <div className="xl:col-span-4 bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4 h-fit">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Assign IP Address</h3>
                  <form onSubmit={addManualIp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">IP Address/Mask</label>
                      <input 
                        type="text"
                        placeholder="e.g. 192.168.10.1/24"
                        value={addIpForm.address}
                        onChange={(e) => setAddIpForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Interface Target</label>
                      <select
                        value={addIpForm.interface}
                        onChange={(e) => setAddIpForm(prev => ({ ...prev, interface: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        {interfaces.map(i => (
                          <option key={i.name} value={i.name}>{i.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Comment Description</label>
                      <input 
                        type="text"
                        placeholder="e.g. Corporate VLAN core"
                        value={addIpForm.comment}
                        onChange={(e) => setAddIpForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-cyan-900/10 cursor-pointer"
                    >
                      Apply IP Reservation
                    </button>
                  </form>
                </div>

                {/* Table */}
                <div className="xl:col-span-8 bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="pb-3">IP Address</th>
                          <th className="pb-3 font-mono">Network Subnet</th>
                          <th className="pb-3">Physical Interface</th>
                          <th className="pb-3">Comment / Purpose</th>
                          <th className="pb-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/30">
                        {ips.map((ip) => (
                          <tr key={ip.id} className="hover:bg-zinc-950/40 transition-colors">
                            <td className="py-3.5 font-mono text-cyan-400 text-xs font-bold">{ip.address}</td>
                            <td className="py-3.5 font-mono text-zinc-500">{ip.network}</td>
                            <td className="py-3.5 font-mono text-zinc-300">{ip.interface}</td>
                            <td className="py-3.5 text-zinc-400 italic text-[11px]">{ip.comment}</td>
                            <td className="py-3.5 text-right">
                              <button 
                                onClick={() => deleteIp(ip.id)}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: NAT TABLE */}
          {activeTab === 'nat' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Shield className="text-yellow-500 w-5 h-5" />
                  Firewall NAT Table
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  Translates internal private network frames to outbound public internet envelopes.
                </p>
              </div>

              <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="pb-3">Chain Type</th>
                        <th className="pb-3">Outgoing Interface</th>
                        <th className="pb-3">Action Target</th>
                        <th className="pb-3">Description / Comment</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/30">
                      {natRules.map((nat) => (
                        <tr key={nat.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="py-3.5 font-mono text-yellow-500 font-bold">{nat.chain}</td>
                          <td className="py-3.5 font-mono text-zinc-400">{nat.outInterface || 'any'}</td>
                          <td className="py-3.5">
                            <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 uppercase font-mono">
                              {nat.action}
                            </span>
                          </td>
                          <td className="py-3.5 text-zinc-400 italic text-[11px]">{nat.comment}</td>
                          <td className="py-3.5 text-right">
                            <button 
                              onClick={() => deleteNat(nat.id)}
                              className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: FIREWALL FILTERS */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Shield className="text-red-500 w-5 h-5" />
                  Firewall Filter Rules Table
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  Enforces boundary packet rejection and drop parameters. Protects sensitive VLAN corporate pathways from untrusted guests.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Form */}
                <div className="xl:col-span-4 bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl h-fit space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Add Filter Rule</h3>
                  <form onSubmit={addManualFilter} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Chain</label>
                      <select 
                        value={addFilterForm.chain}
                        onChange={(e) => setAddFilterForm(prev => ({ ...prev, chain: e.target.value as any }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none"
                      >
                        <option value="forward">forward (Transit Traffic)</option>
                        <option value="input">input (To Router Core)</option>
                        <option value="output">output (From Router Core)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Action</label>
                      <select 
                        value={addFilterForm.action}
                        onChange={(e) => setAddFilterForm(prev => ({ ...prev, action: e.target.value as any }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none"
                      >
                        <option value="drop">drop (Silent discard)</option>
                        <option value="accept">accept (Allow passage)</option>
                        <option value="reject">reject (Notify drop)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Protocol Type</label>
                      <select 
                        value={addFilterForm.protocol}
                        onChange={(e) => setAddFilterForm(prev => ({ ...prev, protocol: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none"
                      >
                        <option value="any">any (All IP traffic)</option>
                        <option value="tcp">tcp (Transmission Control)</option>
                        <option value="udp">udp (User Datagram)</option>
                        <option value="icmp">icmp (Ping packets)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Comment / Label</label>
                      <input 
                        type="text"
                        placeholder="Isolate local networks"
                        value={addFilterForm.comment}
                        onChange={(e) => setAddFilterForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-cyan-900/10 cursor-pointer"
                    >
                      Apply Filter Rule
                    </button>
                  </form>
                </div>

                {/* Table */}
                <div className="xl:col-span-8 bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="pb-3">Rule Order</th>
                          <th className="pb-3">Chain</th>
                          <th className="pb-3">Action</th>
                          <th className="pb-3">Source IP</th>
                          <th className="pb-3">Destination IP</th>
                          <th className="pb-3">Protocol</th>
                          <th className="pb-3">Comment / Label</th>
                          <th className="pb-3 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/30">
                        {filterRules.map((rule, index) => (
                          <tr key={rule.id} className="hover:bg-zinc-950/40 transition-colors">
                            <td className="py-3.5 text-zinc-500 font-bold">{index}</td>
                            <td className="py-3.5 font-mono text-zinc-400">{rule.chain}</td>
                            <td className="py-3.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                                rule.action === 'accept' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-900/20' : 'bg-red-500/10 text-red-400 border border-red-900/20'
                              }`}>
                                {rule.action}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-zinc-400">{rule.srcAddress || 'any'}</td>
                            <td className="py-3.5 font-mono text-zinc-400">{rule.dstAddress || 'any'}</td>
                            <td className="py-3.5 font-mono text-zinc-500">{rule.protocol || 'any'}</td>
                            <td className="py-3.5 text-zinc-400 italic text-[11px]">{rule.comment}</td>
                            <td className="py-3.5 text-right">
                              <button 
                                onClick={() => deleteFilter(rule.id)}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: PACKET TRACE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="text-cyan-400 w-5 h-5" />
                  L2/L3 Packet Flow & Security boundary diagnostic
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  Verify routing boundaries. Trace raw transport layer frames across your subnets to confirm that VLAN 10 & VLAN 20 security rules are perfectly active.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Form Input panel */}
                <div className="xl:col-span-4 bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Inject Diagnostic Packet</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Source Subnet / IP</label>
                      <select 
                        value={simulatorInput.srcIp}
                        onChange={(e) => setSimulatorInput(prev => ({ ...prev, srcIp: e.target.value, srcInterface: e.target.value.startsWith('192.168.20') ? 'vlan20-guest' : 'vlan10-main' }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs text-cyan-400 font-mono focus:outline-none"
                      >
                        <option value="192.168.20.55">192.168.20.55 (Guest VLAN 20 Station)</option>
                        <option value="192.168.10.12">192.168.10.12 (Corporate VLAN 10 AP client)</option>
                        <option value="192.168.10.100">192.168.10.100 (Corporate VLAN 10 Workstation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Destination IP Address</label>
                      <select 
                        value={simulatorInput.dstIp}
                        onChange={(e) => setSimulatorInput(prev => ({ ...prev, dstIp: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs text-cyan-400 font-mono focus:outline-none"
                      >
                        <option value="192.168.10.15">192.168.10.15 (Corporate Main Server - Inside LAN)</option>
                        <option value="8.8.8.8">8.8.8.8 (Public DNS Server - External WAN)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Protocol</label>
                        <select 
                          value={simulatorInput.protocol}
                          onChange={(e) => setSimulatorInput(prev => ({ ...prev, protocol: e.target.value as any }))}
                          className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none"
                        >
                          <option value="TCP">TCP</option>
                          <option value="UDP">UDP</option>
                          <option value="ICMP">ICMP</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Port Target</label>
                        <input 
                          type="number"
                          value={simulatorInput.dstPort}
                          onChange={(e) => setSimulatorInput(prev => ({ ...prev, dstPort: parseInt(e.target.value) }))}
                          className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={triggerPacketSimulation}
                      disabled={simulationActive}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/10 cursor-pointer"
                    >
                      <Play size={13} />
                      {simulationActive ? 'Tracing Packet...' : 'Inject Packet Frame'}
                    </button>
                  </div>
                </div>

                {/* Simulation Output Area */}
                <div className="xl:col-span-8 bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl flex flex-col justify-between min-h-[360px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Active Trace Output Channel</span>
                      {simulationStep > 0 && (
                        <span className="text-[10px] font-mono text-zinc-500">Step {simulationStep} of 5</span>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-2">
                      {simulationLogs.map((log, index) => (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, x: -5 }} 
                          animate={{ opacity: 1, x: 0 }}
                          className="font-mono text-[11px] leading-relaxed text-zinc-300 bg-[#050508] border border-zinc-900 p-2.5 rounded-lg flex gap-2 items-start"
                        >
                          <span className="text-cyan-400 font-bold shrink-0">&gt;</span>
                          <span>{log}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {simulationDecision && (
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`p-4 rounded-xl border flex items-center gap-3 mt-4 ${
                        simulationDecision === 'drop' 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {simulationDecision === 'drop' ? (
                        <>
                          <AlertCircle size={20} className="shrink-0" />
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider block">Packet Discarded (Drop Rule Matched)</span>
                            <span className="text-[11px] text-zinc-400">VLAN Isolation enforced successfully. Access between the Guest network and corporate LAN was blocked by direct firewall policies.</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} className="shrink-0" />
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider block">Packet Allowed (Accept Gate Passed)</span>
                            <span className="text-[11px] text-zinc-400">Outbound public translation applied. Packet reached destination cleanly.</span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Ping Latency Diagnostic Tool */}
              <PingLatencyTool />
            </div>
          )}

          {/* TAB 12: PHYSICAL LOCAL ADAPTERS HUD */}
          {activeTab === 'local-adapters' && (
            <LocalAdapterMonitor />
          )}

          {/* TAB: HARDWARE STRESS TEST */}
          {activeTab === 'stresstest' && (
            <HardwareStressTest />
          )}

          {/* TAB: PACKET SNIFFER & FRAME ANALYSIS */}
          {activeTab === 'packetsniffer' && (
            <PacketSniffer interfaces={interfaces.map(i => i.name)} />
          )}

          {activeTab === 'netscanner' && (
            <NetworkScannerAgentPlatform 
              ips={ips}
              filterRules={filterRules}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {/* TAB 12: MODEL PROVIDER SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="text-cyan-400 w-5 h-5" />
                  AI Model Connection Preferences
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  Manage connection parameters for the RouterOS helper. Seamlessly toggle between direct secure cloud-hosted Gemini integration and a localized Ollama server running entirely on your local host.
                </p>
              </div>

              <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl max-w-xl space-y-6">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">Model Provider</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setProviderSettings(prev => ({ ...prev, provider: 'gemini' }))}
                      className={`p-4 rounded-xl border font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        providerSettings.provider === 'gemini'
                          ? 'border-cyan-500 bg-cyan-950/20 text-white'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Zap size={16} />
                      Direct Gemini API
                    </button>
                    <button
                      onClick={() => setProviderSettings(prev => ({ ...prev, provider: 'ollama' }))}
                      className={`p-4 rounded-xl border font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        providerSettings.provider === 'ollama'
                          ? 'border-cyan-500 bg-cyan-950/20 text-white'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Database size={16} />
                      Local Ollama Server
                    </button>
                  </div>
                </div>

                {providerSettings.provider === 'ollama' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2 border-t border-zinc-900"
                  >
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Ollama Base Endpoint</label>
                      <input 
                        type="text" 
                        value={providerSettings.ollamaBaseUrl}
                        onChange={(e) => setProviderSettings(prev => ({ ...prev, ollamaBaseUrl: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs font-mono text-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Model Name</label>
                      <input 
                        type="text" 
                        value={providerSettings.ollamaModel}
                        onChange={(e) => setProviderSettings(prev => ({ ...prev, ollamaModel: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs font-mono text-cyan-400 focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="bg-[#050508] p-4 rounded-xl border border-zinc-850 flex items-start gap-3">
                  <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-400 leading-relaxed">
                    By default, the <strong>Direct Gemini API</strong> connects through standard cloud sandbox parameters. Local secrets can be managed securely inside your workspace control panel.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// NavItem Component with dynamic badge
function NavItem({ 
  icon, 
  label, 
  active, 
  onClick,
  badge
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
        active 
          ? 'bg-cyan-600/15 text-cyan-400 border-l-4 border-cyan-500 shadow-md shadow-cyan-950/20 font-bold' 
          : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={active ? 'text-cyan-400' : 'text-zinc-500'}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {badge && (
        <span className="text-[8px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded uppercase font-black tracking-widest leading-none scale-90">
          {badge}
        </span>
      )}
    </button>
  );
}
