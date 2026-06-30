import { useTaskStore } from '../../stores/useTaskStore';
import { Loader2, CheckCircle, Clock, AlertCircle, Cpu } from 'lucide-react';

export default function AgentTrace() {
  const { agentTrace, isReplanning } = useTaskStore();

  if (!isReplanning && agentTrace.length === 0) return null;

  return (
    <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4 animate-fade-in mb-6">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Agent Replanning Trace</h3>
            <p className="text-[10px] text-slate-500">Live Gemini function-calling loop running in-browser</p>
          </div>
        </div>
        {isReplanning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Active
          </span>
        )}
      </div>

      <div className="space-y-3">
        {agentTrace.map((step) => {
          let stateColor = 'border-slate-800 bg-slate-900/30 text-slate-500';
          let StatusIcon = Clock;

          if (step.status === 'running') {
            stateColor = 'border-blue-500/50 bg-blue-500/5 text-blue-300 ring-2 ring-blue-500/10';
            StatusIcon = Loader2;
          } else if (step.status === 'completed') {
            stateColor = 'border-green-500/30 bg-green-500/5 text-green-300';
            StatusIcon = CheckCircle;
          } else if (step.status === 'failed') {
            stateColor = 'border-red-500/30 bg-red-500/5 text-red-300';
            StatusIcon = AlertCircle;
          }

          return (
            <div
              key={step.id}
              className={`border rounded-xl p-3.5 flex items-start gap-3 transition-all duration-300 ${stateColor}`}
            >
              <div className="mt-0.5">
                <StatusIcon className={`w-4 h-4 ${step.status === 'running' ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold tracking-wide uppercase">
                    {step.toolName}
                  </span>
                  {step.completedAt && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(step.completedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{step.summary}</p>
                
                {/* Print args if available */}
                {!!step.input && step.status === 'running' && (
                  <pre className="text-[9px] font-mono text-slate-500 mt-1 bg-slate-900/50 p-1.5 rounded overflow-x-auto">
                    Input: {JSON.stringify(step.input)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
