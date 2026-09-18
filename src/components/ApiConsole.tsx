import React, { useState } from 'react';
import { Play, Copy, Check, Sparkles, Terminal, FileCode, Send, RefreshCw } from 'lucide-react';
import { OptimizeEnergyRequest, OptimizeEnergyResponse } from '../types.js';

interface ApiConsoleProps {
  currentRequest: OptimizeEnergyRequest;
  onApplyRequest: (req: OptimizeEnergyRequest) => void;
  onExecute: (req: OptimizeEnergyRequest) => Promise<void>;
  response: OptimizeEnergyResponse | null;
  isLoading: boolean;
  activeEndpoint: 'optimize' | 'health';
  onSelectEndpoint: (ep: 'optimize' | 'health') => void;
  latencyMs: number | null;
}

export const ApiConsole: React.FC<ApiConsoleProps> = ({
  currentRequest,
  onApplyRequest,
  onExecute,
  response,
  isLoading,
  activeEndpoint,
  onSelectEndpoint,
  latencyMs,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(() => JSON.stringify(currentRequest, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [curlLang, setCurlLang] = useState<'curl' | 'fetch' | 'python'>('curl');

  // Sync internal JSON when currentRequest changes from external presets
  React.useEffect(() => {
    setJsonInput(JSON.stringify(currentRequest, null, 2));
    setJsonError(null);
  }, [currentRequest]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const generateCurlSnippet = () => {
    if (activeEndpoint === 'health') {
      if (curlLang === 'curl') {
        return `curl -X GET "${origin}/health"`;
      } else if (curlLang === 'fetch') {
        return `fetch("${origin}/health")\n  .then(res => res.json())\n  .then(console.log);`;
      } else {
        return `import requests\nres = requests.get("${origin}/health")\nprint(res.json())`;
      }
    }

    // Optimize endpoint
    if (curlLang === 'curl') {
      return `curl -X POST "${origin}/optimize-energy" \\\n  -H "Content-Type: application/json" \\\n  -d '${jsonInput.replace(/'/g, "'\\''")}'`;
    } else if (curlLang === 'fetch') {
      return `fetch("${origin}/optimize-energy", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${jsonInput})\n})\n  .then(res => res.json())\n  .then(console.log);`;
    } else {
      return `import requests\n\npayload = ${jsonInput}\nres = requests.post("${origin}/optimize-energy", json=payload)\nprint(res.json())`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleExecuteJson = () => {
    if (activeEndpoint === 'health') {
      // Just re-trigger health check
      window.location.reload();
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setJsonError(null);
      onApplyRequest(parsed);
      onExecute(parsed);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || 'Cannot format invalid JSON');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header bar styled as a modern API development console */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            <span className="text-slate-300 font-semibold">Interactive API Console</span>
          </div>

          {/* Endpoint selection tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onSelectEndpoint('optimize')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                activeEndpoint === 'optimize'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold text-blue-200 mr-1.5">POST</span>
              /optimize-energy
            </button>
            <button
              onClick={() => onSelectEndpoint('health')}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                activeEndpoint === 'health'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold text-emerald-200 mr-1.5">GET</span>
              /health
            </button>
          </div>
        </div>

        {/* Action buttons & code generator */}
        <div className="flex items-center space-x-2">
          {/* Language selector for snippet */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-2xs font-mono text-slate-400">
            <button
              onClick={() => setCurlLang('curl')}
              className={`px-2 py-0.5 rounded ${curlLang === 'curl' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-300'}`}
            >
              cURL
            </button>
            <button
              onClick={() => setCurlLang('fetch')}
              className={`px-2 py-0.5 rounded ${curlLang === 'fetch' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-300'}`}
            >
              JS Fetch
            </button>
            <button
              onClick={() => setCurlLang('python')}
              className={`px-2 py-0.5 rounded ${curlLang === 'python' ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-300'}`}
            >
              Python
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Copy executable API snippet"
          >
            {copiedCurl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          {activeEndpoint === 'optimize' && (
            <button
              onClick={handleExecuteJson}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main split view: Live Request Payload Editor & Live Response Payload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left Side: Request Body Editor */}
        <div className="p-4 space-y-2 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span className="font-mono flex items-center">
              <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Request Payload (JSON Body)
            </span>
            {activeEndpoint === 'optimize' && (
              <button
                onClick={handleFormatJson}
                className="text-2xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Format JSON
              </button>
            )}
          </div>

          {activeEndpoint === 'optimize' ? (
            <>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError(null);
                }}
                spellCheck={false}
                className="flex-1 w-full p-3 font-mono text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:border-blue-500 focus:outline-hidden resize-y leading-relaxed"
                rows={14}
              />
              {jsonError && (
                <div className="text-rose-400 text-2xs font-mono bg-rose-950/50 p-2 rounded-lg border border-rose-800">
                  ⚠️ JSON Syntax Error: {jsonError}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-center items-center text-center space-y-2 font-mono text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                GET /health
              </span>
              <p className="text-slate-400 text-2xs max-w-xs">
                Health check endpoint accepts no request body. Responds with HTTP 200 OK and service status object.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Response Output Viewer */}
        <div className="p-4 space-y-2 flex flex-col h-full min-h-[300px] bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span className="font-mono flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Live Server Response
            </span>
            {response && (
              <span className="font-mono text-2xs text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>200 OK</span>
                {latencyMs ? <span>({latencyMs}ms)</span> : null}
              </span>
            )}
          </div>

          <pre className="flex-1 w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl overflow-x-auto overflow-y-auto max-h-[380px] leading-relaxed">
            {activeEndpoint === 'health'
              ? JSON.stringify({ status: 'ok' }, null, 2)
              : response
              ? JSON.stringify(response, null, 2)
              : '// Run or Send Request to view response JSON here.'}
          </pre>
        </div>
      </div>

      {/* Code Snippet Box for easy developer integration */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="truncate font-mono text-2xs text-slate-400 mr-2">
          <span className="text-slate-500 mr-1.5">$</span>
          {activeEndpoint === 'health'
            ? `curl -X GET "${origin}/health"`
            : `curl -X POST "${origin}/optimize-energy" -H "Content-Type: application/json" -d '{...}'`}
        </div>
        <button
          onClick={handleCopyCode}
          className="shrink-0 text-2xs font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
        >
          {copiedCurl ? 'Copied!' : 'Copy full snippet'}
        </button>
      </div>
    </div>
  );
};
