import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Link2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Esteira de status do contrato (fluxo comercial)
const COLUNAS = [
  { key: 'rascunho', label: 'Rascunho', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  { key: 'gerado', label: 'PDF Gerado', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  { key: 'assinado', label: 'Assinado', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  { key: 'aguardando_pagamento', label: 'Aguard. Pagamento', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  { key: 'pago', label: 'Pago', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  { key: 'no_pipeline', label: 'No Pipeline', color: '#e879f9', bg: 'rgba(232,121,249,0.08)' },
];

const TIPO_DOT = {
  'CONTA GLOBAL': '#3b82f6',
  'CONTA INTERNACIONAL': '#6366f1',
  'DOLARIZE': '#f59e0b',
  'ROF': '#10b981',
  'CANAL BANCÁRIO': '#8b5cf6',
  'OFFSHORE': '#06b6d4',
  'GARANTIAS': '#f43f5e',
  'HORA TÉCNICA': '#14b8a6',
  'RATING': '#0ea5e9',
};

const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtDate = (d) => d ? format(new Date(d.split('T')[0] + 'T00:00:00'), 'dd/MM/yy') : '—';

export default function KanbanContratos({ contratos, onSelectContrato, isAdmin, onRefresh }) {
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const novoStatus = destination.droppableId;
    if (novoStatus === source.droppableId && destination.index === source.index) return;

    const ct = contratos.find(c => c.id === draggableId);
    const colunaLabel = COLUNAS.find(c => c.key === novoStatus)?.label || novoStatus;

    // No Pipeline é atingível apenas pelo fluxo "Enviar para Vendas" (cria a Venda)
    if (novoStatus === 'no_pipeline') {
      toast.error('Use o botão "Enviar para Vendas" para mover o contrato ao Pipeline — isso cria a venda vinculada.');
      onRefresh();
      return;
    }
    if (ct?.status === novoStatus) return;

    try {
      await base44.entities.Contrato.update(draggableId, { status: novoStatus });
      toast.success(`Contrato movido para ${colunaLabel}`);
      onRefresh();
    } catch (err) {
      toast.error('Erro ao mover: ' + err.message);
      onRefresh();
    }
  };

  const porStatus = (status) => contratos.filter(c => (c.status || 'rascunho') === status);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 'calc(100vh - 420px)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,170,0.4) transparent' }}>
        {COLUNAS.map(col => {
          const items = porStatus(col.key);
          return (
            <div key={col.key} className="flex flex-col rounded-2xl flex-1 min-w-[190px]" style={{ background: col.bg, border: `1px solid ${col.color}33` }}>
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
                    {items.map((c, index) => {
                      const tipoColor = TIPO_DOT[c.tipo] || '#9ca3af';
                      return (
                        <Draggable key={c.id} draggableId={c.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => onSelectContrato(c)}
                              className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition"
                              style={{
                                background: snap.isDragging ? AURORA.surface2 : AURORA.surface,
                                border: `1px solid ${snap.isDragging ? col.color : AURORA.border}`,
                                boxShadow: snap.isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
                                ...prov.draggableProps.style,
                              }}
                            >
                              {/* Topo: tipo + cliente */}
                              <div className="flex items-start gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: tipoColor }} title={c.tipo} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>
                                    {c.nome || '—'}
                                  </p>
                                  <p className="text-[10px] truncate" style={{ color: AURORA.textMuted }}>
                                    {c.tipo || '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Vendedor */}
                              {isAdmin && c.vendedor_nome && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <User className="w-2.5 h-2.5 flex-shrink-0" style={{ color: AURORA.textMuted }} />
                                  <p className="text-[10px] truncate" style={{ color: AURORA.textMuted }}>{c.vendedor_nome}</p>
                                </div>
                              )}

                              {/* Link de assinatura pendente */}
                              {!c.link_assinatura && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Link2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
                                  <p className="text-[9px] font-semibold" style={{ color: '#fbbf24' }}>Link de assinatura pendente</p>
                                </div>
                              )}

                              {/* Footer: data + valor */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.textMuted }}>
                                  <Calendar className="w-2.5 h-2.5" />
                                  {fmtDate(c.data_contrato || c.created_date)}
                                </span>
                                <span className="text-[9px] font-semibold" style={{ color: AURORA.accent }}>
                                  {fmtVal(c.valor_total)}
                                </span>
                              </div>
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