import { GoogleGenAI } from '@google/genai';
import { BatteryConfig, DirectiveInterpretation } from '../src/types.js';
import { sanitizeDirectiveInterpretations } from './validator.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI();
  }
  return aiClient;
}

/**
 * Heuristic natural-language parser for fallback / offline verification.
 * Extracts time windows [start..end) and directive parameters.
 */
function parseTimeInterval(text: string): number[] {
  const lower = text.toLowerCase();
  const hours: number[] = [];

  // Match patterns like "1 PM to 3 PM", "between 2 PM and 4 PM", "from 6 PM until 9 PM", "1-3 PM", "13:00 to 15:00"
  // 12-hour format with AM/PM
  const ampmRegex = /(\d{1,2})(?::00)?\s*(am|pm)?\s*(?:to|-|until|and)\s*(\d{1,2})(?::00)?\s*(am|pm)/i;
  const ampmMatch = lower.match(ampmRegex);
  if (ampmMatch) {
    let startH = parseInt(ampmMatch[1], 10);
    const startPeriod = (ampmMatch[2] || ampmMatch[4] || '').toLowerCase();
    let endH = parseInt(ampmMatch[3], 10);
    const endPeriod = (ampmMatch[4] || '').toLowerCase();

    if (startPeriod === 'pm' && startH < 12) startH += 12;
    if (startPeriod === 'am' && startH === 12) startH = 0;

    if (endPeriod === 'pm' && endH < 12) endH += 12;
    if (endPeriod === 'am' && endH === 12) endH = 0;

    if (startH < endH && startH >= 0 && endH <= 24) {
      for (let h = startH; h < endH; h++) {
        hours.push(h);
      }
      return hours;
    }
  }

  // 24-hour format: e.g. "13:00 and 15:00", "13:00 to 15:00", "between 13:00 and 15:00"
  const h24Regex = /(\d{1,2}):00\s*(?:to|-|and|until)\s*(\d{1,2}):00/;
  const h24Match = lower.match(h24Regex);
  if (h24Match) {
    const startH = parseInt(h24Match[1], 10);
    const endH = parseInt(h24Match[2], 10);
    if (startH < endH && startH >= 0 && endH <= 24) {
      for (let h = startH; h < endH; h++) {
        hours.push(h);
      }
      return hours;
    }
  }

  // Word numbers: "from one until three", "between one and three"
  const wordMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  const wordRegex = /(?:from|between)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:until|to|and)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/i;
  const wordMatch = lower.match(wordRegex);
  if (wordMatch) {
    let startH = wordMap[wordMatch[1].toLowerCase()];
    let endH = wordMap[wordMatch[2].toLowerCase()];
    // If context implies afternoon (e.g. solar washing), map to PM if startH <= 5
    if (startH <= 6 && endH <= 7 && !lower.includes('am')) {
      startH += 12;
      endH += 12;
    }
    if (startH < endH) {
      for (let h = startH; h < endH; h++) {
        hours.push(h);
      }
      return hours;
    }
  }

  return hours;
}

