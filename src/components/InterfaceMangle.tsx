import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, ShieldAlert, Cpu, Network, Clock, Save, Copy, Terminal } from 'lucide-react';
import { RoMONConfig, InterfaceList } from '../types';

export default function InterfaceMangle() {
  const [romon, setRomon] = useState<RoMONConfig>({
    enabled: true,
    secret: 'SecureRoMONSecretPhrase',
    id: '18:FD:74:2A:B1:00'
  });

  const [ltePassthrough, setLtePassthrough] = useState<boolean>(true);
  const [timezone, setTimezone] = useState<string>('Europe/Berlin');
  const [identity, setIdentity] = useState<string>('R1-Core-Gateway');

  const [interfaceLists] = useState<InterfaceList[]>([
    { name: 'WAN', members: ['lte1'] },
    { name: 'LAN', members: ['vlan10-main', 'vlan20-guest'] },
    { name: 'CAPSMAN-ACL', members: ['ether2', 'ether3', 'ether4'] }
  ]);

  const [wifiLogs, setWifiLogs] = useState<string[]>([
    'wifi,debug: wifi1: scanning for clients...',
    'wifi,info: wifi1: client 18:FD:74:2A:B1:99 registered',
    'wifi,debug: wifi2: dynamic datapath bridge configured successfully',
    'wifi,info: wifi1: client 4C:32:75:AF:09:E1 requested static lease lookup...'
  ]);

  const [copied, setCopied] = useState<boolean>(false);

  // Periodically add dummy log entries to keep Wi-Fi debug stream lively
  useEffect(() => {
    const events = [
      'wifi,debug: wifi1: channel 2412MHz (extension Channel: none), tx-power 20dBm',
      'wifi,info: wifi2: client FC:77:96:20:AA:D4 assigned dynamic datapath VLAN 10',
      'wifi,debug: wifi1: RSSI handoff trace activated for weak station',
      'wifi,info: wifi2: client 18:FD:74:2C:19:AA connection refreshed via CAPsMAN'
    ];

    const interval = setInterval(() => {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setWifiLogs(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ${randomEvent}`]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateCLI = () => {
    return `# MikroTik System Identity Configuration
/system identity set name="${identity}"

# System Clock & Time zone setup
/system clock set time-zone-name="${timezone}"

# RoMON (Router Management Overlay Network) configuration
/tool romon set enabled=${romon.enabled ? 'yes' : 'no'} secrets="${romon.secret}"

# Interface List definitions for firewall boundaries
/interface list add name=WAN
/interface list add name=LAN
/interface list add name=CAPSMAN-ACL

/interface list member add interface=lte1 list=WAN
/interface list member add interface=vlan10-main list=LAN
/interface list member add interface=vlan20-guest list=LAN

# LTE Interface and Pass-through APN Profile Setup
/interface lte apn add name=lte-passthrough apn=internet.telecom passthrough-interface=ether1 passthrough-mac=auto ip-type=ipv4-ipv6 use-peer-dns=yes
/interface lte set [ find default-name=lte1 ] apn-profiles=lte-passthrough

# Wi-Fi Logging Activation
/system logging add topics=wifi,debug action=memory prefix="Wi-Fi"`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCLI());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="text-cyan-400 w-5 h-5" />
            System Settings & Interface Grouping
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Administer hardware-level interfaces and configurations. Toggle RoMON layer-2 neighbors discovery, manage security interface lists, fine-tune LTE APN pass-through parameters, and inspect Wi-Fi controller active event logs.
          </p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/25 px-4 py-2 rounded-xl shrink-0 flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950/40 text-cyan-400 font-extrabold text-xs rounded border border-cyan-850">
            L2 & L3
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">OSI Layers</div>
            <div className="text-[9px] text-cyan-400 font-mono mt-0.5">Data Link & Network</div>
          </div>
        </div>
      </div>

      {/* OSI Model Mapping Educational Banner */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-4 rounded-xl flex items-start gap-3">
        <span className="text-cyan-400 font-bold shrink-0 text-xs mt-0.5">ℹ️</span>
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-bold text-white">OSI Model Alignment:</span> Router Management Overlay Network (RoMON) is a proprietary MikroTik protocol operating completely at <span className="text-cyan-300 font-semibold">Layer 2 (Data Link)</span>, allowing full management of local routers via MAC addresses even without Layer 3 IP connectivity. System clock times and interface list groupings help coordinate policy routing at <span className="text-cyan-300 font-semibold">Layer 3 (Network)</span>.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left: Toggles & Inputs */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Hardware-Level Protocols</h3>

            {/* LTE Pass-through */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">LTE1 Uplink Pass-through</span>
                <span className="text-[10px] text-zinc-500">Exposes WAN IP directly to Ether1 bridge</span>
              </div>
              <button 
                onClick={() => setLtePassthrough(!ltePassthrough)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {ltePassthrough ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-600" />}
              </button>
            </div>

            {/* RoMON */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/60">
              <div>
                <span className="text-xs font-bold text-white block">RoMON Neighbor Discovery</span>
                <span className="text-[10px] text-zinc-500">Enables secure layer-2 tunnel management</span>
              </div>
              <button 
                onClick={() => setRomon(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {romon.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-600" />}
              </button>
            </div>

            {romon.enabled && (
              <div className="p-3.5 bg-[#050508] border border-zinc-850 rounded-xl space-y-2 text-xs">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">RoMON Secret Password</label>
                  <input 
                    type="password" 
                    value={romon.secret}
                    onChange={(e) => setRomon(prev => ({ ...prev, secret: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-cyan-400 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">RoMON System ID</span>
                  <span className="text-[11px] font-mono text-zinc-400">{romon.id}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Global Identifiers</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Router Identity (Hostname)</label>
                <input 
                  type="text" 
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Time Zone (UTC offset)</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="UTC">UTC / Coordinated Time</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interface List Membership & Wi-Fi Debug stream */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Boundary Interface Lists</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {interfaceLists.map((list, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{list.name}</span>
                  <div className="space-y-1">
                    {list.members.map((member, mIdx) => (
                      <span key={mIdx} className="block text-[11px] text-zinc-400 font-mono bg-zinc-900/60 p-1 px-1.5 rounded border border-zinc-850">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wi-Fi Debug Log Stream */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-yellow-500" />
                Live Wi-Fi Debug Event Logs
              </h3>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            </div>

            <div className="p-4 bg-black border border-zinc-900 rounded-xl font-mono text-[10px] text-yellow-500/90 h-[120px] overflow-y-auto space-y-1 scrollbar-thin select-all">
              {wifiLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">{log}</div>
              ))}
            </div>
          </div>

          {/* CLI code output */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">RouterOS System & Mangle Script</span>
              <button 
                onClick={handleCopy}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied CLI Script!' : 'Copy Script'}
              </button>
            </div>
            <pre className="p-4 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-zinc-900 max-h-[140px] select-all leading-relaxed">
              {generateCLI()}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
