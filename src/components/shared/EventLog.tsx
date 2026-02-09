import React, { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

export interface EventLogProps {
  events: string[];
}

export function EventLog({ events }: EventLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-slate-600" />
        <h4 className="text-sm font-medium text-slate-900">Event Log</h4>
      </div>
      <div
        ref={logRef}
        className="p-3 h-48 overflow-y-auto font-mono text-xs text-slate-700 space-y-1"
      >
        {events.length === 0 ? (
          <p className="text-slate-400">No events yet...</p>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-slate-400 min-w-[40px]">{idx + 1}.</span>
              <span>{event}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
