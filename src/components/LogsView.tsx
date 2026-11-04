import React, { useState } from 'react';
import { Search, Filter, RefreshCw, X, ChevronRight, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { RequestLog } from '../types/proxy';

interface LogsViewProps {
  logs: RequestLog[];
  onRefreshLogs: () => void;
  onClearLogs?: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  logs,
  onRefreshLogs,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);

  // Extract unique models from logs
  const uniqueModels = Array.from(new Set(logs.map((l) => l.modelId)));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.modelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.clientKeyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.responsePreview.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.requestMessages).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'success' && log.status >= 200 && log.status < 300) ||
      (statusFilter === 'error' && log.status >= 400);

    const matchesModel = modelFilter === 'all' || log.modelId === modelFilter;

    return matchesSearch && matchesStatus && matchesModel;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by prompt, response, model, or key name..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent focus:outline-none text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="success">200 OK Only</option>
              <option value="error">Errors (4xx/5xx)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-semibold"
            >
              <option value="all">All Models</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefreshLogs}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Refresh</span>
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Time</th>
                <th className="py-3 px-4 font-semibold">Client Key</th>
                <th className="py-3 px-4 font-semibold">Endpoint</th>
                <th className="py-3 px-4 font-semibold">Model</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Latency</th>
                <th className="py-3 px-4 font-semibold">Tokens</th>
                <th className="py-3 px-4 font-semibold">Preview</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic font-sans">
                    No matching logs found. Send a request to see telemetry data!
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status >= 200 && log.status < 300;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <span className="font-semibold text-white">{log.clientKeyName}</span>
                        <span className="text-[10px] text-slate-500 block">...{log.clientKeySnippet}</span>
                      </td>
                      <td className="py-3 px-4 text-indigo-300 font-bold whitespace-nowrap">
                        {log.endpoint}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-bold whitespace-nowrap">
                        {log.modelId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {log.latencyMs} ms
                      </td>
                      <td className="py-3 px-4 text-cyan-300 whitespace-nowrap">
                        {log.totalTokens} tks
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs font-sans">
                        {log.responsePreview || log.errorDetails || '—'}
                      </td>
                      <td className="py-3 px-4 text-indigo-400">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Log Telemetry Inspector</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      selectedLog.status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedLog.id} · {selectedLog.timestamp}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Model:</span>
                <span className="font-bold text-indigo-300 font-mono">{selectedLog.modelId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Provider:</span>
                <span className="font-bold text-white">{selectedLog.providerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Latency:</span>
                <span className="font-bold text-amber-400 font-mono">{selectedLog.latencyMs} ms</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Tokens:</span>
                <span className="font-bold text-cyan-400 font-mono">{selectedLog.totalTokens}</span>
              </div>
            </div>

            {/* Prompt Messages */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200">Incoming Messages Payload</span>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.requestMessages, null, 2)}
              </pre>
            </div>

            {/* Response Preview or Error */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200">
                {selectedLog.status >= 400 ? 'Error Details' : 'Gateway Response Preview'}
              </span>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-60">
                {selectedLog.errorDetails || selectedLog.responsePreview || 'No response details recorded.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
