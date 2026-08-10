import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Network, Globe, Router, Cpu, Radio, ShieldAlert, Laptop, 
  ArrowRight, Server, Info, Terminal, Copy, RefreshCw, Pin, 
  Navigation, CheckCircle2, Shield, Settings, Sliders, HelpCircle,
  Search, Compass, Plus
} from 'lucide-react';

interface TopologyNode {
  id: string;
  label: string;
  type: 'isp' | 'router' | 'switch' | 'ap' | 'client' | 'bridge';
  ipAddress?: string;
  details: string;
  cliCommand: string;
  status: 'online' | 'offline' | 'bridge';
  // Physical Coordinate System Properties
  x: number; // grid pixel X relative to 800px width
  y: number; // grid pixel Y relative to 500px height
  model: string;
  macAddress: string;
  physicalLocation: string;
}

export default function NetworkTopology() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Drag state trackers
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Selected node tracker (using ID)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('r1');
  const [copiedIndex, setCopiedIndex] = useState<boolean>(false);
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);

  // Default coordinate layouts (representing initial logical flow placements)
  const defaultNodes: TopologyNode[] = [
    {
      id: 'lte1',
      label: 'LTE1 WAN Uplink',
      type: 'isp',
      ipAddress: 'Pass-through Mode',
      details: 'LTE interface configured in pass-through mode, handing off the public IP address directly to the main firewall interface without double-NAT latency.',
      cliCommand: '/interface lte apn add apn=internet.telecom passthrough-interface=ether1 passthrough-mac=auto\n/interface lte set [ find default-name=lte1 ] apn-profiles=internet.telecom',
      status: 'online',
      x: 100,
      y: 40,
      model: 'LtAP-mini-LTE',
      macAddress: '74:4D:28:11:AA:BB',
      physicalLocation: 'Outdoor Mast (Roof A-Block)'
    },
    {
      id: 'r1',
      label: 'Core Router (R1)',
      type: 'router',
      ipAddress: '192.168.88.1',
      details: 'MikroTik CCR2004 gateway hosting main routing tables, firewall filters, DHCP servers, Wave2 CAPsMAN controller, WireGuard VPN endpoints, and RoMON services.',
      cliCommand: '/system identity set name=R1-Core-Gateway\n/tool romon set enabled=yes\n/system clock set time-zone-name=Europe/Berlin',
      status: 'online',
      x: 310,
      y: 110,
      model: 'CCR2004-16G-2S+',
      macAddress: '74:4D:28:9A:BC:12',
      physicalLocation: 'Server Rack A (Basement)'
    },
    {
      id: 'sw1',
      label: 'CRS326 Switch',
      type: 'switch',
      ipAddress: '192.168.88.2',
      details: 'Cloud Router Switch CRS326 handling hardware-offloaded VLAN filtering, bridging, and Spanning Tree protocol execution.',
      cliCommand: '/interface bridge set bridge-vlan vlan-filtering=yes\n/interface bridge port add bridge=bridge-vlan interface=ether2 pvid=10',
      status: 'online',
      x: 310,
      y: 250,
      model: 'CRS326-24G-2S+RM',
      macAddress: '74:4D:28:44:EE:FF',
      physicalLocation: 'Server Rack B (Basement)'
    },
    {
      id: 'ptp-ap',
      label: '5GHz PTP Bridge (Local)',
      type: 'bridge',
      ipAddress: '192.168.88.10',
      details: '5 GHz high-speed wireless PtP Master bridge configured on high gain antennas, using the 2.4 GHz channel independently for auxiliary CAPsMAN client provisioning.',
      cliCommand: '/interface wireless set [ find default-name=wlan2 ] band=5ghz-a/n/ac mode=bridge ssid=PtP-Link-Backhaul\n/interface wireless set [ find default-name=wlan1 ] band=2ghz-b/g/n mode=station-bridge',
      status: 'online',
      x: 520,
      y: 40,
      model: 'RBLHGG-60ad (Master)',
      macAddress: '74:4D:28:60:BB:CC',
      physicalLocation: 'East Wall Exterior Mount'
    },
    {
      id: 'ptp-station',
      label: '5GHz PTP Station (Remote)',
      type: 'bridge',
      ipAddress: '192.168.88.11',
      details: 'Remote endpoint client node in the 5GHz PtP bridge, completing the layer-2 wireless transparent link.',
      cliCommand: '/interface wireless set [ find default-name=wlan2 ] band=5ghz-a/n/ac mode=station-bridge ssid=PtP-Link-Backhaul',
      status: 'online',
      x: 720,
      y: 40,
      model: 'RBLHGG-60ad (Remote)',
      macAddress: '74:4D:28:60:BB:DD',
      physicalLocation: 'Guest House Roof Mast'
    },
    {
      id: 'capsman-ap',
      label: 'Wave2 CAP AP',
      type: 'ap',
      ipAddress: 'Managed via CAPsMAN',
      details: 'Wave2 managed Access Point. Deploys dynamic high-throughput radios. Automatically broadcasts Main Wi-Fi (VLAN 10) and Guest isolated network (VLAN 20).',
      cliCommand: '/interface wifi cap set enabled=yes caps-man-addresses=192.168.88.1 interfaces=wifi1,wifi2 discovery-interfaces=bridge-vlan',
      status: 'online',
      x: 520,
      y: 250,
      model: 'hAP ax³ (C53UiG)',
      macAddress: '74:4D:28:AA:77:88',
      physicalLocation: 'Main Lobby Ceiling Center'
    },
    {
      id: 'vlan10',
      label: 'Main VLAN 10 Subnet',
      type: 'client',
      ipAddress: '192.168.10.0/24',
      details: 'Secure internal corporate network. Spanning tree RSTP/MSTP active. Direct access to secure services, NAS, and authorized servers.',
      cliCommand: '/interface vlan add interface=bridge-vlan name=vlan10-main vlan-id=10\n/ip address add address=192.168.10.1/24 interface=vlan10-main network=192.168.10.0',
      status: 'online',
      x: 100,
      y: 380,
      model: 'Corporate Workstation Pool',
      macAddress: 'VIRTUAL-SEGMENT-10',
      physicalLocation: 'Office Rooms A-F'
    },
    {
      id: 'vlan20',
      label: 'Guest VLAN 20 Subnet',
      type: 'client',
      ipAddress: '192.168.20.0/24',
      details: 'Isolated network domain for guests and IoT devices. Strict firewall filter blocks transit to the Main VLAN 10 or local WinBox control ports.',
      cliCommand: '/interface vlan add interface=bridge-vlan name=vlan20-guest vlan-id=20\n/ip address add address=192.168.20.1/24 interface=vlan20-guest network=192.168.20.0',
      status: 'online',
      x: 520,
      y: 380,
      model: 'Isolated Guest Device Pool',
      macAddress: 'VIRTUAL-SEGMENT-20',
      physicalLocation: 'Lobby & Waiting Area'
    }
  ];

  const [nodesState, setNodesState] = useState<TopologyNode[]>(defaultNodes);

  // Derived selected node reference
  const selectedNode = nodesState.find(n => n.id === selectedNodeId) || null;

  // Layout Link Definitions using state for dynamic modifications
  const [linksState, setLinksState] = useState([
    { from: 'lte1', to: 'r1', label: 'Ethernet WAN', color: '#06b6d4', style: 'dashed' },
    { from: 'r1', to: 'sw1', label: '10G SFP+ Link', color: '#6366f1', style: 'solid' },
    { from: 'sw1', to: 'ptp-ap', label: 'PoE Trunk', color: '#6366f1', style: 'solid' },
    { from: 'ptp-ap', to: 'ptp-station', label: '5GHz Backhaul', color: '#06b6d4', style: 'dashed' },
    { from: 'sw1', to: 'capsman-ap', label: 'CAP Feed', color: '#10b981', style: 'solid' },
    { from: 'sw1', to: 'vlan10', label: 'VLAN 10 Route', color: '#10b981', style: 'solid' },
    { from: 'sw1', to: 'vlan20', label: 'VLAN 20 Route', color: '#f59e0b', style: 'solid' }
  ]);

  // RoMON Neighborhood state configurations
  interface RomonNeighbor {
    id: string;
    romonId: string;
    label: string;
    identity: string;
    model: string;
    macAddress: string;
    port: string;
    hops: number;
    cost: number;
    ipAddress?: string;
    isMapped: boolean;
    type: 'router' | 'switch' | 'ap' | 'client' | 'bridge';
    details: string;
    cliCommand: string;
    physicalLocation: string;
    x: number;
    y: number;
  }

  const [romonScanStatus, setRomonScanStatus] = useState<'idle' | 'scanning' | 'completed'>('idle');
  const [romonLogs, setRomonLogs] = useState<string[]>([]);
  
  const [romonNeighbors, setRomonNeighbors] = useState<RomonNeighbor[]>([
    {
      id: 'r1',
      romonId: '74:4D:28:9A:BC:12',
      label: 'Core Router (R1)',
      identity: 'R1-Core-Gateway',
      model: 'CCR2004-16G-2S+',
      macAddress: '74:4D:28:9A:BC:12',
      port: 'romon-local',
      hops: 0,
      cost: 0,
      ipAddress: '192.168.88.1',
      isMapped: true,
      type: 'router',
      details: 'Core Router (CCR)',
      cliCommand: '',
      physicalLocation: 'Server Rack A',
      x: 310,
      y: 110
    },
    {
      id: 'sw1',
      romonId: '74:4D:28:44:EE:FF',
      label: 'CRS326 Switch',
      identity: 'CRS326-Core-Switch',
      model: 'CRS326-24G-2S+RM',
      macAddress: '74:4D:28:44:EE:FF',
      port: 'sfp-sfpplus1',
      hops: 1,
      cost: 10,
      ipAddress: '192.168.88.2',
      isMapped: true,
      type: 'switch',
      details: 'Bridge Switch',
      cliCommand: '',
      physicalLocation: 'Server Rack B',
      x: 310,
      y: 250
    },
    {
      id: 'capsman-ap',
      romonId: '74:4D:28:AA:77:88',
      label: 'Wave2 CAP AP',
      identity: 'hAP-ax3-Lobby',
      model: 'hAP ax³ (C53UiG)',
      macAddress: '74:4D:28:AA:77:88',
      port: 'ether1',
      hops: 2,
      cost: 20,
      ipAddress: 'Managed via CAPsMAN',
      isMapped: true,
      type: 'ap',
      details: 'Lobby Access Point',
      cliCommand: '',
      physicalLocation: 'Lobby Ceiling',
      x: 520,
      y: 250
    },
    {
      id: 'crs112',
      romonId: '74:4D:28:C2:B3:A4',
      label: 'CRS112 Annex Switch',
      identity: 'CRS112-Remote-Annex',
      model: 'CRS112-8P-4S-IN',
      macAddress: '74:4D:28:C2:B3:A4',
      port: 'sfp-sfpplus2',
      hops: 2,
      cost: 15,
      ipAddress: '192.168.88.3',
      isMapped: false,
      type: 'switch',
      details: 'Cloud Router Switch CRS112 handling layer-2 flow forwarding and PoE out to local VoIP interfaces.',
      cliCommand: '/system identity set name=CRS112-Remote-Annex\n/tool romon set enabled=yes\n/interface bridge add name=bridge-romon',
      physicalLocation: 'Annex Rack C (East Block)',
      x: 100,
      y: 230
    },
    {
      id: 'wap-outdoor',
      romonId: '74:4D:28:88:55:66',
      label: 'wAP Outdoor AP',
      identity: 'wAP-ac-Courtyard',
      model: 'wAP ac (RBwAPG)',
      macAddress: '74:4D:28:88:55:66',
      port: 'ether24',
      hops: 3,
      cost: 25,
      ipAddress: 'Managed via CAPsMAN',
      isMapped: false,
      type: 'ap',
      details: 'Weatherproof high-power wireless access point configured for dual-band courtyard clients.',
      cliCommand: '/system identity set name=wAP-ac-Courtyard\n/tool romon set enabled=yes\n/interface wireless cap set enabled=yes discovery-interfaces=bridge',
      physicalLocation: 'Courtyard Exterior Wall',
      x: 720,
      y: 230
    }
  ]);

  const startRomonScan = () => {
    setRomonScanStatus('scanning');
    setRomonLogs([
      `${new Date().toLocaleTimeString()} romon,info enabled`,
      `${new Date().toLocaleTimeString()} romon,info interface bridge added`,
    ]);

    const logsList = [
      { t: 400, m: 'romon,debug,packet sent discovery on ether1' },
      { t: 800, m: 'romon,info discovered neighbor 74:4D:28:9A:BC:12 identity=CCR2004 hops=0' },
      { t: 1200, m: 'romon,info discovered neighbor 74:4D:28:44:EE:FF identity=CRS326-Core-Switch hops=1' },
      { t: 1600, m: 'romon,debug,packet query sent to 74:4D:28:44:EE:FF' },
      { t: 2000, m: 'romon,info discovered neighbor 74:4D:28:AA:77:88 identity=hAP-ax3-Lobby hops=2' },
      { t: 2400, m: 'romon,info discovered neighbor 74:4D:28:C2:B3:A4 identity=CRS112-Remote-Annex hops=2' },
      { t: 2800, m: 'romon,info discovered neighbor 74:4D:28:88:55:66 identity=wAP-ac-Courtyard hops=3' },
      { t: 3400, m: 'romon,info scan completed, 5 neighbors found' }
    ];

    logsList.forEach(item => {
      setTimeout(() => {
        setRomonLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${item.m}`]);
      }, item.t);
    });

    setTimeout(() => {
      setRomonScanStatus('completed');
    }, 3800);
  };

  const handleMapRomonDevice = (neighborId: string) => {
    const neighbor = romonNeighbors.find(n => n.id === neighborId);
    if (!neighbor) return;

    // Check if already mapped
    if (nodesState.some(node => node.id === neighbor.id)) return;

    // 1. Add node to nodesState
    const newNode: TopologyNode = {
      id: neighbor.id,
      label: neighbor.label,
      type: neighbor.type,
      ipAddress: neighbor.ipAddress || 'L2 Layer-Only',
      details: neighbor.details,
      cliCommand: neighbor.cliCommand,
      status: 'online',
      x: neighbor.x,
      y: neighbor.y,
      model: neighbor.model,
      macAddress: neighbor.macAddress,
      physicalLocation: neighbor.physicalLocation
    };

    setNodesState(prev => [...prev, newNode]);

    // 2. Add link connection
    const newLink = {
      from: 'sw1', // attaches to our main CRS326 switch
      to: neighbor.id,
      label: neighbor.type === 'switch' ? 'Trunk Feed' : 'CAP Feed',
      color: neighbor.type === 'switch' ? '#6366f1' : '#10b981',
      style: 'solid' as const
    };
    
    setLinksState(prev => [...prev, newLink]);

    // Update mapped status in our RoMON neighbors list
    setRomonNeighbors(prev => prev.map(rn => {
      if (rn.id === neighborId) {
        return { ...rn, isMapped: true };
      }
      return rn;
    }));

    // Auto-select the newly added node to inspect it
    setSelectedNodeId(neighbor.id);
  };

  // Helper formula to compute physical distance coordinates
  // Centered at R1 gateway (origin (0,0))
  // 15 pixels representing 1 meter of space
  const getPhysicalMetadata = (node: TopologyNode) => {
    const r1Node = nodesState.find(n => n.id === 'r1');
    if (!r1Node) return { x: '0.0m', y: '0.0m', dist: '0.0m' };
    
    const dx = node.x - r1Node.x;
    const dy = r1Node.y - node.y; // Invert Y coordinate so upward movement is positive offset
    
    const physicalX = (dx / 15).toFixed(1);
    const physicalY = (dy / 15).toFixed(1);
    const dist = Math.sqrt(Math.pow(dx / 15, 2) + Math.pow(dy / 15, 2)).toFixed(1);
    
    return {
      x: `${physicalX}m`,
      y: `${physicalY}m`,
      dist: `${dist}m`
    };
  };

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    // Left-click/primary touch only
    if (e.button !== 0) return;
    
    setSelectedNodeId(nodeId);
    setDraggedNodeId(nodeId);

    const containerRect = containerRef.current?.getBoundingClientRect();
    const nodeElement = e.currentTarget.getBoundingClientRect();
    
    if (containerRect) {
      const clickX = e.clientX - containerRect.left;
      const clickY = e.clientY - containerRect.top;
      
      const node = nodesState.find(n => n.id === nodeId);
      if (node) {
        setDragOffset({
          x: clickX - node.x,
          y: clickY - node.y
        });
      }
    }
    
    // Set pointer capture to lock mouse moves to this element
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedNodeId) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const pointerX = e.clientX - containerRect.left;
      const pointerY = e.clientY - containerRect.top;
      
      let newX = pointerX - dragOffset.x;
      let newY = pointerY - dragOffset.y;
      
      // Node dimensions: w-48 (192px) h-20 (80px)
      const nodeWidth = 192;
      const nodeHeight = 80;
      const containerWidth = containerRect.width;
      const containerHeight = 500; // Fixed canvas viewport height

      // Constrain coordinates inside interactive bounds
      newX = Math.max(0, Math.min(containerWidth - nodeWidth, newX));
      newY = Math.max(0, Math.min(containerHeight - nodeHeight, newY));

      setNodesState(prev => prev.map(n => {
        if (n.id === draggedNodeId) {
          return { ...n, x: Math.round(newX), y: Math.round(newY) };
        }
        return n;
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, nodeId: string) => {
    if (draggedNodeId === nodeId) {
      setDraggedNodeId(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleResetLayout = () => {
    setNodesState(defaultNodes);
    setLinksState([
      { from: 'lte1', to: 'r1', label: 'Ethernet WAN', color: '#06b6d4', style: 'dashed' },
      { from: 'r1', to: 'sw1', label: '10G SFP+ Link', color: '#6366f1', style: 'solid' },
      { from: 'sw1', to: 'ptp-ap', label: 'PoE Trunk', color: '#6366f1', style: 'solid' },
      { from: 'ptp-ap', to: 'ptp-station', label: '5GHz Backhaul', color: '#06b6d4', style: 'dashed' },
      { from: 'sw1', to: 'capsman-ap', label: 'CAP Feed', color: '#10b981', style: 'solid' },
      { from: 'sw1', to: 'vlan10', label: 'VLAN 10 Route', color: '#10b981', style: 'solid' },
      { from: 'sw1', to: 'vlan20', label: 'VLAN 20 Route', color: '#f59e0b', style: 'solid' }
    ]);
    setRomonNeighbors(prev => prev.map(rn => {
      if (rn.id === 'crs112' || rn.id === 'wap-outdoor') {
        return { ...rn, isMapped: false };
      }
      return { ...rn, isMapped: true };
    }));
    setRomonScanStatus('idle');
    setRomonLogs([]);
    setSelectedNodeId('r1');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(true);
    setTimeout(() => setCopiedIndex(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b0b10] border border-[#141424] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="text-cyan-400 w-5 h-5 animate-pulse" />
            Active Topology &amp; Physical Device Mapper
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Displays detected MikroTik devices based on estimated coordinates. <strong>Drag and drop nodes</strong> on the canvas grid below to align your floorplan, adjust device elevations, or customize the network diagram layout in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleResetLayout}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset node layouts to default logical diagram values"
          >
            <RefreshCw size={13} className="text-zinc-400" />
            Reset Diagram
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Draggable Physical Mapping Canvas */}
        <div className="xl:col-span-8 space-y-3">
          {/* Canvas Toolbar Info */}
          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Origin: CCR Gateway
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> Drag-to-Map active
              </span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showRadarRings} 
                  onChange={(e) => setShowRadarRings(e.target.checked)} 
                  className="rounded bg-[#050508] border-zinc-800 text-cyan-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer" 
                />
                Estimated Range Rings
              </label>
              <span>Scale: 15px = 1m</span>
            </div>
          </div>

          <div 
            ref={containerRef}
            onPointerMove={handlePointerMove}
            className="relative w-full h-[500px] bg-[#050508] border border-zinc-900 rounded-2xl overflow-hidden select-none touch-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
          >
            {/* Background SVG Canvas for connection links, radar, and grid */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6, 182, 212, 0.03)" strokeWidth="1" />
                </pattern>
                {/* Concentric ambient layout shadows */}
                <radialGradient id="ambient-core" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.07)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>

              {/* Grid backdrop */}
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* Range Circles from Core Router */}
              {romonScanStatus === 'scanning' && (() => {
                const r1Node = nodesState.find(n => n.id === 'r1');
                if (!r1Node) return null;
                const cx = r1Node.x + 96;
                const cy = r1Node.y + 40;
                return (
                  <g key="romon-radar-scan">
                    {/* Pulsing scanning waves */}
                    <circle cx={cx} cy={cy} r="350" fill="none" stroke="#22d3ee" strokeWidth="2" className="opacity-0">
                      <animate attributeName="r" values="30;350;500" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.3;0" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke" values="#22d3ee;#6366f1;rgba(0,0,0,0)" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r="200" fill="none" stroke="#6366f1" strokeWidth="1.5" className="opacity-0">
                      <animate attributeName="r" values="10;200;350" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0.4;0" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    {/* Sweeping radar beam */}
                    <line 
                      x1={cx} 
                      y1={cy} 
                      x2={cx + 600} 
                      y2={cy} 
                      stroke="rgba(6, 182, 212, 0.45)" 
                      strokeWidth="2.5" 
                      style={{ transformOrigin: `${cx}px ${cy}px` }}
                      className="origin-center animate-[spin_4s_linear_infinite]" 
                    />
                    <line 
                      x1={cx} 
                      y1={cy} 
                      x2={cx - 600} 
                      y2={cy} 
                      stroke="rgba(99, 102, 241, 0.25)" 
                      strokeWidth="1.5" 
                      style={{ transformOrigin: `${cx}px ${cy}px` }}
                      className="origin-center animate-[spin_4s_linear_infinite]" 
                    />
                  </g>
                );
              })()}

              {showRadarRings && (() => {
                const r1Node = nodesState.find(n => n.id === 'r1');
                if (!r1Node) return null;
                const cx = r1Node.x + 96; // Half of node width (192/2)
                const cy = r1Node.y + 40; // Half of node height (80/2)
                return (
                  <g className="transition-all duration-300 opacity-60">
                    <circle cx={cx} cy={cy} fill="url(#ambient-core)" r="250" />
                    {/* 5 meters ring */}
                    <circle cx={cx} cy={cy} r="75" fill="none" stroke="rgba(6, 182, 212, 0.08)" strokeWidth="1" strokeDasharray="4,4" />
                    <text x={cx} y={cy - 80} fill="rgba(6, 182, 212, 0.3)" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">5m Radius (Local Cabinets)</text>
                    
                    {/* 15 meters ring */}
                    <circle cx={cx} cy={cy} r="225" fill="none" stroke="rgba(99, 102, 241, 0.06)" strokeWidth="1" strokeDasharray="4,4" />
                    <text x={cx} y={cy - 230} fill="rgba(99, 102, 241, 0.25)" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">15m Radius (Local Office Zone)</text>

                    {/* 30 meters ring */}
                    <circle cx={cx} cy={cy} r="450" fill="none" stroke="rgba(99, 102, 241, 0.03)" strokeWidth="1" strokeDasharray="4,4" />
                    <text x={cx} y={cy - 455} fill="rgba(99, 102, 241, 0.15)" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">30m Radius (Structural Boundary)</text>
                  </g>
                );
              })()}

              {/* Map Connection Paths */}
              {linksState.map((link, idx) => {
                const fromNode = nodesState.find(n => n.id === link.from);
                const toNode = nodesState.find(n => n.id === link.to);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 96;
                const y1 = fromNode.y + 40;
                const x2 = toNode.x + 96;
                const y2 = toNode.y + 40;

                const isSelectedPath = selectedNodeId === link.from || selectedNodeId === link.to;

                return (
                  <g key={idx} className="transition-all duration-300">
                    {/* Glowing Underlay line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={link.color}
                      strokeWidth={isSelectedPath ? 5 : 2}
                      opacity={isSelectedPath ? 0.25 : 0.06}
                      className="transition-all duration-300"
                    />
                    {/* Core Structural Line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={link.color}
                      strokeWidth={isSelectedPath ? 2 : 1.5}
                      strokeDasharray={link.style === 'dashed' ? '5,5' : undefined}
                      opacity={isSelectedPath ? 0.9 : 0.4}
                      className="transition-all duration-300"
                    />
                    {/* Animated moving packet telemetry signal along the link */}
                    <circle r="2.5" fill={link.color} opacity={isSelectedPath ? 1 : 0.7}>
                      <animateMotion
                        dur={link.style === 'dashed' ? '4s' : '2.5s'}
                        repeatCount="indefinite"
                        path={`M ${x1} ${y1} L ${x2} ${y2}`}
                      />
                    </circle>
                    {/* Midpoint physical path annotation */}
                    <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 8})`}>
                      <rect
                        x="-36"
                        y="-6"
                        width="72"
                        height="12"
                        rx="3"
                        fill="#050508"
                        stroke="rgba(63, 63, 70, 0.4)"
                        strokeWidth="0.5"
                        opacity="0.85"
                      />
                      <text
                        fill="rgba(161, 161, 170, 0.9)"
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                        y="2.5"
                      >
                        {link.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Draggable HTML Nodes Container */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {nodesState.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isDragging = draggedNodeId === node.id;
                const coords = getPhysicalMetadata(node);

                return (
                  <div
                    key={node.id}
                    style={{ 
                      left: `${node.x}px`, 
                      top: `${node.y}px`,
                      position: 'absolute'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, node.id)}
                    onPointerUp={(e) => handlePointerUp(e, node.id)}
                    className={`pointer-events-auto w-48 h-20 rounded-xl border p-2.5 transition-shadow cursor-grab active:cursor-grabbing touch-none flex flex-col justify-between ${
                      isSelected 
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.18)] z-30' 
                        : 'border-zinc-800 bg-[#0c0c12]/90 hover:border-zinc-700 hover:bg-[#0f0f18]/95 z-20'
                    } ${isDragging ? 'opacity-85 shadow-lg' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {node.type === 'router' && <Router className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-indigo-500'}`} />}
                        {node.type === 'switch' && <Server className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-indigo-500'}`} />}
                        {node.type === 'isp' && <Globe className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-cyan-500'}`} />}
                        {node.type === 'ap' && <Radio className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-emerald-500'}`} />}
                        {node.type === 'bridge' && <Radio className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-cyan-500'}`} />}
                        {node.type === 'client' && <Laptop className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500'}`} />}
                        
                        <div className="truncate">
                          <span className={`text-[11px] font-bold block leading-none truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                            {node.label}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-mono block leading-none mt-0.5">
                            {node.model}
                          </span>
                        </div>
                      </div>

                      {/* Status indicator badge */}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
                    </div>

                    {/* Coordinate readouts on the card footer */}
                    <div className="flex items-center justify-between border-t border-zinc-900 pt-1.5 text-[8px] font-mono">
                      <div className="text-zinc-500">
                        X: <span className="text-zinc-300">{coords.x}</span> Y: <span className="text-zinc-300">{coords.y}</span>
                      </div>
                      <div className="text-cyan-500/80 font-bold">
                        {node.id === 'r1' ? 'GATEWAY' : `Dist: ${coords.dist}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help notice */}
          <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl text-[11px] text-zinc-400 flex items-start gap-2.5">
            <Info size={14} className="text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-300 block mb-0.5">Physical Mapping Telemetry Guide</span>
              Coordinates are calculated dynamically relative to the <strong>Core Router (R1)</strong> baseline. Draggability allows you to reposition elements on the building blueprint. Distances and telemetry coordinates recompute instantly.
            </div>
          </div>
        </div>

        {/* Selected Node Details Panel / Inspector */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl h-full flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase bg-cyan-950/50 border border-cyan-850 px-2 py-0.5 rounded flex items-center gap-1">
                      <Pin size={8} /> Selected Device
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                      ACTIVE LINK
                    </span>
                  </div>
                  
                  <h3 className="text-white text-base font-bold mt-2.5 flex items-center gap-2">
                    {selectedNode.type === 'router' && <Router className="w-5 h-5 text-indigo-400" />}
                    {selectedNode.type === 'switch' && <Server className="w-5 h-5 text-indigo-400" />}
                    {selectedNode.type === 'isp' && <Globe className="w-5 h-5 text-cyan-400" />}
                    {selectedNode.type === 'ap' && <Radio className="w-5 h-5 text-emerald-400" />}
                    {selectedNode.type === 'bridge' && <Radio className="w-5 h-5 text-cyan-400" />}
                    {selectedNode.type === 'client' && <Laptop className="w-5 h-5 text-amber-400" />}
                    {selectedNode.label}
                  </h3>
                  {selectedNode.ipAddress && (
                    <span className="text-xs font-mono text-zinc-500 block mt-1">{selectedNode.ipAddress}</span>
                  )}
                </div>

                {/* Estimated Coordinates Detail Block */}
                <div className="space-y-2.5 border-y border-zinc-900 py-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation size={11} className="text-cyan-400" />
                    Estimated Spatial Telemetry
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-lg">
                      <span className="text-[8px] text-zinc-500 font-mono uppercase block">Local Offset X</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {getPhysicalMetadata(selectedNode).x}
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-lg">
                      <span className="text-[8px] text-zinc-500 font-mono uppercase block">Local Offset Y</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {getPhysicalMetadata(selectedNode).y}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-zinc-500 font-mono uppercase block">Est. Gateway Distance</span>
                      <span className="text-xs font-mono font-bold text-white">
                        {selectedNode.id === 'r1' ? '0.0m (Core Hub)' : getPhysicalMetadata(selectedNode).dist}
                      </span>
                    </div>
                    {selectedNode.id !== 'r1' && (
                      <span className="text-[9px] text-zinc-500 italic">
                        Relative to CCR R1
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] space-y-1 text-zinc-400 font-mono bg-[#050508] p-2.5 rounded-lg border border-zinc-900">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Hardware Model:</span>
                      <span className="text-zinc-300">{selectedNode.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">MAC Address:</span>
                      <span className="text-zinc-300">{selectedNode.macAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Est. Installation:</span>
                      <span className="text-zinc-300 truncate max-w-[130px]" title={selectedNode.physicalLocation}>
                        {selectedNode.physicalLocation}
                      </span>
                    </div>
                  </div>
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
                  <pre className="p-4 bg-black/95 text-cyan-400 font-mono text-[10px] rounded-xl overflow-x-auto border border-zinc-900 max-h-[200px] select-all">
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

      {/* RoMON Explorer & Mapping Panel */}
      <div className="bg-[#0a0a0f] border border-[#141422] p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="text-cyan-400 w-4 h-4" />
              RoMON Neighbors
            </h3>
            <p className="text-xs text-zinc-400">
              Router Management Overlay Network (RoMON) is a proprietary Layer-2 protocol that allows discovery and management of RouterOS devices.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={startRomonScan}
              disabled={romonScanStatus === 'scanning'}
              className="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border bg-cyan-950/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.05)]"
            >
              <RefreshCw size={13} className={romonScanStatus === 'scanning' ? 'animate-spin' : ''} />
              {romonScanStatus === 'scanning' ? 'Refreshing RoMON Neighbors...' : 'Refresh RoMON Neighbors'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Terminal Diagnostic Logs */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} className="text-cyan-500" />
                RoMON Log Stream
              </span>
              <span className="text-[9px] font-mono text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900/60 uppercase">
                EthType 0x88BF
              </span>
            </div>
            
            <div className="bg-[#050508]/95 border border-zinc-900 rounded-xl p-4 font-mono text-[10px] leading-relaxed overflow-y-auto h-[220px] shadow-inner space-y-1">
              {romonLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 italic space-y-2">
                  <Terminal size={24} className="opacity-40" />
                  <span>Terminal idle. Awaiting discovery broadcast command.</span>
                </div>
              ) : (
                romonLogs.map((log, index) => {
                  let logCol = 'text-zinc-400';
                  if (log.includes('complete') || log.includes('complete.')) logCol = 'text-emerald-400 font-bold';
                  else if (log.includes('Received') || log.includes('Discovered')) logCol = 'text-cyan-400';
                  else if (log.includes('Querying')) logCol = 'text-indigo-400';
                  
                  return (
                    <div key={index} className={`${logCol} border-b border-zinc-950/40 pb-1 flex items-start gap-1.5`}>
                      <span className="text-zinc-600 shrink-0 select-none">&gt;</span>
                      <span className="break-all">{log}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Neighbors Discovery & Action Center */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={12} className="text-indigo-400" />
                Discovered RouterOS Neighbors
              </span>
              {romonScanStatus === 'completed' && (
                <span className="text-[9px] font-bold text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                  SCAN COMPLETED
                </span>
              )}
            </div>

            <div className="bg-[#050508]/40 border border-zinc-900 rounded-xl p-1 overflow-hidden min-h-[220px] flex flex-col justify-between">
              {romonLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-600 italic space-y-2">
                  <Info size={28} className="opacity-40" />
                  <span>Awaiting L2 network scan to map hardware peers.</span>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900/60 max-h-[212px] overflow-y-auto">
                  {romonNeighbors.map((neighbor) => {
                    const isNodeAdded = nodesState.some(n => n.id === neighbor.id);
                    return (
                      <div key={neighbor.id} className="p-3 hover:bg-zinc-950/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{neighbor.identity}</span>
                            <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                              {neighbor.model}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-4 text-[10px] font-mono text-zinc-500">
                            <div>
                              RoMON ID: <span className="text-zinc-400">{neighbor.romonId}</span>
                            </div>
                            <div>
                              Port: <span className="text-zinc-400">{neighbor.port}</span>
                            </div>
                            <div>
                              Hops: <span className="text-cyan-400">{neighbor.hops}</span>
                            </div>
                            <div>
                              Cost: <span className="text-indigo-400">{neighbor.cost}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {isNodeAdded ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] bg-emerald-950/20 text-emerald-400 font-bold rounded-lg border border-emerald-900/40">
                              <CheckCircle2 size={11} />
                              Mapped to Canvas
                            </div>
                          ) : (
                            <button
                              onClick={() => handleMapRomonDevice(neighbor.id)}
                              className="px-3 py-1.5 text-[10px] bg-indigo-950/40 hover:bg-indigo-500 hover:text-white text-indigo-400 font-bold rounded-lg border border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-1 shadow-lg"
                            >
                              <Plus size={11} />
                              Map Discovered Device
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
