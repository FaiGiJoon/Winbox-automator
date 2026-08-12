import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Activity, Play, Pause, Square, Trash2, Download, Search, Filter, 
  ArrowDownRight, ArrowUpRight, Shield, ShieldAlert, Cpu, Terminal, 
  Zap, Copy, Check, ChevronRight, ChevronDown, Layers, FileCode,
  Radio, HardDrive, Wifi, Server, Database, Eye, EyeOff, RefreshCw, BarChart2
} from 'lucide-react';

export interface PacketFrame {
  id: number;
  timestamp: string;
  rawTime: Date;
  interfaceName: string;
  direction: 'RX' | 'TX';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'RTSP' | 'DNS' | 'WireGuard' | 'IPsec' | 'HTTPS' | 'ARP' | 'DHCP';
  length: number;
  info: string;
  macSrc: string;
  macDst: string;
  ttl: number;
  flags?: string;
  payloadPreview: string;
  hexDump: string;
  tcpSeq?: number;
  tcpAck?: number;
  isDrop?: boolean;
}

interface PacketSnifferProps {
  interfaces?: string[];
  onSelectPacket?: (packet: PacketFrame) => void;
}

interface GraphDataPoint {
  time: Date;
  rx: number;
  tx: number;
  packetCount: number;
}

export default function PacketSniffer({ 
  interfaces = ['vlan10-main', 'vlan20-guest', 'bridge-vlan', 'lte1', 'ether1-wan', 'wireguard1'] 
}: PacketSnifferProps) {
  
  // Capture Running State: 'running' | 'paused' | 'stopped'
  const [captureMode, setCaptureMode] = useState<'running' | 'paused' | 'stopped'>('running');
  const isCapturing = captureMode === 'running';
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState<boolean>(false);
  
  // Filter States
  const [selectedInterface, setSelectedInterface] = useState<string>('All');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<'ALL' | 'RX' | 'TX'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('normal');

  // Chart Overlay Toggle
  const [showGraphOverlay, setShowGraphOverlay] = useState<boolean>(true);

  // Captured Packets Buffer (max 300 items)
  const [packets, setPackets] = useState<PacketFrame[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState<number | null>(null);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  // D3 Chart Ref & Data
  const svgRef = useRef<SVGSVGElement | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const tableEndRef = useRef<HTMLDivElement | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    totalCount: 0,
    bytesCount: 0,
    rxCount: 0,
    txCount: 0,
    dropsCount: 0,
    tcpCount: 0,
    udpCount: 0,
    icmpCount: 0,
    otherCount: 0
  });

  // Graph Throughput History
  const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);

  // Generator Helper: Produce realistic Hex Dump string
  const generateHexDump = (proto: string, length: number, srcIp: string, dstIp: string) => {
    const hexChars = '0123456789abcdef';
    let hexString = '';
    let asciiString = '';
    
    // Header bytes prefix
    const bytesCount = Math.min(64, length);
    for (let i = 0; i < bytesCount; i++) {
      if (i % 16 === 0) {
        const offset = i.toString(16).padStart(4, '0');
        hexString += `0x${offset}:  `;
      }
      
      const byteVal = Math.floor(Math.random() * 256);
      const byteHex = byteVal.toString(16).padStart(2, '0');
      hexString += `${byteHex} `;
      
      // Printable ascii
      if (byteVal >= 32 && byteVal <= 126) {
        asciiString += String.fromCharCode(byteVal);
      } else {
        asciiString += '.';
      }

      if ((i + 1) % 8 === 0 && (i + 1) % 16 !== 0) {
        hexString += ' ';
      }

      if ((i + 1) % 16 === 0 || i === bytesCount - 1) {
        const padding = (16 - ((i + 1) % 16)) % 16;
        if (padding > 0 && i === bytesCount - 1) {
          hexString += '   '.repeat(padding);
        }
        hexString += ` | ${asciiString}\n`;
        asciiString = '';
      }
    }
    return hexString;
  };

  // Seed initial packets
  useEffect(() => {
    const initialPackets: PacketFrame[] = [];
    const now = new Date();

    for (let i = 15; i >= 1; i--) {
      const pktTime = new Date(now.getTime() - i * 800);
      const pkt = createRandomPacket(15 - i + 1, pktTime, activePreset);
      initialPackets.push(pkt);
    }

    setPackets(initialPackets);
    setSelectedPacketId(initialPackets[initialPackets.length - 1]?.id || null);
    
    // Initial stats
    updateStatsAndGraph(initialPackets);
  }, []);

  // Update statistics
  const updateStatsAndGraph = (currentPackets: PacketFrame[]) => {
    let bytes = 0;
    let rx = 0;
    let tx = 0;
    let drops = 0;
    let tcp = 0;
    let udp = 0;
    let icmp = 0;
    let other = 0;

    currentPackets.forEach(p => {
      bytes += p.length;
      if (p.direction === 'RX') rx++;
      else tx++;
      if (p.isDrop) drops++;

      if (p.protocol === 'TCP' || p.protocol === 'HTTPS' || p.protocol === 'RTSP') tcp++;
      else if (p.protocol === 'UDP' || p.protocol === 'DNS' || p.protocol === 'WireGuard' || p.protocol === 'DHCP') udp++;
      else if (p.protocol === 'ICMP') icmp++;
      else other++;
    });

    setStats({
      totalCount: currentPackets.length,
      bytesCount: bytes,
      rxCount: rx,
      txCount: tx,
      dropsCount: drops,
      tcpCount: tcp,
      udpCount: udp,
      icmpCount: icmp,
      otherCount: other
    });
  };

  // Random Packet Generator
  const createRandomPacket = (idNum: number, timeVal: Date, presetMode: string): PacketFrame => {
    const intfList = ['vlan10-main', 'vlan20-guest', 'bridge-vlan', 'lte1', 'ether1-wan', 'wireguard1'];
    const chosenIntf = intfList[Math.floor(Math.random() * intfList.length)];
    const isRx = Math.random() > 0.4;
    const direction: 'RX' | 'TX' = isRx ? 'RX' : 'TX';

    let protocol: PacketFrame['protocol'] = 'TCP';
    let srcIp = '192.168.10.45';
    let dstIp = '142.250.190.46';
    let srcPort = Math.floor(49152 + Math.random() * 15000);
    let dstPort = 443;
    let length = 128 + Math.floor(Math.random() * 1300);
    let info = '[ACK] Seq=1401 Ack=882 Win=65535 Len=1340';
    let flags = 'ACK';
    let isDrop = false;

    // Preset Overrides
    if (presetMode === 'rtsp') {
      protocol = 'RTSP';
      srcIp = '192.168.10.15'; // CCTV NVR
      dstIp = '192.168.10.100';
      srcPort = 554;
      dstPort = Math.floor(50000 + Math.random() * 2000);
      length = 1460;
      info = 'RTSP/1.0 200 OK (H.264 Video Stream RTP-Packet)';
      flags = 'PSH, ACK';
    } else if (presetMode === 'wireguard') {
      protocol = 'WireGuard';
      srcIp = '10.0.8.2';
      dstIp = '198.51.100.50';
      srcPort = 51820;
      dstPort = 51820;
      length = 1420;
      info = 'WireGuard Data Packet (Receiver Index: 0x4f12a8)';
    } else if (presetMode === 'dns') {
      protocol = 'DNS';
      srcIp = '192.168.10.120';
      dstIp = '1.1.1.1';
      srcPort = Math.floor(50000 + Math.random() * 5000);
      dstPort = 53;
      length = 78;
      info = 'Standard query 0x8a1c A api.github.com';
    } else if (presetMode === 'ping') {
      protocol = 'ICMP';
      srcIp = '192.168.10.1';
      dstIp = '192.168.20.104';
      srcPort = 0;
      dstPort = 0;
      length = 64;
      info = 'Echo (ping) request id=0x1f2e seq=12 ttl=64';
    } else if (presetMode === 'guest_drop') {
      protocol = 'TCP';
      srcIp = '192.168.20.104'; // Guest VLAN
      dstIp = '192.168.10.1';   // Management WinBox
      srcPort = Math.floor(52000 + Math.random() * 1000);
      dstPort = 8291; // WinBox Port
      length = 60;
      info = 'FIREWALL DROP: Guest VLAN isolated from WinBox mgmt';
      isDrop = true;
    } else {
      // General random distribution
      const randVal = Math.random();
      if (randVal < 0.35) {
        protocol = 'HTTPS';
        dstPort = 443;
        info = '[TLS Application Data] Encrypted Session Stream';
        flags = 'ACK';
      } else if (randVal < 0.55) {
        protocol = 'TCP';
        dstPort = 80;
        info = 'GET /api/v1/telemetry HTTP/1.1';
        flags = 'PSH, ACK';
      } else if (randVal < 0.70) {
        protocol = 'DNS';
        srcPort = Math.floor(50000 + Math.random() * 5000);
        dstPort = 53;
        dstIp = '8.8.8.8';
        length = 82;
        info = 'Standard query 0x3f42 A response.cloudflare.com';
      } else if (randVal < 0.85) {
        protocol = 'WireGuard';
        srcPort = 51820;
        dstPort = 51820;
        length = 1420;
        info = 'WireGuard Transport Packet (Key Index: 0x89e2)';
      } else if (randVal < 0.93) {
        protocol = 'RTSP';
        srcIp = '192.168.10.15';
        srcPort = 554;
        length = 1460;
        info = 'RTSP/1.0 200 OK (RTP/AVP Video Payload)';
      } else {
        protocol = 'ICMP';
        srcPort = 0;
        dstPort = 0;
        length = 64;
        info = 'Echo (ping) reply id=0x0a12 seq=8 ttl=64';
      }
    }

    const timeStr = timeVal.toLocaleTimeString('en-US', { hour12: false }) + '.' + timeVal.getMilliseconds().toString().padStart(3, '0');
    
    return {
      id: idNum,
      timestamp: timeStr,
      rawTime: timeVal,
      interfaceName: chosenIntf,
      direction,
      srcIp,
      srcPort,
      dstIp,
      dstPort,
      protocol,
      length,
      info,
      macSrc: `d4:60:e2:${Math.floor(10 + Math.random() * 80)}:${Math.floor(10 + Math.random() * 80)}:${Math.floor(10 + Math.random() * 80)}`,
      macDst: `ac:12:f4:${Math.floor(10 + Math.random() * 80)}:${Math.floor(10 + Math.random() * 80)}:${Math.floor(10 + Math.random() * 80)}`,
      ttl: 64,
      flags,
      isDrop,
      payloadPreview: `Header [0x00..0x36] Payload: ${info.substring(0, 45)}...`,
      hexDump: generateHexDump(protocol, length, srcIp, dstIp)
    };
  };

  // Live Packet Capture Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isCapturing) {
      interval = setInterval(() => {
        const now = new Date();

        setPackets(prev => {
          const nextId = (prev[prev.length - 1]?.id || 0) + 1;
          const newPkt = createRandomPacket(nextId, now, activePreset);
          const updated = [...prev, newPkt];
          
          // Limit buffer size to 250 items
          if (updated.length > 250) {
            updated.shift();
          }

          updateStatsAndGraph(updated);
          return updated;
        });

        // Update graph data point
        setGraphData(prev => {
          const rxSpeed = Math.floor(10 + Math.random() * 85);
          const txSpeed = Math.floor(8 + Math.random() * 65);
          const nextGraph = [...prev, { time: now, rx: rxSpeed, tx: txSpeed, packetCount: Math.floor(12 + Math.random() * 25) }];
          if (nextGraph.length > 30) nextGraph.shift();
          return nextGraph;
        });

      }, 750);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCapturing, activePreset]);

  // Auto scroll table
  useEffect(() => {
    if (autoScroll && tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [packets, autoScroll]);

  // Render D3 Overlay Chart
  useEffect(() => {
    if (!showGraphOverlay || !svgRef.current || !graphContainerRef.current || graphData.length === 0) return;

    const margin = { top: 15, right: 15, bottom: 25, left: 45 };
    const width = graphContainerRef.current.clientWidth;
    const height = 130;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(graphData, (d: GraphDataPoint) => d.time) as [Date, Date])
      .range([0, chartWidth]);

    const maxVal = d3.max(graphData, (d: GraphDataPoint) => Math.max(d.rx, d.tx)) || 100;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .range([chartHeight, 0]);

    // Grid
    g.append('g')
      .attr('class', 'grid stroke-zinc-900/60 opacity-30')
      .call(d3.axisLeft(y).ticks(3).tickSize(-chartWidth).tickFormat(() => ''));

    // Axes
    const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%H:%M:%S') as any);
    const yAxis = d3.axisLeft(y).ticks(3).tickFormat(d => `${d}M`);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .attr('class', 'text-zinc-600 font-mono text-[8px]')
      .call(xAxis);
    xAxisG.select('.domain').attr('stroke', '#27272a');

    const yAxisG = g.append('g')
      .attr('class', 'text-zinc-600 font-mono text-[8px]')
      .call(yAxis);
    yAxisG.select('.domain').attr('stroke', '#27272a');

    // Lines
    const rxLine = d3.line<{ time: Date; rx: number; tx: number }>()
      .x(d => x(d.time))
      .y(d => y(d.rx))
      .curve(d3.curveMonotoneX);

    const txLine = d3.line<{ time: Date; rx: number; tx: number }>()
      .x(d => x(d.time))
      .y(d => y(d.tx))
      .curve(d3.curveMonotoneX);

    // Area
    const rxArea = d3.area<{ time: Date; rx: number; tx: number }>()
      .x(d => x(d.time))
      .y0(chartHeight)
      .y1(d => y(d.rx))
      .curve(d3.curveMonotoneX);

    // Defs gradient
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'sniffer-rx-grad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.2);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.0);

    g.append('path').datum(graphData).attr('fill', 'url(#sniffer-rx-grad)').attr('d', rxArea);
    g.append('path').datum(graphData).attr('fill', 'none').attr('stroke', '#06b6d4').attr('stroke-width', 1.8).attr('d', rxLine);
    g.append('path').datum(graphData).attr('fill', 'none').attr('stroke', '#ec4899').attr('stroke-width', 1.8).attr('d', txLine);

    // Overlay real-time captured packet markers / ticks on top of the graph!
    const recentPackets = packets.slice(-20);
    recentPackets.forEach(p => {
      const px = x(p.rawTime);
      if (px >= 0 && px <= chartWidth) {
        let color = '#06b6d4';
        if (p.protocol === 'RTSP') color = '#f97316';
        else if (p.protocol === 'WireGuard') color = '#10b981';
        else if (p.protocol === 'DNS') color = '#3b82f6';
        else if (p.protocol === 'ICMP') color = '#eab308';
        else if (p.isDrop) color = '#ef4444';

        g.append('circle')
          .attr('cx', px)
          .attr('cy', y(p.direction === 'RX' ? p.length / 18 : p.length / 22))
          .attr('r', p.isDrop ? 4 : 2.5)
          .attr('fill', color)
          .attr('opacity', 0.85);
      }
    });

  }, [graphData, showGraphOverlay, packets]);

  // Filtered Packets
  const filteredPackets = packets.filter(pkt => {
    if (selectedInterface !== 'All' && pkt.interfaceName !== selectedInterface) return false;
    if (selectedProtocol !== 'ALL' && pkt.protocol !== selectedProtocol) return false;
    if (selectedDirection !== 'ALL' && pkt.direction !== selectedDirection) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchIp = pkt.srcIp.toLowerCase().includes(q) || pkt.dstIp.toLowerCase().includes(q);
      const matchInfo = pkt.info.toLowerCase().includes(q) || pkt.protocol.toLowerCase().includes(q);
      const matchPort = pkt.srcPort.toString().includes(q) || pkt.dstPort.toString().includes(q);
      if (!matchIp && !matchInfo && !matchPort) return false;
    }
    return true;
  });

  const selectedPacket = packets.find(p => p.id === selectedPacketId) || filteredPackets[filteredPackets.length - 1];

  // Export helper function
  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTsString = () => new Date().toISOString().replace(/[:.]/g, '-');

  // Export CSV
  const exportCSV = () => {
    if (packets.length === 0) return;
    const headers = ['Frame_ID', 'Timestamp', 'Interface', 'Direction', 'Protocol', 'Src_MAC', 'Dst_MAC', 'Src_IP', 'Src_Port', 'Dst_IP', 'Dst_Port', 'Length_Bytes', 'TTL', 'Flags', 'Is_Drop', 'Info'];
    const rows = packets.map(p => [
      p.id,
      `"${p.timestamp}"`,
      `"${p.interfaceName}"`,
      p.direction,
      p.protocol,
      `"${p.macSrc}"`,
      `"${p.macDst}"`,
      p.srcIp,
      p.srcPort,
      p.dstIp,
      p.dstPort,
      p.length,
      p.ttl,
      `"${p.flags || ''}"`,
      p.isDrop ? 'TRUE' : 'FALSE',
      `"${p.info.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `packet_capture_${getTsString()}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export JSON
  const exportJSON = () => {
    if (packets.length === 0) return;
    const jsonContent = JSON.stringify(packets, null, 2);
    downloadBlob(jsonContent, `packet_capture_${getTsString()}.json`, 'application/json');
  };

  // Export Wireshark Compatible Text / PCAP Trace
  const exportWiresharkPCAP = () => {
    if (packets.length === 0) return;
    let textContent = `# RouterOS Packet Sniffer Wireshark Text Trace Dump\n`;
    textContent += `# Generated: ${new Date().toISOString()}\n`;
    textContent += `# Total Captured Frames: ${packets.length}\n`;
    textContent += `# Importable into Wireshark / text2pcap\n\n`;

    packets.forEach(p => {
      textContent += `--------------------------------------------------------------------------------\n`;
      textContent += `Frame ${p.id}: ${p.length} bytes on interface ${p.interfaceName} [${p.direction}]\n`;
      textContent += `Arrival Time: ${p.timestamp} | Protocol: ${p.protocol} | TTL: ${p.ttl}\n`;
      textContent += `Eth: ${p.macSrc} -> ${p.macDst} | IP: ${p.srcIp}:${p.srcPort} -> ${p.dstIp}:${p.dstPort}\n`;
      if (p.isDrop) textContent += `[FIREWALL DROP RULE TRIGGERED]\n`;
      textContent += `Info: ${p.info}\n\n`;
      textContent += `Raw Hex Stream:\n${p.hexDump}\n\n`;
    });

    downloadBlob(textContent, `wireshark_trace_${getTsString()}.pcap.txt`, 'text/plain;charset=utf-8;');
  };

  // Export RouterOS Log Format
  const exportRouterOSLog = () => {
    if (packets.length === 0) return;
    let logText = `/tool sniffer packet print detail\n`;
    logText += `; RouterOS v7.13.5 Packet Sniffer Export - ${new Date().toLocaleString()}\n`;
    logText += `; Captured frames: ${packets.length}\n\n`;

    packets.forEach(p => {
      logText += `time=${p.timestamp} num=${p.id} interface=${p.interfaceName} src-mac=${p.macSrc} dst-mac=${p.macDst} src-address=${p.srcIp}:${p.srcPort} dst-address=${p.dstIp}:${p.dstPort} protocol=${p.protocol.toLowerCase()} size=${p.length} ${p.isDrop ? 'action=drop' : 'action=accept'}\n`;
      logText += `  payload: ${p.payloadPreview}\n\n`;
    });

    downloadBlob(logText, `routeros_sniffer_${getTsString()}.log`, 'text/plain;charset=utf-8;');
  };

  const copyWinboxCli = () => {
    const cmd = `/tool sniffer quick interface=${selectedInterface === 'All' ? 'all' : selectedInterface} ip-protocol=${selectedProtocol === 'ALL' ? 'ip' : selectedProtocol.toLowerCase()}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  // Helper protocol color pills
  const getProtocolBadge = (proto: PacketFrame['protocol'], isDrop?: boolean) => {
    if (isDrop) {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-red-950/60 text-red-400 border border-red-800/40">DROP</span>;
    }

    switch (proto) {
      case 'TCP':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">TCP</span>;
      case 'UDP':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-purple-950/60 text-purple-400 border border-purple-800/40">UDP</span>;
      case 'ICMP':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-yellow-950/60 text-yellow-400 border border-yellow-800/40">ICMP</span>;
      case 'RTSP':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-orange-950/60 text-orange-400 border border-orange-800/40">RTSP</span>;
      case 'DNS':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-950/60 text-blue-400 border border-blue-800/40">DNS</span>;
      case 'WireGuard':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">WG</span>;
      case 'IPsec':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-teal-950/60 text-teal-400 border border-teal-800/40">IPsec</span>;
      case 'HTTPS':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-900/60 text-cyan-300 border border-cyan-700/40">HTTPS</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">{proto}</span>;
    }
  };

  return (
    <div className="bg-[#0b0b10] border border-[#141424] rounded-2xl p-5 space-y-5" id="packet-sniffer-view">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="text-cyan-400 w-5 h-5 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              RouterOS Live Frame Sniffer & Wireshark Analyzer
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">
              L2/L3 Promiscuous Mode
            </span>

            {/* Prominent Visual Status Indicator Badge */}
            {captureMode === 'running' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE CAPTURING
              </span>
            )}

            {captureMode === 'paused' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/50 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                SNIFFER PAUSED
              </span>
            )}

            {captureMode === 'stopped' && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-500/50 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                SNIFFER STOPPED
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-normal">
            Real-time frame capture simulation overlaid directly over interface bandwidth charts. Inspect source/destination headers and payload bytes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {captureMode === 'running' && (
            <>
              <button
                onClick={() => setCaptureMode('paused')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                title="Pause frame capture stream while keeping captured frames in memory"
              >
                <Pause size={13} fill="currentColor" />
                Pause Sniffer
              </button>
              <button
                onClick={() => setCaptureMode('stopped')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-950/60 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Stop packet sniffer engine"
              >
                <Square size={13} fill="currentColor" />
                Stop
              </button>
            </>
          )}

          {captureMode === 'paused' && (
            <>
              <button
                onClick={() => setCaptureMode('running')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] animate-pulse"
                title="Resume live frame capture stream"
              >
                <Play size={13} fill="currentColor" />
                Resume Capture
              </button>
              <button
                onClick={() => setCaptureMode('stopped')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-950/60 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Stop packet sniffer engine"
              >
                <Square size={13} fill="currentColor" />
                Stop
              </button>
            </>
          )}

          {captureMode === 'stopped' && (
            <button
              onClick={() => setCaptureMode('running')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              title="Start packet sniffer capture engine"
            >
              <Play size={13} fill="currentColor" />
              Start Capture
            </button>
          )}

          <button
            onClick={() => {
              setPackets([]);
              setGraphData([]);
              setStats({ totalCount: 0, bytesCount: 0, rxCount: 0, txCount: 0, dropsCount: 0, tcpCount: 0, udpCount: 0, icmpCount: 0, otherCount: 0 });
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="Clear capture buffer"
          >
            <Trash2 size={13} />
            Clear
          </button>

          <button
            onClick={() => setShowGraphOverlay(!showGraphOverlay)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
              showGraphOverlay 
                ? 'bg-cyan-950/30 text-cyan-400 border-cyan-800/50' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {showGraphOverlay ? <Eye size={13} /> : <EyeOff size={13} />}
            Throughput Chart
          </button>

          {/* Download Multi-Format Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-950/40 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <Download size={13} />
              Download Capture
              <ChevronDown size={12} className={`transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {downloadMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#0c0c14] border border-cyan-500/30 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 font-mono text-xs">
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                  Select Export Format ({packets.length} frames)
                </div>
                
                <button
                  onClick={() => { exportCSV(); setDownloadMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 text-cyan-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <BarChart2 size={13} className="text-cyan-400" />
                  <div>
                    <div className="font-bold">CSV Spreadsheet (.csv)</div>
                    <div className="text-[9px] text-zinc-500">Excel / Pandas tabular format</div>
                  </div>
                </button>

                <button
                  onClick={() => { exportWiresharkPCAP(); setDownloadMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-950/60 text-emerald-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileCode size={13} className="text-emerald-400" />
                  <div>
                    <div className="font-bold">Wireshark Trace (.pcap.txt)</div>
                    <div className="text-[9px] text-zinc-500">text2pcap & hex dump format</div>
                  </div>
                </button>

                <button
                  onClick={() => { exportJSON(); setDownloadMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-950/60 text-purple-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Database size={13} className="text-purple-400" />
                  <div>
                    <div className="font-bold">JSON Frame Array (.json)</div>
                    <div className="text-[9px] text-zinc-500">Full L2/L3/L4 structured JSON</div>
                  </div>
                </button>

                <button
                  onClick={() => { exportRouterOSLog(); setDownloadMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-orange-950/60 text-orange-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Terminal size={13} className="text-orange-400" />
                  <div>
                    <div className="font-bold">RouterOS Sniffer Log (.log)</div>
                    <div className="text-[9px] text-zinc-500">/tool sniffer print format</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={copyWinboxCli}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Copy WinBox / RouterOS sniffer CLI command"
          >
            {copiedCli ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedCli ? 'Copied CLI!' : 'WinBox CLI'}
          </button>
        </div>
      </div>

      {/* Analytics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Captured Frames</span>
          <span className="text-lg font-bold font-mono text-white block">{stats.totalCount}</span>
          <span className="text-[9px] text-zinc-600 block">RAM Buffer limit: 250</span>
        </div>

        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Payload Vol.</span>
          <span className="text-lg font-bold font-mono text-cyan-400 block">
            {(stats.bytesCount / 1024).toFixed(1)} <span className="text-xs text-zinc-500 font-sans">KB</span>
          </span>
          <span className="text-[9px] text-zinc-600 block">Avg frame: ~720 B</span>
        </div>

        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">RX vs TX Split</span>
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="text-cyan-400 flex items-center"><ArrowDownRight size={12} />{stats.rxCount}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-pink-400 flex items-center"><ArrowUpRight size={12} />{stats.txCount}</span>
          </div>
          <span className="text-[9px] text-zinc-600 block">Direction distribution</span>
        </div>

        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Protocol Breakdown</span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-cyan-400 font-bold">TCP:{stats.tcpCount}</span>
            <span className="text-purple-400 font-bold">UDP:{stats.udpCount}</span>
            <span className="text-yellow-400 font-bold">ICMP:{stats.icmpCount}</span>
          </div>
          <span className="text-[9px] text-zinc-600 block">L4 Transport types</span>
        </div>

        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Firewall Drops</span>
          <span className={`text-lg font-bold font-mono block ${stats.dropsCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {stats.dropsCount}
          </span>
          <span className="text-[9px] text-zinc-600 block">Guest Isolation rules</span>
        </div>

        <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Capture Status</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              captureMode === 'running' ? 'bg-emerald-400 animate-ping' : captureMode === 'paused' ? 'bg-amber-400' : 'bg-red-500'
            }`} />
            <span className={`font-bold font-mono text-xs ${
              captureMode === 'running' ? 'text-emerald-400' : captureMode === 'paused' ? 'text-amber-400' : 'text-red-500'
            }`}>
              {captureMode === 'running' ? 'STREAMING' : captureMode === 'paused' ? 'PAUSED' : 'STOPPED'}
            </span>
          </div>
          <span className="text-[9px] text-zinc-600 block">
            {captureMode === 'running' ? 'Rate: ~2.5 pkts/sec' : captureMode === 'paused' ? `${packets.length} frames held` : 'Sniffer halted'}
          </span>
        </div>
      </div>

      {/* D3 Throughput Overlay Graph */}
      {showGraphOverlay && (
        <div className="bg-[#050508] border border-zinc-900/80 p-3.5 rounded-xl space-y-2 relative" ref={graphContainerRef}>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-zinc-900 pb-2">
            <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-cyan-400">
              <Activity size={12} className="animate-pulse" />
              Live Throughput Overlay & Real-Time Frame Arrival Ticks
            </span>
            <div className="flex items-center gap-4 text-[9px]">
              <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-0.5 bg-cyan-400 inline-block" /> RX Mbps</span>
              <span className="flex items-center gap-1 text-pink-400"><span className="w-2 h-0.5 bg-pink-400 inline-block" /> TX Mbps</span>
              <span className="flex items-center gap-1 text-orange-400"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Frame arrival tick</span>
            </div>
          </div>
          <svg ref={svgRef} className="w-full h-[130px] select-none" />
        </div>
      )}

      {/* Filter Toolbar & Quick Workload Injector */}
      <div className="bg-[#050508] border border-zinc-900 p-3 rounded-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by IP, port, protocol or info payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Select filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Interface filter */}
            <div className="flex items-center gap-1.5 bg-[#0a0a0f] border border-zinc-800 px-2.5 py-1 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Intf:</span>
              <select
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="bg-transparent text-cyan-400 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="All">All Interfaces</option>
                {interfaces.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            {/* Protocol filter */}
            <div className="flex items-center gap-1.5 bg-[#0a0a0f] border border-zinc-800 px-2.5 py-1 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Proto:</span>
              <select
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value)}
                className="bg-transparent text-purple-400 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">ALL Protocols</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
                <option value="RTSP">RTSP (CCTV)</option>
                <option value="DNS">DNS</option>
                <option value="WireGuard">WireGuard</option>
                <option value="HTTPS">HTTPS</option>
              </select>
            </div>

            {/* Direction filter */}
            <div className="flex items-center gap-1 bg-[#0a0a0f] border border-zinc-800 p-0.5 rounded-xl font-mono text-[10px]">
              <button
                onClick={() => setSelectedDirection('ALL')}
                className={`px-2 py-0.5 rounded-lg transition-all ${selectedDirection === 'ALL' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                ALL
              </button>
              <button
                onClick={() => setSelectedDirection('RX')}
                className={`px-2 py-0.5 rounded-lg transition-all ${selectedDirection === 'RX' ? 'bg-cyan-950 text-cyan-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                RX
              </button>
              <button
                onClick={() => setSelectedDirection('TX')}
                className={`px-2 py-0.5 rounded-lg transition-all ${selectedDirection === 'TX' ? 'bg-pink-950 text-pink-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                TX
              </button>
            </div>

            {/* Auto scroll checkbox */}
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-zinc-800 text-cyan-600 bg-zinc-900 focus:ring-0 cursor-pointer"
              />
              Auto-scroll
            </label>

          </div>
        </div>

        {/* Quick Workload Injection Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-900/60 text-[10px]">
          <span className="font-bold uppercase text-zinc-500 tracking-wider text-[8px]">Simulate Traffic Type:</span>

          <button
            onClick={() => setActivePreset('normal')}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activePreset === 'normal' 
                ? 'bg-zinc-800 text-white border-zinc-700 font-bold' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-zinc-200'
            }`}
          >
            ⚡ Normal Mixed Traffic
          </button>

          <button
            onClick={() => setActivePreset('rtsp')}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activePreset === 'rtsp' 
                ? 'bg-orange-950/60 text-orange-400 border-orange-800/60 font-bold' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-zinc-200'
            }`}
          >
            📹 CCTV RTSP Feed (Port 554)
          </button>

          <button
            onClick={() => setActivePreset('wireguard')}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activePreset === 'wireguard' 
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 font-bold' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-zinc-200'
            }`}
          >
            🔒 WireGuard Tunnel Sync
          </button>

          <button
            onClick={() => setActivePreset('dns')}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activePreset === 'dns' 
                ? 'bg-blue-950/60 text-blue-400 border-blue-800/60 font-bold' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-zinc-200'
            }`}
          >
            🌐 DNS Query Flood (Port 53)
          </button>

          <button
            onClick={() => setActivePreset('guest_drop')}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activePreset === 'guest_drop' 
                ? 'bg-red-950/60 text-red-400 border-red-800/60 font-bold' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-zinc-200'
            }`}
          >
            🚨 Guest VLAN Isolation Drop
          </button>
        </div>
      </div>

      {/* Live Status Alert Banner */}
      {captureMode === 'running' && (
        <div className="bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold uppercase tracking-wider text-emerald-400">Packet Sniffer Active</span>
            <span className="text-zinc-400 hidden sm:inline">— Live promiscuous capture streaming active across router interfaces (~2.5 pkts/sec).</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCaptureMode('paused')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Pause size={11} fill="currentColor" />
              Pause
            </button>
            <button
              onClick={() => setCaptureMode('stopped')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Square size={11} fill="currentColor" />
              Stop
            </button>
          </div>
        </div>
      )}

      {captureMode === 'paused' && (
        <div className="bg-amber-950/30 border border-amber-700/50 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="font-bold uppercase tracking-wider text-amber-300">Packet Sniffer Paused</span>
            <span className="text-amber-400/80 hidden sm:inline">— Ingestion suspended. {packets.length} captured frames retained in buffer.</span>
          </div>
          <button
            onClick={() => setCaptureMode('running')}
            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            <Play size={11} fill="currentColor" />
            Resume Live Stream
          </button>
        </div>
      )}

      {captureMode === 'stopped' && (
        <div className="bg-red-950/30 border border-red-800/50 text-red-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(239,68,68,0.12)]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="font-bold uppercase tracking-wider text-red-300">Packet Sniffer Stopped</span>
            <span className="text-red-400/80 hidden sm:inline">— Promiscuous capture offline. Re-arm capture engine to stream new frames.</span>
          </div>
          <button
            onClick={() => setCaptureMode('running')}
            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            <Play size={11} fill="currentColor" />
            Start Capture Engine
          </button>
        </div>
      )}

      {/* Main Split Layout: Frame Capture Table + Packet Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left/Top: Live Packet Table */}
        <div className="lg:col-span-7 bg-[#050508] border border-zinc-900 rounded-xl overflow-hidden flex flex-col h-[340px]">
          <div className="px-3.5 py-2.5 bg-[#09090e] border-b border-zinc-900 flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400">
            <span>LIVE STREAMING CAPTURE ({filteredPackets.length} frames)</span>
            <span>Click row to inspect hex header</span>
          </div>

          <div className="overflow-y-auto flex-1 scrollbar-thin">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead className="sticky top-0 bg-[#07070c] border-b border-zinc-900 text-zinc-500 uppercase text-[9px] font-bold z-10">
                <tr>
                  <th className="py-2 px-2.5">No.</th>
                  <th className="py-2 px-2">Time</th>
                  <th className="py-2 px-2">Intf</th>
                  <th className="py-2 px-2">Proto</th>
                  <th className="py-2 px-2">Source IP</th>
                  <th className="py-2 px-2">Destination IP</th>
                  <th className="py-2 px-2 text-right">Len</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40">
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-600 italic">
                      No packet frames match current filter parameters.
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((pkt) => {
                    const isSelected = pkt.id === selectedPacket?.id;

                    return (
                      <tr
                        key={pkt.id}
                        onClick={() => setSelectedPacketId(pkt.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-cyan-950/50 text-cyan-200 border-l-2 border-l-cyan-400' 
                            : pkt.isDrop 
                            ? 'bg-red-950/20 text-red-300 hover:bg-red-950/40' 
                            : 'hover:bg-zinc-900/50 text-zinc-300'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-bold text-zinc-500">{pkt.id}</td>
                        <td className="py-2 px-2 text-zinc-400 text-[10px]">{pkt.timestamp}</td>
                        <td className="py-2 px-2 text-zinc-400 text-[10px]">{pkt.interfaceName}</td>
                        <td className="py-2 px-2">{getProtocolBadge(pkt.protocol, pkt.isDrop)}</td>
                        <td className="py-2 px-2 text-cyan-400">{pkt.srcIp}:{pkt.srcPort}</td>
                        <td className="py-2 px-2 text-pink-400">{pkt.dstIp}:{pkt.dstPort}</td>
                        <td className="py-2 px-2 text-right text-zinc-400 text-[10px]">{pkt.length}</td>
                      </tr>
                    );
                  })
                )}
                <div ref={tableEndRef} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Right/Bottom: Wireshark / RouterOS Protocol Inspector & Hex Dump */}
        <div className="lg:col-span-5 bg-[#050508] border border-zinc-900 rounded-xl p-3.5 space-y-3 flex flex-col h-[340px] overflow-y-auto scrollbar-thin">
          
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              <Terminal size={12} />
              Frame #{selectedPacket?.id || '-'} Wireshark Protocol Inspector
            </span>
            {selectedPacket && (
              <span className="text-[9px] font-mono text-zinc-500">
                Len: {selectedPacket.length} bytes
              </span>
            )}
          </div>

          {selectedPacket ? (
            <div className="space-y-3 text-xs font-mono">
              
              {/* Summary Banner */}
              <div className="bg-[#09090e] border border-zinc-900 p-2.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 font-bold">INFO: {selectedPacket.info}</span>
                  {getProtocolBadge(selectedPacket.protocol, selectedPacket.isDrop)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-zinc-500 border-t border-zinc-900/60">
                  <span>Interface: <strong className="text-zinc-300">{selectedPacket.interfaceName}</strong></span>
                  <span>Dir: <strong className={selectedPacket.direction === 'RX' ? 'text-cyan-400' : 'text-pink-400'}>{selectedPacket.direction}</strong></span>
                </div>
              </div>

              {/* Decoded Protocol Header Accordions */}
              <div className="space-y-1.5 text-[11px]">
                
                {/* Layer 2: Ethernet II */}
                <details className="bg-[#09090e] border border-zinc-900 rounded p-2 cursor-pointer group" open>
                  <summary className="font-bold text-zinc-300 text-[10px] flex items-center gap-1.5 select-none">
                    <ChevronRight size={12} className="group-open:rotate-90 transition-transform text-cyan-400" />
                    Ethernet II, Src: {selectedPacket.macSrc}, Dst: {selectedPacket.macDst}
                  </summary>
                  <div className="pl-4 pt-1.5 space-y-0.5 text-[10px] text-zinc-400 font-mono">
                    <div>Destination MAC: <span className="text-zinc-200">{selectedPacket.macDst}</span></div>
                    <div>Source MAC: <span className="text-zinc-200">{selectedPacket.macSrc}</span></div>
                    <div>Type: IPv4 (0x0800)</div>
                  </div>
                </details>

                {/* Layer 3: IPv4 */}
                <details className="bg-[#09090e] border border-zinc-900 rounded p-2 cursor-pointer group" open>
                  <summary className="font-bold text-zinc-300 text-[10px] flex items-center gap-1.5 select-none">
                    <ChevronRight size={12} className="group-open:rotate-90 transition-transform text-cyan-400" />
                    Internet Protocol Version 4, Src: {selectedPacket.srcIp}, Dst: {selectedPacket.dstIp}
                  </summary>
                  <div className="pl-4 pt-1.5 space-y-0.5 text-[10px] text-zinc-400 font-mono">
                    <div>Version: 4, Header Length: 20 bytes</div>
                    <div>Time to Live (TTL): {selectedPacket.ttl}</div>
                    <div>Protocol: {selectedPacket.protocol}</div>
                    <div>Header Checksum: 0x9a8f [verified]</div>
                  </div>
                </details>

                {/* Layer 4: Transport Layer */}
                <details className="bg-[#09090e] border border-zinc-900 rounded p-2 cursor-pointer group" open>
                  <summary className="font-bold text-zinc-300 text-[10px] flex items-center gap-1.5 select-none">
                    <ChevronRight size={12} className="group-open:rotate-90 transition-transform text-cyan-400" />
                    {selectedPacket.protocol} Header, Src Port: {selectedPacket.srcPort}, Dst Port: {selectedPacket.dstPort}
                  </summary>
                  <div className="pl-4 pt-1.5 space-y-0.5 text-[10px] text-zinc-400 font-mono">
                    <div>Source Port: <span className="text-cyan-400">{selectedPacket.srcPort}</span></div>
                    <div>Destination Port: <span className="text-pink-400">{selectedPacket.dstPort}</span></div>
                    {selectedPacket.flags && <div>Flags: <span className="text-yellow-400">{selectedPacket.flags}</span></div>}
                    <div>Payload Size: {selectedPacket.length - 54} bytes</div>
                  </div>
                </details>

              </div>

              {/* Hex Dump Viewer */}
              <div className="space-y-1 pt-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Raw Hex & ASCII Stream</span>
                <div className="bg-black border border-zinc-900 p-2.5 rounded font-mono text-[9px] text-emerald-400 leading-tight whitespace-pre overflow-x-auto select-all h-[90px]">
                  {selectedPacket.hexDump}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 italic text-xs">
              Select a frame from the capture stream to inspect headers.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
