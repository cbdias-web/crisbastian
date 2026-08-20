import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Save, Plus, Trash2, CheckCircle2, Circle, Clock, User, Calendar, FileText, AlertTriangle, History, UploadCloud, Link2, FileCheck2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const STATUS_OPTIONS = [
  { value: 'aguardando_documentacao', label: 'Aguardando Documentação', color: '#fbbf24' },
  { value: 'em_andamento', label: 'Em Andamento', color: '#00D4AA' },
  { value: 'aguardando_cliente', label: 'Aguardando Cliente', color: '#60a5fa' },
  { value: 'concluido', label: 'Concluído', color: '#22c55e' },
  { value: 'concluido_feedback', label: 'Concluído - Feedback Enviado', color: '#a78bfa' },
  { value: 'cancelado', label: 'Cancelado', color: '#f87171' },
];

const PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa', color: '#6b7280' },
  { value: 'media', label: 'Média', color: '#fbbf24' },
  { value: 'alta', label: 'Alta', color: '#f97316' },
  { value: 'urgente', label: 'Urgente', color: '#ef4444' },
];

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—';
const fmtDateTime = (d) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '—';

export default function ImplantacaoModal({ implantacao, isAdmin, user, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(implantacao);
  const [novaEtapa, setNovaEtapa] = useState('');
  const [novaFaseEtapa, setNovaFaseEtapa] = useState('');
  const [novaObservacao, setNovaObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [uploadingContrato, setUploadingContrato] = useState(false);

  const handleUploadContrato = async (file) => {
    if (!file) return;
    setUploadingContrato(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, contrato_url_manual: file_url, contrato_nome_manual: file.name, contrato_encontrado: true }));
      toast.success('Contrato anexado!');
    } catch (e) {
      toast.error('Erro ao anexar: ' + e.message);
    }
    setUploadingContrato(false);
  };

  const statusCfg = STATUS_OPTIONS.find(s => s.value === form.status) || STATUS_OPTIONS[0];
  const prioridadeCfg = PRIORIDADE_OPTIONS.find(p => p.value === form.prioridade) || PRIORIDADE_OPTIONS[1];

  const handleSave = async () => {
    setSalvando(true);
    try {
      const etapas = form.etapas || [];
      const etapasConcluidas = etapas.filter(e => e.concluida).length;
      const todasConcluidas = etapas.length > 0 && etapasConcluidas === etapas.length;

      let statusFinal = form.status;
      let dataConclusao = form.data_conclusao;
      if (statusFinal === 'concluido' && !dataConclusao) {
        dataConclusao = new Date().toISOString().split('T')[0];
      }
      if (statusFinal !== 'concluido') {
        dataConclusao = '';
      }

      const historicoEntry = {
        status_anterior: implantacao.status,
        status_novo: statusFinal,
        observacao: novaObservacao || (todasConcluidas && statusFinal !== implantacao.status ? 'Todas as etapas concluídas' : ''),
        atualizado_por: user?.full_name || user?.email || 'Sistema',
        data: new Date().toISOString(),
      };

      const updateData = {
        status: statusFinal,
        prioridade: form.prioridade,
        responsavel_implantacao: form.responsavel_implantacao || '',
        data_prevista_conclusao: form.data_prevista_conclusao || '',
        data_conclusao: dataConclusao,
        etapas: etapas,
        observacoes: form.observacoes || '',
        condicoes_implantacao: form.condicoes_implantacao || '',
        contrato_url_manual: form.contrato_url_manual || '',
        contrato_nome_manual: form.contrato_nome_manual || '',
        contrato_encontrado: form.contrato_encontrado,
        historico: [...(implantacao.historico || []), historicoEntry],
      };

      const updated = await base44.entities.Implantacao.update(implantacao.id, updateData);

      // Notificar se status mudou
      if (statusFinal !== implantacao.status) {
        try {
          await base44.functions.invoke('notificarImplantacao', {
            tipo: 'atualizacao',
            implantacao_id: implantacao.id,
            status_anterior: implantacao.status,
            status_novo: statusFinal,
            observacao: novaObservacao,
          });
        } catch (e) {
          console.log('Erro na notificação:', e.message);
        }
      }

      onUpdate(updated);
      setForm(updated);
      setEditing(false);
      setNovaObservacao('');
      toast.success('Implantação atualizada!');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setSalvando(false);
  };

  const toggleEtapa = (idx) => {
    if (!editing) return;
    const etapas = [...(form.etapas || [])];
    etapas[idx] = {
      ...etapas[idx],
      concluida: !etapas[idx].concluida,
      concluida_em: !etapas[idx].concluida ? new Date().toISOString() : '',
    };
    setForm(f => ({ ...f, etapas }));
  };

  const addEtapa = () => {
    if (!novaEtapa.trim()) return;
    const etapas = [...(form.etapas || []), { fase: novaFaseEtapa.trim() || 'Personalizada', descricao: novaEtapa.trim(), concluida: false, concluida_em: '' }];
    setForm(f => ({ ...f, etapas }));
    setNovaEtapa('');
    setNovaFaseEtapa('');
  };

  const removeEtapa = (idx) => {
    const etapas = (form.etapas || []).filter((_, i) => i !== idx);
    setForm(f => ({ ...f, etapas }));
  };

  const etapasConcluidas = (form.etapas || []).filter(e => e.concluida).length;
  const totalEtapas = (form.etapas || []).length;
  const progresso = totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 60%, #16213e 100%)', borderBottom: `1px solid ${AURORA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AURORA.accentDim }}>
              <FileText className="w-5 h-5" style={{ color: AURORA.accent }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: AURORA.text }}>{form.cliente_nome || 'Implantação'}</h2>
              <p className="text-xs" style={{ color: AURORA.textMuted }}>{form.produto}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !editing && (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: AURORA.accentDim, color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                Editar
              </button>
            )}
            {editing && (
              <button onClick={handleSave} disabled={salvando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' }}>
                <Save className="w-3.5 h-3.5" /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: AURORA.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Contrato vinculado */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <FileCheck2 className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Contrato</p>
            </div>
            {form.contrato_encontrado ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <Link2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: AURORA.text }}>
                    {form.contrato_nome_manual ? form.contrato_nome_manual : (form.contrato_id ? 'Contrato vinculado automaticamente' : 'Contrato anexado')}
                  </p>
                  <p className="text-xs" style={{ color: AURORA.textMuted }}>
                    {form.contrato_nome_manual ? 'Anexado manualmente' : form.contrato_id ? `ID: ${form.contrato_id.substring(0, 8)}...` : '—'}
                  </p>
                </div>
                {form.contrato_url_manual && (
                  <a href={form.contrato_url_manual} target="_blank" rel="noreferrer"
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition flex-shrink-0"
                    style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    Ver arquivo
                  </a>
                )}
                {form.contrato_id && !form.contrato_url_manual && (
                  <a href={`/Contratos`} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition flex-shrink-0"
                    style={{ background: AURORA.accentDim, color: AURORA.accent }}>
                    Ver contrato
                  </a>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.15)' }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: '#fbbf24' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: '#fbbf24' }}>Contrato não localizado no sistema</p>
                    <p className="text-xs" style={{ color: AURORA.textMuted }}>
                      {editing ? 'Anexe o contrato manualmente abaixo e especifique as condições de implantação' : 'Aguardando anexamento manual pelo responsável'}
                    </p>
                  </div>
                </div>
                {editing && (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg cursor-pointer transition border-2 border-dashed"
                      style={{ borderColor: AURORA.border, background: AURORA.bg }}>
                      {uploadingContrato ? (
                        <span className="text-xs" style={{ color: AURORA.accent }}>Enviando...</span>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5" style={{ color: AURORA.textMuted }} />
                          <span className="text-xs" style={{ color: AURORA.textMuted }}>Clique para anexar o contrato (PDF)</span>
                        </>
                      )}
                      <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadContrato(e.target.files[0])} />
                    </label>
                    {form.contrato_url_manual && (
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                        <span style={{ color: AURORA.text }} className="flex-1 truncate">{form.contrato_nome_manual}</span>
                        <button onClick={() => setForm(f => ({ ...f, contrato_url_manual: '', contrato_nome_manual: '', contrato_encontrado: false }))}
                          className="p-0.5" style={{ color: '#f87171' }}><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.textMuted }}>Status</p>
              {editing ? (
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full" style={{ background: `${statusCfg.color}22`, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.textMuted }}>Prioridade</p>
              {editing ? (
                <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                  {PRIORIDADE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full" style={{ background: `${prioridadeCfg.color}22`, color: prioridadeCfg.color }}>
                  {prioridadeCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={User} label="Vendedor" value={form.vendedor_nome} />
            <InfoRow icon={User} label="Responsável" value={form.responsavel_implantacao || 'Não definido'} editable={editing} onChange={v => setForm(f => ({ ...f, responsavel_implantacao: v }))} />
            <InfoRow icon={Crown} label="Padrinho" value={form.padrinho_nome || 'Não definido'} />
            <InfoRow icon={Calendar} label="Entrada" value={fmtDate(form.data_entrada)} />
            <InfoRow icon={Calendar} label="Prev. Conclusão" value={fmtDate(form.data_prevista_conclusao)} editable={editing} type="date" onChange={v => setForm(f => ({ ...f, data_prevista_conclusao: v }))} />
            <InfoRow icon={Calendar} label="Conclusão" value={fmtDate(form.data_conclusao)} />
            <InfoRow icon={FileText} label="Valor" value={fmtVal(form.valor_contrato)} />
          </div>

          {/* Progresso */}
          {totalEtapas > 0 && (
            <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: AURORA.text }}>Progresso das Etapas</p>
                <span className="text-xs font-bold" style={{ color: AURORA.accent }}>{etapasConcluidas}/{totalEtapas} ({progresso}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: AURORA.bg }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progresso}%`, background: 'linear-gradient(90deg, #00D4AA, #0066cc)' }} />
              </div>
            </div>
          )}

          {/* Etapas por fase */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Checklist de Implantação</p>
              {editing && (
                <div className="flex items-center gap-1">
                  <input value={novaFaseEtapa} onChange={e => setNovaFaseEtapa(e.target.value)} placeholder="Fase (opcional)" className="text-xs px-2 py-1 rounded-lg focus:outline-none w-24" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                  <input value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEtapa()} placeholder="Nova etapa..." className="text-xs px-2 py-1 rounded-lg focus:outline-none w-32" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
                  <button onClick={addEtapa} className="p-1 rounded-lg transition" style={{ background: AURORA.accentDim, color: AURORA.accent }}><Plus className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
            {(form.etapas || []).length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: AURORA.textMuted }}>Nenhuma etapa cadastrada</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  (form.etapas || []).reduce((acc, etapa, idx) => {
                    const fase = etapa.fase || 'Geral';
                    if (!acc[fase]) acc[fase] = [];
                    acc[fase].push({ ...etapa, _idx: idx });
                    return acc;
                  }, {})
                ).map(([fase, etapasFase]) => {
                  const concluidasFase = etapasFase.filter(e => e.concluida).length;
                  return (
                    <div key={fase}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.accent, opacity: 0.8 }}>{fase}</span>
                        <div className="flex-1 h-px" style={{ background: AURORA.border }} />
                        <span className="text-[10px] font-semibold" style={{ color: AURORA.textMuted }}>{concluidasFase}/{etapasFase.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {etapasFase.map((etapa) => (
                          <div key={etapa._idx} className="flex items-center gap-2 group">
                            <button onClick={() => toggleEtapa(etapa._idx)} disabled={!editing} className="flex-shrink-0">
                              {etapa.concluida ? <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} /> : <Circle className="w-4 h-4" style={{ color: AURORA.textMuted }} />}
                            </button>
                            <span className={`flex-1 text-sm ${etapa.concluida ? 'line-through' : ''}`} style={{ color: etapa.concluida ? AURORA.textMuted : AURORA.text }}>{etapa.descricao}</span>
                            {etapa.concluida_em && <span className="text-[10px]" style={{ color: AURORA.textMuted }}>{fmtDateTime(etapa.concluida_em)}</span>}
                            {editing && <button onClick={() => removeEtapa(etapa._idx)} className="opacity-0 group-hover:opacity-100 transition p-0.5" style={{ color: '#f87171' }}><Trash2 className="w-3 h-3" /></button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Observação (editing) */}
          {editing && (
            <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>Observação da Atualização</p>
              <textarea value={novaObservacao} onChange={e => setNovaObservacao(e.target.value)} placeholder="Adicione uma observação sobre esta atualização (opcional)..." rows={2} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
              <p className="text-[10px] mt-1" style={{ color: AURORA.textMuted }}>Será registrada no histórico e enviada na notificação</p>
            </div>
          )}

          {/* Condições de implantação */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>Condições de Implantação</p>
            {editing ? (
              <textarea value={form.condicoes_implantacao || ''} onChange={e => setForm(f => ({ ...f, condicoes_implantacao: e.target.value }))} placeholder="Especifique condições especiais: prazos, exigências técnicas, dependências externas, etc..." rows={3} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            ) : (
              <p className="text-sm" style={{ color: form.condicoes_implantacao ? AURORA.text : AURORA.textMuted }}>{form.condicoes_implantacao || 'Sem condições especiais'}</p>
            )}
          </div>

          {/* Observações gerais */}
          <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: AURORA.accent }}>Observações Gerais</p>
            {editing ? (
              <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            ) : (
              <p className="text-sm" style={{ color: form.observacoes ? AURORA.text : AURORA.textMuted }}>{form.observacoes || 'Sem observações'}</p>
            )}
          </div>

          {/* Histórico */}
          {(form.historico || []).length > 0 && (
            <div className="rounded-xl p-4" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: AURORA.accent }}>Histórico de Atualizações</p>
              </div>
              <div className="space-y-2">
                {[...(form.historico || [])].reverse().map((h, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: AURORA.accent }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.status_anterior && h.status_novo && (
                          <span style={{ color: AURORA.text }}>
                            <span style={{ color: AURORA.textMuted }}>{STATUS_OPTIONS.find(s => s.value === h.status_anterior)?.label || h.status_anterior}</span>
                            {' → '}
                            <span style={{ color: AURORA.accent, fontWeight: 600 }}>{STATUS_OPTIONS.find(s => s.value === h.status_novo)?.label || h.status_novo}</span>
                          </span>
                        )}
                        {h.observacao && <span style={{ color: AURORA.text }}>— {h.observacao}</span>}
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: AURORA.textMuted }}>{h.atualizado_por} · {fmtDateTime(h.data)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, editable, onChange, type }) {
  return (
    <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: AURORA.textMuted }} />
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: AURORA.textMuted }}>{label}</p>
      </div>
      {editable ? (
        <input type={type || 'text'} value={type === 'date' ? (value === '—' ? '' : (typeof value === 'string' && value.includes('/') ? '' : value)) : value} onChange={e => onChange(e.target.value)} className="w-full text-sm rounded-lg px-2 py-1 focus:outline-none" style={{ background: AURORA.bg, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
      ) : (
        <p className="text-sm font-medium" style={{ color: AURORA.text }}>{value}</p>
      )}
    </div>
  );
}