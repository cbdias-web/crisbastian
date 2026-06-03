/**
 * Hook para persistir e gerenciar a ordem dos menus laterais via drag-and-drop.
 * A ordem é salva no localStorage por usuário.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'menu_order_v1';

export function useMenuOrder(userId, initialItems) {
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;

  const loadOrder = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  };

  const applyOrder = (items, savedOrder) => {
    if (!savedOrder || savedOrder.length === 0) return items;
    const ordered = [];
    const map = new Map(items.map(i => [i.page, i]));
    for (const key of savedOrder) {
      if (map.has(key)) {
        ordered.push(map.get(key));
        map.delete(key);
      }
    }
    // Appends any new items not in savedOrder
    for (const item of map.values()) ordered.push(item);
    return ordered;
  };

  const savedOrder = loadOrder();
  const [items, setItems] = useState(() => applyOrder(initialItems, savedOrder));

  // Sync when initialItems changes (e.g. admin status changes)
  const syncItems = useCallback((newInitial) => {
    const order = loadOrder();
    setItems(applyOrder(newInitial, order));
  }, [storageKey]);

  const reorder = useCallback((fromIndex, toIndex) => {
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next.map(i => i.page)));
      } catch {}
      return next;
    });
  }, [storageKey]);

  return { items, reorder, syncItems };
}