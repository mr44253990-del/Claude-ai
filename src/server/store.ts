import fs from 'fs';
import path from 'path';
import { ApiKey, GatewayStats, ModelConfig, Provider, RequestLog } from '../types/proxy.js';

const DATA_FILE = path.join(process.cwd(), '.data_store.json');

// Default initial state
const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'zai',
    name: 'ZAI (Zhipu AI / GLM)',
    baseUrl: 'https://api.z.ai/api/paas/v4/chat/completions',
    apiKey: process.env.ZAI_API_KEY || '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H',
    protocol: 'zai',
    enabled: true,
    isCustom: false,
    description: 'High-performance flagship GLM models via Z.AI PAAS API.',
  },
  {
    id: 'opencode',
    name: 'OpenCode Free Models',
    baseUrl: 'https://api.z.ai/api/paas/v4/chat/completions', // Default routes through ZAI or open endpoint
    apiKey: process.env.ZAI_API_KEY || '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H',
    protocol: 'openai',
    enabled: true,
    isCustom: false,
    description: 'OpenSource state-of-the-art models (DeepSeek R1, Qwen 2.5, Llama 3.3).',
  },
  {
    id: 'openai',
    name: 'OpenAI Direct',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    protocol: 'openai',
    enabled: false,
    isCustom: false,
    description: 'Official OpenAI GPT-4o, GPT-4o-mini and o3-mini models.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Direct',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    apiKey: '',
    protocol: 'anthropic',
    enabled: false,
    isCustom: false,
    description: 'Official Anthropic Claude 3.5 Sonnet and Haiku models.',
  },
];

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'glm-4.5-flash',
    name: 'GLM 4.5 Flash (Default ZAI)',
    providerId: 'zai',
    targetModel: 'glm-4.5-flash',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0002,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'Ultra-fast, smart general purpose AI assistant model by ZAI.',
  },
  {
    id: 'glm-4-plus',
    name: 'GLM 4 Plus',
    providerId: 'zai',
    targetModel: 'glm-4-plus',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.001,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'Advanced reasoning and complex multi-turn logic flagship model.',
  },
  {
    id: 'glm-4-air',
    name: 'GLM 4 Air',
    providerId: 'zai',
    targetModel: 'glm-4-air',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0002,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'Lightweight high-efficiency model ideal for rapid chat & tasks.',
  },
  {
    id: 'glm-4-flash',
    name: 'GLM 4 Flash',
    providerId: 'zai',
    targetModel: 'glm-4-flash',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.00005,
    costPer1kOutputTokens: 0.0001,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'Free speed tier GLM model for high-throughput API calls.',
  },
  {
    id: 'opencode-deepseek-r1',
    name: 'DeepSeek R1 (OpenCode)',
    providerId: 'opencode',
    targetModel: 'glm-4.5-flash', // Proxy fallback target model
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0,
    costPer1kOutputTokens: 0.0,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'DeepSeek R1 open-weights reasoning model configured via OpenCode.',
  },
  {
    id: 'opencode-qwen-2.5-72b',
    name: 'Qwen 2.5 72B Instruct (OpenCode)',
    providerId: 'opencode',
    targetModel: 'glm-4.5-flash',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0,
    costPer1kOutputTokens: 0.0,
    enabled: true,
    supportsStreaming: true,
    supportsVision: false,
    description: 'Alibaba Qwen 2.5 72B open model via OpenCode router.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (OpenAI)',
    providerId: 'openai',
    targetModel: 'gpt-4o',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    enabled: true,
    supportsStreaming: true,
    supportsVision: true,
    description: 'OpenAI Omnimodal flagship model.',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (Anthropic)',
    providerId: 'anthropic',
    targetModel: 'claude-3-5-sonnet-20241022',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    enabled: true,
    supportsStreaming: true,
    supportsVision: true,
    description: 'Anthropic leading intelligence model for code, analysis, and writing.',
  },
];

const DEFAULT_API_KEYS: ApiKey[] = [
  {
    id: 'key_master_1',
    key: 'sk-zai-35eaac71317f4bac828e323ce46e5fe7',
    name: 'Master Client Key (ZAI Default)',
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    usageCount: 12,
    totalTokens: 18450,
    enabled: true,
    rateLimitRpm: 120,
    tokenLimit: null,
  },
  {
    id: 'key_app_2',
    key: 'sk-zai-app-test-2026',
    name: 'Interactive Sandbox & External Client Key',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    usageCount: 0,
    totalTokens: 0,
    enabled: true,
    rateLimitRpm: 60,
    tokenLimit: null,
  },
];

class Store {
  providers: Provider[] = [];
  models: ModelConfig[] = [];
  apiKeys: ApiKey[] = [];
  requestLogs: RequestLog[] = [];
  startTime: number = Date.now();

