import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AgendaCard from './AgendaCard';

const COLUMNS = [
  { key: 'pendente',    label: 'Pendente',    color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', dotBg: '#f59e0b' },
  { key: 'realizado',   label: 'Realizado',   color: '#34d399', bg: 'rgba(16,185,129,0.08)', dotBg: '#10b981' },
  { key: 'nao_atendeu', label: 'Não Atendeu', color: '#f87171', bg: 'rgba(239,68,68,0.08)',  dotBg: '#ef4444' },
  { key: 'reagendado',  label: 'Reagendado',  color: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  dotBg: '#3b82f6' },
];

export default function KanbanBoard({ items, onAction, onDelete, onPipeline, onClienteClick, updating, showGerente, onDragEnd }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: '300px' }}>
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className="flex-1 min-w-[220px] max-w-[300px] rounded-2xl flex flex-col"
                  style={{
                    background: snapshot.isDraggingOver ? col.bg : 'rgba(22,27,34,0.6)',
                    border: `1px solid ${snapshot.isDraggingOver ? col.color + '50' : 'rgba(0,212,170,0.1)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}>
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 rounded-t-2xl"
                    style={{ borderBottom: '1px solid rgba(0,212,170,0.1)', background: 'rgba(22,27,34,0.95)', backdropFilter: 'blur(4px)' }}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: col.dotBg }} />
                      <span className="text-xs font-bold" style={{ color: col.color }}>{col.label}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                      style={{ background: col.bg, color: col.color }}>{colItems.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto"
                    style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    {colItems.map((item, idx) => (
                      <Draggable draggableId={item.id} index={idx} key={item.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}>
                            <AgendaCard
                              item={item}
                              onAction={onAction}
                              onDelete={onDelete}
                              onPipeline={onPipeline}
                              onClienteClick={onClienteClick}
                              updating={updating}
                              showGerente={showGerente}
                              isDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {colItems.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-[10px]" style={{ color: 'rgba(230,237,243,0.15)' }}>Arraste cards aqui</p>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}