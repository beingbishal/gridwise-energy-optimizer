import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode, CheckCircle2, ShieldCheck, Code, BookOpen } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'schema' | 'guardrails'>('endpoints');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const curlHealth = `curl -X GET "${origin}/health"`;

  const curlOpt = `curl -X POST "${origin}/optimize-energy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenario_id": "GRID-101",
    "operator_notes": [
      "Solar output will drop to about 20% from 1 PM to 3 PM.",
      "Do not charge the battery between 2 PM and 4 PM.",
      "The cafeteria menu changes tomorrow."
    ],
    "hours": [
      {"hour": 0, "demand_kwh": 180, "solar_kwh": 0, "tariff_bdt_per_kwh": 7},
      {"hour": 1, "demand_kwh": 170, "solar_kwh": 0, "tariff_bdt_per_kwh": 7},
      {"hour": 2, "demand_kwh": 160, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
      {"hour": 3, "demand_kwh": 150, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
      {"hour": 4, "demand_kwh": 150, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
      {"hour": 5, "demand_kwh": 160, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
      {"hour": 6, "demand_kwh": 190, "solar_kwh": 10, "tariff_bdt_per_kwh": 7},
      {"hour": 7, "demand_kwh": 220, "solar_kwh": 40, "tariff_bdt_per_kwh": 8},
      {"hour": 8, "demand_kwh": 260, "solar_kwh": 90, "tariff_bdt_per_kwh": 9},
      {"hour": 9, "demand_kwh": 300, "solar_kwh": 150, "tariff_bdt_per_kwh": 10},
      {"hour": 10, "demand_kwh": 320, "solar_kwh": 200, "tariff_bdt_per_kwh": 11},
      {"hour": 11, "demand_kwh": 340, "solar_kwh": 240, "tariff_bdt_per_kwh": 11},
      {"hour": 12, "demand_kwh": 350, "solar_kwh": 260, "tariff_bdt_per_kwh": 11},
      {"hour": 13, "demand_kwh": 340, "solar_kwh": 250, "tariff_bdt_per_kwh": 10},
      {"hour": 14, "demand_kwh": 320, "solar_kwh": 220, "tariff_bdt_per_kwh": 10},
      {"hour": 15, "demand_kwh": 300, "solar_kwh": 170, "tariff_bdt_per_kwh": 10},
      {"hour": 16, "demand_kwh": 280, "solar_kwh": 110, "tariff_bdt_per_kwh": 9},
      {"hour": 17, "demand_kwh": 270, "solar_kwh": 50, "tariff_bdt_per_kwh": 9},
      {"hour": 18, "demand_kwh": 290, "solar_kwh": 10, "tariff_bdt_per_kwh": 12},
      {"hour": 19, "demand_kwh": 310, "solar_kwh": 0, "tariff_bdt_per_kwh": 12},
      {"hour": 20, "demand_kwh": 300, "solar_kwh": 0, "tariff_bdt_per_kwh": 11},
      {"hour": 21, "demand_kwh": 260, "solar_kwh": 0, "tariff_bdt_per_kwh": 10},
      {"hour": 22, "demand_kwh": 220, "solar_kwh": 0, "tariff_bdt_per_kwh": 8},
      {"hour": 23, "demand_kwh": 200, "solar_kwh": 0, "tariff_bdt_per_kwh": 7}
    ],
    "battery": {
      "capacity_kwh": 500,
      "initial_energy_kwh": 200,
      "minimum_energy_kwh": 50,
      "max_charge_kwh_per_hour": 100,
      "max_discharge_kwh_per_hour": 100
    }
  }'`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">API Contract & Judge Specifications</h2>
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                BUP CSE FEST 2026
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Canonical REST Interface, Status Codes, and Directive Rules for Energy Optimizer
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tabs inside modal */}
        <div className="flex items-center space-x-1 border-b border-slate-200 mt-4 mb-4">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'endpoints'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            REST Endpoints
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Directives & Schema
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'guardrails'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Verification Rules (Section 08 & 11)
          </button>
        </div>

        {activeTab === 'endpoints' && (
          <div className="space-y-6">
            {/* Endpoint 1: GET /health */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    GET
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-800">/health</span>
                </div>
                <button
                  onClick={() => copyToClipboard(curlHealth, 'health')}
                  className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  {copiedKey === 'health' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'health' ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Liveness and readiness check. Returns HTTP 200 with status ok when service is ready for optimization requests.
              </p>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                {curlHealth}
              </pre>
              <div className="text-xs text-slate-600 flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Response (HTTP 200):</span>
                <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-800">
                  {`{"status": "ok"}`}
                </code>
              </div>
            </div>

            {/* Endpoint 2: POST /optimize-energy */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    POST
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-800">/optimize-energy</span>
                </div>
                <button
                  onClick={() => copyToClipboard(curlOpt, 'opt')}
                  className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  {copiedKey === 'opt' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'opt' ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Accepts 24-hour demand, solar, tariffs, battery parameters, and up to 3 natural-language operator directives.
              </p>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
                {curlOpt}
              </pre>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs text-slate-600 pt-1">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-700">200 OK:</span> Valid optimization plan and directives
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-bold text-amber-700">400 Bad Request:</span> Invalid JSON schema or missing fields
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="font-bold text-rose-700">422 Infeasible:</span> Physically impossible battery constraints
                </div>
              </div>
            </div>

            {/* Endpoint 3: GET /api/sample-scenario */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    GET
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-800">/api/sample-scenario</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`curl -X GET "${origin}/api/sample-scenario"`, 'sample')}
                  className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  {copiedKey === 'sample' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sample' ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Returns the canonical benchmark scenario (GRID-101) for benchmarking and client verification.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Supported Directive Types (Section 04)</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Directive Type</th>
                    <th className="px-3 py-2.5">Meaning</th>
                    <th className="px-3 py-2.5">Required structured_adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-amber-700">solar_reduction</td>
                    <td className="px-3 py-2 text-slate-600">Reduce usable solar during specific hours</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{`{"hours":[...], "factor": number}`}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-700">minimum_battery_reserve</td>
                    <td className="px-3 py-2 text-slate-600">Keep battery energy at or above required level</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{`{"hours":[...], "minimum_energy_kwh": number}`}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-rose-700">no_charge_window</td>
                    <td className="px-3 py-2 text-slate-600">Battery charging unavailable during hours</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{`{"hours":[...]}`}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-purple-700">no_discharge_window</td>
                    <td className="px-3 py-2 text-slate-600">Battery discharging unavailable during hours</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{`{"hours":[...]}`}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">max_grid_window</td>
                    <td className="px-3 py-2 text-slate-600">Grid import may not exceed stated amount</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{`{"hours":[...], "max_grid_kwh": number}`}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono font-bold text-slate-500">no_op</td>
                    <td className="px-3 py-2 text-slate-600">Does not affect 24h schedule (cafeteria, weather trivia)</td>
                    <td className="px-3 py-2 font-mono text-slate-500">null (applies = false)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'guardrails' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3 text-slate-700">
              <h4 className="font-bold text-slate-900 flex items-center text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
                Hackathon Optimization Guardrails (Sections 05, 08, 09, 11)
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Time Windows:</strong> Start hour is included, end hour is excluded. E.g., &quot;1 PM to 3 PM&quot; = <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">[13, 14]</code>.
                </li>
                <li>
                  <strong className="text-slate-800">Array Ordering:</strong> Every hours array must contain unique integers 0..23 in strictly ascending order.
                </li>
                <li>
                  <strong className="text-slate-800">Hourly Energy Balance:</strong> Must hold each hour: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">grid + solar_used + discharge = demand + charge</code>.
                </li>
                <li>
                  <strong className="text-slate-800">Battery Neutrality:</strong> End-of-day battery energy must equal initial battery energy (<code className="bg-slate-200 px-1 py-0.5 rounded font-mono">SOC[24] = SOC[0]</code>).
                </li>
                <li>
                  <strong className="text-slate-800">Linear Programming Objective:</strong> Minimize total grid import tariff cost while strictly adhering to physical storage and LLM-interpreted directives.
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
