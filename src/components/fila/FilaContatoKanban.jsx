import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Phone, Clock, ArrowRight, User, Zap, CheckCircle2, PhoneCall, XCircle, Trophy, BadgeCheck, MoreVertical, Pencil, RotateCcw, Calendar } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const fmtDataLead = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL = {
  pendente: 'Pendente',
  atendeu: 'Em Contato',
  nao_atendeu: 'Não Atendeu',
  qualificado: 'Qualificado',
  convertido: 'Convertido',
  descartado: 'Desqualificado',
};

const COLUNAS = [
  { key: 'indicacao', label: 'Indicações', icon: Zap, color: '#00D4AA', bg: 'rgba(0,212,170,0.08)', statuses: ['pendente'], origem: 'indicacao' },
  { key: 'carteira', label: 'Agenda do Dia', icon: Clock, color: '#818cf8', bg: 'rgba(99,102,241,0.08)', statuses: ['pendente'], origem: 'carteira' },
  { key: 'em_contato', label: 'Em Contato', icon: PhoneCall, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', statuses: ['atendeu'] },
  { key: 'desqualificado', label: 'Desqualificado', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.08)', statuses: ['descartado'] },
  { key: 'qualificado', label: 'Qualificado', icon: BadgeCheck, color: '#60a5fa', bg: 'rgba(59,130,249,0.08)', statuses: ['qualificado'] },
  { key: 'convertido', label: 'Convertido', icon: Trophy, color: '#34d399', bg: 'rgba(52,211,153,0.08)', statuses: ['convertido'] },
];

const destinoPara = (colKey) => {
  const col = COLUNAS.find(c => c.key === colKey);
  if (!col) return null;
  if (col.key === 'indicacao') return { status: 'pendente', tipo_origem: 'indicacao' };
  if (col.key === 'carteira') return { status: 'pendente', tipo_origem: 'carteira' };
  return { status: col.statuses[0] };
};

const STATUS_MENU = [
  { key: 'em_contato', label: 'Em Contato' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'convertido', label: 'Convertido' },
  { key: 'desqualificado', label: 'Desqualificado' },
];

export default function FilaContatoKanban({ itens, onSelectItem, onAtualizado }) {
  const [menuId, setMenuId] = useState(null);
  const [movendo, setMovendo] = useState(false);

  const colunas = {};
  for (const col of COLUNAS) {
    let lista = itens.filter(i => col.statuses.includes(i.status));
    if (col.origem) lista = lista.filter(i => i.tipo_origem === col.origem);
    if (col.key === 'indicacao' || col.key === 'carteira') {
      lista = lista.sort((a, b) => a.prioridade - b.prioridade || a.posicao - b.posicao);
    }
    colunas[col.key] = lista;
  }

  // Mapeia destino do Kanban → status da ConversaWhatsapp (sincroniza a fonte
  // para que a próxima montagem da fila não recriie o lead como pendente).
  const CONVERSA_STATUS_BY_DESTINO = {
    em_contato: 'aguardando',
    qualificado: 'qualificado',
    convertido: 'convertido',
    desqualificado: 'desqualificado',
    indicacao: 'ativa',
    carteira: 'ativa',
  };

  const mover = async (item, destinoKey) => {
    const patch = destinoPara(destinoKey);
    if (!patch) return;
    const col = COLUNAS.find(c => c.key === destinoKey);
    const mesmaCol = col.statuses.includes(item.status) && (!col.origem || col.origem === item.tipo_origem);
    if (mesmaCol) { setMenuId(null); return; }
    // Lead contatado voltando à fila: entra no FINAL da fila de reposição do
    // gerente, com a contagem dos 5 dias reiniciada (entrada = hoje).
    const isFilaDest = destinoKey === 'indicacao' || destinoKey === 'carteira';
    if (isFilaDest && item.status !== 'pendente') {
      const hojeStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const maxPos = itens.filter(i => i.status === 'pendente').reduce((m, i) => Math.max(m, i.posicao || 0), 0);
      patch.data_fila = hojeStr;
      patch.posicao = maxPos + 1;
    }
    setMovendo(true);
    try {
      await base44.entities.FilaContato.update(item.id, patch);
      // Sincroniza a ConversaWhatsapp de origem (indicações) para evitar retrabalho
      if (item.tipo_origem === 'indicacao' && item.ref_id && CONVERSA_STATUS_BY_DESTINO[destinoKey]) {
        await base44.entities.ConversaWhatsapp.update(item.ref_id, {
          status: CONVERSA_STATUS_BY_DESTINO[destinoKey],
        }).catch(() => {});
      }
      toast.success(`Lead movido para "${col.label}".`);
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao mover: ' + (e?.message || e));
    }
    setMovendo(false);
    setMenuId(null);
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const item = colunas[source.droppableId]?.[source.index];
    if (!item) return;
    await mover(item, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {COLUNAS.map(col => {
          const lista = colunas[col.key] || [];
          const isPendenteCol = col.key === 'indicacao' || col.key === 'carteira';
          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className="flex flex-col rounded-2xl min-w-0 transition"
                  style={{ background: col.bg, border: `1px solid ${snapshot.isDraggingOver ? col.color : `${col.color}33`}` }}>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl flex-shrink-0" style={{ borderBottom: `1px solid ${col.color}33` }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <col.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: col.color }} />
                      <p className="text-xs font-bold truncate" style={{ color: col.color }}>{col.label}</p>
                    </div>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${col.color}22`, color: col.color }}>{lista.length}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[140px]">
                    {lista.length === 0 && (
                      <p className="text-center text-[11px] py-6" style={{ color: AURORA.textMuted }}>
                        {isPendenteCol ? 'Sem itens' : '—'}
                      </p>
                    )}
                    {lista.map((item, index) => (
                      <Draggable draggableId={item.id} index={index} key={item.id}>
                        {(p, s) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                            onClick={() => menuId !== item.id && onSelectItem(item)}
                            className="rounded-xl p-2.5 transition cursor-grab active:cursor-grabbing relative"
                            style={{
                              background: isPendenteCol ? AURORA.surface : `${col.color}0d`,
                              border: `1px solid ${s.isDragging ? col.color : (isPendenteCol ? AURORA.border : `${col.color}33`)}`,
                              ...p.draggableProps.style,
                            }}>
                            <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === item.id ? null : item.id); }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md transition z-10"
                              style={{ color: AURORA.textMuted, background: 'rgba(255,255,255,0.04)' }}
                              onMouseEnter={e => e.currentTarget.style.color = AURORA.accent}
                              onMouseLeave={e => e.currentTarget.style.color = AURORA.textMuted}>
                              <MoreVertical className="w-3 h-3" />
                            </button>
                            {menuId === item.id && (
                              <div className="absolute top-7 right-1 z-50 rounded-xl py-1 shadow-2xl min-w-[160px]"
                                style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}
                                onClick={e => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); setMenuId(null); onSelectItem(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition"
                                  style={{ color: AURORA.text }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  <Pencil className="w-3 h-3" /> Editar / Manutenção
                                </button>
                                <div style={{ borderTop: `1px solid ${AURORA.border}`, margin: '2px 0' }} />
                                <p className="px-3 py-1 text-[9px] uppercase tracking-wider" style={{ color: AURORA.textMuted }}>Mover para</p>
                                {STATUS_MENU.map(sm => (
                                  <button key={sm.key} disabled={movendo} onClick={(e) => { e.stopPropagation(); mover(item, sm.key); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition disabled:opacity-40"
                                    style={{ color: AURORA.text }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <ArrowRight className="w-3 h-3" /> {sm.label}
                                  </button>
                                ))}
                                {!isPendenteCol && (
                                  <button disabled={movendo} onClick={(e) => { e.stopPropagation(); mover(item, item.tipo_origem === 'indicacao' ? 'indicacao' : 'carteira'); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition disabled:opacity-40"
                                    style={{ color: AURORA.text }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <RotateCcw className="w-3 h-3" /> Voltar à fila
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex items-start gap-2 mb-1.5 pr-5">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${col.color}22`, color: col.color }}>
                                {item.nome?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: AURORA.text }}>{item.nome}</p>
                                <p className="text-[10px] flex items-center gap-1 truncate" style={{ color: AURORA.textMuted }}>
                                  <Phone className="w-2.5 h-2.5 flex-shrink-0" />{item.telefone || '—'}
                                </p>
                              </div>
                            </div>
                            {item.produto && (
                              <p className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{item.produto}</p>
                            )}
                            {(item.data_fila || item.created_date) && (
                              <p className="text-[9px] flex items-center gap-0.5 mb-1" style={{ color: AURORA.textMuted }} title="Data do lead">
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />{fmtDataLead(item.created_date)}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              {item.vendedor_nome && <span className="text-[9px] flex items-center gap-0.5 truncate" style={{ color: AURORA.textMuted }}><User className="w-2.5 h-2.5 flex-shrink-0" />{item.vendedor_nome.split(' ')[0]}</span>}
                              {item.tentativas > 0 && <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#fbbf24' }}><ArrowRight className="w-2.5 h-2.5" />{item.tentativas}x</span>}
                              {!isPendenteCol && (
                                <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: col.color }}>
                                  <CheckCircle2 className="w-2.5 h-2.5" />{STATUS_LABEL[item.status] || item.status}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}
    </DragDropContext>
  );
}