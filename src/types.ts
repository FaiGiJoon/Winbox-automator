export interface InterfaceState {
  name: string;
  type: 'ether' | 'wlan' | 'bridge' | 'vlan';
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
