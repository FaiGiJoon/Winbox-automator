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
  ArrowRight
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

export default function App() {
  // Navigation Menu tabs
  const [activeTab, setActiveTab] = useState<'interfaces' | 'ips' | 'nat' | 'filters' | 'terminal' | 'simulator' | 'settings'>('terminal');

  // Router Engine Simulated State
  const [interfaces, setInterfaces] = useState<InterfaceState[]>([
    { name: 'ether1-wan', type: 'ether', ipAddress: '203.0.113.85/24', status: 'up', rxSpeed: '12.4 Mbps', txSpeed: '1.2 Mbps', comment: 'Uplink connection to ISP' },
    { name: 'ether2-lan', type: 'ether', ipAddress: '192.168.88.1/24', status: 'up', rxSpeed: '45.1 Mbps', txSpeed: '32.4 Mbps', comment: 'Internal bridge master port' },
    { name: 'ether3-guest', type: 'ether', ipAddress: '10.0.99.1/24', status: 'up', rxSpeed: '0 bps', txSpeed: '0 bps', comment: 'Guest/IoT isolated subnet' },
    { name: 'ether4-office', type: 'ether', ipAddress: '172.16.5.1/24', status: 'down', rxSpeed: '0 bps', txSpeed: '0 bps', comment: 'Secondary office trunk' }
  ]);

  const [ips, setIps] = useState<IPAddressConfig[]>([
    { id: '1', address: '203.0.113.85/24', network: '203.0.113.0', interface: 'ether1-wan', comment: 'Public Endpoint IP' },
    { id: '2', address: '192.168.88.1/24', network: '192.168.88.0', interface: 'ether2-lan', comment: 'Default LAN Gateway' },
    { id: '3', address: '10.0.99.1/24', network: '10.0.99.0', interface: 'ether3-guest', comment: 'Guest Isolated Gateway' }
  ]);

  const [natRules, setNatRules] = useState<FirewallNATRule[]>([
    { id: 'n1', chain: 'srcnat', outInterface: 'ether1-wan', action: 'masquerade', comment: 'Default outgoing masquerade NAT' }
  ]);

  const [filterRules, setFilterRules] = useState<FirewallFilterRule[]>([
    { id: 'f1', chain: 'input', action: 'accept', protocol: 'icmp', comment: 'Allow ping requests to router' },
    { id: 'f2', chain: 'forward', action: 'accept', protocol: 'tcp', dstPort: 443, comment: 'Allow standard HTTPS forward' },
    { id: 'f3', chain: 'forward', action: 'drop', srcAddress: '10.0.99.0/24', dstAddress: '192.168.88.0/24', comment: 'Isolate Guest subnet from LAN' }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', timestamp: '10:00:00', source: 'System', message: 'Web-WinBox dynamic service engine active', type: 'info' },
    { id: 'l2', timestamp: '10:00:02', source: 'OpenClaw', message: 'Handshake complete on local socket. Transport agent ready.', type: 'info' }
  ]);

  // Terminal & OpenClaw state
  const [currentTask, setCurrentTask] = useState('Block all inbound SSH connection attempts except from developer workstation IP 192.168.88.50');
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
  const [addIpForm, setAddIpForm] = useState({ address: '', interface: 'ether2-lan', comment: '' });
  const [addNatForm, setAddNatForm] = useState<Partial<FirewallNATRule>>({ chain: 'srcnat', action: 'masquerade', outInterface: 'ether1-wan' });
  const [addFilterForm, setAddFilterForm] = useState<Partial<FirewallFilterRule>>({ chain: 'forward', action: 'drop', protocol: 'any' });

  // Packet Simulator State
  const [simulatorInput, setSimulatorInput] = useState({
    srcIp: '192.168.88.15',
    dstIp: '8.8.8.8',
    protocol: 'TCP' as 'TCP' | 'UDP' | 'ICMP',
    dstPort: 443,
    srcInterface: 'ether2-lan'
  });
  
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
    addLog('OpenClaw', `Compiling configuration agent instructions for: "${currentTask}"`, 'info');

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
        addLog('OpenClaw', `Command list generated successfully via Gemini AI. Ready to apply.`, 'info');
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
        addLog('OpenClaw', `Command list generated successfully via local Ollama endpoint.`, 'info');
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
    addLog('System', 'Decrypting OpenClaw command sequence. Updating WinBox simulation tables...', 'info');
    
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
            comment: 'Added via OpenClaw prompt'
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
            comment: 'Added via OpenClaw Agent Action'
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
            outInterface: 'ether1-wan',
            comment: 'Added via OpenClaw'
          };
          setNatRules(prev => [...prev, newNat]);
          addLog('Router OS', `Applied NAT Rule: ${newNat.chain} -> ${newNat.action}`, 'command');
        }
      }
    });

    addLog('System', 'All parsable commands simulated on virtual interface successfully.', 'info');
    // Switch to active tab so user can see it!
    setActiveTab('ips');
  };

  // Router Interaction functions
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
    setAddIpForm({ address: '', interface: 'ether2-lan', comment: '' });
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
    setSimulationLogs(['Initiating basic network transport layer diagnostic trace...']);
  };

  useEffect(() => {
    if (!simulationActive) return;

    const runSimulationStep = () => {
      setSimulationStep(prev => {
        const nextStep = prev + 1;
        
        if (nextStep === 2) {
          // Ingress details
          const logMsg = `[Step 2] Route Decision: Ingress packet verified on source physical port [${simulatorInput.srcInterface}]. Packet Source: ${simulatorInput.srcIp}. Port assigned to protocol ${simulatorInput.protocol}.`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 3) {
          // NAT check
          const hasNAT = natRules.some(n => n.chain === 'srcnat' && n.action === 'masquerade');
          const logMsg = `[Step 3] PREROUTING / NAT checking: Tracking transport layer state. Masquerade rule verified: ${hasNAT ? 'ACTIVE (Will disguise local network space)' : 'DISABLED (Packet retains public routing risk - may fail outside local subnets)'}`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 4) {
          // Firewall lookup logic (Transport analysis)
          // Find if any drop rules match
          let fate: 'accept' | 'drop' = 'accept';
          let matchReason = 'No restrictive drop filters found for this interface path.';

          // Find matches
          for (const rule of filterRules) {
            if (rule.action === 'drop' || rule.action === 'reject') {
              // check basic matching
              const matchSubnet = rule.srcAddress && simulatorInput.srcIp.startsWith(rule.srcAddress.split('/')[0].slice(0, 6));
              const matchProtocol = rule.protocol && rule.protocol.toLowerCase() === simulatorInput.protocol.toLowerCase();
              const matchPort = rule.dstPort && rule.dstPort === simulatorInput.dstPort;

              if (matchSubnet || matchProtocol || matchPort) {
                fate = 'drop';
                matchReason = `Matched Rule ID drop chain: [${rule.comment || 'Unnamed rule'}]. Dropping TCP frame immediately.`;
                break;
              }
            }
          }

          setSimulationDecision(fate);
          const logMsg = `[Step 4] FIREWALL FORWARD / INPUT chain matched: Decision: [${fate.toUpperCase()}]. ${matchReason}`;
          setSimulationLogs(logs => [...logs, logMsg]);
          return nextStep;
        }

        if (nextStep === 5) {
          // Egress details
          if (simulationDecision === 'drop') {
            setSimulationLogs(logs => [...logs, `[Step 5] Finished: Packet discarded by RouterOS firewall filter. Transport state dropped.`]);
          } else {
            setSimulationLogs(logs => [...logs, `[Step 5] POSTROUTING NAT applied. Source IP translated to WAN subnet. Packet forwarded cleanly to destination IP ${simulatorInput.dstIp} on port ${simulatorInput.dstPort}.`]);
          }
          setSimulationActive(false);
          return 0; // stop
        }

        return nextStep;
      });
    };

    const timer = setInterval(runSimulationStep, 1800);
    return () => clearInterval(timer);
  }, [simulationActive, simulationStep, simulatorInput, filterRules, natRules, simulationDecision]);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sidebar (Modern Web-WinBox styling) */}
      <div className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0d] border-r border-[#191924] flex flex-col z-50">
        <div className="p-6 border-b border-[#12121c] flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Router className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
              WinBox
              <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">WEB</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium">admin@192.168.88.1</p>
          </div>
        </div>

        {/* Navigation panel */}
        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mb-2">Simulated Router OS</p>
          
          <NavItem 
            icon={<Cpu size={16} />} 
            label="OpenClaw Agent CLI" 
            active={activeTab === 'terminal'} 
            onClick={() => setActiveTab('terminal')} 
            badge="AI Assist"
          />
          <NavItem 
            icon={<Layers size={16} />} 
            label="Transport Layer Trace" 
            active={activeTab === 'simulator'} 
            onClick={() => setActiveTab('simulator')} 
          />
          <NavItem 
            icon={<Activity size={16} />} 
            label="Interfaces" 
            active={activeTab === 'interfaces'} 
            onClick={() => setActiveTab('interfaces')} 
          />
          <NavItem 
            icon={<Network size={16} />} 
            label="IP Addresses" 
            active={activeTab === 'ips'} 
            onClick={() => setActiveTab('ips')} 
          />
          <NavItem 
            icon={<Shield size={16} className="text-yellow-500/80" />} 
            label="Firewall NAT" 
            active={activeTab === 'nat'} 
            onClick={() => setActiveTab('nat')} 
          />
          <NavItem 
            icon={<Shield size={16} className="text-red-500/80" />} 
            label="Firewall Filters" 
            active={activeTab === 'filters'} 
            onClick={() => setActiveTab('filters')} 
          />

          <div className="mt-6">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 px-3 mb-2">Configure</p>
            <NavItem 
              icon={<Settings size={16} />} 
              label="System Settings" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          </div>
        </div>

        {/* Lower Connection Info */}
        <div className="p-4 border-t border-[#12121c] bg-[#07070a]/90 space-y-2">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-[10px] text-zinc-500">Local uplink:</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Connected</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Server size={10} />
            <span>Ollama Base: {providerSettings.ollamaBaseUrl}</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <main className="pl-64 min-h-screen bg-[#070709] flex flex-col">
        {/* Connection Bar */}
        <header className="h-14 border-b border-[#12121c] bg-[#0a0a0d] flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-mono">Session ID: <span className="text-cyan-400 font-bold">192.168.88.1</span></span>
            <span className="h-4 w-[1px] bg-[#1a1a24]" />
            <span className="text-xs text-zinc-400 font-mono">WinBox v4.0.28 (Alternative Web Application)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10101b] border border-[#19192c] text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">{providerSettings.provider} Powered</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Workspace */}
        <div className="p-8 flex-1 overflow-x-hidden max-w-7xl w-full mx-auto">
          
          {/* OPENCLAW AGENT TERMINAL (Primary Workflow) */}
          {activeTab === 'terminal' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Cpu className="text-cyan-400 w-5 h-5" />
                  OpenClaw Agent Workspace (MicroTik RouterOS Configuration Assistant)
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  Enter any networking configuration goal below. The OpenClaw engine interprets your input, applies basic transport layer constraints, and outputs valid, copy-pasteable RouterOS directives with simple explanations.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left panel / Input */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Core Network Objective</label>
                      <textarea
                        value={currentTask}
                        onChange={(e) => setCurrentTask(e.target.value)}
                        placeholder="e.g., Allow port forwarding for a Minecraft server on port 25565..."
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-3 text-xs h-36 focus:outline-none focus:border-cyan-500 transition-all font-mono placeholder-zinc-700"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentTask("Set up Source NAT (masquerade) on ether1-wan so all local devices can parse out to public website spaces")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded text-zinc-400"
                      >
                        Default NAT
                      </button>
                      <button
                        onClick={() => setCurrentTask("Block internet access completely for guest subnet 10.0.99.0/24")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-705 px-2 py-1 rounded text-zinc-400"
                      >
                        Guest Block
                      </button>
                      <button
                        onClick={() => setCurrentTask("Port forward port 80 to webserver 192.168.88.225")}
                        className="text-[9px] bg-zinc-900 border border-zinc-800 hover:border-zinc-705 px-2 py-1 rounded text-zinc-400"
                      >
                        Port Forward
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleGenerateScript}
                        disabled={isGenerating || !currentTask.trim()}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                      >
                        {isGenerating ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {isGenerating ? 'Compiling Command Map...' : 'Generate via OpenClaw Engine'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0b0b10] border border-amber-500/10 p-5 rounded-2xl flex gap-3.5">
                    <Info className="text-amber-500 shrink-0 w-5 h-5 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-200">WinBox Application Link</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                        When commands are generated, press the <strong className="text-white">"Simulate Action inside WinBox"</strong> button to immediately observe changes on the Active Interfaces and IP panels. Perfect for visual learners.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right panel / Output */}
                <div className="lg:col-span-7">
                  <div className="bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden flex flex-col h-[520px]">
                    <div className="px-6 py-4 border-b border-[#141423] flex items-center justify-between bg-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-cyan-400" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Output Buffer</span>
                      </div>
                      {generatedResult && (
                        <button 
                          onClick={applyGeneratedCommandsToState}
                          className="text-[10px] bg-cyan-500 text-black px-2.5 py-1 rounded font-bold hover:bg-cyan-400 transition-colors"
                        >
                          Simulate Action inside WinBox
                        </button>
                      )}
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto scrollbar-thin space-y-4">
                      {isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3">
                          <RefreshCw className="animate-spin text-cyan-400 w-8 h-8" />
                          <p className="text-xs text-zinc-500">Querying OpenClaw routing engine. Resolving protocols...</p>
                        </div>
                      ) : generatedResult ? (
                        <div className="space-y-6">
                          <div>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Transport Layer Impact</p>
                            <div className="bg-[#07070a] border border-cyan-500/10 p-4 rounded-xl text-xs text-cyan-300 leading-relaxed font-serif italic">
                              "{generatedResult.overallSummary}"
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">Generated RouterOS Directives</p>
                            {generatedResult.commands.map((cmd, idx) => (
                              <div key={idx} className="bg-black/80 rounded-xl p-4 border border-[#12121e] space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded font-bold font-mono">Cli Command [{idx + 1}]</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(cmd.command)}
                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                </div>
                                <code className="block text-xs font-mono text-cyan-400 word-break whitespace-pre-wrap select-all">
                                  {cmd.command}
                                </code>
                                <p className="text-xs text-zinc-400 border-t border-zinc-900 pt-2 flex gap-1.5">
                                  <Info size={12} className="text-cyan-500 mt-0.5 shrink-0" />
                                  <span>{cmd.explanation}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
                          <Cpu size={36} strokeWidth={1} className="text-zinc-700 animate-pulse" />
                          <p className="text-xs text-center max-w-sm">
                            Enter your configuration parameters, select a preset subnet block, and send the request via OpenClaw above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRANSPORT LAYER TRACE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="text-cyan-400 w-5 h-5" />
                  Interactive Network Transport Layer Flow Simulator
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  Understand how RouterOS chains, NAT, firewall states, and ingress interfaces match packets sequentially. Setup details on the left, execute the packet animation, and watch its fate decide itself based on your WinBox logic rules!
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration controls */}
                <div className="lg:col-span-4 bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Packet Frame Properties</p>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Source Network Interface</label>
                    <select 
                      value={simulatorInput.srcInterface} 
                      onChange={(e) => setSimulatorInput(p => ({ ...p, srcInterface: e.target.value }))}
                      className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ether2-lan">ether2-lan (LAN Gateway Subnet)</option>
                      <option value="ether3-guest">ether3-guest (Guest Isolated Subnet)</option>
                      <option value="ether1-wan">ether1-wan (Direct public incoming)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Source Client Sim IP</label>
                    <input 
                      type="text" 
                      value={simulatorInput.srcIp} 
                      onChange={(e) => setSimulatorInput(p => ({ ...p, srcIp: e.target.value }))}
                      className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Destination target IP</label>
                    <input 
                      type="text" 
                      value={simulatorInput.dstIp} 
                      onChange={(e) => setSimulatorInput(p => ({ ...p, dstIp: e.target.value }))}
                      className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transport Protocol</label>
                      <select 
                        value={simulatorInput.protocol} 
                        onChange={(e) => setSimulatorInput(p => ({ ...p, protocol: e.target.value as any }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="TCP">TCP (Stateful connection)</option>
                        <option value="UDP">UDP (Stateless diagram)</option>
                        <option value="ICMP">ICMP (Ping utility)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Destination Port</label>
                      <input 
                        type="number" 
                        value={simulatorInput.dstPort} 
                        onChange={(e) => setSimulatorInput(p => ({ ...p, dstPort: parseInt(e.target.value) }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={triggerPacketSimulation}
                    disabled={simulationActive}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Play size={14} /> Run Tracer Diagnosis
                  </button>
                </div>

                {/* Animated diagnostic canvas */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl h-[420px] flex flex-col justify-between relative overflow-hidden">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Dynamic Tracer Path</p>
                    
                    {/* Visual Interface Flow Diagram */}
                    <div className="flex justify-between items-center px-6 relative my-auto z-10">
                      {/* Subnet source node */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 bg-[#12121c] border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                          <Network size={20} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-500">Client Source subnet</span>
                      </div>

                      {/* Connection bar path */}
                      <div className="flex-1 h-1 bg-zinc-800 mx-4 relative">
                        {simulationActive && simulationStep >= 1 && (
                          <motion.div 
                            className="absolute left-0 top-0 h-full bg-cyan-400 rounded"
                            animate={{ width: `${(simulationStep / 5) * 100}%` }}
                            transition={{ duration: 1 }}
                          />
                        )}
                      </div>

                      {/* Firewalled Router Engine Node */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all ${
                          simulationActive ? 'border-cyan-500 bg-[#081a24] shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 
                          simulationDecision === 'drop' ? 'border-red-500 bg-[#240a0a]' : 
                          simulationDecision === 'accept' ? 'border-emerald-500 bg-[#0a240e]' : 'border-zinc-800 bg-[#12121c]'
                        }`}>
                          <Router size={28} className={simulationActive ? 'text-cyan-400 animate-spin' : 'text-zinc-400'} />
                        </div>
                        <span className="text-[10px] font-bold text-white tracking-widest uppercase">MikroTik RouterOS</span>
                      </div>

                      <div className="flex-1 h-1 bg-zinc-800 mx-4 relative">
                        {simulationActive && simulationStep >= 4 && (
                          <motion.div 
                            className="absolute left-0 top-0 h-full bg-cyan-400 rounded"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1 }}
                          />
                        )}
                      </div>

                      {/* Server Destination public node */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 bg-[#12121c] border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                          <Globe size={20} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-500">Target server</span>
                      </div>
                    </div>

                    {/* Step description */}
                    <div className="bg-[#050508] border border-zinc-800/80 p-4 rounded-xl min-h-[100px] flex items-center gap-3">
                      <HelpCircle className="text-cyan-400 shrink-0 w-5 h-5" />
                      <div className="text-xs leading-relaxed text-zinc-400">
                        {simulationLogs.length > 0 ? (
                          <p>{simulationLogs[simulationLogs.length - 1]}</p>
                        ) : (
                          <span>Click <strong>"Run Tracer Diagnosis"</strong> to route simulated TCP segment frames. Perfect for analyzing transport layer filter logic drop decisions in RouterOS firewall code!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tracer Log List */}
                  <div className="bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden p-6 space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Comprehensive Tracer Steps Log</p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto font-mono text-[11px] text-zinc-400">
                      {simulationLogs.map((log, i) => (
                        <div key={i} className="flex gap-2.5 border-b border-zinc-900 pb-1.5 leading-relaxed">
                          <span className="text-cyan-500 font-bold">[{i + 1}]</span>
                          <span>{log}</span>
                        </div>
                      ))}
                      {simulationLogs.length === 0 && (
                        <div className="text-zinc-600 italic">No traces run. Setup diagnostic packets on the left context.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE INTERFACES VIEW */}
          {activeTab === 'interfaces' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Active Interfaces List</h2>
                  <p className="text-xs text-zinc-400">Connected physical ethernet ports and default bridges for network communication.</p>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#12121a]/60 text-zinc-500 uppercase text-[10px] tracking-widest font-bold border-b border-zinc-900">
                    <tr>
                      <th className="px-6 py-4">Port Name</th>
                      <th className="px-6 py-4">Inbound Address</th>
                      <th className="px-6 py-4">Link Class</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Traffic In (RX)</th>
                      <th className="px-6 py-4">Traffic Out (TX)</th>
                      <th className="px-6 py-4">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {interfaces.map(intf => (
                      <tr key={intf.name} className="hover:bg-zinc-900/25 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-zinc-300">{intf.name}</td>
                        <td className="px-6 py-4 font-mono text-zinc-400">{intf.ipAddress}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-zinc-800 text-[10px] rounded text-zinc-400 uppercase tracking-widest">
                            {intf.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setInterfaces(prev => prev.map(item => 
                                item.name === intf.name 
                                  ? { ...item, status: item.status === 'up' ? 'down' : 'up' } 
                                  : item
                              ));
                              addLog('Interface Manager', `Toggled physical state port [${intf.name}]`, 'info');
                            }}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              intf.status === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${intf.status === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {intf.status}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{intf.status === 'up' ? intf.rxSpeed : '0 bps'}</td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{intf.status === 'up' ? intf.txSpeed : '0 bps'}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500 italic max-w-xs truncate">{intf.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IP ADDRESS CONFIG SECTOR */}
          {activeTab === 'ips' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Assigned Interfaces IP Addresses</h2>
                  <p className="text-xs text-zinc-400">List and define static subnet blocks of RouterOS. Assign IP/subnet bounds to interfaces.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual active list */}
                <div className="lg:col-span-2 bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden h-fit">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#12121a]/60 text-zinc-500 uppercase text-[10px] tracking-widest font-bold border-b border-zinc-900 border-none">
                      <tr>
                        <th className="px-6 py-4">IP Address Space</th>
                        <th className="px-6 py-4">Inferred Network</th>
                        <th className="px-6 py-4">Hardware Port</th>
                        <th className="px-6 py-4">Reference Context</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 font-mono text-xs">
                      {ips.map(ip => (
                        <tr key={ip.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4 text-cyan-400 font-bold">{ip.address}</td>
                          <td className="px-6 py-4 text-zinc-500">{ip.network}</td>
                          <td className="px-6 py-4 text-zinc-300 font-bold">{ip.interface}</td>
                          <td className="px-6 py-4 text-zinc-500 text-xs italic">{ip.comment || 'Custom'}</td>
                          <td className="px-6 py-4 text-right">
                            {ips.length > 1 && (
                              <button 
                                onClick={() => deleteIp(ip.id)}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Addition Form panel */}
                <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2">Assign IP Address CIDR</p>
                  
                  <form onSubmit={addManualIp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Router Address (CIDR format)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 192.168.100.1/24"
                        value={addIpForm.address}
                        onChange={(e) => setAddIpForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Interface Link</label>
                      <select 
                        value={addIpForm.interface}
                        onChange={(e) => setAddIpForm(p => ({ ...p, interface: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none"
                      >
                        {interfaces.map(intf => <option key={intf.name} value={intf.name}>{intf.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description / Label</label>
                      <input 
                        type="text" 
                        placeholder="e.g., VLAN block"
                        value={addIpForm.comment}
                        onChange={(e) => setAddIpForm(p => ({ ...p, comment: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 transition-all"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Apply IP registration
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* FIREWALL NAT SPACE */}
          {activeTab === 'nat' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">IP Firewall Source / Destination NAT Rules</h2>
                  <p className="text-xs text-zinc-400">Map internal private subnets to external internet public gateways (masquerade/dst-nat).</p>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#12121a]/60 text-zinc-500 uppercase text-[10px] tracking-widest font-bold border-b border-zinc-900">
                    <tr>
                      <th className="px-6 py-4">Chain Class</th>
                      <th className="px-6 py-4">Inbound interface</th>
                      <th className="px-6 py-4">Outbound Gateway</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Description Context</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                    {natRules.map(n => (
                      <tr key={n.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="px-6 py-4 text-yellow-500 font-bold">{n.chain}</td>
                        <td className="px-6 py-4 text-zinc-400">{n.inInterface || 'any'}</td>
                        <td className="px-6 py-4 text-zinc-400">{n.outInterface || 'any'}</td>
                        <td className="px-6 py-4 text-cyan-400 font-semibold">{n.action}</td>
                        <td className="px-6 py-4 text-zinc-500 text-xs italic">{n.comment || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteNat(n.id)}
                            className="text-zinc-650 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {natRules.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-zinc-500 text-center italic">
                          No NAT forwarding rules defined. Internal subnets will be unable to reach public IPs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FIREWALL FILTER VIEW */}
          {activeTab === 'filters' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">IP Firewall filter chains (Secure / Isolate)</h2>
                  <p className="text-xs text-zinc-400">Strict safety rules handling incoming packets (Input) or routed subnets frames (Forward).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0a0a0f] border border-[#141422] rounded-2xl overflow-hidden h-fit">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#12121a]/60 text-zinc-500 uppercase text-[10px] tracking-widest font-bold border-b border-zinc-900">
                      <tr>
                        <th className="px-6 py-4">Filter Chain</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Protocol Limit</th>
                        <th className="px-6 py-4">Source/Destination Limit</th>
                        <th className="px-6 py-4">Rule Notes</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950 font-mono text-xs">
                      {filterRules.map(f => (
                        <tr key={f.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4 text-purple-400 font-bold">{f.chain}</td>
                          <td className="px-6 py-4">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                              f.action === 'accept' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {f.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{f.protocol || 'any'}</td>
                          <td className="px-6 py-4 text-zinc-500 text-xs">
                            {f.srcAddress ? `Src: ${f.srcAddress} ` : ''}
                            {f.dstAddress ? `Dst: ${f.dstAddress} ` : ''}
                            {f.dstPort ? `Port: ${f.dstPort}` : ''}
                            {!f.srcAddress && !f.dstAddress && !f.dstPort ? 'unbounded' : ''}
                          </td>
                          <td className="px-6 py-4 text-zinc-500 text-xs italic">{f.comment || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteFilter(f.id)}
                              className="text-zinc-650 hover:text-red-400 transition-colors hover:scale-105"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Filter Quick Addition */}
                <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2">Manual Firewall Filter Rule</p>
                  
                  <form onSubmit={addManualFilter} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">RouterOS Chain</label>
                      <select 
                        value={addFilterForm.chain}
                        onChange={(e) => setAddFilterForm(p => ({ ...p, chain: e.target.value as any }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300"
                      >
                        <option value="forward">forward (routed subnets)</option>
                        <option value="input">input (router service safety)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action Outcome</label>
                      <select 
                        value={addFilterForm.action}
                        onChange={(e) => setAddFilterForm(p => ({ ...p, action: e.target.value as any }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300"
                      >
                        <option value="drop">drop (discard silently)</option>
                        <option value="accept">accept (permit transmission)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol restriction</label>
                      <select 
                        value={addFilterForm.protocol}
                        onChange={(e) => setAddFilterForm(p => ({ ...p, protocol: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300"
                      >
                        <option value="any">any / unbounded</option>
                        <option value="icmp">icmp (ping utility)</option>
                        <option value="tcp">tcp (standard web)</option>
                        <option value="udp">udp (DNS routing)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                      <input 
                        type="text" 
                        placeholder="Why is this rule here?"
                        value={addFilterForm.comment || ''}
                        onChange={(e) => setAddFilterForm(p => ({ ...p, comment: e.target.value }))}
                        className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
                    >
                      Append filter statement
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">OpenClaw System Settings</h2>
                <p className="text-zinc-500 text-sm">Configure backend endpoints, local Ollama integration, or fallback cloud Gemini processing.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-[#0a0a0f] border border-[#141422] p-8 rounded-2xl space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Cpu size={18} className="text-cyan-400 animate-pulse" />
                      LLM AI Core selection for OpenClaw
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setProviderSettings(p => ({ ...p, provider: 'gemini' }))}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                          providerSettings.provider === 'gemini' 
                            ? 'bg-cyan-600/10 border-cyan-500' 
                            : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <Globe size={24} className="text-cyan-400 mb-4" />
                        <h4 className="font-bold text-sm mb-1 text-white">Gemini 3.5 Flash</h4>
                        <p className="text-[10px] text-zinc-500">Fast cloud-integrated parsing client. No setup required.</p>
                      </button>

                      <button 
                        onClick={() => setProviderSettings(p => ({ ...p, provider: 'ollama' }))}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                          providerSettings.provider === 'ollama' 
                            ? 'bg-cyan-600/10 border-cyan-500' 
                            : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <Server size={24} className="text-cyan-400 mb-4" />
                        <h4 className="font-bold text-sm mb-1 text-white">Ollama Local</h4>
                        <p className="text-[10px] text-zinc-500">Run completely local and host network commands securely offline.</p>
                      </button>
                    </div>
                  </div>

                  {providerSettings.provider === 'ollama' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 pt-6 border-t border-zinc-900"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ollama Endpoint URL</label>
                        <input 
                          type="text"
                          value={providerSettings.ollamaBaseUrl}
                          onChange={(e) => setProviderSettings(p => ({ ...p, ollamaBaseUrl: e.target.value }))}
                          className="w-full bg-zinc-905 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 font-mono"
                        />
                        <p className="text-[9px] text-zinc-600">Ensure Ollama service is configured with OLLAMA_ORIGINS="*" to bypass CORS blockers.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model Identifier</label>
                        <input 
                          type="text"
                          value={providerSettings.ollamaModel}
                          onChange={(e) => setProviderSettings(p => ({ ...p, ollamaModel: e.target.value }))}
                          className="w-full bg-zinc-905 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
        active 
          ? 'bg-[#12121d] text-cyan-400 border border-cyan-500/20' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#101017]/40'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[8px] bg-cyan-500/10 text-cyan-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
          {badge}
        </span>
      )}
    </button>
  );
}
