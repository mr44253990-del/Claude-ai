import React, { useState } from 'react';
import { Cpu, Copy, Check, Code, Plus, Layers, Terminal, Sparkles } from 'lucide-react';
import { ModelConfig, Provider } from '../types/proxy';

interface ModelsViewProps {
  models: ModelConfig[];
  providers: Provider[];
  baseUrl: string;
  defaultKey: string;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  onAddModel: (model: Partial<ModelConfig>) => void;
}

export const ModelsView: React.FC<ModelsViewProps> = ({
  models,
  providers,
  baseUrl,
  defaultKey,
  onToggleModel,
  onAddModel,
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(
    models.find((m) => m.id === 'glm-4.5-flash') || models[0]
  );
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Model Form state
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newProviderId, setNewProviderId] = useState(providers[0]?.id || 'zai');
  const [newTargetModel, setNewTargetModel] = useState('');
  const [newContextWindow, setNewContextWindow] = useState('128000');
  const [newDescription, setNewDescription] = useState('');

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelId || !newModelName) return;

    onAddModel({
      id: newModelId,
      name: newModelName,
      providerId: newProviderId,
      targetModel: newTargetModel || newModelId,
      contextWindow: parseInt(newContextWindow, 10) || 128000,
      description: newDescription || 'Custom mapped model',
    });

    setShowAddModal(false);
    setNewModelId('');
    setNewModelName('');
    setNewTargetModel('');
  };

  // Code snippets generator
  const snippets = {
    curlOpenAI: `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${defaultKey || 'sk-zai-key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedModel?.id || 'glm-4.5-flash'}",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'`,

    curlZAI: `curl https://api.z.ai/api/paas/v4/chat/completions \\
  -H "Authorization: Bearer 35eaac71317f4bac828e323ce46e5fe7.w0dLRcFwWLCg9J7H" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "glm-4.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'`,

    pythonOpenAI: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/v1",
    api_key="${defaultKey || 'sk-zai-key'}"
)

response = client.chat.completions.create(
    model="${selectedModel?.id || 'glm-4.5-flash'}",
    messages=[
        {"role": "user", "content": "Hello! Explain quantum computing simply."}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`,

    jsTypeScript: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "${baseUrl}/v1",
  apiKey: "${defaultKey || 'sk-zai-key'}",
});

const response = await openai.chat.completions.create({
  model: "${selectedModel?.id || 'glm-4.5-flash'}",
  messages: [{ role: "user", content: "Hello world!" }],
  stream: true,
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,

    anthropicMessages: `curl ${baseUrl}/v1/messages \\
  -H "x-api-key: ${defaultKey || 'sk-zai-key'}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedModel?.id || 'glm-4.5-flash'}",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello Claude/GLM!"}
    ]
  }'`,
  };

  return (
    <div className="space-y-6">
      {/* Directory Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Model Directory & Router Mapping
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Active models exposed at <code className="text-indigo-300 font-mono">{baseUrl}/v1/models</code>
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Model</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Cards List */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
            Exposed Gateway Models ({models.filter((m) => m.enabled).length} active)
          </span>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {models.map((model) => {
              const isSelected = selectedModel?.id === model.id;
              const provider = providers.find((p) => p.id === model.providerId);

              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{model.name}</span>
                        {model.id === 'glm-4.5-flash' && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                            Default ZAI
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-indigo-400 block">{model.id}</span>
                    </div>

                    {/* Enable Toggle Switch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleModel(model.id, !model.enabled);
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                        model.enabled ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                      title={model.enabled ? 'Model Enabled' : 'Model Disabled'}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          model.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight mb-3 line-clamp-2">
                    {model.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {provider?.name || model.providerId}
                    </span>
                    <span>{(model.contextWindow / 1000).toFixed(0)}k context</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Model Details & Code Generator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Model Card Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {selectedModel.name} Integration Guide
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Upstream target: {selectedModel.targetModel} ({selectedModel.providerId})
                </p>
              </div>

              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                Ready to invoke
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{selectedModel.description}</p>

            {/* Quick Specs */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Context Window:</span>
                <span className="text-white font-bold">{selectedModel.contextWindow.toLocaleString()} tokens</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Max Output:</span>
                <span className="text-white font-bold">{selectedModel.maxOutputTokens.toLocaleString()} tokens</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Streaming SSE:</span>
                <span className="text-emerald-400 font-bold">Supported</span>
              </div>
            </div>
          </div>

          {/* Snippets Generator Accordions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              Copy-and-Paste Code Snippets
            </h3>

            {/* Snippet 1: OpenAI cURL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  OpenAI Chat Completions cURL
                </span>
                <button
                  onClick={() => copySnippet(snippets.curlOpenAI, 'curl_openai')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  {copiedSnippet === 'curl_openai' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === 'curl_openai' ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto">
                {snippets.curlOpenAI}
              </pre>
            </div>

            {/* Snippet 2: ZAI Direct cURL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  ZAI Direct cURL (Provided in Prompt)
                </span>
                <button
                  onClick={() => copySnippet(snippets.curlZAI, 'curl_zai')}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                >
                  {copiedSnippet === 'curl_zai' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === 'curl_zai' ? 'Copied' : 'Copy ZAI cURL'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-amber-200 overflow-x-auto">
                {snippets.curlZAI}
              </pre>
            </div>

            {/* Snippet 3: Python SDK */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Python (OpenAI SDK)</span>
                <button
                  onClick={() => copySnippet(snippets.pythonOpenAI, 'py_openai')}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  {copiedSnippet === 'py_openai' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === 'py_openai' ? 'Copied' : 'Copy Python'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-200 overflow-x-auto">
                {snippets.pythonOpenAI}
              </pre>
            </div>

            {/* Snippet 4: Anthropic Messages Format */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Anthropic Messages Format</span>
                <button
                  onClick={() => copySnippet(snippets.anthropicMessages, 'anthropic_msg')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedSnippet === 'anthropic_msg' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === 'anthropic_msg' ? 'Copied' : 'Copy Anthropic'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto">
                {snippets.anthropicMessages}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add Custom Model Mapping</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Model ID (Client exposed)</label>
                <input
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g. my-custom-model"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Display Name</label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. My Custom Model 70B"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assign Upstream Provider</label>
                <select
                  value={newProviderId}
                  onChange={(e) => setNewProviderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Model ID (Provider expected)</label>
                <input
                  type="text"
                  value={newTargetModel}
                  onChange={(e) => setNewTargetModel(e.target.value)}
                  placeholder="e.g. glm-4.5-flash or gpt-4o"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description..."
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
                  Save Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