  constructor() {
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.providers = data.providers || DEFAULT_PROVIDERS;
        this.models = data.models || DEFAULT_MODELS;
        this.apiKeys = data.apiKeys || DEFAULT_API_KEYS;
        this.requestLogs = data.requestLogs || [];
      } else {
        this.providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
        this.models = JSON.parse(JSON.stringify(DEFAULT_MODELS));
        this.apiKeys = JSON.parse(JSON.stringify(DEFAULT_API_KEYS));
        this.seedDemoLogs();
        this.save();
      }
    } catch (e) {
      console.error('Error loading store, restoring defaults:', e);
      this.providers = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
      this.models = JSON.parse(JSON.stringify(DEFAULT_MODELS));
      this.apiKeys = JSON.parse(JSON.stringify(DEFAULT_API_KEYS));
      this.seedDemoLogs();
    }
  }

  save() {
    try {
      const payload = {
        providers: this.providers,
        models: this.models,
        apiKeys: this.apiKeys,
        requestLogs: this.requestLogs.slice(0, 500), // keep latest 500 logs
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist store:', e);
    }
  }

  seedDemoLogs() {
    const now = Date.now();
    const mockLogs: RequestLog[] = [
      {
        id: 'log_seed_1',
        timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        clientKeyName: 'Master Client Key (ZAI Default)',
        clientKeySnippet: 'sk-zai-...35ea',
        providerId: 'zai',
        providerName: 'ZAI (Zhipu AI / GLM)',
        modelId: 'glm-4.5-flash',
        endpoint: '/v1/chat/completions',
        status: 200,
        latencyMs: 340,
        promptTokens: 42,
        completionTokens: 180,
        totalTokens: 222,
        estimatedCostUsd: 0.00004,
        isStream: true,
        requestMessages: [{ role: 'user', content: 'Hello, how are you?' }],
        responsePreview: "Hello! I am GLM-4.5 Flash powered by ZAI. I'm doing great! How can I assist you today?",
      },
      {
        id: 'log_seed_2',
        timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        clientKeyName: 'Master Client Key (ZAI Default)',
        clientKeySnippet: 'sk-zai-...35ea',
        providerId: 'zai',
        providerName: 'ZAI (Zhipu AI / GLM)',
        modelId: 'glm-4.5-flash',
        endpoint: '/v1/messages',
        status: 200,
        latencyMs: 512,
        promptTokens: 120,
        completionTokens: 450,
        totalTokens: 570,
        estimatedCostUsd: 0.0001,
        isStream: false,
        requestMessages: [{ role: 'user', content: 'Write a quick Python script to call ZAI endpoint' }],
        responsePreview: 'Here is a simple Python script using `requests` library to invoke GLM-4.5 Flash...',
      },
      {
        id: 'log_seed_3',
        timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
        clientKeyName: 'Interactive Sandbox & External Client Key',
        clientKeySnippet: 'sk-zai-...2026',
        providerId: 'opencode',
        providerName: 'OpenCode Free Models',
        modelId: 'opencode-deepseek-r1',
        endpoint: '/v1/chat/completions',
        status: 200,
        latencyMs: 620,
        promptTokens: 85,
        completionTokens: 310,
        totalTokens: 395,
        estimatedCostUsd: 0.0,
        isStream: true,
        requestMessages: [{ role: 'user', content: 'Explain quantum computing in simple terms' }],
        responsePreview: 'Quantum computing is a type of computation that harnesses quantum physics principles...',
      },
    ];
    this.requestLogs = mockLogs;
  }

  // Helper getters
  validateApiKey(keyString: string): ApiKey | null {
    if (!keyString) return null;
    const cleanKey = keyString.replace(/^Bearer\s+/i, '').trim();
    // Also accept process.env.ZAI_API_KEY directly if passed by client
    if (cleanKey === process.env.ZAI_API_KEY || cleanKey === '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H') {
      return this.apiKeys[0];
    }
    const found = this.apiKeys.find((k) => k.key === cleanKey && k.enabled);
    return found || null;
  }

  getStats(): GatewayStats {
    let totalRequests = this.requestLogs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalLatency = 0;
    let estimatedCostTotalUsd = 0;

    const byModel: Record<string, { requests: number; tokens: number }> = {};
    const byProvider: Record<string, { requests: number; tokens: number }> = {};

    for (const log of this.requestLogs) {
      if (log.status >= 200 && log.status < 300) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
      totalPromptTokens += log.promptTokens || 0;
      totalCompletionTokens += log.completionTokens || 0;
      totalTokens += log.totalTokens || 0;
      totalLatency += log.latencyMs || 0;
      estimatedCostTotalUsd += log.estimatedCostUsd || 0;

      // Model grouping
      if (!byModel[log.modelId]) byModel[log.modelId] = { requests: 0, tokens: 0 };
      byModel[log.modelId].requests++;
      byModel[log.modelId].tokens += log.totalTokens;

      // Provider grouping
      if (!byProvider[log.providerName]) byProvider[log.providerName] = { requests: 0, tokens: 0 };
      byProvider[log.providerName].requests++;
      byProvider[log.providerName].tokens += log.totalTokens;
    }

    const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    // Build 24-hour volume breakdown
    const hourlyMap = new Map<string, { requests: number; tokens: number }>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const label = `${d.getHours().toString().padStart(2, '0')}:00`;
      hourlyMap.set(label, { requests: 0, tokens: 0 });
    }

    for (const log of this.requestLogs) {
      const d = new Date(log.timestamp);
      const label = `${d.getHours().toString().padStart(2, '0')}:00`;
      if (hourlyMap.has(label)) {
        const item = hourlyMap.get(label)!;
        item.requests++;
        item.tokens += log.totalTokens;
      }
    }

    const hourlyVolume = Array.from(hourlyMap.entries()).map(([hour, val]) => ({
      hour,
      requests: val.requests,
      tokens: val.tokens,
    }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      avgLatencyMs,
      estimatedCostTotalUsd: Number(estimatedCostTotalUsd.toFixed(6)),
      uptimeSeconds,
      byModel,
      byProvider,
      hourlyVolume,
    };
  }

  addLog(log: Omit<RequestLog, 'id'>) {
    const fullLog: RequestLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.requestLogs.unshift(fullLog);
    if (this.requestLogs.length > 500) {
      this.requestLogs.pop();
    }

    // Update key usage
    const keyItem = this.apiKeys.find((k) => k.name === log.clientKeyName || k.key.includes(log.clientKeySnippet));
    if (keyItem) {
      keyItem.usageCount++;
      keyItem.totalTokens += log.totalTokens;
      keyItem.lastUsedAt = new Date().toISOString();
    }

    this.save();
    return fullLog;
  }
}

export const store = new Store();
