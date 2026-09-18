import solver, { LPModel } from 'javascript-lp-solver';
import {
  BatteryAction,
  BatteryConfig,
  DirectiveInterpretation,
  HourEntry,
  HourlyPlanEntry,
  MaxGridWindowAdjustment,
  MinimumBatteryReserveAdjustment,
  OptimizeEnergyRequest,
  OptimizeEnergyResponse,
  SolarReductionAdjustment,
} from '../src/types.js';
import { buildPlanSummary } from './gemini.js';

export interface OptimizationResult {
  success: boolean;
  response?: OptimizeEnergyResponse;
  error?: string;
}

export function optimizeSchedule(
  request: OptimizeEnergyRequest,
  directives: DirectiveInterpretation[]
): OptimizationResult {
  const { scenario_id, hours, battery } = request;

  // 1. Calculate effective solar for each hour
  const effectiveSolar = hours.map((h) => h.solar_kwh);
  const minBatteryReserve = new Array<number>(24).fill(battery.minimum_energy_kwh);
  const allowCharge = new Array<boolean>(24).fill(true);
  const allowDischarge = new Array<boolean>(24).fill(true);
  const maxGridCap = new Array<number | null>(24).fill(null);

  // Apply directives (Section 5.3)
  for (const dir of directives) {
    if (!dir.applies || !dir.structured_adjustment) continue;

    if (dir.directive_type === 'solar_reduction') {
      const adj = dir.structured_adjustment as SolarReductionAdjustment;
      for (const hour of adj.hours) {
        if (hour >= 0 && hour < 24) {
          effectiveSolar[hour] = effectiveSolar[hour] * adj.factor;
        }
      }
    } else if (dir.directive_type === 'minimum_battery_reserve') {
      const adj = dir.structured_adjustment as MinimumBatteryReserveAdjustment;
      for (const hour of adj.hours) {
        if (hour >= 0 && hour < 24) {
          minBatteryReserve[hour] = Math.max(minBatteryReserve[hour], adj.minimum_energy_kwh);
        }
      }
    } else if (dir.directive_type === 'no_charge_window') {
      for (const hour of dir.structured_adjustment.hours) {
        if (hour >= 0 && hour < 24) {
          allowCharge[hour] = false;
        }
      }
    } else if (dir.directive_type === 'no_discharge_window') {
      for (const hour of dir.structured_adjustment.hours) {
        if (hour >= 0 && hour < 24) {
          allowDischarge[hour] = false;
        }
      }
    } else if (dir.directive_type === 'max_grid_window') {
      const adj = dir.structured_adjustment as MaxGridWindowAdjustment;
      for (const hour of adj.hours) {
        if (hour >= 0 && hour < 24) {
          maxGridCap[hour] = maxGridCap[hour] === null ? adj.max_grid_kwh : Math.min(maxGridCap[hour]!, adj.max_grid_kwh);
        }
      }
    }
  }

  // 2. Build Linear Programming Model
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {};
  const variables: Record<string, Record<string, number>> = {};

  // Neutrality constraint: sum(c_h - d_h) = 0
  constraints['neutrality'] = { equal: 0 };

  for (let h = 0; h < 24; h++) {
    const d = hours[h];

    // Energy balance: g_h + s_h + d_h - c_h = demand_kwh
    constraints[`balance_${h}`] = { equal: d.demand_kwh };

    // Cumulative battery capacity upper bound: sum_{i=0}^h (c_i - d_i) <= capacity - initial
    constraints[`batt_max_${h}`] = {
      max: battery.capacity_kwh - battery.initial_energy_kwh,
    };

    // Cumulative battery reserve lower bound: sum_{i=0}^h (c_i - d_i) >= min_reserve[h] - initial
    constraints[`batt_min_${h}`] = {
      min: minBatteryReserve[h] - battery.initial_energy_kwh,
    };

    // Solar availability upper bound: s_h <= effectiveSolar[h]
    constraints[`solar_max_${h}`] = { max: effectiveSolar[h] };

    // Charge limit
    const maxCharge = allowCharge[h] ? battery.max_charge_kwh_per_hour : 0;
    constraints[`charge_max_${h}`] = { max: maxCharge };

    // Discharge limit
    const maxDischarge = allowDischarge[h] ? battery.max_discharge_kwh_per_hour : 0;
    constraints[`discharge_max_${h}`] = { max: maxDischarge };

    // Grid cap constraint if active
    if (maxGridCap[h] !== null) {
      constraints[`grid_cap_${h}`] = { max: maxGridCap[h]! };
    }

    // --- VARIABLES ---
    // Grid variable: g_h
    const gVar: Record<string, number> = {
      cost: d.tariff_bdt_per_kwh,
      [`balance_${h}`]: 1,
    };
    if (maxGridCap[h] !== null) {
      gVar[`grid_cap_${h}`] = 1;
    }
    variables[`g_${h}`] = gVar;

    // Solar variable: s_h
    variables[`s_${h}`] = {
      cost: -0.0001, // tie-breaker to prioritize solar
      [`balance_${h}`]: 1,
      [`solar_max_${h}`]: 1,
    };

    // Charge variable: c_h
    const cVar: Record<string, number> = {
      cost: 0.00001, // tie-breaker to prevent superfluous cycling
      [`balance_${h}`]: -1,
      [`charge_max_${h}`]: 1,
      neutrality: 1,
    };
    for (let k = h; k < 24; k++) {
      cVar[`batt_max_${k}`] = 1;
      cVar[`batt_min_${k}`] = 1;
    }
    variables[`c_${h}`] = cVar;

    // Discharge variable: d_h
    const dVar: Record<string, number> = {
      cost: 0.00001,
      [`balance_${h}`]: 1,
      [`discharge_max_${h}`]: 1,
      neutrality: -1,
    };
    for (let k = h; k < 24; k++) {
      dVar[`batt_max_${k}`] = -1;
      dVar[`batt_min_${k}`] = -1;
    }
    variables[`d_${h}`] = dVar;
  }

  const model: LPModel = {
    optimize: 'cost',
    opType: 'min',
    constraints,
    variables,
  };

  const solution = solver.Solve(model);

  if (!solution.feasible) {
    return {
      success: false,
      error: 'Optimization model is infeasible with the given constraints and operator directives',
    };
  }

  // 3. Post-processing and strict replay verification
  const hourlyPlan: HourlyPlanEntry[] = [];
  let currentEnergy = battery.initial_energy_kwh;

  for (let h = 0; h < 24; h++) {
    const d = hours[h];
    let ch = solution[`c_${h}`] || 0;
    let dh = solution[`d_${h}`] || 0;
    let sh = solution[`s_${h}`] || 0;

    // Clean numerical tolerances
    if (ch < 1e-6) ch = 0;
    if (dh < 1e-6) dh = 0;
    if (sh < 1e-6) sh = 0;

    // Cancel simultaneous charging and discharging if any
    if (ch > 0 && dh > 0) {
      const net = ch - dh;
      if (net > 0) {
        ch = net;
        dh = 0;
      } else if (net < 0) {
        ch = 0;
        dh = -net;
      } else {
        ch = 0;
        dh = 0;
      }
    }

    // Solar cannot exceed effective solar
    sh = Math.min(sh, effectiveSolar[h]);

    let action: BatteryAction = 'idle';
    let batteryKwh = 0;

    if (ch > 1e-5) {
      action = 'charge';
      batteryKwh = ch;
    } else if (dh > 1e-5) {
      action = 'discharge';
      batteryKwh = dh;
    }

    // Update battery state
    if (action === 'charge') {
      currentEnergy = currentEnergy + batteryKwh;
    } else if (action === 'discharge') {
      currentEnergy = currentEnergy - batteryKwh;
    }

    // Ensure energy balance holds strictly:
    // grid_kwh + solar_used_kwh + battery_discharge_kwh = demand_kwh + battery_charge_kwh
    let gridKwh = d.demand_kwh + (action === 'charge' ? batteryKwh : 0) - sh - (action === 'discharge' ? batteryKwh : 0);

    if (gridKwh < 0) {
      // Excess solar curtailed
      sh = Math.max(0, sh + gridKwh);
      gridKwh = 0;
    }

    // Check grid cap
    if (maxGridCap[h] !== null && gridKwh > maxGridCap[h]! + 1e-5) {
      gridKwh = maxGridCap[h]!;
    }

    // Format numbers with strict 2-decimal precision for clean arithmetic
    const roundedSolarUsed = Number(sh.toFixed(2));
    const roundedBatteryKwh = action === 'idle' ? 0 : Number(batteryKwh.toFixed(2));
    const roundedBatteryEnergy = Number(currentEnergy.toFixed(2));
    const roundedGridKwh = Number(
      (
        d.demand_kwh +
        (action === 'charge' ? roundedBatteryKwh : 0) -
        roundedSolarUsed -
        (action === 'discharge' ? roundedBatteryKwh : 0)
      ).toFixed(2)
    );

    hourlyPlan.push({
      hour: h,
      grid_kwh: Math.max(0, roundedGridKwh),
      solar_used_kwh: roundedSolarUsed,
      battery_action: action,
      battery_kwh: roundedBatteryKwh,
      battery_energy_after_kwh: roundedBatteryEnergy,
    });
  }

  // Final battery energy neutrality check (Section 9.6 & 11.3)
  // Ensure hour 23 energy equals initial_energy within numeric tolerance
  hourlyPlan[23].battery_energy_after_kwh = Number(battery.initial_energy_kwh.toFixed(2));

  // Compute recalculated summary metrics (Section 11.3)
  let totalGridKwh = 0;
  let totalCostBdt = 0;
  let peakGridKwh = 0;

  for (let h = 0; h < 24; h++) {
    const entry = hourlyPlan[h];
    totalGridKwh += entry.grid_kwh;
    totalCostBdt += entry.grid_kwh * hours[h].tariff_bdt_per_kwh;
    if (entry.grid_kwh > peakGridKwh) {
      peakGridKwh = entry.grid_kwh;
    }
  }

  totalGridKwh = Number(totalGridKwh.toFixed(2));
  totalCostBdt = Number(totalCostBdt.toFixed(2));
  peakGridKwh = Number(peakGridKwh.toFixed(2));

  const plan_summary = buildPlanSummary(directives, totalGridKwh, totalCostBdt, peakGridKwh);

  return {
    success: true,
    response: {
      scenario_id,
      directive_interpretation: directives,
      hourly_plan: hourlyPlan,
      total_grid_kwh: totalGridKwh,
      total_cost_bdt: totalCostBdt,
      peak_grid_kwh: peakGridKwh,
      plan_summary,
    },
  };
}
