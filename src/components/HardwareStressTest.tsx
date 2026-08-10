import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Activity, Zap, Play, Square, AlertTriangle, ShieldAlert,
  CheckCircle, Server, Terminal, RefreshCw, Layers, TrendingUp, Info
} from 'lucide-react';

interface DeviceProfile {
  name: string;
  model: string;
  cores: number;
  freq: string;
  ramTotal: number; // in MB
  baselineCpu: number;
  maxThroughput: string;
  description: string;
}

interface StressScenario {
  id: string;
  name: string;
  title: string;
  cpuMultiplier: number;
  ramUsage: number; // MB
  tempIncrease: number; // degrees C
  lossRate: number; // %
  description: string;
  symptoms: string[];
  referenceKb: string;
  forumLink: string;
}

export default function HardwareStressTest() {
  // Device Selection
  const devices: DeviceProfile[] = [
    { 
      name: 'CCR2004-1G-12S+2XS', 
      model: 'Cloud Core Router (Enterprise Gateway)', 
      cores: 4, 
      freq: '1700 MHz', 
      ramTotal: 4096, 
      baselineCpu: 2, 
      maxThroughput: '40 Gbps',
      description: 'Carrier-grade router with AL32400 quad-core ARM64 CPU. Built for high-density VLAN trunking and central IPsec tunnels.'
    },
    { 
      name: 'RB5009UG+S+IN', 
      model: 'Prosumer Heavy-Duty Router', 
      cores: 4, 
      freq: '1400 MHz', 
      ramTotal: 1024, 
      baselineCpu: 4, 
      maxThroughput: '10 Gbps',
      description: 'Ultra-compact home-lab & SMB gatekeeper with Marvell Armada quad-core ARM64 CPU. Features a powerful switch-chip.'
    },
    { 
      name: 'hAP ax3', 
      model: 'SOHO Wi-Fi 6 Access Point', 
      cores: 4, 
      freq: '1800 MHz', 
      ramTotal: 1024, 
      baselineCpu: 5, 
      maxThroughput: '2.5 Gbps',
      description: 'SOHO flagship device equipped with Qualcomm IPQ-6010 quad-core CPU. Handles multi-VLAN guest isolation and light VPN loads.'
    },
    { 
      name: 'hAP ac2 (Legacy)', 
      model: 'Vintage Dual-Band Router', 
      cores: 4, 
      freq: '716 MHz', 
      ramTotal: 128, 
      baselineCpu: 12, 
      maxThroughput: '1 Gbps',
      description: 'Legacy hardware with IPQ-4018 quad-core CPU and very low RAM. Easily overloaded under heavy software bridge VLAN routing.'
    }
  ];

  const [selectedDevice, setSelectedDevice] = useState<number>(0);
  const device = devices[selectedDevice];

  // Stress Scenarios
  const scenarios: StressScenario[] = [
    {
      id: 'idle',
      name: 'Standard Idle Mode',
      title: 'Normal Operational Load (All locations idling)',
      cpuMultiplier: 1.0,
      ramUsage: 140,
      tempIncrease: 0,
      lossRate: 0,
      description: 'Normal standby conditions. Standard FastPath handles routing tables and isolated VLAN interfaces with low overhead.',
      symptoms: ['All queues cleared', 'Temperature within normal specifications (42°C)', '0% packet drops across multi-site tunnels'],
      referenceKb: 'MikroTik Wiki: FastPath packet processing pipeline',
      forumLink: 'forum.mikrotik.com/t/standard-ccr-idle-temperatures/184201'
    },
    {
      id: 'nvr_rtsp_overload',
      name: 'HP NVR CCTV Loop Stress',
      title: 'HP ProLiant NVR CCTV Multi-Stream Transcode (1500B packets)',
      cpuMultiplier: 5.5,
      ramUsage: 450,
      tempIncrease: 18,
      lossRate: 2.4,
      description: 'Simulates intensive full-MTU H.264/H.265 streams from HP ProLiant DL360 server running NVR recorder to distant branches. Software queues are pinned on Core 0.',
      symptoms: [
        'Single core pinned at 100% (queue bottleneck)',
        'RTSP frame jitter drops exceeding 25ms, causing screen stuttering',
        'HP iLO triggers Chassis Fan Speed Alert: 92% PWM duty cycle'
      ],
      referenceKb: 'MikroTik KB: Queue Tree Single-Thread Limitations',
      forumLink: 'forum.mikrotik.com/t/ccr2004-single-core-pegged-to-100-percent-with-simple-queues/176550'
    },
    {
      id: 'bridge_vlan_unoffloaded',
      name: 'Software-Bridged VLAN Traffic',
      title: 'Layer-2 Bridging Overload (Hardware Offloading Disabled)',
      cpuMultiplier: 7.2,
      ramUsage: 620,
      tempIncrease: 25,
      lossRate: 4.8,
      description: 'Trunk ports are sending high-speed packets across VLANs but hardware-offloading is disabled. The main router CPU handles all bridge lookup tables in software.',
      symptoms: [
        'High system overhead from "bridge" and "ethernet" software interrupts',
        'All 4 cores pegged at 95%+',
        'Frame drops across corporate local subnets',
        'HP iLO out-of-band monitoring alerts: Gateway ping loss detected'
      ],
      referenceKb: 'MikroTik Wiki: Bridge VLAN Filtering & L3 Hardware Offload (L3HW)',
      forumLink: 'forum.mikrotik.com/t/rb5009-vlan-bridge-without-hardware-acceleration-cpu-bottleneck/193240'
    },
    {
      id: 'vpn_ipsec_unaccelerated',
      name: 'VPN IPsec Crypto Bulk Load',
      title: 'Branch-to-Branch WireGuard & IPsec Bulk Tunnel Sync',
      cpuMultiplier: 6.0,
      ramUsage: 350,
      tempIncrease: 15,
      lossRate: 1.8,
      description: 'Large file backup synchronization runs between branch locations over encrypted IPsec tunnels. Hardware crypto offloading (HW-AE) is disabled on the peer profiles.',
      symptoms: [
        'System "encryption" task consumes 80% CPU overhead',
        'Wireguard/IPsec tunnels clamp MSS incorrectly, leading to packet fragmentation',
        'HP Server back-ups timeout'
      ],
      referenceKb: 'MikroTik KB: IPsec Cryptographic Hardware Offloading',
      forumLink: 'forum.mikrotik.com/t/wireguard-vpn-mss-clamping-on-routeros-v7-thread/174401'
    },
    {
      id: 'ddos_syn_attack',
      name: 'DDoS SYN Flood Attack',
      title: 'Malicious WAN TCP SYN Flood (Fasttrack Disabled)',
      cpuMultiplier: 9.0,
      ramUsage: 980,
      tempIncrease: 32,
      lossRate: 14.5,
      description: 'Simulates 120,000 TCP SYN packets per second hitting ether1-wan interface. Connection tracking without Fasttrack pegs the CPU trying to track half-open sockets.',
      symptoms: [
        'Connection tracking table saturated (over 50,000 active entries)',
        'CPU temperature surges to 74°C, triggering chassis alert fan loops',
        'HP iLO web management console completely inaccessible through the gateway'
      ],
      referenceKb: 'MikroTik Wiki: Protecting RouterOS from TCP SYN attacks',
      forumLink: 'forum.mikrotik.com/t/ddos-defense-on-mikrotik-fastpath-vs-raw-filter/162310'
    }
  ];

  const [activeScenarioId, setActiveScenarioId] = useState<string>('idle');
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  // Performance Remediation / Tuning Switches
  const [fasttrackEnabled, setFasttrackEnabled] = useState<boolean>(false);
  const [l3hwEnabled, setL3hwEnabled] = useState<boolean>(false);
  const [cryptoHwEnabled, setCryptoHwEnabled] = useState<boolean>(false);
  const [fqCodelQueues, setFqCodelQueues] = useState<boolean>(false);

  const [isStressRunning, setIsStressRunning] = useState<boolean>(false);
  const [cpuCores, setCpuCores] = useState<number[]>([1, 1, 1, 1]);
  const [ramUsed, setRamUsed] = useState<number>(140);
  const [temp, setTemp] = useState<number>(42);
  const [loss, setLoss] = useState<number>(0);
  const [isFanActive, setIsFanActive] = useState<boolean>(false);

  // HP Server and iLO Status Indicators
  const [iloStatus, setIloStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [nvrStreamingStatus, setNvrStreamingStatus] = useState<'stable' | 'jittery' | 'stuttered'>('stable');

  // Terminal & Log stream States
  const [stressLogs, setStressLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [stressLogs]);

  // Handle Dynamic performance simulation ticks
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isStressRunning) {
      // Print initialization message in terminal
      setStressLogs(prev => {
        const next = [...prev];
        next.push(`${new Date().toLocaleTimeString()} system,info hardware-test stress generator initiated: device=${device.name}`);
        next.push(`${new Date().toLocaleTimeString()} system,info active-profile="${activeScenario.title}"`);
        return next;
      });

      intervalId = setInterval(() => {
        // Calculate dynamic reduction factor from tuning checkboxes
        let cpuReduction = 0;
        let ramReduction = 0;
        let lossReduction = 0;

        // Fasttrack offloads DDoS SYN tracking and routing overhead
        if (fasttrackEnabled) {
          if (activeScenarioId === 'ddos_syn_attack') {
            cpuReduction += 65; // Massive reduction on SYN flood
            lossReduction += 11.5;
            ramReduction += 400;
          } else {
            cpuReduction += 12;
          }
        }

        // L3 HW-offload saves software bridging
        if (l3hwEnabled) {
          if (activeScenarioId === 'bridge_vlan_unoffloaded') {
            cpuReduction += 75; // Massive bridge savings
            lossReduction += 4.5;
          } else {
            cpuReduction += 10;
          }
        }

        // Crypto HW offload saves VPN overhead
        if (cryptoHwEnabled) {
          if (activeScenarioId === 'vpn_ipsec_unaccelerated') {
            cpuReduction += 60;
            lossReduction += 1.6;
          } else {
            cpuReduction += 5;
          }
        }

        // FQ-CoDel Multi-Queue saves single-thread NVR bottlenecks
        if (fqCodelQueues) {
          if (activeScenarioId === 'nvr_rtsp_overload') {
            cpuReduction += 35; // Distributes workload, lowers jitter drops
            lossReduction += 2.2;
          }
        }

        // Apply device scaling (legacy devices handle stress much worse!)
        const deviceScale = device.ramTotal < 512 ? 1.8 : 1.0;
        
        // Base CPU target
        const targetCpuBase = Math.max(
          2, 
          (device.baselineCpu + activeScenario.cpuMultiplier * 14 * deviceScale) - cpuReduction
        );

        // Core distribution logic: If NVR is overloaded and fqCodel is off, core 0 is pinned
        const nextCores = cpuCores.map((val, idx) => {
          let coreTarget = targetCpuBase;
          if (activeScenarioId === 'nvr_rtsp_overload' && !fqCodelQueues) {
            if (idx === 0) {
              coreTarget = 99.5; // Core 0 is pinned single-threaded
            } else {
              coreTarget = Math.max(2, targetCpuBase * 0.25); // Other cores idle
            }
          } else if (activeScenarioId === 'ddos_syn_attack' && !fasttrackEnabled) {
            // High interrupt causes irregular pegs
            coreTarget = Math.min(100, targetCpuBase + (idx * 4 - 6));
          } else if (fqCodelQueues) {
            // Beautiful even multi-core load balancing!
            coreTarget = targetCpuBase;
          }
          const jitter = (Math.random() - 0.5) * 6;
          return Math.min(100, Math.max(0, parseFloat((coreTarget + jitter).toFixed(1))));
        });

        const overallCpuAvg = nextCores.reduce((a, b) => a + b, 0) / nextCores.length;

        // RAM target
        const nextRam = Math.min(
          device.ramTotal,
          Math.max(
            device.baselineCpu * 5 + 40,
            activeScenario.ramUsage - ramReduction + Math.round(Math.random() * 20)
          )
        );

        // Temp target
        const nextTemp = Math.round(41 + (overallCpuAvg * 0.35) + activeScenario.tempIncrease * (overallCpuAvg / (activeScenario.cpuMultiplier * 14 || 1)));

        // Loss target
        const nextLoss = Math.min(
          100,
          Math.max(0, parseFloat((activeScenario.lossRate - lossReduction + (Math.random() - 0.5) * 0.5).toFixed(1)))
        );

        // Update states
        setCpuCores(nextCores);
        setRamUsed(nextRam);
        setTemp(nextTemp);
        setLoss(nextLoss);

        // Fan speeds
        setIsFanActive(nextTemp > 56);

        // HP iLO logic: Under heavy loss or cpu temperature, OOB alerts trigger
        if (nextLoss > 3.0 || overallCpuAvg > 85) {
          setIloStatus('critical');
        } else if (nextLoss > 0.5 || overallCpuAvg > 65) {
          setIloStatus('warning');
        } else {
          setIloStatus('healthy');
        }

        // NVR CCTV Streaming logic: depends on jitter & queue type
        if (activeScenarioId === 'nvr_rtsp_overload') {
          if (!fqCodelQueues && nextCores[0] > 95) {
            setNvrStreamingStatus('stuttered');
          } else if (!fqCodelQueues) {
            setNvrStreamingStatus('jittery');
          } else {
            setNvrStreamingStatus('stable');
          }
        } else {
          setNvrStreamingStatus('stable');
        }

        // Generate realistic console/diagnostics alerts periodically
        generateAlertLogs(nextCores, nextTemp, nextLoss, overallCpuAvg);

      }, 1000);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isStressRunning, selectedDevice, activeScenarioId, fasttrackEnabled, l3hwEnabled, cryptoHwEnabled, fqCodelQueues]);

  // Periodic MikroTik log outputs
  const generateAlertLogs = (cores: number[], temperature: number, packetLoss: number, avgCpu: number) => {
    const timestamp = new Date().toLocaleTimeString();
    const probability = Math.random();

    setStressLogs(prev => {
      const logsList = [...prev];
      if (logsList.length > 80) logsList.shift();

      if (probability < 0.15) {
        logsList.push(`${timestamp} system,info,cpu core performance statistics: core0=${cores[0]}% core1=${cores[1]}% core2=${cores[2]}% core3=${cores[3]}%`);
      }

      if (avgCpu > 85 && probability < 0.3) {
        if (activeScenarioId === 'ddos_syn_attack' && !fasttrackEnabled) {
          logsList.push(`${timestamp} firewall,warning,critical tcp syn-flood on ether1-wan: fastpath disabled! connection-tracking table saturation warnings`);
          logsList.push(`${timestamp} ip,warning,critical forum-remedy: enable TCP syn-cookies and configure /ip settings set fast-path=yes`);
        }
        if (activeScenarioId === 'bridge_vlan_unoffloaded' && !l3hwEnabled) {
          logsList.push(`${timestamp} bridge,error,critical L2 trunk bridge-vlan handles traffic in software (CPU interrupt bounds)`);
          logsList.push(`${timestamp} interface,info,warning bridge port ether2 disabled hw-offload. packet latency spikes on VLAN trunk`);
        }
        if (activeScenarioId === 'vpn_ipsec_unaccelerated' && !cryptoHwEnabled) {
          logsList.push(`${timestamp} ipsec,error hardware-accelerated cryptos engines (AES-NI) offline. Core execution is bounded by software hashing overhead`);
        }
      }

      if (activeScenarioId === 'nvr_rtsp_overload' && cores[0] > 95 && !fqCodelQueues && probability < 0.35) {
        logsList.push(`${timestamp} queue,warning simple-queue "NVR_CCTV_Feed" is dropping raw packets due to core-0 serialization`);
        logsList.push(`${timestamp} hp-ilo,warning Out-Of-Band recorder chassis reporting high jitter threshold from gateway. RTP frames discarded`);
      }

      if (temperature > 65 && probability < 0.25) {
        logsList.push(`${timestamp} system,warning cpu core temperature high: ${temperature}°C. starting chassis auxiliary fan duty`);
        logsList.push(`${timestamp} hp-ilo,info chassis fan speed PWM set to 100% to cool down adjacent server-blade interfaces`);
      }

      return logsList;
    });
  };

  const handleStartStopStress = () => {
    if (isStressRunning) {
      setIsStressRunning(false);
      // Reset variables back to safe defaults
      setCpuCores([1.5, 0.8, 1.2, 0.5]);
      setRamUsed(140);
      setTemp(42);
      setLoss(0);
      setIsFanActive(false);
      setIloStatus('healthy');
      setNvrStreamingStatus('stable');
      setStressLogs(prev => [...prev, `${new Date().toLocaleTimeString()} system,info hardware-test simulation completed and halted.`]);
    } else {
      setIsStressRunning(true);
    }
  };

  const handleClearLogs = () => {
    setStressLogs([]);
  };

  // Determine current system warnings
  const getKBRecommendation = () => {
    if (!isStressRunning) {
      return {
        title: 'Diagnostic Ready',
        status: 'system idling normally',
        remedy: 'Select a physical stress scenario on the left and click "Start Stress Simulation" to test network and HP server tolerances.'
      };
    }

    if (activeScenarioId === 'nvr_rtsp_overload' && !fqCodelQueues) {
      return {
        title: 'Single-Thread Core Peg (MikroTik Forum Thread #176550)',
        status: 'RTSP video buffer stuttering',
        remedy: 'RouterOS queues are traditionally single-threaded per IP target. Standard FIFO Simple queues force Core 0 to transcode all frames. Enable FQ-CoDel Multi-Queue trees to distribute the queuing overhead across all 4 CPU cores, eliminating buffer jitter.',
        cli: '/queue simple add name=NVR_Balance target=10.0.10.15/32 queue=fq-codel/fq-codel'
      };
    }

    if (activeScenarioId === 'bridge_vlan_unoffloaded' && !l3hwEnabled) {
      return {
        title: 'Software Bridge Interoperability Bottleneck (MikroTik Wiki: Bridge VLAN Filtering)',
        status: 'All 4 CPU cores bounded by L2 packets lookup',
        remedy: 'When VLAN filtering is activated on MikroTik bridges without explicit "hw=yes" offloading flags, traffic drops to the software CPU stack, overloading SOHO and Enterprise devices alike. Enable Layer 3 Hardware Offloading to offload vlan tagging directly to the switch-chip ASIC.',
        cli: '/interface bridge set [find name=bridge-vlan] l3-hw-offloading=yes'
      };
    }

    if (activeScenarioId === 'vpn_ipsec_unaccelerated' && !cryptoHwEnabled) {
      return {
        title: 'Cryptographic Engine Starvation (SLA Violation on SD-WAN)',
        status: 'Site-to-site backup synchronization dropoff',
        remedy: 'IPsec tunnels lacking hardware-encryption offload (AES-NI / IPsec-HW) peg the CPU with floating point math. Enable "hardware-offload" on peer settings and clamp the MTU path to 1420 to prevent fragmentation overhead.',
        cli: '/ip ipsec profile set [find] hardware-offload=yes'
      };
    }

    if (activeScenarioId === 'ddos_syn_attack' && !fasttrackEnabled) {
      return {
        title: 'Connection Saturated - SYN Flood DDoS (MikroTik Forum MUM)',
        status: 'Chassis temperature warning, HP iLO unreachable',
        remedy: 'A stateful firewall tracking 120,000 half-open connections consumes massive CPU resources. Fasttrack bypasses connection tracking queues for established and related packets. Triggering Fastpath raw rules drops invalid frames prior to conntrack lookup.',
        cli: '/ip firewall filter add chain=forward action=fasttrack-connection connection-state=established,related'
      };
    }

    return {
      title: 'Optimal Configuration Achieved',
      status: 'SLA parameters conforming to benchmarks',
      remedy: 'remidiation switches are currently absorbing simulated link pressures. The CPU cores are load-balanced and packet loss is at 0%. Conforms to MikroTik RouterOS and HP enterprise deployment guidelines.'
    };
  };

  const currentKb = getKBRecommendation();

  return (
    <div className="bg-[#0c0c12] border border-zinc-850 rounded-xl p-5 space-y-6" id="hardware-stress-test">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3.5 gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu size={14} className={isStressRunning ? "text-cyan-400 animate-pulse animate-spin" : "text-zinc-500"} />
            Virtual RouterOS Hardware Stress Test Suite
          </h3>
          <p className="text-[11px] text-zinc-500">
            Verify hardware limits, diagnose queue single-thread core pegging, and test HP iLO OOB server integrations under massive packet loads.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isStressRunning ? (
            <button
              onClick={handleStartStopStress}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-950/40 hover:border-red-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square size={11} fill="currentColor" />
              Stop Simulation
            </button>
          ) : (
            <button
              onClick={handleStartStopStress}
              className="px-3.5 py-1.5 text-[11px] font-bold rounded bg-cyan-950/20 text-cyan-400 border border-cyan-900/40 hover:bg-cyan-950/40 hover:border-cyan-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={11} fill="currentColor" />
              Start Stress Simulation
            </button>
          )}

          <button
            onClick={handleClearLogs}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 bg-zinc-950 border border-zinc-900 rounded transition-colors cursor-pointer"
            title="Clear logs"
          >
            <Terminal size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Device & Scenario Setup */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Section: Select Device Model */}
          <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
              1. RouterOS Hardware Specifications
            </span>

            <div className="space-y-2">
              <label className="text-[9px] text-zinc-500 uppercase font-bold">Select Router Chassis</label>
              <select
                value={selectedDevice}
                onChange={(e) => {
                  if (!isStressRunning) {
                    setSelectedDevice(parseInt(e.target.value));
                  }
                }}
                disabled={isStressRunning}
                className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-zinc-750 disabled:opacity-50"
              >
                {devices.map((dev, i) => (
                  <option key={i} value={i}>
                    {dev.name} ({dev.cores} Cores, {dev.ramTotal}MB RAM)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[10px] text-zinc-400 bg-zinc-950/80 p-2.5 border border-zinc-900 rounded leading-normal">
              <span className="font-bold text-zinc-300 block">{device.model}</span>
              <p className="mt-1 text-zinc-500">{device.description}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-900/60 font-mono text-[9px] text-zinc-500">
                <span>CPU: {device.freq}</span>
                <span>ASIC: {device.maxThroughput}</span>
              </div>
            </div>
          </div>

          {/* Section: Select Stress Profile */}
          <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
              2. Load Profiles (SLA Pressures)
            </span>

            <div className="space-y-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    if (!isStressRunning) {
                      setActiveScenarioId(sc.id);
                    }
                  }}
                  disabled={isStressRunning}
                  className={`w-full text-left p-2.5 rounded border transition-all flex flex-col gap-1 ${
                    activeScenarioId === sc.id
                      ? 'bg-cyan-950/10 border-cyan-900/40 text-cyan-400'
                      : 'bg-zinc-950/20 border-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 disabled:hover:bg-transparent'
                  }`}
                >
                  <span className="text-[11px] font-bold block">{sc.name}</span>
                  <span className="text-[9px] text-zinc-500 leading-normal line-clamp-2">{sc.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Diagnostic Remediation Triggers */}
          <div className="space-y-3 bg-zinc-950/50 p-3.5 border border-zinc-900/80 rounded-lg">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-900 pb-1.5">
              3. RouterOS Remediation Switches
            </span>
            <p className="text-[9px] text-zinc-500 leading-normal">
              Activate these RouterOS features to offload processing to dedicated hardware engines or load-balance cores.
            </p>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-2 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                <input
                  type="checkbox"
                  checked={fasttrackEnabled}
                  onChange={(e) => setFasttrackEnabled(e.target.checked)}
                  className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block">Enable IP Fasttrack</span>
                  <span className="text-[8px] text-zinc-500">Bypasses connection queue checks</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-2 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                <input
                  type="checkbox"
                  checked={l3hwEnabled}
                  onChange={(e) => setL3hwEnabled(e.target.checked)}
                  className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block">Enable L3 HW Offloading</span>
                  <span className="text-[8px] text-zinc-500">Offloads bridge VLAN filtering to switch ASIC</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-2 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                <input
                  type="checkbox"
                  checked={cryptoHwEnabled}
                  onChange={(e) => setCryptoHwEnabled(e.target.checked)}
                  className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block">Hardware Encryption Acceleration</span>
                  <span className="text-[8px] text-zinc-500">Uses raw SoC cryptos engines for VPN tunnels</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none bg-zinc-950/40 p-2 rounded border border-zinc-900 hover:border-zinc-800 transition-all">
                <input
                  type="checkbox"
                  checked={fqCodelQueues}
                  onChange={(e) => setFqCodelQueues(e.target.checked)}
                  className="rounded border-zinc-800 text-cyan-600 bg-zinc-950 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block">FQ-CoDel Multi-Queuing</span>
                  <span className="text-[8px] text-zinc-500">Distributes queue packet threads evenly</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Gauges, Real-time telemetry & KB diagnostics */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          
          {/* Dynamic HUD gauges */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Multi-Core CPU Monitor Grid */}
            <div className="md:col-span-8 bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-lg space-y-3">
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">Simulated SoC Processor (Multi-Core Threads Load)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {cpuCores.map((load, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Core {i} thread</span>
                      <span className={load > 85 ? 'text-red-400 font-bold' : load > 60 ? 'text-yellow-400' : 'text-cyan-400'}>
                        {load}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-900 border border-zinc-850/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          load > 85 ? 'bg-red-500' : load > 60 ? 'bg-yellow-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${load}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RAM, Temperature, and Fan Status */}
            <div className="md:col-span-4 bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-lg space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-mono block">Chassis Enclosure Metrics</span>
                <div className="space-y-2 mt-2">
                  {/* RAM Progress */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-zinc-500">RAM Used</span>
                      <span className="text-white">{ramUsed} MB / {device.ramTotal} MB</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(ramUsed / device.ramTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* CPU Temp */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-zinc-500">SoC Temp</span>
                      <span className={temp > 65 ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-300'}>{temp}°C</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${temp > 65 ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${Math.min(100, (temp / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Auxiliary Fans */}
              <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 text-[10px] font-mono">
                <span className="text-zinc-500">Chassis active fan loop</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isFanActive ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="text-zinc-300 font-bold">{isFanActive ? 'HIGH SPEED (Overheat)' : 'Silent Mode'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Tolerances: HP NVR Recorder & HP iLO alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* HP ProLiant DL360 NVR Storage Blade */}
            <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-lg flex items-start gap-3">
              <Server size={20} className="text-indigo-400 mt-1 shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">HP ProLiant NVR Core Blade</span>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    nvrStreamingStatus === 'stable' ? 'bg-emerald-950/20 text-emerald-400' :
                    nvrStreamingStatus === 'jittery' ? 'bg-yellow-950/20 text-yellow-400' : 'bg-red-950/20 text-red-400 animate-pulse'
                  }`}>
                    {nvrStreamingStatus}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {nvrStreamingStatus === 'stable' 
                    ? 'All RTSP CCTV surveillance streams are writing to RAID arrays at 60 FPS without frame loss. Latency Jitter is <1ms.'
                    : nvrStreamingStatus === 'jittery'
                    ? 'Jitter buffer thresholds exceeding 20ms. Intermittent frame stutter and frame drops noticed on camera decoders.'
                    : 'Critical camera feed dropouts. HP Storage Controller reporting lost packets from gateway core vlan interfaces.'}
                </p>
              </div>
            </div>

            {/* HP Integrated Lights-Out (iLO) Out-Of-Band Controller */}
            <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-lg flex items-start gap-3">
              <ShieldAlert size={20} className={`mt-1 shrink-0 ${iloStatus === 'healthy' ? 'text-emerald-400' : iloStatus === 'warning' ? 'text-yellow-400' : 'text-red-400 animate-pulse'}`} />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">HP Integrated Lights-Out (iLO)</span>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    iloStatus === 'healthy' ? 'bg-emerald-950/20 text-emerald-400' :
                    iloStatus === 'warning' ? 'bg-yellow-950/20 text-yellow-400' : 'bg-red-950/20 text-red-400 animate-pulse'
                  }`}>
                    OOB: {iloStatus}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {iloStatus === 'healthy'
                    ? 'Chassis health is optimal. No SNMP traps received. Management route tables isolated via private OOB VRF.'
                    : iloStatus === 'warning'
                    ? 'Chassis fan speed over 80%. High operational temperature warning detected over isolated management bridge.'
                    : 'System alert: Packet loss in transit gateway. Web console slow to respond. Automated diagnostic reporting active.'}
                </p>
              </div>
            </div>
          </div>

          {/* RouterOS Forum Knowledge-Base Diagnosis Report */}
          <div className="bg-zinc-950/80 border border-zinc-900 rounded p-3.5 space-y-2.5">
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
              <TrendingUp size={12} />
              RouterOS Knowledge-Base & Troubleshooting Guidelines
            </span>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              <div className="md:col-span-6 space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Active Bottleneck</span>
                <p className="text-zinc-200 font-bold leading-snug">{currentKb.title}</p>
                <div className="flex gap-1.5 items-center mt-1 text-[10px]">
                  <span className="text-zinc-500 font-medium">Symptom status:</span>
                  <span className="text-zinc-400 font-semibold">{currentKb.status}</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed mt-2">{currentKb.remedy}</p>
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Copy-Pasteable RouterOS CLI Patch</span>
                {currentKb.cli ? (
                  <div className="space-y-1">
                    <div className="bg-black/90 border border-zinc-900 rounded p-2.5 font-mono text-[10px] text-emerald-400 select-all overflow-x-auto whitespace-pre">
                      {currentKb.cli}
                    </div>
                    <span className="text-[8px] text-zinc-500 leading-relaxed block font-sans">
                      Paste this command into your RouterOS / WinBox terminal to remediate current CPU constraints.
                    </span>
                  </div>
                ) : (
                  <div className="text-zinc-500 italic text-[11px] pt-1">
                    Remedial scripts are unnecessary. Core temperatures and network throughput align with enterprise SLAs.
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-900/60 text-[9px] text-zinc-500 font-mono">
                  <div>
                    <span className="text-cyan-600 font-bold block">Documentation Ref</span>
                    <span className="truncate block max-w-full" title={activeScenario.referenceKb}>{activeScenario.referenceKb}</span>
                  </div>
                  <div>
                    <span className="text-purple-500 font-bold block">Active Forum Thread</span>
                    <span className="truncate block max-w-full" title={activeScenario.forumLink}>{activeScenario.forumLink}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CLI Logs Stream */}
          <div className="space-y-1 flex-1">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
              RouterOS Real-Time Log Telemetry Stream
            </span>

            <div className="bg-black border border-zinc-900 rounded p-2.5 font-mono text-[10px] leading-relaxed overflow-y-auto h-[120px] shadow-inner space-y-0.5">
              {stressLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-700 italic">
                  <span>No active logs. Click "Start Stress Simulation" above to launch RouterOS CPU stress loop.</span>
                </div>
              ) : (
                stressLogs.map((log, index) => {
                  let color = 'text-zinc-400';
                  if (log.includes('info')) color = 'text-cyan-400';
                  else if (log.includes('warning') || log.includes('error')) color = 'text-red-400 font-bold';
                  else if (log.includes('hp-ilo')) color = 'text-indigo-400';

                  return (
                    <div key={index} className={`${color} whitespace-pre`}>
                      {log}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
