import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { handleAnthropicMessages, handleChatCompletion } from './src/server/proxyService.js';
import { store } from './src/server/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable JSON body parsing and CORS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware for external client support (TypingMind, SillyTavern, NextChat, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to validate API key for proxy endpoints
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  const authKey = Array.isArray(authHeader) ? authHeader[0] : authHeader || '';

  const apiKey = store.validateApiKey(authKey);
  if (!apiKey) {
    // If no key provided, default to master key for convenience in playground
    const defaultKey = store.apiKeys[0];
    if (defaultKey && defaultKey.enabled) {
      (req as any).apiKey = defaultKey;
      return next();
    }

    return res.status(401).json({
      error: {
        message: 'Invalid or missing API key. Pass Authorization: Bearer <sk-zai-...> or x-api-key header.',
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    });
  }

  (req as any).apiKey = apiKey;
  next();
};

// --- PUBLIC PROXY ENDPOINTS ---

// OpenAI GET /v1/models & /api/v1/models
const handleGetModels = (_req: Request, res: Response) => {
  const activeModels = store.models.filter((m) => m.enabled);
  const data = activeModels.map((m) => ({
    id: m.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000) - 86400 * 30,
    owned_by: m.providerId,
    permission: [],
    context_window: m.contextWindow,
    max_tokens: m.maxOutputTokens,
  }));

  return res.json({
    object: 'list',
    data,
  });
};

app.get('/v1/models', handleGetModels);
app.get('/api/v1/models', handleGetModels);

// OpenAI POST /v1/chat/completions & /api/v1/chat/completions
const handleChatRoute = (req: Request, res: Response) => {
  const apiKey = (req as any).apiKey;
  return handleChatCompletion(req.body, apiKey, res, '/v1/chat/completions');
};

app.post('/v1/chat/completions', authMiddleware, handleChatRoute);
app.post('/api/v1/chat/completions', authMiddleware, handleChatRoute);

// Anthropic POST /v1/messages & /api/v1/messages
const handleMessagesRoute = (req: Request, res: Response) => {
  const apiKey = (req as any).apiKey;
  return handleAnthropicMessages(req.body, apiKey, res);
};

app.post('/v1/messages', authMiddleware, handleMessagesRoute);
app.post('/api/v1/messages', authMiddleware, handleMessagesRoute);

// --- MANAGEMENT API ENDPOINTS FOR DASHBOARD ---

// Stats & Analytics
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json(store.getStats());
});

// Logs
app.get('/api/logs', (_req: Request, res: Response) => {
  res.json(store.requestLogs);
});

// Providers
app.get('/api/providers', (_req: Request, res: Response) => {
  res.json(store.providers);
});

app.post('/api/providers', (req: Request, res: Response) => {
  const { name, baseUrl, apiKey, protocol, description } = req.body;
  if (!name || !baseUrl) {
    return res.status(400).json({ error: 'Name and Base URL are required' });
  }

  const id = req.body.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existingIdx = store.providers.findIndex((p) => p.id === id);

  const providerItem = {
    id,
    name,
    baseUrl,
    apiKey: apiKey || '',
    protocol: protocol || 'openai',
    enabled: true,
    isCustom: true,
    description: description || 'Custom AI Provider',
  };

  if (existingIdx >= 0) {
    store.providers[existingIdx] = { ...store.providers[existingIdx], ...providerItem };
  } else {
    store.providers.push(providerItem);
  }

  store.save();
  return res.json(providerItem);
});

app.put('/api/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const pIdx = store.providers.findIndex((p) => p.id === id);
  if (pIdx === -1) return res.status(404).json({ error: 'Provider not found' });

  store.providers[pIdx] = { ...store.providers[pIdx], ...req.body };
  store.save();
  return res.json(store.providers[pIdx]);
});

app.delete('/api/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.providers = store.providers.filter((p) => p.id !== id);
  store.models = store.models.filter((m) => m.providerId !== id);
  store.save();
  return res.json({ success: true });
});

// Models
app.get('/api/models', (_req: Request, res: Response) => {
  res.json(store.models);
});

