import React from 'react';
import { OptimizeEnergyRequest } from '../types.js';
import { Play, RotateCcw, Plus, Trash2, Battery, Settings, BookOpen } from 'lucide-react';

interface ScenarioEditorProps {
  request: OptimizeEnergyRequest;
  onChange: (updated: OptimizeEnergyRequest) => void;
  onRunOptimization: () => void;
  onResetSample: () => void;
  isLoading: boolean;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  request,
  onChange,
  onRunOptimization,
  onResetSample,
  isLoading,
}) => {
  const updateNote = (index: number, val: string) => {
    const updatedNotes = [...request.operator_notes];
    updatedNotes[index] = val;
    onChange({ ...request, operator_notes: updatedNotes });
  };

  const removeNote = (index: number) => {
    if (request.operator_notes.length <= 1) return;
    const updatedNotes = request.operator_notes.filter((_, i) => i !== index);
    onChange({ ...request, operator_notes: updatedNotes });
  };

  const addNote = () => {
    if (request.operator_notes.length >= 3) return;
    onChange({
      ...request,
      operator_notes: [...request.operator_notes, 'Keep at least 150 kWh in reserve from 6 PM until 9 PM.'],
    });
  };

  const updateBattery = (field: keyof typeof request.battery, val: number) => {
    onChange({
      ...request,
      battery: {
        ...request.battery,
        [field]: Number.isNaN(val) ? 0 : val,
      },
    });
  };

  const loadPreset = (type: 'canonical' | 'paraphrased' | 'reserve') => {
    if (type === 'canonical') {
      onResetSample();
    } else if (type === 'paraphrased') {
      onChange({
        ...request,
        scenario_id: 'GRID-PARAPHRASE-202',
        operator_notes: [
          'PV production will drop to about 20% between 13:00 and 15:00.',
          'Do not charge the battery between 2 PM and 4 PM.',
          'Campus annual cultural fest date announced for next month.',
        ],
      });
    } else if (type === 'reserve') {
      onChange({
        ...request,
        scenario_id: 'GRID-RESERVE-303',
        operator_notes: [
          'Keep at least 180 kWh in reserve from 6 PM until 10 PM.',
          'Battery discharging is unavailable from 8 AM to 11 AM.',
          'Solar output will drop to about 30% from 12 PM to 2 PM.',
        ],
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Scenario & Operator Directives</h2>
          <p className="text-xs text-slate-500">Configure synthetic scenario and natural language operator inputs</p>
        </div>

        {/* Presets */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1">Presets:</span>
          <button
            onClick={() => loadPreset('canonical')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            GRID-101 (Canonical)
          </button>
          <button
            onClick={() => loadPreset('paraphrased')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Sec 11.4 Paraphrased
          </button>
          <button
            onClick={() => loadPreset('reserve')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Reserve & Lockout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Operator Notes List (Takes 2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <span>Operator Notes ({request.operator_notes.length}/3)</span>
              <span className="text-slate-400 font-normal ml-2 text-2xs">(Interpreted via Gemini LLM)</span>
            </label>
            {request.operator_notes.length < 3 && (
              <button
                onClick={addNote}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {request.operator_notes.map((note, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {index}
                </span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => updateNote(index, e.target.value)}
                  placeholder="Enter natural language operator directive..."
                  className="flex-1 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                {request.operator_notes.length > 1 && (
                  <button
                    onClick={() => removeNote(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 text-2xs text-slate-500">
            <span className="font-semibold text-slate-600">Quick insert:</span>
            <button
              onClick={() => updateNote(0, 'Solar output will drop to about 20% from 1 PM to 3 PM.')}
              className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              Solar Reduction
            </button>
            <button
              onClick={() => updateNote(1, 'Do not charge the battery between 2 PM and 4 PM.')}
              className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              No Charge
            </button>
            <button
              onClick={() => updateNote(Math.min(2, request.operator_notes.length - 1), 'The cafeteria menu changes tomorrow.')}
              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              No-Op Distractor
            </button>
          </div>
        </div>

        {/* Battery Specs (Takes 1 Col) */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800">
            <Battery className="w-4 h-4 text-purple-600" />
            <span>Battery Parameters</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-2xs text-slate-500 block mb-0.5">Capacity (kWh)</label>
              <input
                type="number"
                value={request.battery.capacity_kwh}
                onChange={(e) => updateBattery('capacity_kwh', parseFloat(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-500 block mb-0.5">Initial Energy (kWh)</label>
              <input
                type="number"
                value={request.battery.initial_energy_kwh}
                onChange={(e) => updateBattery('initial_energy_kwh', parseFloat(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-500 block mb-0.5">Min Reserve (kWh)</label>
              <input
                type="number"
                value={request.battery.minimum_energy_kwh}
                onChange={(e) => updateBattery('minimum_energy_kwh', parseFloat(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-2xs text-slate-500 block mb-0.5">Max Chg/Disch (kWh/h)</label>
              <input
                type="number"
                value={request.battery.max_charge_kwh_per_hour}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateBattery('max_charge_kwh_per_hour', val);
                  updateBattery('max_discharge_kwh_per_hour', val);
                }}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="text-2xs text-slate-400">
            Neutrality rule: End battery SOC must match {request.battery.initial_energy_kwh} kWh.
          </div>
        </div>
      </div>

      {/* Action CTA Bar */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Scenario ID:</span>
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">{request.scenario_id}</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onResetSample}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset GRID-101</span>
          </button>

          <button
            onClick={onRunOptimization}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Interpreting & Solving...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run POST /optimize-energy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
