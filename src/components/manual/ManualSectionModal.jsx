import { CheckCircle2, X } from 'lucide-react';

// Modal de leitura dos temas do Manual: substitui a expansão inline do
// acordeão (conteúdo espremido em colunas estreitas) por uma janela ampla,
// com rolagem interna e tipografia confortável.
export default function ManualSectionModal({ section, onClose }) {
  const Icon = section.icon;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl my-6"
        style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, #0d1117 0%, #1a1a2e 100%)`,
            borderBottom: '1px solid rgba(0,212,170,0.18)',
          }}
        >
          <div className={`p-2 rounded-lg bg-gradient-to-br ${section.color} shadow-sm flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(230,237,243,0.45)' }}>
              Manual da Plataforma
            </p>
            <h3 className="text-base font-bold leading-tight" style={{ color: '#e6edf3' }}>
              {section.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition flex-shrink-0"
            style={{ color: 'rgba(230,237,243,0.55)', background: 'rgba(255,255,255,0.05)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(230,237,243,0.55)')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 space-y-6">
          {section.content.map((block, i) => (
            <div key={i}>
              <h4 className="font-semibold text-sm mb-2.5 flex items-center gap-2" style={{ color: '#00D4AA' }}>
                <span className={`w-1 h-4 rounded-full bg-gradient-to-b ${section.color} flex-shrink-0`} />
                {block.subtitle}
              </h4>
              {block.text && (
                <p className="text-sm leading-relaxed ml-3" style={{ color: '#adbac7' }}>
                  {block.text}
                </p>
              )}
              {block.steps && (
                <ol className="ml-3 space-y-2">
                  {block.steps.map((step, si) => (
                    <li key={si} className="flex items-start gap-2.5 text-sm" style={{ color: '#adbac7' }}>
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${section.color} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}
                      >
                        {si + 1}
                      </span>
                      <span
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: step.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e6edf3">$1</strong>'),
                        }}
                      />
                    </li>
                  ))}
                </ol>
              )}
              {block.items && (
                <ul className="ml-3 space-y-2">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2 text-sm" style={{ color: '#adbac7' }}>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60" style={{ color: '#00D4AA' }} />
                      <span
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e6edf3">$1</strong>'),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}