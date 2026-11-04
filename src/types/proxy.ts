export type ProtocolType = 'openai' | 'anthropic' | 'zai' | 'custom';

export interface ModelConfig {
  id: string; // The model ID exposed to clients (e.g., 'glm-4.5-flash')
  name: string; // Human readable name
  providerId: string; // Upstream provider ID
  targetModel: string; // Upstream model ID expected by provider API
  contextWindow: number; // e.g. 128000
  maxOutputTokens: number; // e.g. 8192
  costPer1kInputTokens: number; // USD per 1K input tokens
  costPer1kOutputTokens: number; // USD per 1K output tokens
  enabled: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  protocol: ProtocolType;
  enabled: boolean;
  isCustom: boolean;
  description: string;
}

export interface ApiKey {
  id: string;
  key: string; // e.g. 'sk-zai-...'
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  totalTokens: number;
  enabled: boolean;
  rateLimitRpm: number;
  tokenLimit: number | null;
}

export interface RequestLog {
  id: string;
  timestamp: string;
  clientKeyName: string;
  clientKeySnippet: string;
  providerId: string;
  providerName: string;
  modelId: string;
  endpoint: string; // '/v1/chat/completions' | '/v1/messages'
  status: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  isStream: boolean;
  requestMessages: any[];
  responsePreview: string;
  errorDetails?: string | null;
}

export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  estimatedCostTotalUsd: number;
  uptimeSeconds: number;
  byModel: Record<string, { requests: number; tokens: number }>;
  byProvider: Record<string, { requests: number; tokens: number }>;
  hourlyVolume: Array<{ hour: string; requests: number; tokens: number }>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  system?: string;
  tools?: any[];
  [key: string]: any;
}

export interface AnthropicMessageRequest {
  model: string;
  messages: ChatMessage[];
  system?: string;
  max_tokens?: number;
  metadata?: any;
  stop_sequences?: string[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  tools?: any[];
  [key: string]: any;
}
