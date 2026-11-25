import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normNome } from '@/lib/nomes';
import { X, Loader2 } from 'lucide-react';

const TEAL = '#00D4AA';
const GOLD = '#D4AF37';
const T = { txt: '#e6edf3', muted: 'rgba(230,237,243,0.55)', line: 'rgba(255,255,255,0.07)' };
const CARD = {
  background: 'linear-gradient(180deg, rgba(28,35,51,0.98) 0%, rgba(16,21,29,0.98) 100%)',
  border: `1px solid ${T.line}`,
};

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const dataCurta = (s) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '—');
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const corDe = (nome) => {
  const cores = ['#00D4AA', '#60A5FA', '#A78BFA', '#F59E0B', '#F472B6', '#34D399', '#C9A962'];
  let h = 0; for (const ch of String(nome || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
};
const listaDe = (r) => (Array.isArray(r) ? r : (r?.items || []));

// Busca as vendas do gerente por id e (para cadastros antigos) pelo nome do assessor.
async function buscarVendas(vendedor) {
  const pedidos = [base44.entities.Venda.filter({ vendedor_id: vendedor.id }, { sort: '-data', limit: 200 })];
  if (vendedor.nome) {
    pedidos.push(base44.entities.Venda.filter({ assessor_comercial: vendedor.nome }, { sort: '-data', limit: 200 }));
  }
  const respostas = await Promise.all(pedidos);
  const mapa = new Map();
  respostas.forEach(r => listaDe(r).forEach(v => { if (v?.id) mapa.set(v.id, v); }));
  const alvo = normNome(vendedor.nome);
  return [...mapa.values()].filter(v => v.vendedor_id === vendedor.id || normNome(v.assessor_comercial) === alvo);
}

export default function VendasGerentePopup({ vendedor, dataInicio, dataFim, onClose }) {
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const todas = await buscarVendas(vendedor);
        const lista = todas
          .filter(v => (!dataInicio || v.data >= dataInicio) && (!dataFim || v.data <= dataFim))
          .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
        if (ativo) { setVendas(lista); setCarregando(false); }
      } catch {
        if (ativo) setCarregando(false);
      }
    };
    carregar();
    // Tempo real: qualquer venda criada/alterada/removida recarrega a lista do gerente.
    const unsub = base44.entities.Venda.subscribe(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(carregar, 700);
    });
    return () => {
      ativo = false;
      clearTimeout(timer.current);
      if (typeof unsub === 'function') unsub();
    };
  }, [vendedor?.id, vendedor?.nome, dataInicio, dataFim]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const total = vendas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const novas = vendas.filter(v => v.tipo_venda !== 'recorrencia');
  const recorrencias = vendas.length - novas.length;
  const totalNovas = novas.reduce((s, v) => s + (parseFloat(v.valor) || 0), 0);
  const ticket = novas.length ? totalNovas / novas.length : 0;
  const cor = corDe(vendedor?.nome);
  const periodo = dataInicio || dataFim ? `${dataCurta(dataInicio)} a ${dataCurta(dataFim)}` : 'todo o histórico';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(3,7,12,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl overflow-hidden flex flex-col vx-suspensa"
        style={{ ...CARD, maxHeight: '84vh', boxShadow: '0 40px 90px -40px rgba(0,0,0,0.95)' }}
        onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          {vendedor?.avatar_url
            ? <img src={vendedor.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${cor}` }} />
            : <span className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: cor + '22', color: cor, border: `2px solid ${cor}` }}>{iniciais(vendedor?.nome)}</span>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: T.txt }}>{vendedor?.nome}</p>
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: T.muted }}>
              <span className="inline-flex w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />
              Histórico de vendas · {periodo}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: T.muted }} title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(0,212,170,0.08)', border: `1px solid ${TEAL}33` }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>Total</p>
            <p className="text-sm font-semibold" style={{ color: TEAL }}>{brl(total)}</p>
          </div>
          <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>Vendas</p>
            <p className="text-sm font-semibold" style={{ color: '#93c5fd' }}>
              {novas.length}{recorrencias > 0 && <span className="text-[10px] font-normal" style={{ color: T.muted }}> +{recorrencias} parc.</span>}
            </p>
          </div>
          <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(212,175,55,0.08)', border: `1px solid ${GOLD}33` }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>Ticket médio</p>
            <p className="text-sm font-semibold" style={{ color: GOLD }}>{brl(ticket)}</p>
          </div>
        </div>

        {/* Lista de vendas */}
        <div className="flex-1 overflow-y-auto">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: T.muted }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: TEAL }} /> Carregando vendas...
            </div>
          )}
          {!carregando && vendas.length === 0 && (
            <p className="py-10 text-center text-sm" style={{ color: T.muted }}>Nenhuma venda deste gerente no período.</p>
          )}
          {!carregando && vendas.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-2.5" style={{ borderTop: `1px solid ${T.line}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: T.txt }}>{v.cliente || '—'}</p>
                <p className="text-[11px] truncate" style={{ color: T.muted }}>{v.produto || '—'} · {dataCurta(v.data)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold" style={{ color: T.txt }}>{brl(v.valor)}</p>
                {v.tipo_venda === 'recorrencia' && (
                  <span className="text-[10px]" style={{ color: '#93c5fd' }}>parcela {v.numero_parcela || ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}