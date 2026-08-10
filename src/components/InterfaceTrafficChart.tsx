import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  Activity, 
  ArrowDown, 
  ArrowUp, 
  Download, 
  Upload, 
  Zap, 
  Cpu, 
  Play, 
  Pause, 
  TrendingUp,
  FileJson,
  Wifi,
  Network,
  Radio,
  Infinity
} from 'lucide-react';

export interface TrafficDataPoint {
  rx: number; // in Mbps
  tx: number; // in Mbps
  time: Date;
}

// Sparkline component to display directly in table cells
interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export function InterfaceSparkline({ data, color, width = 110, height = 28 }: SparklineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 2, right: 2, bottom: 2, left: 2 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, chartWidth]);

    const y = d3.scaleLinear()
      .domain([0, Math.max(d3.max(data) || 1, 10)]) // min limit to avoid total flatlines
      .range([chartHeight, 0]);

    const line = d3.line<number>()
      .x((_, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gradient fill under area
    const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;
    const defs = svg.append('defs');
    const linearGrad = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    linearGrad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.25);

    linearGrad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.0);

    // Area
    const area = d3.area<number>()
      .x((_, i) => x(i))
      .y0(chartHeight)
      .y1(d => y(d))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Line path
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Last dot
    const lastIndex = data.length - 1;
    g.append('circle')
      .attr('cx', x(lastIndex))
      .attr('cy', y(data[lastIndex]))
      .attr('r', 2.5)
      .attr('fill', color);

  }, [data, color, width, height]);

  return <svg ref={svgRef} width={width} height={height} className="overflow-visible inline-block opacity-80" />;
}

// Master interactive telemetry graph
interface InterfaceTrafficChartProps {
  interfaceName: string;
  data: TrafficDataPoint[];
  onTriggerSpike: (spikeType: 'iperf' | 'streaming' | 'backup' | 'idle') => void;
  activeSpike: 'iperf' | 'streaming' | 'backup' | 'idle';
  isPaused: boolean;
  onTogglePause: () => void;
}

