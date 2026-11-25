import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Search, Loader2, ChevronRight, UserRound, DatabaseZap, X, ScrollText } from 'lucide-react';
import { celulaDoProdutoPipeline } from '@/lib/celulas';
import { abrirFicha } from '@/components/celulas/FichaCliente';

// Contratos no novo portal: SÍNTESE do que foi negociado (cliente, produto, valor, condições, gerente,
// situação). O recebido em caixa vem de Vendas — o contrato não substitui a venda.
// Todo o operacional (PDF, assinatura, cobrança, pagamento, envio para Vendas) fica nas células.

const C = { bg: '#0B111C', card: 'rgba(255,255,255,0.03)', card2: 'rgba(255,255,255,0.05)', input: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.11)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799', acc: '#C9A962', ok: '#8FD9B0', warn: '#E3C982', err: '#F4A3A3' };
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');
const SITUACAO = {
  negociacao: { l: 'Em formalização', st: ['rascunho', 'gerado'], cor: C.muted },
  assinado: { l: 'Assinado · aguardando pagamento', st: ['assinado', 'aguardando_pagamento'], cor: C.warn },
  fechado: { l: 'Fechado', st: ['pago', 'no_pipeline'], cor: C.ok },
  cancelado: { l: 'Cancelado', st: ['cancelado'], cor: C.err },
};
const situacaoDe = (s) => Object.entries(SITUACAO).find(([, v]) => v.st.includes(s || 'rascunho'))?.[0] || 'negociacao';
const PERIODOS = [['mes', 'Este mês'], ['3m', 'Últimos 3 meses'], ['ano', 'Este ano'], ['tudo', 'Tudo']];
const inicioPeriodo = (p) => {
  const h = new Date();
  if (p === 'mes') return new Date(h.getFullYear(), h.getMonth(), 1);
  if (p === '3m') return new Date(h.getFullYear(), h.getMonth() - 2, 1);
  if (p === 'ano') return new Date(h.getFullYear(), 0, 1);
  return null;
};

