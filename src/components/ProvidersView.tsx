import React, { useState } from 'react';
import { Layers, Plus, Activity, CheckCircle2, XCircle, Trash2, Edit2, Zap, RefreshCw, Key, Sparkles } from 'lucide-react';
import { Provider } from '../types/proxy';

interface ProvidersViewProps {
  providers: Provider[];
  onAddProvider: (provider: Partial<Provider>) => void;
  onUpdateProvider: (id: string, updates: Partial<Provider>) => void;
  onDeleteProvider: (id: string) => void;
}

export const ProvidersView: React.FC<ProvidersViewProps> = ({
  providers,
  onAddProvider,
  onUpdateProvider,
  onDeleteProvider,
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latencyMs?: number; error?: string }>>({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [protocol, setProtocol] = useState<'openai' | 'anthropic' | 'zai'>('openai');
  const [description, setDescription] = useState('');

  // Provider Presets
  const presets = [
    {
      name: 'OpenCode AI Hub',
      baseUrl: 'https://api.opencode.ai/v1/chat/completions',
      apiKey: '35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H',
      protocol: 'openai' as const,
      description: 'Open-weights models router (DeepSeek R1, Qwen 2.5 72B, Llama 3.3).',
    },
    {
      name: 'DeepSeek Official API',
      baseUrl: 'https://api.deepseek.com/chat/completions',
      apiKey: '',
      protocol: 'openai' as const,
      description: 'Official DeepSeek V3 and DeepSeek R1 reasoning models.',
    },
    {
      name: 'Groq Cloud High-Speed',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: '',
      protocol: 'openai' as const,
      description: 'Ultra-fast LPU inference engine for Llama 3.3 and Gemma 2.',
    },
    {
      name: 'Ollama Local / Self-Hosted',
      baseUrl: 'http://localhost:11434/v1/chat/completions',
      apiKey: 'ollama-local-key',
      protocol: 'openai' as const,
      description: 'Self-hosted local models (Llama 3, Qwen 2.5, Phi 3).',
    },
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setName(preset.name);
    setBaseUrl(preset.baseUrl);
    setApiKey(preset.apiKey);
    setProtocol(preset.protocol);
    setDescription(preset.description);
  };

  const handleTestConnection = async (provider: Provider) => {
    setTestingId(provider.id);
    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: 'glm-4.5-flash',
        }),
      });

      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [provider.id]: data,
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider.id]: { success: false, error: err.message || 'Ping failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingProvider(null);
    setName('');
    setBaseUrl('');
    setApiKey('');
    setProtocol('openai');
    setDescription('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Provider) => {
    setEditingProvider(p);
    setName(p.name);
    setBaseUrl(p.baseUrl);
    setApiKey(p.apiKey);
    setProtocol(p.protocol as any);
    setDescription(p.description);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !baseUrl) return;

    if (editingProvider) {
      onUpdateProvider(editingProvider.id, {
        name,
        baseUrl,
        apiKey,
        protocol,
        description,
      });
    } else {
      onAddProvider({
        name,
        baseUrl,
        apiKey,
        protocol,
        description: description || 'Custom AI Provider',
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Upstream Providers & Gateway Integrations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure pre-installed ZAI, OpenCode AI Hub, or add custom OpenAI/Anthropic compatible endpoints.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Provider</span>
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const test = testResult[p.id];
          const isTesting = testingId === p.id;

          return (
            <div
              key={p.id}
              className={`bg-slate-900/90 border rounded-xl p-5 space-y-4 transition-all ${
                p.enabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{p.name}</h3>
                    {p.id === 'zai' && (
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        Default
                      </span>
                    )}
                    {p.id === 'opencode' && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                        OpenCode Hub
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-indigo-400 block truncate">{p.baseUrl}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateProvider(p.id, { enabled: !p.enabled })}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      p.enabled ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}
                    title={p.enabled ? 'Enabled' : 'Disabled'}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        p.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

              {/* API Key Box */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <Key className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-400 text-[11px]">API Key:</span>
                  <span className="text-indigo-300 truncate">
                    {p.apiKey ? `${p.apiKey.slice(0, 10)}...${p.apiKey.slice(-4)}` : 'No Key Set'}
                  </span>
                </div>
              </div>

              {/* Test Result Indicator */}
              {test && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    test.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {test.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{test.success ? 'Endpoint Connection Successful' : test.error || 'Connection Failed'}</span>
                  </div>
                  {test.latencyMs && <span>{test.latencyMs} ms</span>}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  onClick={() => handleTestConnection(p)}
                  disabled={isTesting || !p.enabled}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Ping...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Edit Provider"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {p.isCustom && (
                    <button
                      onClick={() => onDeleteProvider(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete Provider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Provider Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingProvider ? 'Edit Provider Configuration' : 'Add Upstream Provider / OpenCode Hub'}
            </h3>

            {/* Presets Row */}
            {!editingProvider && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Quick Load Provider Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[10px] bg-slate-950 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/40 text-slate-300 px-2 py-1 rounded transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Provider Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenCode AI Hub, DeepSeek, Groq, Together AI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Base Endpoint URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.opencode.ai/v1/chat/completions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Upstream API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. 35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Protocol Format</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="openai">OpenAI Compatible Chat Completions</option>
                  <option value="zai">ZAI PAAS API Format</option>
                  <option value="anthropic">Anthropic Messages Format</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provider description..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
