import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Loader2, ChevronRight, FileText, Phone, Mail, MapPin, Send, Briefcase, Receipt, MessageSquare, Clock, User } from 'lucide-react';
import { CELULAS, JORNADAS, celulaDoProdutoPipeline, contratoDoEstudo, etapaDaOperacao, etapaContrato } from '@/lib/celulas';

// Ficha do cliente (visão 360): tudo o que o cliente tem ou teve com a Villela Exchange —
// origem (lead/indicação), negociações, interações, estudos e propostas, contratos, formulários,
// vendas, parcelas, comissões, notas fiscais e implantações. Abre por cima de qualquer tela com ?ficha=<id>
// (ou ?ficha=doc:<CPF/CNPJ> para clientes antigos sem cadastro vinculado).

const C = { bg: '#0E1522', card: 'rgba(255,255,255,0.03)', card2: 'rgba(255,255,255,0.05)', input: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.1)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799', acc: '#C9A962' };
const dig = (s) => String(s || '').replace(/\D/g, '');
const fmtDoc = (s) => {
  const d = dig(s);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(s || '').trim();
};
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const quando = (d) => {
  if (!d) return '';
  const dt = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
  return isNaN(dt) ? '' : dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', ...(String(d).length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) });
};
const ts = (d) => { const x = new Date(String(d || '').length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? 0 : x.getTime(); };
const STATUS_CT = { rascunho: 'Rascunho', gerado: 'PDF gerado', assinado: 'Assinado', aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago', no_pipeline: 'Enviado para Vendas', cancelado: 'Cancelado' };
const CANAL = { ligacao: 'Ligação', whatsapp: 'WhatsApp', reuniao: 'Reunião', email: 'E-mail', visita: 'Visita', outro: 'Contato' };
const unicos = (l) => { const m = new Map(); (l || []).forEach(x => x?.id && m.set(x.id, x)); return [...m.values()]; };
const seguro = (p) => p.then(r => (Array.isArray(r) ? r : [])).catch(() => []);

// Onde a operação vive no novo ambiente (célula + produto)
function destinoPorTexto(txt) { return celulaDoProdutoPipeline(txt); }
function destinoEstudo(e) {
  const cel = Object.values(CELULAS).find(c => c.produtos.includes(e.produto));
  return cel ? { celula: cel.id, produto: e.produto } : null;
}

async function carregarFicha(alvo) {
  // 1) Cadastro
  let cliente = null;
  let doc = '';
  if (alvo.startsWith('doc:')) doc = dig(alvo.slice(4));
  else cliente = await base44.entities.Cliente.get(alvo).catch(() => null);
  if (cliente) doc = dig(cliente.cpf_cnpj);
  if (!cliente && doc) {
    const r = await seguro(base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: fmtDoc(doc) }, { cpf_cnpj: doc }] }, '-created_date', 1));
    cliente = r[0] || null;
  }
  const id = cliente?.id || null;
  const docs = doc ? [fmtDoc(doc), doc] : [];
  const or = (campoId, campoDoc) => {
    const l = [];
    if (id && campoId) l.push({ [campoId]: id });
    if (campoDoc) docs.forEach(d => l.push({ [campoDoc]: d }));
    return l;
  };
  const q = (ent, campoId, campoDoc, ordem = '-created_date', lim = 100) => {
    const ors = or(campoId, campoDoc);
    return ors.length ? seguro(base44.entities[ent].filter({ $or: ors }, ordem, lim)) : Promise.resolve([]);
  };

  // 2) Tudo o que referencia o cliente (por ID e por CPF/CNPJ)
  const [leads, indicacoes, pipeline, estudos, contratos, implantacoes, interacoes, registros, agenda, vendasDoc, parcelas, precificacoes] = await Promise.all([
    q('Lead', 'cliente_id', 'cpf_cnpj'),
    (async () => {
      const ors = [...(id ? [{ cliente_id: id }] : []), ...docs.flatMap(d => [{ pf_cpf: d }, { pj_cnpj: d }])];
      return ors.length ? seguro(base44.entities.LeadIndicacao.filter({ $or: ors }, '-created_date', 50)) : [];
    })(),
    q('Pipeline', 'cliente_id', 'cliente_cpf_cnpj'),
    q('EstudoViabilidade', 'cliente_id', 'cliente_documento'),
    q('Contrato', 'cliente_id', 'cpf_cnpj'),
    q('Implantacao', 'cliente_id', 'cpf_cnpj'),
    id ? seguro(base44.entities.InteracaoCliente.filter({ cliente_id: id }, '-data_interacao', 200)) : Promise.resolve([]),
    id ? seguro(base44.entities.RegistroContato.filter({ cliente_id: id }, '-created_date', 200)) : Promise.resolve([]),
    q('AgendaContato', 'cliente_id', 'lead_cpf_cnpj', '-data_agendada', 100),
    q('Venda', null, 'cpf_cnpj', '-data', 200),
    q('ParcelaVenda', null, 'cliente_cpf_cnpj', 'data_vencimento', 300),
    q('PropostaPrecificacao', 'cliente_id', 'cpf_cnpj'),
  ]);

  // 3) Encadeados: vendas dos contratos, comissões, notas fiscais, propostas técnicas, formulários, comentários, WhatsApp
  const ctIds = contratos.map(c => c.id);
  const vendasCt = ctIds.length ? await seguro(base44.entities.Venda.filter({ $or: ctIds.map(x => ({ contrato_id: x })) }, '-data', 200)) : [];
  const vendas = unicos([...vendasDoc, ...vendasCt]).sort((a, b) => ts(b.data) - ts(a.data));
  const vIds = vendas.map(v => v.id);
  const estIds = estudos.map(e => e.id);
  const pipeIds = pipeline.map(p => p.id);
  const leadIds = leads.map(l => l.id);
  const [comissoes, notas, propostas, rncOff, rncCi, rncCb, comentarios, conversas] = await Promise.all([
    vIds.length ? seguro(base44.entities.Comissao.filter({ $or: vIds.map(x => ({ venda_id: x })) }, '-created_date', 300)) : [],
    vIds.length ? seguro(base44.entities.NotaFiscal.filter({ $or: vIds.map(x => ({ venda_id: x })) }, '-data_emissao', 100)) : [],
    estIds.length ? seguro(base44.entities.PropostaTecnica.filter({ $or: estIds.map(x => ({ estudo_id: x })) }, '-versao', 100)) : [],
    ctIds.length ? seguro(base44.entities.RncOffshore.filter({ $or: ctIds.map(x => ({ contrato_id: x })) })) : [],
    ctIds.length ? seguro(base44.entities.RncContaInternacional.filter({ $or: ctIds.map(x => ({ contrato_id: x })) })) : [],
    ctIds.length ? seguro(base44.entities.RncCanalBancario.filter({ $or: ctIds.map(x => ({ contrato_id: x })) })) : [],
    (() => {
      const ors = [...estIds.map(x => ({ estudo_id: x })), ...ctIds.map(x => ({ operacao_id: x })), ...pipeIds.map(x => ({ operacao_id: 'p_' + x }))];
      return ors.length ? seguro(base44.entities.CelulaComentario.filter({ $or: ors }, '-created_date', 300)) : [];
    })(),
    (() => {
      const tel = dig(cliente?.telefone).slice(-8);
      const ors = [...leadIds.map(x => ({ lead_id: x })), ...(tel ? [{ telefone: { $regex: tel } }] : [])];
      return ors.length ? seguro(base44.entities.ConversaWhatsapp.filter({ $or: ors }, '-ultima_mensagem_em', 20)) : [];
    })(),
  ]);

  const nome = cliente?.nome || contratos[0]?.nome || estudos[0]?.cliente_nome || pipeline[0]?.cliente_nome || vendas[0]?.cliente || leads[0]?.nome || 'Cliente';
  return { cliente, doc, nome, leads, indicacoes, pipeline, estudos, propostas, contratos, implantacoes, interacoes, registros, agenda, vendas, parcelas, comissoes, notas, precificacoes, rncOff, rncCi, rncCb, comentarios, conversas };
}

