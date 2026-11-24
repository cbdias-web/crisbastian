import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Search, ExternalLink, Plus, ArrowLeft, MessageSquare, Send, Sparkles, Loader2, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { CELULA_ESTRUTURADOS, JORNADAS, contratoDoEstudo, etapaDaOperacao, proximaAcao } from '@/lib/celulas';
import { STATUS_ESTUDO } from '@/lib/estudoViabilidade';

// Paleta da célula: azul profundo + dourado, para marcar o "modo imersivo".
const C = {
  bg: '#0D1420', head: '#0F1726', card: '#111A2A', card2: '#131C2D', input: '#0A101B',
  line: '#1E2533', line2: '#232C3D', gold: '#C9A962', goldTxt: '#E3C982', goldDim: '#2A2416',
  goldLine: '#3A3220', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799',
};

const fmtData = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

export default function CelulaEstruturados() {
  const [sp, setSp] = useSearchParams();
  const aberta = sp.get('celula') === CELULA_ESTRUTURADOS.id;
  if (!aberta) return null;
  return <Overlay sp={sp} setSp={setSp} />;
}

function Overlay({ sp, setSp }) {
  const navigate = useNavigate();
  const produto = JORNADAS[sp.get('produto')] ? sp.get('produto') : 'offshore';
  const opId = sp.get('op');
  const jornada = JORNADAS[produto];

  const [user, setUser] = useState(null);
  const [estudos, setEstudos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState(null);

  const setParam = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, v)));
    setSp(n);
  };
  const fechar = () => {
    const n = new URLSearchParams(sp);
    ['celula', 'produto', 'op'].forEach(k => n.delete(k));
    setSp(n);
  };
  const ir = (to) => navigate(to);

  // Trava a rolagem da página de fundo e fecha com Esc.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') { opId ? setParam({ op: null }) : fechar(); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [opId, sp]);

  const carregar = async () => {
    try {
      const [es, cOff, cCi, cm] = await Promise.all([
        base44.entities.EstudoViabilidade.list('-updated_date', 500),
        base44.entities.Contrato.filter({ tipo: 'OFFSHORE' }, '-created_date', 500),
        base44.entities.Contrato.filter({ tipo: 'CONTA INTERNACIONAL' }, '-created_date', 500),
        base44.entities.CelulaComentario.filter({ celula: CELULA_ESTRUTURADOS.id }, '-created_date', 300),
      ]);
      setEstudos(es || []);
      setContratos([...(cOff || []), ...(cCi || [])]);
      setComentarios(cm || []);
    } catch (e) {
      toast.error('Erro ao carregar a célula: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    carregar();
  }, []);

  useEffect(() => { setEtapaFiltro(null); setBusca(''); }, [produto]);

  // Operações = estudos do produto, com contrato e etapa calculados.
  const operacoes = useMemo(() => {
    const tipo = jornada.tipoContrato;
    const doTipo = tipo ? contratos.filter(c => c.tipo === tipo) : [];
    return estudos
      .filter(e => e.produto === produto && e.status !== 'cancelado')
      .map(e => {
        const contrato = tipo ? contratoDoEstudo(e, doTipo) : null;
        const etapa = etapaDaOperacao(e, contrato);
        return { estudo: e, contrato, etapa, acao: proximaAcao(e, etapa, contrato, produto) };
      });
  }, [estudos, contratos, produto]);

  const contagem = useMemo(() => {
    const c = jornada.etapas.map(() => 0);
    operacoes.forEach(o => { c[o.etapa]++; });
    return c;
  }, [operacoes]);

  const lista = useMemo(() => operacoes.filter(o => {
    if (etapaFiltro !== null && o.etapa !== etapaFiltro) return false;
    if (!busca) return true;
    const q = busca.toLowerCase();
    const e = o.estudo;
    return `${e.cliente_nome || ''} ${e.cliente_documento || ''} ${e.responsavel_nome || ''} ${o.contrato?.numero_contrato || ''}`.toLowerCase().includes(q);
  }), [operacoes, etapaFiltro, busca]);

  const opSel = opId ? operacoes.find(o => o.estudo.id === opId) || null : null;
  const idsVisiveis = useMemo(() => new Set(operacoes.map(o => o.estudo.id)), [operacoes]);

  const atividade = useMemo(() => {
    const ev = [];
    operacoes.forEach(({ estudo: e, contrato }) => {
      const nome = e.cliente_nome || 'Cliente';
      if (e.created_date) ev.push({ quando: e.created_date, quem: e.responsavel_nome || 'Gerente', txt: `abriu a operação de ${nome}`, op: e.id });
      if (e.cliente_devolveu_em || e.data_recebimento) ev.push({ quando: e.cliente_devolveu_em || e.data_recebimento, quem: nome, txt: 'enviou o estudo de viabilidade', op: e.id });
      if (e.analise_gerada_em) ev.push({ quando: e.analise_gerada_em, quem: 'Análise técnica', txt: `gerou a proposta de ${nome}`, op: e.id });
      if (contrato?.created_date) ev.push({ quando: contrato.created_date, quem: contrato.vendedor_nome || 'Gerente', txt: `criou o contrato de ${nome}`, op: e.id });
    });
    comentarios.filter(c => c.produto === produto && c.tipo === 'comentario' && idsVisiveis.has(c.estudo_id))
      .forEach(c => ev.push({ quando: c.created_date, quem: c.autor_nome || 'Usuário', txt: `comentou: “${String(c.texto).slice(0, 70)}${String(c.texto).length > 70 ? '…' : ''}”`, op: c.estudo_id }));
    return ev.filter(x => x.quando).sort((a, b) => new Date(b.quando) - new Date(a.quando)).slice(0, 12);
  }, [operacoes, comentarios, produto, idsVisiveis]);

  const autor = { autor_nome: user?.nome_tratamento || user?.full_name || 'Usuário', autor_email: user?.email || '' };
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const publicar = async (dados) => {
    const novo = await base44.entities.CelulaComentario.create({ celula: CELULA_ESTRUTURADOS.id, produto, origem: 'usuario', ...autor, ...dados });
    setComentarios(l => [novo, ...l]);
    return novo;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center" role="dialog" aria-modal="true" aria-label={CELULA_ESTRUTURADOS.nome}
      style={{ background: 'rgba(3,6,10,0.72)', backdropFilter: 'blur(3px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <style>{`
        .vx-cel{position:relative;margin:16px;flex:1;border-radius:20px;background:${C.bg};border:1px solid ${C.goldLine};display:flex;flex-direction:column;overflow:hidden;color:${C.txt2};font-family:Inter,system-ui,sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
        .vx-cel-body{flex:1;display:flex;gap:20px;padding:20px 24px;min-height:0;overflow:auto}
        .vx-cel-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px}
        .vx-cel-aside{width:340px;flex:none;display:flex;flex-direction:column;gap:14px}
        .vx-steps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
        .vx-row{display:grid;grid-template-columns:2fr 1.3fr 1.2fr 2fr 130px;gap:12px;align-items:center}
        .vx-btn:hover{filter:brightness(1.12)}
        .vx-lnk:hover{background:${C.card2}}
        @media (max-width:1180px){.vx-cel-body{flex-direction:column}.vx-cel-aside{width:auto}.vx-steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media (max-width:720px){.vx-cel{margin:0;border-radius:0}.vx-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.vx-row{grid-template-columns:1fr 1fr}.vx-row .vx-hide{display:none}}
      `}</style>
      <section className="vx-cel">
        {/* Cabeçalho */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 24px', borderBottom: `1px solid ${C.line}`, background: C.head, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 220 }}>
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.gold }}>Célula · modo imersivo</span>
            <span style={{ fontSize: 24, fontWeight: 600, color: C.txt }}>{CELULA_ESTRUTURADOS.nome}</span>
          </div>
          <nav aria-label="Produtos da célula" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: C.input, border: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            {CELULA_ESTRUTURADOS.produtos.map(p => {
              const ativo = p === produto;
              return (
                <button key={p} onClick={() => setParam({ produto: p, op: null })} className="vx-btn"
                  style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: ativo ? 600 : 500, background: ativo ? C.gold : 'transparent', color: ativo ? '#1A1508' : '#B8C0CC' }}>
                  {JORNADAS[p].nome}
                </button>
              );
            })}
          </nav>
          <div style={{ flex: 1 }} />
          {!opSel && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 10, background: C.input, border: `1px solid ${C.line}`, width: 260, maxWidth: '100%' }}>
              <Search className="w-4 h-4" style={{ color: C.muted2 }} aria-hidden="true" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, documento, gerente…" aria-label="Buscar operações"
                style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: C.txt, fontSize: 14 }} />
            </label>
          )}
          <button aria-label="Abrir em nova aba" title="Abrir em nova aba" className="vx-btn" onClick={() => window.open(window.location.href, '_blank')}
            style={{ width: 40, height: 40, borderRadius: 10, background: C.input, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#B8C0CC' }}>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={fechar} className="vx-btn"
            style={{ height: 40, padding: '0 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.goldLine}`, color: C.goldTxt, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <X className="w-4 h-4" /> Voltar ao portal
          </button>
        </header>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.muted }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando a célula…
          </div>
        ) : opSel ? (
          <Operacao op={opSel} produto={produto} comentarios={comentarios} publicar={publicar} voltar={() => setParam({ op: null })} ir={ir} />
        ) : (
          <div className="vx-cel-body">
            <main className="vx-cel-main">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, color: C.txt }}>Jornada {jornada.nome}</div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{jornada.lead}</div>
                </div>
                <button className="vx-btn" onClick={() => ir(`/EstudoViabilidade?novo=${produto}`)}
                  style={{ height: 42, padding: '0 18px', borderRadius: 10, background: C.gold, border: 0, color: '#1A1508', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus className="w-4 h-4" /> Nova operação {jornada.nome}
                </button>
              </div>

              <ol className="vx-steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {jornada.etapas.map((et, i) => {
                  const ativo = etapaFiltro === i;
                  return (
                    <li key={i}>
                      <button onClick={() => setEtapaFiltro(ativo ? null : i)} className="vx-btn" aria-pressed={ativo}
                        style={{ width: '100%', height: '100%', textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', background: ativo ? C.goldDim : C.card, border: `1px solid ${ativo ? C.gold : C.line2}`, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 116 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 24, height: 24, borderRadius: 12, background: C.goldDim, color: C.goldTxt, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                          <span style={{ fontSize: 12, color: C.muted }}>{contagem[i]} {contagem[i] === 1 ? 'operação' : 'operações'}</span>
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, lineHeight: 1.3 }}>{et.titulo}</span>
                        <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{et.sub}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.line}`, gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, flex: 1 }}>
                    Operações {etapaFiltro !== null ? `· ${jornada.etapas[etapaFiltro].titulo}` : 'em andamento'}
                  </span>
                  {etapaFiltro !== null && (
                    <button onClick={() => setEtapaFiltro(null)} style={{ fontSize: 12, color: C.goldTxt, background: 'transparent', border: 0, cursor: 'pointer' }}>Limpar filtro</button>
                  )}
                  <span style={{ fontSize: 12, color: C.muted2 }}>{lista.length}</span>
                </div>
                <div className="vx-row" style={{ padding: '10px 18px', fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  <span>Cliente</span><span>Etapa</span><span className="vx-hide">Responsável</span><span className="vx-hide">Próxima ação</span><span />
                </div>
                {lista.length === 0 && (
                  <div style={{ padding: '28px 18px', fontSize: 14, color: C.muted, textAlign: 'center' }}>
                    Nenhuma operação {jornada.nome} {etapaFiltro !== null ? 'nesta etapa' : 'ainda'}. Use “Nova operação” para abrir um estudo.
                  </div>
                )}
                {lista.map(o => (
                  <div key={o.estudo.id} className="vx-row" style={{ padding: '12px 18px', borderTop: `1px solid #182030`, fontSize: 14 }}>
                    <span style={{ color: C.txt, fontWeight: 500, minWidth: 0 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.estudo.cliente_nome || 'Cliente sem nome'}</span>
                      <span style={{ fontSize: 12, color: C.muted2 }}>{o.estudo.tipo_cliente} · {STATUS_ESTUDO[o.estudo.status]?.label || o.estudo.status}</span>
                    </span>
                    <span><span style={{ padding: '4px 10px', borderRadius: 999, background: '#1C2436', color: C.txt2, fontSize: 12 }}>{jornada.etapas[o.etapa].titulo}</span></span>
                    <span className="vx-hide" style={{ color: '#B8C0CC' }}>{o.estudo.responsavel_nome || '—'}</span>
                    <span className="vx-hide" style={{ color: C.muted }}>{o.acao.label}</span>
                    <span>
                      <button onClick={() => setParam({ op: o.estudo.id })} className="vx-btn"
                        style={{ height: 34, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.goldLine}`, background: 'transparent', color: C.goldTxt, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        Abrir operação
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </main>

            <aside className="vx-cel-aside">
              <Duvidas produto={produto} nomeProduto={jornada.nome} comentarios={comentarios} setComentarios={setComentarios} publicar={publicar} user={user} isAdmin={isAdmin} />
              <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>Atividade da célula</span>
                {atividade.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Sem atividade recente.</span>}
                {atividade.map((a, i) => (
                  <button key={i} onClick={() => setParam({ op: a.op })} className="vx-lnk"
                    style={{ display: 'flex', gap: 10, textAlign: 'left', background: 'transparent', border: 0, padding: 4, borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 15, background: C.goldDim, color: C.goldTxt, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(a.quem)}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: '#DCE2EA', lineHeight: 1.4 }}><b style={{ fontWeight: 600 }}>{a.quem}</b> {a.txt}</span>
                      <span style={{ fontSize: 11, color: C.muted2 }}>{fmtData(a.quando)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>Atalhos</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['Estudos', `/EstudoViabilidade`],
                    ['Análise técnica', `/AnaliseTecnica`],
                    ...(jornada.tipoContrato ? [['Contratos ' + jornada.nome, `/Contratos?tipo=${encodeURIComponent(jornada.tipoContrato)}`]] : [['Contratos', '/Contratos']]),
                  ].map(([l, to]) => (
                    <button key={l} onClick={() => ir(to)} className="vx-btn"
                      style={{ padding: '7px 11px', borderRadius: 8, background: C.card2, border: 0, fontSize: 12, color: C.txt2, cursor: 'pointer' }}>{l}</button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

// ───────────── Dúvidas da célula (perguntas, respostas e IA) ─────────────
function Duvidas({ produto, nomeProduto, comentarios, setComentarios, publicar, user, isAdmin }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aberta, setAberta] = useState(null);
  const [resposta, setResposta] = useState('');
  const [iaRodando, setIaRodando] = useState(null);

  const duvidas = comentarios.filter(c => c.tipo === 'duvida' && c.produto === produto);
  const respostasDe = (id) => comentarios.filter(c => c.tipo === 'resposta' && c.pai_id === id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const perguntar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try { const d = await publicar({ tipo: 'duvida', texto: texto.trim() }); setTexto(''); setAberta(d.id); }
    catch (e) { toast.error(e.message); }
    setEnviando(false);
  };
  const responder = async (d) => {
    if (!resposta.trim()) return;
    try { await publicar({ tipo: 'resposta', pai_id: d.id, texto: resposta.trim() }); setResposta(''); }
    catch (e) { toast.error(e.message); }
  };
  const perguntarIA = async (d) => {
    setIaRodando(d.id);
    try {
      const prompt = `Você apoia a equipe comercial da Villela Exchange na célula Produtos Estruturados, produto ${nomeProduto}. A jornada é: ${JORNADAS[produto].etapas.map(e => e.titulo).join(' → ')}. Responda em português, de forma objetiva (até 8 linhas), à dúvida interna de um gerente. Se a resposta depender de análise jurídica ou tributária do caso, diga isso e indique encaminhar ao head da célula.\n\nDúvida: ${d.texto}`;
      const r = await base44.integrations.Core.InvokeLLM({ prompt });
      const txt = typeof r === 'string' ? r : (r?.text || r?.response || JSON.stringify(r));
      const novo = await base44.entities.CelulaComentario.create({ celula: CELULA_ESTRUTURADOS.id, produto, tipo: 'resposta', pai_id: d.id, texto: txt, origem: 'ia', autor_nome: `IA de ${nomeProduto}`, autor_email: user?.email || '' });
      setComentarios(l => [novo, ...l]);
    } catch (e) { toast.error('A IA não respondeu: ' + e.message); }
    setIaRodando(null);
  };
  const marcarResolvida = async (d) => {
    try {
      await base44.entities.CelulaComentario.update(d.id, { resolvida: !d.resolvida });
      setComentarios(l => l.map(x => x.id === d.id ? { ...x, resolvida: !d.resolvida } : x));
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare className="w-4 h-4" style={{ color: C.gold }} /> Dúvidas sobre {nomeProduto}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') perguntar(); }}
          placeholder="Pergunte à célula…" aria-label={`Nova dúvida sobre ${nomeProduto}`}
          style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 14 }} />
        <button onClick={perguntar} disabled={enviando} aria-label="Publicar dúvida" className="vx-btn"
          style={{ width: 40, height: 40, borderRadius: 10, background: C.gold, border: 0, color: '#1A1508', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {duvidas.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhuma dúvida ainda. A primeira pergunta abre o espaço da célula.</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflow: 'auto' }}>
        {duvidas.slice(0, 20).map(d => {
          const rs = respostasDe(d.id);
          const open = aberta === d.id;
          const podeResolver = isAdmin || d.autor_email === user?.email;
          return (
            <div key={d.id} style={{ padding: 12, borderRadius: 10, background: C.card2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setAberta(open ? null : d.id)} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{d.autor_nome} · {fmtData(d.created_date)}</span>
                <span style={{ fontSize: 14, color: '#DCE2EA', lineHeight: 1.45 }}>{d.texto}</span>
                <span style={{ fontSize: 12, color: d.resolvida ? '#8FD9B0' : C.gold }}>
                  {rs.length} {rs.length === 1 ? 'resposta' : 'respostas'}{d.resolvida ? ' · resolvida' : ''}
                </span>
              </button>
              {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                  {rs.map(r => (
                    <div key={r.id} style={{ fontSize: 13, lineHeight: 1.5, color: C.txt2, whiteSpace: 'pre-wrap' }}>
                      <span style={{ fontWeight: 600, color: r.origem === 'ia' ? C.goldTxt : C.txt }}>{r.autor_nome}: </span>{r.texto}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={resposta} onChange={e => setResposta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') responder(d); }}
                      placeholder="Responder…" aria-label="Responder à dúvida"
                      style={{ flex: 1, height: 36, padding: '0 10px', borderRadius: 8, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13 }} />
                    <button onClick={() => responder(d)} aria-label="Enviar resposta" className="vx-btn"
                      style={{ width: 36, height: 36, borderRadius: 8, background: '#1C2436', border: 0, color: C.goldTxt, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => perguntarIA(d)} disabled={iaRodando === d.id}
                      style={{ fontSize: 12, color: C.goldTxt, background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                      {iaRodando === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Pedir resposta da IA
                    </button>
                    {podeResolver && (
                      <button onClick={() => marcarResolvida(d)} style={{ fontSize: 12, color: '#8FD9B0', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> {d.resolvida ? 'Reabrir' : 'Marcar como resolvida'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── Dentro de uma operação: linha do tempo ─────────────
function Operacao({ op, produto, comentarios, publicar, voltar, ir }) {
  const { estudo: e, contrato, etapa, acao } = op;
  const jornada = JORNADAS[produto];
  const [propostas, setPropostas] = useState([]);
  const [formPos, setFormPos] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    base44.entities.PropostaTecnica.filter({ estudo_id: e.id }, '-versao', 50).then(l => setPropostas(l || [])).catch(() => {});
    if (contrato) {
      const ent = produto === 'offshore' ? base44.entities.RncOffshore : base44.entities.RncContaInternacional;
      ent.filter({ contrato_id: contrato.id }, '-created_date', 1).then(l => setFormPos((l || [])[0] || null)).catch(() => {});
    }
  }, [e.id, contrato?.id]);

  const eventos = useMemo(() => {
    const ev = [];
    const add = (quando, quem, etapaIdx, txt, link) => { if (quando) ev.push({ quando, quem, etapa: jornada.etapas[etapaIdx]?.titulo, txt, link }); };
    add(e.created_date, e.responsavel_nome || 'Gerente', 0, e.nda_url ? `Operação aberta com o NDA ${e.nda_nome ? `(${e.nda_nome}) ` : ''}anexado.` : 'Operação aberta — NDA ainda não anexado.');
    add(e.data_envio_cliente || e.link_gerado_em, e.responsavel_nome || 'Gerente', 1, 'Link do estudo de viabilidade enviado ao cliente.');
    add(e.cliente_devolveu_em || e.data_recebimento, e.cliente_nome || 'Cliente', 1, 'Estudo devolvido com propósito, expectativas e documentos.', { label: 'Abrir estudo', to: `/EstudoViabilidade?estudo=${e.id}` });
    add(e.data_envio_analise, e.enviado_analise_por || 'Gerente', 2, 'Estudo enviado para análise técnica.');
    propostas.forEach(p => {
      const lk = { label: 'Abrir análise', to: `/AnaliseTecnica?estudo=${e.id}` };
      add(p.created_date, p.origem === 'manual' ? (p.responsavel_nome || 'Gerente') : 'Análise técnica (IA)', 2, `Proposta técnica v${p.versao}${p.codigo ? ` (${p.codigo})` : ''} ${p.origem === 'revisao_ia' ? 'revisada' : 'gerada'}${p.motivo_revisao ? ` — ${p.motivo_revisao}` : ''}.`, lk);
      add(p.aprovada_em, p.aprovada_por || 'Gestão', 3, `Proposta v${p.versao} aprovada.`, lk);
      add(p.enviada_em, p.responsavel_nome || 'Gerente', 3, `Proposta v${p.versao} enviada ao cliente.`, lk);
      if (p.status === 'aceita' || p.status === 'recusada') add(p.decisao_em, e.cliente_nome || 'Cliente', 3, `Proposta v${p.versao} ${p.status === 'aceita' ? 'aceita' : 'recusada'} pelo cliente.${p.decisao_observacao ? ` ${p.decisao_observacao}` : ''}`, lk);
    });
    if (contrato) {
      const lk = { label: 'Ver em Contratos', to: `/Contratos?tipo=${encodeURIComponent(contrato.tipo)}` };
      add(contrato.created_date, contrato.vendedor_nome || 'Gerente', 4, `Contrato ${contrato.numero_contrato || ''} criado (${contrato.status}).`, lk);
    }
    if (formPos) {
      add(formPos.link_gerado_em, formPos.responsavel_nome || 'Gerente', 5, 'Link do formulário pós-contrato enviado ao cliente.');
      add(formPos.link_preenchido_em || formPos.data_preenchimento, formPos.cliente_nome || e.cliente_nome || 'Cliente', 5, 'Cliente preencheu o formulário pós-contrato.');
    }
    comentarios.filter(c => c.tipo === 'comentario' && c.estudo_id === e.id)
      .forEach(c => ev.push({ quando: c.created_date, quem: c.autor_nome || 'Usuário', etapa: 'Comentário', txt: c.texto, comentario: true }));
    return ev.sort((a, b) => new Date(b.quando) - new Date(a.quando));
  }, [e, propostas, contrato, formPos, comentarios]);

  const comentar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try { await publicar({ tipo: 'comentario', estudo_id: e.id, texto: texto.trim() }); setTexto(''); }
    catch (er) { toast.error(er.message); }
    setEnviando(false);
  };

  const docs = [
    { nome: 'NDA', ok: !!e.nda_url, st: e.nda_url ? 'Anexado' : 'Pendente' },
    { nome: 'Estudo de viabilidade', ok: !!(e.cliente_devolveu_em || e.data_recebimento), st: STATUS_ESTUDO[e.status]?.label || e.status },
    { nome: 'Análise / proposta', ok: ['aprovada', 'enviada_cliente', 'aceita'].includes(e.proposta_status), st: e.proposta_status ? `v${e.proposta_versao || 1} · ${e.proposta_status}` : 'Não gerada' },
    { nome: 'Contrato', ok: contrato && ['assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'].includes(contrato.status), st: contrato ? contrato.status : 'Não gerado' },
    ...(jornada.tipoContrato ? [{ nome: produto === 'offshore' ? 'Formulário da LLC' : 'Formulário de abertura', ok: !!(formPos?.link_preenchido_em), st: formPos ? (formPos.link_preenchido_em ? 'Preenchido' : 'Enviado') : 'Após assinatura' }] : []),
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
        <button onClick={voltar} className="vx-btn"
          style={{ height: 38, padding: '0 12px', borderRadius: 10, border: `1px solid ${C.goldLine}`, background: 'transparent', color: C.goldTxt, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <ArrowLeft className="w-4 h-4" /> {jornada.nome}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 21, fontWeight: 600, color: C.txt }}>{e.cliente_nome || 'Cliente sem nome'}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{jornada.nome} · {e.tipo_cliente}{e.cliente_documento ? ` · ${e.cliente_documento}` : ''} · responsável {e.responsavel_nome || '—'}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ padding: '6px 12px', borderRadius: 999, background: C.goldDim, color: C.goldTxt, fontSize: 13, fontWeight: 500 }}>Etapa atual: {jornada.etapas[etapa].titulo}</span>
        <button onClick={() => ir(acao.to)} className="vx-btn"
          style={{ height: 40, padding: '0 16px', borderRadius: 10, background: C.gold, border: 0, color: '#1A1508', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {acao.label} <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <ol aria-label="Jornada da operação" className="vx-steps" style={{ listStyle: 'none', margin: 0, padding: '16px 24px', borderBottom: `1px solid ${C.line}` }}>
        {jornada.etapas.map((et, i) => {
          const feito = i < etapa, atual = i === etapa;
          return (
            <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ height: 4, borderRadius: 2, background: feito ? C.gold : atual ? '#7A6634' : C.line }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: feito ? C.gold : atual ? C.goldDim : '#141C2B', color: feito ? '#1A1508' : atual ? C.goldTxt : C.muted2, border: atual ? `1px solid ${C.gold}` : 0 }}>{feito ? '✓' : i + 1}</span>
                <span style={{ fontSize: 13, color: feito || atual ? C.txt : C.muted2, fontWeight: feito || atual ? 500 : 400 }}>{et.titulo}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="vx-cel-body">
        <main className="vx-cel-main" style={{ gap: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.txt }}>Linha do tempo da operação</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 12, background: C.head, border: `1px solid ${C.line}` }}>
            <input value={texto} onChange={ev => setTexto(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') comentar(); }}
              placeholder="Comente na operação — a equipe da célula acompanha por aqui" aria-label="Comentar na operação"
              style={{ flex: 1, height: 40, padding: '0 10px', background: 'transparent', border: 0, outline: 0, color: C.txt, fontSize: 14 }} />
            <button onClick={comentar} disabled={enviando} className="vx-btn"
              style={{ height: 38, padding: '0 14px', borderRadius: 8, background: '#1C2436', border: 0, color: C.goldTxt, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar
            </button>
          </div>
          {eventos.map((ev, i) => (
            <article key={i} style={{ padding: 14, borderRadius: 12, background: ev.comentario ? C.card2 : C.head, border: `1px solid ${C.line}`, display: 'flex', gap: 12 }}>
              <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 17, background: ev.comentario ? C.goldDim : '#1C2436', color: ev.comentario ? C.goldTxt : C.txt2, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(ev.quem)}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{ev.quem}</span>
                  {ev.etapa && <span style={{ padding: '2px 8px', borderRadius: 999, background: C.goldDim, color: C.goldTxt, fontSize: 11 }}>{ev.etapa}</span>}
                  <span style={{ fontSize: 12, color: C.muted2 }}>{fmtData(ev.quando)}</span>
                </div>
                <div style={{ fontSize: 14, color: C.txt2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.txt}</div>
                {ev.link && (
                  <button onClick={() => ir(ev.link.to)} style={{ alignSelf: 'flex-start', fontSize: 13, color: C.goldTxt, background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}>{ev.link.label} →</button>
                )}
              </div>
            </article>
          ))}
        </main>

        <aside className="vx-cel-aside">
          <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><FileText className="w-4 h-4" style={{ color: C.gold }} /> Documentos da operação</span>
            {docs.map(d => (
              <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ flex: 1, color: '#DCE2EA' }}>{d.nome}</span>
                <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 12, background: d.ok ? '#16291F' : '#141C2B', color: d.ok ? '#8FD9B0' : C.muted }}>{d.st}</span>
              </div>
            ))}
            <span style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45 }}>Tudo o que é gerado nesta operação continua aparecendo em Contratos e, ao fechar, em Vendas.</span>
          </div>
          <div style={{ borderRadius: 14, background: C.head, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>Ir para</span>
            {[
              ['Estudo de viabilidade', `/EstudoViabilidade?estudo=${e.id}`],
              ['Análise técnica e proposta', `/AnaliseTecnica?estudo=${e.id}`],
              ...(jornada.tipoContrato ? [[contrato ? 'Contrato da operação' : 'Gerar contrato', contrato ? `/Contratos?tipo=${encodeURIComponent(contrato.tipo)}` : `/Contratos?novo=${encodeURIComponent(jornada.tipoContrato)}`]] : [['Contratos', '/Contratos']]),
            ].map(([l, to]) => (
              <button key={l} onClick={() => ir(to)} className="vx-lnk"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.line}`, color: C.txt2, fontSize: 13, cursor: 'pointer' }}>
                {l} <ChevronRight className="w-4 h-4" style={{ color: C.gold }} />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