app.post('/api/models', (req: Request, res: Response) => {
  const { id, name, providerId, targetModel, contextWindow, maxOutputTokens, costPer1kInputTokens, costPer1kOutputTokens, description } = req.body;

  if (!id || !name || !providerId) {
    return res.status(400).json({ error: 'ID, Name, and Provider ID are required' });
  }

  const newModel = {
    id: id.trim().toLowerCase().replace(/\s+/g, '-'),
    name,
    providerId,
    targetModel: targetModel || id,
    contextWindow: parseInt(contextWindow, 10) || 128000,
    maxOutputTokens: parseInt(maxOutputTokens, 10) || 4096,
    costPer1kInputTokens: parseFloat(costPer1kInputTokens) || 0,
    costPer1kOutputTokens: parseFloat(costPer1kOutputTokens) || 0,
    enabled: true,
    supportsStreaming: true,
    supportsVision: Boolean(req.body.supportsVision),
    description: description || 'Custom mapped model',
  };

  const existingIdx = store.models.findIndex((m) => m.id === newModel.id);
  if (existingIdx >= 0) {
    store.models[existingIdx] = newModel;
  } else {
    store.models.push(newModel);
  }

  store.save();
  return res.json(newModel);
});

app.put('/api/models/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const mIdx = store.models.findIndex((m) => m.id === id);
  if (mIdx === -1) return res.status(404).json({ error: 'Model not found' });

  store.models[mIdx] = { ...store.models[mIdx], ...req.body };
  store.save();
  return res.json(store.models[mIdx]);
});

app.delete('/api/models/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.models = store.models.filter((m) => m.id !== id);
  store.save();
  return res.json({ success: true });
});

// API Keys
app.get('/api/keys', (_req: Request, res: Response) => {
  res.json(store.apiKeys);
});

app.post('/api/keys', (req: Request, res: Response) => {
  const { name, rateLimitRpm, tokenLimit } = req.body;
  const keyHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const newKey = {
    id: `key_${Date.now()}`,
    key: `sk-zai-${keyHex}`,
    name: name || 'Client API Key',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    usageCount: 0,
    totalTokens: 0,
    enabled: true,
    rateLimitRpm: rateLimitRpm ? parseInt(rateLimitRpm, 10) : 120,
    tokenLimit: tokenLimit ? parseInt(tokenLimit, 10) : null,
  };

  store.apiKeys.push(newKey);
  store.save();
  return res.json(newKey);
});

app.put('/api/keys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const kIdx = store.apiKeys.findIndex((k) => k.id === id);
  if (kIdx === -1) return res.status(404).json({ error: 'API Key not found' });

  store.apiKeys[kIdx] = { ...store.apiKeys[kIdx], ...req.body };
  store.save();
  return res.json(store.apiKeys[kIdx]);
});

app.delete('/api/keys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (store.apiKeys.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only master API key' });
  }
  store.apiKeys = store.apiKeys.filter((k) => k.id !== id);
  store.save();
  return res.json({ success: true });
});

// Test Connection Endpoint
app.post('/api/test-provider', async (req: Request, res: Response) => {
  const { baseUrl, apiKey, model } = req.body;
  const start = Date.now();
  const testUrl = baseUrl || 'https://api.z.ai/api/paas/v4/chat/completions';
  const testKey = apiKey || process.env.ZAI_API_KEY || '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H';

  try {
    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testKey}`,
      },
      body: JSON.stringify({
        model: model || 'glm-4.5-flash',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - start;
    if (testRes.ok) {
      return res.json({ success: true, latencyMs, status: testRes.status });
    } else {
      const errText = await testRes.text();
      return res.json({ success: false, latencyMs, status: testRes.status, error: errText });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Connection failed',
    });
  }
});

// Reset Logs / Stats
app.post('/api/reset-stats', (_req: Request, res: Response) => {
  store.requestLogs = [];
  store.save();
  return res.json({ success: true });
});

// Start Express + Vite dev server middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ZAI AI Proxy Server running on http://0.0.0.0:${PORT}`);
    console.log(`🔗 OpenAI Chat Endpoint: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`🔗 OpenAI Models Endpoint: http://localhost:${PORT}/v1/models`);
    console.log(`🔗 Anthropic Messages Endpoint: http://localhost:${PORT}/v1/messages\n`);
  });
}

startServer();
