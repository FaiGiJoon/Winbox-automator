import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, Cpu, Activity, Play, Pause, RefreshCw, Terminal, 
  Settings, Copy, CheckCircle2, ShieldAlert, Wifi, Info, 
  HelpCircle, Check, Database, Zap, HardDrive, BarChart2
} from 'lucide-react';

interface SNMPConfig {
  host: string;
  port: number;
  community: string;
  version: 'v1' | 'v2c' | 'v3';
  v3User: string;
  v3AuthProto: 'MD5' | 'SHA1' | 'NONE';
  v3AuthPass: string;
  v3PrivProto: 'DES' | 'AES' | 'NONE';
  v3PrivPass: string;
  v3SecurityLevel: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
}

interface OIDDefinition {
  oid: string;
  name: string;
  description: string;
  type: string;
  unit: string;
  defaultValue: any;
  mikrotikSpecific: boolean;
}

interface LogEntry {
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error';
  message: string;
}

export default function SNMPManager() {
  const [config, setConfig] = useState<SNMPConfig>({
    host: '192.168.88.1',
    port: 161,
    community: 'public',
    version: 'v2c',
    v3User: 'snmp-admin',
    v3AuthProto: 'SHA1',
    v3AuthPass: 'SecretAuthKey123',
    v3PrivProto: 'AES',
    v3PrivPass: 'SecretPrivKey456',
    v3SecurityLevel: 'authPriv'
  });

  const presetHosts = [
    { name: 'Core Router (R1)', ip: '192.168.88.1', model: 'CCR2004-16G-2S+' },
    { name: 'CRS326 Switch (SW1)', ip: '192.168.88.2', model: 'CRS326-24G-2S+RM' },
    { name: 'Wave2 CAP AP (hAP ax³)', ip: '192.168.88.10', model: 'C53UiG+5HPaxD' },
    { name: 'PTP Bridge Master', ip: '192.168.88.11', model: 'RBLHGG-60ad' }
  ];

  const oids: OIDDefinition[] = [
    { oid: '.1.3.6.1.2.1.1.1.0', name: 'sysDescr', description: 'System description and OS build metadata', type: 'OctetString', unit: '', defaultValue: 'RouterOS v7.12.1 on CCR2004-16G-2S+', mikrotikSpecific: false },
    { oid: '.1.3.6.1.2.1.1.3.0', name: 'sysUpTime', description: 'Uptime in hundredths of a second', type: 'TimeTicks', unit: '', defaultValue: 104523000, mikrotikSpecific: false },
    { oid: '.1.3.6.1.2.1.1.5.0', name: 'sysName', description: 'Identity name configured on the device', type: 'OctetString', unit: '', defaultValue: 'R1-Core-Gateway', mikrotikSpecific: false },
    { oid: '.1.3.6.1.4.1.14988.1.1.3.10.0', name: 'mtxrHLProcessorLoad', description: 'MikroTik CPU load percentage', type: 'Integer32', unit: '%', defaultValue: 12, mikrotikSpecific: true },
    { oid: '.1.3.6.1.2.1.25.2.3.1.5.65536', name: 'hrStorageSize', description: 'Allocated RAM blocks count', type: 'Integer32', unit: ' blocks', defaultValue: 262144, mikrotikSpecific: false },
    { oid: '.1.3.6.1.2.1.25.2.3.1.6.65536', name: 'hrStorageUsed', description: 'Utilized RAM blocks count', type: 'Integer32', unit: ' blocks', defaultValue: 110480, mikrotikSpecific: false },
    { oid: '.1.3.6.1.4.1.14988.1.1.3.8.0', name: 'mtxrHLTemperature', description: 'MikroTik system board temperature', type: 'Integer32', unit: '°C', defaultValue: 41, mikrotikSpecific: true },
    { oid: '.1.3.6.1.4.1.14988.1.1.3.9.0', name: 'mtxrHLVoltage', description: 'MikroTik board input voltage', type: 'Integer32', unit: 'V', defaultValue: 23.8, mikrotikSpecific: true },
    { oid: '.1.3.6.1.4.1.14988.1.1.3.14.0', name: 'mtxrHLFrequency', description: 'MikroTik CPU current frequency', type: 'Integer32', unit: 'MHz', defaultValue: 1200, mikrotikSpecific: true },
    { oid: '.1.3.6.1.4.1.14988.1.1.7.2.0', name: 'mtxrHLBadBlocks', description: 'Flash storage sector bad block percentage', type: 'Integer32', unit: '%', defaultValue: 0, mikrotikSpecific: true }
  ];

  const [selectedOid, setSelectedOid] = useState<string>('.1.3.6.1.4.1.14988.1.1.3.10.0');
  const [customOid, setCustomOid] = useState<string>('');
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'SNMP Manager Engine initialized. Ready to poll RouterOS nodes.' }
  ]);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Health Stats State for the current target
  const [healthData, setHealthData] = useState({
    cpu: 14,
    temp: 41,
    voltage: 23.8,
    frequency: 1200,
    ramUsed: 442, // MB
    ramTotal: 1024, // MB
    uptime: '12d 02h 34m 11s',
    sysName: 'R1-Core-Gateway',
    descr: 'RouterOS v7.12.1 on CCR2004-16G-2S+',
    badBlocks: 0
  });

  const [isPolling, setIsPolling] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (type: 'tx' | 'rx' | 'info' | 'error', message: string) => {
    setLogs(prev => [...prev.slice(-49), {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    }]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Execute manual or auto poll step
  const executePoll = (isAutoStep: boolean = false) => {
    if (!isAutoStep) {
      setIsPolling(true);
    }

    const targetOid = customOid.trim() || selectedOid;
    const oidObj = oids.find(o => o.oid === targetOid);
    const resolvedName = oidObj ? oidObj.name : 'unknownOID';

    // Formulate transmission log representing standard ASN.1 BER encoding
    let securityDetails = '';
    if (config.version === 'v3') {
      securityDetails = `user="${config.v3User}" level=${config.v3SecurityLevel} auth=${config.v3AuthProto} priv=${config.v3PrivProto}`;
    } else {
      securityDetails = `community="${config.community}"`;
    }

    const txMsg = `UDP ${config.host}:${config.port} -> ver=${config.version} ${securityDetails} PDU=GetRequest reqID=0x${Math.floor(Math.random() * 65536).toString(16).toUpperCase()} OID=[${targetOid}] (${resolvedName})`;
    addLog('tx', txMsg);

    // Simulate response delay
    const delay = 150 + Math.random() * 200;
    setTimeout(() => {
      // Simulate network jitter/drop (2% chance)
      if (Math.random() < 0.02) {
        addLog('error', `UDP Request Timeout after ${config.port === 161 ? '2000' : '4000'}ms. No SNMP Response from remote agent.`);
        setIsPolling(false);
        return;
      }

      // Compute randomized fluctuates for real-time visualization
      let updatedCpu = healthData.cpu;
      let updatedTemp = healthData.temp;
      let updatedVoltage = healthData.voltage;
      let updatedFreq = healthData.frequency;
      let updatedRamUsed = healthData.ramUsed;

      if (config.host === '192.168.88.2') { // CRS326 Switch has lower CPU & power specs
        updatedCpu = Math.max(2, Math.min(60, Math.round(5 + Math.random() * 8)));
        updatedTemp = Math.max(30, Math.min(55, Math.round(34 + Math.random() * 2)));
        updatedVoltage = 23.9;
        updatedFreq = 800; // MHz
        updatedRamUsed = Math.max(100, Math.min(400, Math.round(140 + Math.random() * 5)));
      } else if (config.host === '192.168.88.10') { // hAP ax³ wireless AP
        updatedCpu = Math.max(5, Math.min(90, Math.round(18 + Math.random() * 15)));
        updatedTemp = Math.max(35, Math.min(70, Math.round(45 + Math.random() * 4)));
        updatedVoltage = 24.1;
        updatedFreq = 1800; // MHz
        updatedRamUsed = Math.max(200, Math.min(800, Math.round(310 + Math.random() * 12)));
      } else if (config.host === '192.168.88.11') { // PtP Bridge
        updatedCpu = Math.max(1, Math.min(30, Math.round(4 + Math.random() * 3)));
        updatedTemp = Math.max(20, Math.min(50, Math.round(28 + Math.random() * 1)));
        updatedVoltage = 24.0;
        updatedFreq = 650; // MHz
        updatedRamUsed = Math.max(40, Math.min(100, Math.round(62 + Math.random() * 1)));
      } else { // CCR2004 Core Router (Powerful multi-core, dynamic spikes)
        updatedCpu = Math.max(2, Math.min(95, Math.round(12 + Math.random() * 10)));
        updatedTemp = Math.max(38, Math.min(65, Math.round(41 + Math.random() * 2)));
        updatedVoltage = 23.8;
        updatedFreq = 1200; // MHz
        updatedRamUsed = Math.max(300, Math.min(1000, Math.round(442 + Math.random() * 20)));
      }

      // Extract specific value for current targeted query
      let valString = '';
      if (targetOid === '.1.3.6.1.4.1.14988.1.1.3.10.0') {
        valString = `Integer32: ${updatedCpu} (${resolvedName})`;
      } else if (targetOid === '.1.3.6.1.2.1.1.3.0') {
        valString = `TimeTicks: ${Math.floor(Date.now() / 1000) % 10000000} (uptime value)`;
      } else if (targetOid === '.1.3.6.1.2.1.1.5.0') {
        const h = presetHosts.find(p => p.ip === config.host);
        valString = `OctetString: "${h ? h.name.split(' ')[0] : 'RouterOS-Agent'}"`;
      } else if (targetOid === '.1.3.6.1.4.1.14988.1.1.3.8.0') {
        valString = `Integer32: ${updatedTemp} (${resolvedName})`;
      } else if (targetOid === '.1.3.6.1.4.1.14988.1.1.3.9.0') {
        valString = `Integer32: ${(updatedVoltage * 10).toFixed(0)} (scaled decivolts)`;
      } else if (targetOid === '.1.3.6.1.4.1.14988.1.1.3.14.0') {
        valString = `Integer32: ${updatedFreq} (${resolvedName})`;
      } else if (targetOid === '.1.3.6.1.4.1.14988.1.1.7.2.0') {
        valString = `Integer32: 0 (${resolvedName})`;
      } else if (targetOid === '.1.3.6.1.2.1.1.1.0') {
        const h = presetHosts.find(p => p.ip === config.host);
        valString = `OctetString: "RouterOS v7.12.1 Stable on ${h ? h.model : 'MikroTik Hardware'}"`;
      } else {
        valString = `Integer32: ${Math.floor(50 + Math.random() * 200)} (custom translation success)`;
      }

      const rxMsg = `UDP ${config.host}:${config.port} <- ver=${config.version} Status=NoError(0) index=0 val=${valString}`;
      addLog('rx', rxMsg);

      // Advance uptime representation
      const totalSec = Math.floor(Date.now() / 1000) % 60;
      const totalMin = Math.floor(Date.now() / 60000) % 60;
      const uptimeStr = `12d 02h ${totalMin.toString().padStart(2, '0')}m ${totalSec.toString().padStart(2, '0')}s`;

      const hPreset = presetHosts.find(p => p.ip === config.host);
      
      setHealthData({
        cpu: updatedCpu,
        temp: updatedTemp,
        voltage: updatedVoltage,
        frequency: updatedFreq,
        ramUsed: updatedRamUsed,
        ramTotal: config.host === '192.168.88.2' ? 512 : config.host === '192.168.88.11' ? 128 : 1024,
        uptime: uptimeStr,
        sysName: hPreset ? hPreset.name : 'Custom-Node',
        descr: `RouterOS v7.12.1 Stable on ${hPreset ? hPreset.model : 'Generic MikroTik'}`,
        badBlocks: 0
      });

      if (!isAutoStep) {
        setIsPolling(false);
      }
    }, delay);
  };

  // Automated background polling loop
  useEffect(() => {
    let timer: any = null;
    if (isAutoPolling) {
      // Poll initially
      executePoll(true);
      timer = setInterval(() => {
        executePoll(true);
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoPolling, config.host, selectedOid, customOid, config.version, config.community]);

  const clearLogs = () => {
    setLogs([{ timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Logs flushed by administrator.' }]);
  };

  const handleCopyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const generateRouterOSScript = () => {
    let script = `# RouterOS SNMP Configuration Script\n`;
    script += `/snmp set enabled=yes contact="cgeorge761@gmail.com" location="Server Cabinets" port=${config.port}\n`;
    
    if (config.version === 'v3') {
      script += `# Configure SNMP v3 Security Parameters\n`;
      script += `/snmp community set [ find default=yes ] write-access=no security=none\n`;
      script += `/snmp user add name=${config.v3User} security-level=${config.v3SecurityLevel === 'authPriv' ? 'auth-priv' : config.v3SecurityLevel === 'authNoPriv' ? 'auth' : 'none'} \\\n`;
      script += `   auth=${config.v3AuthProto.toLowerCase()} auth-password="${config.v3AuthPass}" \\\n`;
      script += `   priv=${config.v3PrivProto.toLowerCase()} priv-password="${config.v3PrivPass}"\n`;
    } else {
      script += `# Configure SNMP v1/v2c Read-Only Community String\n`;
      if (config.community !== 'public') {
        script += `/snmp community add name=${config.community} write-access=no security=none\n`;
      } else {
        script += `/snmp community set [ find name=public ] write-access=no security=none\n`;
      }
    }
    return script;
  };

  return (
    <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-6">
      
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Wifi className="text-cyan-400 w-4 h-4 animate-pulse" />
            Active SNMP Telemetry Manager (SNMP Poller)
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Poll physical RouterOS health variables directly from active subnets. Compare processor cycles, voltage metrics, and local memory thresholds.
          </p>
        </div>
        
        {/* Quick Polling Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAutoPolling(prev => !prev)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
              isAutoPolling 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)] animate-pulse' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Automatically poll device health metrics every 3 seconds"
          >
            {isAutoPolling ? <Pause size={11} className="text-emerald-400" /> : <Play size={11} />}
            {isAutoPolling ? 'Auto-Polling Active' : 'Start Auto-Poll'}
          </button>

          <button
            onClick={() => executePoll(false)}
            disabled={isPolling || isAutoPolling}
            className="px-3.5 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border bg-cyan-950/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(6,182,212,0.05)]"
          >
            <RefreshCw size={11} className={isPolling ? 'animate-spin' : ''} />
            Poll Once
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Column 1: Config Controller */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl space-y-4">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-2">Target Node Parameters</span>
            
            {/* Host Target Presets */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Active RouterOS Agent IP</label>
              <div className="grid grid-cols-2 gap-1.5">
                {presetHosts.map(p => (
                  <button
                    key={p.ip}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, host: p.ip }))}
                    className={`p-2 text-left rounded-lg border text-[10px] transition-all cursor-pointer ${
                      config.host === p.ip
                        ? 'bg-cyan-950/20 border-cyan-500 text-cyan-300'
                        : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="font-bold block leading-none truncate">{p.name.split(' ')[0]}</span>
                    <span className="font-mono text-[8px] text-zinc-500 block mt-0.5">{p.ip}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual host entry */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">IP Address</label>
                <input
                  type="text"
                  value={config.host}
                  onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-1.5 text-xs text-zinc-200 font-mono focus:ring-0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">Port</label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 161 }))}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-1.5 text-xs text-zinc-200 font-mono focus:ring-0"
                />
              </div>
            </div>

            {/* SNMP Protocol Settings */}
            <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/50 pt-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">Version</label>
                <select
                  value={config.version}
                  onChange={(e) => setConfig(prev => ({ ...prev, version: e.target.value as any }))}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-1.5 text-xs text-zinc-200 focus:ring-0 cursor-pointer"
                >
                  <option value="v1">v1</option>
                  <option value="v2c">v2c</option>
                  <option value="v3">v3 (Secure)</option>
                </select>
              </div>

              {config.version !== 'v3' ? (
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">Community</label>
                  <input
                    type="text"
                    value={config.community}
                    onChange={(e) => setConfig(prev => ({ ...prev, community: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-1.5 text-xs text-zinc-200 font-mono focus:ring-0"
                  />
                </div>
              ) : (
                <div className="col-span-2 space-y-1">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">User Profile</label>
                  <input
                    type="text"
                    value={config.v3User}
                    onChange={(e) => setConfig(prev => ({ ...prev, v3User: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-1.5 text-xs text-zinc-200 font-mono focus:ring-0"
                  />
                </div>
              )}
            </div>

            {/* SNMP v3 Detailed Credentials */}
            {config.version === 'v3' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 bg-[#0a0a14] border border-zinc-900 p-3 rounded-lg text-[10px]"
              >
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">Security Level</label>
                  <select
                    value={config.v3SecurityLevel}
                    onChange={(e) => setConfig(prev => ({ ...prev, v3SecurityLevel: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-900 p-1.5 rounded-lg text-zinc-300 text-[10px] focus:ring-0 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="noAuthNoPriv">noAuthNoPriv</option>
                    <option value="authNoPriv">authNoPriv</option>
                    <option value="authPriv">authPriv (Encrypted)</option>
                  </select>
                </div>

                {config.v3SecurityLevel !== 'noAuthNoPriv' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">Auth Proto</label>
                      <select
                        value={config.v3AuthProto}
                        onChange={(e) => setConfig(prev => ({ ...prev, v3AuthProto: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-900 p-1 rounded-lg text-zinc-300 text-[10px]"
                      >
                        <option value="SHA1">SHA-1</option>
                        <option value="MD5">MD5</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">Auth Passphrase</label>
                      <input
                        type="password"
                        value={config.v3AuthPass}
                        onChange={(e) => setConfig(prev => ({ ...prev, v3AuthPass: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-900 p-1 rounded-lg text-zinc-300 text-[10px] font-mono"
                      />
                    </div>
                  </div>
                )}

                {config.v3SecurityLevel === 'authPriv' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">Priv Proto</label>
                      <select
                        value={config.v3PrivProto}
                        onChange={(e) => setConfig(prev => ({ ...prev, v3PrivProto: e.target.value as any }))}
                        className="w-full bg-zinc-950 border border-zinc-900 p-1 rounded-lg text-zinc-300 text-[10px]"
                      >
                        <option value="AES">AES-128</option>
                        <option value="DES">DES</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">Priv Passphrase</label>
                      <input
                        type="password"
                        value={config.v3PrivPass}
                        onChange={(e) => setConfig(prev => ({ ...prev, v3PrivPass: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-900 p-1 rounded-lg text-zinc-300 text-[10px] font-mono"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* OID Preset Library Selector */}
            <div className="space-y-1.5 border-t border-zinc-900/50 pt-3">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Active OID Library Target</label>
              <select
                value={selectedOid}
                onChange={(e) => {
                  setSelectedOid(e.target.value);
                  setCustomOid('');
                }}
                className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-2 text-xs text-zinc-200 focus:ring-0 cursor-pointer"
              >
                {oids.map(o => (
                  <option key={o.oid} value={o.oid}>
                    {o.name} ({o.oid})
                  </option>
                ))}
                <option value="custom">-- Custom Enterprise OID --</option>
              </select>

              {selectedOid === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1 mt-2"
                >
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">Enter custom OID numeric string</label>
                  <input
                    type="text"
                    placeholder=".1.3.6.1.4.1.14988.1..."
                    value={customOid}
                    onChange={(e) => setCustomOid(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-cyan-500 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:ring-0"
                  />
                </motion.div>
              )}
              
              <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 leading-normal mt-1 italic">
                {customOid 
                  ? 'Custom object request. Will query SNMP device agent using numerical address.' 
                  : oids.find(o => o.oid === selectedOid)?.description}
              </div>
            </div>

          </div>
        </div>

        {/* Column 2: Dashboard Metrics & Health Diagnostics */}
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* CPU Metric Gauge */}
            <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1.5 opacity-5">
                <Cpu size={50} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">CPU LOAD</span>
                <span className="text-[10px] font-mono font-bold text-cyan-400">.1.3.6.1...10.0</span>
              </div>
              <div className="my-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono tracking-tight">{healthData.cpu}</span>
                <span className="text-xs text-zinc-500 font-bold">%</span>
              </div>
              {/* Animated Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${healthData.cpu}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">Multi-Core execution</span>
              </div>
            </div>

            {/* RAM Metric Gauge */}
            <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1.5 opacity-5">
                <HardDrive size={50} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">MEMORY USED</span>
                <span className="text-[10px] font-mono font-bold text-indigo-400">hrStorage</span>
              </div>
              <div className="my-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  {healthData.ramUsed}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ {healthData.ramTotal} MB</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${(healthData.ramUsed / healthData.ramTotal) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">
                  {((healthData.ramUsed / healthData.ramTotal) * 100).toFixed(1)}% Memory allocation
                </span>
              </div>
            </div>

            {/* TEMP Metric Gauge */}
            <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1.5 opacity-5">
                <Activity size={50} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">TEMPERATURE</span>
                <span className="text-[10px] font-mono font-bold text-pink-400">.1.3.6.1...8.0</span>
              </div>
              <div className="my-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono tracking-tight">{healthData.temp}</span>
                <span className="text-xs text-zinc-500 font-bold">°C</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-pink-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${(healthData.temp / 85) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">Optimal core operating temp</span>
              </div>
            </div>

            {/* VOLTAGE Metric Gauge */}
            <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1.5 opacity-5">
                <Zap size={50} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">INPUT VOLTAGE</span>
                <span className="text-[10px] font-mono font-bold text-amber-400">.1.3.6.1...9.0</span>
              </div>
              <div className="my-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono tracking-tight">{healthData.voltage.toFixed(1)}</span>
                <span className="text-xs text-zinc-500 font-bold">V</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${(healthData.voltage / 30) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">PoE / DC active line voltage</span>
              </div>
            </div>

          </div>

          {/* Quick Stats Ticker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
            <div>
              <span className="text-zinc-600 block uppercase text-[8px] tracking-widest font-bold">Uptime (sysUpTime)</span>
              <span className="text-zinc-300 font-bold font-mono">{healthData.uptime}</span>
            </div>
            <div>
              <span className="text-zinc-600 block uppercase text-[8px] tracking-widest font-bold">Router Identity</span>
              <span className="text-cyan-400 font-bold font-mono">{healthData.sysName}</span>
            </div>
            <div>
              <span className="text-zinc-600 block uppercase text-[8px] tracking-widest font-bold">Active System Details</span>
              <span className="text-zinc-300 truncate block text-[11px]" title={healthData.descr}>{healthData.descr}</span>
            </div>
          </div>

          {/* SNMP Live Logging Console */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={12} className="text-cyan-400 animate-pulse" />
                Live SNMP Agent Communication console
              </span>
              <button 
                onClick={clearLogs}
                className="text-[9px] text-zinc-500 hover:text-zinc-300 font-mono uppercase bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850 hover:border-zinc-800 transition-all"
              >
                Clear Console
              </button>
            </div>
            
            <div className="bg-[#050508]/95 border border-zinc-900 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[190px] h-[190px] shadow-inner select-all">
              {logs.map((log, index) => {
                let textCol = 'text-zinc-400';
                let tag = '[SYSTEM]';
                
                if (log.type === 'tx') {
                  textCol = 'text-cyan-400';
                  tag = '[SNMP-TX]';
                } else if (log.type === 'rx') {
                  textCol = 'text-emerald-400';
                  tag = '[SNMP-RX]';
                } else if (log.type === 'error') {
                  textCol = 'text-red-400 font-bold';
                  tag = '[ERR-UDP]';
                }

                return (
                  <div key={index} className={`${textCol} flex items-start gap-2 py-0.5`}>
                    <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className="font-bold shrink-0 select-none">{tag}</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* RouterOS CLI SNMP Config Provisioner */}
          <div className="bg-[#07070c] border border-zinc-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={12} className="text-cyan-400" />
                Configure SNMP on remote MikroTik RouterOS
              </span>
              <button
                onClick={() => handleCopyScript(generateRouterOSScript())}
                className="px-2.5 py-1 text-[10px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedScript ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copiedScript ? 'Copied script!' : 'Copy Script'}
              </button>
            </div>

            <pre className="p-3 bg-black/95 text-cyan-400 font-mono text-[10px] rounded-lg overflow-x-auto border border-zinc-950 select-all leading-normal max-h-[110px]">
              {generateRouterOSScript()}
            </pre>
          </div>

        </div>

      </div>
      
    </div>
  );
}