export default function ContratosSintese({ user }) {
  const [sp, setSp] = useSearchParams();
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  const [contratos, setContratos] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [periodo, setPeriodo] = useState('ano');
  const [produto, setProduto] = useState('');
  const [gerente, setGerente] = useState('');
  const [situacao, setSituacao] = useState('');
  const [busca, setBusca] = useState('');
  const [migracao, setMigracao] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      base44.entities.Contrato.list('-created_date', 2000).catch(() => []),
      base44.entities.Venda.list('-data', 3000).catch(() => []),
    ]).then(([c, v]) => { if (vivo) { setContratos(c || []); setVendas(v || []); } });
    return () => { vivo = false; };
  }, [recarga]);

  // Recebido por contrato (Vendas: venda nova + recorrências vinculadas)
  const recebidoPor = useMemo(() => {
    const m = new Map();
    vendas.forEach(v => { if (v.contrato_id) m.set(v.contrato_id, (m.get(v.contrato_id) || 0) + (Number(v.valor) || 0)); });
    return m;
  }, [vendas]);

  const lista = useMemo(() => {
    if (!contratos) return [];
    const ini = inicioPeriodo(periodo);
    const q = busca.trim().toLowerCase();
    return contratos.filter(c => {
      if (ini && new Date(c.data_contrato ? c.data_contrato + 'T12:00:00' : c.created_date) < ini) return false;
      if (produto && c.tipo !== produto) return false;
      if (gerente && c.vendedor_nome !== gerente) return false;
      if (situacao && situacaoDe(c.status) !== situacao) return false;
      if (!situacao && c.status === 'cancelado') return false;
      if (q && !`${c.nome} ${c.cpf_cnpj} ${c.numero_contrato || ''} ${c.vendedor_nome || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contratos, periodo, produto, gerente, situacao, busca]);

  const totais = useMemo(() => {
    const negociado = lista.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);
    const fechados = lista.filter(c => situacaoDe(c.status) === 'fechado');
    const recebido = lista.reduce((s, c) => s + (recebidoPor.get(c.id) || 0), 0);
    return { qtd: lista.length, negociado, fechados: fechados.length, valorFechado: fechados.reduce((s, c) => s + (Number(c.valor_total) || 0), 0), recebido, ticket: lista.length ? negociado / lista.length : 0 };
  }, [lista, recebidoPor]);

  const porProduto = useMemo(() => {
    const m = new Map();
    lista.forEach(c => { const x = m.get(c.tipo) || { qtd: 0, valor: 0 }; x.qtd++; x.valor += Number(c.valor_total) || 0; m.set(c.tipo, x); });
    return [...m.entries()].sort((a, b) => b[1].valor - a[1].valor);
  }, [lista]);

  const produtos = useMemo(() => [...new Set((contratos || []).map(c => c.tipo).filter(Boolean))].sort(), [contratos]);
  const gerentes = useMemo(() => [...new Set((contratos || []).map(c => c.vendedor_nome).filter(Boolean))].sort(), [contratos]);

  const abrirOperacao = (c) => {
    const dest = celulaDoProdutoPipeline(c.tipo);
    if (!dest) { toast.error('Este produto não tem célula no novo ambiente. Use a visão operacional antiga.'); return; }
    const op = dest.celula === 'estruturados' ? c.estudo_id : c.id;
    if (!op) { toast.error('Operação ainda não migrada para a nova estrutura. Rode a migração (administrador).'); return; }
    const n = new URLSearchParams(sp);
    n.set('celula', dest.celula); n.set('produto', dest.produto); n.set('op', op);
    setSp(n);
  };

  const condicoes = (c) => {
    if (c.tipo === 'MONITORE') return `Adesão + mensalidade ${brl(c.mensalidade)} · RATE ${c.rate ?? '—'}%`;
    if (!(parseInt(c.num_parcelas) > 0)) return `À vista${c.forma_pagamento ? ` · ${c.forma_pagamento}` : ''}`;
    return `${Number(c.valor_adesao) > 0 ? `Entrada ${brl(c.valor_adesao)} + ` : ''}${c.num_parcelas}× ${brl(c.valor_parcela)}${c.forma_pagamento ? ` · ${c.forma_pagamento}` : ''}`;
  };
  const sel = { height: 38, padding: '0 12px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13 };

  return (
    <div className="min-h-screen p-4 md:p-7" style={{ background: C.bg, color: C.txt2 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 10 }}><ScrollText className="w-6 h-6" style={{ color: C.acc }} /> Contratos</h1>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Síntese do que foi negociado. O que entrou em caixa está em Vendas; a operação de cada contrato acontece nas células.</p>
          </div>
          {isAdmin && (
            <>
              <button onClick={() => setMigracao(true)} className="vx-btn vx-btn-soft" style={{ height: 38, padding: '0 14px', fontSize: 13 }}><DatabaseZap className="w-4 h-4" /> Migração para a nova estrutura</button>
              <a href="?legado=1" className="vx-btn vx-btn-ghost" style={{ height: 38, padding: '0 14px', fontSize: 13 }}>Visão operacional antiga</a>
            </>
          )}
        </header>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {[
            ['Contratos', String(totais.qtd), `${totais.fechados} fechados`],
            ['Valor negociado', brl(totais.negociado), `ticket médio ${brl(totais.ticket)}`],
            ['Fechado (pago / em Vendas)', brl(totais.valorFechado), null],
            ['Recebido em caixa (Vendas)', brl(totais.recebido), 'vendas vinculadas aos contratos'],
          ].map(([l, v, s]) => (
            <div key={l} style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.line}` }}>
              <p style={{ fontSize: 12, color: C.muted }}>{l}</p>
              <p style={{ fontSize: 24, fontWeight: 600, color: C.txt, marginTop: 6 }}>{v}</p>
              {s && <p style={{ fontSize: 12, color: C.muted2, marginTop: 2 }}>{s}</p>}
            </div>
          ))}
        </div>

        {porProduto.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {porProduto.map(([t, x]) => (
              <button key={t} onClick={() => setProduto(produto === t ? '' : t)} className="vx-btn"
                style={{ height: 34, padding: '0 14px', fontSize: 12, borderRadius: 999, background: produto === t ? 'rgba(201,169,98,.14)' : C.card, color: produto === t ? '#E3C982' : C.txt2, border: `1px solid ${produto === t ? C.acc : C.line}` }}>
                {t} · {x.qtd} · {brl(x.valor)}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ ...sel, display: 'flex', alignItems: 'center', gap: 8, width: 300, maxWidth: '100%' }}>
            <Search className="w-4 h-4" style={{ color: C.muted2 }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Cliente, CPF/CNPJ, nº, gerente…" aria-label="Buscar contratos" style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: C.txt, fontSize: 13 }} />
          </label>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={sel} aria-label="Período">{PERIODOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={produto} onChange={e => setProduto(e.target.value)} style={sel} aria-label="Produto"><option value="">Todos os produtos</option>{produtos.map(p => <option key={p}>{p}</option>)}</select>
          {isAdmin && <select value={gerente} onChange={e => setGerente(e.target.value)} style={sel} aria-label="Gerente"><option value="">Todos os gerentes</option>{gerentes.map(g => <option key={g}>{g}</option>)}</select>}
          <select value={situacao} onChange={e => setSituacao(e.target.value)} style={sel} aria-label="Situação"><option value="">Todas as situações</option>{Object.entries(SITUACAO).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
        </div>

        <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
          <div className="vx-sint-row" style={{ padding: '10px 18px', fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            <span>Cliente</span><span>Produto</span><span className="vx-sint-hide">Condições negociadas</span><span style={{ textAlign: 'right' }}>Negociado</span><span style={{ textAlign: 'right' }}>Recebido</span><span>Situação</span><span />
          </div>
          <style>{`.vx-sint-row{display:grid;grid-template-columns:2.2fr 1fr 2fr 1fr 1fr 1.3fr 64px;gap:12px;align-items:center}@media(max-width:1000px){.vx-sint-row{grid-template-columns:2fr 1fr 1fr 1fr 64px}.vx-sint-hide,.vx-sint-row>span:nth-child(5){display:none}}`}</style>
          {contratos === null && <div style={{ padding: 28, display: 'flex', gap: 8, alignItems: 'center', color: C.muted }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando contratos…</div>}
          {contratos && lista.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: C.muted, fontSize: 14 }}>Nenhum contrato com esses filtros.</div>}
          {lista.map(c => {
            const si = SITUACAO[situacaoDe(c.status)];
            const rec = recebidoPor.get(c.id) || 0;
            return (
              <div key={c.id} role="button" tabIndex={0} className="vx-sint-row vx-row-hover" onClick={() => abrirOperacao(c)} onKeyDown={e => { if (e.key === 'Enter') abrirOperacao(c); }}
                style={{ padding: '12px 18px', borderTop: `1px solid ${C.line}`, fontSize: 13, cursor: 'pointer' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: C.txt, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome || '—'}</span>
                  <span style={{ display: 'block', fontSize: 11, color: C.muted2 }}>{dataBR(c.data_contrato || c.created_date)} · {c.vendedor_nome || '—'}{c.numero_contrato ? ` · nº ${c.numero_contrato}` : ''}{c.indicadores?.[0]?.nome ? ` · indicação ${c.indicadores[0].nome}` : ''}</span>
                </span>
                <span style={{ color: C.txt2 }}>{c.tipo}</span>
                <span className="vx-sint-hide" style={{ color: C.muted, fontSize: 12 }}>{condicoes(c)}</span>
                <span style={{ textAlign: 'right', color: C.txt }}>{brl(c.valor_total)}</span>
                <span style={{ textAlign: 'right', color: rec ? C.ok : C.muted2 }}>{rec ? brl(rec) : '—'}</span>
                <span><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, color: si.cor, border: `1px solid ${si.cor}55`, background: `${si.cor}14` }}>{si.l}</span></span>
                <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <button onClick={(e) => { e.stopPropagation(); abrirFicha(setSp, sp, { clienteId: c.cliente_id, doc: c.cpf_cnpj }); }} title="Ficha do cliente" aria-label={`Ficha de ${c.nome}`} className="vx-btn vx-btn-ghost" style={{ width: 28, height: 28, padding: 0, border: 0 }}><UserRound className="w-4 h-4" /></button>
                  <ChevronRight className="w-4 h-4" style={{ color: C.acc, alignSelf: 'center' }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {migracao && <MigracaoModal onClose={() => setMigracao(false)} onConcluida={() => setRecarga(n => n + 1)} />}
    </div>
  );
}

function MigracaoModal({ onClose, onConcluida }) {
  const [res, setRes] = useState(null);
  const [rodando, setRodando] = useState(null);
  const rodar = async (simular) => {
    if (!simular && !confirm('Executar a migração agora? Ela vincula clientes, negociações, operações e vendas aos contratos (não altera valores nem datas).')) return;
    setRodando(simular ? 'sim' : 'exec');
    try {
      const r = await base44.functions.invoke('migrarContratosNovaEstrutura', { simular });
      const d = r?.data || r;
      if (d?.error) throw new Error(d.error);
      setRes(d);
      if (!simular) { toast.success('Migração concluída.'); onConcluida?.(); }
    } catch (e) { toast.error('Falha na migração: ' + e.message); }
    setRodando(null);
  };
  const ROT = { contratos_analisados: 'Contratos analisados', clientes_vinculados: 'Contratos vinculados a clientes da base', clientes_criados: 'Clientes criados na base', negociacoes_vinculadas: 'Contratos ligados à negociação de origem', operacoes_vinculadas: 'Contratos ligados a operações existentes (estruturados)', operacoes_criadas: 'Operações criadas (Offshore / Conta internacional)', vendas_vinculadas: 'Vendas ligadas ao seu contrato', vendas_ambiguas: 'Vendas sem correspondência segura (ficam como estão)', erros: 'Erros' };
  const LISTAS = ['operacoes_criadas', 'clientes_criados', 'vendas_ambiguas', 'erros'];
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Migração de contratos"
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(4px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-suspensa w-full max-w-[720px] max-h-[90vh] flex flex-col rounded-3xl overflow-hidden" style={{ background: '#101826', border: `1px solid ${C.acc}55` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: `1px solid ${C.line}` }}>
          <DatabaseZap className="w-5 h-5" style={{ color: C.acc }} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.txt }}>Migração para a nova estrutura</span>
          <button onClick={onClose} aria-label="Fechar" className="vx-btn vx-btn-ghost vx-icon-btn"><X className="w-4 h-4" /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
          <p style={{ color: C.txt2, lineHeight: 1.55 }}>Todos os contratos (desde abr/26) passam a abrir nas células: cada um fica ligado ao cadastro do cliente, à negociação de origem e às vendas já lançadas. Offshore e Conta internacional ganham a operação de Produtos estruturados, já na etapa de contrato. Nenhum valor, data ou status é alterado e rodar de novo não duplica nada.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => rodar(true)} disabled={!!rodando} className="vx-btn vx-btn-soft" style={{ height: 38, padding: '0 16px', fontSize: 13 }}>{rodando === 'sim' && <Loader2 className="w-4 h-4 animate-spin" />} Simular (não grava nada)</button>
            <button onClick={() => rodar(false)} disabled={!!rodando || !res} className="vx-btn vx-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 13 }} title={!res ? 'Simule primeiro' : ''}>{rodando === 'exec' && <Loader2 className="w-4 h-4 animate-spin" />} Executar migração</button>
          </div>
          {res && (
            <div style={{ borderRadius: 14, background: C.card, border: `1px solid ${C.line}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 600, color: res.simular ? '#E3C982' : '#8FD9B0' }}>{res.simular ? 'Simulação — nada foi gravado' : 'Migração executada'}</span>
              {Object.entries(res.resumo || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8 }}><span style={{ flex: 1, color: C.txt2 }}>{ROT[k] || k}</span><b style={{ color: C.txt }}>{v}</b></div>
              ))}
              {LISTAS.filter(k => res.detalhes?.[k]?.length).map(k => (
                <details key={k} style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', color: C.muted }}>{ROT[k]} ({res.detalhes[k].length})</summary>
                  <ul style={{ margin: '6px 0 0 16px', color: C.txt2, fontSize: 12 }}>{res.detalhes[k].map((x, i) => <li key={i}>{x}</li>)}</ul>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
