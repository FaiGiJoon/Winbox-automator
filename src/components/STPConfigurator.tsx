import React, { useState } from 'react';
import { Network, Server, ToggleLeft, ShieldCheck, RefreshCw, Key, Plus, Copy } from 'lucide-react';
import { STPConfig } from '../types';

export default function STPConfigurator() {
  const [mstpConfig, setMstpConfig] = useState<STPConfig>({
    bridgeName: 'bridge-vlan',
    protocolMode: 'mstp',
    priority: 8192,
    pathCostMode: 'long',
    helloTime: 2,
    forwardDelay: 15,
    vlanMapping: 'vlan-ids=10,20'
  });

  const [rstpConfig, setRstpConfig] = useState<STPConfig>({
    bridgeName: 'bridge-non-vlan',
    protocolMode: 'rstp',
    priority: 32768,
    pathCostMode: 'short',
    helloTime: 2,
    forwardDelay: 15
  });

  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const generateCLI = (mode: 'rstp' | 'mstp') => {
    if (mode === 'mstp') {
      return `# MSTP (Multiple Spanning Tree Protocol) configuration for VLAN bridges
/interface bridge add name=${mstpConfig.bridgeName} protocol-mode=mstp priority=${mstpConfig.priority} path-cost-mode=${mstpConfig.pathCostMode} vlan-filtering=yes

# MSTP region settings and VLAN instance allocation maps
/interface bridge msti add bridge=${mstpConfig.bridgeName} identifier=1 vlan-ids=10
/interface bridge msti add bridge=${mstpConfig.bridgeName} identifier=2 vlan-ids=20

# Add access and trunk ports to the MSTP VLAN bridge
/interface bridge port add bridge=${mstpConfig.bridgeName} interface=ether2 pvids=10
/interface bridge port add bridge=${mstpConfig.bridgeName} interface=ether3 pvids=20
/interface bridge port add bridge=${mstpConfig.bridgeName} interface=ether4 pvids=1`;
    } else {
      return `# RSTP (Rapid Spanning Tree Protocol) configuration for non-VLAN trunk bridges
/interface bridge add name=${rstpConfig.bridgeName} protocol-mode=rstp priority=${rstpConfig.priority} path-cost-mode=${rstpConfig.pathCostMode}

# Configure STP port path costs to prevent loop dependencies
/interface bridge port add bridge=${rstpConfig.bridgeName} interface=ether5 path-cost=10
/interface bridge port add bridge=${rstpConfig.bridgeName} interface=ether6 path-cost=20`;
    }
  };

  const handleCopy = (mode: 'rstp' | 'mstp', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="text-cyan-400 w-5 h-5" />
            Layer 2 Loop Prevention: STP Engine
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Configure Spanning Tree protocols. RSTP is configured for isolated non-VLAN broadcast domains (such as local access bridges) to avoid switching loops. MSTP is deployed on VLAN trunks to allocate optimized logical trees per VLAN instance.
          </p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/25 px-4 py-2 rounded-xl shrink-0 flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-950/40 text-cyan-400 font-extrabold text-xs rounded border border-cyan-850">
            Layer 2
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">OSI Layer</div>
            <div className="text-[9px] text-cyan-400 font-mono mt-0.5">Data Link Layer</div>
          </div>
        </div>
      </div>

      {/* OSI Model Mapping Educational Banner */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-4 rounded-xl flex items-start gap-3">
        <span className="text-cyan-400 font-bold shrink-0 text-xs mt-0.5">ℹ️</span>
        <div className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-bold text-white">OSI Model Alignment:</span> Spanning Tree Protocols (STP, RSTP, MSTP) operate entirely within <span className="text-cyan-300 font-semibold">Layer 2 (Data Link)</span>. They prevent packet storms by detecting and disabling physical switching loops at the frame layer, without inspectable Layer 3 IP addressing knowledge.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* MSTP Card (VLAN Trunk Version) */}
        <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="text-cyan-400 w-4.5 h-4.5" />
                MSTP Config (VLAN Trunks)
              </h3>
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold px-2 py-0.5 rounded">
                Active: VLAN 10 & 20
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Bridge Name</label>
                <input 
                  type="text" 
                  value={mstpConfig.bridgeName}
                  onChange={(e) => setMstpConfig(prev => ({ ...prev, bridgeName: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs font-mono text-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Bridge Priority</label>
                <select 
                  value={mstpConfig.priority}
                  onChange={(e) => setMstpConfig(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value={4096}>4096 (Root Primary)</option>
                  <option value={8192}>8192 (Root Secondary)</option>
                  <option value={32768}>32768 (Default)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Path Cost Standard</label>
                <select 
                  value={mstpConfig.pathCostMode}
                  onChange={(e) => setMstpConfig(prev => ({ ...prev, pathCostMode: e.target.value as any }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="long">Long (802.1t modern 32-bit)</option>
                  <option value="short">Short (Legacy 16-bit)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Instance Mappings</label>
                <input 
                  type="text" 
                  value={mstpConfig.vlanMapping}
                  readOnly
                  className="w-full bg-zinc-950/60 border border-zinc-850 text-zinc-500 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed mt-4 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
              Multiple Spanning Tree maps separate logical paths for VLANs 10 and 20, preventing bottleneck links and optimizing load balancing across physical trunking networks.
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">RouterOS CLI Syntax</span>
              <button 
                onClick={() => handleCopy('mstp', generateCLI('mstp'))}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
              >
                {copiedMode === 'mstp' ? 'Copied CLI!' : 'Copy Config'}
              </button>
            </div>
            <pre className="p-3 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-zinc-900 max-h-[140px] select-all leading-normal">
              {generateCLI('mstp')}
            </pre>
          </div>
        </div>

        {/* RSTP Card (Non-VLAN Isolated Version) */}
        <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Network className="text-indigo-400 w-4.5 h-4.5" />
                RSTP Config (Non-VLAN Subnets)
              </h3>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold px-2 py-0.5 rounded">
                Active: Access Ports
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Bridge Name</label>
                <input 
                  type="text" 
                  value={rstpConfig.bridgeName}
                  onChange={(e) => setRstpConfig(prev => ({ ...prev, bridgeName: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs font-mono text-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Bridge Priority</label>
                <select 
                  value={rstpConfig.priority}
                  onChange={(e) => setRstpConfig(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value={32768}>32768 (Default Priority)</option>
                  <option value={61440}>61440 (Backup Path)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Path Cost Mode</label>
                <select 
                  value={rstpConfig.pathCostMode}
                  onChange={(e) => setRstpConfig(prev => ({ ...prev, pathCostMode: e.target.value as any }))}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="short">Short (Legacy 16-bit)</option>
                  <option value="long">Long (802.1t modern 32-bit)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Hello Time (Secs)</label>
                <input 
                  type="number" 
                  value={rstpConfig.helloTime}
                  readOnly
                  className="w-full bg-zinc-950/60 border border-zinc-850 text-zinc-500 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed mt-4 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
              Rapid Spanning Tree blocks alternative loops in under 50 milliseconds, protecting downstream localized switches from packet storms and loops.
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">RouterOS CLI Syntax</span>
              <button 
                onClick={() => handleCopy('rstp', generateCLI('rstp'))}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
              >
                {copiedMode === 'rstp' ? 'Copied CLI!' : 'Copy Config'}
              </button>
            </div>
            <pre className="p-3 bg-black text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-zinc-900 max-h-[140px] select-all leading-normal">
              {generateCLI('rstp')}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
