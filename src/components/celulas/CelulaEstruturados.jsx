import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Search, ExternalLink, Plus, ArrowLeft, MessageSquare, Send, Sparkles, Loader2, CheckCircle2, FileText, ChevronRight, UserRound, Pencil, Trash2 } from 'lucide-react';
import { CELULAS, JORNADAS, contratoDoEstudo, etapaDaOperacao, proximaAcao, etapaContrato, proximaAcaoContrato, pipelineDoProduto, mesmoCliente } from '@/lib/celulas';
import { STATUS_ESTUDO } from '@/lib/estudoViabilidade';
import NdaGeradorModal, { BuscaCliente } from './NdaGeradorModal';
import { VendaDaOperacao } from './ContratoNaCelula';
import JornadaContrato from './JornadaContrato';
import { LinksDeColeta, COLETAS } from './ColetaCliente';
import AnexarNdaAssinadoModal from './AnexarNdaAssinadoModal';
import NovaOperacaoModal from './NovaOperacaoModal';
import EditarEstudoModal from '@/components/estudo/EditarEstudoModal';
import LeadsDaJornada from './LeadsDaJornada';
import { abrirFicha } from './FichaCliente';
import RncCanalBancarioModal from '@/components/contratos/RncCanalBancarioModal';
import RncContaInternacionalModal from '@/components/contratos/RncContaInternacionalModal';
import OffshoreFormModal from '@/components/contratos/OffshoreFormModal';
import { DetalheEstudoModal } from '@/pages/EstudoViabilidade';
import { Workspace as AnaliseWorkspace } from '@/pages/AnaliseTecnica';
import { valorHonorariosProjeto, somaEtapas } from '@/lib/propostaTecnica';
import { confirmar } from '@/lib/confirmar';

// Neutros comuns às células; as cores de destaque vêm do tema de cada célula.
const C = { card: 'rgba(255,255,255,0.025)', card2: 'rgba(255,255,255,0.045)', input: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.1)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799' };