export function heuristicInterpretNote(note: string, idx: number, battery: BatteryConfig): any {
  const lower = note.toLowerCase();

  // Distractor / Irrelevant check
  if (
    lower.includes('cafeteria') ||
    lower.includes('menu') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('meeting') ||
    lower.includes('holiday') ||
    lower.includes('weather is pleasant') ||
    lower.includes('library') ||
    lower.includes('bus schedule')
  ) {
    return {
      note_index: idx,
      applies: false,
      directive_type: 'no_op',
      structured_adjustment: null,
      explanation: 'This note does not affect the 24-hour energy schedule.',
    };
  }

  const hours = parseTimeInterval(note);

  // 1. Solar reduction
  if (lower.includes('solar') || lower.includes('pv') || lower.includes('sun') || lower.includes('panel')) {
    // Check factor: "drop to about 20%" -> 0.2; "80% reduction" -> 0.2; "one-fifth" -> 0.2
    let factor = 0.5;
    const dropToMatch = lower.match(/(?:drop(?:s|ped)?\s*to|reduced?\s*to|leaves?)\s*(?:about|roughly|approx)?\s*(\d{1,3})%/i);
    const reductionMatch = lower.match(/(\d{1,3})%\s*reduction/i);
    const fractionMatch = lower.match(/(one[- ]fifth|half|one[- ]fourth|quarter|one[- ]third)/i);

    if (dropToMatch) {
      factor = parseInt(dropToMatch[1], 10) / 100;
    } else if (reductionMatch) {
      factor = (100 - parseInt(reductionMatch[1], 10)) / 100;
    } else if (fractionMatch) {
      const frac = fractionMatch[1].replace(' ', '-');
      if (frac === 'one-fifth') factor = 0.2;
      else if (frac === 'one-fourth' || frac === 'quarter') factor = 0.25;
      else if (frac === 'one-third') factor = 0.3333;
      else if (frac === 'half') factor = 0.5;
    }

    return {
      note_index: idx,
      applies: true,
      directive_type: 'solar_reduction',
      structured_adjustment: {
        hours: hours.length > 0 ? hours : [13, 14],
        factor: Math.max(0, Math.min(1, factor)),
      },
      explanation: 'Solar availability reduced according to operator note.',
    };
  }

  // 2. No charge window
  if (
    (lower.includes('not charge') || lower.includes('no charge') || lower.includes('disable charging') || lower.includes('charging is unavailable')) &&
    !lower.includes('discharge')
  ) {
    return {
      note_index: idx,
      applies: true,
      directive_type: 'no_charge_window',
      structured_adjustment: {
        hours: hours.length > 0 ? hours : [14, 15],
      },
      explanation: 'Battery charging disabled during the specified window.',
    };
  }

  // 3. No discharge window
  if (
    lower.includes('not discharge') ||
    lower.includes('no discharge') ||
    lower.includes('disable discharging') ||
    lower.includes('discharging is unavailable')
  ) {
    return {
      note_index: idx,
      applies: true,
      directive_type: 'no_discharge_window',
      structured_adjustment: {
        hours: hours.length > 0 ? hours : [14, 15],
      },
      explanation: 'Battery discharging disabled during the specified window.',
    };
  }

  // 4. Minimum battery reserve
  if (lower.includes('reserve') || lower.includes('keep at least') || lower.includes('maintain at least')) {
    const kwhMatch = lower.match(/(\d+(?:\.\d+)?)\s*kwh/i);
    const minKwh = kwhMatch ? parseFloat(kwhMatch[1]) : battery.minimum_energy_kwh;
    return {
      note_index: idx,
      applies: true,
      directive_type: 'minimum_battery_reserve',
      structured_adjustment: {
        hours: hours.length > 0 ? hours : [18, 19, 20],
        minimum_energy_kwh: Math.min(battery.capacity_kwh, Math.max(0, minKwh)),
      },
      explanation: 'Battery minimum reserve elevated during the specified hours.',
    };
  }

  // 5. Max grid window
  if (lower.includes('grid') && (lower.includes('cap') || lower.includes('exceed') || lower.includes('max') || lower.includes('limit') || lower.includes('under'))) {
    const kwhMatch = lower.match(/(\d+(?:\.\d+)?)\s*kwh/i);
    const maxGrid = kwhMatch ? parseFloat(kwhMatch[1]) : 100;
    return {
      note_index: idx,
      applies: true,
      directive_type: 'max_grid_window',
      structured_adjustment: {
        hours: hours.length > 0 ? hours : [18, 19, 20],
        max_grid_kwh: Math.max(0, maxGrid),
      },
      explanation: 'Grid import capped during the specified hours.',
    };
  }

  return {
    note_index: idx,
    applies: false,
    directive_type: 'no_op',
    structured_adjustment: null,
    explanation: 'This note does not affect the 24-hour energy schedule.',
  };
}

/**
 * Interprets operator notes using Gemini LLM, with deterministic guardrails.
 */
