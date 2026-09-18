import React from 'react';
import { HourlyPlanEntry, HourEntry } from '../types.js';

interface HourlyTableProps {
  hourlyPlan: HourlyPlanEntry[];
  hoursInput: HourEntry[];
}

export const HourlyTable: React.FC<HourlyTableProps> = ({ hourlyPlan, hoursInput }) => {
  if (!hourlyPlan || hourlyPlan.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">24-Hour Schedule Plan Table</h3>
          <p className="text-xs text-slate-500">Hourly dispatch values returned by POST /optimize-energy</p>
        </div>
        <span className="text-xs text-slate-500 font-mono">24 Hours (00:00 - 23:00)</span>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5">Hour</th>
              <th className="px-3 py-2.5">Demand (kWh)</th>
              <th className="px-3 py-2.5">Solar Used / Base (kWh)</th>
              <th className="px-3 py-2.5">Tariff (BDT)</th>
              <th className="px-3 py-2.5">Battery Action</th>
              <th className="px-3 py-2.5">Battery SOC (kWh)</th>
              <th className="px-3 py-2.5">Grid Import (kWh)</th>
              <th className="px-3 py-2.5 text-right">Cost (BDT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-mono">
            {hourlyPlan.map((plan, idx) => {
              const input = hoursInput[idx] || { demand_kwh: 0, solar_kwh: 0, tariff_bdt_per_kwh: 0 };
              const hourCost = Number((plan.grid_kwh * input.tariff_bdt_per_kwh).toFixed(2));

              return (
                <tr key={plan.hour} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2 font-bold text-slate-800">
                    {plan.hour.toString().padStart(2, '0')}:00
                  </td>
                  <td className="px-3 py-2 text-slate-700">{input.demand_kwh}</td>
                  <td className="px-3 py-2 text-amber-700">
                    <span className="font-bold">{plan.solar_used_kwh}</span>
                    <span className="text-slate-400 font-normal ml-1">/ {input.solar_kwh}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {input.tariff_bdt_per_kwh} <span className="text-2xs text-slate-400">BDT</span>
                  </td>
                  <td className="px-3 py-2">
                    {plan.battery_action === 'charge' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">
                        Charge {plan.battery_kwh} kWh
                      </span>
                    )}
                    {plan.battery_action === 'discharge' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-orange-100 text-orange-800">
                        Discharge {plan.battery_kwh} kWh
                      </span>
                    )}
                    {plan.battery_action === 'idle' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-500">
                        Idle (0 kWh)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-purple-700 font-semibold">
                    {plan.battery_energy_after_kwh}
                  </td>
                  <td className="px-3 py-2 text-blue-700 font-bold">
                    {plan.grid_kwh}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {hourCost.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
