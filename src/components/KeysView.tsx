import React, { useState } from 'react';
import { Key, Plus, Copy, Check, Shield, Trash2, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { ApiKey } from '../types/proxy';

interface KeysViewProps {
  apiKeys: ApiKey[];
  onCreateKey: (name: string, rateLimitRpm?: number, tokenLimit?: number) => void;
  onToggleKey: (id: string, enabled: boolean) => void;
  onDeleteKey: (id: string) => void;
}

export const KeysView: React.FC<KeysViewProps> = ({
  apiKeys,
  onCreateKey,
  onToggleKey,
  onDeleteKey,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [keyName, setKeyName] = useState('');
  const [rateLimitRpm, setRateLimitRpm] = useState('120');

  const copyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    onCreateKey(keyName, parseInt(rateLimitRpm, 10) || 120);
    setShowCreateModal(false);
    setKeyName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            Client Gateway API Key Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create custom API keys to authenticate external tools, SDKs, and chat clients.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New API Key</span>
        </button>
      </div>

      {/* Keys Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Key Name & String</th>
                <th className="py-3.5 px-4 font-semibold">Rate Limit</th>
                <th className="py-3.5 px-4 font-semibold">Requests Used</th>
                <th className="py-3.5 px-4 font-semibold">Total Tokens</th>
                <th className="py-3.5 px-4 font-semibold">Last Used</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {apiKeys.map((keyItem) => (
                <tr key={keyItem.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-sans font-bold text-white text-xs">{keyItem.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-indigo-300 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {keyItem.key}
                      </span>
                      <button
                        onClick={() => copyKey(keyItem.key, keyItem.id)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                        title="Copy Key String"
                      >
                        {copiedId === keyItem.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {keyItem.rateLimitRpm} RPM
                  </td>

                  <td className="py-3.5 px-4 text-slate-200 whitespace-nowrap font-bold">
                    {keyItem.usageCount.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-cyan-300 whitespace-nowrap">
                    {keyItem.totalTokens.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap font-sans">
                    {keyItem.lastUsedAt ? new Date(keyItem.lastUsedAt).toLocaleTimeString() : 'Never'}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => onToggleKey(keyItem.id, !keyItem.enabled)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                        keyItem.enabled ? 'bg-emerald-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          keyItem.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {apiKeys.length > 1 && (
                      <button
                        onClick={() => onDeleteKey(keyItem.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Header Usage Tip Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          HTTP Header Authentication Example
        </h3>
        <p className="text-xs text-slate-400">
          When sending requests to <code className="text-indigo-300 font-mono">/v1/chat/completions</code> or <code className="text-indigo-300 font-mono">/v1/messages</code>, supply your API key using standard Authorization headers:
        </p>

        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto">
          Authorization: Bearer sk-zai-xxxx
        </pre>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Generate Client Gateway API Key</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Key Label / Client Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. TypingMind Client, NextChat Agent"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Rate Limit (Requests / Min)</label>
                <input
                  type="number"
                  value={rateLimitRpm}
                  onChange={(e) => setRateLimitRpm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