export default function InterfaceTrafficChart({ 
  interfaceName, 
  data, 
  onTriggerSpike, 
  activeSpike,
  isPaused,
  onTogglePause
}: InterfaceTrafficChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Stats calculation
  const currentRx = data.length > 0 ? data[data.length - 1].rx : 0;
  const currentTx = data.length > 0 ? data[data.length - 1].tx : 0;

  const avgRx = data.length > 0 ? data.reduce((sum, d) => sum + d.rx, 0) / data.length : 0;
  const avgTx = data.length > 0 ? data.reduce((sum, d) => sum + d.tx, 0) / data.length : 0;

  const maxRx = data.length > 0 ? d3.max(data, d => d.rx) || 0 : 0;
  const maxTx = data.length > 0 ? d3.max(data, d => d.tx) || 0 : 0;

  const exportCSV = () => {
    if (!data || data.length === 0) return;

    // Create CSV Header
    const headers = ['Timestamp', 'ISO_Time', 'RX_Throughput_Mbps', 'TX_Throughput_Mbps'];
    
    // Create CSV Rows
    const rows = data.map(point => [
      `"${point.time.toLocaleTimeString()}"`,
      `"${point.time.toISOString()}"`,
      point.rx.toFixed(3),
      point.tx.toFixed(3)
    ]);

    // Join with commas and newlines
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob & download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const timestampStr = new Date().toLocaleTimeString().replace(/[: ]/g, '-');
    link.setAttribute('download', `traffic_telemetry_${interfaceName}_${dateStr}_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data || data.length === 0) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = containerRef.current.clientWidth;
    const height = 260;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Create the main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.time) as [Date, Date])
      .range([0, chartWidth]);

    // Y Scale - auto-scale based on speed with a minimum of 10 Mbps
    const maxVal = d3.max(data, d => Math.max(d.rx, d.tx)) || 10;
    const yMax = Math.max(maxVal * 1.15, 10);
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([chartHeight, 0]);

    // Gridlines helper
    const makeYGridlines = () => d3.axisLeft(y).ticks(5);

    // Add Y Gridlines
    g.append('g')
      .attr('class', 'grid stroke-zinc-900/40 opacity-30')
      .attr('stroke-width', 1)
      .call(makeYGridlines()
        .tickSize(-chartWidth)
        .tickFormat(() => '')
      );

    // Add Axes
    const xAxis = d3.axisBottom(x)
      .ticks(6)
      .tickFormat(d3.timeFormat('%H:%M:%S') as any);

    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d => {
        const val = Number(d);
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}G`;
        }
        return `${val}M`;
      });

    // Style and append axes
    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .attr('class', 'text-zinc-500 font-mono text-[9px]')
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#27272a');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#27272a');

    const yAxisGroup = g.append('g')
      .attr('class', 'text-zinc-500 font-mono text-[9px]')
      .call(yAxis);

    yAxisGroup.select('.domain').attr('stroke', '#27272a');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#27272a');

    // Filter/Defs for neon glow effects
    const defs = svg.append('defs');
    
    // RX Glow
    const rxFilter = defs.append('filter')
      .attr('id', 'glow-rx-heavy')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    rxFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    rxFilter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);

    // TX Glow
    const txFilter = defs.append('filter')
      .attr('id', 'glow-tx-heavy')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    txFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    txFilter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);

    // Area gradients
    const rxGrad = defs.append('linearGradient')
      .attr('id', 'grad-rx-heavy')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    rxGrad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.15);
    rxGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.0);

    const txGrad = defs.append('linearGradient')
      .attr('id', 'grad-tx-heavy')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    txGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ec4899').attr('stop-opacity', 0.15);
    txGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ec4899').attr('stop-opacity', 0.0);

    // Line and Area Generators
    const rxLine = d3.line<TrafficDataPoint>()
      .x(d => x(d.time))
      .y(d => y(d.rx))
      .curve(d3.curveMonotoneX);

    const txLine = d3.line<TrafficDataPoint>()
      .x(d => x(d.time))
      .y(d => y(d.tx))
      .curve(d3.curveMonotoneX);

    const rxArea = d3.area<TrafficDataPoint>()
      .x(d => x(d.time))
      .y0(chartHeight)
      .y1(d => y(d.rx))
      .curve(d3.curveMonotoneX);

    const txArea = d3.area<TrafficDataPoint>()
      .x(d => x(d.time))
      .y0(chartHeight)
      .y1(d => y(d.tx))
      .curve(d3.curveMonotoneX);

    // Draw Areas
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#grad-rx-heavy)')
      .attr('d', rxArea);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#grad-tx-heavy)')
      .attr('d', txArea);

    // Draw Lines
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4') // cyan-500
      .attr('stroke-width', 2.2)
      .attr('filter', 'url(#glow-rx-heavy)')
      .attr('d', rxLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ec4899') // pink-500
      .attr('stroke-width', 2.2)
      .attr('filter', 'url(#glow-tx-heavy)')
      .attr('d', txLine);

    // Interactive tooltip tracker line & labels
    const focus = g.append('g')
      .attr('class', 'focus')
      .style('display', 'none');

    // Vertical line
    focus.append('line')
      .attr('class', 'stroke-zinc-800')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('y1', 0)
      .attr('y2', chartHeight);

    // RX marker
    focus.append('circle')
      .attr('class', 'fill-cyan-400 stroke-[#070709]')
      .attr('stroke-width', 1.5)
      .attr('r', 4.5);

    // TX marker
    focus.append('circle')
      .attr('class', 'fill-pink-500 stroke-[#070709]')
      .attr('stroke-width', 1.5)
      .attr('r', 4.5);

    // Tooltip container
    const tooltipContainer = focus.append('g')
      .attr('transform', 'translate(10, -10)');

    tooltipContainer.append('rect')
      .attr('width', 125)
      .attr('height', 54)
      .attr('fill', '#09090e')
      .attr('stroke', '#27272a')
      .attr('stroke-width', 1)
      .attr('rx', 6);

    const tooltipTime = tooltipContainer.append('text')
      .attr('x', 8)
      .attr('y', 14)
      .attr('class', 'fill-zinc-400 font-mono text-[9px] font-semibold');

    const tooltipRx = tooltipContainer.append('text')
      .attr('x', 8)
      .attr('y', 29)
      .attr('class', 'fill-cyan-400 font-mono text-[9px] font-bold');

    const tooltipTx = tooltipContainer.append('text')
      .attr('x', 8)
      .attr('y', 43)
      .attr('class', 'fill-pink-500 font-mono text-[9px] font-bold');

    // Capture mouse moves
    const overlay = g.append('rect')
      .attr('class', 'fill-none pointer-events-all')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', mousemove);

    const bisectDate = d3.bisector((d: TrafficDataPoint) => d.time).left;

    function mousemove(event: any) {
      const mouseX = d3.pointer(event)[0];
      const x0 = x.invert(mouseX);
      const i = bisectDate(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      if (!d0 || !d1) return;
      const d = x0.getTime() - d0.time.getTime() > d1.time.getTime() - x0.getTime() ? d1 : d0;

      const posX = x(d.time);
      const posY_rx = y(d.rx);
      const posY_tx = y(d.tx);

      focus.select('line')
        .attr('x1', posX)
        .attr('x2', posX);

      focus.selectAll('circle')
        .attr('cx', posX);

      // Select first circle (RX)
      d3.select(focus.selectAll('circle').nodes()[0]).attr('cy', posY_rx);
      // Select second circle (TX)
      d3.select(focus.selectAll('circle').nodes()[1]).attr('cy', posY_tx);

      // Position Tooltip dynamically
      const tooltipX = posX + 145 > chartWidth ? posX - 140 : posX + 10;
      const tooltipY = Math.min(posY_rx, posY_tx) - 20;
      tooltipContainer.attr('transform', `translate(${tooltipX}, ${Math.max(5, Math.min(chartHeight - 65, tooltipY))})`);

      tooltipTime.text(`Time: ${d.time.toLocaleTimeString()}`);
      tooltipRx.text(`RX: ${d.rx.toFixed(2)} Mbps`);
      tooltipTx.text(`TX: ${d.tx.toFixed(2)} Mbps`);
    }

  }, [data, interfaceName]);

  return (
    <div className="bg-[#0a0a0f] border border-[#141422] p-5 rounded-2xl space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className={`text-cyan-400 w-4 h-4 ${isPaused ? '' : 'animate-pulse'}`} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              High-Resolution D3 Telemetry: {interfaceName}
            </span>
            {isPaused && (
              <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse">
                Telemetry Frozen
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 leading-none">
            {isPaused 
              ? 'Telemetry updates are paused. Interact with the graph or hover to investigate traffic patterns.' 
              : 'Streaming link throughput packets. Hover over the area graph to trace exact data points.'}
          </p>
        </div>

        {/* Workload Simulation Controls + Freeze/Resume Toggle */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
              isPaused 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]' 
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={isPaused ? "Resume real-time data flow updates" : "Freeze chart and tables to examine traffic"}
          >
            {isPaused ? <Play size={11} className="text-amber-400 animate-pulse" /> : <Pause size={11} />}
            {isPaused ? 'Resume updates' : 'Pause updates'}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            disabled={!data || data.length === 0}
            className="px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border bg-cyan-950/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(6,182,212,0.05)]"
            title="Download current chart history data as a CSV spreadsheet"
          >
            <Download size={11} className="text-cyan-400" />
            Export CSV
          </button>

          <div className="flex flex-wrap items-center gap-2 bg-[#050508] border border-zinc-900 p-1 rounded-xl">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 px-2">Inject workload:</span>
            
            <button
              onClick={() => onTriggerSpike('iperf')}
              disabled={isPaused}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                isPaused 
                  ? 'opacity-40 cursor-not-allowed text-zinc-600' 
                  : activeSpike === 'iperf' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title={isPaused ? "Unpause to simulate workloads" : "Simulate dynamic 1Gbps physical connection bandwidth benchmark"}
            >
              <Zap size={11} />
              iPerf Benchmark
            </button>

            <button
              onClick={() => onTriggerSpike('streaming')}
              disabled={isPaused}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                isPaused 
                  ? 'opacity-40 cursor-not-allowed text-zinc-600' 
                  : activeSpike === 'streaming' 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title={isPaused ? "Unpause to simulate workloads" : "Simulate standard media playback content workload"}
            >
              <Play size={10} />
              4K UHD Stream
            </button>

            <button
              onClick={() => onTriggerSpike('backup')}
              disabled={isPaused}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                isPaused 
                  ? 'opacity-40 cursor-not-allowed text-zinc-600' 
                  : activeSpike === 'backup' 
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title={isPaused ? "Unpause to simulate workloads" : "Simulate system image cloud replication upload"}
            >
              <Upload size={10} />
              NAS Cloud Backup
            </button>

            <button
              onClick={() => onTriggerSpike('idle')}
              disabled={isPaused}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                isPaused 
                  ? 'opacity-40 cursor-not-allowed text-zinc-600' 
                  : activeSpike === 'idle' 
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-750' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              Idle Subnet
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Statistics Counters + Live D3 Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Stats Block */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3 shrink-0">
          
          {/* RX Spec Card */}
          <div className="bg-[#050508] border border-zinc-900/80 p-3.5 rounded-xl space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[9px] font-black uppercase tracking-widest block">RX THROUGHPUT</span>
              <Download size={13} className="text-cyan-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xl font-bold font-mono text-white block tracking-tight">
                {currentRx.toFixed(1)} <span className="text-xs text-zinc-500 font-sans">Mbps</span>
              </span>
              <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500">
                <span>Avg: <strong className="text-zinc-400">{avgRx.toFixed(1)}M</strong></span>
                <span>Max: <strong className="text-cyan-400">{maxRx.toFixed(1)}M</strong></span>
              </div>
            </div>
          </div>

          {/* TX Spec Card */}
          <div className="bg-[#050508] border border-zinc-900/80 p-3.5 rounded-xl space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[9px] font-black uppercase tracking-widest block">TX THROUGHPUT</span>
              <Upload size={13} className="text-pink-500" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xl font-bold font-mono text-white block tracking-tight">
                {currentTx.toFixed(1)} <span className="text-xs text-zinc-500 font-sans">Mbps</span>
              </span>
              <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500">
                <span>Avg: <strong className="text-zinc-400">{avgTx.toFixed(1)}M</strong></span>
                <span>Max: <strong className="text-pink-400">{maxTx.toFixed(1)}M</strong></span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Canvas: Real-time D3 SVG render container */}
        <div className="lg:col-span-9" ref={containerRef}>
          <svg ref={svgRef} className="w-full h-[260px] select-none" />
        </div>

      </div>

    </div>
  );
}
