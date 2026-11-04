import { ChatMessage } from '../types/proxy.js';

/**
 * Fast and robust token counter and estimator.
 */
export function countStringTokens(text: string | null | undefined): number {
  if (!text) return 0;
  // Handle CJK / Non-Latin character density vs Latin English density
  const hasUnicodeExtended = /[^\x00-\x7F]/.test(text);
  if (hasUnicodeExtended) {
    // Non-ASCII text (e.g. Bengali, Chinese, Japanese) often consumes ~1-2 chars per token
    return Math.ceil(text.length / 2.2);
  }
  // Standard English text & code ~ 3.8-4 chars per token
  return Math.ceil(text.length / 3.8);
}

export function countMessagesTokens(messages: ChatMessage[] | null | undefined): number {
  if (!messages || !Array.isArray(messages)) return 0;
  let total = 0;
  for (const msg of messages) {
    total += 4; // Per message overhead
    if (typeof msg.content === 'string') {
      total += countStringTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content as any[]) {
        if (item.type === 'text' && typeof item.text === 'string') {
          total += countStringTokens(item.text);
        }
      }
    }
  }
  return total;
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  costPer1kInput: number = 0.0001,
  costPer1kOutput: number = 0.0002
): number {
  const inputCost = (promptTokens / 1000) * costPer1kInput;
  const outputCost = (completionTokens / 1000) * costPer1kOutput;
  return Number((inputCost + outputCost).toFixed(6));
}
