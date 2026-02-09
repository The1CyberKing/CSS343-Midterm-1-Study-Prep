import React from 'react';

export interface InspectorProps {
  title: string;
  data: Array<{ label: string; value: string | number | null; highlight?: boolean }>;
  violations?: string[];
}

export function Inspector({ title, data, violations }: InspectorProps) {
  return (
    <div className="bg-white border-l border-slate-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
      
      {data.length === 0 ? (
        <p className="text-slate-500 text-sm">No element selected</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <span className="text-sm text-slate-600">{item.label}:</span>
              <span
                className={`text-sm font-medium ${
                  item.highlight ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {item.value !== null && item.value !== undefined
                  ? item.value
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {violations && violations.length > 0 && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-semibold text-red-900 mb-2">
            Invariant Violations
          </h4>
          <ul className="space-y-1">
            {violations.map((v, idx) => (
              <li key={idx} className="text-xs text-red-700">
                • {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
