import React, { useState } from 'react';
import { Shield, Key, Plus, RefreshCw, UserCheck, Server, ArrowRightLeft, Copy, CheckCircle } from 'lucide-react';
import { WireGuardTunnel, WireGuardPeer } from '../types';

export default function WireGuardVPN() {
  const [tunnels, setTunnels] = useState<WireGuardTunnel[]>([
    {
      id: 'rw1',
      name: 'wg-road-warrior',
      listenPort: 13231,
      privateKey: 'eL9+WG1...[Hidden]',
      publicKey: '8X+fD2gB9zP3Kz1GvR5xY9M8Q2vN1m4pA7b9cX5d3e0=',
      type: 'road-warrior',
      status: 'active',
      rxBytes: '124.5 MiB',
      txBytes: '842.1 MiB'
    },
    {
      id: 's2s1',
      name: 'wg-site-to-site',
      listenPort: 13232,
      privateKey: 'aK3+PQ9...[Hidden]',
      publicKey: 'mX9pX3fV1gK9lP5zN8yW2q3vX4b7n9m1p0qR2sT4uE8=',
      type: 'site-to-site',
      status: 'active',
      rxBytes: '1.2 GiB',
      txBytes: '1.8 GiB'
    }
  ]);

  const [peers, setPeers] = useState<WireGuardPeer[]>([
    { id: 'p1', tunnelId: 'rw1', name: 'Admin-Laptop-External', allowedIps: '10.50.0.2/32', handshakeTime: '2 mins ago', transferRx: '42.1 MiB', transferTx: '18.4 MiB' },
    { id: 'p2', tunnelId: 'rw1', name: 'Engineering-Phone', allowedIps: '10.50.0.3/32', handshakeTime: '15 mins ago', transferRx: '12.4 MiB', transferTx: '8.2 MiB' },
    { id: 'p3', tunnelId: 's2s1', name: 'Branch-Berlin-Gateway', allowedIps: '192.168.200.0/24', endpoint: '88.198.24.110:13232', handshakeTime: '12 secs ago', transferRx: '1.2 GiB', transferTx: '1.8 GiB' }
  ]);

  const [activeTunnel, setActiveTunnel] = useState<string>('rw1');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const generateCLI = (tunnelId: string) => {
    if (tunnelId === 'rw1') {
      return `# WireGuard Road Warrior Configuration (Server R1)
/interface wireguard add listen-port=13231 name=wg-road-warrior comment="Road Warrior Mobile Client Access"

# Server IP assignment inside WireGuard interface subnet
/ip address add address=10.50.0.1/24 interface=wg-road-warrior network=10.50.0.0

# Peers (Remote Mobile Clients)
/interface wireguard peers add allowed-address=10.50.0.2/32 interface=wg-road-warrior public-key="9B+fX3g...ClientLaptopKey" comment="Admin-Laptop-External"
/interface wireguard peers add allowed-address=10.50.0.3/32 interface=wg-road-warrior public-key="2C+vX9k...ClientPhoneKey" comment="Engineering-Phone"

# Firewall Filter to permit WireGuard port traffic
/ip firewall filter add chain=input action=accept protocol=udp dst-port=13231 comment="Allow WireGuard Road Warrior Handshake"`;
    } else {
      return `# WireGuard Site-to-Site Configuration (Server R1 to Branch Berlin)
/interface wireguard add listen-port=13232 name=wg-site-to-site comment="Static Office to Office Link"

# Endpoint IP binding
/ip address add address=10.90.0.1/30 interface=wg-site-to-site network=10.90.0.0

# Static Peer (Berlin Gateway)
/interface wireguard peers add allowed-address=192.168.200.0/24,10.90.0.2/32 endpoint-address=88.198.24.110 endpoint-port=13232 interface=wg-site-to-site public-key="mX9pX3f...BerlinGatewayKey" persistent-keepalive=25s comment="Branch-Berlin-Gateway"

# Static Route to reach Berlin Subnet via WireGuard gateway interface
/ip route add dst-address=192.168.200.0/24 gateway=wg-site-to-site`;
    }
  };

  const handleCopy = (id: string, cli: string) => {
    navigator.clipboard.writeText(cli);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Shield className="text-cyan-400 w-5 h-5" />
          WireGuard VPN Server Endpoint
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
          Manage secure Virtual Private Network tunnels. Configured with a Road Warrior interface for remote client connections (using high efficiency handshakes) and a robust Site-to-Site tunnel connecting your physical Berlin branch office.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side: Tunnel Interfaces */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">Active VPN Tunnels</h3>
            
            <div className="space-y-3">
              {tunnels.map((tunnel) => (
                <div 
                  key={tunnel.id}
                  onClick={() => setActiveTunnel(tunnel.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    activeTunnel === tunnel.id 
                      ? 'border-cyan-500 bg-cyan-950/15 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                      : 'border-zinc-850 bg-[#0f0f15]/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Key size={12} className={tunnel.type === 'site-to-site' ? 'text-indigo-400' : 'text-cyan-400'} />
                      {tunnel.name}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-900/30">
                      {tunnel.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-zinc-500 font-mono">
                    <div>
                      <span className="block text-[8px] text-zinc-600 uppercase font-bold">Port</span>
                      <span className="text-zinc-300">{tunnel.listenPort}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-zinc-600 uppercase font-bold">Inbound</span>
                      <span className="text-zinc-300">{tunnel.rxBytes}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-zinc-600 uppercase font-bold">Outbound</span>
                      <span className="text-zinc-300">{tunnel.txBytes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-2">WireGuard Handshake Protocol</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              WireGuard uses direct UDP framing for zero-overhead performance. Handshakes refresh securely in the background every 2 minutes. Peer authorization is handled entirely via secure asymmetric Cryptokey routing tables.
            </p>
          </div>
        </div>

        {/* Right Side: Peers & Generated CLI RouterOS Script */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Authorized Peers ({peers.filter(p => p.tunnelId === activeTunnel).length})</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-2">Peer Name</th>
                    <th className="pb-2">Allowed Subnets</th>
                    {activeTunnel === 's2s1' && <th className="pb-2">Physical Endpoint</th>}
                    <th className="pb-2">Last Handshake</th>
                    <th className="pb-2 text-right">Traffic (Rx/Tx)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/30">
                  {peers.filter(p => p.tunnelId === activeTunnel).map((peer) => (
                    <tr key={peer.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        {peer.endpoint ? <ArrowRightLeft size={12} className="text-indigo-400" /> : <UserCheck size={12} className="text-cyan-400" />}
                        {peer.name}
                      </td>
                      <td className="py-2.5 font-mono text-zinc-400">{peer.allowedIps}</td>
                      {activeTunnel === 's2s1' && <td className="py-2.5 font-mono text-zinc-500">{peer.endpoint || 'Dynamic'}</td>}
                      <td className="py-2.5 text-zinc-500 font-medium">{peer.handshakeTime || 'Never'}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-400 text-[11px]">{peer.transferRx} / {peer.transferTx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RouterOS Generated Command Output */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Generated VPN Routing CLI Script</span>
              <button 
                onClick={() => handleCopy(activeTunnel, generateCLI(activeTunnel))}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Copy size={12} />
                {copiedIndex === activeTunnel ? 'Copied CLI Commands!' : 'Copy Script'}
              </button>
            </div>
            <pre className="p-4 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-[220px] border border-zinc-900 select-all leading-relaxed">
              {generateCLI(activeTunnel)}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
