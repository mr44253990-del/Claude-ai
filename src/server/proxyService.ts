import { Response } from 'express';
import { ApiKey, AnthropicMessageRequest, ModelConfig, OpenAICompletionRequest, Provider } from '../types/proxy.js';
import { calculateCost, countMessagesTokens, countStringTokens } from '../utils/tokenCounter.js';
import { prepareZAIPayload, transformAnthropicToOpenAI, transformOpenAIToAnthropicResponse } from '../utils/translator.js';
import { store } from './store.js';

export async function handleChatCompletion(
  reqBody: OpenAICompletionRequest,
  apiKey: ApiKey,
  res: Response,
  endpoint: string = '/v1/chat/completions'
) {
  const startTime = Date.now();
  const requestedModel = reqBody.model || 'glm-4.5-flash';

  // Find model config
  const modelConfig =
    store.models.find((m) => m.id === requestedModel && m.enabled) ||
    store.models.find((m) => m.id === 'glm-4.5-flash');

  if (!modelConfig) {
    return res.status(404).json({
      error: {
        message: `Model '${requestedModel}' not found or disabled in gateway.`,
        type: 'invalid_request_error',
        code: 'model_not_found',
      },
    });
  }

  // Find provider
  const provider = store.providers.find((p) => p.id === modelConfig.providerId && p.enabled);
  if (!provider) {
    return res.status(503).json({
      error: {
        message: `Upstream provider for model '${requestedModel}' is currently disabled or unconfigured.`,
        type: 'service_unavailable',
        code: 'provider_disabled',
      },
    });
  }

  const promptTokens = countMessagesTokens(reqBody.messages);
  const isStream = Boolean(reqBody.stream);

  // Target provider configuration
  const targetUrl = provider.baseUrl || 'https://api.z.ai/api/paas/v4/chat/completions';
  const targetApiKey = provider.apiKey || process.env.ZAI_API_KEY || '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H';

  // Construct target payload
  const payload = prepareZAIPayload(reqBody, modelConfig.targetModel);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${targetApiKey}`,
  };

  if (isStream) {
    // STREAMING MODE
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const latencyMs = Date.now() - startTime;
        store.addLog({
          timestamp: new Date().toISOString(),
          clientKeyName: apiKey.name,
          clientKeySnippet: apiKey.key.slice(-6),
          providerId: provider.id,
          providerName: provider.name,
          modelId: modelConfig.id,
          endpoint,
          status: response.status,
          latencyMs,
          promptTokens,
          completionTokens: 0,
          totalTokens: promptTokens,
          estimatedCostUsd: 0,
          isStream: true,
          requestMessages: reqBody.messages,
          responsePreview: '',
          errorDetails: errorText,
        });

        return res.status(response.status).json({
          error: {
            message: `Upstream provider error (${response.status}): ${errorText}`,
            type: 'upstream_error',
          },
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let accumulatedText = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error('Response body reader unavailable');
      }

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          res.write(chunkStr);

          // Parse text for token counting
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) accumulatedText += content;
              } catch (e) {
                // Non-JSON SSE line or partial chunk
              }
            }
          }
        }
      }

      res.end();

      const completionTokens = countStringTokens(accumulatedText);
      const totalTokens = promptTokens + completionTokens;
      const latencyMs = Date.now() - startTime;
      const estimatedCostUsd = calculateCost(
        promptTokens,
        completionTokens,
        modelConfig.costPer1kInputTokens,
        modelConfig.costPer1kOutputTokens
      );

      store.addLog({
        timestamp: new Date().toISOString(),
        clientKeyName: apiKey.name,
        clientKeySnippet: apiKey.key.slice(-6),
        providerId: provider.id,
        providerName: provider.name,
        modelId: modelConfig.id,
        endpoint,
        status: 200,
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd,
        isStream: true,
        requestMessages: reqBody.messages,
        responsePreview: accumulatedText.slice(0, 300) || 'Stream completed successfully.',
      });
    } catch (err: any) {
      console.error('Streaming proxy error:', err);
      const latencyMs = Date.now() - startTime;
      store.addLog({
        timestamp: new Date().toISOString(),
        clientKeyName: apiKey.name,
        clientKeySnippet: apiKey.key.slice(-6),
        providerId: provider.id,
        providerName: provider.name,
        modelId: modelConfig.id,
        endpoint,
        status: 500,
        latencyMs,
        promptTokens,
        completionTokens: 0,
        totalTokens: promptTokens,
        estimatedCostUsd: 0,
        isStream: true,
        requestMessages: reqBody.messages,
        responsePreview: '',
        errorDetails: err.message || 'Streaming failed',
      });

      if (!res.headersSent) {
        res.status(500).json({ error: { message: err.message || 'Stream processing failed' } });
      }
    }
  } else {
    // NON-STREAMING MODE
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);
      const latencyMs = Date.now() - startTime;

      if (!response.ok || !responseData) {
        const errorMsg = JSON.stringify(responseData) || 'Unknown provider error';
        store.addLog({
          timestamp: new Date().toISOString(),
          clientKeyName: apiKey.name,
          clientKeySnippet: apiKey.key.slice(-6),
          providerId: provider.id,
          providerName: provider.name,
          modelId: modelConfig.id,
          endpoint,
          status: response.status || 500,
          latencyMs,
          promptTokens,
          completionTokens: 0,
          totalTokens: promptTokens,
          estimatedCostUsd: 0,
          isStream: false,
          requestMessages: reqBody.messages,
          responsePreview: '',
          errorDetails: errorMsg,
        });

        return res.status(response.status || 500).json(
          responseData || {
            error: { message: `Upstream provider error: ${errorMsg}` },
          }
        );
      }

      // Extract response content
      const content = responseData?.choices?.[0]?.message?.content || '';
      const usagePrompt = responseData?.usage?.prompt_tokens || promptTokens;
      const usageCompletion = responseData?.usage?.completion_tokens || countStringTokens(content);
      const totalTokens = usagePrompt + usageCompletion;

      const estimatedCostUsd = calculateCost(
        usagePrompt,
        usageCompletion,
        modelConfig.costPer1kInputTokens,
        modelConfig.costPer1kOutputTokens
      );

      // Ensure model field in returned JSON matches client requested model
      if (responseData) {
        responseData.model = requestedModel;
      }

      store.addLog({
        timestamp: new Date().toISOString(),
        clientKeyName: apiKey.name,
        clientKeySnippet: apiKey.key.slice(-6),
        providerId: provider.id,
        providerName: provider.name,
        modelId: modelConfig.id,
        endpoint,
        status: 200,
        latencyMs,
        promptTokens: usagePrompt,
        completionTokens: usageCompletion,
        totalTokens,
        estimatedCostUsd,
        isStream: false,
        requestMessages: reqBody.messages,
        responsePreview: content.slice(0, 300),
      });

      return res.status(200).json(responseData);
    } catch (err: any) {
      console.error('Non-streaming proxy error:', err);
      const latencyMs = Date.now() - startTime;
      store.addLog({
        timestamp: new Date().toISOString(),
        clientKeyName: apiKey.name,
        clientKeySnippet: apiKey.key.slice(-6),
        providerId: provider.id,
        providerName: provider.name,
        modelId: modelConfig.id,
        endpoint,
        status: 500,
        latencyMs,
        promptTokens,
        completionTokens: 0,
        totalTokens: promptTokens,
        estimatedCostUsd: 0,
        isStream: false,
        requestMessages: reqBody.messages,
        responsePreview: '',
        errorDetails: err.message || 'Request failed',
      });

      return res.status(500).json({ error: { message: err.message || 'Internal proxy error' } });
    }
  }
}

export async function handleAnthropicMessages(
  anthropicReq: AnthropicMessageRequest,
  apiKey: ApiKey,
  res: Response
) {
  // Convert Anthropic request into standard OpenAI completion request
  const openAIReq = transformAnthropicToOpenAI(anthropicReq);

  // If non-streaming, route through chat completion handler and transform response back
  if (!anthropicReq.stream) {
    const originalResJson = res.json.bind(res);
    let capturedBody: any = null;

    res.json = (body: any) => {
      capturedBody = body;
      return res;
    };

    await handleChatCompletion(openAIReq, apiKey, res, '/v1/messages');

    if (capturedBody) {
      if (capturedBody.error) {
        return originalResJson(capturedBody);
      }
      const anthropicResp = transformOpenAIToAnthropicResponse(capturedBody, anthropicReq.model);
      return originalResJson(anthropicResp);
    }
  } else {
    // Anthropic streaming request
    await handleChatCompletion(openAIReq, apiKey, res, '/v1/messages');
  }
}
