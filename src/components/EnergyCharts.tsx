import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { HourlyPlanEntry, HourEntry, BatteryConfig } from '../types.js';
import { Sun, Battery, BarChart3 } from 'lucide-react';

interface EnergyChartsProps {
  hourlyPlan: HourlyPlanEntry[];
  hoursInput: HourEntry[];
  batteryConfig: BatteryConfig;
}

export const EnergyCharts: React.FC<EnergyChartsProps> = ({ hourlyPlan, hoursInput, batteryConfig }) => {
  const [activeTab, setActiveTab] = useState<'balance' | 'battery' | 'actions'>('balance');

  if (!hourlyPlan || hourlyPlan.length === 0) return null;

  // Merge data for chart rendering
  const chartData = hourlyPlan.map((plan, idx) => {
    const input = hoursInput[idx] || { demand_kwh: 0, solar_kwh: 0, tariff_bdt_per_kwh: 0 };
    return {
      hourLabel: `${plan.hour.toString().padStart(2, '0')}:00`,
      hour: plan.hour,
      demand_kwh: input.demand_kwh,
      solar_available_kwh: input.solar_kwh,
      solar_used_kwh: plan.solar_used_kwh,
      grid_kwh: plan.grid_kwh,
      tariff: input.tariff_bdt_per_kwh,
      battery_energy_kwh: plan.battery_energy_after_kwh,
      charge_kwh: plan.battery_action === 'charge' ? plan.battery_kwh : 0,
      discharge_kwh: plan.battery_action === 'discharge' ? plan.battery_kwh : 0,
      action: plan.battery_action,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">24-Hour Dispatch & Storage Visualizer</h3>
          <p className="text-xs text-slate-500">Real-time hourly power balance and battery dynamics</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'balance'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Energy Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('battery')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'battery'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Battery className="w-3.5 h-3.5 text-purple-500" />
            <span>Battery State (SOC)</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'actions'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Charge / Discharge</span>
          </button>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        {activeTab === 'balance' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hourLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" kWh" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`${val} kWh`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {/* Solar Available (dashed line) */}
              <Line
                type="monotone"
                dataKey="solar_available_kwh"
                name="Solar Available"
                stroke="#fbbf24"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
              {/* Solar Used (amber area) */}
              <Area
                type="monotone"
                dataKey="solar_used_kwh"
                name="Solar Used"
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth={2}
              />
              {/* Grid Import (blue line) */}
              <Line
                type="monotone"
                dataKey="grid_kwh"
                name="Grid Import"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
              {/* Campus Demand (slate line) */}
              <Line
                type="monotone"
                dataKey="demand_kwh"
                name="Campus Demand"
                stroke="#334155"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'battery' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hourLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                domain={[0, Math.ceil(batteryConfig.capacity_kwh * 1.1)]}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                unit=" kWh"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`${val} kWh`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine
                y={batteryConfig.capacity_kwh}
                label={{ value: `Max Capacity (${batteryConfig.capacity_kwh} kWh)`, fill: '#94a3b8', fontSize: 10 }}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
              />
              <ReferenceLine
                y={batteryConfig.initial_energy_kwh}
                label={{ value: `Neutral Base (${batteryConfig.initial_energy_kwh} kWh)`, fill: '#8b5cf6', fontSize: 10 }}
                stroke="#a855f7"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="battery_energy_kwh"
                name="Battery Storage (kWh)"
                fill="#f3e8ff"
                stroke="#9333ea"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'actions' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hourLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" kWh" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`${val} kWh`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="charge_kwh" name="Charge (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="discharge_kwh" name="Discharge (kWh)" fill="#f97316" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
