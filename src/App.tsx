import React, { useState, useEffect } from 'react';
import { ApiHeader } from './components/ApiHeader.js';
import { ApiDocsModal } from './components/ApiDocsModal.js';
import { ApiConsole } from './components/ApiConsole.js';
import { MetricsOverview } from './components/MetricsOverview.js';
import { DirectivesCard } from './components/DirectivesCard.js';
import { EnergyCharts } from './components/EnergyCharts.js';
import { HourlyTable } from './components/HourlyTable.js';
import { ScenarioEditor } from './components/ScenarioEditor.js';
import { RawJsonViewer } from './components/RawJsonViewer.js';
import { OptimizeEnergyRequest, OptimizeEnergyResponse } from './types.js';
import { AlertTriangle, Server, Terminal, Sparkles, LayoutDashboard } from 'lucide-react';

const CANONICAL_SAMPLE: OptimizeEnergyRequest = {
  scenario_id: 'GRID-101',
  operator_notes: [
    'Solar output will drop to about 20% from 1 PM to 3 PM.',
    'Do not charge the battery between 2 PM and 4 PM.',
    'The cafeteria menu changes tomorrow.',
  ],
  hours: [
    { hour: 0, demand_kwh: 180, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
    { hour: 1, demand_kwh: 170, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
    { hour: 2, demand_kwh: 160, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
    { hour: 3, demand_kwh: 150, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
    { hour: 4, demand_kwh: 150, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
    { hour: 5, demand_kwh: 160, solar_kwh: 0, tariff_bdt_per_kwh: 6 },
    { hour: 6, demand_kwh: 190, solar_kwh: 10, tariff_bdt_per_kwh: 7 },
    { hour: 7, demand_kwh: 220, solar_kwh: 40, tariff_bdt_per_kwh: 8 },
    { hour: 8, demand_kwh: 260, solar_kwh: 90, tariff_bdt_per_kwh: 9 },
    { hour: 9, demand_kwh: 300, solar_kwh: 150, tariff_bdt_per_kwh: 10 },
    { hour: 10, demand_kwh: 320, solar_kwh: 200, tariff_bdt_per_kwh: 11 },
    { hour: 11, demand_kwh: 340, solar_kwh: 240, tariff_bdt_per_kwh: 11 },
    { hour: 12, demand_kwh: 350, solar_kwh: 260, tariff_bdt_per_kwh: 11 },
    { hour: 13, demand_kwh: 340, solar_kwh: 250, tariff_bdt_per_kwh: 10 },
    { hour: 14, demand_kwh: 320, solar_kwh: 220, tariff_bdt_per_kwh: 10 },
    { hour: 15, demand_kwh: 300, solar_kwh: 170, tariff_bdt_per_kwh: 10 },
    { hour: 16, demand_kwh: 280, solar_kwh: 110, tariff_bdt_per_kwh: 9 },
    { hour: 17, demand_kwh: 270, solar_kwh: 50, tariff_bdt_per_kwh: 9 },
    { hour: 18, demand_kwh: 290, solar_kwh: 10, tariff_bdt_per_kwh: 12 },
    { hour: 19, demand_kwh: 310, solar_kwh: 0, tariff_bdt_per_kwh: 12 },
    { hour: 20, demand_kwh: 300, solar_kwh: 0, tariff_bdt_per_kwh: 11 },
    { hour: 21, demand_kwh: 260, solar_kwh: 0, tariff_bdt_per_kwh: 10 },
    { hour: 22, demand_kwh: 220, solar_kwh: 0, tariff_bdt_per_kwh: 8 },
    { hour: 23, demand_kwh: 200, solar_kwh: 0, tariff_bdt_per_kwh: 7 },
  ],
  battery: {
    capacity_kwh: 500,
    initial_energy_kwh: 200,
    minimum_energy_kwh: 50,
    max_charge_kwh_per_hour: 100,
    max_discharge_kwh_per_hour: 100,
  },
};

export default function App() {
  const [request, setRequest] = useState<OptimizeEnergyRequest>(CANONICAL_SAMPLE);
  const [response, setResponse] = useState<OptimizeEnergyResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'console' | 'split'>('dashboard');
  const [consoleEndpoint, setConsoleEndpoint] = useState<'optimize' | 'health'>('optimize');

  // Ping health endpoint
  const checkHealth = async () => {
    try {
      const start = performance.now();
      const res = await fetch('/health');
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setHealthStatus('ok');
        setLatencyMs(elapsed);
      } else {
        setHealthStatus('error');
      }
    } catch {
      setHealthStatus('error');
    }
  };

  // Run optimization API call
  const handleRunOptimization = async (reqToRun = request) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/optimize-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqToRun),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Optimization failed`);
      }

      setResponse(data as OptimizeEnergyResponse);
    } catch (err: any) {
      console.error('Optimization error:', err);
      setError(err.message || 'An unexpected error occurred during optimization.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Run initial optimization on load to show immediate results
    handleRunOptimization(CANONICAL_SAMPLE);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header with live API Health, View Mode Switcher, and Docs Trigger */}
      <ApiHeader
        healthStatus={healthStatus}
        latencyMs={latencyMs}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenDocs={() => setIsDocsOpen(true)}
        onRecheckHealth={checkHealth}
      />

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">API Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* View 1: Console View (Focused Interactive REST Tester) */}
        {activeView === 'console' && (
          <div className="space-y-6">
            <ApiConsole
              currentRequest={request}
              onApplyRequest={setRequest}
              onExecute={handleRunOptimization}
              response={response}
              isLoading={isLoading}
              activeEndpoint={consoleEndpoint}
              onSelectEndpoint={setConsoleEndpoint}
              latencyMs={latencyMs}
            />

            {/* Top-level Metrics Overview for convenience */}
            <MetricsOverview
              response={response}
              initialBatteryKwh={request.battery.initial_energy_kwh}
            />

            {/* Directives breakdown */}
            {response && (
              <DirectivesCard
                directives={response.directive_interpretation}
                operatorNotes={request.operator_notes}
              />
            )}
          </div>
        )}

        {/* View 2: Split / Dual View (Both Interactive Console and Visual Dashboard) */}
        {activeView === 'split' && (
          <div className="space-y-6">
            <ApiConsole
              currentRequest={request}
              onApplyRequest={setRequest}
              onExecute={handleRunOptimization}
              response={response}
              isLoading={isLoading}
              activeEndpoint={consoleEndpoint}
              onSelectEndpoint={setConsoleEndpoint}
              latencyMs={latencyMs}
            />

            <ScenarioEditor
              request={request}
              onChange={setRequest}
              onRunOptimization={() => handleRunOptimization(request)}
              onResetSample={() => {
                setRequest(CANONICAL_SAMPLE);
                handleRunOptimization(CANONICAL_SAMPLE);
              }}
              isLoading={isLoading}
            />

            <MetricsOverview
              response={response}
              initialBatteryKwh={request.battery.initial_energy_kwh}
            />

            {response && (
              <DirectivesCard
                directives={response.directive_interpretation}
                operatorNotes={request.operator_notes}
              />
            )}

            {response && (
              <EnergyCharts
                hourlyPlan={response.hourly_plan}
                hoursInput={request.hours}
                batteryConfig={request.battery}
              />
            )}

            {response && (
              <HourlyTable
                hourlyPlan={response.hourly_plan}
                hoursInput={request.hours}
              />
            )}
          </div>
        )}

        {/* View 3: Dashboard View (Visual Scenario Editor, Charts, Schedule & Quick API Audit) */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Scenario and Directives Configuration */}
            <ScenarioEditor
              request={request}
              onChange={setRequest}
              onRunOptimization={() => handleRunOptimization(request)}
              onResetSample={() => {
                setRequest(CANONICAL_SAMPLE);
                handleRunOptimization(CANONICAL_SAMPLE);
              }}
              isLoading={isLoading}
            />

            {/* Top-level Metrics Overview (Cost, Grid Import, Peak Demand, Neutrality) */}
            <MetricsOverview
              response={response}
              initialBatteryKwh={request.battery.initial_energy_kwh}
            />

            {/* LLM Directives Interpretation Breakdown */}
            {response && (
              <DirectivesCard
                directives={response.directive_interpretation}
                operatorNotes={request.operator_notes}
              />
            )}

            {/* 24-Hour Energy Balance & Battery Dynamic Visualizer */}
            {response && (
              <EnergyCharts
                hourlyPlan={response.hourly_plan}
                hoursInput={request.hours}
                batteryConfig={request.battery}
              />
            )}

            {/* 24-Hour Schedule Breakdown Table */}
            {response && (
              <HourlyTable
                hourlyPlan={response.hourly_plan}
                hoursInput={request.hours}
              />
            )}

            {/* Raw JSON Inspector for Judge Validation */}
            <RawJsonViewer request={request} response={response} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Server Port: 3000 | Production Bundled Node/Express</span>
          </div>
          <div>BUP CSE Fest Hackathon 2026 — Smart Campus Energy Optimization Challenge</div>
        </div>
      </footer>

      {/* API Documentation / Specifications Modal */}
      <ApiDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </div>
  );
}
