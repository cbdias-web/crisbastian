import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// Confirmação padrão do portal (substitui a janela cinza do navegador).
// Uso: if (!(await confirmar('Excluir este registro?'))) return;
// Ações de risco (excluir, remover, bloquear, cancelar, estornar…) ganham botão vermelho automaticamente.
let ouvinte = null;
const fila = [];

export function confirmar(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const pedido = { mensagem: String(mensagem ?? ''), ...opcoes, resolve };
    if (ouvinte) ouvinte(pedido); else fila.push(pedido);
  });
}

const RISCO = /\b(exclu|remov|apag|bloque|cancel|estorn|descart|revog|inativ|devolv|opt-out|substitu|sair)/i;

export function ConfirmarHost() {
  const [pedido, setPedido] = useState(null);
  const okRef = useRef(null);
  useEffect(() => {
    ouvinte = (p) => setPedido(p);
    if (fila.length) setPedido(fila.shift());
    return () => { ouvinte = null; };
  }, []);
  useEffect(() => {
    if (!pedido) return;
    setTimeout(() => okRef.current?.focus(), 30);
    const k = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); responder(false); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [pedido]);

  const responder = (v) => {
    const p = pedido;
    setPedido(fila.length ? fila.shift() : null);
    p?.resolve(v);
  };
  if (!pedido) return null;

  const linhas = pedido.mensagem.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim()));
  const [titulo, ...resto] = linhas;
  const perigo = pedido.perigo ?? RISCO.test(pedido.mensagem);
  const cor = perigo ? '#F87171' : '#C9A962';
  const Icone = perigo ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10050, background: 'rgba(3,6,10,0.66)', backdropFilter: 'blur(4px)' }}
      role="alertdialog" aria-modal="true" aria-label={titulo} onMouseDown={e => { if (e.target === e.currentTarget) responder(false); }}>
      <div className="vx-suspensa w-full max-w-[460px] rounded-3xl overflow-hidden" style={{ background: '#101826', border: `1px solid ${cor}55`, boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', gap: 14, padding: '22px 22px 10px' }}>
          <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 21, background: cor + '1f', border: `1.5px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icone className="w-5 h-5" style={{ color: cor }} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F4EFE3', lineHeight: 1.45 }}>{titulo}</p>
            {resto.map((l, i) => <p key={i} style={{ fontSize: 13, color: '#A3ACBA', lineHeight: 1.5 }}>{l}</p>)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px 20px' }}>
          <button onClick={() => responder(false)} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>{pedido.cancelar || 'Cancelar'}</button>
          <button ref={okRef} onClick={() => responder(true)} className="vx-btn" style={{ height: 40, padding: '0 20px', fontSize: 13, fontWeight: 600, borderRadius: 999, background: perigo ? 'linear-gradient(135deg,#FCA5A5,#EF4444)' : 'linear-gradient(135deg,#E3C982,#C9A962)', color: perigo ? '#2A0A0A' : '#1A1508', border: 0 }}>
            {pedido.confirmar || (perigo ? 'Confirmar' : 'Continuar')}
          </button>
        </div>
      </div>
    </div>
  );
}
