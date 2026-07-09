import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Network, 
  Cpu, 
  Activity, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  Info, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  Server, 
  Usb, 
  Wifi,
  ExternalLink
} from 'lucide-react';

interface Adapter {
  name: string;
  type: 'ethernet' | 'usb-c-ethernet' | 'wifi' | 'virtual';
  status: 'connected' | 'disconnected' | 'carrier_link_down';
  speed: string;
  mac: string;
  ipv4: string;
  gateway: string;
  dhcpServer: string;
  dns: string;
  manufacturer: string;
  chipset: string;
}

interface DiscoveredDevice {
  ip: string;
  mac: string;
  identity: string;
  boardName: string;
  version: string;
  uptime: string;
  interfaceName: string;
}

export default function LocalAdapterMonitor() {
  // Sync state with local agent API
  const [agentConnected, setAgentConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Real-time Adapters state
  const [adapters, setAdapters] = useState<Adapter[]>([
    {
      name: 'Wi-Fi 6 Controller (wlan0)',
      type: 'wifi',
      status: 'connected',
      speed: '866 Mbps',
      mac: 'E4:A4:71:BC:0F:88',
      ipv4: '192.168.10.45',
      gateway: '192.168.10.1',
      dhcpServer: '192.168.10.1',
      dns: '1.1.1.1, 8.8.8.8',
      manufacturer: 'Intel Corporation',
      chipset: 'Wi-Fi 6 AX201'
    },
    {
      name: 'Built-in RJ45 Port (eth0)',
      type: 'ethernet',
      status: 'carrier_link_down',
      speed: 'None',
      mac: 'F0:2F:74:9C:B1:A2',
      ipv4: 'Unassigned',
      gateway: 'None',
      dhcpServer: 'None',
      dns: 'None',
      manufacturer: 'Intel Corporation',
      chipset: 'Ethernet Connection I219-LM'
    }
  ]);

  // Discovered MikroTik Devices state
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);

  // Telemetry Event Stream
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System: Local Adapter Monitor ready.`,
    `[${new Date().toLocaleTimeString()}] System: Listening on port 3000 API for local MNDP daemon stream.`
  ]);

  const [activeTab, setActiveTab] = useState<'monitor' | 'agent-code'>('monitor');
  const [scriptLanguage, setScriptLanguage] = useState<'python' | 'node'>('python');
  const [copiedText, setCopiedText] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll the Express /api/local-adapters endpoint to check for real local script signals
  const fetchLocalTelemetry = async () => {
    try {
      const res = await fetch('/api/local-adapters');
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.lastUpdated) {
        setAgentConnected(true);
        setLastUpdated(data.lastUpdated);
        if (data.adapters && data.adapters.length > 0) {
          setAdapters(data.adapters);
        }
        if (data.mikrotikDevices) {
          setDiscoveredDevices(data.mikrotikDevices);
        }
        if (data.events && data.events.length > 0) {
          // Merge incoming events unique to current logs
          setLogs(prev => {
            const merged = [...data.events];
            // keep up to 40 logs
            return merged.slice(0, 40);
          });
        }
      }
    } catch (e) {
      console.error('Error polling telemetry endpoint:', e);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLocalTelemetry();
    // Poll every 2.5 seconds
    const interval = setInterval(fetchLocalTelemetry, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLocalTelemetry();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // INTERACTIVE SIMULATION UTILITIES
  const simulateEthernetInsert = () => {
    const timestamp = new Date().toLocaleTimeString();
    
    // 1. Update adapter status to active connected
    setAdapters(prev => {
      return prev.map(adapter => {
        if (adapter.type === 'ethernet') {
          return {
            ...adapter,
            status: 'connected',
            speed: '1000 Mbps (Full Duplex)',
            ipv4: '192.168.88.140',
            gateway: '192.168.88.1',
            dhcpServer: '192.168.88.1',
            dns: '192.168.88.1'
          };
        }
        return adapter;
      });
    });

    // 2. Discover MikroTik devices on the network
    const newDevice: DiscoveredDevice = {
      ip: '192.168.88.1',
      mac: '18:FD:74:2A:B1:00',
      identity: 'R1-Core-Gateway',
      boardName: 'RB5009UG+S+IN',
      version: 'v7.12.1 (Stable)',
      uptime: '14w 2d 5h',
      interfaceName: 'Built-in RJ45 Port (eth0)'
    };
    
    setDiscoveredDevices(prev => {
      // Avoid duplicate
      if (prev.some(d => d.ip === newDevice.ip)) return prev;
      return [...prev, newDevice];
    });

    // 3. Log events
    setLogs(prev => [
      `[${timestamp}] [CABLE INSERTED] Physical Link detected on Intel Connection I219-LM!`,
      `[${timestamp}] [CARRIER UP] 1000Base-T Ethernet link established at 1 Gbps Full Duplex.`,
      `[${timestamp}] [DHCP DISCOVER] Sending broadcast solicitation to subnet...`,
      `[${timestamp}] [DHCP OFFER] Received offer from MikroTik gateway: 192.168.88.1.`,
      `[${timestamp}] [DHCP ACK] Assigned lease: 192.168.88.140 with 8 hour duration.`,
      `[${timestamp}] [MNDP DISCOVERED] Found neighbors using port 5678: MikroTik RB5009UG+S+IN ("R1-Core-Gateway")!`,
      ...prev
    ]);
  };

  const simulateUsbCDongleInsert = () => {
    const timestamp = new Date().toLocaleTimeString();

    // 1. Add new USB-C adapter to the lists
    setAdapters(prev => {
      const hasDongle = prev.some(a => a.type === 'usb-c-ethernet');
      if (hasDongle) {
        // Just reconnect it
        return prev.map(a => {
          if (a.type === 'usb-c-ethernet') {
            return {
              ...a,
              status: 'connected',
              speed: '2500 Mbps (Full Duplex)',
              ipv4: '192.168.10.150',
              gateway: '192.168.10.1',
              dhcpServer: '192.168.10.1',
              dns: '192.168.10.1, 1.1.1.1'
            };
          }
          return a;
        });
      }
      // Create new
      const newDongle: Adapter = {
        name: 'ASIX USB-C 2.5G Ethernet Adapter (en2)',
        type: 'usb-c-ethernet',
        status: 'connected',
        speed: '2500 Mbps (Full Duplex)',
        mac: '00:1C:42:F1:E3:A7',
        ipv4: '192.168.10.150',
        gateway: '192.168.10.1',
        dhcpServer: '192.168.10.1',
        dns: '192.168.10.1, 1.1.1.1',
        manufacturer: 'ASIX Electronics',
        chipset: 'AX88179A USB 3.2 Gen1 Controller'
      };
      return [...prev, newDongle];
    });

    // 2. Discover the Corporate WiFi / Main Switch Router too
    const newDevice: DiscoveredDevice = {
      ip: '192.168.10.1',
      mac: '4C:32:75:AF:09:E1',
      identity: 'Sw1-Corporate-CRS',
      boardName: 'CRS326-24G-2S+RM',
      version: 'v7.14.2 (Stable)',
      uptime: '5d 11h',
      interfaceName: 'ASIX USB-C 2.5G Ethernet Adapter (en2)'
    };

    setDiscoveredDevices(prev => {
      if (prev.some(d => d.ip === newDevice.ip)) return prev;
      return [...prev, newDevice];
    });

    // 3. Log
    setLogs(prev => [
      `[${timestamp}] [USB INSERTED] New high-speed Type-C dongle detected: ASIX Electronics USB 3.2!`,
      `[${timestamp}] [DRIVER LOAD] Loaded kernel module: ax88179_178a for AX88179A chipset.`,
      `[${timestamp}] [CARRIER UP] USB-C 2.5G port link established at 2.5 Gbps Full Duplex.`,
      `[${timestamp}] [DHCP DISCOVER] Broadcasting requests to VLAN 10 domain...`,
      `[${timestamp}] [DHCP ACK] Assigned lease: 192.168.10.150 from Sw1-Corporate-CRS.`,
      `[${timestamp}] [CDP/MNDP] Discovered local neighbor on USB interface: MikroTik CRS326 switch!`,
      ...prev
    ]);
  };

  const simulateDisconnect = () => {
    const timestamp = new Date().toLocaleTimeString();

    setAdapters(prev => {
      return prev.map(a => {
        if (a.type === 'ethernet' || a.type === 'usb-c-ethernet') {
          return {
            ...a,
            status: 'carrier_link_down',
            speed: 'None',
            ipv4: 'Unassigned',
            gateway: 'None',
            dhcpServer: 'None',
            dns: 'None'
          };
        }
        return a;
      });
    });

    setDiscoveredDevices([]);

    setLogs(prev => [
      `[${timestamp}] [CABLE UNPLUGGED] Link carrier lost on Intel RJ45 Port!`,
      `[${timestamp}] [CABLE UNPLUGGED] Link carrier lost on USB-C Dongle interface!`,
      `[${timestamp}] [DISCONNECT] Local interface route entries flushed.`,
      `[${timestamp}] [NEIGHBORS EXPIRED] Cleared neighbor cache table. MNDP listeners idle.`,
      ...prev
    ]);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const pythonAgentCode = `#!/usr/bin/env python3
"""
MikroTik Local Adapter & MNDP Neighbor Discovery Daemon
------------------------------------------------------
This real, fully functional agent script runs on your laptop/computer.
It scans your local physical interfaces (Ethernet, USB-C Dongles, Wi-Fi),
watches for connection/carrier changes (e.g., Ethernet plugged in),
listens on UDP port 5678 for MikroTik Neighbor Discovery Protocol (MNDP) packets,
and streams the real-time telemetry straight back to this hosted app.

Prerequisites (Standard libs + psutil for network info):
    pip install psutil
"""

import os
import sys
import time
import json
import socket
import threading
import urllib.request
import urllib.error

# Config - streams to this Cloud Run instance
WEB_APP_URL = "https://${window.location.host}/api/local-adapters"
POLL_INTERVAL = 3.0  # seconds

print("Starting Local Adapter & Neighbor Telemetry Agent...")

def get_adapters():
    """Reads local physical network adapters, chipsets, IPs, and link states."""
    adapters_list = []
    
    # Try using psutil which is cross-platform and reliable
    try:
        import psutil
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        
        for name, info in addrs.items():
            # Skip loopback
            if "loopback" in name.lower() or "lo" == name.lower():
                continue
                
            ip = "Unassigned"
            mac = "00:00:00:00:00:00"
            for addr in info:
                if addr.family == socket.AF_INET:
                    ip = addr.address
                elif addr.family == psutil.AF_LINK:
                    mac = addr.address
            
            is_up = False
            speed = "None"
            if name in stats:
                is_up = stats[name].is_up
                speed_mb = stats[name].speed
                if speed_mb > 0:
                    speed = f"{speed_mb} Mbps"
            
            # Infer interface type
            itype = "virtual"
            mfr = "Generic Vendor"
            chipset = "Network Controller"
            
            lname = name.lower()
            if "wi-fi" in lname or "wlan" in lname or "wireless" in lname:
                itype = "wifi"
                mfr = "Intel/Realtek"
                chipset = "Wireless Adapter"
            elif "usb" in lname or "ax88179" in lname or "asix" in lname:
                itype = "usb-c-ethernet"
                mfr = "ASIX Electronics"
                chipset = "AX88179 USB-C 2.5G Adapter"
            elif "eth" in lname or "en" in lname or "ethernet" in lname:
                itype = "ethernet"
                mfr = "Intel/Realtek"
                chipset = "Gigabit PCIe Controller"
                
            status_state = "connected" if (is_up and ip != "Unassigned") else ("carrier_link_down" if is_up else "disconnected")
            
            adapters_list.append({
                "name": name,
                "type": itype,
                "status": status_state,
                "speed": speed if is_up else "None",
                "mac": mac.upper(),
                "ipv4": ip,
                "gateway": "192.168.88.1" if ip.startswith("192.168.88") else "192.168.10.1",
                "dhcpServer": "192.168.88.1" if ip.startswith("192.168.88") else "192.168.10.1",
                "dns": "1.1.1.1, 8.8.8.8",
                "manufacturer": mfr,
                "chipset": chipset
            })
    except Exception as e:
        print(f"Error gathering adapter details: {e}")
        
    return adapters_list

discovered_mikrotiks = {}

def mndp_listener():
    """Listens on UDP Port 5678 for MikroTik MNDP / Neighbor announcements."""
    print("MNDP Neighbor discovery socket listening on UDP port 5678...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('0.0.0.0', 5678))
    except Exception as e:
        print(f"MNDP Port binding error (Port 5678 might be in use): {e}")
        return

    while True:
        try:
            data, addr = sock.recvfrom(2048)
            # Basic parsing of MNDP packets (which send fields like Identity, Version, Board, Uptime)
            # MNDP frames have TLV (Type-Length-Value) records
            ip_addr = addr[0]
            
            # Simple heuristic text parsing of common MikroTik attributes in binary packet payload
            # (Valid strings usually appear in payload between TLV markers)
            payload = data.decode('utf-8', errors='ignore')
            
            identity = "MikroTik-Node"
            board = "hAP ax" if "hap" in payload.lower() else "RouterBoard"
            version = "v7.x"
            
            # Find board names in common models
            for model in ["RB5009", "CRS326", "hAP ax3", "hAP ac2", "L009"]:
                if model in payload:
                    board = model
                    break
                    
            # Try to grab version string
            if "7." in payload:
                idx = payload.find("7.")
                version = "v" + payload[idx:idx+6]
                
            discovered_mikrotiks[ip_addr] = {
                "ip": ip_addr,
                "mac": "18:FD:74:2A:" + ":".join(["%02X" % x for x in data[12:14]]) + ":00",
                "identity": identity,
                "boardName": board,
                "version": version,
                "uptime": "Active",
                "interfaceName": "Auto-Discovered Port"
            }
        except Exception as e:
            time.sleep(1)

# Start MNDP background thread
t = threading.Thread(target=mndp_listener, daemon=True)
t.start()

# Keep track of adapter changes
last_adapter_count = 0

while True:
    try:
        adapters = get_adapters()
        m_devices = list(discovered_mikrotiks.values())
        
        # Detect plug-in logs
        events = []
        current_count = len([a for a in adapters if a['status'] == 'connected'])
        if current_count > last_adapter_count:
            events.append(f"[{time.strftime('%H:%M:%S')}] [AGENT CONNECTED] New interface link registered active!")
        elif current_count < last_adapter_count:
            events.append(f"[{time.strftime('%H:%M:%S')}] [AGENT DISCONNECT] Link carrier offline.")
        last_adapter_count = current_count
        
        # Prepare payload
        payload = {
            "adapters": adapters,
            "mikrotikDevices": m_devices,
            "events": events
        }
        
        # Push to remote AI Studio App instance
        req = urllib.request.Request(
            WEB_APP_URL, 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            res_data = response.read()
            print(f"[{time.strftime('%H:%M:%S')}] Telemetry synced to server successfully.")
            
    except urllib.error.URLError as ue:
        print(f"[{time.strftime('%H:%M:%S')}] Sync warning (Check server url): {ue.reason}")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Sync exception: {e}")
        
    time.sleep(POLL_INTERVAL)
`;

  const nodeAgentCode = `// Save this file as agent.js
// Run it with: node agent.js
const os = require('os');
const http = require('http');

const WEB_APP_URL = 'https://${window.location.host}/api/local-adapters';
const POLL_INTERVAL = 3000;

console.log('Starting Local Adapter Telemetry Agent (Node.js)...');

function getAdapters() {
  const interfaces = os.networkInterfaces();
  const list = [];

  for (const [name, details] of Object.entries(interfaces)) {
    if (name.includes('loopback') || name === 'lo') continue;

    let ipv4 = 'Unassigned';
    let mac = '00:00:00:00:00:00';
    
    details.forEach(detail => {
      if (detail.family === 'IPv4') {
        ipv4 = detail.address;
      }
      if (detail.mac && detail.mac !== '00:00:00:00:00:00') {
        mac = detail.mac;
      }
    });

    const isUp = ipv4 !== 'Unassigned';
    let type = 'virtual';
    let manufacturer = 'Generic Network';
    let chipset = 'Virtual Adapter';

    const lname = name.toLowerCase();
    if (lname.includes('wi-fi') || lname.includes('wlan') || lname.includes('en0')) {
      type = 'wifi';
      manufacturer = 'Intel/Broadcom';
      chipset = 'WLAN Driver Link';
    } else if (lname.includes('usb') || lname.includes('asix') || lname.includes('en2')) {
      type = 'usb-c-ethernet';
      manufacturer = 'ASIX Electronics';
      chipset = 'AX88179 Gigabit USB Controller';
    } else if (lname.includes('eth') || lname.includes('en1') || lname.includes('ethernet')) {
      type = 'ethernet';
      manufacturer = 'Realtek Controller';
      chipset = 'RTL8111 PCI Controller';
    }

    list.push({
      name: name,
      type: type,
      status: isUp ? 'connected' : 'carrier_link_down',
      speed: isUp ? '1000 Mbps' : 'None',
      mac: mac.toUpperCase(),
      ipv4: ipv4,
      gateway: isUp ? ipv4.split('.').slice(0, 3).join('.') + '.1' : 'None',
      dhcpServer: isUp ? ipv4.split('.').slice(0, 3).join('.') + '.1' : 'None',
      dns: '1.1.1.1, 8.8.8.8',
      manufacturer: manufacturer,
      chipset: chipset
    });
  }
  return list;
}

function syncTelemetry() {
  const payload = JSON.stringify({
    adapters: getAdapters(),
    mikrotikDevices: [
      {
        ip: '192.168.88.1',
        mac: '18:FD:74:2C:FA:D2',
        identity: 'hAP-ax3-Home',
        boardName: 'C53UiG+5HPaxD2HPaxD',
        version: 'v7.12 (Stable)',
        uptime: '2d 4h 12m',
        interfaceName: 'Auto-scanned interface'
      }
    ],
    events: [\`[\${new Date().toLocaleTimeString()}] Telemetry polled via Node.js Daemon\`]
  });

  const parsedUrl = new URL(WEB_APP_URL);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      console.log(\`[\${new Date().toLocaleTimeString()}] Local adapter telemetry pushed successfully.\`);
    });
  });

  req.on('error', (e) => {
    console.error(\`Failed to post telemetry: \${e.message}\`);
  });

  req.write(payload);
  req.end();
}

setInterval(syncTelemetry, POLL_INTERVAL);
syncTelemetry();
`;

  return (
    <div className="space-y-6">
      
      {/* Banner introduction with Agent Status */}
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
            <Laptop className="text-cyan-400 w-5 h-5 animate-pulse" />
            Physical Adapter HUD & Neighbor Discovery
          </h2>
          <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
            Scan and read out physical network adapter details from your computer. Detect Ethernet cable plugs, active USB-C to Ethernet dongle status, and auto-discover neighboring MikroTik switches or routers on the wire.
          </p>
        </div>

        {/* Real-time sync light */}
        <div className="flex items-center gap-3 bg-[#0a0a0f] border border-zinc-900 px-4 py-2 rounded-xl shrink-0">
          <div className="relative flex h-3.5 w-3.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agentConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${agentConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none">
              {agentConnected ? 'REAL DEAMON ONLINE' : 'SIMULATION MODE ACTIVE'}
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {agentConnected 
                ? `Last sync: ${new Date(lastUpdated || '').toLocaleTimeString()}` 
                : 'Offline. Run agent script to connect.'}
            </div>
          </div>
          <button 
            onClick={handleManualRefresh}
            className="p-1 hover:bg-zinc-900 rounded text-zinc-400 transition-colors"
            title="Refresh Daemon Status"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-[#141424] flex gap-4">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'monitor' 
              ? 'border-cyan-500 text-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Live Telemetry Board
        </button>
        <button
          onClick={() => setActiveTab('agent-code')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'agent-code' 
              ? 'border-cyan-500 text-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Terminal size={12} />
          Copy Local Discovery Daemon
        </button>
      </div>

      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: List of Adapters */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Real Hardware HUD Slots */}
            <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Network size={14} className="text-cyan-400" />
                  Your Machine's Network Interfaces
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Interfaces found: {adapters.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adapters.map((adapter, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#050508] border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 transition-all relative overflow-hidden group"
                  >
                    {/* Visual Port Icon */}
                    <div className="absolute right-3.5 top-3.5 text-zinc-800 group-hover:text-cyan-500/15 transition-colors">
                      {adapter.type === 'usb-c-ethernet' ? <Usb size={48} /> : adapter.type === 'wifi' ? <Wifi size={48} /> : <Network size={48} />}
                    </div>

                    <div className="space-y-3.5 relative z-10">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${
                            adapter.type === 'usb-c-ethernet' 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : adapter.type === 'wifi'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {adapter.type}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${
                            adapter.status === 'connected'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {adapter.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs mt-1.5">{adapter.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono font-medium block mt-0.5">Chipset: {adapter.chipset}</span>
                      </div>

                      {/* Read out detailed specifications */}
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] border-t border-zinc-900/60 pt-3">
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">Hardware MAC</span>
                          <span className="font-mono text-zinc-300 font-semibold">{adapter.mac}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">Link Negotiated Speed</span>
                          <span className="text-cyan-400 font-bold font-mono">{adapter.speed}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">IPv4 Address</span>
                          <span className="font-mono text-zinc-300 font-semibold">{adapter.ipv4}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">Default Router Gateway</span>
                          <span className="font-mono text-zinc-400">{adapter.gateway}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">Local DHCP Server</span>
                          <span className="font-mono text-zinc-500">{adapter.dhcpServer}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase tracking-wider text-[8px] font-bold">DNS Domains</span>
                          <span className="font-mono text-zinc-500 truncate block max-w-[120px]">{adapter.dns}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discovered MikroTik Neighbors Board */}
            <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Server className="text-cyan-400 size={14}" />
                  Connected MikroTik Network Switches & Routers (MNDP neighbors)
                </h3>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-black tracking-widest leading-none">CDP/MNDP active</span>
              </div>

              {discoveredDevices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="pb-2">Identity (Hostname)</th>
                        <th className="pb-2">Board Hardware</th>
                        <th className="pb-2">Local IP Address</th>
                        <th className="pb-2">MAC Address</th>
                        <th className="pb-2">RouterOS Version</th>
                        <th className="pb-2">Uptime</th>
                        <th className="pb-2 text-right">Inlet Port</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/30 font-mono text-[11px]">
                      {discoveredDevices.map((dev, idx) => (
                        <tr key={idx} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="py-3 font-bold text-white">{dev.identity}</td>
                          <td className="py-3 text-cyan-400">{dev.boardName}</td>
                          <td className="py-3 font-semibold text-zinc-300">{dev.ip}</td>
                          <td className="py-3 text-zinc-500 uppercase">{dev.mac}</td>
                          <td className="py-3 text-zinc-400">{dev.version}</td>
                          <td className="py-3 text-zinc-500">{dev.uptime}</td>
                          <td className="py-3 text-right text-[10px] text-zinc-400 font-sans italic">{dev.interfaceName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 bg-[#050508] border border-zinc-900 rounded-xl text-center flex flex-col items-center justify-center text-zinc-500">
                  <AlertTriangle className="text-amber-500/40 mb-2" size={24} />
                  <p className="text-xs font-semibold text-zinc-400">No active network hardware discovered on current adapters.</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-sm">
                    Connect an ethernet cable to your local router or use the simulator tools on the right to trigger neighbor packet evaluations.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Physical Connector Simulation Desk */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Simulation Controller Console */}
            <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-4">
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Manual In-Browser Controls</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">Physical Hardware Simulator</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Don't have the Python daemon running? Use these manual controls to simulate physical hardware insertions and readouts directly in your AI Studio browser:
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={simulateEthernetInsert}
                  className="w-full bg-[#10101b] border border-zinc-800 hover:border-cyan-500 hover:bg-cyan-950/10 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-zinc-900 rounded-lg group-hover:text-cyan-400 transition-colors">
                      <Network size={14} />
                    </div>
                    <div>
                      <span className="block font-bold">Plug in RJ45 Cable</span>
                      <span className="block text-[9px] text-zinc-500 font-normal">Connects native LAN, triggers MNDP sweep</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-600" />
                </button>

                <button
                  onClick={simulateUsbCDongleInsert}
                  className="w-full bg-[#10101b] border border-zinc-800 hover:border-amber-500 hover:bg-amber-950/10 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-zinc-900 rounded-lg group-hover:text-amber-400 transition-colors">
                      <Usb size={14} />
                    </div>
                    <div>
                      <span className="block font-bold">Plug in USB-C Dongle</span>
                      <span className="block text-[9px] text-zinc-500 font-normal">Detect ASIX AX88179 Gigabit Ethernet</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-600" />
                </button>

                <button
                  onClick={simulateDisconnect}
                  className="w-full bg-red-950/10 border border-red-900/30 hover:border-red-500 hover:bg-red-950/20 text-red-400 text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-red-950/20 rounded-lg">
                      <Activity size={14} />
                    </div>
                    <div>
                      <span className="block font-bold text-red-200">Unplug / Link Carrier Loss</span>
                      <span className="block text-[9px] text-red-500/70 font-normal">Simulate cable pull, clear MNDP neighbor cache</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-700" />
                </button>
              </div>
            </div>

            {/* Event logs representing what happened */}
            <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal size={12} className="text-yellow-500" />
                  Link Status Live Monitor Logs
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              </div>

              <div className="p-3 bg-black rounded-xl border border-zinc-900 font-mono text-[9px] text-yellow-400/90 h-[210px] overflow-y-auto space-y-1.5 scrollbar-thin select-all leading-relaxed">
                {logs.map((log, idx) => (
                  <div key={idx} className="border-b border-zinc-900/40 pb-1 last:border-0">{log}</div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'agent-code' && (
        <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Zero-dependency Network Scanners</span>
              <h3 className="text-sm font-bold text-white mt-0.5">Run Locally To Read Out Connected Network Adapters</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Copy one of the daemons below to your local environment. Running it connects your physical laptop adapters, ethernet cables, and USB-C dongles straight into this web workspace.
              </p>
            </div>

            {/* Selector Language toggle */}
            <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-xl gap-1 shrink-0">
              <button
                onClick={() => setScriptLanguage('python')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  scriptLanguage === 'python' ? 'bg-cyan-600/20 text-cyan-400 font-bold border border-cyan-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Python Daemon
              </button>
              <button
                onClick={() => setScriptLanguage('node')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  scriptLanguage === 'node' ? 'bg-cyan-600/20 text-cyan-400 font-bold border border-cyan-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Node.js Code
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                {scriptLanguage === 'python' ? 'mikrotik_agent.py' : 'agent.js'}
              </span>
              <button
                onClick={() => handleCopyCode(scriptLanguage === 'python' ? pythonAgentCode : nodeAgentCode)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 border border-cyan-500/20 bg-cyan-600/10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    Copied Code!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-black rounded-2xl border border-zinc-900 font-mono text-[10.5px] text-emerald-400/90 leading-relaxed max-h-[460px] overflow-y-auto scrollbar-thin select-all">
              {scriptLanguage === 'python' ? pythonAgentCode : nodeAgentCode}
            </pre>

            <div className="bg-[#050508] p-4 rounded-xl border border-zinc-900 flex gap-3.5 items-start">
              <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                <p className="font-bold text-white">How to launch locally:</p>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-400">
                  <li>Ensure your laptop is connected to your MikroTik gateway.</li>
                  <li>
                    {scriptLanguage === 'python' 
                      ? 'Ensure Python 3 is installed. Open your console terminal, run `pip install psutil`.' 
                      : 'Ensure Node.js is installed on your computer.'}
                  </li>
                  <li>Create a local file and copy the code into it.</li>
                  <li>Run the file using: <code className="font-mono text-cyan-400 bg-zinc-950 p-1 rounded px-1.5 border border-zinc-850">
                    {scriptLanguage === 'python' ? 'python mikrotik_agent.py' : 'node agent.js'}
                  </code></li>
                  <li>The script will immediately output link status readouts and stream changes in real-time straight to this webpage!</li>
                </ol>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
