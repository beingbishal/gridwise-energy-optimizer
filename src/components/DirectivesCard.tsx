import React from 'react';
import { DirectiveInterpretation } from '../types.js';
import { Sparkles, Clock, CheckCircle, MinusCircle } from 'lucide-react';

interface DirectivesCardProps {
  directives: DirectiveInterpretation[];
  operatorNotes: string[];
}

export const DirectivesCard: React.FC<DirectivesCardProps> = ({ directives, operatorNotes }) => {
  if (!directives || directives.length === 0) return null;

  const getDirectiveBadge = (type: string) => {
    switch (type) {
      case 'solar_reduction':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'minimum_battery_reserve':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'no_charge_window':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'no_discharge_window':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'max_grid_window':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'no_op':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">LLM Directive Interpretation</h3>
            <p className="text-xs text-slate-500">Converted natural language operator notes to structured constraints</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {directives.length} Note{directives.length > 1 ? 's' : ''} Processed
        </span>
      </div>

      <div className="space-y-3">
        {directives.map((dir) => {
          const originalNote = operatorNotes[dir.note_index] || `Note ${dir.note_index}`;
          const adj = dir.structured_adjustment as any;

          return (
            <div
              key={dir.note_index}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {dir.note_index}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${getDirectiveBadge(dir.directive_type)}`}>
                    {dir.directive_type}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {dir.applies ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> applies: true
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">
                      <MinusCircle className="w-3 h-3 mr-1 text-slate-500" /> applies: false (no_op)
                    </span>
                  )}
                </div>
              </div>

              {/* Note text quote */}
              <div className="text-xs text-slate-800 font-medium italic border-l-2 border-indigo-300 pl-2.5 py-0.5">
                "{originalNote}"
              </div>

              {/* Structured Adjustment Details */}
              {dir.applies && adj && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-700">
                  {adj.hours && adj.hours.length > 0 && (
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600">Hours:</span>
                      <span className="font-mono text-slate-900 font-medium">
                        [{adj.hours.join(', ')}] ({adj.hours.length} hr{adj.hours.length > 1 ? 's' : ''})
                      </span>
                    </div>
                  )}

                  {typeof adj.factor === 'number' && (
                    <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      <span className="font-semibold text-slate-600">Solar Factor: </span>
                      <span className="font-mono text-amber-700 font-bold">{adj.factor}</span>
                      <span className="text-slate-400 text-2xs ml-1">({Math.round((1 - adj.factor) * 100)}% cut)</span>
                    </div>
                  )}

                  {typeof adj.minimum_energy_kwh === 'number' && (
                    <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      <span className="font-semibold text-slate-600">Min Reserve: </span>
                      <span className="font-mono text-emerald-700 font-bold">{adj.minimum_energy_kwh} kWh</span>
                    </div>
                  )}

                  {typeof adj.max_grid_kwh === 'number' && (
                    <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      <span className="font-semibold text-slate-600">Max Grid Cap: </span>
                      <span className="font-mono text-blue-700 font-bold">{adj.max_grid_kwh} kWh</span>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              <div className="text-xs text-slate-500 pt-0.5">
                <span className="font-semibold text-slate-600">Interpretation reasoning: </span>
                {dir.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
