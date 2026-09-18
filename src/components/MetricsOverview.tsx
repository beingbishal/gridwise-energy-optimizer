import React from 'react';
import { DollarSign, Zap, ArrowUpRight, BatteryCharging, FileText } from 'lucide-react';
import { OptimizeEnergyResponse } from '../types.js';

interface MetricsOverviewProps {
  response: OptimizeEnergyResponse | null;
  initialBatteryKwh: number;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ response, initialBatteryKwh }) => {
  if (!response) return null;

  const finalBattery = response.hourly_plan[23]?.battery_energy_after_kwh ?? initialBatteryKwh;
  const isNeutral = Math.abs(finalBattery - initialBatteryKwh) < 0.05;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Grid Cost</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {response.total_cost_bdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-slate-500 ml-1.5">BDT</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">24-hour optimal electricity expense</p>
          </div>
        </div>

        {/* Total Grid Import */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Grid Import</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {response.total_grid_kwh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-slate-500 ml-1.5">kWh</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Total electricity purchased from utility</p>
          </div>
        </div>

        {/* Peak Grid Import */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Grid Demand</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {response.peak_grid_kwh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-slate-500 ml-1.5">kWh</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Maximum single-hour peak import</p>
          </div>
        </div>

        {/* Battery Neutrality Check */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Battery Neutrality</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {finalBattery}
                <span className="text-sm font-normal text-slate-500 ml-1">kWh</span>
              </div>
              {isNeutral ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800">
                  Neutral
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-rose-100 text-rose-800">
                  Mismatch
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Start: {initialBatteryKwh} kWh → End: {finalBattery} kWh
            </p>
          </div>
        </div>
      </div>

      {/* Plan Summary Banner */}
      {response.plan_summary && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-start space-x-3.5 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Optimization Plan Summary</div>
            <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">
              {response.plan_summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
