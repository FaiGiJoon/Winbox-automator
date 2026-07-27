import React, { useState } from 'react';
import { Server, Users, UserPlus, Trash2, Key, Copy, CheckCircle, Info } from 'lucide-react';
import { DHCPLease } from '../types';

export default function DHCPServer() {
  const [leases, setLeases] = useState<DHCPLease[]>(([
    { id: '1', hostname: 'Main-Office-Server', macAddress: '00:1A:2B:3C:4D:5E', ipAddress: '192.168.10.10', comment: 'Static lease: File server', active: true },
    { id: '2', hostname: 'Admin-iPad', macAddress: '4C:32:75:AF:09:E1', ipAddress: '192.168.10.45', comment: 'Static lease: Executive iPad', active: true },
    { id: '3', hostname: 'Printer-Main', macAddress: 'FC:77:96:20:AA:D4', ipAddress: '192.168.10.25', comment: 'Static lease: Office jet printer', active: true },
    { id: '4', hostname: 'Guest-Phone-Android', macAddress: 'BC:F5:AC:32:E1:90', ipAddress: '192.168.20.144', comment: 'Dynamic DHCP allocation', active: true }
  ]));

  const [form, setForm] = useState({
    hostname: '',
    macAddress: '',
    ipAddress: '192.168.10.',
    comment: ''
  });

  const [copied, setCopied] = useState(false);

  const handleAddLease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostname || !form.macAddress || !form.ipAddress) return;

    // Ensure comment has static-related prefix/suffix if empty, or enforce a standard comment
    const rawComment = form.comment.trim();
    const finalComment = rawComment
      ? (rawComment.toLowerCase().includes('static') ? rawComment : `Static lease: ${rawComment}`)
      : 'Static lease: Custom reservation';

    const newLease: DHCPLease = {
      id: Date.now().toString(),
      hostname: form.hostname,
      macAddress: form.macAddress.toUpperCase(),
      ipAddress: form.ipAddress,
      comment: finalComment,
      active: true
    };

    setLeases(prev => [...prev, newLease]);
    setForm({ hostname: '', macAddress: '', ipAddress: '192.168.10.', comment: '' });
  };

  const handleDeleteLease = (id: string) => {
    setLeases(prev => prev.filter(l => l.id !== id));
  };

  const generateCLI = () => {
    let script = `# DHCP Servers for subnets (VLAN 10 Corporate & VLAN 20 Guest)
/ip dhcp-server pool add name=pool-vlan10 ranges=192.168.10.100-192.168.10.200
/ip dhcp-server pool add name=pool-vlan20 ranges=192.168.20.100-192.168.20.200

/ip dhcp-server add name=dhcp-main address-pool=pool-vlan10 interface=vlan10-main lease-time=8h disabled=no
/ip dhcp-server add name=dhcp-guest address-pool=pool-vlan20 interface=vlan20-guest lease-time=1h disabled=no

# Subnet networks broadcast settings (DNS targets local Core gateway R1)
/ip dhcp-server network add address=192.168.10.0/24 gateway=192.168.10.1 dns-server=192.168.10.1 comment="Corporate VLAN Network"
/ip dhcp-server network add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=192.168.20.1 comment="Guest Network Domain"

# Static IP Reservations (Static Leases Table)\n`;

    leases.forEach(lease => {
      if (lease.comment && lease.comment.toLowerCase().includes('static')) {
        script += `/ip dhcp-server lease add mac-address=${lease.macAddress} address=${lease.ipAddress} client-id=${lease.hostname} comment="${lease.comment}"\n`;
      }
    });

    return script;
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
            <Server className="text-cyan-400 w-5 h-5" />
            DHCP Server & Static Address Leases
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Configure central dynamic address assignment for VLAN 10 (Main) and VLAN 20 (Guest) subnets. Add custom MAC-to-IP reservations below to guarantee persistent IP addressing for local printers, file servers, and key machines.
          </p>
        </div>

        {/* Educational OSI Mapping Badge */}
        <div className="bg-cyan-500/10 border border-cyan-500/25 px-4 py-2 rounded-xl shrink-0 flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950/40 text-cyan-400 font-extrabold text-xs rounded border border-cyan-850">
            L3 & L7
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">OSI Layers</div>
            <div className="text-[9px] text-cyan-400 font-mono mt-0.5">Network & Application</div>
          </div>
        </div>
      </div>

      {/* OSI Model Mapping Educational Banner */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-4 rounded-xl flex items-start gap-3">
        <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-bold text-white">OSI Model Alignment:</span> DHCP relies on <span className="text-cyan-300 font-semibold">Layer 7 (Application)</span> queries encapsulated in <span className="text-cyan-300 font-semibold">Layer 4 (UDP)</span> datagrams on ports 67/68 to assign <span className="text-cyan-300 font-semibold">Layer 3 (Network) IP configurations</span> (addresses, subnet masks, gateways) and DNS servers, matching them uniquely to client <span className="text-cyan-300 font-semibold">Layer 2 (Data Link) MAC addresses</span>.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side: Leases and Allocations */}
        <div className="xl:col-span-8 bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-cyan-400" />
              Active DHCP Address Lease Table ({leases.length})
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">Gateway IP: 192.168.10.1 / 192.168.20.1</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                  <th className="pb-2">Hostname</th>
                  <th className="pb-2">MAC Address</th>
                  <th className="pb-2">Assigned IP Address</th>
                  <th className="pb-2">PVID/VLAN Group</th>
                  <th className="pb-2">Description / Comment</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30">
                {leases.map((lease) => {
                  const isStatic = lease.comment?.toLowerCase().includes('static');
                  return (
                    <tr key={lease.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="py-3 font-bold text-white">{lease.hostname}</td>
                      <td className="py-3 font-mono text-zinc-500 uppercase">{lease.macAddress}</td>
                      <td className="py-3 font-mono text-cyan-400">{lease.ipAddress}</td>
                      <td className="py-3">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          lease.ipAddress.startsWith('192.168.10')
                            ? 'bg-emerald-500/10 border border-emerald-900/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-900/30 text-amber-500'
                        }`}>
                          {lease.ipAddress.startsWith('192.168.10') ? 'VLAN 10' : 'VLAN 20'}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400 italic text-[11px]">{lease.comment}</td>
                      <td className="py-3 text-right">
                        {isStatic && (
                          <button
                            onClick={() => handleDeleteLease(lease.id)}
                            className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                            title="Delete Static Lease"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Static Reservation Form & CLI output */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Static Reservation Form */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
              <UserPlus size={14} className="text-cyan-400" />
              Add DHCP Static Lease
            </h3>

            <form onSubmit={handleAddLease} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 tracking-wider font-bold block mb-1 uppercase">Hostname</label>
                <input 
                  type="text" 
                  value={form.hostname}
                  onChange={(e) => setForm(prev => ({ ...prev, hostname: e.target.value }))}
                  placeholder="e.g. NAS-Storage-Racks"
                  className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 tracking-wider font-bold block mb-1 uppercase">MAC Address</label>
                <input 
                  type="text" 
                  value={form.macAddress}
                  onChange={(e) => setForm(prev => ({ ...prev, macAddress: e.target.value }))}
                  placeholder="e.g. 00:11:22:33:44:55"
                  className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 tracking-wider font-bold block mb-1 uppercase">IP Address Reservation</label>
                <input 
                  type="text" 
                  value={form.ipAddress}
                  onChange={(e) => setForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="e.g. 192.168.10.100"
                  className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 tracking-wider font-bold block mb-1 uppercase">Description</label>
                <input 
                  type="text" 
                  value={form.comment}
                  onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Static lease: Primary NAS storage"
                  className="w-full bg-[#050508] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 rounded-xl transition-colors shadow-lg shadow-cyan-900/20 cursor-pointer"
              >
                Create Static Reservation
              </button>
            </form>
          </div>

          {/* RouterOS Generated CLI Command Output */}
          <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">RouterOS DHCP Provisioning CLI</span>
              <button 
                onClick={handleCopy}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied CLI!' : 'Copy Script'}
              </button>
            </div>
            <pre className="p-3 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-[140px] border border-zinc-900 select-all leading-relaxed">
              {generateCLI()}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
}
