import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Network, Globe, Router, Cpu, Radio, ShieldAlert, Laptop, ArrowRight, Server, Info, Terminal, Copy } from 'lucide-react';

interface TopologyNode {
  id: string;
  label: string;
  type: 'isp' | 'router' | 'switch' | 'ap' | 'client' | 'bridge';
  ipAddress?: string;
  details: string;
  cliCommand: string;
  status: 'online' | 'offline' | 'bridge';
}

export default function NetworkTopology() {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<boolean>(false);

  const nodes: TopologyNode[] = [
    {
      id: 'lte1',
      label: 'LTE1 WAN Uplink',
      type: 'isp',
      ipAddress: 'Pass-through Mode',
      details: 'LTE interface configured in pass-through mode, handing off the public IP address directly to the main firewall interface without double-NAT latency.',
      cliCommand: '/interface lte apn add apn=internet.telecom passthrough-interface=ether1 passthrough-mac=auto\n/interface lte set [ find default-name=lte1 ] apn-profiles=internet.telecom',
      status: 'online'
    },
    {
      id: 'r1',
      label: 'Core Router (R1)',
      type: 'router',
      ipAddress: '192.168.88.1',
      details: 'MikroTik CCR2004 gateway hosting main routing tables, firewall filters, DHCP servers, Wave2 CAPsMAN controller, WireGuard VPN endpoints, and RoMON services.',
      cliCommand: '/system identity set name=R1-Core-Gateway\n/tool romon set enabled=yes\n/system clock set time-zone-name=Europe/Berlin',
      status: 'online'
    },
    {
      id: 'ptp-ap',
      label: '5GHz PTP Bridge (Local)',
      type: 'bridge',
      ipAddress: '192.168.88.10',
      details: '5 GHz high-speed wireless PtP Master bridge configured on high gain antennas, using the 2.4 GHz channel independently for auxiliary CAPsMAN client provisioning.',
      cliCommand: '/interface wireless set [ find default-name=wlan2 ] band=5ghz-a/n/ac mode=bridge ssid=PtP-Link-Backhaul\n/interface wireless set [ find default-name=wlan1 ] band=2ghz-b/g/n mode=station-bridge',
      status: 'online'
    },
    {
      id: 'ptp-station',
      label: '5GHz PTP Station (Remote)',
      type: 'bridge',
      ipAddress: '192.168.88.11',
      details: 'Remote endpoint client node in the 5GHz PtP bridge, completing the layer-2 wireless transparent link.',
      cliCommand: '/interface wireless set [ find default-name=wlan2 ] band=5ghz-a/n/ac mode=station-bridge ssid=PtP-Link-Backhaul',
      status: 'online'
    },
    {
      id: 'capsman-ap',
      label: 'Wave2 CAP AP',
      type: 'ap',
      ipAddress: 'Managed via CAPsMAN',
      details: 'Wave2 managed Access Point. Deploys dynamic high-throughput radios. Automatically broadcasts Main Wi-Fi (VLAN 10) and Guest isolated network (VLAN 20).',
      cliCommand: '/interface wifi cap set enabled=yes caps-man-addresses=192.168.88.1 interfaces=wifi1,wifi2 discovery-interfaces=bridge-vlan',
      status: 'online'
    },
    {
      id: 'vlan10',
      label: 'Main VLAN 10 Subnet',
      type: 'client',
      ipAddress: '192.168.10.0/24',
      details: 'Secure internal corporate network. Spanning tree RSTP/MSTP active. Direct access to secure services, NAS, and authorized servers.',
      cliCommand: '/interface vlan add interface=bridge-vlan name=vlan10-main vlan-id=10\n/ip address add address=192.168.10.1/24 interface=vlan10-main network=192.168.10.0',
      status: 'online'
    },
    {
      id: 'vlan20',
      label: 'Guest VLAN 20 Subnet',
      type: 'client',
      ipAddress: '192.168.20.0/24',
      details: 'Isolated network domain for guests and IoT devices. Strict firewall filter blocks transit to the Main VLAN 10 or local WinBox control ports.',
      cliCommand: '/interface vlan add interface=bridge-vlan name=vlan20-guest vlan-id=20\n/ip address add address=192.168.20.1/24 interface=vlan20-guest network=192.168.20.0',
      status: 'online'
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(true);
    setTimeout(() => setCopiedIndex(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="text-cyan-400 w-5 h-5" />
            Active Topology & Deployment Plan
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Interactive mapping of your physical hardware layout and Layer-2/Layer-3 boundaries. Click on any network node to inspect its operational properties, interface statuses, and copy-pasteable RouterOS commands.
          </p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/25 px-4 py-2 rounded-xl shrink-0 flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950/40 text-cyan-400 font-extrabold text-xs rounded border border-cyan-850">
            L1, L2 & L3
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">OSI Layers</div>
            <div className="text-[9px] text-cyan-400 font-mono mt-0.5">Physical, Data Link & Network</div>
          </div>
        </div>
      </div>

      {/* OSI Model Mapping Educational Banner */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-4 rounded-xl flex items-start gap-3">
        <span className="text-cyan-400 font-bold shrink-0 text-xs mt-0.5">ℹ️</span>
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-bold text-white">OSI Model Alignment:</span> The network topology visualizes <span className="text-cyan-300 font-semibold">Layer 1 (Physical)</span> WAN links, <span className="text-cyan-300 font-semibold">Layer 2 (Data Link)</span> bridge trunks, STP status, and wireless backhaul paths, and maps them to <span className="text-cyan-300 font-semibold">Layer 3 (Network)</span> VLAN subnets (192.168.10.0/24 & 192.168.20.0/24) and router gateways.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Interactive Visual Canvas */}
        <div className="xl:col-span-8 bg-[#0a0a0f] border border-[#141422] p-8 rounded-2xl min-h-[500px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Dynamic Packet Trace Flow Active</span>
          </div>

          <div className="my-auto py-8">
            <div className="flex flex-col items-center gap-8">
              
              {/* Row 1: LTE WAN Uplink */}
              <div className="flex justify-center w-full">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNode(nodes[0])}
                  className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center w-48 text-center transition-all ${
                    selectedNode?.id === 'lte1' ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-zinc-700'
                  }`}
                >
                  <Globe className="text-cyan-400 w-8 h-8 mb-2" />
                  <span className="text-xs font-bold text-white block">LTE1 WAN</span>
                  <span className="text-[9px] text-emerald-400 font-mono mt-0.5 px-1.5 py-0.5 bg-emerald-950/40 rounded border border-emerald-900/30">LTE Pass-through</span>
                </motion.div>
              </div>

              {/* Vertical link line */}
              <div className="h-6 w-0.5 bg-gradient-to-b from-cyan-500 to-indigo-500" />

              {/* Row 2: R1 Core Router */}
              <div className="flex justify-center w-full">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNode(nodes[1])}
                  className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center w-52 text-center transition-all ${
                    selectedNode?.id === 'r1' ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-indigo-900'
                  }`}
                >
                  <Router className="text-indigo-400 w-9 h-9 mb-2" />
                  <span className="text-xs font-bold text-white block">Core R1 Gateway</span>
                  <span className="text-[9px] text-indigo-300 font-mono mt-1">192.168.88.1</span>
                  <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider mt-1.5">CAPsMAN Master</span>
                </motion.div>
              </div>

              {/* Branch lines */}
              <div className="w-4/5 h-0.5 bg-gradient-to-r from-zinc-800 via-indigo-500 to-zinc-800 relative">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0.5 h-6 bg-indigo-500" />
              </div>

              {/* Row 3: Subnets & Bridges */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 w-full">
                
                {/* PtP 5GHz link */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedNode(nodes[2])}
                  className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedNode?.id === 'ptp-ap' ? 'border-cyan-500 bg-cyan-950/20' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-zinc-700'
                  }`}
                >
                  <Radio className="text-cyan-400 w-7 h-7 mb-2" />
                  <span className="text-[11px] font-bold text-white block">PtP AP (5GHz)</span>
                  <span className="text-[8px] font-mono text-zinc-500">Bridge Master</span>
                </motion.div>

                {/* PtP Station */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedNode(nodes[3])}
                  className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedNode?.id === 'ptp-station' ? 'border-cyan-500 bg-cyan-950/20' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-zinc-700'
                  }`}
                >
                  <Radio className="text-zinc-400 w-7 h-7 mb-2" />
                  <span className="text-[11px] font-bold text-white block">PtP Station (Remote)</span>
                  <span className="text-[8px] font-mono text-zinc-500">transparent L2 bridge</span>
                </motion.div>

                {/* VLAN 10 Main */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedNode(nodes[5])}
                  className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedNode?.id === 'vlan10' ? 'border-emerald-500 bg-emerald-950/20' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-zinc-700'
                  }`}
                >
                  <Server className="text-emerald-400 w-7 h-7 mb-2" />
                  <span className="text-[11px] font-bold text-white block">VLAN 10 (Main)</span>
                  <span className="text-[8px] font-mono text-zinc-500">192.168.10.0/24</span>
                </motion.div>

                {/* VLAN 20 Guest */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedNode(nodes[6])}
                  className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    selectedNode?.id === 'vlan20' ? 'border-amber-500 bg-amber-950/20' : 'border-zinc-800 bg-[#0f0f15]/80 hover:border-zinc-700'
                  }`}
                >
                  <ShieldAlert className="text-amber-400 w-7 h-7 mb-2" />
                  <span className="text-[11px] font-bold text-white block">VLAN 20 (Guest)</span>
                  <span className="text-[8px] font-mono text-zinc-500">192.168.20.0/24</span>
                </motion.div>

              </div>

            </div>
          </div>

          <div className="bg-zinc-950/80 p-3.5 border border-zinc-850 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
            <Info size={14} className="text-cyan-400 shrink-0" />
            <span>Click any node in the topology layout to view localized diagnostic information and dynamic RouterOS syntax commands.</span>
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl h-full flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase bg-cyan-950/50 border border-cyan-850 px-2 py-0.5 rounded">Node Inspector</span>
                  <h3 className="text-white text-base font-bold mt-2 flex items-center gap-2">
                    {selectedNode.type === 'router' && <Router className="w-5 h-5 text-indigo-400" />}
                    {selectedNode.type === 'isp' && <Globe className="w-5 h-5 text-cyan-400" />}
                    {selectedNode.type === 'ap' && <Radio className="w-5 h-5 text-emerald-400" />}
                    {selectedNode.type === 'client' && <Laptop className="w-5 h-5 text-amber-400" />}
                    {selectedNode.label}
                  </h3>
                  {selectedNode.ipAddress && (
                    <span className="text-xs font-mono text-zinc-500 block mt-1">{selectedNode.ipAddress}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Functional Properties</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed bg-[#050508] p-3.5 border border-zinc-800 rounded-xl">
                    {selectedNode.details}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Terminal size={12} className="text-cyan-400" />
                      RouterOS Commands
                    </h4>
                    <button 
                      onClick={() => handleCopy(selectedNode.cliCommand)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedIndex ? 'Copied!' : 'Copy Script'}
                    </button>
                  </div>
                  <pre className="p-4 bg-black/95 text-cyan-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-zinc-900 max-h-[220px] select-all">
                    {selectedNode.cliCommand}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
                <Network size={40} className="text-zinc-700 animate-pulse" />
                <p className="text-xs max-w-xs">
                  Please select a topology node from the graphical layout to display active interfaces, configuration summaries, and provisioning commands.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
