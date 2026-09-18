import {
  BatteryConfig,
  DirectiveInterpretation,
  DirectiveType,
  OptimizeEnergyRequest,
  StructuredAdjustment,
} from '../src/types.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateOptimizeRequest(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  if (typeof body.scenario_id !== 'string' || body.scenario_id.trim().length === 0) {
    return { valid: false, error: 'scenario_id must be a non-empty string' };
  }

  if (!Array.isArray(body.operator_notes) || body.operator_notes.length < 1 || body.operator_notes.length > 3) {
    return { valid: false, error: 'operator_notes must be an array of 1 to 3 strings' };
  }

  for (let i = 0; i < body.operator_notes.length; i++) {
    if (typeof body.operator_notes[i] !== 'string' || body.operator_notes[i].trim().length === 0) {
      return { valid: false, error: `operator_notes[${i}] must be a non-empty string` };
    }
  }

  if (!Array.isArray(body.hours) || body.hours.length !== 24) {
    return { valid: false, error: 'hours must be an array of exactly 24 hour objects' };
  }

  const seenHours = new Set<number>();
  for (let i = 0; i < 24; i++) {
    const h = body.hours[i];
    if (!h || typeof h !== 'object') {
      return { valid: false, error: `hours[${i}] must be an object` };
    }
    if (!Number.isInteger(h.hour) || h.hour < 0 || h.hour > 23) {
      return { valid: false, error: `hours[${i}].hour must be an integer from 0 to 23` };
    }
    if (seenHours.has(h.hour)) {
      return { valid: false, error: `Duplicate hour entry: ${h.hour}` };
    }
    seenHours.add(h.hour);

    if (typeof h.demand_kwh !== 'number' || !Number.isFinite(h.demand_kwh) || h.demand_kwh < 0) {
      return { valid: false, error: `hours[${i}].demand_kwh must be a non-negative finite number` };
    }
    if (typeof h.solar_kwh !== 'number' || !Number.isFinite(h.solar_kwh) || h.solar_kwh < 0) {
      return { valid: false, error: `hours[${i}].solar_kwh must be a non-negative finite number` };
    }
    if (typeof h.tariff_bdt_per_kwh !== 'number' || !Number.isFinite(h.tariff_bdt_per_kwh) || h.tariff_bdt_per_kwh < 0) {
      return { valid: false, error: `hours[${i}].tariff_bdt_per_kwh must be a non-negative finite number` };
    }
  }

  if (seenHours.size !== 24) {
    return { valid: false, error: 'hours array must cover all hours 0 through 23' };
  }

  const b = body.battery;
  if (!b || typeof b !== 'object') {
    return { valid: false, error: 'battery must be an object' };
  }

  const numericFields: (keyof BatteryConfig)[] = [
    'capacity_kwh',
    'initial_energy_kwh',
    'minimum_energy_kwh',
    'max_charge_kwh_per_hour',
    'max_discharge_kwh_per_hour',
  ];

  for (const field of numericFields) {
    if (typeof b[field] !== 'number' || !Number.isFinite(b[field]) || b[field] < 0) {
      return { valid: false, error: `battery.${field} must be a non-negative finite number` };
    }
  }

  if (b.capacity_kwh <= 0) {
    return { valid: false, error: 'battery.capacity_kwh must be greater than 0' };
  }
  if (b.initial_energy_kwh > b.capacity_kwh) {
    return { valid: false, error: 'battery.initial_energy_kwh cannot exceed battery.capacity_kwh' };
  }
  if (b.minimum_energy_kwh > b.capacity_kwh) {
    return { valid: false, error: 'battery.minimum_energy_kwh cannot exceed battery.capacity_kwh' };
  }

  return { valid: true };
}

/**
 * Validates, normalizes, and applies Guardrails to LLM output (Section 08)
 */
export function sanitizeDirectiveInterpretations(
  rawInterpretations: any[],
  operatorNotes: string[],
  battery: BatteryConfig
): DirectiveInterpretation[] {
  const allowedTypes: Set<DirectiveType> = new Set([
    'solar_reduction',
    'minimum_battery_reserve',
    'no_charge_window',
    'no_discharge_window',
    'max_grid_window',
    'no_op',
  ]);

  return operatorNotes.map((noteText, idx) => {
    // Find matching candidate by note_index or fallback to positional index
    const candidate = Array.isArray(rawInterpretations)
      ? rawInterpretations.find((item) => item && item.note_index === idx) || rawInterpretations[idx] || {}
      : {};

    let type: DirectiveType = 'no_op';
    if (typeof candidate.directive_type === 'string' && allowedTypes.has(candidate.directive_type)) {
      type = candidate.directive_type;
    }

    // Default explanation
    const explanation = typeof candidate.explanation === 'string' && candidate.explanation.trim().length > 0
      ? candidate.explanation.trim()
      : (type === 'no_op' ? 'This note does not affect the 24-hour energy schedule.' : `Applied ${type} directive.`);

    if (type === 'no_op') {
      return {
        note_index: idx,
        applies: false,
        directive_type: 'no_op',
        structured_adjustment: null,
        explanation,
      };
    }

    // For non-no_op directives, sanitize hours and structured_adjustment
    const rawAdj = candidate.structured_adjustment || {};
    let hours: number[] = [];
    if (Array.isArray(rawAdj.hours)) {
      hours = rawAdj.hours
        .filter((h: any) => Number.isInteger(h) && h >= 0 && h <= 23)
        .sort((a: number, b: number) => a - b);
      hours = Array.from(new Set(hours));
    }

    // If no valid hours were extracted for a time-based directive, fallback gracefully
    if (hours.length === 0) {
      // If we couldn't parse valid hours, mark as no_op to satisfy guardrails rather than breaking the schedule
      return {
        note_index: idx,
        applies: false,
        directive_type: 'no_op',
        structured_adjustment: null,
        explanation: `Unable to extract valid operating hours from note: "${noteText}"`,
      };
    }

    let structuredAdjustment: StructuredAdjustment = null;

    if (type === 'solar_reduction') {
      let factor = typeof rawAdj.factor === 'number' && Number.isFinite(rawAdj.factor) ? rawAdj.factor : 0.5;
      factor = Math.max(0, Math.min(1, factor));
      structuredAdjustment = {
        hours,
        factor: Number(factor.toFixed(4)),
      };
    } else if (type === 'minimum_battery_reserve') {
      let minKwh = typeof rawAdj.minimum_energy_kwh === 'number' && Number.isFinite(rawAdj.minimum_energy_kwh)
        ? rawAdj.minimum_energy_kwh
        : battery.minimum_energy_kwh;
      minKwh = Math.max(0, Math.min(battery.capacity_kwh, minKwh));
      structuredAdjustment = {
        hours,
        minimum_energy_kwh: Number(minKwh.toFixed(4)),
      };
    } else if (type === 'no_charge_window') {
      structuredAdjustment = { hours };
    } else if (type === 'no_discharge_window') {
      structuredAdjustment = { hours };
    } else if (type === 'max_grid_window') {
      let maxGrid = typeof rawAdj.max_grid_kwh === 'number' && Number.isFinite(rawAdj.max_grid_kwh)
        ? Math.max(0, rawAdj.max_grid_kwh)
        : 100;
      structuredAdjustment = {
        hours,
        max_grid_kwh: Number(maxGrid.toFixed(4)),
      };
    }

    return {
      note_index: idx,
      applies: true,
      directive_type: type,
      structured_adjustment: structuredAdjustment,
      explanation,
    };
  });
}
