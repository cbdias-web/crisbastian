import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getImpersonatedVendedor } from '@/lib/impersonation';
import { Bell, BellRing, Check } from 'lucide-react';

const A = { surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.2)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const COR = { alta: '#f87171', media: '#fbbf24', baixa: '#60a5fa' };

// Sino de alertas do gerente (AlertaGerente) com notificação do navegador/app instalado.
export default function AlertasSino({ vendedorId: vendedorIdProp }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const vistosRef = useRef(new Set());
  const iniciouRef = useRef(false);

  const { data: vid } = useQuery({
    queryKey: ['alertas-vendedor', vendedorIdProp],
    queryFn: async () => {
      if (vendedorIdProp) return vendedorIdProp;
      const imp = getImpersonatedVendedor(); if (imp?.id) return imp.id;
      const u = await base44.auth.me();
      const vs = await base44.entities.Vendedor.filter({ email: u.email });
      return vs[0]?.id || null;
    },
    staleTime: 600000,
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas-gerente', vid], enabled: !!vid, refetchInterval: 30000,
    queryFn: () => base44.entities.AlertaGerente.filter({ vendedor_id: vid, lido: false }, '-criado_em', 40),
  });

  // Notificação do sistema para alertas novos (depois da primeira carga)
  useEffect(() => {
    if (!alertas.length && !iniciouRef.current) return;
    for (const a of alertas) {
      if (vistosRef.current.has(a.id)) continue;
      vistosRef.current.add(a.id);
      if (iniciouRef.current && 'Notification' in window && Notification.permission === 'granted' && a.prioridade !== 'baixa') {
        try { new Notification(a.titulo, { body: a.texto, icon: '/favicon.ico', tag: a.id }); } catch {}
      }
    }
    iniciouRef.current = true;
  }, [alertas]);

  // Tempo real (quando disponível)
  useEffect(() => {
    if (!vid || !base44.entities.AlertaGerente.subscribe) return;
    let unsub;
    try { unsub = base44.entities.AlertaGerente.subscribe((ev) => { if (ev?.data?.vendedor_id === vid) qc.invalidateQueries({ queryKey: ['alertas-gerente', vid] }); }); } catch {}
    return () => { try { unsub?.(); } catch {} };
  }, [vid, qc]);

  if (!vid) return null;
  const marcar = async (a) => { await base44.entities.AlertaGerente.update(a.id, { lido: true }).catch(() => {}); qc.invalidateQueries({ queryKey: ['alertas-gerente', vid] }); };
  const abrir = async (a) => { await marcar(a); setAberto(false); nav(a.fila_id ? `/FilaContato?fila=${a.fila_id}` : '/FilaContato'); };
  const todos = async () => { await Promise.all(alertas.map(a => base44.entities.AlertaGerente.update(a.id, { lido: true }).catch(() => {}))); qc.invalidateQueries({ queryKey: ['alertas-gerente', vid] }); };
  const pedirPermissao = async () => { if ('Notification' in window) await Notification.requestPermission(); setAberto(false); setAberto(true); };
  const Ic = alertas.some(a => a.prioridade === 'alta') ? BellRing : Bell;

  return (
    <div className="relative">
      <button onClick={() => setAberto(p => !p)} className="relative p-2 rounded-lg transition" style={{ color: alertas.length ? A.accent : A.muted }} title="Alertas">
        <Ic className="w-4 h-4" />
        {alertas.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>{alertas.length > 99 ? '99+' : alertas.length}</span>}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[92vw] rounded-2xl z-[95] overflow-hidden shadow-2xl" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${A.border}` }}>
              <p className="text-xs font-bold" style={{ color: A.text }}>Alertas</p>
              {alertas.length > 0 && <button onClick={todos} className="text-[10px] flex items-center gap-1" style={{ color: A.accent }}><Check className="w-3 h-3" /> marcar todos como lidos</button>}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {alertas.length === 0 && <p className="text-center text-[11px] py-6" style={{ color: A.muted }}>Nenhum alerta pendente.</p>}
              {alertas.map(a => (
                <button key={a.id} onClick={() => abrir(a)} className="w-full text-left px-3 py-2.5 flex gap-2 hover:bg-white/5" style={{ borderBottom: `1px solid ${A.border}` }}>
                  <span className="w-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: COR[a.prioridade] || A.muted, minHeight: 28 }} />
                  <span className="min-w-0"><span className="block text-xs font-semibold truncate" style={{ color: A.text }}>{a.titulo}</span><span className="block text-[11px] line-clamp-2" style={{ color: A.muted }}>{a.texto}</span></span>
                </button>
              ))}
            </div>
            {'Notification' in window && Notification.permission !== 'granted' && (
              <button onClick={pedirPermissao} className="w-full text-[11px] py-2 font-semibold" style={{ background: A.surface2, color: A.accent }}>Ativar notificações do navegador</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
