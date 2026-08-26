import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { BarChart3, Handshake, ChevronDown } from 'lucide-react';
import { createPageUrl } from '@/utils';

const AURORA = {
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const orderKey = (userId) => `header_order_v1_${userId || 'anon'}`;
const loadOrder = (userId) => {
  try { const s = localStorage.getItem(orderKey(userId)); return s ? JSON.parse(s) : null; } catch { return null; }
};

function NavLink({ item, currentPageName, onNavigate }) {
  const isActive = currentPageName === item.page;
  const Icon = item.icon;
  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onNavigate}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all relative"
      style={{
        color: isActive ? AURORA.accent : AURORA.text,
        background: isActive ? AURORA.accentDim : 'transparent',
        border: isActive ? `1px solid ${AURORA.border}` : '1px solid transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,212,170,0.07)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{item.name}</span>
      {item.badge > 0 && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
          style={{ background: '#ef4444', color: '#fff' }}>
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </Link>
  );
}

export default function HeaderNav({ user, currentPageName, isIndicador, isAdmin, groups, dashBadge }) {
  const [order, setOrder] = useState(() => loadOrder(user?.id));
  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  // Recarrega a ordem quando o usuário muda (login/logout)
  useEffect(() => { setOrder(loadOrder(user?.id)); }, [user?.id]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const baseItems = useMemo(() => {
    const arr = [];
    if (!isIndicador) arr.push({ key: 'Dashboard', type: 'link', page: 'Dashboard', name: 'Dashboard', icon: BarChart3 });
    if (isAdmin) arr.push({ key: 'DashParceiro', type: 'link', page: 'DashParceiro', name: 'Dash Parceiro', icon: Handshake, badge: dashBadge });
    for (const g of groups) arr.push({ key: `grp:${g.label}`, type: 'group', group: g });
    return arr;
  }, [isIndicador, isAdmin, groups, dashBadge]);

  const ordered = useMemo(() => {
    if (!order || order.length === 0) return baseItems;
    const map = new Map(baseItems.map(i => [i.key, i]));
    const out = [];
    for (const k of order) { if (map.has(k)) { out.push(map.get(k)); map.delete(k); } }
    for (const i of map.values()) out.push(i);
    return out;
  }, [baseItems, order]);

  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = [...ordered];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    const keys = next.map(i => i.key);
    setOrder(keys);
    try { localStorage.setItem(orderKey(user?.id), JSON.stringify(keys)); } catch {}
  };

  const renderItem = (item) => {
    if (item.type === 'link') {
      const Icon = item.icon;
      const isActive = currentPageName === item.page;
      return (
        <Link
          to={createPageUrl(item.page)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition"
          style={{
            color: isActive ? AURORA.accent : AURORA.textMuted,
            background: isActive ? AURORA.accentDim : 'transparent',
            border: isActive ? `1px solid ${AURORA.border}` : '1px solid transparent',
          }}
        >
          <Icon className="w-3.5 h-3.5" />
          {item.name}
          {item.badge > 0 && (
            <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
              style={{ background: '#ef4444', color: '#fff' }}>
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </Link>
      );
    }
    // group dropdown
    const group = item.group;
    const isOpen = openDropdown === group.label;
    const hasActive = group.items.some(i => i.page === currentPageName);
    const groupBadge = group.items.reduce((sum, i) => sum + (i.badge || 0), 0);
    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : group.label)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition relative"
          style={{
            color: hasActive || isOpen ? AURORA.accent : AURORA.textMuted,
            background: hasActive || isOpen ? AURORA.accentDim : 'transparent',
            border: hasActive || isOpen ? `1px solid ${AURORA.border}` : '1px solid transparent',
          }}>
          {group.label}
          {groupBadge > 0 && <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />}
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl py-2 z-50 min-w-[200px]"
            style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${AURORA.border}` }}>
            {group.items.map(it => (
              <NavLink key={it.page} item={it} currentPageName={currentPageName} onNavigate={() => setOpenDropdown(null)} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="header-nav" direction="horizontal">
        {(provided) => (
          <div ref={(el) => { provided.innerRef(el); containerRef.current = el; }}
            {...provided.droppableProps}
            className="flex items-center gap-1 flex-1 min-w-0">
            {ordered.map((item, index) => (
              <Draggable key={item.key} draggableId={item.key} index={index}>
                {(prov, snapshot) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className="flex-shrink-0"
                    style={{ ...prov.draggableProps.style, opacity: snapshot.isDragging ? 0.5 : 1, cursor: 'grab' }}
                    title={isAdmin ? 'Arraste para reordenar' : undefined}
                  >
                    {renderItem(item)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}