import React, { useState } from 'react';
import { Radio, Wifi, Shield, Server, RefreshCw, Plus, CheckCircle2, Copy } from 'lucide-react';
import { CAPsMANConfig, CAPDevice } from '../types';

export default function WirelessCAPsMAN() {
  const [config, setConfig] = useState<CAPsMANConfig>({
    enabled: true,
    interfaces: ['bridge-vlan'],
    ssidMain: 'Corp_Main_V10',
    ssidGuest: 'Guest_Free_V20',
    securityProfile: 'WPA3-Personal',
    country: 'germany',
    frequencyMode: 'regulatory-domain'
  });

  const [caps, setCaps] = useState<CAPDevice[]>([
    { id: '1', name: 'AP-Office-North', macAddress: '18:FD:74:2A:B1:99', ipAddress: '192.168.10.12', connectedClients: 14, status: 'connected', band: 'Dual' },
    { id: '2', name: 'AP-Warehouse-South', macAddress: '18:FD:74:2A:B5:12', ipAddress: '192.168.10.15', connectedClients: 8, status: 'connected', band: 'Dual' },
    { id: '3', name: 'AP-Reception-Desk', macAddress: '18:FD:74:2C:19:AA', ipAddress: '192.168.10.16', connectedClients: 21, status: 'connected', band: 'Dual' },
    { id: '4', name: 'AP-Remote-Storage-PtP', macAddress: 'E4:8D:8C:F5:66:34', ipAddress: '192.168.10.20', connectedClients: 3, status: 'connected', band: '2.4GHz' }
  ]);

  const [copied, setCopied] = useState(false);

  const generateCLI = () => {
    return `# Wave2 CAPsMAN Global Service Setup
/interface wifi capsman set enabled=yes interfaces=${config.interfaces.join(',')}

# Security Profiles Configuration
/interface wifi security add name=sec-main passphrase="SuperSecureMainPassphrase" authentication-types=wpa2-psk,wpa3-psk
/interface wifi security add name=sec-guest passphrase="WelcomeToOurOfficeGuest" authentication-types=wpa2-psk

# Datapath configuration with explicit VLAN tags
/interface wifi datapath add name=dp-main bridge=bridge-vlan vlan-id=10
/interface wifi datapath add name=dp-guest bridge=bridge-vlan vlan-id=20

# Configuration Profiles
/interface wifi configuration add name=cfg-main ssid="${config.ssidMain}" country="${config.country}" security=sec-main datapath=dp-main
/interface wifi configuration add name=cfg-guest ssid="${config.ssidGuest}" country="${config.country}" security=sec-guest datapath=dp-guest

# Provisioning Rules (2.4GHz and 5GHz auto-binding)
/interface wifi provisioning add action=create-dynamic-enabled master-configuration=cfg-main slave-configurations=cfg-guest supported-bands=2ghz-ax,2ghz-g,5ghz-ax,5ghz-a

# Configure local client interfaces to behave as CAPsMAN devices
/interface wifi cap set enabled=yes caps-man-addresses=192.168.88.1 interfaces=wifi1,wifi2 discovery-interfaces=bridge-vlan`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCLI());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSsidChange = (field: 'ssidMain' | 'ssidGuest', val: string) => {
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="text-cyan-400 w-5 h-5" />
            Wave2 CAPsMAN Wi-Fi Controller
          </h2>
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-900/30 px-2.5 py-1 rounded text-xs font-bold">
            <CheckCircle2 size={13} />
            Active Service (v7.13+)
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
          Configure central wireless access control via the Wave2 engine. This controller manages SSIDs, secure WPA3 auth templates, dynamic VLAN assignments (VLAN 10 for Core, VLAN 20 for Guest), and enforces ACL filters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Controller Configurations */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">SSID Profiles</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Corporate Main Wi-Fi (VLAN 10)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={config.ssidMain}
                    onChange={(e) => handleSsidChange('ssidMain', e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                  <Wifi size={14} className="absolute right-3.5 top-3 text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Guest Isolated Wi-Fi (VLAN 20)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={config.ssidGuest}
                    onChange={(e) => handleSsidChange('ssidGuest', e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Wifi size={14} className="absolute right-3.5 top-3 text-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Security Standard</label>
                  <select 
                    value={config.securityProfile} 
                    onChange={(e) => setConfig(prev => ({ ...prev, securityProfile: e.target.value }))}
                    className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="WPA3-Personal">WPA3 Personal (Strong)</option>
                    <option value="WPA2/WPA3-Mixed">WPA2/WPA3 Mixed</option>
                    <option value="WPA2-Enterprise">802.1X Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Country Domain</label>
                  <select 
                    value={config.country} 
                    onChange={(e) => setConfig(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-[#050508] border border-zinc-800 rounded-xl p-2 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="germany">Germany</option>
                    <option value="united states">United States</option>
                    <option value="united kingdom">United Kingdom</option>
                    <option value="latvia">Latvia (MikroTik HQ)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Point-to-Point Backhaul Link Details */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">PtP Wireless Backplane</h3>
            <div className="text-[11px] text-zinc-400 space-y-2">
              <p>
                The <strong>5 GHz frequency band</strong> is locked exclusively for the high-throughput point-to-point wireless bridge link.
              </p>
              <p>
                Simultaneously, the <strong>2.4 GHz radio spectrum</strong> operates as the secondary interface, allowing the remote location to receive central CAPsMAN configurations.
              </p>
            </div>
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">5GHz Mode</span>
                <span className="text-xs font-mono font-bold text-cyan-400">Bridge Master</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">2.4GHz Mode</span>
                <span className="text-xs font-mono font-bold text-indigo-400">CAPsMAN client</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Active Managed CAPs & RouterOS CLI output */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Managed Access Points ({caps.length})</h3>
              <span className="text-[9px] text-zinc-500 font-mono">Status: Synced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-2">AP Name</th>
                    <th className="pb-2">MAC Address</th>
                    <th className="pb-2">Local IP</th>
                    <th className="pb-2">Bands</th>
                    <th className="pb-2 text-right">Active Clients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {caps.map((ap) => (
                    <tr key={ap.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        <Wifi size={12} className="text-emerald-400" />
                        {ap.name}
                      </td>
                      <td className="py-2.5 font-mono text-zinc-500">{ap.macAddress}</td>
                      <td className="py-2.5 font-mono text-zinc-400">{ap.ipAddress}</td>
                      <td className="py-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {ap.band}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-400 font-bold">{ap.connectedClients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RouterOS Generated Command Output */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Wave2 CAPsMAN CLI Provisioning Script</span>
              <button 
                onClick={handleCopy}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied to Clipboard!' : 'Copy Script'}
              </button>
            </div>
            <pre className="p-4 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-[220px] border border-zinc-900 select-all leading-relaxed">
              {generateCLI()}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
