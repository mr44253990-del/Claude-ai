import React from 'react';
import { Activity, Zap, Clock, DollarSign, Cpu, CheckCircle2, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';
import { GatewayStats, RequestLog } from '../types/proxy';

interface DashboardViewProps {
  stats: GatewayStats;
  logs: RequestLog[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, logs, onNavigateTab }) => {
  const successRate =
    stats.totalRequests > 0
      ? Math.round((stats.successfulRequests / stats.totalRequests) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Requests</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {stats.totalRequests.toLocaleString()}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${successRate >= 95 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'}`}>
              {successRate}% Success
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{stats.successfulRequests} passed</span>
            {stats.failedRequests > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-400">{stats.failedRequests} failed</span>
              </>
            )}
          </p>
        </div>

        {/* Card 2: Total Tokens */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Tokens</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {stats.totalTokens.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">tokens</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Prompt: {stats.totalPromptTokens.toLocaleString()} · Output: {stats.totalCompletionTokens.toLocaleString()}
          </p>
        </div>

        {/* Card 3: Avg Latency */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {stats.avgLatencyMs}
            </span>
            <span className="text-xs text-slate-400">ms / request</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Streaming SSE pipeline active
          </p>
        </div>

        {/* Card 4: Estimated Spend */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Est. Spend (USD)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              ${stats.estimatedCostTotalUsd.toFixed(5)}
            </span>
            <span className="text-xs text-emerald-400 font-medium">ZAI GLM Tier</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Calculated per 1K token model rates
          </p>
        </div>
      </div>

      {/* Hourly Traffic Chart & Model Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Volume Bar Visualizer */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  24-Hour Request Traffic Volume
                </h3>
                <p className="text-xs text-slate-400">Real-time incoming request load over time</p>
              </div>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                Live Telemetry
              </span>
            </div>

            {/* Bar Chart Container */}
            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-800">
              {stats.hourlyVolume.map((item, idx) => {
                const maxReqs = Math.max(...stats.hourlyVolume.map((h) => h.requests), 1);
                const heightPercent = Math.max(Math.round((item.requests / maxReqs) * 100), 8);
                const hasRequests = item.requests > 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 text-[10px] text-slate-200 px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none z-20">
                      <span className="font-bold">{item.hour}</span>: {item.requests} reqs ({item.tokens} tokens)
                    </div>

                    <div className="w-full bg-slate-800/60 rounded-t h-full flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all duration-300 ${
                          hasRequests
                            ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:from-indigo-500 group-hover:to-cyan-300 shadow-sm shadow-indigo-500/30'
                            : 'bg-slate-800/40'
                        }`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                      {idx % 4 === 0 ? item.hour.split(':')[0] : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
            <span>Peak load auto-scaled</span>
            <span className="font-mono text-indigo-300">Total Requests Processed: {stats.totalRequests}</span>
          </div>
        </div>

        {/* Model & Provider Usage Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Model Usage Distribution
          </h3>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {Object.keys(stats.byModel).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No request data logged yet.</p>
            ) : (
              Object.entries(stats.byModel).map(([modelId, data]) => {
                const percent = Math.round((data.requests / stats.totalRequests) * 100) || 0;
                return (
                  <div key={modelId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-200 truncate">{modelId}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {data.requests} reqs ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Active Upstream Providers
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                <span className="block font-bold text-white">ZAI GLM-4.5</span>
                <span className="text-[10px] text-emerald-400">Connected & Active</span>
              </div>
              <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                <span className="block font-bold text-white">OpenCode Free</span>
                <span className="text-[10px] text-emerald-400">Configured</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Request Stream Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Recent Gateway Requests
            </h3>
            <p className="text-xs text-slate-400">Live stream of incoming client API calls</p>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Endpoint</th>
                <th className="pb-3 font-semibold">Model</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Latency</th>
                <th className="pb-3 font-semibold">Tokens</th>
                <th className="pb-3 font-semibold">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic font-sans">
                    No request logs available. Send a request from the Chat Sandbox to populate!
                  </td>
                </tr>
              ) : (
                logs.slice(0, 5).map((log) => {
                  const isSuccess = log.status >= 200 && log.status < 300;
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 text-indigo-300 font-semibold whitespace-nowrap">
                        {log.endpoint}
                      </td>
                      <td className="py-2.5 text-slate-200 font-bold whitespace-nowrap">
                        {log.modelId}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300 whitespace-nowrap">
                        {log.latencyMs} ms
                      </td>
                      <td className="py-2.5 text-cyan-300 whitespace-nowrap">
                        {log.totalTokens} tks
                      </td>
                      <td className="py-2.5 text-slate-400 truncate max-w-xs font-sans">
                        {log.responsePreview || log.errorDetails || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
