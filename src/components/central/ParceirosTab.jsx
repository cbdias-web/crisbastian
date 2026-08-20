import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Link as LinkIcon, Copy, Trash2, X, Loader2, Send, Mail, Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
  warning: '#fbbf24',
  green: '#34d399',
};

const inputStyle = { background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none";

export default function ParceirosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', percentual_comissao: 10, receber_notificacoes: true, ativo: true, observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const [enviandoConvite, setEnviandoConvite] = useState(null);

  const { data: indicadores = [], isLoading } = useQuery({
    queryKey: ['parceiros-indicacao'],
    queryFn: () => base44.entities.Parceiro.list('nome'),
  });

  const openNovo = () => {
    setEditando(null);
    setForm({ nome: '', email: '', telefone: '', percentual_comissao: 10, receber_notificacoes: true, ativo: true, observacoes: '' });
    setShowForm(true);
  };
  const openEditar = (p) => {
    setEditando(p);
    setForm({
      nome: p.nome, email: p.email, telefone: p.telefone,
      percentual_comissao: p.percentual_comissao ?? 10,
      receber_notificacoes: p.receber_notificacoes !== false,
      ativo: p.ativo !== false, observacoes: p.observacoes || '',
    });
    setShowForm(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      const payload = { ...form, tipo: 'indicador' };
      if (editando) {
        await base44.entities.Parceiro.update(editando.id, payload);
        toast.success('Indicador atualizado');
      } else {
        const novo = await base44.entities.Parceiro.create(payload);
        // Ao criar um novo indicador já o cadastra como usuário da plataforma
        // (envia o convite por e-mail) — assim o portal o reconhece como usuário.
        if (novo.email && novo.email.trim()) {
          try {
            const res = await base44.functions.invoke('convidarIndicador', { indicador_id: novo.id, app_origin: window.location.origin });
            toast.success(`Indicador cadastrado e convite enviado para ${res.enviado_para}`);
          } catch (e) {
            const detalhe = e?.response?.data?.error || e?.data?.error || e?.message || 'erro desconhecido';
            toast.success('Indicador cadastrado (convite não enviado: ' + detalhe + ')');
          }
        } else {
          toast.success('Indicador cadastrado');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
      setShowForm(false);
    } catch (e) { toast.error('Erro: ' + e.message); }
    setSalvando(false);
  };

  const excluir = async (p) => {
    if (!confirm(`Excluir o indicador "${p.nome}"?`)) return;
    try {
      await base44.entities.Parceiro.delete(p.id);
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
      toast.success('Indicador excluído');
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const gerarLink = async (p) => {
    try {
      const res = await base44.functions.invoke('gerarLinkIndicacao', { parceiro_id: p.id });
      const url = `${window.location.origin}/indicacao/${res.token}`;
      navigator.clipboard.writeText(url);
      toast.success('Link de indicação copiado!');
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
    } catch (e) { toast.error('Erro: ' + e.message); }
  };

  const enviarConvite = async (p) => {
    if (!p.email) { toast.error('Cadastre um e-mail antes de enviar o convite'); return; }
    setEnviandoConvite(p.id);
    try {
      const res = await base44.functions.invoke('convidarIndicador', { indicador_id: p.id, app_origin: window.location.origin });
      toast.success(`Convite enviado para ${res.enviado_para}${res.usuario_existia ? ' (usuário já cadastrado — convite reenviado)' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['parceiros-indicacao'] });
    } catch (e) {
      // Extrai a mensagem real devolvida pelo backend (o SDK às vezes esconde o body)
      const detalhe = e?.response?.data?.error || e?.data?.error || e?.message || 'Erro desconhecido';
      toast.error('Erro ao enviar convite: ' + detalhe);
    }
    setEnviandoConvite(null);
  };

  const copiarPortal = (p) => {
    if (!p.link_token) { toast.error('Envie o convite primeiro para gerar o link do portal'); return; }
    const url = `${window.location.origin}/portal-indicador/${p.link_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link do portal copiado!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: AURORA.accent }} />
          <p className="text-sm font-bold" style={{ color: AURORA.text }}>Indicadores</p>
          <span className="text-xs" style={{ color: AURORA.textMuted }}>({indicadores.length})</span>
        </div>
        <button onClick={openNovo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          style={{ background: AURORA.accent, color: '#0d1117' }}>
          <Plus className="w-3.5 h-3.5" /> Novo Indicador
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: AURORA.textMuted }} /></div>
      ) : indicadores.length === 0 ? (
        <div className="text-center py-8 rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: AURORA.textMuted }} />
          <p className="font-semibold" style={{ color: AURORA.text }}>Nenhum indicador cadastrado</p>
          <p className="text-sm mt-1" style={{ color: AURORA.textMuted }}>Cadastre um indicador e envie o convite do portal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {indicadores.map(p => (
            <div key={p.id} className="rounded-2xl p-4 transition" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, opacity: p.ativo === false ? 0.6 : 1 }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4AA22, #0066cc22)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: AURORA.text }}>{p.nome}</p>
                    <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: AURORA.textMuted }}>
                      Indicador
                      {p.receber_notificacoes !== false
                        ? <Bell className="w-2.5 h-2.5" style={{ color: AURORA.accent }} />
                        : <BellOff className="w-2.5 h-2.5" />}
                    </p>
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
              {/* Status do convite / termo */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {p.termo_aceito ? (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(52,211,153,0.15)', color: AURORA.green }}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Termo aceito
                  </span>
                ) : p.convite_enviado ? (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: AURORA.warning }}>Convite enviado · aguardando aceite</span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(100,100,100,0.2)', color: '#9ca3af' }}>Sem convite</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <button onClick={() => enviarConvite(p)} disabled={enviandoConvite === p.id}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition disabled:opacity-40"
                  style={{ background: 'rgba(59,130,249,0.14)', color: '#60a5fa', border: '1px solid rgba(59,130,249,0.3)' }}>
                  {enviandoConvite === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  {p.convite_enviado ? 'Reenviar' : 'Enviar Convite'}
                </button>
                <button onClick={() => copiarPortal(p)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                  style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}
                  title="Copiar link do portal">
                  <LinkIcon className="w-3 h-3" />
                </button>
                <button onClick={() => gerarLink(p)}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition"
                  style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}
                  title="Copiar link de indicação rápida">
                  <Copy className="w-3 h-3" />
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
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
              <p className="font-bold text-sm" style={{ color: AURORA.text }}>{editando ? 'Editar Indicador' : 'Novo Indicador'}</p>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Nome *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="para enviar o convite do portal" className={inputCls} style={inputStyle} />
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
              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
                <input type="checkbox" checked={form.receber_notificacoes} onChange={e => setForm({ ...form, receber_notificacoes: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <div>
                  <p className="text-xs font-semibold" style={{ color: AURORA.text }}>Receber notificações de movimentações</p>
                  <p className="text-[10px]" style={{ color: AURORA.textMuted }}>O indicador recebe e-mails sobre o status dos seus leads</p>
                </div>
              </label>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: AURORA.textMuted }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
              </div>
              <button onClick={salvar} disabled={salvando}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Salvar Indicador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}