import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

interface RawJsonViewerProps {
  request: any;
  response: any;
}

export const RawJsonViewer: React.FC<RawJsonViewerProps> = ({ request, response }) => {
  const [copied, setCopied] = useState<'req' | 'res' | null>(null);
  const [activeTab, setActiveTab] = useState<'response' | 'request'>('response');

  const reqStr = JSON.stringify(request, null, 2);
  const resStr = response ? JSON.stringify(response, null, 2) : '// No response generated yet.';

  const handleCopy = (type: 'req' | 'res') => {
    const text = type === 'req' ? reqStr : resStr;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Raw JSON Inspection (Judge Audit)</h3>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('response')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'response' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Response Payload
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'request' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Request Payload
            </button>
          </div>

          <button
            onClick={() => handleCopy(activeTab === 'response' ? 'res' : 'req')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copied === (activeTab === 'response' ? 'res' : 'req') ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-72 leading-relaxed">
        {activeTab === 'response' ? resStr : reqStr}
      </pre>
    </div>
  );
};
