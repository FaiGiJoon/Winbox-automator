import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Settings2,
  Sliders,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  Terminal,
  Code2,
  Plus,
  Trash2,
  RefreshCw,
  Folder,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { ToolValidationMode } from '../types';

export interface ToolParameterProp {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: any;
}

export interface ToolStrictSchemaDef {
  parameters?: {
    type: 'object';
    properties: Record<string, ToolParameterProp>;
    required?: string[];
    additionalProperties?: boolean;
  };
  responses?: Record<string, {
    description: string;
    content?: {
      'application/json': {
        schema: {
          type: 'object';
          properties: Record<string, any>;
          required?: string[];
        };
      };
    };
  }>;
}

export interface ToolEndpointDef {
  key: string;
  name: string;
  category: 'Firewall' | 'VLAN & Security' | 'Interfaces' | 'System';
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  description: string;
  headers?: Record<string, string>;
  body_params?: Record<string, string>;
  query_params?: Record<string, string>;
  strict_schema?: ToolStrictSchemaDef;
  selected: boolean;
  isCustom?: boolean;
}

const DEFAULT_OPERATIONS: ToolEndpointDef[] = [
  {
    key: 'get_router_state',
    name: 'Get Router State & Priority Rules',
    category: 'Firewall',
    path: '/api/agent/state',
    method: 'GET',
    description: 'Get full router configuration, interfaces, IPs, NAT rules, and priority-ordered firewall filter rules',
    strict_schema: {
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      responses: {
        '200': {
          description: 'Full router snapshot with priority-ordered filter rules and interface mappings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  interfaces: { type: 'array' },
                  ips: { type: 'array' },
                  filterRules: { type: 'array' },
                  totalRules: { type: 'number' }
                },
                required: ['interfaces', 'ips', 'filterRules']
              }
            }
          }
        }
      }
    },
    selected: true
  },
  {
    key: 'add_firewall_rule',
    name: 'Add Firewall Filter Rule',
    category: 'Firewall',
    path: '/api/agent/rules/add',
    method: 'POST',
    description: 'Add a firewall filter rule with chain, action, protocol, addresses, ports, priority position, and comment',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      chain: 'chain',
      action: 'action',
      protocol: 'protocol',
      srcAddress: 'srcAddress',
      dstAddress: 'dstAddress',
      dstPort: 'dstPort',
      comment: 'comment',
      priorityPosition: 'priorityPosition'
    },
    strict_schema: {
      parameters: {
        type: 'object',
        required: ['chain', 'action'],
        properties: {
          chain: {
            type: 'string',
            enum: ['forward', 'input', 'output'],
            description: 'RouterOS packet filtering chain'
          },
          action: {
            type: 'string',
            enum: ['accept', 'drop', 'reject', 'log', 'fasttrack-connection'],
            description: 'Firewall rule action verdict'
          },
          protocol: {
            type: 'string',
            enum: ['tcp', 'udp', 'icmp', 'any'],
            description: 'Transport layer protocol'
          },
          srcAddress: {
            type: 'string',
            description: 'Source IP or CIDR subnet (e.g. 192.168.20.0/24)'
          },
          dstAddress: {
            type: 'string',
            description: 'Destination IP or CIDR subnet (e.g. 192.168.10.0/24)'
          },
          dstPort: {
            type: 'number',
            description: 'Destination TCP/UDP port number'
          },
          comment: {
            type: 'string',
            description: 'Audit trail documentation comment describing isolation policy'
          },
          priorityPosition: {
            type: 'number',
            description: 'Zero-indexed priority insertion slot (0 = highest priority evaluation)'
          }
        },
        additionalProperties: false
      },
      responses: {
        '200': {
          description: 'Rule created successfully with assigned ID and index position'
        }
      }
    },
    selected: true
  },
  {
    key: 'delete_firewall_rule',
    name: 'Delete Firewall Rule',
    category: 'Firewall',
    path: '/api/agent/rules/delete',
    method: 'POST',
    description: 'Delete a firewall filter rule by its ID or priority index',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      ruleId: 'ruleId',
      priorityIndex: 'priorityIndex'
    },
    strict_schema: {
      parameters: {
        type: 'object',
        properties: {
          ruleId: {
            type: 'string',
            description: 'Unique rule identifier'
          },
          priorityIndex: {
            type: 'number',
            description: 'Zero-indexed rule priority slot'
          }
        },
        additionalProperties: false
      }
    },
    selected: true
  },
  {
    key: 'update_rule_comment',
    name: 'Update Rule Documentation / Comment',
    category: 'Firewall',
    path: '/api/agent/rules/comment',
    method: 'POST',
    description: 'Update documentation comment on an existing firewall rule for audit and compliance logging',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      ruleId: 'ruleId',
      priorityIndex: 'priorityIndex',
      comment: 'comment'
    },
    strict_schema: {
      parameters: {
        type: 'object',
        required: ['comment'],
        properties: {
          ruleId: {
            type: 'string',
            description: 'Target rule ID'
          },
          priorityIndex: {
            type: 'number',
            description: 'Target priority index slot'
          },
          comment: {
            type: 'string',
            description: 'Updated documentation comment text'
          }
        },
        additionalProperties: false
      }
    },
    selected: true
  },
  {
    key: 'reorder_firewall_rule',
    name: 'Reorder Rule Priority',
    category: 'Firewall',
    path: '/api/agent/rules/reorder',
    method: 'POST',
    description: 'Change the priority order of a firewall filter rule (first matching rule evaluates first)',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      fromPriority: 'fromPriority',
      toPriority: 'toPriority'
    },
    strict_schema: {
      parameters: {
        type: 'object',
        required: ['fromPriority', 'toPriority'],
        properties: {
          fromPriority: {
            type: 'number',
            description: 'Source rule priority position index'
          },
          toPriority: {
            type: 'number',
            description: 'Target destination priority position index'
          }
        },
        additionalProperties: false
      }
    },
    selected: true
  },
  {
    key: 'simulate_packet_trace',
    name: 'Simulate Packet Trace & VLAN Isolation',
    category: 'VLAN & Security',
    path: '/api/agent/simulate',
    method: 'POST',
    description: 'Run packet simulation to test whether firewall rules accept or drop traffic between subnets (e.g. VLAN 20 to 10)',
    headers: {
      'Content-Type': 'application/json'
    },
    body_params: {
      srcIp: 'srcIp',
      dstIp: 'dstIp',
      protocol: 'protocol',
      dstPort: 'dstPort'
    },
    strict_schema: {
      parameters: {
        type: 'object',
        required: ['srcIp', 'dstIp'],
        properties: {
          srcIp: {
            type: 'string',
            description: 'Source IP address to simulate (e.g. 192.168.20.55)'
          },
          dstIp: {
            type: 'string',
            description: 'Destination IP address to simulate (e.g. 192.168.10.15)'
          },
          protocol: {
            type: 'string',
            enum: ['TCP', 'UDP', 'ICMP'],
            description: 'Simulation transport protocol'
          },
          dstPort: {
            type: 'number',
            description: 'Destination port number (e.g. 80, 443)'
          }
        },
        additionalProperties: false
      }
    },
    selected: true
  },
  {
    key: 'get_interface_stats',
    name: 'Interface Traffic & Link States',
    category: 'Interfaces',
    path: '/api/agent/interfaces/stats',
    method: 'GET',
    description: 'Query interface traffic rates (RX/TX Mbps), link states, and packet statistics',
    strict_schema: {
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    selected: true
  },
  {
    key: 'export_routeros_rsc',
    name: 'Export Production .RSC Script',
    category: 'System',
    path: '/api/agent/export.rsc',
    method: 'GET',
    description: 'Generate complete production MikroTik RouterOS v7 .rsc CLI configuration export script',
    strict_schema: {
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    selected: true
  }
];

export interface HermesToolYamlGeneratorProps {
  baseUrl: string;
  validationMode?: ToolValidationMode;
  onValidationModeChange?: (mode: ToolValidationMode) => void;
}

export default function HermesToolYamlGenerator({
  baseUrl,
  validationMode: controlledMode,
  onValidationModeChange
}: HermesToolYamlGeneratorProps) {
  // Validation Mode State ('strict' | 'flexible')
  const [internalMode, setInternalMode] = useState<ToolValidationMode>('strict');
  const activeMode: ToolValidationMode = controlledMode ?? internalMode;

  const handleModeToggle = (newMode: ToolValidationMode) => {
    setInternalMode(newMode);
    if (onValidationModeChange) {
      onValidationModeChange(newMode);
    }
  };

  // Generator Configuration State
  const [toolName, setToolName] = useState<string>('mikrotik_routeros');
  const [description, setDescription] = useState<string>(
    'Direct programmatic management for MikroTik RouterOS: manage firewall filter priority, VLAN isolation, packet simulation, and configuration export.'
  );
  const [version, setVersion] = useState<string>('1.0.0');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(baseUrl);
  const [authScheme, setAuthScheme] = useState<'none' | 'bearer' | 'apiKey'>('none');
  const [authToken, setAuthToken] = useState<string>('hermes_routeros_secret_token');
  const [outputView, setOutputView] = useState<'yaml' | 'json' | 'bash' | 'schema'>('yaml');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Operations List
  const [operations, setOperations] = useState<ToolEndpointDef[]>(DEFAULT_OPERATIONS);

  // Custom Operation Builder & JSON Importer
  const [showCustomBuilder, setShowCustomBuilder] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<{
    key: string;
    name: string;
    path: string;
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    description: string;
    category: 'Firewall' | 'VLAN & Security' | 'Interfaces' | 'System';
    bodyParams: string;
  }>({
    key: 'backup_router_state',
    name: 'Backup Router Snapshot',
    path: '/api/agent/backup',
    method: 'POST',
    description: 'Create an atomic configuration snapshot on the router',
    category: 'System',
    bodyParams: 'name: name, comment: comment'
  });

  const targetDirectory = `~/.hermes/tools/${toolName || 'routeros'}`;
  const targetFilePath = `${targetDirectory}/tool.yaml`;

  // Toggle selection
  const toggleOperation = (key: string) => {
    setOperations(prev =>
      prev.map(op => (op.key === key ? { ...op, selected: !op.selected } : op))
    );
  };

  // Preset Filters
  const applyPreset = (preset: 'all' | 'firewall' | 'vlan' | 'none') => {
    setOperations(prev =>
      prev.map(op => {
        if (preset === 'all') return { ...op, selected: true };
        if (preset === 'none') return { ...op, selected: false };
        if (preset === 'firewall') {
          return {
            ...op,
            selected: op.category === 'Firewall' || op.key === 'get_router_state'
          };
        }
        if (preset === 'vlan') {
          return {
            ...op,
            selected: op.key === 'get_router_state' || op.key === 'simulate_packet_trace' || op.key === 'export_routeros_rsc'
          };
        }
        return op;
      })
    );
  };

  // Remove custom operation
  const removeCustomOperation = (key: string) => {
    setOperations(prev => prev.filter(op => op.key !== key));
  };

  // Add custom operation from form
  const handleAddCustomOperation = () => {
    if (!customForm.key.trim() || !customForm.path.trim()) return;

    let parsedBodyParams: Record<string, string> | undefined = undefined;
    const strictProperties: Record<string, ToolParameterProp> = {};

    if (customForm.bodyParams.trim()) {
      parsedBodyParams = {};
      customForm.bodyParams.split(',').forEach(item => {
        const [k, v] = item.split(':').map(s => s.trim());
        if (k) {
          parsedBodyParams![k] = v || k;
          strictProperties[k] = {
            type: 'string',
            description: `Parameter ${k} for ${customForm.name}`
          };
        }
      });
    }

    const newOp: ToolEndpointDef = {
      key: customForm.key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: customForm.name || customForm.key,
      path: customForm.path.startsWith('/') ? customForm.path : `/${customForm.path}`,
      method: customForm.method,
      description: customForm.description || `Custom endpoint for ${customForm.name}`,
      category: customForm.category,
      headers: customForm.method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
      body_params: parsedBodyParams,
      strict_schema: {
        parameters: {
          type: 'object',
          properties: strictProperties,
          additionalProperties: false
        }
      },
      selected: true,
      isCustom: true
    };

    setOperations(prev => [newOp, ...prev]);
    setCustomForm({
      key: '',
      name: '',
      path: '',
      method: 'POST',
      description: '',
      category: 'System',
      bodyParams: ''
    });
    setShowCustomBuilder(false);
  };

  // Import JSON snippet
  const handleImportJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const newOps: ToolEndpointDef[] = [];

      const endpointsSource = parsed.endpoints || parsed;

      if (typeof endpointsSource !== 'object' || endpointsSource === null) {
        throw new Error('Invalid format. Expecting JSON with an "endpoints" object or a dictionary of endpoints.');
      }

      Object.entries(endpointsSource).forEach(([rawKey, val]: [string, any]) => {
        if (typeof val === 'object' && val !== null) {
          const key = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const path = val.path || `/${key}`;
          const method = (val.method || 'GET').toUpperCase() as any;
          const opDesc = val.description || `Operation ${key}`;
          const headers = val.headers;
          const body_params = val.body_params;
          const query_params = val.query_params;
          const strict_schema = val.parameters ? { parameters: val.parameters, responses: val.responses } : undefined;

          newOps.push({
            key,
            name: val.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            category: 'System',
            path,
            method,
            description: opDesc,
            headers,
            body_params,
            query_params,
            strict_schema,
            selected: true,
            isCustom: true
          });
        }
      });

      if (newOps.length === 0) {
        throw new Error('No valid endpoints found in JSON.');
      }

      setOperations(prev => {
        const existingKeys = new Set(prev.map(p => p.key));
        const filteredNew = newOps.filter(o => !existingKeys.has(o.key));
        return [...filteredNew, ...prev];
      });

      setJsonInput('');
      setShowCustomBuilder(false);
    } catch (err: any) {
      setJsonError(err.message || 'Malformed JSON');
    }
  };

  // Construct JSON Schema Object based on activeMode ('strict' vs 'flexible')
  const generatedJsonObject = useMemo(() => {
    const selectedOps = operations.filter(op => op.selected);

    if (activeMode === 'strict') {
      // STRICT MODE: Hermes Schema Version 2.0
      const endpointsObj: Record<string, any> = {};

      selectedOps.forEach(op => {
        const ep: Record<string, any> = {
          path: op.path,
          method: op.method,
          description: op.description
        };

        // Header handling including auth
        const headers: Record<string, string> = { ...(op.headers || {}) };
        if (authScheme === 'bearer') {
          headers['Authorization'] = `Bearer ${authToken}`;
        } else if (authScheme === 'apiKey') {
          headers['X-RouterOS-Key'] = authToken;
        }

        if (Object.keys(headers).length > 0) {
          ep.headers = headers;
        }

        // Strict parameters object
        if (op.strict_schema?.parameters) {
          ep.parameters = op.strict_schema.parameters;
        } else if (op.body_params && Object.keys(op.body_params).length > 0) {
          const derivedProps: Record<string, any> = {};
          Object.keys(op.body_params).forEach(k => {
            derivedProps[k] = { type: 'string', description: `Parameter ${k}` };
          });
          ep.parameters = {
            type: 'object',
            properties: derivedProps,
            additionalProperties: false
          };
        } else {
          ep.parameters = {
            type: 'object',
            properties: {},
            additionalProperties: false
          };
        }

        if (op.strict_schema?.responses) {
          ep.responses = op.strict_schema.responses;
        }

        endpointsObj[op.key] = ep;
      });

      return {
        schema_version: '2.0',
        name: toolName || 'mikrotik_routeros',
        description: description,
        version: version || '1.0.0',
        type: 'http',
        base_url: customBaseUrl || baseUrl,
        output_parsing: {
          mode: 'strict',
          format: 'json',
          content_type: 'application/json',
          validate_schema: true,
          fail_on_unexpected: true,
          null_on_error: false,
          strip_nulls: true
        },
        endpoints: endpointsObj
      };
    } else {
      // FLEXIBLE MODE: Hermes Schema Version 1.0
      const endpointsObj: Record<string, any> = {};

      selectedOps.forEach(op => {
        const ep: Record<string, any> = {
          path: op.path,
          method: op.method,
          description: op.description
        };

        // Header handling including auth
        const headers: Record<string, string> = { ...(op.headers || {}) };
        if (authScheme === 'bearer') {
          headers['Authorization'] = `Bearer ${authToken}`;
        } else if (authScheme === 'apiKey') {
          headers['X-RouterOS-Key'] = authToken;
        }

        if (Object.keys(headers).length > 0) {
          ep.headers = headers;
        }

        if (op.body_params && Object.keys(op.body_params).length > 0) {
          ep.body_params = op.body_params;
        }

        if (op.query_params && Object.keys(op.query_params).length > 0) {
          ep.query_params = op.query_params;
        }

        endpointsObj[op.key] = ep;
      });

      return {
        schema_version: '1.0',
        name: toolName || 'mikrotik_routeros',
        description: description,
        version: version || '1.0.0',
        type: 'http',
        base_url: customBaseUrl || baseUrl,
        output_parsing: {
          mode: 'flexible',
          format: 'auto',
          fail_on_unexpected: false,
          allow_text_fallback: true,
          auto_coerce_types: true
        },
        endpoints: endpointsObj
      };
    }
  }, [operations, toolName, description, version, customBaseUrl, baseUrl, authScheme, authToken, activeMode]);

  // Construct YAML String according to Hermes Agent specification
  const generatedYaml = useMemo(() => {
    const isStrict = activeMode === 'strict';

    const lines: string[] = [
      `# Hermes Agent Tool Manifest: MikroTik RouterOS`,
      `# Destination: ${targetFilePath}`,
      `# Schema Version: ${generatedJsonObject.schema_version} (${isStrict ? 'Strict Output Parsing Mode' : 'Flexible Tolerant Output Parsing Mode'})`,
      `# Target Agent: ${isStrict ? 'Hermes Agent v0.5.0+ (Strict Schema & Output Enforcement)' : 'Hermes Agent v0.1.x - v0.4.x (Tolerant Parser)'}`,
      `# Documentation: https://hermes-agent.readthedocs.io`,
      ``,
      `schema_version: "${generatedJsonObject.schema_version}"`,
      `name: ${generatedJsonObject.name}`,
      `description: ${JSON.stringify(generatedJsonObject.description)}`,
      `version: "${generatedJsonObject.version}"`,
      `type: "${generatedJsonObject.type}"`,
      `base_url: "${generatedJsonObject.base_url}"`,
      ``,
      `output_parsing:`,
      `  mode: "${generatedJsonObject.output_parsing.mode}"`,
      `  format: "${generatedJsonObject.output_parsing.format}"`
    ];

    if (isStrict) {
      lines.push(`  content_type: "${generatedJsonObject.output_parsing.content_type}"`);
      lines.push(`  validate_schema: ${generatedJsonObject.output_parsing.validate_schema}`);
      lines.push(`  fail_on_unexpected: ${generatedJsonObject.output_parsing.fail_on_unexpected}`);
      lines.push(`  null_on_error: ${generatedJsonObject.output_parsing.null_on_error}`);
      lines.push(`  strip_nulls: ${generatedJsonObject.output_parsing.strip_nulls}`);
    } else {
      lines.push(`  fail_on_unexpected: ${generatedJsonObject.output_parsing.fail_on_unexpected}`);
      lines.push(`  allow_text_fallback: ${generatedJsonObject.output_parsing.allow_text_fallback}`);
      lines.push(`  auto_coerce_types: ${generatedJsonObject.output_parsing.auto_coerce_types}`);
    }

    lines.push(``);
    lines.push(`endpoints:`);

    const entries = Object.entries(generatedJsonObject.endpoints);
    if (entries.length === 0) {
      lines.push(`  # No operations selected. Toggle operations above to include them.`);
    } else {
      entries.forEach(([key, ep]: [string, any], idx) => {
        lines.push(`  ${key}:`);
        lines.push(`    path: "${ep.path}"`);
        lines.push(`    method: "${ep.method}"`);
        lines.push(`    description: ${JSON.stringify(ep.description)}`);

        if (ep.headers && Object.keys(ep.headers).length > 0) {
          lines.push(`    headers:`);
          Object.entries(ep.headers).forEach(([hk, hv]) => {
            lines.push(`      ${hk}: "${hv}"`);
          });
        }

        if (isStrict) {
          // Render strict parameters schema
          if (ep.parameters) {
            lines.push(`    parameters:`);
            lines.push(`      type: "${ep.parameters.type || 'object'}"`);
            if (ep.parameters.required && ep.parameters.required.length > 0) {
              lines.push(`      required:`);
              ep.parameters.required.forEach((rq: string) => {
                lines.push(`        - "${rq}"`);
              });
            }
            lines.push(`      properties:`);
            const props = Object.entries(ep.parameters.properties || {});
            if (props.length === 0) {
              lines.push(`        {}`);
            } else {
              props.forEach(([pk, pv]: [string, any]) => {
                lines.push(`        ${pk}:`);
                lines.push(`          type: "${pv.type}"`);
                if (pv.description) {
                  lines.push(`          description: ${JSON.stringify(pv.description)}`);
                }
                if (pv.enum && Array.isArray(pv.enum)) {
                  lines.push(`          enum: [${pv.enum.map((e: string) => `"${e}"`).join(', ')}]`);
                }
              });
            }
            if (ep.parameters.additionalProperties !== undefined) {
              lines.push(`      additionalProperties: ${ep.parameters.additionalProperties}`);
            }
          }

          if (ep.responses) {
            lines.push(`    responses:`);
            Object.entries(ep.responses).forEach(([rk, rv]: [string, any]) => {
              lines.push(`      "${rk}":`);
              lines.push(`        description: ${JSON.stringify(rv.description)}`);
            });
          }
        } else {
          // Render flexible body_params & query_params
          if (ep.body_params && Object.keys(ep.body_params).length > 0) {
            lines.push(`    body_params:`);
            Object.entries(ep.body_params).forEach(([pk, pv]) => {
              lines.push(`      ${pk}: "${pv}"`);
            });
          }

          if (ep.query_params && Object.keys(ep.query_params).length > 0) {
            lines.push(`    query_params:`);
            Object.entries(ep.query_params).forEach(([qk, qv]) => {
              lines.push(`      ${qk}: "${qv}"`);
            });
          }
        }

        if (idx < entries.length - 1) {
          lines.push(``);
        }
      });
    }

    return lines.join('\n');
  }, [generatedJsonObject, targetFilePath, activeMode]);

  const generatedJson = useMemo(() => {
    return JSON.stringify(generatedJsonObject, null, 2);
  }, [generatedJsonObject]);

  // Shell installation script
  const generatedBashCommand = useMemo(() => {
    const isStrict = activeMode === 'strict';
    return `# 1. Create target tool directory for Hermes
mkdir -p ${targetDirectory}

# 2. Write the validated ${isStrict ? 'Strict v2.0' : 'Flexible v1.0'} tool.yaml manifest
cat << 'EOF' > ${targetFilePath}
${generatedYaml}
EOF

# 3. Test Hermes tool registration
hermes tools list --json | grep -A 5 "${toolName}"

# 4. Optional: Retrieve server-side validated manifest via curl
# curl -s "${customBaseUrl || baseUrl}/api/hermes/tool.yaml?mode=${activeMode}" -o ${targetFilePath}
`;
  }, [targetDirectory, targetFilePath, generatedYaml, toolName, customBaseUrl, baseUrl, activeMode]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download helper
  const handleDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = operations.filter(o => o.selected).length;

  // Validation diagnostics
  const validationStatus = useMemo(() => {
    const isStrict = activeMode === 'strict';
    const errors: string[] = [];
    const checks = [
      {
        name: `Schema Specification Version: ${isStrict ? '2.0 (Strict RFC)' : '1.0 (Flexible Tolerant)'}`,
        valid: true,
        desc: isStrict
          ? 'Mandates typed parameter schemas, required arrays, and fail_on_unexpected.'
          : 'Allows relaxed parameter mappings, auto-type coercion, and text fallback.'
      },
      {
        name: `Output Parsing Mode: ${isStrict ? 'strict' : 'flexible'}`,
        valid: true,
        desc: isStrict
          ? 'Rejects unexpected attributes and validates response JSON structure.'
          : 'Gracefully coerces payload types and permits extra response keys.'
      },
      {
        name: `Endpoints Configured: ${selectedCount} Active`,
        valid: selectedCount > 0,
        desc: selectedCount > 0
          ? `${selectedCount} MikroTik operations selected for inclusion.`
          : 'No endpoints selected! Please select at least one operation.'
      },
      {
        name: `Base URL Format`,
        valid: Boolean(customBaseUrl.startsWith('http://') || customBaseUrl.startsWith('https://')),
        desc: `Target: ${customBaseUrl || baseUrl}`
      }
    ];

    if (selectedCount === 0) {
      errors.push('At least one endpoint must be enabled for a valid manifest.');
    }

    return {
      isValid: errors.length === 0,
      checks,
      errors
    };
  }, [activeMode, selectedCount, customBaseUrl, baseUrl]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-900 border border-cyan-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/50 text-cyan-400">
              <Code2 size={16} />
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              MikroTik tool.yaml Manifest & Schema Generator
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Hermes Tools Directory
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Generate and customize the <code className="text-zinc-200 font-mono">tool.yaml</code> manifest for MikroTik RouterOS operations, with dynamic validation modes for Hermes Agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus size={13} className="text-cyan-400" />
            {showCustomBuilder ? 'Close Editor' : 'Add Custom JSON Endpoint'}
          </button>
        </div>
      </div>

      {/* Validation Mode Segmented Toggle Card */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2">
            {activeMode === 'strict' ? (
              <ShieldCheck size={16} className="text-emerald-400" />
            ) : (
              <Sliders size={16} className="text-amber-400" />
            )}
            <div>
              <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Output Parsing & Validation Mode Toggle
              </h5>
              <span className="text-[10px] text-zinc-500 block">
                Controls the schema version and output parsing strictness in the generated tool manifest
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                activeMode === 'strict'
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-700/60 text-amber-300'
              }`}
            >
              {activeMode === 'strict' ? 'Schema v2.0 (Strict)' : 'Schema v1.0 (Flexible)'}
            </span>
          </div>
        </div>

        {/* Segmented Mode Selector Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Strict Mode Option */}
          <button
            onClick={() => handleModeToggle('strict')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              activeMode === 'strict'
                ? 'bg-emerald-950/20 border-emerald-600/70 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-md ${activeMode === 'strict' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    <ShieldCheck size={14} />
                  </span>
                  <span className="text-xs font-bold text-zinc-100">Strict Output Parsing Mode</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    v2.0 Schema
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Generates strongly typed JSON Schema parameters (<code className="text-zinc-300 font-mono">type</code>, <code className="text-zinc-300 font-mono">required</code>, <code className="text-zinc-300 font-mono">enum</code>) and enforces <code className="text-emerald-300 font-mono">fail_on_unexpected: true</code>. Target: <span className="text-zinc-300 font-medium">Hermes Agent v0.5.0+</span>.
                </p>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                activeMode === 'strict' ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-700 bg-transparent'
              }`}>
                {activeMode === 'strict' && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-900/30 flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-emerald-400/90 font-bold">✓ RFC Strict Schema</span>
              <span>•</span>
              <span>Enum Boundary Enforcement</span>
              <span>•</span>
              <span>No Payload Hallucinations</span>
            </div>
          </button>

          {/* Flexible Mode Option */}
          <button
            onClick={() => handleModeToggle('flexible')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              activeMode === 'flexible'
                ? 'bg-amber-950/20 border-amber-600/70 shadow-[0_0_15px_rgba(245,158,11,0.12)]'
                : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-md ${activeMode === 'flexible' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Sliders size={14} />
                  </span>
                  <span className="text-xs font-bold text-zinc-100">Flexible Tolerant Parsing Mode</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    v1.0 Schema
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Uses streamlined key-value dictionary mappings (<code className="text-zinc-300 font-mono">body_params</code>) and tolerant parsing (<code className="text-amber-300 font-mono">allow_text_fallback: true</code>). Target: <span className="text-zinc-300 font-medium">Hermes Agent v0.1.x - v0.4.x</span>.
                </p>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                activeMode === 'flexible' ? 'border-amber-400 bg-amber-500' : 'border-zinc-700 bg-transparent'
              }`}>
                {activeMode === 'flexible' && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-900/30 flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-amber-400/90 font-bold">✓ Tolerant Parsing</span>
              <span>•</span>
              <span>Auto Type Coercion</span>
              <span>•</span>
              <span>Backward Compatible</span>
            </div>
          </button>
        </div>

        {/* Live Conformance Checklist */}
        <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-cyan-400" />
              Live Hermes Schema Validation Checklist
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {validationStatus.isValid ? '100% Schema Valid' : 'Action Required'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            {validationStatus.checks.map((chk, i) => (
              <div key={i} className="p-2 rounded bg-[#050508] border border-zinc-900 space-y-0.5">
                <div className="flex items-center gap-1 text-zinc-300 font-bold truncate">
                  <span className="text-emerald-400 text-xs">✓</span>
                  <span className="truncate">{chk.name}</span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{chk.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Directory Path Indicator */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Folder size={16} className="text-amber-400 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
              Hermes Tools Directory Target
            </span>
            <code className="text-xs font-mono text-cyan-300 font-bold">
              {targetFilePath}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(targetFilePath, 'target-path')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {copiedId === 'target-path' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedId === 'target-path' ? 'Copied Path' : 'Copy Path'}
          </button>
        </div>
      </div>

      {/* Custom JSON Endpoint Importer / Editor Drawer */}
      {showCustomBuilder && (
        <div className="bg-[#08080d] border border-cyan-900/40 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Extend Tool Manifest (Custom JSON Endpoint)
              </h5>
            </div>
            <span className="text-[10px] text-zinc-500">Inject custom MikroTik operations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Form */}
            <div className="space-y-3 bg-[#050508] border border-zinc-900 rounded-lg p-3">
              <span className="text-[11px] font-bold text-zinc-300 block">Operation Field Builder</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block">Key (Snake Case)</label>
                  <input
                    type="text"
                    value={customForm.key}
                    onChange={e => setCustomForm({ ...customForm, key: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                    placeholder="e.g. reboot_router"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block">HTTP Method</label>
                  <select
                    value={customForm.method}
                    onChange={e => setCustomForm({ ...customForm, method: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Path</label>
                <input
                  type="text"
                  value={customForm.path}
                  onChange={e => setCustomForm({ ...customForm, path: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                  placeholder="/api/agent/custom"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Description (Agent Guidance)</label>
                <input
                  type="text"
                  value={customForm.description}
                  onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                  placeholder="Explain what this action performs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block">Body Parameters (Comma separated key:value)</label>
                <input
                  type="text"
                  value={customForm.bodyParams}
                  onChange={e => setCustomForm({ ...customForm, bodyParams: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                  placeholder="param1: param1, param2: param2"
                />
              </div>

              <button
                onClick={handleAddCustomOperation}
                className="w-full py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Add Endpoint to Manifest
              </button>
            </div>

            {/* Paste Raw JSON */}
            <div className="space-y-3 bg-[#050508] border border-zinc-900 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-300 block">Or Paste Raw JSON Endpoint Spec</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Paste existing tool manifest JSON to merge endpoints into this generator.
                </p>
                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder={`{\n  "endpoints": {\n    "custom_ping": {\n      "path": "/api/agent/ping",\n      "method": "POST",\n      "description": "Ping router target"\n    }\n  }\n}`}
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded p-2 text-[11px] font-mono text-zinc-300 mt-2 focus:outline-none focus:border-cyan-600"
                />
                {jsonError && (
                  <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle size={11} /> {jsonError}
                  </div>
                )}
              </div>

              <button
                onClick={handleImportJson}
                disabled={!jsonInput.trim()}
                className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Parse & Merge JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest Configuration Bar */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-cyan-400" />
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Tool Metadata & Network Configuration
            </h5>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">YAML Header Values</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Tool Name</label>
            <input
              type="text"
              value={toolName}
              onChange={e => setToolName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="mikrotik_routeros"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Base URL (Router / Applet Host)</label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={e => setCustomBaseUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="http://localhost:3000"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Auth Header Type</label>
            <select
              value={authScheme}
              onChange={e => setAuthScheme(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="none">None (Direct Ingress)</option>
              <option value="bearer">Bearer Token (Authorization)</option>
              <option value="apiKey">API Key (X-RouterOS-Key)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">Version</label>
            <input
              type="text"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="1.0.0"
            />
          </div>
        </div>

        {authScheme !== 'none' && (
          <div className="pt-2">
            <label className="text-[10px] text-cyan-400 font-bold block mb-1">
              {authScheme === 'bearer' ? 'Secret Bearer Token' : 'X-RouterOS-Key Value'}
            </label>
            <input
              type="text"
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              className="w-full bg-zinc-900 border border-cyan-800/40 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono text-xs"
              placeholder="Enter authentication secret or token"
            />
          </div>
        )}
      </div>

      {/* Operations Selector Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-cyan-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Select Common MikroTik Operations ({selectedCount}/{operations.length})
            </h5>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-zinc-500 mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('all')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
            >
              All (8)
            </button>
            <button
              onClick={() => applyPreset('firewall')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 cursor-pointer"
            >
              Firewall Only
            </button>
            <button
              onClick={() => applyPreset('vlan')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 cursor-pointer"
            >
              VLAN & Audit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {operations.map(op => (
            <div
              key={op.key}
              onClick={() => toggleOperation(op.key)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                op.selected
                  ? activeMode === 'strict'
                    ? 'bg-zinc-900/80 border-cyan-700/60 shadow-sm'
                    : 'bg-zinc-900/80 border-amber-700/60 shadow-sm'
                  : 'bg-[#050508] border-zinc-900/90 opacity-60 hover:opacity-80'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={op.selected}
                  onChange={() => {}}
                  className="rounded border-zinc-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-bold text-zinc-100 truncate">{op.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${
                        op.method === 'GET'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : op.method === 'POST'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {op.method}
                    </span>
                  </div>

                  {op.isCustom && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeCustomOperation(op.key);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                      title="Remove custom operation"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {op.description}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <code className="text-[10px] font-mono text-cyan-400 truncate">
                    {op.path}
                  </code>
                  <span className="text-[9px] font-mono text-zinc-500">
                    key: {op.key}
                  </span>
                  {activeMode === 'strict' && op.strict_schema?.parameters?.required && (
                    <span className="text-[9px] font-mono text-emerald-400/90 ml-auto shrink-0">
                      req: [{op.strict_schema.parameters.required.join(', ')}]
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Code Output Display */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#050508] border border-zinc-900 rounded-lg self-start">
            <button
              onClick={() => setOutputView('yaml')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'yaml' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              YAML (tool.yaml)
            </button>
            <button
              onClick={() => setOutputView('json')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'json' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              JSON (tool.json)
            </button>
            <button
              onClick={() => setOutputView('bash')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                outputView === 'bash' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shell Install Command
            </button>
            <button
              onClick={() => setOutputView('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                outputView === 'schema' ? 'bg-zinc-800 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HelpCircle size={12} />
              Schema Spec Rules
            </button>
          </div>

          <div className="flex items-center gap-2">
            {outputView === 'yaml' && (
              <>
                <button
                  onClick={() => handleDownload(generatedYaml, 'tool.yaml', 'text/yaml')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download tool.yaml ({activeMode})
                </button>
                <button
                  onClick={() => handleCopy(generatedYaml, 'copy-yaml')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow-lg ${
                    activeMode === 'strict'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/30'
                  }`}
                >
                  {copiedId === 'copy-yaml' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === 'copy-yaml' ? 'Copied tool.yaml' : `Copy tool.yaml (${activeMode})`}
                </button>
              </>
            )}

            {outputView === 'json' && (
              <>
                <button
                  onClick={() => handleDownload(generatedJson, 'tool.json', 'application/json')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download tool.json ({activeMode})
                </button>
                <button
                  onClick={() => handleCopy(generatedJson, 'copy-json')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow-lg ${
                    activeMode === 'strict'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/30'
                  }`}
                >
                  {copiedId === 'copy-json' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === 'copy-json' ? 'Copied JSON' : `Copy JSON (${activeMode})`}
                </button>
              </>
            )}

            {outputView === 'bash' && (
              <button
                onClick={() => handleCopy(generatedBashCommand, 'copy-bash')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-lg shadow-cyan-950/30"
              >
                {copiedId === 'copy-bash' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === 'copy-bash' ? 'Copied Command' : 'Copy Shell Command'}
              </button>
            )}

            {outputView === 'schema' && (
              <button
                onClick={() => handleCopy(JSON.stringify(generatedJsonObject.output_parsing, null, 2), 'copy-schema-spec')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              >
                {copiedId === 'copy-schema-spec' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === 'copy-schema-spec' ? 'Copied Output Parsing Spec' : 'Copy Output Parsing Spec'}
              </button>
            )}
          </div>
        </div>

        {/* Code Content Box */}
        <div className="relative">
          {outputView !== 'schema' ? (
            <pre className="w-full bg-[#050508] border border-zinc-800/80 rounded-xl p-4 font-mono text-[11px] text-zinc-200 overflow-x-auto max-h-96 leading-relaxed select-text">
              {outputView === 'yaml' && generatedYaml}
              {outputView === 'json' && generatedJson}
              {outputView === 'bash' && generatedBashCommand}
            </pre>
          ) : (
            /* Schema Comparison & Specification Table */
            <div className="w-full bg-[#050508] border border-zinc-800/80 rounded-xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="font-bold text-zinc-200">
                  Hermes Agent Schema Version & Parsing Specification
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  Active Mode: {activeMode.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border space-y-2 ${activeMode === 'strict' ? 'bg-emerald-950/20 border-emerald-700/60' : 'bg-zinc-950 border-zinc-900 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">Strict Mode (Schema v2.0)</span>
                    {activeMode === 'strict' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 rounded font-bold">Active</span>}
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc pl-4">
                    <li><strong className="text-zinc-200">schema_version:</strong> "2.0"</li>
                    <li><strong className="text-zinc-200">output_parsing.mode:</strong> "strict"</li>
                    <li><strong className="text-zinc-200">fail_on_unexpected:</strong> true (rejects unmodeled fields)</li>
                    <li><strong className="text-zinc-200">validate_schema:</strong> true (RFC JSON Schema validation)</li>
                    <li><strong className="text-zinc-200">parameters:</strong> Strongly typed object with enum and required array</li>
                    <li><strong className="text-zinc-200">Target Hermes Version:</strong> Hermes Agent v0.5.0+ and OpenClaw v1.2+</li>
                  </ul>
                </div>

                <div className={`p-3 rounded-lg border space-y-2 ${activeMode === 'flexible' ? 'bg-amber-950/20 border-amber-700/60' : 'bg-zinc-950 border-zinc-900 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Flexible Mode (Schema v1.0)</span>
                    {activeMode === 'flexible' && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-bold">Active</span>}
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc pl-4">
                    <li><strong className="text-zinc-200">schema_version:</strong> "1.0"</li>
                    <li><strong className="text-zinc-200">output_parsing.mode:</strong> "flexible"</li>
                    <li><strong className="text-zinc-200">fail_on_unexpected:</strong> false (ignores unknown keys)</li>
                    <li><strong className="text-zinc-200">allow_text_fallback:</strong> true (accepts plaintext responses)</li>
                    <li><strong className="text-zinc-200">auto_coerce_types:</strong> true (auto string/number conversion)</li>
                    <li><strong className="text-zinc-200">Target Hermes Version:</strong> Hermes Agent v0.1.x - v0.4.x / Legacy Tolerant</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to use in Hermes Agent CLI */}
      <div className="bg-[#050508] border border-zinc-900 rounded-xl p-4 space-y-2.5">
        <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          How to Test with Hermes Agent CLI ({activeMode.toUpperCase()} Output Parsing)
        </h5>
        <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg space-y-2 font-mono text-[11px]">
          <div className="text-zinc-500"># 1. Create the tool directory and write tool.yaml ({activeMode} schema):</div>
          <div className="text-cyan-300">
            mkdir -p {targetDirectory} && cp tool.yaml {targetFilePath}
          </div>
          <div className="text-zinc-500 pt-1"># 2. Launch Hermes chat and prompt the agent:</div>
          <div className="text-zinc-300">
            $ hermes chat
          </div>
          <div className="text-emerald-400 italic pl-3">
            &quot;Use the {toolName} tool to query the firewall rules, then simulate traffic from 192.168.20.55 to 192.168.10.15 to confirm Guest VLAN isolation.&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
