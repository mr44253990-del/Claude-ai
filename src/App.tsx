import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UrlBanner } from './components/UrlBanner';
import { DashboardView } from './components/DashboardView';
import { ChatPlayground } from './components/ChatPlayground';
import { LogsView } from './components/LogsView';
import { ModelsView } from './components/ModelsView';
import { ProvidersView } from './components/ProvidersView';
import { KeysView } from './components/KeysView';
import { ApiKey, GatewayStats, ModelConfig, Provider, RequestLog } from './types/proxy';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:3000');

  // Gateway data state
  const [stats, setStats] = useState<GatewayStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    estimatedCostTotalUsd: 0,
    uptimeSeconds: 0,
    byModel: {},
    byProvider: {},
    hourlyVolume: [],
  });

  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Set host base URL on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, logsRes, modelsRes, providersRes, keysRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()).catch(() => null),
        fetch('/api/logs').then((r) => r.json()).catch(() => []),
        fetch('/api/models').then((r) => r.json()).catch(() => []),
        fetch('/api/providers').then((r) => r.json()).catch(() => []),
        fetch('/api/keys').then((r) => r.json()).catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      if (Array.isArray(logsRes)) setLogs(logsRes);
      if (Array.isArray(modelsRes)) setModels(modelsRes);
      if (Array.isArray(providersRes)) setProviders(providersRes);
      if (Array.isArray(keysRes)) setApiKeys(keysRes);
    } catch (e) {
      console.error('Failed to load proxy state:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Auto refresh every 10s for live telemetry updates
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Model operations
  const handleToggleModel = async (modelId: string, enabled: boolean) => {
    try {
      await fetch(`/api/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddModel = async (newModel: Partial<ModelConfig>) => {
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  // Provider operations
  const handleAddProvider = async (newProvider: Partial<Provider>) => {
    try {
      await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProvider = async (id: string, updates: Partial<Provider>) => {
    try {
      await fetch(`/api/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  // API Key operations
  const handleCreateKey = async (name: string, rateLimitRpm?: number) => {
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rateLimitRpm }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleKey = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/reset-stats', { method: 'POST' });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const defaultKey = apiKeys[0]?.key || 'sk-zai-35eaac71317f4bac828e323ce46e5fe7';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        baseUrl={baseUrl}
        onRefreshStats={refreshData}
        isRefreshing={isRefreshing}
      />

      {/* Permanent Endpoint Info Banner */}
      <UrlBanner baseUrl={baseUrl} defaultKey={defaultKey} />

      {/* Main Container View Router */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView stats={stats} logs={logs} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'chat' && (
          <ChatPlayground
            models={models}
            apiKeys={apiKeys}
            baseUrl={baseUrl}
            onRefreshLogs={refreshData}
          />
        )}

        {activeTab === 'logs' && (
          <LogsView
            logs={logs}
            onRefreshLogs={refreshData}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'models' && (
          <ModelsView
            models={models}
            providers={providers}
            baseUrl={baseUrl}
            defaultKey={defaultKey}
            onToggleModel={handleToggleModel}
            onAddModel={handleAddModel}
          />
        )}

        {activeTab === 'providers' && (
          <ProvidersView
            providers={providers}
            onAddProvider={handleAddProvider}
            onUpdateProvider={handleUpdateProvider}
            onDeleteProvider={handleDeleteProvider}
          />
        )}

        {activeTab === 'keys' && (
          <KeysView
            apiKeys={apiKeys}
            onCreateKey={handleCreateKey}
            onToggleKey={handleToggleKey}
            onDeleteKey={handleDeleteKey}
          />
        )}
      </main>
    </div>
  );
}
