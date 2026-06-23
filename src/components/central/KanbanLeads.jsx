import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Phone, Clock, ArrowRight, User } from 'lucide-react';

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
  { key: 'ativa', label: 'Ativos', color: '#00D4AA', bg: 'rgba(0,212,170,0.12)' },
  { key: 'aguardando', label: 'Aguardando', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { key: 'qualificado', label: 'Qualificados', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
  { key: 'desqualificado', label: 'Desqualificados', color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  { key: 'convertido', label: 'Convertidos', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
];

export default function KanbanLeads({ conversas, onSelectConversa, onRefresh }) {
  const [draggingId, setDraggingId] = useState(null);

  const onDragEnd = async (result) => {
    setDraggingId(null);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const novoStatus = destination.droppableId;
    try {
      await base44.entities.ConversaWhatsapp.update(draggableId, { status: novoStatus });
      toast.success(`Lead movido para ${COLUNAS.find(c => c.key === novoStatus)?.label}`);
      onRefresh();
    } catch (err) {
      toast.error('Erro ao mover: ' + err.message);
    }
  };

  const conversasPorStatus = (status) => conversas.filter(c => (c.status || 'ativa') === status);

  return (
    <DragDropContext onDragStart={(start) => setDraggingId(start.draggableId)} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 320px)' }}>
        {COLUNAS.map(col => {
          const items = conversasPorStatus(col.key);
          return (
            <div key={col.key} className="flex flex-col rounded-2xl flex-shrink-0" style={{ width: '260px', background: col.bg, border: `1px solid ${col.color}33` }}>
              {/* Header da coluna */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl" style={{ borderBottom: `1px solid ${col.color}33` }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  <p className="text-sm font-bold" style={{ color: col.color }}>{col.label}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${col.color}22`, color: col.color }}>
                  {items.length}
                </span>
              </div>

              {/* Lista de cards */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] transition"
                    style={{
                      background: snapshot.isDraggingOver ? `${col.color}11` : 'transparent',
                      borderRadius: '0 0 16px 16px',
                    }}
                  >
                    {items.length === 0 && (
                      <p className="text-center text-[11px] py-6" style={{ color: AURORA.textMuted }}>
                        Arraste leads para cá
                      </p>
                    )}
                    {items.map((conv, index) => (
                      <Draggable key={conv.id} draggableId={conv.id} index={index}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => onSelectConversa(conv)}
                            className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition"
                            style={{
                              background: snap.isDragging ? AURORA.surface2 : AURORA.surface,
                              border: `1px solid ${snap.isDragging ? col.color : AURORA.border}`,
                              boxShadow: snap.isDragging ? `0 8px 24px rgba(0,0,0,0.4)` : 'none',
                              ...prov.draggableProps.style,
                            }}
                          >
                            <div className="flex items-start gap-2 mb-1.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                style={{ background: `${col.color}22`, color: col.color }}>
                                {conv.lead_nome?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{conv.lead_nome}</p>
                                <p className="text-[10px] flex items-center gap-1" style={{ color: AURORA.textMuted }}>
                                  <Phone className="w-2.5 h-2.5" />{conv.telefone}
                                </p>
                              </div>
                            </div>
                            {conv.ultima_mensagem && (
                              <p className="text-[10px] truncate mb-1.5" style={{ color: AURORA.textMuted }}>{conv.ultima_mensagem}</p>
                            )}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              {conv.vendedor_nome && (
                                <span className="text-[9px] flex items-center gap-0.5" style={{ color: AURORA.textMuted }}>
                                  <User className="w-2.5 h-2.5" />{conv.vendedor_nome.split(' ')[0]}
                                </span>
                              )}
                              {conv.nao_lidas > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                                  {conv.nao_lidas}
                                </span>
                              )}
                              {conv.alerta_sem_resposta && (
                                <Clock className="w-3 h-3" style={{ color: '#fbbf24' }} />
                              )}
                              {(conv.migracoes || []).length > 0 && (
                                <ArrowRight className="w-3 h-3" style={{ color: '#f87171' }} />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
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