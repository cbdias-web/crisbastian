import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Single sidebar menu item with drag-and-drop reorder support.
 * Props:
 *   item       – { name, icon: Icon, page, badge?, badgeKey? }
 *   index      – current index
 *   onDragStart, onDragEnter, onDragEnd – drag handlers from parent
 *   isActive   – boolean
 *   collapsed  – sidebar collapsed state
 *   extra      – optional JSX (badges etc.)
 */
export default function DraggableMenuItem({
  item,
  index,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isActive,
  collapsed,
  extra,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const Icon = item.icon;

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(index);
      }}
      onDragEnter={() => {
        setIsOver(true);
        onDragEnter(index);
      }}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragEnd={() => {
        setIsDragging(false);
        setIsOver(false);
        onDragEnd();
      }}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); }}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s',
      }}
      className={`relative rounded-xl mb-1 cursor-grab active:cursor-grabbing
        ${isOver ? 'ring-1 ring-blue-300/60 bg-white/5' : ''}
      `}
      title={collapsed ? item.name : undefined}
    >
      {/* Drop indicator line */}
      {isOver && (
        <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-blue-400 rounded-full pointer-events-none" />
      )}
      <Link
        to={createPageUrl(item.page)}
        draggable={false}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all
          ${collapsed ? 'justify-center px-2' : ''}
          ${isActive
            ? 'bg-white/15 text-white font-semibold shadow-sm'
            : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}
        `}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium flex-1 truncate">{item.name}</span>}
        {!collapsed && extra}
      </Link>
    </div>
  );
}