export async function interpretOperatorNotes(
  operatorNotes: string[],
  battery: BatteryConfig
): Promise<DirectiveInterpretation[]> {
  if (!operatorNotes || operatorNotes.length === 0) {
    return [];
  }

  const prompt = `You are an energy scheduling assistant for BUP Smart Campus Energy Optimization Challenge.
Interpret each operator note into a structured directive adhering strictly to the BUP Hackathon specification.

DIRECTIVE RULES:
1. "solar_reduction":
   - Meaning: Reduce usable solar during specific hours.
   - structured_adjustment: {"hours": [unique sorted 0..23], "factor": number}
   - "factor" means the remaining usable solar fraction (between 0 and 1).
     * Example: "drop to about 20%" means factor: 0.2
     * Example: "80% reduction" means factor: 0.2
     * Example: "leave roughly one-fifth" means factor: 0.2
2. "minimum_battery_reserve":
   - Meaning: Keep battery energy at or above a required level.
   - structured_adjustment: {"hours": [unique sorted 0..23], "minimum_energy_kwh": number}
3. "no_charge_window":
   - Meaning: Battery charging is unavailable during specific hours.
   - structured_adjustment: {"hours": [unique sorted 0..23]}
4. "no_discharge_window":
   - Meaning: Battery discharging is unavailable during specific hours.
   - structured_adjustment: {"hours": [unique sorted 0..23]}
5. "max_grid_window":
   - Meaning: Grid import may not exceed a stated amount during specific hours.
   - structured_adjustment: {"hours": [unique sorted 0..23], "max_grid_kwh": number}
6. "no_op":
   - Meaning: Note does not affect the current 24-hour energy schedule (e.g. cafeteria menus, greetings, non-energy announcements).
   - structured_adjustment: null
   - applies: false

TIME WINDOW RULES:
- Use whole-hour intervals: start hour is INCLUDED, end hour is EXCLUDED.
  * "1 PM to 3 PM" -> hours: [13, 14]
  * "13:00 to 15:00" -> hours: [13, 14]
  * "between 2 PM and 4 PM" -> hours: [14, 15]
  * "from 6 PM until 9 PM" -> hours: [18, 19, 20]
  * "1-3 PM" -> hours: [13, 14]
  * "one until three" in afternoon -> hours: [13, 14]
- Every hours array MUST contain unique integers from 0 through 23 in strictly ascending order.

APPLIES SEMANTICS:
- For "no_op": applies MUST be false, and structured_adjustment MUST be null.
- For all other non-no_op directives: applies MUST be true, and structured_adjustment MUST match the required shape.
- Return exactly one entry for each note in note_index order: 0, 1, ... N-1.

Operator notes to interpret:
${JSON.stringify(operatorNotes, null, 2)}

Return a JSON array of objects with fields:
[
  {
    "note_index": 0,
    "applies": true,
    "directive_type": "solar_reduction",
    "structured_adjustment": { "hours": [13, 14], "factor": 0.2 },
    "explanation": "Solar availability reduced during panel cleaning."
  }
]`;

  let rawInterpretations: any[] = [];
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      const ai = getAiClient();
      // Use a timeout so transient network delays or 503 retries do not block the request
      const responsePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for Gemini response')), 5000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      const text = response.text?.trim() || '';
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawInterpretations = parsed;
          break;
        }
      }
    } catch (err: any) {
      const msg = err?.status === 503 || err?.message?.includes('503')
        ? 'high demand (503), switching to fallback'
        : (err?.message || String(err));
      console.warn(`[Gemini Interpreter] Model ${model} unavailable: ${msg}`);
      // Try next model or fallback
    }
  }

  // If LLM returned nothing or was unavailable, use deterministic fallback
  if (rawInterpretations.length === 0) {
    rawInterpretations = operatorNotes.map((note, idx) => heuristicInterpretNote(note, idx, battery));
  }

  // Pass through deterministic Section 08 Guardrail Sanitizer
  return sanitizeDirectiveInterpretations(rawInterpretations, operatorNotes, battery);
}

/**
 * Creates a clear human-readable plan summary.
 */
export function buildPlanSummary(
  directives: DirectiveInterpretation[],
  totalGridKwh: number,
  totalCostBdt: number,
  peakGridKwh: number
): string {
  const activeDirectives = directives.filter((d) => d.applies);
  const directiveCount = activeDirectives.length;
  const directiveNames = activeDirectives.map((d) => d.directive_type).join(', ');

  return `Optimal 24-hour schedule generated satisfying ${directiveCount} active directive(s)${
    directiveCount > 0 ? ` (${directiveNames})` : ''
  } with end-of-day battery state neutrality preserved. Total grid import: ${totalGridKwh.toFixed(
    2
  )} kWh, total cost: ${totalCostBdt.toFixed(2)} BDT, peak grid demand: ${peakGridKwh.toFixed(2)} kWh.`;
}
