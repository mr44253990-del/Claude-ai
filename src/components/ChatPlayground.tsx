import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, Trash2, Code, Sliders, ShieldCheck, RefreshCw, Cpu, Activity, Copy, Check } from 'lucide-react';
import { ApiKey, ChatMessage, ModelConfig } from '../types/proxy';

interface ChatPlaygroundProps {
  models: ModelConfig[];
  apiKeys: ApiKey[];
  baseUrl: string;
  onRefreshLogs?: () => void;
}

export const ChatPlayground: React.FC<ChatPlaygroundProps> = ({
  models,
  apiKeys,
  baseUrl,
  onRefreshLogs,
}) => {
  const activeModels = models.filter((m) => m.enabled);
  const [selectedModel, setSelectedModel] = useState<string>(
    activeModels[0]?.id || 'glm-4.5-flash'
  );
  const [selectedKey, setSelectedKey] = useState<string>(
    apiKeys[0]?.key || 'sk-zai-35eaac71317f4bac828e323ce46e5fe7'
  );

  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are a helpful, precise, and fast AI assistant powered by ZAI GLM-4.5 Flash.'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'user', content: 'Hello, how are you?' },
    {
      role: 'assistant',
      content:
        'Hello! I am GLM-4.5 Flash running via your ZAI AI Proxy Gateway. How can I assist you today?',
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingStats, setStreamingStats] = useState<{
    latencyMs: number;
    tokensCount: number;
    tokensPerSec: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'json'>('chat');
  const [rawRequestJson, setRawRequestJson] = useState<string>('');
  const [rawResponseText, setRawResponseText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (customPrompt?: string) => {
    const userText = customPrompt || input.trim();
    if (!userText || isLoading) return;

    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingStats(null);

    // Prepare payload
    const fullMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...newMessages,
    ];

    const payload = {
      model: selectedModel,
      messages: fullMessages,
      temperature,
      stream: isStreaming,
    };

    setRawRequestJson(JSON.stringify(payload, null, 2));
    setRawResponseText('');

    const start = Date.now();

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${selectedKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error (${response.status}): ${errorText}` },
        ]);
        setRawResponseText(errorText);
        setIsLoading(false);
        if (onRefreshLogs) onRefreshLogs();
        return;
      }

      if (isStreaming && response.body) {
        // Stream reading
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulated = '';
        let chunkCount = 0;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    accumulated += delta;
                    chunkCount++;
                    setMessages((prev) => {
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        role: 'assistant',
                        content: accumulated,
                      };
                      return updated;
                    });
                  }
                } catch (e) {
                  // non-JSON
                }
              }
            }
          }
        }

        const latencyMs = Date.now() - start;
        const tokensCount = Math.ceil(accumulated.length / 3.8);
        const tokensPerSec = Number(((tokensCount / latencyMs) * 1000).toFixed(1));

        setStreamingStats({ latencyMs, tokensCount, tokensPerSec });
        setRawResponseText(accumulated);
      } else {
        // Non-streaming
        const data = await response.json();
        const assistantText = data?.choices?.[0]?.message?.content || 'No response';
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
        setRawResponseText(JSON.stringify(data, null, 2));

        const latencyMs = Date.now() - start;
        const tokensCount = data?.usage?.total_tokens || Math.ceil(assistantText.length / 3.8);
        const tokensPerSec = Number(((tokensCount / latencyMs) * 1000).toFixed(1));

        setStreamingStats({ latencyMs, tokensCount, tokensPerSec });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Network error: ${err.message || 'Request failed'}` },
      ]);
      setRawResponseText(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
      if (onRefreshLogs) onRefreshLogs();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingStats(null);
  };

  const copyRawResponse = () => {
    navigator.clipboard.writeText(rawResponseText || rawRequestJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Proxy Parameters
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            Live Stream
          </span>
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Target Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
          >
            {activeModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.providerId})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            Routes request through configured upstream provider endpoint
          </p>
        </div>

        {/* API Key Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Client API Key
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 focus:outline-none"
          >
            {apiKeys.map((k) => (
              <option key={k.id} value={k.key}>
                {k.name} ({k.key.slice(0, 10)}...)
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none resize-none"
            placeholder="System instructions..."
          />
        </div>

        {/* Temperature & Stream */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Temperature</span>
              <span className="font-mono text-indigo-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Stream Responses (SSE)</span>
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                isStreaming ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isStreaming ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Preset Sample Queries */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Sample Prompts
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Hello, how are you?',
              'Write Python script for ZAI GLM API',
              'Explain quantum computing simply',
            ].map((promptText, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(promptText)}
                disabled={isLoading}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-300 px-2.5 py-1 rounded-lg transition-colors text-left truncate max-w-full"
              >
                "{promptText}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Playground Area */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-[650px]">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chat Interface
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>

            {streamingStats && (
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  {streamingStats.latencyMs} ms
                </span>
                <span>·</span>
                <span>{streamingStats.tokensCount} tokens</span>
                <span>·</span>
                <span>{streamingStats.tokensPerSec} tks/sec</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Chat View */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                  <Zap className="w-8 h-8 text-indigo-400 animate-bounce" />
                  <p className="text-sm">Type a message below to test the ZAI proxy endpoint in real time.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-tl-none font-sans whitespace-pre-wrap'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-70 mb-1 font-mono">
                          <span>{isUser ? 'Client (User)' : `Proxy (${selectedModel})`}</span>
                        </div>
                        {msg.content || (
                          <span className="inline-flex items-center gap-1.5 text-indigo-400 font-mono animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Streaming tokens from ZAI...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Send a test message to ZAI proxy..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Tab 2: Raw JSON Inspector */
          <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold">Request & Response Payloads</span>
              <button
                onClick={copyRawResponse}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Payload'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-indigo-400 font-bold uppercase">OpenAI Format Request Body:</span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-indigo-300 overflow-x-auto">
                {rawRequestJson || '// No request issued yet'}
              </pre>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-emerald-400 font-bold uppercase">Upstream Provider Response:</span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-300 overflow-x-auto">
                {rawResponseText || '// Response will appear here'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