// Fundo institucional do portal — a célula usa a mesma imagem das telas do portal
const FUNDO_PORTAL = 'https://media.base44.com/images/public/698a1739c50002e4d14fa547/ed94a18f2_generated_image.png';
const veu = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const STATUS_CONTRATO = { rascunho: 'Rascunho', gerado: 'PDF gerado', assinado: 'Assinado', aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago', no_pipeline: 'No pipeline', cancelado: 'Cancelado' };

const fmtData = (d) => {
  if (!d) return '';
  const dt = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// Abre um arquivo anexado: link público direto ou, se for arquivo privado (file_uri), link temporário.
async function abrirArquivo(ref, baixarComo) {
  try {
    let url = ref;
    if (!/^https?:\/\//i.test(String(ref || ''))) {
      const r = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ref, expires_in: 600 });
      url = r?.signed_url || r?.data?.signed_url;
    }
    if (!url) throw new Error('sem link');
    if (baixarComo) {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = baixarComo;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch { toast.error('Não foi possível abrir o documento.'); }
}

export default function CelulaOverlay() {
  const [sp, setSp] = useSearchParams();
  const cfg = CELULAS[sp.get('celula')];
  if (!cfg) return null;
  return <Overlay key={cfg.id} cfg={cfg} sp={sp} setSp={setSp} />;
}

function Overlay({ cfg, sp, setSp }) {
  const navigate = useNavigate();
  const t = cfg.tema;
  const produto = cfg.produtos.includes(sp.get('produto')) ? sp.get('produto') : cfg.produtos[0];
  const opId = sp.get('op');
  const jornada = JORNADAS[produto];

  const [user, setUser] = useState(null);
  const [dados, setDados] = useState({ estudos: [], contratos: [], pipeline: [], implantacoes: [] });
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState(null);
  const [ndaModal, setNdaModal] = useState(null); // { estudo } | null
  const [novaOp, setNovaOp] = useState(false);
  const [modoLista, setModoLista] = useState('operacoes'); // operacoes | leads
  const fichaDe = (o) => abrirFicha(setSp, sp, { clienteId: o.raw.estudo?.cliente_id || o.raw.contrato?.cliente_id || o.raw.neg?.cliente_id, doc: o.doc });
  const [recarga, setRecarga] = useState(0);
  const recarregar = () => setRecarga(n => n + 1);

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && !ndaModal && !novaOp) { opId ? setParam({ op: null }) : fechar(); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [opId, sp, ndaModal, novaOp]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const tipos = cfg.produtos.map(p => JORNADAS[p].tipoContrato).filter(Boolean);
    const cm = base44.entities.CelulaComentario.filter({ celula: cfg.id }, '-created_date', 300).catch(() => []);
    const carga = cfg.fonte === 'estudo'
      ? Promise.all([
          base44.entities.EstudoViabilidade.list('-updated_date', 500),
          Promise.all(tipos.map(tp => base44.entities.Contrato.filter({ tipo: tp }, '-created_date', 500))).then(ls => ls.flat()),
        ]).then(([estudos, contratos]) => ({ estudos: estudos || [], contratos: contratos || [], pipeline: [], implantacoes: [] }))
      : Promise.all([
          Promise.all(tipos.map(tp => base44.entities.Contrato.filter({ tipo: tp }, '-created_date', 500))).then(ls => ls.flat()),
          base44.entities.Pipeline.list('-created_date', 500).catch(() => []),
          base44.entities.Implantacao.list('-created_date', 500).catch(() => []),
        ]).then(([contratos, pipeline, implantacoes]) => ({ estudos: [], contratos: contratos || [], pipeline: pipeline || [], implantacoes: implantacoes || [] }));
    Promise.all([carga, cm])
      .then(([d, c]) => { setDados(d); setComentarios(c || []); })
      .catch(e => toast.error('Erro ao carregar a célula: ' + e.message))
      .finally(() => setLoading(false));
  }, [cfg.id, recarga]);

  useEffect(() => { setEtapaFiltro(null); setBusca(''); setModoLista('operacoes'); }, [produto]);

  // Operações normalizadas: { id, kind, cliente, sub, responsavel, etapa, acao, quando, raw }
  const operacoes = useMemo(() => {
    const tipo = jornada.tipoContrato;
    const doTipo = tipo ? dados.contratos.filter(c => c.tipo === tipo && c.status !== 'cancelado') : [];
    if (cfg.fonte === 'estudo') {
      return dados.estudos
        .filter(e => e.produto === produto && e.status !== 'cancelado')
        .map(e => {
          const contrato = tipo ? contratoDoEstudo(e, doTipo) : null;
          const etapa = etapaDaOperacao(e, contrato);
          return { id: e.id, kind: 'estudo', cliente: e.cliente_nome || 'Cliente sem nome', doc: e.cliente_documento, sub: `${e.tipo_cliente} · ${STATUS_ESTUDO[e.status]?.label || e.status}`, responsavel: e.responsavel_nome, etapa, acao: proximaAcao(e, etapa, contrato, produto), quando: e.updated_date, raw: { estudo: e, contrato } };
        });
    }
    const ops = doTipo.map(c => {
      const impl = dados.implantacoes.find(i => i.contrato_id === c.id) || null;
      const negOrigem = c.pipeline_id ? dados.pipeline.find(n => n.id === c.pipeline_id) || null : null;
      const etapa = etapaContrato(c, impl);
      return { id: c.id, kind: 'contrato', cliente: c.nome || 'Cliente sem nome', doc: c.cpf_cnpj, sub: `${c.numero_contrato ? 'Contrato ' + c.numero_contrato : 'Sem número'} · ${STATUS_CONTRATO[c.status] || c.status}`, responsavel: c.vendedor_nome, etapa, acao: proximaAcaoContrato(etapa, c, produto), quando: c.updated_date || c.created_date, raw: { contrato: c, impl, negOrigem } };
    });
    dados.pipeline
      // Negociações em aberto (Perdido sai da jornada; Fechado já deveria ter virado contrato)
      .filter(n => pipelineDoProduto(n, produto) && !['Perdido', 'Fechado'].includes(n.temperatura))
      .filter(n => !doTipo.some(c => mesmoCliente({ doc: n.cliente_cpf_cnpj, nome: n.cliente_nome }, { doc: c.cpf_cnpj, nome: c.nome })))
      .forEach(n => ops.push({ id: 'p_' + n.id, kind: 'pipeline', cliente: n.cliente_nome || 'Prospect', doc: n.cliente_cpf_cnpj, sub: `Pipeline · ${n.temperatura || 'Frio'}`, responsavel: n.vendedor_nome, etapa: 0, acao: proximaAcaoContrato(0, null, produto), quando: n.updated_date || n.created_date, raw: { neg: n } }));
    return ops.sort((a, b) => new Date(b.quando || 0) - new Date(a.quando || 0));
  }, [dados, produto]);

  const contagem = useMemo(() => {
    const c = jornada.etapas.map(() => 0);
    operacoes.forEach(o => { c[o.etapa]++; });
    return c;
  }, [operacoes]);

  const lista = useMemo(() => operacoes.filter(o => {
    if (etapaFiltro !== null && o.etapa !== etapaFiltro) return false;
    // Sem filtro, a lista mostra só o que está em andamento (as concluídas ficam no cartão "Concluída")
    if (etapaFiltro === null && !busca && cfg.fonte === 'contrato' && o.etapa === 5) return false;
    if (!busca) return true;
    return `${o.cliente} ${o.doc || ''} ${o.responsavel || ''} ${o.sub}`.toLowerCase().includes(busca.toLowerCase());
  }), [operacoes, etapaFiltro, busca]);

  const opSel = opId ? operacoes.find(o => o.id === opId) || null : null;
  const idsVisiveis = useMemo(() => new Set(operacoes.map(o => o.id)), [operacoes]);

  const atividade = useMemo(() => {
    const ev = [];
    operacoes.forEach(o => {
      if (o.kind === 'estudo') {
        const e = o.raw.estudo, ct = o.raw.contrato;
        ev.push({ quando: e.created_date, quem: e.responsavel_nome || 'Gerente', txt: `abriu a operação de ${o.cliente}`, op: o.id });
        if (e.cliente_devolveu_em || e.data_recebimento) ev.push({ quando: e.cliente_devolveu_em || e.data_recebimento, quem: o.cliente, txt: 'enviou o estudo de viabilidade', op: o.id });
        if (e.analise_gerada_em) ev.push({ quando: e.analise_gerada_em, quem: 'Análise técnica', txt: `gerou a proposta de ${o.cliente}`, op: o.id });
        if (ct?.created_date) ev.push({ quando: ct.created_date, quem: ct.vendedor_nome || 'Gerente', txt: `criou o contrato de ${o.cliente}`, op: o.id });
      } else if (o.kind === 'contrato') {
        const ct = o.raw.contrato, im = o.raw.impl;
        ev.push({ quando: ct.created_date, quem: ct.vendedor_nome || 'Gerente', txt: `criou o contrato ${jornada.nome} de ${o.cliente}`, op: o.id });
        if (im?.data_entrada) ev.push({ quando: im.data_entrada, quem: im.padrinho_nome || 'Implantação', txt: `iniciou a implantação de ${o.cliente}`, op: o.id });
        if (im?.data_conclusao) ev.push({ quando: im.data_conclusao, quem: im.padrinho_nome || 'Implantação', txt: `concluiu a implantação de ${o.cliente}`, op: o.id });
      } else {
        ev.push({ quando: o.raw.neg.created_date, quem: o.raw.neg.vendedor_nome || 'Gerente', txt: `abriu a negociação com ${o.cliente}`, op: o.id });
      }
    });
    comentarios.filter(c => c.produto === produto && ['comentario', 'abordagem'].includes(c.tipo) && idsVisiveis.has(c.operacao_id || c.estudo_id))
      .forEach(c => ev.push({ quando: c.created_date, quem: c.autor_nome || 'Usuário', txt: `comentou: “${String(c.texto).slice(0, 70)}${String(c.texto).length > 70 ? '…' : ''}”`, op: c.operacao_id || c.estudo_id }));
    return ev.filter(x => x.quando).sort((a, b) => new Date(b.quando) - new Date(a.quando)).slice(0, 12);
  }, [operacoes, comentarios, produto, idsVisiveis]);

  const autor = { autor_nome: user?.nome_tratamento || user?.full_name || 'Usuário', autor_email: user?.email || '' };
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const publicar = async (d) => {
    const novo = await base44.entities.CelulaComentario.create({ celula: cfg.id, produto, origem: 'usuario', ...autor, ...d });
    setComentarios(l => [novo, ...l]);
    return novo;
  };

  const novaOperacao = () => {
    // Offshore: a operação começa pela geração do NDA (modelo validado)
    if (cfg.fonte === 'estudo' && produto === 'offshore') return setNdaModal({ estudo: null });
    // Demais produtos: cliente (base/carteira) + negociação ou estudo, sem sair da célula
    setNovaOp(true);
  };

  // ?nova=1 (vindo do "+ Novo" do cabeçalho ou de páginas espelho): abre a criação da operação
  useEffect(() => {
    if (loading || sp.get('nova') !== '1') return;
    setParam({ nova: null });
    novaOperacao();
  }, [loading, sp]);

  const temaVars = { '--vx-acc': t.acc, '--vx-acc2': t.acc2, '--vx-txt': t.txt, '--vx-dim': t.dim, '--vx-line': t.line, '--vx-glow': t.glow, '--vx-on-acc': t.onAcc };

  return (
    <div data-manter-jarvis className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-7" role="dialog" aria-modal="true" aria-label={cfg.nome}
      style={{ background: 'rgba(3,6,10,0.62)', backdropFilter: 'blur(6px)', ...temaVars }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <style>{`
        .vx-cel-body{flex:1;display:flex;gap:20px;padding:20px 24px;min-height:0;overflow:auto}
        .vx-cel-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px}
        .vx-cel-aside{width:340px;flex:none;display:flex;flex-direction:column;gap:14px}
        .vx-steps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
        .vx-row{display:grid;grid-template-columns:2fr 1.2fr 1.1fr 2fr 124px;gap:12px;align-items:center}
        .vx-tab{transition:background .2s ease,color .2s ease,box-shadow .2s ease,transform .2s ease}
        .vx-tab:hover{transform:translateY(-1px);color:${C.txt}}
        .vx-lista{overflow:hidden}
        .vx-lista>.vx-cel-main{min-height:0;overflow:hidden}
        .vx-lista>.vx-cel-aside{min-height:0;overflow-y:auto;padding-right:4px;scrollbar-gutter:stable}
        .vx-lista-card{flex:1;min-height:220px}
        .vx-lista>.vx-cel-aside>*,.vx-lista>.vx-cel-main>*:not(.vx-lista-card){flex-shrink:0}
        .vx-lista-rolagem{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
        .vx-lista .vx-cel-aside::-webkit-scrollbar,.vx-lista-rolagem::-webkit-scrollbar{width:8px}
        .vx-lista .vx-cel-aside::-webkit-scrollbar-thumb,.vx-lista-rolagem::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:8px}
        .vx-crumb{background:transparent;border:0;padding:0;color:inherit;cursor:pointer;font:inherit}.vx-crumb:hover{color:${C.txt};text-decoration:underline}
        @media (max-width:1180px){.vx-lista{overflow:auto}.vx-lista>.vx-cel-main,.vx-lista>.vx-cel-aside{overflow:visible}.vx-lista-card{flex:none}.vx-lista-rolagem{max-height:65vh}.vx-cel-body{flex-direction:column}.vx-cel-aside{width:auto}.vx-steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media (max-width:720px){.vx-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.vx-row{grid-template-columns:1fr 1fr 124px}.vx-row .vx-hide{display:none}}
      `}</style>
      <section className="vx-suspensa" style={{ width: '100%', maxWidth: 1680, height: '100%', borderRadius: 24, background: `linear-gradient(${veu(t.bg, 0.82)}, ${veu(t.bg, 0.92)}), url("${FUNDO_PORTAL}") center / cover no-repeat ${t.bg}`, border: `1px solid ${t.line}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: C.txt2, boxShadow: `0 50px 120px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.03), 0 0 80px -40px ${t.glow}` }}>
        {/* Cabeçalho */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 24px', borderBottom: `1px solid ${C.line}`, background: t.head, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 }}>
            <nav aria-label="Você está em" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
              <button onClick={fechar} className="vx-crumb">Portal</button>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <button onClick={() => setParam({ op: null })} className="vx-crumb" style={{ color: opSel ? C.muted : t.acc }}>{cfg.nome} · {jornada.nome}</button>
              {opSel && <><ChevronRight className="w-3 h-3" aria-hidden="true" /><span style={{ color: t.acc }}>{opSel.cliente}</span></>}
            </nav>
            <span style={{ fontSize: 24, fontWeight: 600, color: C.txt }}>{cfg.nome}</span>
          </div>
          <nav aria-label="Produtos" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: C.input, border: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            {cfg.produtos.map(p => {
              const ativo = p === produto;
              return (
                <button key={p} onClick={() => setParam({ produto: p, op: null })} className="vx-tab"
                  style={{ height: 36, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: ativo ? 600 : 500, background: ativo ? `linear-gradient(135deg, ${t.acc2}, ${t.acc})` : 'transparent', color: ativo ? t.onAcc : '#B8C0CC', boxShadow: ativo ? `0 8px 18px -10px ${t.glow}` : 'none' }}>
                  {JORNADAS[p].nome}
                </button>
              );
            })}
          </nav>
          <div style={{ flex: 1 }} />
          {!opSel && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 999, background: C.input, border: `1px solid ${C.line}`, width: 270, maxWidth: '100%' }}>
              <Search className="w-4 h-4" style={{ color: C.muted2 }} aria-hidden="true" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, documento, gerente…" aria-label="Buscar operações"
                style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: C.txt, fontSize: 14 }} />
            </label>
          )}
          <button aria-label="Abrir em nova aba" title="Abrir em nova aba" className="vx-btn vx-btn-ghost vx-icon-btn" onClick={() => window.open(window.location.href, '_blank')}>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={fechar} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 14 }}>
            <X className="w-4 h-4" /> Voltar ao portal
          </button>
        </header>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.muted }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando…
          </div>
        ) : opSel ? (
          opSel.kind === 'estudo'
            ? <OperacaoEstudo op={opSel} produto={produto} t={t} comentarios={comentarios} publicar={publicar} voltar={() => setParam({ op: null })} ir={ir}
                abrirNda={(estudo) => setNdaModal({ estudo })} recarregar={recarregar} user={user} isAdmin={isAdmin} onFicha={() => fichaDe(opSel)}
                acaoInicial={sp.get('acao')} limparAcao={() => setParam({ acao: null })} />
            : <OperacaoContrato op={opSel} produto={produto} t={t} comentarios={comentarios} publicar={publicar} voltar={() => setParam({ op: null })} ir={ir}
                 recarregar={recarregar} abrirOp={(id) => { recarregar(); setParam({ op: id }); }} user={user} isAdmin={isAdmin} onFicha={() => fichaDe(opSel)}
                 produtosCelula={cfg.produtos} mudarProduto={(p, id) => { recarregar(); setParam({ produto: p, op: id }); }}
                 acaoInicial={sp.get('acao')} limparAcao={() => setParam({ acao: null })} />
        ) : (
          <div className="vx-cel-body vx-lista">
            <main className="vx-cel-main">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, color: C.txt }}>Jornada {jornada.nome}</div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{jornada.lead}</div>
                </div>
                <button className="vx-btn vx-btn-primary" onClick={novaOperacao} style={{ height: 44, padding: '0 20px', fontSize: 14 }}>
                  <Plus className="w-4 h-4" /> {cfg.fonte === 'estudo' || jornada.tipoContrato ? `Nova operação ${jornada.nome}` : 'Nova negociação'}
                </button>
              </div>

              <ol className="vx-steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {jornada.etapas.map((et, i) => {
                  const ativo = etapaFiltro === i;
                  return (
                    <li key={i}>
                      <button onClick={() => setEtapaFiltro(ativo ? null : i)} className="vx-card-lift" aria-pressed={ativo}
                        style={{ width: '100%', height: '100%', textAlign: 'left', padding: 14, borderRadius: 16, cursor: 'pointer', background: ativo ? t.dim : C.card, border: `1px solid ${ativo ? t.acc : C.line2}`, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 116 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 24, height: 24, borderRadius: 12, background: t.dim, color: t.txt, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.line}` }}>{i + 1}</span>
                          <span style={{ fontSize: 12, color: C.muted }}>{contagem[i]} {contagem[i] === 1 ? 'operação' : 'operações'}</span>
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, lineHeight: 1.3 }}>{et.titulo}</span>
                        <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{et.sub}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div role="tablist" aria-label="Lista da jornada" style={{ display: 'flex', gap: 6 }}>
                {[['operacoes', 'Operações'], ['leads', 'Leads e indicações']].map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={modoLista === k} onClick={() => setModoLista(k)} className="vx-btn"
                    style={{ height: 34, padding: '0 16px', fontSize: 13, borderRadius: 999, background: modoLista === k ? t.dim : 'transparent', color: modoLista === k ? t.txt : C.muted, border: `1px solid ${modoLista === k ? t.acc : C.line}` }}>{l}</button>
                ))}
              </div>
              {modoLista === 'leads' ? (
                <div className="vx-lista-card vx-lista-rolagem">
                  <LeadsDaJornada celula={cfg} produto={produto} t={t} user={user} isAdmin={isAdmin}
                    onIniciada={(id) => { recarregar(); setModoLista('operacoes'); setParam({ op: id }); }}
                    onFicha={(cliente_id, doc) => abrirFicha(setSp, sp, { clienteId: cliente_id, doc })} />
                </div>
              ) : (
              <div className="vx-lista-card" style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.line}`, gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, flex: 1 }}>
                    Operações {etapaFiltro !== null ? `· ${jornada.etapas[etapaFiltro].titulo}` : 'em andamento'}
                  </span>
                  {etapaFiltro !== null && (
                    <button onClick={() => setEtapaFiltro(null)} className="vx-btn vx-btn-soft" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>Limpar filtro</button>
                  )}
                  <span style={{ fontSize: 12, color: C.muted2 }}>{lista.length}</span>
                </div>
                <div className="vx-row" style={{ padding: '10px 18px', fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  <span>Cliente</span><span>Etapa</span><span className="vx-hide">Responsável</span><span className="vx-hide">Próxima ação</span><span />
                </div>
                <div className="vx-lista-rolagem">
                {lista.length === 0 && (
                  <div style={{ padding: '28px 18px', fontSize: 14, color: C.muted, textAlign: 'center' }}>
                    Nenhuma operação {jornada.nome} {etapaFiltro !== null ? 'nesta etapa' : 'ainda'}.
                  </div>
                )}
                {lista.map(o => (
                  <div key={o.id} role="button" tabIndex={0} className="vx-row vx-row-hover"
                    onClick={() => setParam({ op: o.id })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setParam({ op: o.id }); } }}
                    aria-label={`Abrir operação de ${o.cliente}`}
                    style={{ padding: '13px 18px', borderTop: `1px solid ${C.line}`, fontSize: 14 }}>
                    <span style={{ color: C.txt, fontWeight: 500, minWidth: 0 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.cliente}</span>
                      <span style={{ fontSize: 12, color: C.muted2 }}>{o.sub}</span>
                    </span>
                    <span><span style={{ padding: '4px 10px', borderRadius: 999, background: t.dim, color: t.txt, fontSize: 12, border: `1px solid ${t.line}` }}>{jornada.etapas[o.etapa].titulo}</span></span>
                    <span className="vx-hide" style={{ color: '#B8C0CC' }}>{o.responsavel || '—'}</span>
                    <span className="vx-hide" style={{ color: C.muted }}>{o.acao.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={(ev) => { ev.stopPropagation(); setParam({ op: o.id, acao: 'editar' }); }} title="Editar operação" aria-label={`Editar operação de ${o.cliente}`} className="vx-btn vx-btn-ghost" style={{ width: 28, height: 28, padding: 0, border: 0 }}>
                        <Pencil className="w-4 h-4" style={{ color: C.muted }} />
                      </button>
                      <button onClick={(ev) => { ev.stopPropagation(); setParam({ op: o.id, acao: 'excluir' }); }} title="Excluir operação" aria-label={`Excluir operação de ${o.cliente}`} className="vx-btn vx-btn-ghost" style={{ width: 28, height: 28, padding: 0, border: 0 }}>
                        <Trash2 className="w-4 h-4" style={{ color: '#F4A3A3' }} />
                      </button>
                      <button onClick={(ev) => { ev.stopPropagation(); fichaDe(o); }} title="Ficha do cliente" aria-label={`Ficha de ${o.cliente}`} className="vx-btn vx-btn-ghost" style={{ width: 28, height: 28, padding: 0, border: 0 }}>
                        <UserRound className="w-4 h-4" style={{ color: t.txt }} />
                      </button>
                      <ChevronRight className="w-4 h-4" style={{ color: t.acc }} aria-hidden="true" />
                    </span>
                  </div>
                ))}
                </div>
              </div>
              )}
            </main>

            <aside className="vx-cel-aside">
              <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><UserRound className="w-4 h-4" style={{ color: t.acc }} /> Ficha do cliente</span>
                <BuscaCliente acc={t.acc} onEscolher={(c) => abrirFicha(setSp, sp, { clienteId: c.id })} vazioTexto="Nenhum cliente encontrado na base." />
                <span style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45 }}>Negociações, interações, contratos, vendas, parcelas e documentos de qualquer cliente.</span>
              </div>
              {COLETAS[jornada.tipoContrato] && <LinksDeColeta tipo={jornada.tipoContrato} user={user} t={t} />}
              <Duvidas celula={cfg.id} produto={produto} nomeProduto={jornada.nome} t={t} comentarios={comentarios} setComentarios={setComentarios} publicar={publicar} user={user} isAdmin={isAdmin} />
              <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 4 }}>Atividade</span>
                {atividade.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Sem atividade recente.</span>}
                {atividade.map((a, i) => (
                  <button key={i} onClick={() => setParam({ op: a.op })} className="vx-row-hover"
                    style={{ display: 'flex', gap: 10, textAlign: 'left', background: 'transparent', border: 0, padding: 6, borderRadius: 10 }}>
                    <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 15, background: t.dim, color: t.txt, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(a.quem)}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: '#DCE2EA', lineHeight: 1.4 }}><b style={{ fontWeight: 600 }}>{a.quem}</b> {a.txt}</span>
                      <span style={{ fontSize: 11, color: C.muted2 }}>{fmtData(a.quando)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>Visão geral (áreas espelho)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(cfg.fonte === 'estudo'
                    ? [['Estudos', '/EstudoViabilidade'], ['Análise técnica', '/AnaliseTecnica'], [jornada.tipoContrato ? 'Contratos ' + jornada.nome : 'Contratos', jornada.tipoContrato ? `/Contratos?tipo=${encodeURIComponent(jornada.tipoContrato)}` : '/Contratos']]
                    : [['Pipeline', '/Pipeline'], [jornada.tipoContrato ? 'Contratos ' + jornada.nome : 'Contratos', jornada.tipoContrato ? `/Contratos?tipo=${encodeURIComponent(jornada.tipoContrato)}` : '/Contratos'], ['Implantações', '/Implantacoes']]
                  ).map(([l, to]) => (
                    <button key={l} onClick={() => ir(to)} className="vx-btn vx-btn-soft" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>{l}</button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
      {novaOp && (
        <NovaOperacaoModal celula={cfg} produto={produto} t={t} onClose={() => setNovaOp(false)}
          onCriada={(id) => { setNovaOp(false); recarregar(); setParam({ op: id }); }} />
      )}
      {ndaModal && (
        <NdaGeradorModal estudo={ndaModal.estudo} produto={produto} t={t}
          onClose={() => setNdaModal(null)}
          onGerado={(id) => { setNdaModal(null); recarregar(); setParam({ op: id }); }} />
      )}
    </div>
  );
}

// ───────────── Dúvidas da célula ─────────────
function Duvidas({ celula, produto, nomeProduto, t, comentarios, setComentarios, publicar, user, isAdmin }) {
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
      const prompt = `Você apoia a equipe comercial da Villela Exchange (Grupo Villela), produto ${nomeProduto}. A jornada é: ${JORNADAS[produto].etapas.map(e => e.titulo).join(' → ')}. Responda em português, de forma objetiva (até 8 linhas), à dúvida interna de um gerente. Se a resposta depender de análise jurídica, tributária ou cambial do caso, diga isso e indique encaminhar ao head da célula.\n\nDúvida: ${d.texto}`;
      const r = await base44.integrations.Core.InvokeLLM({ prompt });
      const txt = typeof r === 'string' ? r : (r?.text || r?.response || JSON.stringify(r));
      const novo = await base44.entities.CelulaComentario.create({ celula, produto, tipo: 'resposta', pai_id: d.id, texto: txt, origem: 'ia', autor_nome: `IA de ${nomeProduto}`, autor_email: user?.email || '' });
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
    <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare className="w-4 h-4" style={{ color: t.acc }} /> Dúvidas sobre {nomeProduto}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') perguntar(); }}
          placeholder="Pergunte à equipe…" aria-label={`Nova dúvida sobre ${nomeProduto}`}
          style={{ flex: 1, height: 40, padding: '0 14px', borderRadius: 999, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 14 }} />
        <button onClick={perguntar} disabled={enviando} aria-label="Publicar dúvida" className="vx-btn vx-btn-primary vx-icon-btn">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {duvidas.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhuma dúvida ainda.</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflow: 'auto' }}>
        {duvidas.slice(0, 20).map(d => {
          const rs = respostasDe(d.id);
          const open = aberta === d.id;
          const podeResolver = isAdmin || d.autor_email === user?.email;
          return (
            <div key={d.id} style={{ padding: 12, borderRadius: 14, background: C.card2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setAberta(open ? null : d.id)} style={{ textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{d.autor_nome} · {fmtData(d.created_date)}</span>
                <span style={{ fontSize: 14, color: '#DCE2EA', lineHeight: 1.45 }}>{d.texto}</span>
                <span style={{ fontSize: 12, color: d.resolvida ? '#8FD9B0' : t.txt }}>{rs.length} {rs.length === 1 ? 'resposta' : 'respostas'}{d.resolvida ? ' · resolvida' : ''}</span>
              </button>
              {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                  {rs.map(r => (
                    <div key={r.id} style={{ fontSize: 13, lineHeight: 1.5, color: C.txt2, whiteSpace: 'pre-wrap' }}>
                      <span style={{ fontWeight: 600, color: r.origem === 'ia' ? t.txt : C.txt }}>{r.autor_nome}: </span>{r.texto}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={resposta} onChange={e => setResposta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') responder(d); }}
                      placeholder="Responder…" aria-label="Responder à dúvida"
                      style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 999, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13 }} />
                    <button onClick={() => responder(d)} aria-label="Enviar resposta" className="vx-btn vx-btn-soft" style={{ width: 36, height: 36, padding: 0 }}>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => perguntarIA(d)} disabled={iaRodando === d.id} className="vx-btn vx-btn-soft" style={{ height: 30, padding: '0 12px', fontSize: 12 }}>
                      {iaRodando === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Resposta da IA
                    </button>
                    {podeResolver && (
                      <button onClick={() => marcarResolvida(d)} className="vx-btn vx-btn-ghost" style={{ height: 30, padding: '0 12px', fontSize: 12, color: '#8FD9B0', borderColor: 'rgba(143,217,176,.3)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> {d.resolvida ? 'Reabrir' : 'Resolvida'}
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

// ───────────── Peças comuns da tela de operação ─────────────
function CabecalhoOperacao({ op, jornada, t, voltar, ir, subtitulo, acoes = {}, onFicha, gerenciar = [] }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
        <button onClick={voltar} className="vx-btn vx-btn-ghost" style={{ height: 38, padding: '0 14px', fontSize: 13 }}>
          <ArrowLeft className="w-4 h-4" /> {jornada.nome}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 21, fontWeight: 600, color: C.txt }}>{op.cliente}</span>
            {onFicha && (
              <button onClick={onFicha} className="vx-btn vx-btn-soft" style={{ height: 28, padding: '0 12px', fontSize: 12 }} title="Tudo o que o cliente tem ou teve conosco">
                <UserRound className="w-3.5 h-3.5" /> Ficha do cliente
              </button>
            )}
          </span>
          <span style={{ fontSize: 13, color: C.muted }}>{subtitulo}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ padding: '6px 12px', borderRadius: 999, background: t.dim, color: t.txt, fontSize: 13, fontWeight: 500, border: `1px solid ${t.line}` }}>Etapa atual: {jornada.etapas[op.etapa].titulo}</span>
        {gerenciar.filter(Boolean).map(g => (
          <button key={g.label} onClick={g.onClick} className="vx-btn vx-btn-ghost" title={g.label}
            style={{ height: 38, padding: '0 12px', fontSize: 13, ...(g.perigo ? { color: '#F4A3A3' } : {}) }}>
            {g.perigo ? <Trash2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />} {g.label}
          </button>
        ))}
        <button onClick={() => (op.acao.acao && acoes[op.acao.acao] ? acoes[op.acao.acao]() : ir(op.acao.to))} className="vx-btn vx-btn-primary" style={{ height: 42, padding: '0 18px', fontSize: 14 }}>
          {op.acao.label} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <ol aria-label="Jornada da operação" className="vx-steps" style={{ listStyle: 'none', margin: 0, padding: '16px 24px', borderBottom: `1px solid ${C.line}` }}>
        {jornada.etapas.map((et, i) => {
          const feito = i < op.etapa, atual = i === op.etapa;
          return (
            <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ height: 4, borderRadius: 2, background: feito ? t.acc : atual ? t.line : C.line }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: feito ? t.acc : atual ? t.dim : 'rgba(255,255,255,.05)', color: feito ? t.onAcc : atual ? t.txt : C.muted2, border: atual ? `1px solid ${t.acc}` : 0 }}>{feito ? '✓' : i + 1}</span>
                <span style={{ fontSize: 13, color: feito || atual ? C.txt : C.muted2, fontWeight: feito || atual ? 500 : 400 }}>{et.titulo}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function LinhaDoTempo({ eventos, t, publicar, extra, ir, setAba, topo = null }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const comentar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try { await publicar({ tipo: 'comentario', ...extra, texto: texto.trim() }); setTexto(''); }
    catch (er) { toast.error(er.message); }
    setEnviando(false);
  };
  return (
    <main className="vx-cel-main" style={{ gap: 12 }}>
      {topo}
      <span style={{ fontSize: 17, fontWeight: 600, color: C.txt }}>Linha do tempo da operação</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 6px 6px 16px', borderRadius: 999, background: C.input, border: `1px solid ${C.line}` }}>
        <input value={texto} onChange={ev => setTexto(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') comentar(); }}
          placeholder="Comente na operação — a equipe acompanha por aqui" aria-label="Comentar na operação"
          style={{ flex: 1, height: 40, background: 'transparent', border: 0, outline: 0, color: C.txt, fontSize: 14 }} />
        <button onClick={comentar} disabled={enviando} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar
        </button>
      </div>
      {eventos.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Sem eventos registrados ainda.</span>}
      {eventos.map((ev, i) => (
        <article key={i} style={{ padding: 14, borderRadius: 16, background: ev.comentario ? C.card2 : C.card, border: `1px solid ${C.line}`, display: 'flex', gap: 12 }}>
          <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 17, background: ev.comentario ? t.dim : 'rgba(255,255,255,.06)', color: ev.comentario ? t.txt : C.txt2, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(ev.quem)}</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{ev.quem}</span>
              {ev.etapa && <span style={{ padding: '2px 8px', borderRadius: 999, background: t.dim, color: t.txt, fontSize: 11 }}>{ev.etapa}</span>}
              <span style={{ fontSize: 12, color: C.muted2 }}>{fmtData(ev.quando)}</span>
            </div>
            <div style={{ fontSize: 14, color: C.txt2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.txt}</div>
            {ev.link && <button onClick={() => (ev.link.aba && setAba ? setAba(ev.link.aba) : ir(ev.link.to))} className="vx-btn vx-btn-soft" style={{ alignSelf: 'flex-start', height: 28, padding: '0 12px', fontSize: 12 }}>{ev.link.label} →</button>}
          </div>
        </article>
      ))}
    </main>
  );
}

function PainelLateral({ t, docs, atalhos, ir, arquivos = [] }) {
  return (
    <aside className="vx-cel-aside">
      <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><FileText className="w-4 h-4" style={{ color: t.acc }} /> Documentos da operação</span>
        {docs.map(d => (
          <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ flex: 1, color: '#DCE2EA' }}>{d.nome}</span>
            {d.onStatus ? (
              <button onClick={d.onStatus} title={`Anexar ${d.nome}`} className="vx-btn"
                style={{ padding: '3px 9px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: d.ok ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.05)', color: d.ok ? '#8FD9B0' : C.muted, border: `1px solid ${d.ok ? 'rgba(52,211,153,.35)' : C.line2}` }}>{d.st}</button>
            ) : (
              <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 12, background: d.ok ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.05)', color: d.ok ? '#8FD9B0' : C.muted }}>{d.st}</span>
            )}
            {d.acao && (
              <button onClick={d.acao.onClick} className="vx-btn vx-btn-primary" style={{ height: 26, padding: '0 10px', fontSize: 11 }}>{d.acao.label}</button>
            )}
            {d.arquivo && (
              <>
                <button onClick={() => abrirArquivo(d.arquivo)} className="vx-btn vx-btn-soft" style={{ height: 26, padding: '0 10px', fontSize: 11 }} title={`Abrir ${d.nome}`}>Abrir</button>
                <button onClick={() => abrirArquivo(d.arquivo, d.nomeArquivo || `${d.nome}.pdf`)} className="vx-btn vx-btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 11 }} title={`Baixar ${d.nome}`}>Baixar</button>
              </>
            )}
          </div>
        ))}
        {arquivos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <span style={{ fontSize: 12, color: C.muted2, marginBottom: 2 }}>Arquivos enviados pelo cliente ({arquivos.length})</span>
            {arquivos.map((a, i) => (
              <button key={i} onClick={() => abrirArquivo(a.ref)} className="vx-row-hover" title={a.descricao || a.nome}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'transparent', border: 0, color: t.txt, fontSize: 12, textAlign: 'left' }}>
                <FileText className="w-3.5 h-3.5" style={{ flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
              </button>
            ))}
          </div>
        )}
        <span style={{ fontSize: 12, color: C.muted2, lineHeight: 1.45 }}>Contrato, PDF, assinatura, boletos e comprovantes são feitos aqui. A área Contratos mostra o mesmo registro (espelho) e, ao enviar, a venda vai para Vendas.</span>
      </div>
      <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>Ir para</span>
        {atalhos.map(([l, to]) => (
          <button key={l} onClick={() => ir(to)} className="vx-row-hover"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, color: C.txt2, fontSize: 13 }}>
            {l} <ChevronRight className="w-4 h-4" style={{ color: t.acc }} />
          </button>
        ))}
      </div>
    </aside>
  );
}

// Abas da operação: a jornada (linha do tempo), o contrato completo e a venda com comissões
function AbasOperacao({ aba, setAba, t, temContrato, temVenda, extras = [], comContrato = true }) {
  const abas = [['jornada', 'Linha do tempo'], ...extras, ...(comContrato ? [['contrato', temContrato ? 'Contrato' : 'Gerar contrato'], ['venda', 'Venda e comissões']] : [])];
  return (
    <div role="tablist" aria-label="Seções da operação" style={{ display: 'flex', gap: 6, padding: '10px 24px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
      {abas.map(([id, l]) => {
        const on = aba === id;
        return (
          <button key={id} role="tab" aria-selected={on} onClick={() => setAba(id)} className="vx-btn"
            style={{ height: 34, padding: '0 14px', fontSize: 13, borderRadius: 999, background: on ? t.dim : 'transparent', color: on ? t.txt : C.muted, border: `1px solid ${on ? t.acc : C.line}` }}>
            {l}{id === 'venda' && temVenda ? ' ✓' : ''}
          </button>
        );
      })}
    </div>
  );
}

// Corpo das abas Contrato / Venda (ocupa a largura toda; o formulário de criação é claro, o acompanhamento é escuro)
function CorpoContratoVenda({ aba, setAba, contrato, tipoContrato, clienteId, clienteFallback, vinculo, valoresIniciais, t, recarregar, onCriado, user, isAdmin, editarAoAbrir }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
      {aba === 'contrato' && (
        <JornadaContrato contrato={contrato} tipoContrato={tipoContrato} clienteId={clienteId} clienteFallback={clienteFallback} vinculo={vinculo} valoresIniciais={valoresIniciais}
          t={t} user={user} isAdmin={isAdmin} editarAoAbrir={editarAoAbrir}
          onCriado={(c) => { onCriado ? onCriado(c) : recarregar?.(); }}
          onAtualizado={() => recarregar?.()}
          onVendaCriada={() => { recarregar?.(); setAba('venda'); }} />
      )}
      {aba === 'venda' && <VendaDaOperacao contrato={contrato} t={t} />}
    </div>
  );
}

// ───────────── Operação de Produtos estruturados (estudo) ─────────────
function OperacaoEstudo({ op, produto, t, comentarios, publicar, voltar, ir, abrirNda, recarregar, user, isAdmin, onFicha, acaoInicial, limparAcao }) {
  const [formModal, setFormModal] = useState(false);
  const [editEstudo, setEditEstudo] = useState(false);
  const { estudo: e, contrato } = op.raw;
  const jornada = JORNADAS[produto];
  const [modalAssinado, setModalAssinado] = useState(false);
  // Via assinada do NDA: arquivo privado, conclui a etapa NDA e libera o estudo
  const anexarAssinado = async (file) => {
    if (!file) return false;
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      if (!up?.file_uri) throw new Error('Falha no envio.');
      await base44.entities.EstudoViabilidade.update(e.id, { nda_assinado_url: up.file_uri, nda_assinado_nome: file.name, nda_assinado_em: new Date().toISOString() });
      toast.success('NDA assinado anexado. A etapa NDA foi concluída e o estudo de viabilidade liberado.');
      recarregar?.();
      return true;
    } catch (er) { toast.error(er.message || 'Não foi possível anexar.'); return false; }
  };
  const [propostas, setPropostas] = useState([]);
  const [formPos, setFormPos] = useState(null);
  const [aba, setAbaBruta] = useState('jornada');
  // Ao sair do estudo/análise, recarrega a célula (status e proposta podem ter mudado lá dentro)
  const setAba = (n) => { if (['estudo', 'analise'].includes(aba) && n !== aba) recarregar?.(); setAbaBruta(n); };
  useEffect(() => { setAbaBruta('jornada'); }, [e.id]);
  const atualizarEstudo = async (est, dadosNovos, msg) => {
    try { await base44.entities.EstudoViabilidade.update(est.id, dadosNovos); if (msg) toast.success(msg); recarregar?.(); }
    catch (er) { toast.error('Erro: ' + er.message); }
  };
  const excluirEstudo = async (est) => {
    await base44.entities.EstudoViabilidade.delete(est.id);
    toast.success('Operação excluída.');
    recarregar?.(); voltar();
  };

  useEffect(() => {
    base44.entities.PropostaTecnica.filter({ estudo_id: e.id }, '-versao', 50).then(l => setPropostas(l || [])).catch(() => {});
    if (contrato) {
      const ent = produto === 'offshore' ? base44.entities.RncOffshore : base44.entities.RncContaInternacional;
      ent.filter({ contrato_id: contrato.id }, '-created_date', 1).then(l => setFormPos((l || [])[0] || null)).catch(() => {});
    }
  }, [e.id, contrato?.id]);

  const eventos = useMemo(() => {
    const ev = [];
    const add = (quando, quem, idx, txt, link) => { if (quando) ev.push({ quando, quem, etapa: jornada.etapas[idx]?.titulo, txt, link }); };
    if (e.nda_origem === 'gerado') {
      add(e.created_date, e.responsavel_nome || 'Gerente', 0, 'Operação aberta.');
      add(e.nda_gerado_em, e.responsavel_nome || 'Gerente', 0, `NDA gerado no portal${(e.nda_partes || []).length > 1 ? ` (${e.nda_partes.length} partes do cliente)` : ''} e enviado para assinatura.`);
      add(e.nda_assinado_em, e.responsavel_nome || 'Gerente', 0, `Via assinada do NDA anexada${e.nda_assinado_nome ? ` (${e.nda_assinado_nome})` : ''}.`);
    } else {
      add(e.created_date, e.responsavel_nome || 'Gerente', 0, e.nda_url ? `Operação aberta com o NDA ${e.nda_nome ? `(${e.nda_nome}) ` : ''}anexado.` : 'Operação aberta — NDA ainda não anexado.');
    }
    add(e.data_envio_cliente || e.link_gerado_em, e.responsavel_nome || 'Gerente', 1, 'Link do estudo de viabilidade enviado ao cliente.');
    add(e.cliente_devolveu_em || e.data_recebimento, e.cliente_nome || 'Cliente', 1, 'Estudo devolvido com propósito, expectativas e documentos.', { label: 'Abrir estudo', aba: 'estudo' });
    add(e.data_envio_analise, e.enviado_analise_por || 'Gerente', 2, 'Estudo enviado para análise técnica.');
    propostas.forEach(p => {
      const lk = { label: 'Abrir análise', aba: 'analise' };
      add(p.created_date, p.origem === 'manual' ? (p.responsavel_nome || 'Gerente') : 'Análise técnica (IA)', 2, `Proposta técnica v${p.versao}${p.codigo ? ` (${p.codigo})` : ''} ${p.origem === 'revisao_ia' ? 'revisada' : 'gerada'}${p.motivo_revisao ? ` — ${p.motivo_revisao}` : ''}.`, lk);
      add(p.aprovada_em, p.aprovada_por || 'Gestão', 3, `Proposta v${p.versao} aprovada.`, lk);
      add(p.enviada_em, p.responsavel_nome || 'Gerente', 3, `Proposta v${p.versao} enviada ao cliente.`, lk);
      if (p.status === 'aceita' || p.status === 'recusada') add(p.decisao_em, e.cliente_nome || 'Cliente', 3, `Proposta v${p.versao} ${p.status === 'aceita' ? 'aceita' : 'recusada'} pelo cliente.${p.decisao_observacao ? ` ${p.decisao_observacao}` : ''}`, lk);
    });
    if (contrato) add(contrato.created_date, contrato.vendedor_nome || 'Gerente', 4, `Contrato ${contrato.numero_contrato || ''} criado (${STATUS_CONTRATO[contrato.status] || contrato.status}).`, { label: 'Abrir contrato', aba: 'contrato' });
    if (formPos) {
      add(formPos.link_gerado_em, formPos.responsavel_nome || 'Gerente', 5, 'Link do formulário pós-contrato enviado ao cliente.');
      add(formPos.link_preenchido_em || formPos.data_preenchimento, formPos.cliente_nome || e.cliente_nome || 'Cliente', 5, 'Cliente preencheu o formulário pós-contrato.');
    }
    comentarios.filter(c => c.tipo === 'comentario' && c.estudo_id === e.id)
      .forEach(c => ev.push({ quando: c.created_date, quem: c.autor_nome || 'Usuário', etapa: 'Comentário', txt: c.texto, comentario: true }));
    return ev.sort((a, b) => new Date(b.quando) - new Date(a.quando));
  }, [e, propostas, contrato, formPos, comentarios]);

  const docs = [
    ...(e.nda_origem === 'gerado'
      ? [
          { nome: 'NDA (gerado)', ok: true, st: 'Gerado', arquivo: e.nda_url, nomeArquivo: e.nda_nome, acao: produto === 'offshore' ? { label: 'Refazer', onClick: () => abrirNda(e) } : null },
          { nome: 'NDA assinado', ok: !!e.nda_assinado_url, st: e.nda_assinado_url ? 'Assinado' : 'Aguardando', arquivo: e.nda_assinado_url || null, nomeArquivo: e.nda_assinado_nome, onStatus: () => setModalAssinado(true), acao: { label: e.nda_assinado_url ? 'Substituir' : 'Anexar', onClick: () => setModalAssinado(true) } },
        ]
      : [{ nome: 'NDA', ok: !!e.nda_url, st: e.nda_url ? 'Anexado' : 'Pendente', arquivo: e.nda_url || null, nomeArquivo: e.nda_nome, acao: !e.nda_url && produto === 'offshore' ? { label: 'Gerar', onClick: () => abrirNda(e) } : null }]),
    { nome: 'Estudo de viabilidade', ok: !!(e.cliente_devolveu_em || e.data_recebimento), st: STATUS_ESTUDO[e.status]?.label || e.status },
    { nome: 'Análise / proposta', ok: ['aprovada', 'enviada_cliente', 'aceita'].includes(e.proposta_status), st: e.proposta_status ? `v${e.proposta_versao || 1} · ${e.proposta_status}` : 'Não gerada' },
    { nome: 'Contrato', ok: !!contrato && ['assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'].includes(contrato.status), st: contrato ? (STATUS_CONTRATO[contrato.status] || contrato.status) : 'Não gerado', arquivo: contrato?.contrato_assinado_url || contrato?.pdf_url || null, nomeArquivo: contrato?.contrato_assinado_nome || `Contrato ${contrato?.numero_contrato || ''}.pdf` },
    ...(jornada.tipoContrato ? [{ nome: produto === 'offshore' ? 'Formulário da LLC' : 'Formulário de abertura', ok: !!(formPos?.link_preenchido_em), st: formPos ? (formPos.link_preenchido_em ? 'Preenchido' : 'Enviado') : 'Após assinatura', arquivo: formPos?.pdf_url || null, nomeArquivo: formPos?.pdf_nome,
      acao: contrato ? { label: formPos ? 'Abrir' : 'Gerar link', onClick: () => setFormModal(true) } : null }] : []),
  ];
  const atalhos = [
    ['Estudo de viabilidade', () => setAba('estudo')],
    ['Análise técnica e proposta', () => setAba('analise')],
    ...(jornada.tipoContrato ? [[contrato ? 'Contrato da operação' : 'Gerar contrato', () => setAba('contrato')], ['Venda e comissões', () => setAba('venda')]] : []),
  ];
  const irAba = (to) => (typeof to === 'function' ? to() : ir(to));
  // Valores definidos na análise/proposta seguem para o contrato
  const propostaBase = propostas.find(p => p.id === e.proposta_atual_id) || propostas.find(p => p.status === 'aceita') || propostas[0] || null;
  const valoresDaProposta = propostaBase ? {
    valor_total: valorHonorariosProjeto(propostaBase.conteudo) || '',
    ...(jornada.tipoContrato === 'OFFSHORE' ? { prazo_implantacao_dias: somaEtapas(propostaBase.conteudo?.etapas).prazo || '' } : {}),
    observacoes: propostaBase.conteudo?.investimento?.condicoes ? `Condições da proposta ${propostaBase.codigo || 'v' + propostaBase.versao}: ${propostaBase.conteudo.investimento.condicoes}` : '',
  } : null;

  const ger = [
          podeGerenciar(e, user, isAdmin) && { label: 'Editar', onClick: () => setEditEstudo(true) },
          contrato && podeGerenciar(contrato, user, isAdmin) && contrato.status !== 'no_pipeline' && { label: 'Excluir contrato', perigo: true, onClick: async () => { if (await excluirContratoDaOperacao(contrato)) recarregar?.(); } },
          podeGerenciar(e, user, isAdmin) && { label: 'Excluir', perigo: true, onClick: async () => {
            if (contrato) { toast.error('Esta operação tem contrato. Exclua o contrato primeiro (ou cancele a operação).'); return; }
            if (!(await confirmar(`Excluir a operação ${jornada.nome} de ${e.cliente_nome || 'cliente'}? NDA, estudo e propostas desta operação deixam de aparecer. O cadastro do cliente continua na base.`))) return;
            try { await excluirEstudo(e); } catch (er) { toast.error(er.message); }
          } },
        ];
  // Editar/excluir a partir da lista (?acao=editar|excluir)
  useEffect(() => {
    if (!acaoInicial) return;
    const g = ger.filter(Boolean);
    const alvo = acaoInicial === 'excluir' ? (g.find(x => x.perigo && x.label === 'Excluir') || g.find(x => x.perigo)) : g.find(x => !x.perigo);
    limparAcao?.();
    if (alvo) alvo.onClick(); else toast.error('Você não tem permissão para esta ação nesta operação.');
  }, [acaoInicial]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <CabecalhoOperacao op={op} jornada={jornada} t={t} voltar={voltar} ir={ir} onFicha={onFicha}
        gerenciar={ger}
        acoes={{ nda: () => abrirNda(e), nda_assinado: () => setModalAssinado(true), estudo: () => setAba('estudo'), analise: () => setAba('analise'), contrato: () => setAba('contrato'), venda: () => setAba('venda') }}
        subtitulo={`${jornada.nome} · ${e.tipo_cliente}${e.cliente_documento ? ` · ${e.cliente_documento}` : ''} · responsável ${e.responsavel_nome || '—'}`} />
      <AbasOperacao aba={aba} setAba={setAba} t={t} temContrato={!!contrato} temVenda={contrato?.status === 'no_pipeline'}
        extras={[['estudo', 'Estudo de viabilidade'], ['analise', 'Análise e proposta']]} comContrato={!!jornada.tipoContrato} />
      {aba === 'estudo' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <DetalheEstudoModal embutido estudo={e} user={user} isAdmin={isAdmin} onClose={() => setAba('jornada')}
            onAtualizar={atualizarEstudo} onExcluido={excluirEstudo} onIrAnalise={() => setAba('analise')} />
        </div>
      ) : aba === 'analise' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <AnaliseWorkspace key={e.id} estudoId={e.id} embutido onVoltar={() => setAba('jornada')} onIrEstudo={() => setAba('estudo')} />
        </div>
      ) : aba === 'jornada' ? (
        <div className="vx-cel-body">
          <LinhaDoTempo eventos={eventos} t={t} publicar={publicar} extra={{ estudo_id: e.id }} ir={irAba} setAba={setAba} />
          <PainelLateral t={t} docs={docs} atalhos={atalhos} ir={irAba}
            arquivos={(e.documentos || []).filter(d => d.url).map(d => ({ ref: d.url, nome: d.nome_arquivo || d.descricao || 'Documento', descricao: d.descricao }))} />
        </div>
      ) : (
        <CorpoContratoVenda aba={aba} setAba={setAba} contrato={contrato} tipoContrato={jornada.tipoContrato} t={t} recarregar={recarregar} user={user} isAdmin={isAdmin}
          clienteId={e.cliente_id} vinculo={{ estudo_id: e.id }} valoresIniciais={valoresDaProposta}
          clienteFallback={{ nome: e.cliente_nome, cpf_cnpj: e.cliente_documento, email: e.cliente_email, telefone: e.cliente_telefone }} />
      )}
      {modalAssinado && (
        <AnexarNdaAssinadoModal estudo={e} t={t} onEnviar={anexarAssinado} onClose={() => setModalAssinado(false)} />
      )}
      {editEstudo && (
        <EditarEstudoModal estudo={e} user={user} onClose={() => setEditEstudo(false)}
          onSalvar={async (dados) => { await atualizarEstudo(e, dados, 'Operação atualizada'); setEditEstudo(false); }} />
      )}
      {formModal && contrato && produto === 'offshore' && (
        <OffshoreFormModal contrato={contrato} rncId={formPos?.id || null} user={user} onClose={() => { setFormModal(false); recarregar?.(); }} />
      )}
      {formModal && contrato && produto !== 'offshore' && (
        <RncContaInternacionalModal contrato={contrato} rncId={formPos?.id || null} user={user} onClose={() => { setFormModal(false); recarregar?.(); }} />
      )}
    </div>
  );
}

// Quem pode editar/excluir: admin ou quem criou o registro
const podeGerenciar = (reg, user, isAdmin) => {
  if (!reg) return false;
  if (isAdmin) return true;
  const em = String(user?.email || '').toLowerCase();
  return !!em && [reg.created_by, reg.responsavel_email].some(x => String(x || '').toLowerCase() === em);
};

// Exclui o contrato da operação (bloqueia se já virou venda) e reabre a negociação de origem
async function excluirContratoDaOperacao(ct) {
  if (ct.status === 'no_pipeline') { toast.error('Este contrato já foi enviado para Vendas. Estorne a venda em Vendas antes de excluir.'); return false; }
  const vendas = await base44.entities.Venda.filter({ contrato_id: ct.id }, '-data', 1).catch(() => []);
  if (vendas?.length) { toast.error('Há venda lançada para este contrato. Estorne a venda em Vendas antes de excluir.'); return false; }
  if (!(await confirmar(`Excluir o contrato ${ct.numero_contrato || ''} de ${ct.nome || 'cliente'}? Esta ação não pode ser desfeita.`))) return false;
  await base44.entities.Contrato.delete(ct.id);
  if (ct.pipeline_id) await base44.entities.Pipeline.update(ct.pipeline_id, { temperatura: 'Quente' }).catch(() => {});
  toast.success(ct.pipeline_id ? 'Contrato excluído. A negociação voltou a ficar aberta.' : 'Contrato excluído.');
  return true;
}

// Edição da negociação: cliente/produto/valores/responsável
function EditarNegociacaoModal({ neg, t, produtosCelula, isAdmin, onClose, onSalvo }) {
  const prodAtual = produtosCelula.find(p => pipelineDoProduto(neg, p)) || produtosCelula[0];
  const [f, setF] = useState({ produto: prodAtual, cliente_nome: neg.cliente_nome || '', cliente_cpf_cnpj: neg.cliente_cpf_cnpj || '', cliente_telefone: neg.cliente_telefone || '', valor_estimado: neg.valor_estimado || '', data_prevista: neg.data_prevista || '', temperatura: neg.temperatura || 'Morno', origem: neg.origem || 'Outro', proximo_contato: neg.proximo_contato || '', descricao: neg.descricao || '', vendedor_id: neg.vendedor_id || '' });
  const [vendedores, setVendedores] = useState([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (isAdmin) base44.entities.Vendedor.filter({ ativo: true }, 'nome', 200).then(l => setVendedores(l || [])).catch(() => {}); }, [isAdmin]);
  const salvar = async () => {
    if (!f.cliente_nome.trim()) { toast.error('Informe o nome do cliente.'); return; }
    setSalvando(true);
    try {
      const v = vendedores.find(x => x.id === f.vendedor_id);
      await base44.entities.Pipeline.update(neg.id, {
        produto: JORNADAS[f.produto].nome, cliente_nome: f.cliente_nome.trim(), cliente_cpf_cnpj: f.cliente_cpf_cnpj, cliente_telefone: f.cliente_telefone,
        valor_estimado: Number(f.valor_estimado) || 0, data_prevista: f.data_prevista || null, temperatura: f.temperatura, origem: f.origem,
        proximo_contato: f.proximo_contato || null, descricao: f.descricao,
        ...(v && v.id !== neg.vendedor_id ? { vendedor_id: v.id, vendedor_nome: v.nome } : {}),
      });
      if (neg.cliente_id) {
        // mantém o cadastro da base coerente (só completa o que estiver vazio)
        const c = await base44.entities.Cliente.get(neg.cliente_id).catch(() => null);
        if (c) {
          const falt = {};
          if (!c.telefone && f.cliente_telefone) falt.telefone = f.cliente_telefone;
          if (!c.cpf_cnpj && f.cliente_cpf_cnpj) falt.cpf_cnpj = f.cliente_cpf_cnpj;
          if (Object.keys(falt).length) await base44.entities.Cliente.update(c.id, falt).catch(() => {});
        }
      }
      toast.success('Negociação atualizada.');
      onSalvo?.(f.produto);
    } catch (e) { toast.error(e.message); }
    setSalvando(false);
  };
  const inp = { height: 38, padding: '0 12px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13, width: '100%' };
  const L = ({ l, children, span = 1 }) => <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4, gridColumn: `span ${span}` }}>{l}{children}</label>;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Editar negociação"
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(4px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-suspensa w-full max-w-[720px] max-h-[92vh] flex flex-col rounded-3xl overflow-hidden" style={{ background: '#101826', border: `1px solid ${t.acc}55` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: `1px solid ${C.line}` }}>
          <Pencil className="w-5 h-5" style={{ color: t.acc }} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.txt }}>Editar negociação</span>
          <button onClick={onClose} aria-label="Fechar" className="vx-btn vx-btn-ghost vx-icon-btn"><X className="w-4 h-4" /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
          {L({ l: 'Produto', children: <select value={f.produto} onChange={e => setF({ ...f, produto: e.target.value })} style={inp}>{produtosCelula.map(p => <option key={p} value={p}>{JORNADAS[p].nome}</option>)}</select> })}
          {L({ l: 'Cliente', span: 3, children: <input value={f.cliente_nome} onChange={e => setF({ ...f, cliente_nome: e.target.value })} style={inp} /> })}
          {L({ l: 'CPF/CNPJ', children: <input value={f.cliente_cpf_cnpj} onChange={e => setF({ ...f, cliente_cpf_cnpj: e.target.value })} style={inp} /> })}
          {L({ l: 'Telefone', children: <input value={f.cliente_telefone} onChange={e => setF({ ...f, cliente_telefone: e.target.value })} style={inp} /> })}
          {L({ l: 'Valor (R$)', children: <input type="number" min="0" step="0.01" value={f.valor_estimado} onChange={e => setF({ ...f, valor_estimado: e.target.value })} style={inp} /> })}
          {L({ l: 'Previsão de fechamento', children: <input type="date" value={f.data_prevista} onChange={e => setF({ ...f, data_prevista: e.target.value })} style={inp} /> })}
          {L({ l: 'Temperatura', children: <select value={f.temperatura} onChange={e => setF({ ...f, temperatura: e.target.value })} style={inp}>{['Frio', 'Morno', 'Quente'].map(x => <option key={x}>{x}</option>)}</select> })}
          {L({ l: 'Origem', children: <select value={f.origem} onChange={e => setF({ ...f, origem: e.target.value })} style={inp}>{['Carteira', 'Lead', 'Indicação', 'Prospecção Ativa', 'Outro'].map(x => <option key={x}>{x}</option>)}</select> })}
          {L({ l: 'Próximo contato', children: <input type="date" value={f.proximo_contato} onChange={e => setF({ ...f, proximo_contato: e.target.value })} style={inp} /> })}
          {isAdmin && L({ l: 'Responsável', children: <select value={f.vendedor_id} onChange={e => setF({ ...f, vendedor_id: e.target.value })} style={inp}><option value="">{neg.vendedor_nome || '—'}</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}</select> })}
          {L({ l: 'Contexto / condições', span: 4, children: <textarea rows={3} value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical' }} /> })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

const CANAIS = { ligacao: 'Ligação', whatsapp: 'WhatsApp', reuniao: 'Reunião', email: 'E-mail', visita: 'Visita', outro: 'Outro' };
const brlN = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Negociação da operação (registro do Pipeline): valor, prazo, temperatura, próximo contato e abordagens
function NegociacaoCard({ neg, aberta, t, publicar, operacaoId, recarregar, voltar, gerarContrato }) {
  const [f, setF] = useState({ valor_estimado: neg.valor_estimado || '', data_prevista: neg.data_prevista || '', temperatura: neg.temperatura || 'Morno', proximo_contato: neg.proximo_contato || '', descricao: neg.descricao || '' });
  const [salvando, setSalvando] = useState(false);
  const [canal, setCanal] = useState('ligacao');
  const [texto, setTexto] = useState('');
  const [registrando, setRegistrando] = useState(false);
  useEffect(() => { setF({ valor_estimado: neg.valor_estimado || '', data_prevista: neg.data_prevista || '', temperatura: neg.temperatura || 'Morno', proximo_contato: neg.proximo_contato || '', descricao: neg.descricao || '' }); }, [neg.id, neg.updated_date]);
  const mudou = String(f.valor_estimado) !== String(neg.valor_estimado || '') || f.data_prevista !== (neg.data_prevista || '') || f.temperatura !== (neg.temperatura || 'Morno') || f.proximo_contato !== (neg.proximo_contato || '') || f.descricao !== (neg.descricao || '');

  const salvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.Pipeline.update(neg.id, { ...f, valor_estimado: Number(f.valor_estimado) || 0, data_prevista: f.data_prevista || null, proximo_contato: f.proximo_contato || null });
      toast.success('Negociação atualizada.');
      recarregar?.();
    } catch (er) { toast.error(er.message); }
    setSalvando(false);
  };
  const registrar = async () => {
    if (!texto.trim()) { toast.error('Descreva a abordagem.'); return; }
    setRegistrando(true);
    try { await publicar({ tipo: 'abordagem', canal, operacao_id: operacaoId, texto: texto.trim() }); setTexto(''); toast.success('Abordagem registrada.'); }
    catch (er) { toast.error(er.message); }
    setRegistrando(false);
  };
  const perder = async () => {
    const motivo = prompt('Motivo da perda (opcional):');
    if (motivo === null) return;
    try {
      await base44.entities.Pipeline.update(neg.id, { temperatura: 'Perdido', observacao: [neg.observacao, motivo && `Perdida: ${motivo}`].filter(Boolean).join('\n') });
      toast.success('Negociação marcada como perdida.');
      recarregar?.(); voltar?.();
    } catch (er) { toast.error(er.message); }
  };

  const inp = { height: 36, padding: '0 10px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13, width: '100%' };
  const lbl = { fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 };

  if (!aberta) {
    return (
      <div style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: C.txt }}>Negociação de origem</span>
        <span>Valor estimado: <b style={{ color: C.txt }}>{brlN(neg.valor_estimado)}</b></span>
        <span>Origem: {neg.origem || '—'}</span>
        <span>Aberta em {fmtData(neg.created_date)}</span>
      </div>
    );
  }
  return (
    <div style={{ padding: 16, borderRadius: 18, background: C.card2, border: `1px solid ${t.line}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.txt, flex: 1 }}>Negociação</span>
        <span style={{ fontSize: 12, color: C.muted }}>Origem: {neg.origem || '—'} · aberta em {fmtData(neg.created_date)}</span>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <label style={lbl}>Valor negociado (R$)<input type="number" min="0" step="0.01" value={f.valor_estimado} onChange={ev => setF({ ...f, valor_estimado: ev.target.value })} style={inp} /></label>
        <label style={lbl}>Previsão de fechamento<input type="date" value={f.data_prevista} onChange={ev => setF({ ...f, data_prevista: ev.target.value })} style={inp} /></label>
        <label style={lbl}>Temperatura
          <select value={f.temperatura} onChange={ev => setF({ ...f, temperatura: ev.target.value })} style={inp}>{['Frio', 'Morno', 'Quente'].map(x => <option key={x}>{x}</option>)}</select>
        </label>
        <label style={lbl}>Próximo contato<input type="date" value={f.proximo_contato} onChange={ev => setF({ ...f, proximo_contato: ev.target.value })} style={inp} /></label>
      </div>
      <label style={lbl}>Condições / contexto (prazo, parcelamento, o que foi combinado)
        <textarea rows={2} value={f.descricao} onChange={ev => setF({ ...f, descricao: ev.target.value })} style={{ ...inp, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={salvar} disabled={!mudou || salvando} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 14px', fontSize: 13, opacity: mudou ? 1 : 0.5 }}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Salvar negociação
        </button>
        {gerarContrato && (
          <button onClick={async () => { if (mudou) await salvar(); gerarContrato(); }} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 16px', fontSize: 13 }}>
            Fechar e gerar contrato <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={perder} className="vx-btn vx-btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 13, color: '#F4A3A3' }}>Marcar como perdida</button>
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>Registrar abordagem</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={canal} onChange={ev => setCanal(ev.target.value)} aria-label="Canal da abordagem" style={{ ...inp, width: 140 }}>
            {Object.entries(CANAIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={texto} onChange={ev => setTexto(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') registrar(); }}
            placeholder="O que foi tratado, objeções, próximos passos…" aria-label="Descrição da abordagem" style={{ ...inp, flex: 1, minWidth: 220 }} />
          <button onClick={registrar} disabled={registrando} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────── Operação de Área internacional / Operações cross (contrato ou pipeline) ─────────────
function OperacaoContrato({ op, produto, t, comentarios, publicar, voltar, ir, recarregar, abrirOp, user, isAdmin, onFicha, produtosCelula = [], mudarProduto, acaoInicial, limparAcao }) {
  const [formModal, setFormModal] = useState(false);
  const [editNeg, setEditNeg] = useState(false);
  const [editarCt, setEditarCt] = useState(0);
  const jornada = JORNADAS[produto];
  const ct = op.raw.contrato || null;
  const impl = op.raw.impl || null;
  const negAberta = op.raw.neg || null;          // negociação em andamento (ainda sem contrato)
  const neg = negAberta || op.raw.negOrigem || null; // ou a negociação que originou o contrato
  const idsOp = [op.id, ...(neg ? ['p_' + neg.id] : [])]; // registros feitos na fase de negociação seguem com a operação
  const [rnc, setRnc] = useState(null);
  const [aba, setAba] = useState('jornada');
  useEffect(() => { setAba('jornada'); }, [op.id]);

  useEffect(() => {
    if (ct && produto === 'canal_bancario') {
      base44.entities.RncCanalBancario.filter({ contrato_id: ct.id }, '-created_date', 1).then(l => setRnc((l || [])[0] || null)).catch(() => {});
    }
  }, [ct?.id]);

  const listaContratos = jornada.tipoContrato ? `/Contratos?tipo=${encodeURIComponent(jornada.tipoContrato)}` : '/Contratos';

  const eventos = useMemo(() => {
    const ev = [];
    const add = (quando, quem, idx, txt, link) => { if (quando) ev.push({ quando, quem, etapa: idx != null ? jornada.etapas[idx]?.titulo : null, txt, link }); };
    if (neg) {
      add(neg.created_date, neg.vendedor_nome || 'Gerente', 0, `Negociação aberta no Pipeline${neg.valor_estimado ? ` · valor estimado ${Number(neg.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}.${neg.descricao ? `\n${neg.descricao}` : ''}`, null);
      if (negAberta && neg.proximo_contato) add(neg.proximo_contato, neg.vendedor_nome || 'Gerente', 0, 'Próximo contato agendado.');
    }
    if (ct) {
      add(ct.created_date, ct.vendedor_nome || 'Gerente', 1, `Contrato ${ct.numero_contrato || ''} criado${ct.valor_total ? ` · ${Number(ct.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}. Situação atual: ${STATUS_CONTRATO[ct.status] || ct.status}.`, { label: 'Abrir contrato', aba: 'contrato' });
      if (ct.data_contrato) add(ct.data_contrato, ct.vendedor_nome || 'Gerente', 2, 'Data do contrato registrada.');
      if (ct.data_primeiro_pagamento) add(ct.data_primeiro_pagamento, op.cliente, 3, 'Primeiro pagamento previsto/registrado.');
    }
    if (rnc) {
      add(rnc.link_gerado_em, rnc.responsavel_nome || 'Gerente', 4, 'Link do formulário RNC enviado ao cliente.');
      add(rnc.link_preenchido_em || rnc.data_preenchimento, rnc.nome || op.cliente, 4, 'Cliente preencheu o formulário RNC do canal bancário.');
    }
    if (impl) {
      add(impl.data_entrada, impl.padrinho_nome || 'Implantação', 4, `Implantação iniciada${impl.padrinho_nome ? ` com ${impl.padrinho_nome}` : ''}.`, { label: 'Abrir Implantações', to: '/Implantacoes' });
      (impl.historico || []).forEach(h => {
        const q = h.data || h.data_hora || h.created_at || h.em;
        const st = h.status_novo || h.status || '';
        add(q, h.usuario || h.autor || impl.padrinho_nome || 'Implantação', 4, `${st ? `Implantação: ${String(st).replace(/_/g, ' ')}.` : 'Atualização da implantação.'}${h.observacao ? ` ${h.observacao}` : ''}`);
      });
      add(impl.data_conclusao, impl.padrinho_nome || 'Implantação', 5, 'Implantação concluída.');
    }
    comentarios.filter(c => ['comentario', 'abordagem'].includes(c.tipo) && idsOp.includes(c.operacao_id))
      .forEach(c => ev.push({ quando: c.created_date, quem: c.autor_nome || 'Usuário', etapa: c.tipo === 'abordagem' ? `Abordagem · ${CANAIS[c.canal] || 'Contato'}` : 'Comentário', txt: c.texto, comentario: true }));
    return ev.sort((a, b) => new Date(b.quando) - new Date(a.quando));
  }, [ct, impl, neg, rnc, comentarios]);

  const docs = [
    { nome: 'Negociação', ok: !!(neg || ct), st: neg ? (neg.temperatura || 'Aberta') : ct ? 'Convertida' : '—' },
    { nome: 'Contrato', ok: !!ct && !['rascunho', 'gerado'].includes(ct.status), st: ct ? (STATUS_CONTRATO[ct.status] || ct.status) : 'Não gerado', arquivo: ct?.contrato_assinado_url || ct?.pdf_url || null, nomeArquivo: ct?.contrato_assinado_nome || `Contrato ${ct?.numero_contrato || ''}.pdf` },
    ...(produto === 'canal_bancario' ? [{ nome: 'Formulário RNC', ok: !!rnc?.link_preenchido_em, st: rnc ? (rnc.link_preenchido_em ? 'Preenchido' : 'Enviado') : 'Após assinatura', arquivo: rnc?.pdf_url || null, nomeArquivo: rnc?.pdf_nome,
      acao: ct ? { label: rnc ? 'Abrir' : 'Gerar link', onClick: () => setFormModal(true) } : null }] : []),
    { nome: 'Implantação', ok: !!impl && ['concluido', 'concluido_feedback'].includes(impl.status), st: impl ? String(impl.status || '').replace(/_/g, ' ') : 'Não iniciada' },
  ];
  const atalhos = [
    ...(jornada.tipoContrato ? [[ct ? 'Contrato da operação' : 'Gerar contrato', () => setAba('contrato')], ['Venda e comissões', () => setAba('venda')]] : [['Contratos', listaContratos]]),
    ['Implantações', '/Implantacoes'],
  ];
  const irAba = (to) => (typeof to === 'function' ? to() : ir(to));
  const subtitulo = ct
    ? `${jornada.nome} · ${ct.numero_contrato ? 'Contrato ' + ct.numero_contrato : 'contrato sem número'}${ct.cpf_cnpj ? ` · ${ct.cpf_cnpj}` : ''} · responsável ${ct.vendedor_nome || '—'}`
    : `${jornada.nome} · negociação no Pipeline · responsável ${neg?.vendedor_nome || '—'}`;

  const ger = ct ? [
          podeGerenciar(ct, user, isAdmin) && ct.status !== 'no_pipeline' && { label: 'Editar contrato', onClick: () => { setEditarCt(n => n + 1); setAba('contrato'); } },
          podeGerenciar(ct, user, isAdmin) && { label: 'Excluir', perigo: true, onClick: async () => { if (await excluirContratoDaOperacao(ct)) { recarregar?.(); voltar(); } } },
        ] : negAberta ? [
          podeGerenciar(negAberta, user, isAdmin) && { label: 'Editar', onClick: () => setEditNeg(true) },
          podeGerenciar(negAberta, user, isAdmin) && { label: 'Excluir', perigo: true, onClick: async () => {
            if (!(await confirmar(`Excluir a negociação ${jornada.nome} de ${negAberta.cliente_nome || 'cliente'}? As abordagens registradas nela também serão apagadas. O cadastro do cliente continua na base.`))) return;
            try {
              await base44.entities.Pipeline.delete(negAberta.id);
              await Promise.all(comentarios.filter(c => idsOp.includes(c.operacao_id)).map(c => base44.entities.CelulaComentario.delete(c.id).catch(() => {})));
              toast.success('Negociação excluída.');
              recarregar?.(); voltar();
            } catch (er) { toast.error(er.message); }
          } },
        ] : [];
  // Editar/excluir a partir da lista (?acao=editar|excluir)
  useEffect(() => {
    if (!acaoInicial) return;
    const g = ger.filter(Boolean);
    const alvo = acaoInicial === 'excluir' ? (g.find(x => x.perigo && x.label === 'Excluir') || g.find(x => x.perigo)) : g.find(x => !x.perigo);
    limparAcao?.();
    if (alvo) alvo.onClick(); else toast.error('Você não tem permissão para esta ação nesta operação.');
  }, [acaoInicial]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <CabecalhoOperacao op={op} jornada={jornada} t={t} voltar={voltar} ir={ir} subtitulo={subtitulo} onFicha={onFicha}
        gerenciar={ger}
        acoes={{ contrato: () => setAba('contrato'), venda: () => setAba('venda'), negociacao: () => setAba('jornada') }} />
      {jornada.tipoContrato && <AbasOperacao aba={aba} setAba={setAba} t={t} temContrato={!!ct} temVenda={ct?.status === 'no_pipeline'} />}
      {aba === 'jornada' ? (
        <div className="vx-cel-body">
          <LinhaDoTempo eventos={eventos} t={t} publicar={publicar} extra={{ operacao_id: op.id }} ir={irAba} setAba={setAba}
            topo={neg ? <NegociacaoCard neg={neg} aberta={!!negAberta} t={t} publicar={publicar} operacaoId={op.id} recarregar={recarregar} voltar={voltar}
              gerarContrato={jornada.tipoContrato ? () => setAba('contrato') : null} /> : null} />
          <PainelLateral t={t} docs={docs} atalhos={atalhos} ir={irAba} />
        </div>
      ) : (
        <CorpoContratoVenda aba={aba} setAba={setAba} contrato={ct} tipoContrato={jornada.tipoContrato} t={t} recarregar={recarregar} user={user} isAdmin={isAdmin}
          key={'ct' + editarCt} editarAoAbrir={editarCt > 0}
          clienteId={neg?.cliente_id || ct?.cliente_id} vinculo={{ pipeline_id: neg?.id }}
          valoresIniciais={negAberta ? { valor_total: negAberta.valor_estimado || '', observacoes: negAberta.descricao || '' } : null}
          clienteFallback={neg ? { nome: neg.cliente_nome, cpf_cnpj: neg.cliente_cpf_cnpj, telefone: neg.cliente_telefone } : ct ? { nome: ct.nome, cpf_cnpj: ct.cpf_cnpj, email: ct.email, telefone: ct.telefone } : null}
          onCriado={async (c) => {
            if (negAberta) await base44.entities.Pipeline.update(negAberta.id, { temperatura: 'Fechado' }).catch(() => {});
            abrirOp?.(c.id);
          }} />
      )}
      {editNeg && negAberta && (
        <EditarNegociacaoModal neg={negAberta} t={t} produtosCelula={produtosCelula.length ? produtosCelula : [produto]} isAdmin={isAdmin}
          onClose={() => setEditNeg(false)}
          onSalvo={(p) => { setEditNeg(false); if (p !== produto) mudarProduto?.(p, op.id); else recarregar?.(); }} />
      )}
      {formModal && ct && (
        <RncCanalBancarioModal contrato={ct} rncId={rnc?.id || null} user={user} onClose={() => { setFormModal(false); recarregar?.(); }} />
      )}
    </div>
  );
}