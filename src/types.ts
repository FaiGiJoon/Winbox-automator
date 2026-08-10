export interface InterfaceState {
  name: string;
  type: 'ether' | 'wlan' | 'bridge' | 'vlan' | 'lte';
  ipAddress: string;
  status: 'up' | 'down';
  rxSpeed: string;
  txSpeed: string;
  comment?: string;
}

export interface IPAddressConfig {
  id: string;
  address: string;
  network: string;
  interface: string;
  comment?: string;
}

export interface FirewallNATRule {
  id: string;
  chain: 'srcnat' | 'dstnat';
  outInterface?: string;
  inInterface?: string;
  protocol?: string;
  dstPort?: number;
  action: 'masquerade' | 'dst-nat' | 'redirect';
  toAddresses?: string;
  toPorts?: string;
  comment?: string;
}

export interface FirewallFilterRule {
  id: string;
  chain: 'input' | 'forward' | 'output';
  action: 'accept' | 'drop' | 'reject';
  protocol?: string;
  srcAddress?: string;
  dstAddress?: string;
  dstPort?: number;
  comment?: string;
}

export interface RouterOSCommand {
  command: string;
  explanation: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'command';
}

export type LLMProvider = 'gemini' | 'ollama';

export interface ProviderSettings {
  provider: LLMProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

// STP Configuration
export interface STPConfig {
  bridgeName: string;
  protocolMode: 'rstp' | 'mstp';
  priority: number;
  pathCostMode: 'short' | 'long';
  helloTime: number;
  forwardDelay: number;
  vlanMapping?: string; // MSTP specific mapping
}

// VLAN Configuration
export interface VLANConfig {
  id: string;
  name: string;
  vlanId: number;
  interface: string;
  ipAddress: string;
  dhcpRange: string;
  comment?: string;
}

// DHCP Static Lease Configuration
export interface DHCPLease {
  id: string;
  hostname: string;
  macAddress: string;
  ipAddress: string;
  comment?: string;
  active: boolean;
}

// Wave2 CAPsMAN Config
export interface CAPsMANConfig {
  enabled: boolean;
  interfaces: string[];
  ssidMain: string;
  ssidGuest: string;
  securityProfile: string;
  country: string;
  frequencyMode: 'regulatory-domain' | 'manual';
}

export interface CAPDevice {
  id: string;
  macAddress: string;
  name: string;
  ipAddress: string;
  connectedClients: number;
  status: 'authorized' | 'connected' | 'disabled';
  band: '2.4GHz' | '5GHz' | 'Dual';
}

// WireGuard Configurations
export interface WireGuardTunnel {
  id: string;
  name: string;
  listenPort: number;
  privateKey: string;
  publicKey: string;
  type: 'road-warrior' | 'site-to-site';
  status: 'active' | 'inactive';
  rxBytes: string;
  txBytes: string;
}

export interface WireGuardPeer {
  id: string;
  tunnelId: string;
  name: string;
  allowedIps: string;
  endpoint?: string;
  handshakeTime?: string;
  transferRx: string;
  transferTx: string;
}

// Interface List on R1
export interface InterfaceList {
  name: string;
  members: string[];
}

// RoMON configuration state
export interface RoMONConfig {
  enabled: boolean;
  secret: string;
  id?: string;
}

