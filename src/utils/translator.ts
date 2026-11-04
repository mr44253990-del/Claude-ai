import { AnthropicMessageRequest, ChatMessage, OpenAICompletionRequest } from '../types/proxy.js';

/**
 * Transforms an Anthropic `POST /v1/messages` request into standard OpenAI `/v1/chat/completions` request structure.
 */
export function transformAnthropicToOpenAI(anthropicReq: AnthropicMessageRequest): OpenAICompletionRequest {
  const messages: ChatMessage[] = [];

  // Extract Anthropic system prompt
  if (anthropicReq.system) {
    if (typeof anthropicReq.system === 'string') {
      messages.push({ role: 'system', content: anthropicReq.system });
    } else if (Array.isArray(anthropicReq.system)) {
      const systemText = anthropicReq.system
        .map((s: any) => (typeof s === 'string' ? s : s.text || ''))
        .join('\n');
      if (systemText) messages.push({ role: 'system', content: systemText });
    }
  }

  // Convert Anthropic messages to OpenAI messages
  if (Array.isArray(anthropicReq.messages)) {
    for (const msg of anthropicReq.messages) {
      let contentStr = '';
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentStr = msg.content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (part.type === 'text') return part.text || '';
            return '';
          })
          .filter(Boolean)
          .join('\n');
      } else if (msg.content && typeof msg.content === 'object') {
        contentStr = (msg.content as any).text || '';
      }

      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: contentStr,
      });
    }
  }

  return {
    model: anthropicReq.model,
    messages,
    max_tokens: anthropicReq.max_tokens,
    temperature: anthropicReq.temperature,
    top_p: anthropicReq.top_p,
    stream: anthropicReq.stream ?? false,
    tools: anthropicReq.tools,
  };
}

/**
 * Formats a standard OpenAI non-streaming chat completion object into an Anthropic message response object.
 */
export function transformOpenAIToAnthropicResponse(openAIResp: any, requestedModel: string): any {
  const contentText = openAIResp?.choices?.[0]?.message?.content || '';
  const promptTokens = openAIResp?.usage?.prompt_tokens || 0;
  const completionTokens = openAIResp?.usage?.completion_tokens || 0;

  return {
    id: openAIResp.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'message',
    role: 'assistant',
    model: requestedModel,
    content: [
      {
        type: 'text',
        text: contentText,
      },
    ],
    stop_reason: openAIResp?.choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : 'max_tokens',
    stop_sequence: null,
    usage: {
      input_tokens: promptTokens,
      output_tokens: completionTokens,
    },
  };
}

/**
 * Prepares ZAI API payload from OpenAI request format.
 */
export function prepareZAIPayload(req: OpenAICompletionRequest, targetModel: string) {
  const messages: ChatMessage[] = [];

  // Flatten system messages into roles
  if (Array.isArray(req.messages)) {
    for (const m of req.messages) {
      messages.push({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      });
    }
  }

  return {
    model: targetModel,
    messages,
    temperature: req.temperature ?? 0.7,
    top_p: req.top_p ?? 0.9,
    max_tokens: req.max_tokens || req.max_completion_tokens || 4096,
    stream: req.stream ?? false,
  };
}