export default function FichaClienteOverlay() {
  const [sp, setSp] = useSearchParams();
  const alvo = sp.get('ficha');
  if (!alvo) return null;
  return <Ficha key={alvo} alvo={alvo} sp={sp} setSp={setSp} />;
}

// Link para abrir a ficha a partir de qualquer tela (preserva os demais parâmetros, ex.: a célula aberta)
export function abrirFicha(setSp, sp, { clienteId, doc }) {
  const n = new URLSearchParams(sp);
  if (clienteId) n.set('ficha', clienteId); else if (dig(doc)) n.set('ficha', 'doc:' + dig(doc)); else { toast.error('Esta operação ainda não tem cliente vinculado.'); return; }
  setSp(n);
}

function Ficha({ alvo, sp, setSp }) {
  const [d, setD] = useState(null);
  const [aba, setAba] = useState('tudo');
  const [recarga, setRecarga] = useState(0);
  const [nova, setNova] = useState({ tipo: 'Ligação', descricao: '', resultado: 'Neutro', proximo_contato: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarFicha(alvo).then(r => { if (vivo) setD(r); }).catch(e => { toast.error('Não foi possível abrir a ficha: ' + e.message); });
    return () => { vivo = false; };
  }, [alvo, recarga]);

  const fechar = () => { const n = new URLSearchParams(sp); n.delete('ficha'); setSp(n); };
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); fechar(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [sp]);

  // Abre a operação na célula certa (fecha a ficha)
  const abrirOp = (dest, opId) => {
    if (!dest) { toast.error('Produto sem célula no novo ambiente.'); return; }
    const n = new URLSearchParams(sp);
    n.delete('ficha'); n.set('celula', dest.celula); n.set('produto', dest.produto); if (opId) n.set('op', opId); else n.delete('op');
    setSp(n);
  };

  // ── Operações (cada negócio do cliente, em qualquer produto)
  const operacoes = useMemo(() => {
    if (!d) return [];
    const ops = [];
    const ctUsados = new Set();
    d.estudos.forEach(e => {
      const ct = contratoDoEstudo(e, d.contratos.filter(c => c.tipo === JORNADAS[e.produto]?.tipoContrato));
      if (ct) ctUsados.add(ct.id);
      const et = etapaDaOperacao(e, ct);
      ops.push({ key: 'e' + e.id, produto: JORNADAS[e.produto]?.nome || e.produto, etapa: JORNADAS[e.produto]?.etapas[et]?.titulo, valor: ct?.valor_total, resp: e.responsavel_nome, quando: e.updated_date || e.created_date, dest: destinoEstudo(e), op: e.id, ativo: e.status !== 'cancelado' });
    });
    d.contratos.filter(c => !ctUsados.has(c.id)).forEach(c => {
      const dest = destinoPorTexto(c.tipo);
      const impl = d.implantacoes.find(i => i.contrato_id === c.id);
      const et = etapaContrato(c, impl);
      ops.push({ key: 'c' + c.id, produto: c.tipo, etapa: dest ? JORNADAS[dest.produto].etapas[et]?.titulo : STATUS_CT[c.status], status: STATUS_CT[c.status], valor: c.valor_total, resp: c.vendedor_nome, quando: c.updated_date || c.created_date, dest, op: c.id, ativo: c.status !== 'cancelado' });
    });
    d.pipeline.filter(p => !['Fechado'].includes(p.temperatura) && !d.contratos.some(c => c.pipeline_id === p.id)).forEach(p => {
      const dest = destinoPorTexto(p.produto);
      ops.push({ key: 'p' + p.id, produto: p.produto || 'Negociação', etapa: p.temperatura === 'Perdido' ? 'Perdida' : `Negociação · ${p.temperatura || 'Frio'}`, valor: p.valor_estimado, resp: p.vendedor_nome, quando: p.updated_date || p.created_date, dest: dest && !dest.produto.match(/offshore|conta_internacional|holding/) ? dest : null, op: 'p_' + p.id, ativo: p.temperatura !== 'Perdido' });
    });
    return ops.sort((a, b) => (b.ativo - a.ativo) || ts(b.quando) - ts(a.quando));
  }, [d]);

  // ── Linha do tempo única do relacionamento
  const eventos = useMemo(() => {
    if (!d) return [];
    const ev = [];
    const add = (q, tipo, txt, quem, extra) => { if (q) ev.push({ q, tipo, txt, quem, ...extra }); };
    d.leads.forEach(l => add(l.created_date, 'origem', `Entrou como lead${l.lote_nome ? ` (lote ${l.lote_nome})` : ''}${l.origem ? ` · origem ${l.origem}` : ''}${l.produto_interesse ? ` · interesse em ${l.produto_interesse}` : ''}.`, l.vendedor_nome));
    d.indicacoes.forEach(i => add(i.created_date, 'origem', `Indicado por ${i.parceiro_nome || 'parceiro'} para ${i.produto || 'produto'}${i.valor_estimado ? ` · ${brl(i.valor_estimado)}` : ''}.`, i.parceiro_nome));
    d.pipeline.forEach(p => {
      add(p.created_date, 'negociacao', `Negociação ${p.produto || ''} aberta${p.valor_estimado ? ` · ${brl(p.valor_estimado)}` : ''}${p.origem ? ` · ${p.origem}` : ''}.${p.descricao ? `\n${p.descricao}` : ''}`, p.vendedor_nome);
      if (p.temperatura === 'Perdido') add(p.updated_date, 'negociacao', `Negociação ${p.produto || ''} perdida.${p.observacao ? ` ${p.observacao}` : ''}`, p.vendedor_nome);
    });
    d.interacoes.forEach(i => add(i.data_interacao || i.created_date, 'interacao', `${i.tipo || 'Interação'}${i.resultado ? ` · ${i.resultado}` : ''}${i.status === 'agendada' ? ' (agendada)' : ''}: ${i.descricao || '—'}`, i.vendedor_nome));
    d.registros.forEach(r => add(r.created_date, 'interacao', `${CANAL[r.canal] || 'Contato'}${r.resultado ? ` · ${String(r.resultado).replace(/_/g, ' ')}` : ''}${r.duracao_seg ? ` · ${Math.round(r.duracao_seg / 60)} min` : ''}${r.observacao ? `: ${r.observacao}` : ''}`, r.vendedor_nome));
    d.agenda.forEach(a => add(a.data_agendada, 'interacao', `Contato agendado${a.horario ? ` às ${a.horario}` : ''} · ${a.status || 'pendente'}${a.resultado ? ` — ${a.resultado}` : ''}`, a.vendedor_nome));
    d.comentarios.forEach(c => add(c.created_date, 'interacao', `${c.tipo === 'abordagem' ? `Abordagem · ${CANAL[c.canal] || 'Contato'}` : 'Comentário na operação'}: ${c.texto}`, c.autor_nome));
    d.conversas.forEach(w => add(w.ultima_mensagem_em || w.created_date, 'interacao', `Conversa de WhatsApp (${w.status || 'ativa'})${w.ultima_mensagem ? `: “${String(w.ultima_mensagem).slice(0, 120)}”` : ''}`, w.vendedor_nome));
    d.estudos.forEach(e => {
      add(e.created_date, 'operacao', `Operação ${JORNADAS[e.produto]?.nome || e.produto} aberta.`, e.responsavel_nome);
      add(e.nda_assinado_em || (e.nda_origem !== 'gerado' ? null : null), 'documento', 'NDA assinado anexado.', e.responsavel_nome);
      add(e.cliente_devolveu_em || e.data_recebimento, 'operacao', 'Cliente devolveu o estudo de viabilidade.', d.nome);
    });
    d.propostas.forEach(p => {
      add(p.created_date, 'operacao', `Proposta técnica v${p.versao}${p.codigo ? ` (${p.codigo})` : ''} gerada.`, p.responsavel_nome);
      if (p.status === 'aceita' || p.status === 'recusada') add(p.decisao_em, 'operacao', `Proposta v${p.versao} ${p.status} pelo cliente.`, d.nome);
    });
    d.precificacoes.forEach(p => add(p.created_date, 'negociacao', `Proposta de precificação ${p.produto || ''} (${p.status || 'rascunho'})${p.valor_estimado ? ` · ${brl(p.valor_estimado)}` : ''}.`, p.vendedor_nome));
    d.contratos.forEach(c => add(c.created_date, 'contrato', `Contrato ${c.tipo}${c.numero_contrato ? ` nº ${c.numero_contrato}` : ''} criado${c.valor_total ? ` · ${brl(c.valor_total)}` : ''} — hoje: ${STATUS_CT[c.status] || c.status}.`, c.vendedor_nome));
    d.vendas.forEach(v => add(v.data || v.created_date, 'venda', `${v.tipo_venda === 'recorrencia' ? 'Parcela recebida' : 'Venda'} ${v.produto || ''} · ${brl(v.valor)}${v.forma_pagamento ? ` · ${v.forma_pagamento}` : ''}${v.num_parcelas > 1 ? ` · ${v.num_parcelas}x` : ''}.`, v.assessor_comercial));
    d.implantacoes.forEach(i => { add(i.data_entrada, 'operacao', `Implantação ${i.produto || ''} iniciada${i.padrinho_nome ? ` com ${i.padrinho_nome}` : ''}.`, i.padrinho_nome); add(i.data_conclusao, 'operacao', `Implantação ${i.produto || ''} concluída.`, i.padrinho_nome); });
    d.notas.forEach(n => add(n.data_emissao, 'venda', `Nota fiscal emitida · ${brl(n.valor_liquido)}${n.paga ? ' · paga' : ''}.`, null));
    return ev.sort((a, b) => ts(b.q) - ts(a.q));
  }, [d]);

  const documentos = useMemo(() => {
    if (!d) return [];
    const l = [];
    const push = (nome, url, origem) => { if (url) l.push({ nome, url, origem }); };
    d.estudos.forEach(e => {
      push(e.nda_nome || 'NDA', e.nda_url, `${JORNADAS[e.produto]?.nome || ''} · NDA`);
      push(e.nda_assinado_nome || 'NDA assinado', e.nda_assinado_url, `${JORNADAS[e.produto]?.nome || ''} · NDA`);
      (e.documentos || []).forEach(x => push(x.nome_arquivo || x.descricao || 'Documento', x.url, `${JORNADAS[e.produto]?.nome || ''} · enviado pelo cliente`));
    });
    d.propostas.forEach(p => push(`Proposta ${p.codigo || 'v' + p.versao}`, p.pdf_url, 'Proposta técnica'));
    d.contratos.forEach(c => {
      push(`Contrato ${c.tipo} ${c.numero_contrato || ''}`.trim(), c.pdf_url, 'Contrato (PDF)');
      push(c.contrato_assinado_nome || `Contrato ${c.tipo} assinado`, c.contrato_assinado_url, 'Contrato assinado');
      (c.comprovantes || []).forEach((x, i) => push(x?.nome || `Comprovante ${i + 1}`, x?.url, `Contrato ${c.tipo} · pagamento`));
      push(c.comprovante_nome || 'Comprovante', c.comprovante_url, `Contrato ${c.tipo} · pagamento`);
    });
    [...d.rncOff, ...d.rncCi, ...d.rncCb].forEach(r => { push(r.pdf_nome || 'Formulário do cliente', r.pdf_url, 'Formulário pós-contrato'); (r.documentos || []).forEach(x => push(x.nome || x.descricao || 'Documento', x.url, 'Formulário pós-contrato')); });
    d.vendas.forEach(v => { push(v.boleto_nome || 'Boleto', v.boleto_url, `Venda ${v.produto || ''}`); (v.comprovantes || []).forEach((x, i) => push(x?.nome || `Comprovante ${i + 1}`, x?.url, `Venda ${v.produto || ''}`)); });
    d.notas.forEach(n => { push(n.nf_nome || 'Nota fiscal', n.nf_url, 'Nota fiscal'); push(n.mapa_producao_nome || 'Mapa de produção', n.mapa_producao_url, 'Nota fiscal'); });
    const vistos = new Set();
    return l.filter(x => (vistos.has(x.url) ? false : vistos.add(x.url)));
  }, [d]);

  const abrirDoc = async (ref) => {
    try {
      let url = ref;
      if (!/^https?:\/\//i.test(String(ref))) {
        const r = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ref, expires_in: 600 });
        url = r?.signed_url || r?.data?.signed_url;
      }
      if (!url) throw new Error();
      window.open(url, '_blank', 'noopener');
    } catch { toast.error('Não foi possível abrir o documento.'); }
  };

  const registrarInteracao = async () => {
    if (!d?.cliente) { toast.error('Cliente sem cadastro na base.'); return; }
    if (!nova.descricao.trim()) { toast.error('Descreva a interação.'); return; }
    setSalvando(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.InteracaoCliente.create({
        cliente_id: d.cliente.id, cliente_nome: d.nome, vendedor_nome: me?.nome_tratamento || me?.full_name || me?.email,
        tipo: nova.tipo, descricao: nova.descricao.trim(), resultado: nova.resultado, data_interacao: new Date().toISOString(),
        ...(nova.proximo_contato ? { proximo_contato: nova.proximo_contato } : {}), status: 'realizada',
      });
      setNova({ tipo: 'Ligação', descricao: '', resultado: 'Neutro', proximo_contato: '' });
      toast.success('Interação registrada na ficha.');
      setRecarga(n => n + 1);
    } catch (e) { toast.error(e.message); }
    setSalvando(false);
  };

  const totais = useMemo(() => {
    if (!d) return null;
    const novas = d.vendas.filter(v => v.tipo_venda !== 'recorrencia');
    return {
      vendido: d.vendas.reduce((s, v) => s + (Number(v.valor) || 0), 0),
      contratado: novas.reduce((s, v) => s + (Number(v.valor_total_contrato) || Number(v.valor) || 0), 0),
      aReceber: d.parcelas.filter(p => p.status !== 'recebida').reduce((s, p) => s + (Number(p.valor_parcela) || 0), 0),
      inadimplente: d.parcelas.filter(p => p.status === 'inadimplente').length,
      abertas: operacoes.filter(o => o.ativo && !/Concluída|Perdida/.test(o.etapa || '')).length,
      interacoes: d.interacoes.length + d.registros.length + d.comentarios.filter(c => c.tipo === 'abordagem').length,
    };
  }, [d, operacoes]);

  const ICONE = { origem: User, negociacao: Briefcase, interacao: MessageSquare, operacao: Clock, contrato: FileText, venda: Receipt, documento: FileText };
  const FILTROS = [['tudo', 'Tudo'], ['interacao', 'Interações'], ['negociacao', 'Negociações'], ['contrato', 'Contratos'], ['venda', 'Vendas']];
  const evFiltrados = aba === 'tudo' ? eventos : eventos.filter(e => e.tipo === aba || (aba === 'negociacao' && e.tipo === 'origem'));
  const inp = { height: 36, padding: '0 10px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13 };
  const cli = d?.cliente;

  return (
    <div className="fixed inset-0 z-[95] flex justify-end" role="dialog" aria-modal="true" aria-label="Ficha do cliente"
      style={{ background: 'rgba(3,6,10,0.55)', backdropFilter: 'blur(3px)' }} onMouseDown={e => { if (e.target === e.currentTarget) fechar(); }}>
      <aside className="vx-suspensa h-full w-full flex flex-col" style={{ maxWidth: 1180, background: C.bg, borderLeft: `1px solid ${C.line2}`, boxShadow: '-40px 0 100px rgba(0,0,0,.6)', color: C.txt2 }}>
        {/* Cabeçalho */}
        <header style={{ padding: '18px 24px', borderBottom: `1px solid ${C.line}`, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(201,169,98,.14)', border: `1.5px solid ${C.acc}`, color: C.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18, flex: 'none' }}>
            {String(d?.nome || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.acc }}>Ficha do cliente</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: C.txt }}>{d ? d.nome : 'Carregando…'}</span>
            {d && (
              <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: C.muted }}>
                <span>{cli?.tipo_pessoa || (d.doc.length === 11 ? 'PF' : 'PJ')} · {fmtDoc(d.doc) || 'sem documento'}</span>
                {cli?.telefone && <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Phone className="w-3.5 h-3.5" />{cli.telefone}</span>}
                {cli?.email && <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Mail className="w-3.5 h-3.5" />{cli.email}</span>}
                {(cli?.cidade || cli?.estado) && <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><MapPin className="w-3.5 h-3.5" />{[cli.cidade, cli.estado].filter(Boolean).join('/')}</span>}
              </span>
            )}
            {d && (
              <span style={{ fontSize: 12, color: C.muted2 }}>
                Carteira: <b style={{ color: C.txt2, fontWeight: 500 }}>{cli?.vendedor_nome || '—'}</b>
                {cli?.origem && ` · origem ${cli.origem === 'nativo' ? 'cadastro no portal' : cli.origem.replace('_', ' ')}`}
                {cli?.responsavel_origem && ` · ${cli.responsavel_origem}`}
                {!cli && ' · sem cadastro na base (encontrado pelo CPF/CNPJ)'}
              </span>
            )}
          </div>
          <button onClick={fechar} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 14 }}><X className="w-4 h-4" /> Fechar</button>
        </header>

        {!d ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.muted }}><Loader2 className="w-5 h-5 animate-spin" /> Reunindo tudo sobre o cliente…</div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Números do relacionamento */}
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              {[
                ['Total recebido', brl(totais.vendido)],
                ['Valor contratado', brl(totais.contratado)],
                ['A receber (parcelas)', brl(totais.aReceber), totais.inadimplente ? `${totais.inadimplente} inadimplente(s)` : null],
                ['Operações em andamento', String(totais.abertas)],
                ['Interações registradas', String(totais.interacoes)],
              ].map(([l, v, alerta]) => (
                <div key={l} style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}` }}>
                  <p style={{ fontSize: 11, color: C.muted }}>{l}</p>
                  <p style={{ fontSize: 19, fontWeight: 600, color: C.txt, marginTop: 4 }}>{v}</p>
                  {alerta && <p style={{ fontSize: 11, color: '#F4A3A3', marginTop: 2 }}>{alerta}</p>}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 1fr)' }} className="vx-ficha-grid">
              <style>{`@media (max-width: 980px){.vx-ficha-grid{grid-template-columns:1fr !important}}`}</style>
              {/* Coluna principal: histórico */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div style={{ padding: 14, borderRadius: 16, background: C.card2, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>Registrar interação</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={nova.tipo} onChange={e => setNova({ ...nova, tipo: e.target.value })} style={{ ...inp, width: 120 }} aria-label="Tipo">
                      {['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Visita', 'Outro'].map(x => <option key={x}>{x}</option>)}
                    </select>
                    <select value={nova.resultado} onChange={e => setNova({ ...nova, resultado: e.target.value })} style={{ ...inp, width: 130 }} aria-label="Resultado">
                      {['Positivo', 'Neutro', 'Negativo', 'Sem resposta'].map(x => <option key={x}>{x}</option>)}
                    </select>
                    <input type="date" value={nova.proximo_contato} onChange={e => setNova({ ...nova, proximo_contato: e.target.value })} style={{ ...inp, width: 150 }} aria-label="Próximo contato" title="Próximo contato" />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={nova.descricao} onChange={e => setNova({ ...nova, descricao: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') registrarInteracao(); }}
                      placeholder="O que foi conversado, pedidos, reportes do cliente…" style={{ ...inp, flex: 1 }} aria-label="Descrição da interação" />
                    <button onClick={registrarInteracao} disabled={salvando} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Registrar
                    </button>
                  </div>
                </div>

                <div role="tablist" aria-label="Filtrar histórico" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILTROS.map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className="vx-btn"
                      style={{ height: 32, padding: '0 14px', fontSize: 12, borderRadius: 999, background: aba === k ? 'rgba(201,169,98,.14)' : 'transparent', color: aba === k ? '#E3C982' : C.muted, border: `1px solid ${aba === k ? C.acc : C.line}` }}>{l}</button>
                  ))}
                </div>
                {evFiltrados.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>Nada registrado aqui ainda.</p>}
                {evFiltrados.map((e, i) => {
                  const Ic = ICONE[e.tipo] || Clock;
                  return (
                    <article key={i} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 14, background: C.card, border: `1px solid ${C.line}` }}>
                      <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 16, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic className="w-4 h-4" style={{ color: C.acc }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: C.muted2 }}>{quando(e.q)}{e.quem ? ` · ${e.quem}` : ''}</p>
                        <p style={{ fontSize: 14, color: C.txt2, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 2 }}>{e.txt}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Coluna lateral: operações, financeiro, documentos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 4 }}>Operações ({operacoes.length})</span>
                  {operacoes.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhuma operação ainda.</span>}
                  {operacoes.map(o => (
                    <button key={o.key} onClick={() => abrirOp(o.dest, o.op)} disabled={!o.dest} className="vx-row-hover"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, textAlign: 'left', opacity: o.ativo ? 1 : 0.55, cursor: o.dest ? 'pointer' : 'default' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, color: C.txt, fontWeight: 500 }}>{o.produto}</span>
                        <span style={{ display: 'block', fontSize: 11, color: C.muted }}>{o.etapa || '—'}{o.resp ? ` · ${o.resp}` : ''}</span>
                      </span>
                      {o.valor ? <span style={{ fontSize: 12, color: C.txt2 }}>{brl(o.valor)}</span> : null}
                      {o.dest && <ChevronRight className="w-4 h-4" style={{ color: C.acc }} />}
                    </button>
                  ))}
                </section>

                <section style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>Vendas e comissões</span>
                  {d.vendas.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhuma venda registrada.</span>}
                  {d.vendas.slice(0, 12).map(v => {
                    const cms = d.comissoes.filter(c => c.venda_id === v.id);
                    return (
                      <div key={v.id} style={{ padding: '8px 10px', borderRadius: 12, background: C.card2, fontSize: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ flex: 1, color: C.txt }}>{v.tipo_venda === 'recorrencia' ? 'Parcela' : 'Venda'} · {v.produto}</span>
                          <b style={{ color: C.txt }}>{brl(v.valor)}</b>
                        </div>
                        <div style={{ color: C.muted, marginTop: 2 }}>{quando(v.data)} · {v.assessor_comercial || '—'}{v.forma_pagamento ? ` · ${v.forma_pagamento}` : ''}{v.num_parcelas > 1 ? ` · ${v.num_parcelas}x` : ''}</div>
                        {cms.length > 0 && <div style={{ color: C.muted2, marginTop: 2 }}>Comissões: {cms.map(c => `${c.vendedor_nome || '—'} ${brl(c.valor_comissao)}${c.pago ? ' ✓' : ''}`).join(' · ')}</div>}
                      </div>
                    );
                  })}
                  {d.parcelas.length > 0 && (
                    <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>Parcelas</span>
                      {d.parcelas.slice(0, 24).map(p => (
                        <div key={p.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                          <span style={{ flex: 1, color: C.txt2 }}>{p.produto || ''} {p.numero_parcela}/{p.total_parcelas} · vence {quando(p.data_vencimento)}</span>
                          <span style={{ color: p.status === 'recebida' ? '#8FD9B0' : p.status === 'inadimplente' ? '#F4A3A3' : '#E3C982' }}>{brl(p.valor_parcela)} · {p.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 4 }}>Documentos ({documentos.length})</span>
                  {documentos.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhum documento anexado.</span>}
                  {documentos.map((x, i) => (
                    <button key={i} onClick={() => abrirDoc(x.url)} className="vx-row-hover" title={x.nome}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, background: 'transparent', border: 0, textAlign: 'left' }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: C.acc, flex: 'none' }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.nome}</span>
                      <span style={{ fontSize: 11, color: C.muted2, whiteSpace: 'nowrap' }}>{x.origem}</span>
                    </button>
                  ))}
                </section>

                {(d.leads.length > 0 || d.indicacoes.length > 0) && (
                  <section style={{ padding: 14, borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>Origem</span>
                    {d.indicacoes.map(i => <span key={i.id} style={{ color: C.txt2 }}>Indicação de <b>{i.parceiro_nome || 'parceiro'}</b>{i.parceiro_percentual ? ` (${i.parceiro_percentual}%)` : ''} · {i.produto} · {String(i.status || '').replace(/_/g, ' ')}</span>)}
                    {d.leads.map(l => <span key={l.id} style={{ color: C.txt2 }}>Lead {l.lote_nome ? `do lote ${l.lote_nome}` : ''}{l.origem ? ` · ${l.origem}` : ''} · {l.convertido ? 'convertido' : l.status || 'novo'}{l.vendedor_nome ? ` · ${l.vendedor_nome}` : ''}</span>)}
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
