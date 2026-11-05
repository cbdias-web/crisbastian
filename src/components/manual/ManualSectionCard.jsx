import React from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';

export default function ManualSectionCard({ section, onOpen }) {
  const Icon = section.icon || BookOpen;
  const topicos = section.content?.length || 0;
  const resumo = section.content?.[0]?.subtitle || '';

  return (
    <button
      onClick={onOpen}
      className="group w-full h-full text-left rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'rgba(22,27,34,0.78)', border: '1px solid rgba(0,212,170,0.12)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(0,212,170,0.4)';
        e.currentTarget.style.boxShadow = '0 14px 30px -22px rgba(0,212,170,0.9)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(0,212,170,0.12)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug" style={{ color: '#e6edf3' }}>
            {section.title}
          </span>
          <span className="block text-[10px] uppercase tracking-wider mt-1" style={{ color: 'rgba(230,237,243,0.4)' }}>
            {topicos} {topicos === 1 ? 'tópico' : 'tópicos'}
          </span>
        </span>
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'rgba(230,237,243,0.3)' }}
        />
      </div>
      {resumo && (
        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'rgba(230,237,243,0.45)' }}>
          {resumo}
        </p>
      )}
    </button>
  );
}