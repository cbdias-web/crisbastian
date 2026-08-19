import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Link as LinkIcon, Copy, Trash2, X, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
};

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none";

export default function ParceirosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', tipo: 'parceiro', percentual_comissao: 10, ativo: true, observacoes: '' });
  const [salvando, setSalvando] = useState(false);

  const { data: parceiros = [], isLoading } = useQuery({
    queryKey: ['parceiros-indicacao'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });

  const openNovo = () => { setEditando(null); setForm({ nome: '', email: '', telefone: '', tipo: 'parceiro', percentual_comissao: 10, ativo: true, observacoes: '' }); setShowForm(true); };
  const openEditar = (p) => { setEditando(p); setForm({ nome: p.nome, email: p.email, telefone: p.telefone, tipo: p.tipo || 'parceiro', percentual_comissao: p.percentual_comissao ?? 10, ativo: p.ativo !== false, observacoes: p.observacoes || '' }); setShowForm(true); };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      if (editando) {
        await base44.entities.Parceiro.update(editando.id, form);
        toast.success('Parceiro atualizado');
      } else {
        await base44.entities.Parceiro.create(form);
        toast.success('Parceiro cadastrado');
      }
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
      setShowForm(false);
    } catch (e) { toast.error('Erro: ' + e.message); }
    setSalvando(false);
  };

  const excluir = async (p) => {
    if (!confirm(`Excluir o parceiro "${p.nome}"?`)) return;
    try {
      await base44.entities.Parceiro.delete(p.id);
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
      toast.success('Parceiro excluído');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const gerarLink = async (p) => {
    try {
      const res = await base44.functions.invoke('gerarLinkIndicacao', { parceiro_id: p.id });
      navigator.clipboard.writeText(res.url);
      toast.success('Link copiado!');
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: AURORA.accent }} />
          <p className="text-sm font-bold" style={{ color: AURORA.text }}>Parceiros / Indicadores</p>
          <span className="text-xs" style={{ color: AURORA.textMuted }}>({parceiros.length})</span>
        </div>
        <button onClick={openNovo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          style={{ background: AURORA.accent, color: '#0d1117' }}>
          <Plus className="w-3.5 h-3.5" /> Novo Parceiro
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : parceiros.length === 0 ? (
        <div className="text-center py-8 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
          <p className="font-semibold" style={{ color: AURORA.text }}>Nenhum parceiro cadastrado</p>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>Cadastre parceiros e gere links de indicação</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {parceiros.map(p => (
            <div key={p.id} className="rounded-2xl p-4 transition" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, opacity: p.ativo === false ? 0.6 : 1 }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: AURORA.text }}>{p.nome}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: AURORA.textMuted }}>{p.tipo || 'parceiro'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: p.ativo !== false ? 'rgba(0,212,170,0.12)' : 'rgba(100,100,100,0.2)', color: p.ativo !== false ? AURORA.accent : '#9ca3af' }}>
                  {p.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="space-y-0.5 text-[11px]" style={{ color: AURORA.textMuted }}>
                {p.email && <p>✉️ {p.email}</p>}
                {p.telefone && <p>📱 {p.telefone}</p>}
                <p>💰 Comissão padrão: <strong style={{ color: AURORA.accent }}>{p.percentual_comissao ?? 0}%</strong></p>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <button onClick={() => gerarLink(p)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                  style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  {p.link_token ? <><Copy className="w-3 h-3" /> Copiar Link</> : <><LinkIcon className="w-3 h-3" /> Gerar Link</>}
                </button>
                <button onClick={() => openEditar(p)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                  style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                  Editar
                </button>
                <button onClick={() => excluir(p)}
                  className="px-2 py-1.5 rounded-lg transition"
                  style={{ background: 'rgba(239,68,68,0.12)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {p.link_token && (
                <p className="text-[9px] mt-2 truncate" style={{ color: 'rgba(230,237,243,0.3)' }}>/indicacao/{p.link_token.slice(0, 12)}…</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <p className="font-bold text-sm" style={{ color: AURORA.text }}>{editando ? 'Editar Parceiro' : 'Novo Parceiro'}</p>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Nome *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputCls} style={inputStyle}>
                    <option value="parceiro">Parceiro</option>
                    <option value="agente_externo">Agente Externo</option>
                    <option value="indicador">Indicador</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>E-mail</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Telefone / WhatsApp</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>% Comissão / Espelhamento</label>
                  <input type="number" value={form.percentual_comissao} onChange={e => setForm({ ...form, percentual_comissao: Number(e.target.value) })} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Status</label>
                  <select value={form.ativo ? 'true' : 'false'} onChange={e => setForm({ ...form, ativo: e.target.value === 'true' })} className={inputCls} style={inputStyle}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
              </div>
              <button onClick={salvar} disabled={salvando}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Salvar Parceiro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}