import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Search, Globe, User, Building2, Loader2, ChevronRight, CheckCircle2, Circle, Link2 } from 'lucide-react';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
};

const STATUS_CFG = {
  rascunho: { label: 'Rascunho', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  concluido: { label: 'Concluído', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  enviado: { label: 'Enviado', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
};

export default function CiListModal({ onClose, onOpenCi }) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const { data: rncs = [], isLoading } = useQuery({
    queryKey: ['rnc-conta-internacional-lista'],
    queryFn: () => base44.entities.RncContaInternacional.list('-updated_date', 500),
  });

  const rncsFiltrados = rncs.filter(r => {
    if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const nome = (r.secao3_nome || r.secao1_pj_razao_social || '').toLowerCase();
      const doc = (r.secao3_cpf || r.secao1_pj_cnpj || '').toLowerCase();
      return nome.includes(q) || doc.includes(q);
    }
    return true;
  });

  const preenchidos = rncs.filter(r => r.link_preenchido_em).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-4xl max-h-[calc(100vh-140px)] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: AURORA.bg, border: `1px solid ${AURORA.borderActive}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${AURORA.surface} 0%, ${AURORA.surface2} 100%)`, borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,249,0.15)' }}>
              <Globe className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>Formulários — Conta Internacional</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>
                {rncs.length} formulário(s) · {preenchidos} preenchido(s) pelo cliente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/10">
            <X className="w-5 h-5" style={{ color: AURORA.textMuted }} />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: AURORA.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CPF/CNPJ..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: AURORA.accent }} /></div>
          ) : rncsFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted, opacity: 0.3 }} />
              <p className="text-sm" style={{ color: AURORA.textMuted }}>Nenhum formulário encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rncsFiltrados.map(r => {
                const st = STATUS_CFG[r.status] || STATUS_CFG.rascunho;
                const isPJ = r.tipo_conta === 'PJ';
                const nome = r.secao3_nome || r.secao1_pj_razao_social || '—';
                const doc = r.secao3_cpf || r.secao1_pj_cnpj || '—';
                const docsOk = (r.documentos || []).filter(d => d.recebido).length;
                const docsTotal = (r.documentos || []).length;
                const preenchido = !!r.link_preenchido_em;
                return (
                  <div key={r.id} onClick={() => onOpenCi(r)}
                    className="rounded-xl p-4 flex items-center gap-3 transition cursor-pointer group"
                    style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = AURORA.borderActive; e.currentTarget.style.background = AURORA.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = AURORA.border; e.currentTarget.style.background = AURORA.surface; }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: preenchido ? 'rgba(52,211,153,0.15)' : AURORA.accentDim }}>
                      {preenchido
                        ? <CheckCircle2 className="w-4 h-4" style={{ color: '#34d399' }} />
                        : <Circle className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {isPJ ? <Building2 className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} /> : <User className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />}
                        <p className="text-sm font-semibold truncate" style={{ color: AURORA.text }}>{nome}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {r.contrato_id ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: AURORA.accentDim, color: AURORA.accent }}>Vinculado a contrato</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(168,85,247,0.12)', color: '#a78bfa' }}>
                            <Link2 className="w-2.5 h-2.5" /> Independente
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: AURORA.textMuted }}>
                        {doc} · {isPJ ? 'PJ' : 'PF'} · {docsOk}/{docsTotal} docs
                        {preenchido && ` · preenchido em ${new Date(r.link_preenchido_em).toLocaleDateString('pt-BR')}`}
                        {r.pdf_url && ' · PDF gerado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition" style={{ color: AURORA.accent }}>
                      <span className="text-[10px] font-semibold hidden sm:inline">Abrir</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}