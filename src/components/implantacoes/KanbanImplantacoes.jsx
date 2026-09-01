import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { User, Calendar, Link2, FileWarning, Clock, AlertTriangle, Crown } from 'lucide-react';
import { format } from 'date-fns';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const COLUNAS = [
  { key: 'aguardando_documentacao', label: 'Aguard. Documentação', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  { key: 'em_andamento', label: 'Em Andamento', color: '#00D4AA', bg: 'rgba(0,212,170,0.10)' },
  { key: 'aguardando_cliente', label: 'Aguard. Cliente', color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  { key: 'concluido', label: 'Concluído', color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  { key: 'concluido_feedback', label: 'Concluído - Feedback Enviado', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  { key: 'cancelado', label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
];

const PRIORIDADE_DOT = {
  baixa: '#6b7280',
  media: '#fbbf24',
  alta: '#f97316',
  urgente: '#ef4444',
};

const fmtDate = (d) => d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yy') : '—';
const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export default function KanbanImplantacoes({ implantacoes, onSelectImplantacao, isAdmin, onRefresh }) {
  const [draggingId, setDraggingId] = useState(null);

  const onDragEnd = async (result) => {
    setDraggingId(null);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const novoStatus = destination.droppableId;
    if (novoStatus === source.droppableId) return;

    try {
      const impl = implantacoes.find(i => i.id === draggableId);

      // ── Trava de workflow: não permite mover de coluna sem o Link de Abertura CC ──
      // Produtos sem abertura de conta corrente (RATING, SCORE, HORA TÉCNICA) são isentos.
      const PRODUTOS_ISENTOS_CC = ['RATING', 'SCORE', 'HORA TÉCNICA'];
      const isentoCC = PRODUTOS_ISENTOS_CC.some(p => (impl.produto || '').toUpperCase().includes(p));
      if (!isentoCC && !(impl.link_abertura_cc || '').trim()) {
        toast.error('Preencha o Link de Abertura CC (e o Rate) antes de mover este lead de status.');
        onRefresh();
        return;
      }

      const historicoEntry = {
        status_anterior: impl.status,
        status_novo: novoStatus,
        observacao: `Status alterado via Kanban`,
        atualizado_por: 'Kanban',
        data: new Date().toISOString(),
      };

      const updateData = {
        status: novoStatus,
        historico: [...(impl.historico || []), historicoEntry],
      };

      if ((novoStatus === 'concluido' || novoStatus === 'concluido_feedback') && !impl.data_conclusao) {
        updateData.data_conclusao = new Date().toISOString().split('T')[0];
      }
      if (novoStatus !== 'concluido' && novoStatus !== 'concluido_feedback') {
        updateData.data_conclusao = '';
      }

      await base44.entities.Implantacao.update(draggableId, updateData);

      // Notificar mudança de status
      try {
        await base44.functions.invoke('notificarImplantacao', {
          tipo: 'atualizacao',
          implantacao_id: draggableId,
          status_anterior: impl.status,
          status_novo: novoStatus,
          observacao: '',
        });
      } catch (e) {}

      toast.success(`Movido para ${COLUNAS.find(c => c.key === novoStatus)?.label}`);
      onRefresh();
    } catch (err) {
      toast.error('Erro ao mover: ' + err.message);
    }
  };

  const porStatus = (status) => implantacoes.filter(i => (i.status || 'aguardando_documentacao') === status);

  return (
    <DragDropContext onDragStart={(start) => setDraggingId(start.draggableId)} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 'calc(100vh - 360px)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,170,0.4) transparent' }}>
        {COLUNAS.map(col => {
          const items = porStatus(col.key);
          return (
            <div key={col.key} className="flex flex-col rounded-2xl flex-1 min-w-[180px]" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl flex-shrink-0" style={{ borderBottom: `1px solid ${col.color}33` }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <p className="text-xs font-bold" style={{ color: col.color }}>{col.label}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${col.color}22`, color: col.color }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] transition"
                    style={{
                      background: snapshot.isDraggingOver ? `${col.color}11` : 'transparent',
                      borderRadius: '0 0 16px 16px',
                    }}
                  >
                    {items.length === 0 && (
                      <p className="text-center text-[11px] py-6" style={{ color: AURORA.textMuted }}>
                        Arraste para cá
                      </p>
                    )}
                    {items.map((imp, index) => {
                      const etapas = imp.etapas || [];
                      const concluidas = etapas.filter(e => e.concluida).length;
                      const progresso = etapas.length > 0 ? Math.round((concluidas / etapas.length) * 100) : 0;
                      const atrasada = imp.status !== 'concluido' && imp.status !== 'concluido_feedback' && imp.status !== 'cancelado' && imp.data_prevista_conclusao && new Date(imp.data_prevista_conclusao) < new Date();
                      const priColor = PRIORIDADE_DOT[imp.prioridade] || PRIORIDADE_DOT.media;

                      return (
                        <Draggable key={imp.id} draggableId={imp.id} index={index} isDragDisabled={false}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => onSelectImplantacao(imp)}
                              className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition"
                              style={{
                                background: snap.isDragging ? AURORA.surface2 : AURORA.surface,
                                border: `1px solid ${snap.isDragging ? col.color : AURORA.border}`,
                                boxShadow: snap.isDragging ? `0 8px 24px rgba(0,0,0,0.4)` : 'none',
                                ...prov.draggableProps.style,
                              }}
                            >
                              {/* Topo: prioridade + cliente */}
                              <div className="flex items-start gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: priColor }} title={`Prioridade: ${imp.prioridade}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate flex items-center gap-1" style={{ color: AURORA.text }}>
                                    {imp.cliente_nome || '—'}
                                    {imp.contrato_encontrado === false && (
                                      <FileWarning className="w-3 h-3 flex-shrink-0" style={{ color: '#fbbf24' }} />
                                    )}
                                    {imp.contrato_encontrado === true && (imp.contrato_id || imp.contrato_url_manual) && (
                                      <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: '#22c55e' }} />
                                    )}
                                  </p>
                                  <p className="text-[10px] truncate" style={{ color: AURORA.textMuted }}>
                                    {imp.produto || '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Responsável */}
                              {(imp.responsavel_implantacao || imp.vendedor_nome) && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <User className="w-2.5 h-2.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />
                                  <p className="text-[10px] truncate" style={{ color: AURORA.textMuted }}>
                                    {imp.responsavel_implantacao || imp.vendedor_nome}
                                  </p>
                                </div>
                              )}
                              {imp.padrinho_nome && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Crown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
                                  <p className="text-[10px] truncate" style={{ color: '#a78bfa' }}>
                                    {imp.padrinho_nome}
                                  </p>
                                </div>
                              )}

                              {/* Progresso */}
                              {etapas.length > 0 && (
                                <div className="mb-2">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[9px]" style={{ color: AURORA.textMuted }}>Progresso</span>
                                    <span className="text-[9px] font-semibold" style={{ color: col.color }}>{concluidas}/{etapas.length}</span>
                                  </div>
                                  <div className="h-1 rounded-full overflow-hidden" style={{ background: AURORA.bg }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${progresso}%`, background: col.color }} />
                                  </div>
                                </div>
                              )}

                              {/* Footer: data + valor + atraso */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                {imp.data_prevista_conclusao && (
                                  <span className="text-[9px] flex items-center gap-0.5" style={{ color: atrasada ? '#f87171' : AURORA.textMuted }}>
                                    {atrasada ? <AlertTriangle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                                    {fmtDate(imp.data_prevista_conclusao)}
                                  </span>
                                )}
                                {imp.valor_contrato != null && imp.valor_contrato > 0 && (
                                  <span className="text-[9px] font-semibold" style={{ color: AURORA.textMuted }}>
                                    {fmtVal(imp.valor_contrato)}
                                  </span>
                                )}
                              </div>
                              {atrasada && (
                                <div className="mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                                  ATRASADA
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}