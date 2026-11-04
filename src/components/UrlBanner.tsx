import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface UrlBannerProps {
  baseUrl: string;
  defaultKey: string;
}

export const UrlBanner: React.FC<UrlBannerProps> = ({ baseUrl, defaultKey }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const urls = [
    {
      label: 'OpenAI Base URL',
      url: `${baseUrl}/v1`,
      id: 'openai_base',
      hint: 'Use in TypingMind, SillyTavern, NextChat, OpenAI Python SDK base_url',
    },
    {
      label: 'Chat Completions URL',
      url: `${baseUrl}/v1/chat/completions`,
      id: 'chat_comp',
      hint: 'Post standard OpenAI messages payload here (ZAI / GLM routed automatically)',
    },
    {
      label: 'Anthropic Messages URL',
      url: `${baseUrl}/v1/messages`,
      id: 'anthropic_msg',
      hint: 'Supports Anthropic Claude format and x-api-key header',
    },
    {
      label: 'Models Endpoint',
      url: `${baseUrl}/v1/models`,
      id: 'models_list',
      hint: 'Returns active available models list in OpenAI format',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-indigo-500/20 px-4 py-3 text-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Permanent API Gateway Endpoints</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 font-mono rounded border border-indigo-500/30">
                  Ready to Use
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Plug these endpoints into any OpenAI or Anthropic compatible tool using your API key.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Master Key Box */}
            <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px]">Key:</span>
              <span className="font-mono text-indigo-300 text-[11px]">
                {defaultKey ? `${defaultKey.slice(0, 10)}...${defaultKey.slice(-4)}` : 'sk-zai-...'}
              </span>
              <button
                onClick={() => copyToClipboard(defaultKey, 'master_key')}
                className="text-slate-400 hover:text-white p-0.5 rounded"
                title="Copy Key"
              >
                {copiedField === 'master_key' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
            >
              <span>{expanded ? 'Hide Endpoint Details' : 'View All Endpoints & cURL'}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {urls.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/90 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-3 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                    <button
                      onClick={() => copyToClipboard(item.url, item.id)}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {copiedField === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-indigo-300 truncate mb-1.5 select-all">
                    {item.url}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{item.hint}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
