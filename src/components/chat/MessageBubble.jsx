import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, Download } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Buscando dados';
  const status = toolCall?.status || 'pending';

  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Aguardando' },
    running: { icon: Loader2, color: 'text-slate-500', text: 'Buscando...', spin: true },
    in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Buscando...', spin: true },
    completed: { icon: CheckCircle2, color: 'text-green-600', text: 'Concluído' },
    success: { icon: CheckCircle2, color: 'text-green-600', text: 'Concluído' },
    failed: { icon: AlertCircle, color: 'text-red-500', text: 'Falhou' },
    error: { icon: AlertCircle, color: 'text-red-500', text: 'Falhou' },
  }[status] || { icon: Zap, color: 'text-slate-500', text: '' };

  const Icon = statusConfig.icon;
  const label = name.replace(/_/g, ' ').toLowerCase();

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all"
        style={{
          background: expanded ? 'rgba(0,212,170,0.10)' : '#1c2333',
          borderColor: expanded ? 'rgba(0,212,170,0.35)' : 'rgba(0,212,170,0.15)',
        }}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span style={{ color: '#e6edf3' }}>{label}</span>
        {statusConfig.text && <span style={{ color: 'rgba(230,237,243,0.55)' }}>· {statusConfig.text}</span>}
        {!statusConfig.spin && <ChevronRight className={cn("h-3 w-3 transition-transform ml-auto", expanded && "rotate-90")} style={{ color: 'rgba(230,237,243,0.4)' }} />}
      </button>
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div
            className="rounded-2xl px-4 py-2.5"
            style={isUser
              ? { background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }
              : { background: '#1c2333', border: '1px solid rgba(0,212,170,0.15)', color: '#e6edf3' }}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium inline-flex items-center gap-1"
                      style={{ color: '#00D4AA' }}
                    >
                      {children}
                      <Download className="w-3 h-3 inline" />
                    </a>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{children}</code>
                    ) : (
                      <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2 text-xs">
                        <code>{children}</code>
                      </pre>
                    ),
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <FunctionDisplay key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}