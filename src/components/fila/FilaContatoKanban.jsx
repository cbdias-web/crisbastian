import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { GripVertical } from 'lucide-react';
import FilaContatoCard from './FilaContatoCard';
import AgendarRetornoModal from './AgendarRetornoModal';
import { COLUNAS, destinoPara, carregarOrdem, ORDEN_STORAGE_KEY } from './filaContatoUtils';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function FilaContatoKanban({ itens, onSelectItem, onAtualizado, isAdmin }) {
  const [menuId, setMenuId] = useState(null);
  const [movendo, setMovendo] = useState(false);
  const [colunasOrdem, setColunasOrdem] = useState(carregarOrdem);
  const [agendarRetorno, setAgendarRetorno] = useState(null); // item aguardando agendamento obrigatório

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

  // Executa a movimentação de fato (drag, menu ou ação rápida)
  const aplicarMovimento = async (item, destinoKey, extra = {}) => {
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
    // Relógio de inércia: reinicia a cada movimentação de status
    const agoraIso = new Date().toISOString();
    patch.status_desde = agoraIso;
    patch.alerta_stale = false;
    Object.assign(patch, extra);
    setMovendo(true);
    try {
      await base44.entities.FilaContato.update(item.id, patch);
      // Sincroniza a ConversaWhatsapp de origem (indicações) para evitar retrabalho
      if (item.tipo_origem === 'indicacao' && item.ref_id && CONVERSA_STATUS_BY_DESTINO[destinoKey]) {
        await base44.entities.ConversaWhatsapp.update(item.ref_id, {
          status: CONVERSA_STATUS_BY_DESTINO[destinoKey],
        }).catch(() => {});
      }
      // Jornada Dash Parceiro: lead contatado sai de "Novo" → "Em Atendimento"
      if (item.tipo_origem === 'indicacao' && item.lead_indicacao_id && destinoKey === 'em_contato') {
        try {
          const li = await base44.entities.LeadIndicacao.get(item.lead_indicacao_id);
          if (li && li.status === 'novo') {
            await base44.entities.LeadIndicacao.update(li.id, {
              status: 'em_atendimento',
              historico: [...(li.historico || []), { status: 'em_atendimento', label: 'Em Atendimento', data: agoraIso }],
            });
          }
        } catch (e) {}
      }
      toast.success(`Lead movido para "${col.label}".`);
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao mover: ' + (e?.message || e));
    }
    setMovendo(false);
    setMenuId(null);
  };

  // Qualquer entrada em "Em Contato" exige o agendamento obrigatório do
  // próximo retorno (data/hora) — nenhum card entra sem tarefa futura.
  const mover = (item, destinoKey) => {
    if (destinoKey === 'em_contato') {
      setAgendarRetorno(item);
      setMenuId(null);
      return;
    }
    return aplicarMovimento(item, destinoKey);
  };

  const confirmarRetorno = async ({ data, hora }) => {
    const item = agendarRetorno;
    setAgendarRetorno(null);
    if (!item) return;
    const agoraIso = new Date().toISOString();
    await aplicarMovimento(item, 'em_contato', {
      proximo_contato: data,
      proximo_contato_hora: hora,
      tentativas_contato: 0,
      historico: [...(item.historico || []), { status: 'atendeu', observacao: `Retorno agendado para ${data.split('-').reverse().join('/')} às ${hora}`, data: agoraIso }],
    });
  };

  // Ação rápida: Em Contato → Qualificado (sem arrastar). Registra no Pipeline
  // e dispara tarefa de proposta comercial com prazo máximo de 24h.
  const qualificarQuick = async (item) => {
    if (movendo) return;
    setMovendo(true);
    setMenuId(null);
    try {
      const res = await base44.functions.invoke('classificarLeadFila', {
        fila_id: item.id,
        status: 'qualificado',
        produto: item.produto,
        valor: item.valor_estimado ?? null,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      const agoraIso = new Date().toISOString();
      await base44.entities.FilaContato.update(item.id, { status_desde: agoraIso, alerta_stale: false }).catch(() => {});
      // Tarefa: proposta comercial com prazo máximo de 24h (agenda do gerente)
      const amanhaStr = new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      await base44.entities.AgendaContato.create({
        lead_id: item.cliente_id || item.ref_id,
        lead_nome: item.nome,
        lead_telefone: item.telefone || '',
        lead_cpf_cnpj: item.cpf_cnpj || '',
        cliente_id: item.cliente_id || '',
        vendedor_id: item.vendedor_id,
        vendedor_nome: item.vendedor_nome,
        data_agendada: amanhaStr,
        horario: '09:00',
        posicao_dia: 0,
        lote_id: '',
        status: 'pendente',
        resultado: 'Tarefa: Proposta comercial — prazo máximo 24h (gerada na qualificação do lead)',
      }).catch(() => {});
      toast.success('Lead qualificado! Tarefa de proposta criada (prazo 24h).');
      onAtualizado?.();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || String(e);
      if (String(msg).includes('produto')) {
        toast.error('Informe o produto da negociação antes de qualificar — abra o card e preencha a negociação.');
      } else {
        toast.error('Erro ao qualificar: ' + msg);
      }
    }
    setMovendo(false);
  };

  // Registra uma tentativa de contato sem retorno do cliente (Em Contato):
  // incrementa o contador de tentativas e reinicia o relógio de inércia.
  // A partir da 4ª tentativa o lead é sugerido para Nutrição (ghosting).
  const registrarTentativaSemRetorno = async (item) => {
    if (movendo) return;
    setMovendo(true);
    setMenuId(null);
    try {
      const agoraIso = new Date().toISOString();
      const novas = (item.tentativas_contato || 0) + 1;
      await base44.entities.FilaContato.update(item.id, {
        tentativas_contato: novas,
        ultima_tentativa_em: agoraIso,
        status_desde: agoraIso,
        alerta_stale: false,
        historico: [...(item.historico || []), { status: 'atendeu', observacao: `Tentativa ${novas} — sem retorno do cliente`, data: agoraIso }],
      });
      toast.success(novas >= 4
        ? `Tentativa ${novas} registrada — lead sem retorno. Sugerimos mover para Nutrição.`
        : `Tentativa ${novas} registrada.`);
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao registrar tentativa: ' + (e?.message || e));
    }
    setMovendo(false);
  };

  // Exclusão (somente admin): remove o item da esteira definitivamente.
  // Para indicações, encerra também a conversa de origem para que a
  // sincronização contínua (10min) não traga o lead de volta à fila.
  const excluirItem = async (item) => {
    setMenuId(null);
    const msg = item.tipo_origem === 'indicacao'
      ? `Excluir "${item.nome}" da esteira?\n\nA conversa de origem na Central de Leads será encerrada para o lead não retornar à fila.`
      : `Excluir "${item.nome}" da esteira?\n\nO agendamento de origem (Agenda do Dia) será marcado como realizado para o item não retornar.`;
    if (!confirm(msg)) return;
    try {
      await base44.entities.FilaContato.delete(item.id);
      if (item.tipo_origem === 'indicacao' && item.ref_id) {
        await base44.entities.ConversaWhatsapp.update(item.ref_id, { status: 'encerrada' }).catch(() => {});
      }
      if (item.tipo_origem === 'carteira' && item.ref_id) {
        await base44.entities.AgendaContato.updateMany(
          { vendedor_id: item.vendedor_id, lead_id: item.ref_id, status: 'pendente' },
          { $set: { status: 'realizado', resultado: 'Item excluído da esteira por administrador', realizado_em: new Date().toISOString() } }
        ).catch(() => {});
      }
      toast.success('Item excluído da esteira.');
      onAtualizado?.();
    } catch (e) {
      toast.error('Erro ao excluir: ' + (e?.message || e));
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    // Reordenação das colunas da esteira (arrastar pelo cabeçalho)
    if (type === 'COLUNA') {
      if (source.index === destination.index) return;
      const nova = [...colunasOrdem];
      const [movida] = nova.splice(source.index, 1);
      nova.splice(destination.index, 0, movida);
      setColunasOrdem(nova);
      try { localStorage.setItem(ORDEN_STORAGE_KEY, JSON.stringify(nova.map(c => c.key))); } catch {}
      return;
    }
    if (source.droppableId === destination.droppableId) return;
    const item = colunas[source.droppableId]?.[source.index];
    if (!item) return;
    await mover(item, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="colunas-esteira" type="COLUNA" direction="horizontal">
        {(pCol) => (
          <div ref={pCol.innerRef} {...pCol.droppableProps}
            className="flex flex-wrap items-stretch gap-3 pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
            {colunasOrdem.map((col, colIdx) => {
              const lista = colunas[col.key] || [];
              const isPendenteCol = col.key === 'indicacao' || col.key === 'carteira';
              return (
                <Draggable draggableId={`col-${col.key}`} index={colIdx} key={col.key} type="COLUNA">
                  {(pC, sC) => (
                    <div ref={pC.innerRef} {...pC.draggableProps}
                      className="flex flex-col rounded-2xl min-w-0 flex-1"
                      style={{ ...pC.draggableProps.style, minWidth: 180, flex: '1 1 180px', opacity: sC.isDragging ? 0.7 : 1 }}>
                      <Droppable droppableId={col.key} type="CARD">
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            className="flex flex-col rounded-2xl min-w-0 flex-1 transition"
                            style={{ background: col.bg, border: `1px solid ${snapshot.isDraggingOver ? col.color : `${col.color}33`}` }}>
                            <div {...pC.dragHandleProps} title="Arraste para reordenar as colunas"
                              className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl flex-shrink-0 cursor-grab active:cursor-grabbing"
                              style={{ borderBottom: `1px solid ${col.color}33` }}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVertical className="w-3 h-3 flex-shrink-0" style={{ color: col.color, opacity: 0.6 }} />
                                <col.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: col.color }} />
                                <p className="text-xs font-bold truncate" style={{ color: col.color }}>{col.label}</p>
                                {col.key === 'carteira' && lista.length > 0 && (
                                  <span title="Prioridade 1: zere os compromissos da Agenda do Dia antes de atacar novos leads"
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}>★ 1ª</span>
                                )}
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
                                <Draggable draggableId={item.id} index={index} key={item.id} type="CARD">
                                  {(p, s) => (
                                    <FilaContatoCard
                                      item={item}
                                      col={col}
                                      isPendenteCol={isPendenteCol}
                                      movendo={movendo}
                                      menuAberto={menuId === item.id}
                                      isAdmin={isAdmin}
                                      innerRef={p.innerRef}
                                      draggableProps={p.draggableProps}
                                      dragHandleProps={p.dragHandleProps}
                                      isDragging={s.isDragging}
                                      style={p.draggableProps.style}
                                      onMenuToggle={(it) => setMenuId(it ? it.id : null)}
                                      onSelect={onSelectItem}
                                      onMover={mover}
                                      onQualificar={qualificarQuick}
                                      onTentativa={registrarTentativaSemRetorno}
                                      onExcluir={excluirItem}
                                    />
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {pCol.placeholder}
          </div>
        )}
      </Droppable>
      {menuId && <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />}
      {agendarRetorno && (
        <AgendarRetornoModal
          leadNome={agendarRetorno.nome}
          onConfirm={confirmarRetorno}
          onCancel={() => setAgendarRetorno(null)}
        />
      )}
    </DragDropContext>
  );
}