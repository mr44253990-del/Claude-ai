import test from 'node:test';
import assert from 'node:assert/strict';
import { countStringTokens, countMessagesTokens, calculateCost } from './tokenCounter.js';
import { transformAnthropicToOpenAI, transformOpenAIToAnthropicResponse } from './translator.js';

test('countStringTokens calculates English and Unicode character density', () => {
  const englishText = 'Hello world! This is a test string.';
  const tokens = countStringTokens(englishText);
  assert.ok(tokens > 5 && tokens < 15);

  const unicodeText = 'কেমন আছেন? এটি একটি এআই প্রক্সি সার্ভিস।';
  const uTokens = countStringTokens(unicodeText);
  assert.ok(uTokens > 10);
});

test('countMessagesTokens sums total chat message tokens', () => {
  const messages = [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'Hello!' },
  ];
  const count = countMessagesTokens(messages);
  assert.ok(count > 10);
});

test('calculateCost provides exact USD estimates', () => {
  const cost = calculateCost(1000, 2000, 0.001, 0.002);
  assert.equal(cost, 0.005);
});

test('transformAnthropicToOpenAI accurately maps messages and system prompt', () => {
  const anthropicReq = {
    model: 'claude-3-5-sonnet',
    system: 'Always respond in JSON.',
    messages: [
      { role: 'user' as const, content: [{ type: 'text', text: 'List top 3 programming languages' }] }
    ],
    temperature: 0.5,
    max_tokens: 500,
    stream: true,
  };

  const openAIReq = transformAnthropicToOpenAI(anthropicReq);
  assert.equal(openAIReq.model, 'claude-3-5-sonnet');
  assert.equal(openAIReq.messages.length, 2);
  assert.equal(openAIReq.messages[0].role, 'system');
  assert.equal(openAIReq.messages[0].content, 'Always respond in JSON.');
  assert.equal(openAIReq.messages[1].content, 'List top 3 programming languages');
  assert.equal(openAIReq.stream, true);
});

test('transformOpenAIToAnthropicResponse outputs valid Anthropic structure', () => {
  const openAIResp = {
    id: 'chatcmpl-12345',
    choices: [{ message: { content: 'Python, TypeScript, Rust' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 20, completion_tokens: 10 },
  };

  const anthropicResp = transformOpenAIToAnthropicResponse(openAIResp, 'glm-4.5-flash');
  assert.equal(anthropicResp.type, 'message');
  assert.equal(anthropicResp.model, 'glm-4.5-flash');
  assert.equal(anthropicResp.content[0].text, 'Python, TypeScript, Rust');
  assert.equal(anthropicResp.usage.input_tokens, 20);
  assert.equal(anthropicResp.usage.output_tokens, 10);
});
