import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Package, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  HelpCircle, 
  Settings, 
  HardDrive, 
  Cpu, 
  Clock, 
  Sliders, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  Maximize2, 
  Minus, 
  Radio, 
  CheckCircle2, 
  Layers, 
  Search,
  Sparkles,
  Zap,
  Terminal,
  Shield,
  Activity,
  ArrowUpDown,
  Download,
  Upload,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// WinBox 4.4 Theme Type
export type WinboxTheme = 'auto' | 'dark' | 'light';

// File context type for remembered paths
export type FileContextType = 'upload' | 'download' | 'addresses';

export interface Winbox44FileItem {
  name: string;
  type: 'dir' | 'npk' | 'rsc' | 'backup' | 'txt';
  size: string;
  modified: string;
}

export interface WinboxNeighborDevice {
  mac: string;
  ip: string;
  identity: string;
  version: string;
  board: string;
  uptime: string;
}

interface Winbox44SuiteProps {
  theme: WinboxTheme;
  setTheme: (theme: WinboxTheme) => void;
  scrollbackSize: number;
  setScrollbackSize: (size: number) => void;
  onNavigateSection: (section: string) => void;
  confirmDeletions: boolean;
  setConfirmDeletions: (confirm: boolean) => void;
}

export default function Winbox44Suite({
  theme,
  setTheme,
  scrollbackSize,
  setScrollbackSize,
  onNavigateSection,
  confirmDeletions,
  setConfirmDeletions
}: Winbox44SuiteProps) {
  // Modal states
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSysnote, setShowSysnote] = useState(false);
  const [showLoginNeighbors, setShowLoginNeighbors] = useState(false);
  const [showFilesManager, setShowFilesManager] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showMultiInstanceLog, setShowMultiInstanceLog] = useState(false);

  // WinBox 4.4 Cache State
  const [guiCacheStatus, setGuiCacheStatus] = useState<{
    cachedFilesCount: number;
    cacheSizeBytes: number;
    lastDownloaded: string;
    expiresInDays: number;
    isDownloading: boolean;
    downloadProgress: number;
  }>({
    cachedFilesCount: 18,
    cacheSizeBytes: 4210450, // 4.2 MB
    lastDownloaded: '2026-09-20 05:12:00',
    expiresInDays: 30,
    isDownloading: false,
    downloadProgress: 100
  });

  // Remembered file paths by context (WinBox 4.4: separate context/path for upload/download/addresses)
  const [rememberedPaths, setRememberedPaths] = useState<Record<FileContextType, string>>({
    upload: '/home/admin/packages/v7.16',
    download: '/home/admin/backups/core-router',
    addresses: '/home/admin/address-lists/corp'
  });
  const [activeFileContext, setActiveFileContext] = useState<FileContextType>('upload');

  // Sysnote State
  const [sysnoteText, setSysnoteText] = useState(
`===================================================================
* MIKROTIK ROUTEROS v7.16.1 (2026-09-14) - WINBOX 4.4 READY
* CORE EDGE GATEWAY: R1-Core-HQ
* MANAGEMENT VLAN: 192.168.88.1/24 (VLAN 10/20 ISOLATED)
* STRICT AUDIT LOGGING ENABLED. UNAUTHORIZED ACCESS IS PROHIBITED.
===================================================================`
  );

  // Login Neighbors State (WinBox 4.4: lowercase remember & fallback to MAC if IP invalid)
  const [connectToInput, setConnectToInput] = useState('192.168.88.1');
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('••••••••');
  const [rememberLogin, setRememberLogin] = useState(true); // WinBox 4.4: "remember" lowercase
  const [openInNew, setOpenInNew] = useState(true); // WinBox 4.4: store OS window position and restore
  const [loginSavedTable, setLoginSavedTable] = useState([
    { id: '1', name: 'R1-Core-HQ', address: '192.168.88.1', user: 'admin', note: 'Core Gateway' },
    { id: '2', name: 'SW2-Distribution', address: '6C:3B:6B:11:22:33', user: 'admin', note: 'L2 Switch (MAC-only)' }
  ]);

  // Neighbors list with some invalid/0.0.0.0 IPs to demonstrate MAC fallback
  const [neighborsList] = useState<WinboxNeighborDevice[]>([
    { mac: '6C:3B:6B:44:88:99', ip: '192.168.88.1', identity: 'R1-Core-HQ', version: '7.16.1', board: 'CCR2004-1G-12S+2XS', uptime: '14d 06:22:15' },
    { mac: '48:8F:5A:CC:DD:EE', ip: '0.0.0.0', identity: 'CRS326-24G-2S+IN', version: '7.16.1', board: 'CRS326', uptime: '3d 11:04:12' },
    { mac: 'B8:69:F4:11:55:77', ip: '', identity: 'cAP-ax-GuestArea', version: '7.16.0', board: 'cAPGi-5HaxD2HaxD', uptime: '22d 01:15:30' },
    { mac: '08:55:31:99:AA:BB', ip: '192.168.10.15', identity: 'Storage-NAS-Corp', version: 'Linux-ROS-MNDP', board: 'x86_64', uptime: '89d 19:40:02' }
  ]);

  // Files browser state (.npk files have distinct colors)
  const [filesList] = useState<Winbox44FileItem[]>([
    { name: 'skins', type: 'dir', size: '4.0 KB', modified: '2026-09-01 10:00' },
    { name: 'pubkey', type: 'dir', size: '4.0 KB', modified: '2026-09-05 14:22' },
    { name: 'routeros-7.16.1-arm64.npk', type: 'npk', size: '14.2 MB', modified: '2026-09-14 18:30' },
    { name: 'wireless-7.16.1-arm64.npk', type: 'npk', size: '3.8 MB', modified: '2026-09-14 18:30' },
    { name: 'container-7.16.1-arm64.npk', type: 'npk', size: '1.9 MB', modified: '2026-09-14 18:30' },
    { name: 'daily-backup-r1.backup', type: 'backup', size: '642 KB', modified: '2026-09-19 03:00' },
    { name: 'config-vlan-export.rsc', type: 'rsc', size: '28.4 KB', modified: '2026-09-20 04:30' },
    { name: 'sysnote.txt', type: 'txt', size: '1.2 KB', modified: '2026-09-14 12:00' }
  ]);

  // Handle clearing GUI file cache (WinBox 4.4 feature)
  const handleClearGuiCache = () => {
    setGuiCacheStatus(prev => ({
      ...prev,
      cachedFilesCount: 0,
      cacheSizeBytes: 0,
      lastDownloaded: 'Cache Cleared',
      isDownloading: false,
      downloadProgress: 0
    }));
  };

  // Simulate redownloading GUI files
  const handleRedownloadGuiFiles = () => {
    setGuiCacheStatus(prev => ({
      ...prev,
      isDownloading: true,
      downloadProgress: 15
    }));

    const interval = setInterval(() => {
      setGuiCacheStatus(prev => {
        if (prev.downloadProgress >= 100) {
          clearInterval(interval);
          return {
            ...prev,
            isDownloading: false,
            downloadProgress: 100,
            cachedFilesCount: 18,
            cacheSizeBytes: 4210450,
            lastDownloaded: new Date().toISOString().replace('T', ' ').substring(0, 19),
            expiresInDays: 30
          };
        }
        return {
          ...prev,
          downloadProgress: Math.min(100, prev.downloadProgress + 25)
        };
      });
    }, 400);
  };

  // Neighbor click handler (WinBox 4.4: "use mac address if IP not valid when clicking any cell")
  const handleSelectNeighbor = (neighbor: WinboxNeighborDevice) => {
    const isIpValid = neighbor.ip && neighbor.ip !== '0.0.0.0' && neighbor.ip !== 'unassigned';
    if (isIpValid) {
      setConnectToInput(neighbor.ip);
    } else {
      // Auto fallback to MAC address as per WinBox 4.4 update!
      setConnectToInput(neighbor.mac);
    }
  };

  return (
    <>
      {/* 1. WINBOX 4.4 PERSISTENT BOTTOM RESOURCES PANEL */}
      {/* (WinBox 4.4: "allow opening relevant sections when clicking on Resources bottom panel") */}
      <footer 
        className="fixed bottom-0 left-64 right-0 h-8 bg-[#09090d] border-t border-[#1a1a28] z-40 flex items-center justify-between px-4 select-none text-[11px] font-mono text-zinc-400"
        title="WinBox 4.4 Resources Bar - Click any metric to open its configuration panel"
      >
        <div className="flex items-center gap-4 divide-x divide-zinc-800/80">
          {/* CPU Metric -> Opens Hardware / Stress Test */}
          <button 
            onClick={() => onNavigateSection('stresstest')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors pr-3 cursor-pointer group"
            title="CPU Usage: 14% (Click to open Hardware Stress Test)"
          >
            <Cpu size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>CPU: <strong className="text-zinc-200">14%</strong></span>
          </button>

          {/* Memory Free -> Opens Files & Cache */}
          <button 
            onClick={() => setShowFilesManager(true)}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors px-3 cursor-pointer group"
            title="Free RAM: 842.6 MB / 1024 MB (Click to open WinBox 4.4 Files & GUI Cache)"
          >
            <HardDrive size={12} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>RAM: <strong className="text-zinc-200">842 MB free</strong></span>
          </button>

          {/* HDD/Flash Free -> Opens Files Manager */}
          <button 
            onClick={() => setShowFilesManager(true)}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors px-3 cursor-pointer group hidden sm:flex"
            title="Storage: 42.5 MB / 64 MB (Click to open Files Browser)"
          >
            <Folder size={12} className="text-amber-400" />
            <span>Disk: <strong className="text-zinc-200">42.5 MB</strong></span>
          </button>

          {/* Uptime -> Opens Clock & RoMON System */}
          <button 
            onClick={() => onNavigateSection('mangle')}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors px-3 cursor-pointer group hidden md:flex"
            title="System Uptime: 14d 06:22:15 (Click to open RoMON & System Clock)"
          >
            <Clock size={12} className="text-purple-400" />
            <span>Uptime: <strong className="text-zinc-200">14d 06:22</strong></span>
          </button>

          {/* RouterOS & WinBox Version -> Opens What's New */}
          <button 
            onClick={() => setShowWhatsNew(true)}
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors px-3 cursor-pointer group hidden lg:flex"
            title="WinBox 4.4 (2026-09-14) - Click to inspect 4.4 update changelog"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ROS <strong className="text-zinc-200">v7.16.1</strong> · WinBox <strong className="text-cyan-400">v4.4</strong></span>
          </button>

          {/* GUI File Cache Badge (WinBox 4.4) */}
          <button
            onClick={() => setShowFilesManager(true)}
            className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors px-3 cursor-pointer hidden xl:flex text-[10px]"
            title="ROS GUI File Caching (Cached for 30d in OS directory)"
          >
            <CheckCircle2 size={11} className="text-cyan-400" />
            <span className="text-zinc-400">GUI Cache: <strong className="text-cyan-300">Active (30d)</strong></span>
          </button>
        </div>

        {/* Right-aligned Quick Controls for WinBox 4.4 */}
        <div className="flex items-center gap-2">
          {/* What's New in 4.4 button */}
          <button
            onClick={() => setShowWhatsNew(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 font-sans text-[10px] font-bold cursor-pointer transition-colors"
            title="View What's New in WinBox 4.4 (2026-09-14)"
          >
            <Sparkles size={11} className="text-cyan-400" />
            <span>v4.4 Update</span>
          </button>

          {/* Login / Neighbors Manager */}
          <button
            onClick={() => setShowLoginNeighbors(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-sans text-[10px] font-medium cursor-pointer transition-colors"
            title="Open WinBox 4.4 Login & Neighbors Manager"
          >
            <Radio size={11} className="text-emerald-400" />
            <span className="hidden sm:inline">Neighbors</span>
          </button>

          {/* Files & Cache Manager */}
          <button
            onClick={() => setShowFilesManager(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-sans text-[10px] font-medium cursor-pointer transition-colors"
            title="Open Files Menu (.npk colors & ROS GUI cache)"
          >
            <Folder size={11} className="text-amber-400" />
            <span className="hidden sm:inline">Files</span>
          </button>

          {/* Sysnote popup (monospace) */}
          <button
            onClick={() => setShowSysnote(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-sans text-[10px] font-medium cursor-pointer transition-colors"
            title="Open /system note Monospace Popup"
          >
            <FileText size={11} className="text-purple-400" />
            <span className="hidden md:inline">SysNote</span>
          </button>

          {/* Shortcuts popup with spacers and Shift+Click info */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-sans text-[10px] font-medium cursor-pointer transition-colors"
            title="Open WinBox 4.4 Shortcuts & Tips Panel"
          >
            <HelpCircle size={11} className="text-cyan-400" />
            <span>Shortcuts</span>
          </button>

          {/* Preferences (Theme, Buffer size, Cache) */}
          <button
            onClick={() => setShowPreferences(true)}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-colors"
            title="Open WinBox 4.4 Preferences (Theme, Terminal Scrollback Buffer, Cache)"
          >
            <Settings size={12} />
          </button>
        </div>
      </footer>

      {/* 2. WHAT'S NEW IN WINBOX 4.4 MODAL */}
      <AnimatePresence>
        {showWhatsNew && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-cyan-800/40 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e17]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-md">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      WinBox 4.4 Update
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono font-bold">
                        2026-09-14
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Implemented official MikroTik WinBox 4.4 feature suite and architecture upgrades
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWhatsNew(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-xs">
                {/* Highlight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block flex items-center gap-1">
                      <HardDrive size={11} /> ROS GUI File Caching
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      Cached for 30 days in standard OS cache dir; rechecked on startup after 24h.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1">
                      <Radio size={11} /> MAC Fallback Login
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      Neighbors discovery automatically uses MAC address if IP address is unassigned or invalid.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/30 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block flex items-center gap-1">
                      <Package size={11} /> .NPK Package Icons
                    </span>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      Distinct icon colors for RouterOS `.npk` files to clearly differentiate them from directories.
                    </p>
                  </div>
                </div>

                {/* Detailed Changelog Checklist */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">
                    Official WinBox 4.4 Changelog Items
                  </h3>

                  <div className="space-y-2.5 font-mono text-[11px]">
                    <ChangelogRow 
                      category="app" 
                      item="add ROS gui file caching support (standard OS cache dir, 30 days retention, 24h startup check)"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowFilesManager(true); }}
                    />
                    <ChangelogRow 
                      category="app" 
                      item="remember previously used file selector dialog path (separate context/path for upload, download, addresses)"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowFilesManager(true); }}
                    />
                    <ChangelogRow 
                      category="login" 
                      item="neighbors: use mac address if IP not valid when clicking any cell"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowLoginNeighbors(true); }}
                    />
                    <ChangelogRow 
                      category="login" 
                      item="ui: login panel change Remember -> remember (lower case) for consistency"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowLoginNeighbors(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add Clear cache button in settings panel"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowPreferences(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add confirmation dialog when removing table items with session opt-out (Login Saved table always asks)"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); onNavigateSection('filters'); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add downloading gui files progress information"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowFilesManager(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add option to auto follow system theme (auto / dark / light)"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowPreferences(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add option to configure terminal scrollback buffer size"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowPreferences(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="add spacers in Shortcuts info popup panel & Shift+Click multi-sort / multi-tab info"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowShortcuts(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="allow opening relevant sections when clicking on Resources bottom panel (CPU, RAM, HDD, Uptime)"
                      status="Active in App"
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="change color of .npk icons in Files menu to differ from directories"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowFilesManager(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="make sysnote popup display in monospace font"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); setShowSysnote(true); }}
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="make default scrollbar width/height a few px larger (increased from 6px to 10px)"
                      status="Active in App"
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="pause event list message auto removal while list is mouse hovered"
                      status="Active in App"
                    />
                    <ChangelogRow 
                      category="ui" 
                      item="table: add shortcut tooltip info for Find widget and make it wider (w-72)"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); onNavigateSection('filters'); }}
                    />
                    <ChangelogRow 
                      category="form" 
                      item="add support to reset configuration for some objects & prevent parallel add/set calls"
                      status="Active in App"
                    />
                    <ChangelogRow 
                      category="graphs" 
                      item="graphs: show y labels and values in same scale"
                      status="Active in App"
                      onClick={() => { setShowWhatsNew(false); onNavigateSection('interfaces'); }}
                    />
                    <ChangelogRow 
                      category="api" 
                      item="winbox-api: add support for new field types for future use & ros6 routing compatibility"
                      status="Active in App"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-[#0e0e17] flex justify-end">
                <button
                  onClick={() => setShowWhatsNew(false)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close &amp; Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. WINBOX 4.4 SHORTCUTS INFO PANEL (WITH SPACERS & SHIFT+CLICK INFO) */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c0c14] border border-[#1e1e30] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0f0f1a]">
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">WinBox 4.4 Shortcuts &amp; Mouse Gestures</h3>
                </div>
                <button 
                  onClick={() => setShowShortcuts(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-xs">
                {/* Notice on 4.4 Update */}
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex items-start gap-2">
                  <Info size={15} className="shrink-0 mt-0.5 text-cyan-400" />
                  <div>
                    <strong>New in WinBox 4.4:</strong> Spaced categories, Shift+Click multi-column sorting, and Shift+Click multi-window instance handling.
                  </div>
                </div>

                {/* Section 1: Mouse & Selection Controls */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                    Mouse &amp; Table Sorting Gestures
                  </span>
                  <div className="space-y-1.5">
                    <ShortcutItem 
                      keys="Shift + Click (Column Header)" 
                      desc="Multi-column sort across tables (primary sort + secondary column tie-breaker)" 
                      highlight
                    />
                    <ShortcutItem 
                      keys="Shift + Click (Window / Tab)" 
                      desc="Open duplicate internal instance of window (e.g. Log, Radius, Ping) without replacing current view" 
                      highlight
                    />
                    <ShortcutItem 
                      keys="Click on Neighbors Cell" 
                      desc="Autoselects IP, or automatically falls back to MAC address if IP is unassigned or invalid" 
                      highlight
                    />
                  </div>
                </div>

                {/* SPACER 1 (WinBox 4.4: add spacers in Shortcuts info popup panel) */}
                <div className="h-4 border-b border-zinc-800/80 my-2" />

                {/* Section 2: Table & Rule Management */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                    Table &amp; Rule Management
                  </span>
                  <div className="space-y-1.5">
                    <ShortcutItem 
                      keys="Ctrl + F" 
                      desc="Focus Find/Search widget in current table (widened in 4.4 for ease of typing)" 
                    />
                    <ShortcutItem 
                      keys="Del / Delete" 
                      desc="Delete selected row(s) with confirmation dialog (supports 'Do not ask again' opt-out)" 
                    />
                    <ShortcutItem 
                      keys="Spacebar" 
                      desc="Toggle rule or interface between Enabled and Disabled" 
                    />
                    <ShortcutItem 
                      keys="Ctrl + D" 
                      desc="Disable selected rule or interface" 
                    />
                    <ShortcutItem 
                      keys="Ctrl + E" 
                      desc="Enable selected rule or interface" 
                    />
                  </div>
                </div>

                {/* SPACER 2 */}
                <div className="h-4 border-b border-zinc-800/80 my-2" />

                {/* Section 3: Navigation & Window Commands */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                    Workspace &amp; Window Commands
                  </span>
                  <div className="space-y-1.5">
                    <ShortcutItem 
                      keys="Ctrl + T" 
                      desc="Open integrated RouterOS CLI Terminal window" 
                    />
                    <ShortcutItem 
                      keys="Click Bottom Bar Metric" 
                      desc="Jumps directly to Hardware Stress, Files & Cache, RoMON Clock, or Version overview" 
                    />
                    <ShortcutItem 
                      keys="Ctrl + Shift + N" 
                      desc="Open in New Window (stores OS window position and restores geometry)" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-[#0f0f1a] flex justify-end">
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. WINBOX 4.4 SYSNOTE POPUP (STRICT MONOSPACE FONT) */}
      <AnimatePresence>
        {showSysnote && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-purple-800/40 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e17]">
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-purple-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">System Note (/system note)</h3>
                    <span className="text-[10px] text-zinc-400 font-mono">Displayed in strict monospace font (WinBox 4.4)</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSysnote(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 bg-black/90 border border-zinc-800 rounded-xl font-mono text-xs text-emerald-400 whitespace-pre-wrap select-all leading-relaxed shadow-inner">
                  {sysnoteText}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Edit Router System Note
                  </label>
                  <textarea 
                    value={sysnoteText}
                    onChange={(e) => setSysnoteText(e.target.value)}
                    rows={4}
                    className="w-full bg-[#06060a] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-[#0e0e17] flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 font-mono">/system note set show-at-login=yes</span>
                <button
                  onClick={() => setShowSysnote(false)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save &amp; Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. WINBOX 4.4 LOGIN & NEIGHBORS PANEL (LOWERCASE remember & MAC FALLBACK) */}
      <AnimatePresence>
        {showLoginNeighbors && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e17]">
                <div className="flex items-center gap-2.5">
                  <Radio size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">WinBox 4.4 Login &amp; Neighbors Manager</h3>
                </div>
                <button 
                  onClick={() => setShowLoginNeighbors(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-xs">
                {/* Login Form (WinBox 4.4: lowercase "remember") */}
                <div className="bg-[#08080e] border border-zinc-800/80 p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
                        Connect To (IP or MAC)
                      </label>
                      <input 
                        type="text" 
                        value={connectToInput} 
                        onChange={(e) => setConnectToInput(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
                        Login
                      </label>
                      <input 
                        type="text" 
                        value={loginUser} 
                        onChange={(e) => setLoginUser(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
                        Password
                      </label>
                      <input 
                        type="password" 
                        value={loginPass} 
                        onChange={(e) => setLoginPass(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Options row */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800/60 gap-3">
                    <div className="flex items-center gap-4">
                      {/* WinBox 4.4 specific: "ui: login panel change Remember -> remember (lower case) for consistency" */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-300">
                        <input 
                          type="checkbox" 
                          checked={rememberLogin} 
                          onChange={(e) => setRememberLogin(e.target.checked)}
                          className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                        />
                        <span className="font-mono text-xs">remember</span>
                        <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                          v4.4 lowercase
                        </span>
                      </label>

                      {/* WinBox 4.4 specific: "store OS window position in workspace files and restore when connecting with open in new" */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-300">
                        <input 
                          type="checkbox" 
                          checked={openInNew} 
                          onChange={(e) => setOpenInNew(e.target.checked)}
                          className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                        />
                        <span className="font-sans text-xs">Open in New (Restore Window Position)</span>
                      </label>
                    </div>

                    <button 
                      onClick={() => setShowLoginNeighbors(false)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* Neighbors Table (WinBox 4.4: "login,neighbors: use mac address if IP not valid when clicking any cell") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Discovered Neighbors (MNDP / CDP / LLDP)
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        Click any cell: If IP is invalid or 0.0.0.0, WinBox 4.4 automatically selects MAC address.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      4 Devices Online
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-black/50 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-2.5 px-3">MAC Address</th>
                          <th className="py-2.5 px-3 font-mono">IP Address</th>
                          <th className="py-2.5 px-3">Identity</th>
                          <th className="py-2.5 px-3">Version</th>
                          <th className="py-2.5 px-3">Platform / Board</th>
                          <th className="py-2.5 px-3">Uptime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-mono text-[11px]">
                        {neighborsList.map((dev, idx) => {
                          const isInvalidIp = !dev.ip || dev.ip === '0.0.0.0';
                          return (
                            <tr 
                              key={idx}
                              onClick={() => handleSelectNeighbor(dev)}
                              className="hover:bg-cyan-950/20 hover:border-l-2 hover:border-cyan-400 transition-colors cursor-pointer group"
                              title={`Click to connect: ${isInvalidIp ? 'Will connect via MAC ' + dev.mac : 'Will connect via IP ' + dev.ip}`}
                            >
                              <td className="py-2.5 px-3 text-cyan-400 font-bold group-hover:text-cyan-300">
                                {dev.mac}
                              </td>
                              <td className="py-2.5 px-3">
                                {isInvalidIp ? (
                                  <span className="text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                    {dev.ip || 'none'} (auto-MAC)
                                  </span>
                                ) : (
                                  <span className="text-zinc-300 font-bold">{dev.ip}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-sans font-semibold text-white">
                                {dev.identity}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400">
                                {dev.version}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-500">
                                {dev.board}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400">
                                {dev.uptime}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Saved Logins Table (WinBox 4.4: "except Login Saved table always ask for confirmation") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Managed Saved Logins
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        Rule guarantee: Removing a Saved Login always requires confirmation dialog (opt-out exempt).
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-black/50 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-2.5 px-3">Device Name</th>
                          <th className="py-2.5 px-3 font-mono">Address</th>
                          <th className="py-2.5 px-3">Username</th>
                          <th className="py-2.5 px-3">Note</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-mono text-[11px]">
                        {loginSavedTable.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="py-2 px-3 font-sans font-bold text-white">{item.name}</td>
                            <td className="py-2 px-3 text-cyan-400">{item.address}</td>
                            <td className="py-2 px-3 text-zinc-400">{item.user}</td>
                            <td className="py-2 px-3 font-sans text-zinc-500">{item.note}</td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  if (window.confirm(`WinBox 4.4 Confirmation: Delete saved connection "${item.name}"? (Login Saved table always requires confirmation)`)) {
                                    setLoginSavedTable(prev => prev.filter(x => x.id !== item.id));
                                  }
                                }}
                                className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                                title="Remove saved connection (always confirms)"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-[#0e0e17] flex justify-end">
                <button
                  onClick={() => setShowLoginNeighbors(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. WINBOX 4.4 FILES & ROS GUI CACHE MANAGER */}
      <AnimatePresence>
        {showFilesManager && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-amber-800/40 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e17]">
                <div className="flex items-center gap-2.5">
                  <Folder size={18} className="text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">WinBox 4.4 Files &amp; ROS GUI Cache Manager</h3>
                    <p className="text-[10px] text-zinc-400">
                      Standard OS directory caching · .npk distinct icon coloring · Context-remembered paths
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFilesManager(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-xs">
                {/* ROS GUI File Caching Status Panel */}
                <div className="p-4 rounded-xl bg-[#08080f] border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive size={15} className="text-cyan-400" />
                      <span className="font-bold text-white text-xs">ROS GUI File Cache Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleClearGuiCache}
                        className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Clear Cache button in settings panel (WinBox 4.4)"
                      >
                        <Trash2 size={11} />
                        Clear Cache
                      </button>
                      <button 
                        onClick={handleRedownloadGuiFiles}
                        disabled={guiCacheStatus.isDownloading}
                        className="px-2.5 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RefreshCw size={11} className={guiCacheStatus.isDownloading ? 'animate-spin' : ''} />
                        Refresh Definitions
                      </button>
                    </div>
                  </div>

                  {/* Cache info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                    <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">Cached Files</span>
                      <strong className="text-white text-xs">{guiCacheStatus.cachedFilesCount} items</strong>
                    </div>
                    <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">Cache Size</span>
                      <strong className="text-cyan-400 text-xs">{(guiCacheStatus.cacheSizeBytes / (1024*1024)).toFixed(2)} MB</strong>
                    </div>
                    <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">Retention</span>
                      <strong className="text-emerald-400 text-xs">30 Days</strong>
                    </div>
                    <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block">Startup Check</span>
                      <strong className="text-purple-400 text-xs">Every 24h</strong>
                    </div>
                  </div>

                  {/* Progress info if downloading (WinBox 4.4: "ui: add downloading gui files progress information") */}
                  {guiCacheStatus.isDownloading && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-cyan-300">
                        <span>Downloading ROS GUI definition files...</span>
                        <span>{guiCacheStatus.downloadProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${guiCacheStatus.downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    <span>OS Cache Dir: ~/.cache/winbox/gui/ · Last validated: {guiCacheStatus.lastDownloaded}</span>
                  </div>
                </div>

                {/* Context-remembered paths (WinBox 4.4: "app: remember previously used file selector dialog path; for upload/download/addresses separate context/path") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Context-Remembered Dialog Paths
                    </span>
                    <span className="text-[10px] text-zinc-400">Separate path per context (WinBox 4.4)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['upload', 'download', 'addresses'] as FileContextType[]).map((ctx) => (
                      <button
                        key={ctx}
                        onClick={() => setActiveFileContext(ctx)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          activeFileContext === ctx 
                            ? 'bg-cyan-950/30 border-cyan-500 text-white font-bold'
                            : 'bg-[#08080f] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-widest text-zinc-500 block">{ctx} path</span>
                        <span className="font-mono text-[10px] text-cyan-400 truncate block mt-0.5">
                          {rememberedPaths[ctx]}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 items-center bg-black border border-zinc-800 rounded-xl p-2 font-mono text-xs">
                    <span className="text-zinc-500 uppercase text-[9px] font-bold px-1.5">Current {activeFileContext}:</span>
                    <input 
                      type="text" 
                      value={rememberedPaths[activeFileContext]}
                      onChange={(e) => setRememberedPaths(prev => ({ ...prev, [activeFileContext]: e.target.value }))}
                      className="flex-1 bg-transparent text-cyan-300 focus:outline-none"
                    />
                    <button 
                      onClick={() => alert(`Saved path for ${activeFileContext}: ${rememberedPaths[activeFileContext]}`)}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-white font-sans cursor-pointer"
                    >
                      Update Path
                    </button>
                  </div>
                </div>

                {/* Files Table (WinBox 4.4: "ui: change color of .npk icons in Files menu to differ from directories") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      RouterOS File Repository
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Folder size={12} /> Directory
                      </span>
                      <span className="flex items-center gap-1 text-purple-400 font-bold">
                        <Package size={12} /> .npk Package (WinBox 4.4 distinct color)
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-black/50 text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-2.5 px-3">File Name</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 font-mono">Size</th>
                          <th className="py-2.5 px-3">Last Modified</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-mono text-[11px]">
                        {filesList.map((file, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="py-2 px-3 flex items-center gap-2">
                              {file.type === 'dir' ? (
                                <Folder size={14} className="text-amber-400 shrink-0" />
                              ) : file.type === 'npk' ? (
                                // WinBox 4.4 specific: distinct color for .npk files!
                                <Package size={14} className="text-purple-400 shrink-0 animate-pulse" />
                              ) : (
                                <FileText size={14} className="text-zinc-500 shrink-0" />
                              )}
                              <span className={file.type === 'npk' ? 'text-purple-300 font-bold' : 'text-zinc-300'}>
                                {file.name}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                file.type === 'npk' 
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' 
                                  : file.type === 'dir'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}>
                                {file.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-zinc-400">{file.size}</td>
                            <td className="py-2 px-3 text-zinc-500">{file.modified}</td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1 text-zinc-500">
                                <button className="hover:text-cyan-400 p-1 cursor-pointer" title="Download file">
                                  <Download size={12} />
                                </button>
                                <button className="hover:text-red-400 p-1 cursor-pointer" title="Delete file">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-[#0e0e17] flex justify-end">
                <button
                  onClick={() => setShowFilesManager(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. WINBOX 4.4 PREFERENCES MODAL (THEME AUTO/DARK/LIGHT, SCROLLBACK BUFFER, CLEAR CACHE) */}
      <AnimatePresence>
        {showPreferences && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0b12] border border-zinc-800 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e0e17]">
                <div className="flex items-center gap-2.5">
                  <Settings size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">WinBox 4.4 Preferences &amp; Settings</h3>
                </div>
                <button 
                  onClick={() => setShowPreferences(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* 1. Theme Selection (WinBox 4.4: "ui: add option to auto follow system theme (auto/dark/light)") */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                    UI Theme Mode (WinBox 4.4)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['auto', 'dark', 'light'] as WinboxTheme[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setTheme(m)}
                        className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                          theme === m 
                            ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/20' 
                            : 'bg-[#08080f] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {m === 'auto' ? 'Auto (System)' : m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Auto dynamically synchronizes with your host operating system light/dark preference.
                  </p>
                </div>

                {/* 2. Terminal Scrollback Buffer Size (WinBox 4.4: "ui: add option to configure terminal scrollback buffer size") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                      Terminal Scrollback Buffer Size
                    </label>
                    <span className="font-mono text-cyan-400 font-bold">{scrollbackSize.toLocaleString()} lines</span>
                  </div>
                  <input 
                    type="range" 
                    min={500} 
                    max={10000} 
                    step={500}
                    value={scrollbackSize}
                    onChange={(e) => setScrollbackSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                    <span>500 lines (Low RAM)</span>
                    <span>2,000 (Default)</span>
                    <span>10,000 lines (Full Audit)</span>
                  </div>
                </div>

                {/* 3. Table item confirmation dialog preference */}
                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Table Item Deletion Confirmation</span>
                      <p className="text-[10px] text-zinc-400">
                        Prompt with confirmation dialog before removing table rows (opt-out available)
                      </p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={confirmDeletions}
                      onChange={(e) => setConfirmDeletions(e.target.checked)}
                      className="rounded border-zinc-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Clear Cache Button in Settings Panel (WinBox 4.4: "ui: add Clear cache button in settings panel") */}
                <div className="p-4 rounded-xl bg-[#08080f] border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Local ROS GUI Cache</span>
                      <p className="text-[10px] text-zinc-400">
                        Stored in standard OS cache directory (~/.cache/winbox/gui)
                      </p>
                    </div>
                    <button
                      onClick={handleClearGuiCache}
                      className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      Clear Cache
                    </button>
                  </div>
                  {guiCacheStatus.cachedFilesCount === 0 ? (
                    <span className="text-[10px] text-emerald-400 font-mono block">✓ Cache is clean</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      Currently using {(guiCacheStatus.cacheSizeBytes / (1024*1024)).toFixed(2)} MB across {guiCacheStatus.cachedFilesCount} files
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-[#0e0e17] flex justify-end">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Subcomponents for Shortcuts and Changelog
function ShortcutItem({ keys, desc, highlight }: { keys: string; desc: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-lg flex items-center justify-between gap-3 ${
      highlight ? 'bg-cyan-950/20 border border-cyan-800/30' : 'bg-black/40 border border-zinc-900'
    }`}>
      <span className="text-zinc-300 font-sans text-xs">{desc}</span>
      <kbd className="px-2 py-1 bg-zinc-900 text-cyan-400 border border-zinc-800 rounded text-[10px] font-mono font-bold shrink-0 shadow-xs">
        {keys}
      </kbd>
    </div>
  );
}

function ChangelogRow({ 
  category, 
  item, 
  status, 
  onClick 
}: { 
  category: string; 
  item: string; 
  status: string; 
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`p-2 rounded-lg bg-black/40 border border-zinc-900/80 flex items-center justify-between gap-3 text-zinc-300 transition-colors ${
        onClick ? 'hover:border-cyan-500/40 hover:bg-cyan-950/10 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] uppercase font-bold">
          {category}
        </span>
        <span className="text-zinc-300 text-[11px]">{item}</span>
      </div>
      <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono shrink-0">
        {status}
      </span>
    </div>
  );
}
