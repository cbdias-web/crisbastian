import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, FileDown, Gift, Loader2, Trophy, Clock, CheckCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

const A = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  gold: '#D4AF37',
};

const fmtDataHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function RelatorioRoletaModal({ roletas, onClose }) {
  const [exportando, setExportando] = useState(false);

  const stats = useMemo(() => {
    const totalLib = roletas.length;
    const giradas = roletas.filter(r => r.ja_girou);
    const totalGir = giradas.length;
    const pendentes = roletas.filter(r => r.ativo && !r.ja_girou).length;

    const porPremio = {};
    giradas.forEach(r => {
      const p = r.premio || '—';
      porPremio[p] = (porPremio[p] || 0) + 1;
    });

    return { totalLib, totalGir, pendentes, giradas, porPremio };
  }, [roletas]);

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const resp = await base44.functions.invoke('gerarRelatorioRoletaPDF', {});
      if (resp?.data?.pdf_base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${resp.data.pdf_base64}`;
        link.download = resp.data.filename || 'relatorio_roleta.pdf';
        link.click();
        toast.success('PDF gerado!');
      } else {
        toast.error('Erro ao gerar PDF');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erro ao gerar PDF');
    }
    setExportando(false);
  };

  const cards = [
    { label: 'Total Liberados', value: stats.totalLib, icon: Gift, color: A.accent },
    { label: 'Prêmios Resgatados', value: stats.totalGir, icon: Trophy, color: A.gold },
    { label: 'Pendentes de Girar', value: stats.pendentes, icon: Clock, color: '#f59e0b' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: A.bg, border: `1px solid ${A.border}` }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${A.border}`, background: 'linear-gradient(135deg, #0d1117, #1a1a2e)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: A.accentDim }}>
              <Gift className="w-5 h-5" style={{ color: A.accent }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: A.text }}>Relatório de Prêmios da Roleta</h2>
              <p className="text-xs" style={{ color: A.textMuted }}>
                {stats.giradas.length} prêmio{stats.giradas.length !== 1 ? 's' : ''} resgatado{stats.giradas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportarPDF} disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${A.accent}, #0066cc)`, color: '#0d1117' }}>
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Exportar PDF
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg transition" style={{ color: A.textMuted }}
              onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {cards.map((c, i) => (
              <div key={i} className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: A.surface, border: `1px solid ${A.border}` }}>
                <div className="p-2 rounded-lg" style={{ background: `${c.color}18` }}>
                  <c.icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: A.text }}>{c.value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: A.textMuted }}>{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Distribuição de prêmios */}
          {Object.keys(stats.porPremio).length > 0 && (
            <div className="rounded-xl p-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4" style={{ color: A.gold }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: A.gold }}>Distribuição de Prêmios</p>
              </div>
              <div className="space-y-2">
                {Object.entries(stats.porPremio).map(([premio, count]) => {
                  const pct = (count / stats.totalGir) * 100;
                  return (
                    <div key={premio} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate" style={{ color: A.text }}>{premio}</span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,170,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 15)}%`, background: `linear-gradient(90deg, ${A.accent}, #0066cc)` }}>
                          <span className="text-[10px] font-bold" style={{ color: '#0d1117' }}>{count}x</span>
                        </div>
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: A.textMuted }}>{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela de prêmios resgatados */}
          <div className="rounded-xl overflow-hidden" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${A.border}` }}>
              <CheckCircle className="w-4 h-4" style={{ color: A.accent }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: A.accent }}>Prêmios Resgatados</p>
            </div>
            {stats.giradas.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: A.textMuted }} />
                <p className="text-sm" style={{ color: A.textMuted }}>Nenhum prêmio resgatado ainda</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>Usuário</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>E-mail</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>Tipo</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>Prêmio</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: A.textMuted }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.giradas.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: `1px solid ${A.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = A.accentDim}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: A.text }}>{r.user_nome || '—'}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: A.textMuted }}>{r.user_email || '—'}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: A.text }}>
                        {r.tipo === 'brincadeira'
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>🎉 Brincadeira</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,212,170,0.12)', color: A.accent }}>🎁 Padrão</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: A.gold }}>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(212,175,55,0.1)' }}>
                          {r.premio || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-right" style={{ color: A.textMuted }}>{fmtDataHora(r.girado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pendentes */}
          {stats.pendentes > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />
              <p className="text-sm" style={{ color: '#fbbf24' }}>
                <strong>{stats.pendentes}</strong> usuário{stats.pendentes > 1 ? 's' : ''} com roleta liberada mas ainda não girou{stats.pendentes > 1 ? 'ram' : ''}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}