import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, FileText, Download, Upload, Send, RefreshCw, Copy, ExternalLink, Pencil, Trash2, Lock, ChevronDown, ChevronRight, Receipt, Link2, ShieldCheck } from 'lucide-react';
import CampoMoeda from '@/components/ui/campo-moeda';
import { consultarCep, consultarCnpj } from '@/lib/autocomplete';
import { todayBrasilia } from '@/lib/dateUtils';
import { resolverVendedorDoUsuarioLogado } from '@/lib/vendedorContrato';
import { comprovantesDoContrato } from '@/lib/vendaProducao';
import { sincronizarDocumentosVenda } from '@/lib/vendaDocumentos';
import { enviarContratoParaVendas } from '@/lib/enviarContratoVendas';
import { useEnvioVendasDialog } from '@/components/contratos/EnviarVendasDialog';
import ContratoOffshoreEstrutura, { OFFSHORE_DEFAULTS } from '@/components/contratos/ContratoOffshoreEstrutura';
import IndicadoresEditor from '@/components/contratos/IndicadoresEditor';
import BoletosParcelas from '@/components/contratos/BoletosParcelas';
import ColetaCliente, { COLETAS } from './ColetaCliente';
import { confirmar } from '@/lib/confirmar';

// Jornada do contrato no novo ambiente: dados → PDF → assinatura → contrato assinado → cobrança →
// pagamento → envio para Vendas, tudo dentro da operação. Grava no mesmo registro Contrato
// (a área Contratos apenas espelha) e usa as mesmas funções do portal (PDF, ZapSign, parcelas, Vendas).

const C = { card: 'rgba(255,255,255,0.03)', card2: 'rgba(255,255,255,0.05)', input: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.11)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799', ok: '#8FD9B0', warn: '#E3C982', err: '#F4A3A3' };
const ORDEM = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];
const STATUS = { rascunho: 'Em elaboração', gerado: 'PDF gerado', assinado: 'Assinado', aguardando_pagamento: 'Cobrança enviada', pago: 'Pago', no_pipeline: 'Enviado para Vendas', cancelado: 'Cancelado' };
const FORMAS = ['PIX', 'TED/DOC', 'DÉBITO EM CONTA', 'BOLETO', 'CARTÃO DE CRÉDITO'];
const ORIGENS_PAG = ['Boleto', 'Link de Pagamento', 'PIX', 'TED', 'Outros'];
const ESTADO_CIVIL = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const PARCELAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48, 60];
const ESCOPOS_RATING = ['Organização Financeira', 'Rating', 'Rating + Organização Financeira'];
const OBRIGATORIOS = [['nome', 'Nome'], ['cpf_cnpj', 'CPF/CNPJ'], ['nascimento', 'Nascimento'], ['nacionalidade', 'Nacionalidade'], ['profissao', 'Profissão'], ['estado_civil', 'Estado civil'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['cep', 'CEP'], ['endereco', 'Endereço'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['estado', 'UF'], ['valor_total', 'Valor'], ['forma_pagamento', 'Forma de pagamento'], ['data_contrato', 'Data do contrato']];
const dig = (s) => String(s || '').replace(/\D/g, '');
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const atingiu = (st, alvo) => ORDEM.indexOf(st || 'rascunho') >= ORDEM.indexOf(alvo);
const inp = { height: 38, padding: '0 12px', borderRadius: 10, background: C.input, border: `1px solid ${C.line2}`, color: C.txt, fontSize: 13, width: '100%' };

// Campo fora do componente (não perde o foco ao digitar)
function Campo({ label, k, form, set, type = 'text', options, money, span = 1, req, placeholder, onBlur }) {
  const vazio = req && !String(form[k] ?? '').trim();
  const estilo = { ...inp, ...(vazio ? { borderColor: 'rgba(244,163,163,.45)' } : {}) };
  return (
    <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4, gridColumn: `span ${span}` }}>
      <span>{label}{req && <span style={{ color: C.err }}> *</span>}</span>
      {options ? (
        <select value={form[k] ?? ''} onChange={e => set(k, e.target.value)} style={estilo}>
          <option value="">Selecione…</option>
          {options.map(o => (typeof o === 'object' ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o} value={o}>{o}</option>))}
        </select>
      ) : money ? (
        <CampoMoeda asString value={form[k]} onChange={v => set(k, v)} style={estilo} className="" />
      ) : (
        <input type={type} value={form[k] ?? ''} onChange={e => set(k, e.target.value)} onBlur={onBlur} placeholder={placeholder} style={estilo} />
      )}
    </label>
  );
}

function Etapa({ n, titulo, sub, estado, aberta, onToggle, t, children, extra }) {
  // estado: feito | atual | bloqueado
  const cor = estado === 'feito' ? C.ok : estado === 'atual' ? t.acc : C.muted2;
  return (
    <section style={{ borderRadius: 18, background: estado === 'atual' ? C.card2 : C.card, border: `1px solid ${estado === 'atual' ? t.line : C.line}`, overflow: 'hidden' }}>
      <button onClick={onToggle} className="vx-row-hover" aria-expanded={aberta}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 0, textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: estado === 'feito' ? 'rgba(52,211,153,.15)' : estado === 'atual' ? t.dim : 'rgba(255,255,255,.05)', color: cor, border: `1px solid ${estado === 'bloqueado' ? C.line : cor}` }}>
          {estado === 'feito' ? '✓' : estado === 'bloqueado' ? <Lock className="w-3.5 h-3.5" /> : n}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: estado === 'bloqueado' ? C.muted : C.txt }}>{titulo}</span>
          {sub && <span style={{ display: 'block', fontSize: 12, color: C.muted }}>{sub}</span>}
        </span>
        {extra}
        {aberta ? <ChevronDown className="w-4 h-4" style={{ color: C.muted }} /> : <ChevronRight className="w-4 h-4" style={{ color: C.muted }} />}
      </button>
      {aberta && <div style={{ padding: '4px 16px 16px 56px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </section>
  );
}

function Arquivo({ nome, url, onRemover }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: C.card2, fontSize: 13 }}>
      <FileText className="w-4 h-4" style={{ color: C.ok, flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0, color: C.txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome || 'Arquivo'}</span>
      <a href={url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-soft" style={{ height: 28, padding: '0 10px', fontSize: 12 }}>Abrir <ExternalLink className="w-3 h-3" /></a>
      {onRemover && <button onClick={onRemover} className="vx-btn vx-btn-ghost" aria-label="Remover" style={{ width: 28, height: 28, padding: 0, color: C.err }}><Trash2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

// Confere o arquivo contra o `accept` (extensões e/ou tipos MIME), também para o que chega arrastado.
function aceitaArquivo(f, accept) {
  if (!accept) return true;
  const nome = (f.name || '').toLowerCase();
  return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(a =>
    a.startsWith('.') ? nome.endsWith(a) : a.endsWith('/*') ? (f.type || '').startsWith(a.slice(0, -1)) : f.type === a || (a === 'application/pdf' && nome.endsWith('.pdf')));
}

// Área de anexo: clique para buscar o arquivo ou arraste e solte em cima.
function BotaoArquivo({ label, onArquivo, carregando, accept = '.pdf,.png,.jpg,.jpeg', primario }) {
  const ref = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const formatos = accept === 'application/pdf' ? 'PDF' : accept.split(',').map(s => s.trim().replace(/^\./, '').replace(/^.*\//, '').toUpperCase()).filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
  const receber = (f) => {
    if (!f || carregando) return;
    if (!aceitaArquivo(f, accept)) { toast.error(`Formato não aceito aqui. Use ${formatos}.`); return; }
    onArquivo(f);
  };
  return (
    <div role="button" tabIndex={0} aria-label={`${label} — clique ou arraste o arquivo`} aria-busy={carregando || undefined}
      onClick={() => !carregando && ref.current?.click()}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !carregando) { e.preventDefault(); ref.current?.click(); } }}
      onDragEnter={e => { e.preventDefault(); setArrastando(true); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!arrastando) setArrastando(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={e => { e.preventDefault(); setArrastando(false); receber(e.dataTransfer.files?.[0]); }}
      className="vx-drop"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, cursor: carregando ? 'progress' : 'pointer', width: '100%', maxWidth: 520,
        background: arrastando ? 'var(--vx-dim, rgba(217,190,127,.12))' : 'rgba(255,255,255,.025)',
        border: `1px dashed ${arrastando ? 'var(--vx-acc, #CFAE68)' : primario ? 'var(--vx-line, rgba(217,190,127,.4))' : 'rgba(255,255,255,.14)'}`,
        transition: 'background .15s ease, border-color .15s ease' }}>
      <input ref={ref} type="file" accept={accept} className="hidden" onClick={e => e.stopPropagation()} onChange={e => { receber(e.target.files?.[0]); e.target.value = ''; }} />
      <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--vx-dim, rgba(217,190,127,.12))', color: 'var(--vx-txt, #D9BE7F)' }}>
        {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vx-txt, #D9BE7F)' }}>{carregando ? 'Enviando…' : arrastando ? 'Solte o arquivo aqui' : label}</span>
        <span style={{ fontSize: 12, color: C.muted }}>Arraste o arquivo aqui ou clique para selecionar ({formatos})</span>
      </span>
    </div>
  );
}

function baixarB64(b64, nome) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return bytes;
}

// Form inicial: contrato existente, ou cadastro do cliente + valores da operação
function formInicial({ contrato, tipo, cliente, valoresIniciais }) {
  if (contrato) return { ...contrato };
  const base = {
    nome: '', cpf_cnpj: '', responsavel_legal: '', cpf_responsavel: '', nascimento: '', nacionalidade: 'brasileiro(a)', profissao: '', estado_civil: '',
    email: '', telefone: '', cep: '', endereco: '', bairro: '', cidade: '', estado: '',
    valor_total: '', valor_adesao: '', num_parcelas: tipo === 'MONITORE' ? 0 : 1, valor_parcela: '', forma_pagamento: '', data_primeiro_pagamento: '', data_primeira_parcela: '', dia_vencimento: '',
    prazo_meses: '', data_contrato: todayBrasilia(), observacoes: '', moeda: 'USD', cotacao: '', valor_em_moeda: '', banco: '', agencia: '', conta: '',
    mensalidade: tipo === 'MONITORE' ? '299.9' : '', rate: tipo === 'MONITORE' ? '0.89' : '', valor_diagnostico: '', dia_vencimento_diagnostico: '', dia_vencimento_mensalidade: '', escopo_rating: '',
    ...(tipo === 'OFFSHORE' ? OFFSHORE_DEFAULTS : {}),
  };
  const c = cliente || {};
  const doCliente = Object.fromEntries(['nome', 'cpf_cnpj', 'responsavel_legal', 'cpf_responsavel', 'nascimento', 'nacionalidade', 'profissao', 'estado_civil', 'email', 'telefone', 'cep', 'endereco', 'bairro', 'cidade', 'estado'].filter(k => c[k]).map(k => [k, c[k]]));
  const vals = Object.fromEntries(Object.entries(valoresIniciais || {}).filter(([k, v]) => !k.startsWith('_') && v !== '' && v != null));
  const f = { ...base, ...doCliente, ...vals, ...(c.id ? { cliente_id: c.id } : {}) };
  // Parcela calculada a partir de total, entrada e nº de parcelas vindos da análise/negociação
  const np = parseInt(f.num_parcelas) || 0;
  if (np > 0 && !(parseFloat(f.valor_parcela) > 0)) f.valor_parcela = (Math.max(0, (parseFloat(f.valor_total) || 0) - (parseFloat(f.valor_adesao) || 0)) / np).toFixed(2);
  if (np === 0 && f.valor_total) { f.valor_adesao = f.valor_adesao || f.valor_total; f.valor_parcela = '0'; }
  return f;
}

export default function JornadaContrato({ contrato: inicial, tipoContrato, clienteId, clienteFallback, vinculo = {}, valoresIniciais, t, user, isAdmin, editarAoAbrir = false, onCriado, onAtualizado, onVendaCriada }) {
  const tipo = inicial?.tipo || tipoContrato;
  const [ct, setCt] = useState(inicial || null);
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(null);
  const [indicadoresIni, setIndicadoresIni] = useState([]);
  const [editando, setEditando] = useState(!inicial || editarAoAbrir);
  const [aberta, setAberta] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [respId, setRespId] = useState(inicial?.vendedor_id || '');
  const [pdfB64, setPdfB64] = useState(null);
  const [confirmaZap, setConfirmaZap] = useState(false);
  const [linkAssin, setLinkAssin] = useState(inicial?.link_assinatura || '');
  const [linkPag, setLinkPag] = useState(inicial?.link_pagamento || '');
  const [verMais, setVerMais] = useState(false);
  const { dialog: envioDialog, pedirOpcoes } = useEnvioVendasDialog();

  useEffect(() => { setCt(inicial || null); setLinkAssin(inicial?.link_assinatura || ''); setLinkPag(inicial?.link_pagamento || ''); }, [inicial?.id, inicial?.status, inicial?.updated_date]);

  // Cliente da base + indicação de origem (parceiro entra como indicador)
  useEffect(() => {
    let vivo = true;
    (async () => {
      let c = clienteId ? await base44.entities.Cliente.get(clienteId).catch(() => null) : null;
      if (!c && dig(clienteFallback?.cpf_cnpj)) {
        const d = dig(clienteFallback.cpf_cnpj);
        const r = await base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: clienteFallback.cpf_cnpj }, { cpf_cnpj: d }] }, '-created_date', 1).catch(() => []);
        c = r?.[0] || null;
      }
      const cli = c || (clienteFallback ? { ...clienteFallback } : null);
      let inds = [];
      if (c?.lead_id) {
        const ind = await base44.entities.LeadIndicacao.get(c.lead_id).catch(() => null);
        if (ind?.parceiro_id) inds = [{ id: ind.parceiro_id, nome: ind.parceiro_nome || '', percentual: ind.parceiro_percentual ?? 0, tipo: 'indicador' }];
      }
      if (!vivo) return;
      setCliente(c);
      setIndicadoresIni(inds);
      setForm(formInicial({ contrato: inicial, tipo, cliente: cli, valoresIniciais }));
    })();
    if (isAdmin) base44.entities.Vendedor.filter({ ativo: true }, 'nome', 300).then(l => setVendedores(l || [])).catch(() => {});
    return () => { vivo = false; };
  }, [clienteId, inicial?.id]);

  const st = ct?.status || 'rascunho';
  const comprovantes = ct ? comprovantesDoContrato(ct) : [];
  const etapaAtual = !ct ? 0 : st === 'rascunho' ? 1 : st === 'gerado' ? (ct.link_assinatura ? 2 : 1) : st === 'assinado' ? (ct.contrato_assinado_url ? 3 : 2) : st === 'aguardando_pagamento' ? 4 : st === 'pago' ? 5 : 6;
  useEffect(() => { if (aberta === null && form) setAberta(editando ? 0 : Math.min(etapaAtual, 5)); }, [form]);

  // Valor da parcela automático (total − entrada) / nº parcelas
  const set = (k, v) => setForm(f => {
    const n = { ...f, [k]: v };
    if (['valor_total', 'valor_adesao', 'num_parcelas'].includes(k)) {
      const total = parseFloat(n.valor_total) || 0, ent = parseFloat(n.valor_adesao) || 0, np = parseInt(n.num_parcelas) || 0;
      if (np === 0) { n.valor_adesao = total > 0 ? String(total) : n.valor_adesao; n.valor_parcela = '0'; }
      else { const rest = Math.max(0, total - ent); n.valor_parcela = rest > 0 ? (rest / np).toFixed(2) : '0'; }
    }
    return n;
  });
  const buscarCep = async () => {
    if (dig(form.cep).length !== 8) return;
    const d = await consultarCep(form.cep).catch(() => null);
    if (d) setForm(f => ({ ...f, endereco: f.endereco || d.logradouro || '', bairro: f.bairro || d.bairro || '', cidade: f.cidade || d.cidade || '', estado: f.estado || d.estado || '' }));
  };
  const buscarCnpj = async () => {
    if (dig(form.cpf_cnpj).length !== 14) return;
    const d = await consultarCnpj(form.cpf_cnpj).catch(() => null);
    if (d) setForm(f => ({ ...f, nome: f.nome || d.razao_social || '', endereco: f.endereco || [d.endereco, d.numero].filter(Boolean).join(', '), bairro: f.bairro || d.bairro || '', cidade: f.cidade || d.cidade || '', estado: f.estado || d.estado || '', cep: f.cep || d.cep || '' }));
  };

  const faltando = form ? OBRIGATORIOS.filter(([k]) => !String(form[k] ?? '').trim()) : [];

  // Proposta/análise vigente com valores diferentes do contrato (ex.: nova versão da análise)
  const ROT_DIF = { valor_total: 'Valor total', valor_adesao: 'Entrada', num_parcelas: 'Nº de parcelas', valor_parcela: 'Parcela', forma_pagamento: 'Forma de pagamento', prazo_implantacao_dias: 'Prazo de implantação (dias)' };
  const difs = ct && valoresIniciais ? Object.keys(ROT_DIF).filter(k => {
    const v = valoresIniciais[k];
    if (v === undefined || v === '' || v === null) return false;
    const atual = ct[k];
    return typeof v === 'number' || !isNaN(parseFloat(v)) && k !== 'forma_pagamento'
      ? Math.abs((parseFloat(v) || 0) - (parseFloat(atual) || 0)) > 0.009
      : String(v) !== String(atual || '');
  }) : [];
  const fmtDif = (k, v) => (['valor_total', 'valor_adesao', 'valor_parcela'].includes(k) ? brl(v) : k === 'num_parcelas' ? (Number(v) ? `${v}x` : 'à vista') : (v || '—'));
  const aplicarProposta = async () => {
    const jaAssinado = atingiu(st, 'assinado');
    const msg = jaAssinado
      ? 'O contrato já está assinado. Aplicar os novos valores exige novo PDF e nova assinatura (ou um aditivo). Aplicar mesmo assim?'
      : `Atualizar o contrato com a ${valoresIniciais._origem || 'proposta vigente'}?${ct.pdf_url || ct.link_assinatura ? '\nO PDF e o link de assinatura atuais ficam desatualizados: o contrato volta para "Em elaboração" para você gerar o PDF de novo.' : ''}`;
    if (!(await confirmar(msg))) return;
    const campos = Object.fromEntries(difs.map(k => [k, ['valor_total', 'valor_adesao', 'valor_parcela'].includes(k) ? (parseFloat(valoresIniciais[k]) || 0) : k === 'num_parcelas' || k === 'prazo_implantacao_dias' ? (parseInt(valoresIniciais[k]) || 0) : valoresIniciais[k]]));
    if (ct.pdf_url || ct.link_assinatura || st !== 'rascunho') Object.assign(campos, { status: 'rascunho', pdf_url: null, link_assinatura: null, zapsign_doc_token: null });
    try {
      const novo = await aplicar(campos, 'Contrato atualizado com a proposta vigente. Gere o PDF novamente.');
      setForm(f => ({ ...(f || {}), ...campos }));
      setLinkAssin('');
      setAberta(1);
      return novo;
    } catch (e) { toast.error(e.message); }
  };
  const pj = dig(form?.cpf_cnpj).length === 14;

  const notificar = (evento, destinatarios) => ct && base44.functions.invoke('notificarStatusContrato', { contrato_id: ct.id, evento, destinatarios }).catch(() => {});
  const aplicar = async (campos, msg) => {
    await base44.entities.Contrato.update(ct.id, campos);
    const novo = { ...ct, ...campos };
    setCt(novo);
    try { await sincronizarDocumentosVenda(novo); } catch { /* sem venda ainda */ }
    if (msg) toast.success(msg);
    onAtualizado?.(novo);
    return novo;
  };
  const subir = async (file) => (await base44.integrations.Core.UploadFile({ file })).file_url;

  // ── 1. Salvar dados (cria ou atualiza o contrato; mantém o cadastro do cliente completo)
  const salvar = async (eGerar) => {
    setOcupado('salvar');
    try {
      const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
      let vendedor_id = ct?.vendedor_id, vendedor_nome = ct?.vendedor_nome;
      const escolhido = vendedores.find(v => v.id === respId);
      if (escolhido) { vendedor_id = escolhido.id; vendedor_nome = escolhido.nome; }
      if (!vendedor_id) {
        try { const v = await resolverVendedorDoUsuarioLogado(); if (v?.id && v.ativo !== false) { vendedor_id = v.id; vendedor_nome = v.nome; } } catch { /* sem vínculo */ }
        if (!vendedor_id) { vendedor_id = user?.id || ''; vendedor_nome = user?.nome_tratamento || user?.full_name || user?.email || ''; }
      }
      const f = form;
      const payload = {
        ...f, tipo, vendedor_id, vendedor_nome,
        valor_total: parseFloat(f.valor_total) || 0, valor_adesao: parseFloat(f.valor_adesao) || 0,
        num_parcelas: parseInt(f.num_parcelas) || 0, valor_parcela: parseInt(f.num_parcelas) > 0 ? (parseFloat(f.valor_parcela) || 0) : 0,
        cotacao: parseFloat(f.cotacao) || 0, valor_em_moeda: parseFloat(f.valor_em_moeda) || 0, prazo_meses: parseInt(f.prazo_meses) || 0, dia_vencimento: parseInt(f.dia_vencimento) || 0,
        mensalidade: toNum(f.mensalidade), rate: toNum(f.rate), valor_diagnostico: toNum(f.valor_diagnostico),
        dia_vencimento_diagnostico: parseInt(f.dia_vencimento_diagnostico) || undefined, dia_vencimento_mensalidade: parseInt(f.dia_vencimento_mensalidade) || undefined,
        escopo_rating: f.escopo_rating || undefined, data_primeira_parcela: f.data_primeira_parcela || undefined,
        ...(tipo === 'OFFSHORE' ? {
          prazo_implantacao_dias: parseInt(f.prazo_implantacao_dias) || 90, offshore_manutencao_meses: parseInt(f.offshore_manutencao_meses) || 12,
          numero_contrato: String(f.numero_contrato || '').trim(), estrutura_jurisdicao: String(f.estrutura_jurisdicao || '').trim() || 'Wyoming, EUA',
          anexo_ativo: f.offshore_entrada_forma === 'dacao_veiculo' ? true : !!f.anexo_ativo,
          anexo_tipo: f.offshore_entrada_forma === 'dacao_veiculo' ? 'veiculo' : (f.anexo_tipo || 'personalizado'),
          anexo_veiculo: { ...(f.anexo_veiculo || {}), prazo_entrega_dias: parseInt(f.anexo_veiculo?.prazo_entrega_dias) || 5 },
        } : {}),
        ...(vinculo.estudo_id ? { estudo_id: vinculo.estudo_id } : {}),
        ...(vinculo.pipeline_id ? { pipeline_id: vinculo.pipeline_id } : {}),
      };
      ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'status'].forEach(k => delete payload[k]);

      // Cliente na base: completa campos vazios do cadastro, ou cria na carteira do responsável
      let cli = cliente;
      const dadosCli = Object.fromEntries(['nome', 'cpf_cnpj', 'responsavel_legal', 'cpf_responsavel', 'nascimento', 'nacionalidade', 'profissao', 'estado_civil', 'email', 'telefone', 'cep', 'endereco', 'bairro', 'cidade', 'estado'].filter(k => String(f[k] || '').trim()).map(k => [k, f[k]]));
      if (cli?.id) {
        const falt = Object.fromEntries(Object.entries(dadosCli).filter(([k]) => !String(cli[k] ?? '').trim()));
        if (Object.keys(falt).length) await base44.entities.Cliente.update(cli.id, falt).catch(() => {});
      } else if (f.nome && f.cpf_cnpj) {
        const ex = await base44.entities.Cliente.filter({ $or: [{ cpf_cnpj: f.cpf_cnpj }, { cpf_cnpj: dig(f.cpf_cnpj) }] }, '-created_date', 1).catch(() => []);
        cli = ex?.[0] || await base44.entities.Cliente.create({ ...dadosCli, tipo_pessoa: pj ? 'PJ' : 'PF', origem: 'nativo', vendedor_id, vendedor_nome, observacao: `Cliente gerado pelo contrato ${tipo}.` });
        setCliente(cli);
      }
      if (cli?.id) payload.cliente_id = cli.id;

      let salvo;
      if (ct) salvo = await base44.entities.Contrato.update(ct.id, payload);
      else salvo = await base44.entities.Contrato.create({ ...payload, indicadores: indicadoresIni, status: 'rascunho' });
      const novo = { ...(ct || {}), ...payload, ...(salvo || {}), status: ct?.status || 'rascunho' };
      setCt(novo);
      setEditando(false);
      toast.success(ct ? 'Dados do contrato atualizados.' : 'Contrato criado na operação.');
      if (!ct) onCriado?.(novo); else onAtualizado?.(novo);
      if (eGerar) await gerarPdf(novo);
      else setAberta(1);
    } catch (e) { toast.error('Não foi possível salvar: ' + e.message); }
    setOcupado(null);
  };

  // ── 2. PDF
  const gerarPdf = async (alvo = ct) => {
    const falta = OBRIGATORIOS.filter(([k]) => !String(alvo?.[k] ?? '').trim());
    if (falta.length) { toast.error(`Complete antes de gerar o PDF: ${falta.map(x => x[1]).join(', ')}`, { duration: 7000 }); setEditando(true); setAberta(0); return; }
    setOcupado('pdf');
    try {
      const r = await base44.functions.invoke('gerarContratosPDF', { contrato_id: alvo.id });
      const { pdf_base64, filename } = r.data || {};
      if (!pdf_base64) throw new Error(r?.data?.error || 'falha ao gerar');
      const nome = filename || `contrato_${String(tipo).replace(/ /g, '_')}.pdf`;
      const bytes = baixarB64(pdf_base64, nome);
      setPdfB64(pdf_base64);
      let pdf_url = alvo.pdf_url;
      try { pdf_url = await subir(new File([bytes], nome, { type: 'application/pdf' })); } catch { /* mantém */ }
      const status = alvo.status === 'rascunho' || !alvo.status ? 'gerado' : alvo.status;
      await base44.entities.Contrato.update(alvo.id, { status, pdf_url });
      const novo = { ...alvo, status, pdf_url };
      setCt(novo);
      if (alvo.status === 'rascunho') base44.functions.invoke('notificarStatusContrato', { contrato_id: alvo.id, evento: 'pdf_gerado', destinatarios: 'admins' }).catch(() => {});
      toast.success('PDF gerado, salvo na operação e baixado.');
      onAtualizado?.(novo);
      setAberta(2); setConfirmaZap(true);
    } catch (e) { toast.error('Erro ao gerar o PDF: ' + e.message); }
    setOcupado(null);
  };
  const anexarPdfProprio = async (file) => {
    if (file.type !== 'application/pdf') { toast.error('Selecione um PDF.'); return; }
    setOcupado('pdf_up');
    try { const url = await subir(file); await aplicar({ pdf_url: url, status: atingiu(st, 'gerado') ? st : 'gerado' }, 'PDF anexado à operação.'); }
    catch (e) { toast.error(e.message); }
    setOcupado(null);
  };

  // ── 3. Assinatura (ZapSign ou link próprio)
  const enviarZapsign = async () => {
    setOcupado('zap');
    try {
      const r = await base44.functions.invoke('enviarContratoZapsign', { contrato_id: ct.id, ...(pdfB64 ? { pdf_base64: pdfB64 } : {}) });
      const d = r?.data || {};
      if (d.error) throw new Error(d.error);
      const novo = { ...ct, link_assinatura: d.sign_url, zapsign_doc_token: d.doc_token };
      setCt(novo); setLinkAssin(d.sign_url || '');
      setConfirmaZap(false);
      toast.success(`Link de assinatura enviado para ${d.enviado_para || ct.email}.`);
      onAtualizado?.(novo);
    } catch (e) { toast.error('Erro ao enviar para assinatura: ' + (e?.response?.data?.error || e.message)); }
    setOcupado(null);
  };
  const verificarAssinatura = async () => {
    setOcupado('zap_ver');
    try {
      const r = await base44.functions.invoke('verificarStatusZapsign', { contrato_id: ct.id });
      const d = r?.data || {};
      if (d.contrato_atualizado) { const novo = { ...ct, status: 'assinado' }; setCt(novo); onAtualizado?.(novo); }
      toast.success(d.mensagem || 'Consulta feita.');
    } catch (e) { toast.error('Erro ao consultar a assinatura: ' + (e?.response?.data?.error || e.message)); }
    setOcupado(null);
  };
  const salvarLinkAssin = async () => {
    await aplicar({ link_assinatura: linkAssin.trim() || null }, 'Link de assinatura salvo.');
    if (linkAssin.trim()) notificar('link_assinatura_adicionado', 'gerente');
  };

  // ── 4. Contrato assinado
  const anexarAssinado = async (file) => {
    setOcupado('assinado');
    try {
      const url = await subir(file);
      await aplicar({ contrato_assinado_url: url, contrato_assinado_nome: file.name, ...(atingiu(st, 'assinado') ? {} : { status: 'assinado' }) }, 'Contrato assinado anexado.');
      notificar('contrato_assinado', 'admins');
      setAberta(4);
    } catch (e) { toast.error(e.message); }
    setOcupado(null);
  };

  // ── 5. Cobrança
  const salvarCobranca = async () => {
    const campos = { link_pagamento: linkPag.trim() || null };
    if (linkPag.trim() && !atingiu(st, 'aguardando_pagamento')) campos.status = 'aguardando_pagamento';
    await aplicar(campos, 'Cobrança registrada.');
    if (linkPag.trim()) notificar('cobranca_enviada', 'gerente');
  };
  const anexarBoleto = async (file) => {
    setOcupado('boleto');
    try {
      const url = await subir(file);
      await aplicar({ boleto_url: url, boleto_nome: file.name, ...(atingiu(st, 'aguardando_pagamento') ? {} : { status: 'aguardando_pagamento' }) }, 'Boleto anexado.');
      notificar('cobranca_enviada', 'gerente');
    } catch (e) { toast.error(e.message); }
    setOcupado(null);
  };

  // ── 6. Pagamento (até 3 comprovantes)
  const anexarComprovante = async (file) => {
    if (comprovantes.length >= 3) { toast.error('Máximo de 3 comprovantes. Remova um para anexar outro.'); return; }
    setOcupado('comp');
    try {
      const url = await subir(file);
      const arr = [...comprovantes, { url, nome: file.name }];
      const campos = { comprovantes: arr };
      if (!ct.comprovante_url) { campos.comprovante_url = url; campos.comprovante_nome = file.name; }
      if (!atingiu(st, 'pago')) campos.status = 'pago';
      await aplicar(campos, 'Pagamento registrado.');
      notificar('comprovante_anexado', 'admins');
      setAberta(6);
    } catch (e) { toast.error(e.message); }
    setOcupado(null);
  };
  const removerComprovante = async (url) => {
    if (!(await confirmar('Remover este comprovante?'))) return;
    const arr = comprovantes.filter(c => c.url !== url);
    const campos = { comprovantes: arr };
    if (ct.comprovante_url === url) { campos.comprovante_url = arr[0]?.url || null; campos.comprovante_nome = arr[0]?.nome || null; }
    if (!arr.length && st === 'pago') campos.status = 'aguardando_pagamento';
    await aplicar(campos, 'Comprovante removido.');
  };

  // ── 7. Vendas
  const enviarVendas = async () => {
    setOcupado('vendas');
    try {
      const r = await enviarContratoParaVendas({ contrato: ct, isAdmin, pedirOpcoes });
      if (r?.cancelado) { setOcupado(null); return; }
      setCt(r.contrato);
      if (r.avisoComissoes) toast.warning('Venda criada, mas as comissões não foram lançadas: ' + r.avisoComissoes + '. Abra a venda em Vendas e salve para lançá-las.');
      if (r.avisoParcelas) toast.warning('Venda criada, mas houve falha ao gerar as parcelas vincendas: ' + r.avisoParcelas);
      toast.success(r.recorrencia ? (r.jaRecebida ? 'Esta parcela já havia sido recebida — nada foi duplicado.' : 'Recebimento de parcela registrado em Vendas.') : 'Venda registrada! Ela já conta no Dash e em Vendas.');
      onVendaCriada?.();
    } catch (e) { toast.error(e.message, { duration: 7000 }); }
    setOcupado(null);
  };

  const ajustarEtapa = async (novo) => {
    if (!novo || novo === st) return;
    if (!(await confirmar(`Ajustar a etapa do contrato para "${STATUS[novo]}"?`))) return;
    await aplicar({ status: novo }, 'Etapa ajustada.');
  };

  if (!form) return <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.muted, padding: 20 }}><Loader2 className="w-4 h-4 animate-spin" /> Preparando o contrato…</div>;
  if (!tipo) return <div style={{ padding: 20, borderRadius: 16, background: C.card, color: C.txt2, fontSize: 14 }}>Este produto ainda não tem modelo de contrato no portal.</div>;

  const p = (k, extra = {}) => ({ k, form, set, ...extra });
  const estado = (i) => (i < etapaAtual ? 'feito' : i === etapaAtual ? 'atual' : 'bloqueado');
  const toggle = (i) => setAberta(a => (a === i ? -1 : i));
  const isMon = tipo === 'MONITORE', isRat = tipo === 'RATING', isSco = tipo === 'SCORE', isDia = tipo === 'DIAGNÓSTICO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 980 }}>
      {/* Resumo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '4px 2px' }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: C.txt }}>Contrato {tipo}{ct?.numero_contrato ? ` nº ${ct.numero_contrato}` : ''}</span>
        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, background: t.dim, color: t.txt, border: `1px solid ${t.line}` }}>{ct ? STATUS[st] : 'Ainda não criado'}</span>
        {ct?.valor_total ? <span style={{ fontSize: 13, color: C.txt2 }}>{brl(ct.valor_total)}{ct.num_parcelas > 0 ? ` · entrada ${brl(ct.valor_adesao)} + ${ct.num_parcelas}× ${brl(ct.valor_parcela)}` : ''}</span> : null}
        <span style={{ flex: 1 }} />
        {ct?.vendedor_nome && <span style={{ fontSize: 12, color: C.muted }}>Responsável: {ct.vendedor_nome}</span>}
        {isAdmin && ct && (
          <select value="" onChange={e => ajustarEtapa(e.target.value)} aria-label="Ajustar etapa" style={{ ...inp, width: 170, height: 32, fontSize: 12 }}>
            <option value="">Ajustar etapa…</option>
            {ORDEM.map(s => <option key={s} value={s}>{STATUS[s]}</option>)}
          </select>
        )}
      </div>

      {difs.length > 0 && st !== 'no_pipeline' && (
        <div role="status" style={{ padding: 14, borderRadius: 16, background: 'rgba(227,201,130,0.08)', border: '1px solid rgba(227,201,130,0.35)', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <RefreshCw className="w-5 h-5" style={{ color: C.warn, flex: 'none', marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>A {valoresIniciais._origem || 'proposta vigente'} tem valores diferentes do contrato</span>
            {difs.map(k => (
              <span key={k} style={{ fontSize: 12, color: C.txt2 }}>{ROT_DIF[k]}: <span style={{ color: C.muted, textDecoration: 'line-through' }}>{fmtDif(k, ct[k])}</span> → <b style={{ color: C.warn }}>{fmtDif(k, valoresIniciais[k])}</b></span>
            ))}
            {atingiu(st, 'assinado') && <span style={{ fontSize: 12, color: C.err }}>Contrato já assinado: os novos valores exigem nova assinatura ou um aditivo.</span>}
          </div>
          <button onClick={aplicarProposta} className="vx-btn vx-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 13, alignSelf: 'center' }}>
            <RefreshCw className="w-4 h-4" /> Usar a proposta no contrato
          </button>
        </div>
      )}

      {/* 1. Dados */}
      <Etapa n={1} t={t} titulo="Dados do contrato" estado={ct ? 'feito' : 'atual'} aberta={aberta === 0} onToggle={() => toggle(0)}
        sub={ct ? `${ct.nome || '—'} · ${ct.cpf_cnpj || ''} · ${ct.forma_pagamento || 'forma de pagamento a definir'}` : 'Cliente da base e valores definidos na operação já vêm preenchidos.'}
        extra={ct && !editando && st !== 'no_pipeline' ? <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setEditando(true); setAberta(0); }} className="vx-btn vx-btn-soft" style={{ height: 28, padding: '0 10px', fontSize: 12 }}><Pencil className="w-3.5 h-3.5" /> Editar</span> : null}>
        {!editando && ct ? (
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', fontSize: 13 }}>
            {[['Contratante', ct.nome], ['CPF/CNPJ', ct.cpf_cnpj], ['E-mail', ct.email], ['Telefone', ct.telefone], ['Cidade', [ct.cidade, ct.estado].filter(Boolean).join('/')], ['Data do contrato', ct.data_contrato?.split('-').reverse().join('/')], ['Forma de pagamento', ct.forma_pagamento], ['1º pagamento', ct.data_primeiro_pagamento?.split('-').reverse().join('/')]].map(([l, v]) => (
              <div key={l}><p style={{ fontSize: 11, color: C.muted }}>{l}</p><p style={{ color: C.txt }}>{v || '—'}</p></div>
            ))}
            <div style={{ gridColumn: '1 / -1' }} className="vx-form-escuro">
              <IndicadoresEditor contrato={ct} onUpdate={(c) => { setCt(c); onAtualizado?.(c); }} />
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.txt2 }}>Contratante</p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
              <Campo label={pj ? 'Razão social' : 'Nome completo'} {...p('nome', { span: 2, req: true })} />
              <Campo label="CPF/CNPJ" {...p('cpf_cnpj', { req: true, onBlur: buscarCnpj })} />
              <Campo label="E-mail" {...p('email', { type: 'email', req: true })} />
              {pj && <Campo label="Responsável legal" {...p('responsavel_legal', { span: 2 })} />}
              {pj && <Campo label="CPF do responsável" {...p('cpf_responsavel')} />}
              <Campo label="Telefone" {...p('telefone', { req: true })} />
              <Campo label={pj ? 'Nascimento do responsável' : 'Nascimento'} {...p('nascimento', { type: 'date', req: true })} />
              <Campo label="Nacionalidade" {...p('nacionalidade', { req: true })} />
              <Campo label="Profissão" {...p('profissao', { req: true })} />
              <Campo label="Estado civil" {...p('estado_civil', { options: ESTADO_CIVIL, req: true })} />
              <Campo label="CEP" {...p('cep', { req: true, onBlur: buscarCep })} />
              <Campo label="Endereço" {...p('endereco', { span: 2, req: true })} />
              <Campo label="Bairro" {...p('bairro', { req: true })} />
              <Campo label="Cidade" {...p('cidade', { req: true })} />
              <Campo label="UF" {...p('estado', { options: UFS, req: true })} />
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: C.txt2, marginTop: 4 }}>Valores e pagamento</p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
              <Campo label={isDia ? 'Valor do diagnóstico' : isMon ? 'Valor da adesão' : 'Valor total / adesão'} {...p('valor_total', { money: true, req: true })} />
              {!isMon && <Campo label="Entrada" {...p('valor_adesao', { money: true })} />}
              {!isMon && <Campo label="Nº de parcelas" {...p('num_parcelas', { options: PARCELAS.map(n => ({ v: n, l: n === 0 ? 'Sem parcelas (à vista)' : `${n}x` })) })} />}
              {!isMon && <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Valor da parcela (automático)<input readOnly value={parseInt(form.num_parcelas) > 0 ? brl(form.valor_parcela) : '—'} style={{ ...inp, opacity: 0.8 }} /></label>}
              <Campo label="Forma de pagamento" {...p('forma_pagamento', { options: FORMAS, req: true })} />
              <Campo label="Data do 1º pagamento" {...p('data_primeiro_pagamento', { type: 'date' })} />
              {(isMon || parseInt(form.num_parcelas) > 0) && <Campo label={isMon ? '1ª mensalidade' : 'Vencimento da 1ª parcela'} {...p('data_primeira_parcela', { type: 'date' })} />}
              <Campo label="Dia de vencimento" {...p('dia_vencimento', { type: 'number', placeholder: 'Ex.: 10' })} />
              {isMon && <Campo label="Mensalidade" {...p('mensalidade', { money: true, req: true })} />}
              {isMon && <Campo label="RATE (%)" {...p('rate', { type: 'number', req: true })} />}
              {isRat && <Campo label="Valor somente diagnóstico" {...p('valor_diagnostico', { money: true })} />}
              {isRat && <Campo label="Vencimento do diagnóstico (dia)" {...p('dia_vencimento_diagnostico', { type: 'number' })} />}
              {isRat && <Campo label="Serviço contratado" {...p('escopo_rating', { options: ESCOPOS_RATING })} />}
              {isSco && <Campo label="Mensalidade" {...p('mensalidade', { money: true })} />}
              {isSco && <Campo label="Vencimento da mensalidade (dia)" {...p('dia_vencimento_mensalidade', { type: 'number' })} />}
              {!isMon && !isRat && !isSco && !isDia && <Campo label="Prazo (meses)" {...p('prazo_meses', { type: 'number' })} />}
              <Campo label="Data do contrato" {...p('data_contrato', { type: 'date', req: true })} />
              {isAdmin && (
                <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Gerente responsável
                  <select value={respId} onChange={e => setRespId(e.target.value)} style={inp}>
                    <option value="">{ct?.vendedor_nome || 'Quem está criando'}</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </label>
              )}
            </div>
            {!isMon && !isRat && !isSco && !isDia && tipo !== 'OFFSHORE' && (
              <button onClick={() => setVerMais(v => !v)} className="vx-btn vx-btn-ghost" style={{ alignSelf: 'flex-start', height: 30, padding: '0 12px', fontSize: 12 }}>
                {verMais ? 'Ocultar' : 'Mostrar'} dados bancários e moeda
              </button>
            )}
            {verMais && (
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                <Campo label="Banco" {...p('banco')} /><Campo label="Agência" {...p('agencia')} /><Campo label="Conta" {...p('conta')} />
                <Campo label="Moeda" {...p('moeda')} /><Campo label="Cotação (R$)" {...p('cotacao', { type: 'number' })} /><Campo label="Valor em moeda estrangeira" {...p('valor_em_moeda', { type: 'number' })} />
              </div>
            )}
            {tipo === 'OFFSHORE' && (
              <div className="vx-form-escuro" style={{ borderRadius: 14, border: `1px solid ${C.line}`, padding: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.txt2, marginBottom: 8 }}>Estrutura Offshore (nº do contrato, jurisdição, prazos e anexo)</p>
                <ContratoOffshoreEstrutura form={form} setForm={setForm} />
              </div>
            )}
            <Campo label="Observações / condições combinadas" {...p('observacoes', { span: 4 })} />
            {!ct && indicadoresIni.length > 0 && <p style={{ fontSize: 12, color: C.muted }}>Indicador da origem: <b style={{ color: C.txt2 }}>{indicadoresIni[0].nome}</b> ({indicadoresIni[0].percentual}%). Você pode ajustar os indicadores depois de salvar.</p>}
            {faltando.length > 0 && <p style={{ fontSize: 12, color: C.warn }}>Para gerar o PDF faltam: {faltando.map(x => x[1]).join(', ')}.</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => salvar(true)} disabled={!!ocupado} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
                {ocupado === 'salvar' || ocupado === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Salvar e gerar o PDF
              </button>
              <button onClick={() => salvar(false)} disabled={!!ocupado} className="vx-btn vx-btn-soft" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Só salvar</button>
              {ct && <button onClick={() => { setForm(formInicial({ contrato: ct, tipo })); setEditando(false); }} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 14px', fontSize: 13 }}>Cancelar edição</button>}
            </div>
          </>
        )}
      </Etapa>

      {/* 2. PDF */}
      <Etapa n={2} t={t} titulo="PDF do contrato" estado={!ct ? 'bloqueado' : ct.pdf_url || atingiu(st, 'gerado') ? 'feito' : 'atual'} aberta={aberta === 1} onToggle={() => toggle(1)}
        sub={ct?.pdf_url ? 'PDF gerado e salvo na operação.' : 'Gera o PDF no modelo do produto.'}>
        {!ct ? <p style={{ fontSize: 13, color: C.muted }}>Salve os dados do contrato primeiro.</p> : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => gerarPdf()} disabled={!!ocupado || st === 'no_pipeline'} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
              {ocupado === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {ct.pdf_url ? 'Gerar novamente' : 'Gerar o PDF'}
            </button>
            {ct.pdf_url && <a href={ct.pdf_url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 14px', fontSize: 13 }}><Download className="w-4 h-4" /> Abrir o PDF</a>}
            <BotaoArquivo label="Anexar um PDF próprio" accept="application/pdf" onArquivo={anexarPdfProprio} carregando={ocupado === 'pdf_up'} />
          </div>
        )}
      </Etapa>

      {/* 3. Assinatura */}
      <Etapa n={3} t={t} titulo="Assinatura do cliente" estado={!ct?.pdf_url && !atingiu(st, 'gerado') ? 'bloqueado' : atingiu(st, 'assinado') ? 'feito' : 'atual'} aberta={aberta === 2} onToggle={() => toggle(2)}
        sub={ct?.link_assinatura ? 'Link de assinatura enviado ao cliente.' : 'Envie pelo ZapSign ou registre um link próprio.'}>
        {ct && (
          <>
            {confirmaZap && !ct.link_assinatura && (
              <div style={{ padding: 12, borderRadius: 12, background: t.dim, border: `1px solid ${t.line}`, fontSize: 13, color: C.txt2 }}>
                Enviar o contrato para assinatura via ZapSign para <b style={{ color: C.txt }}>{ct.email || '— cliente sem e-mail —'}</b>?
                {!ct.email && ' Cadastre o e-mail do cliente nos dados do contrato.'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={enviarZapsign} disabled={!!ocupado || !ct.email} className="vx-btn vx-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                {ocupado === 'zap' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {ct.link_assinatura ? 'Reenviar pelo ZapSign' : 'Enviar para assinatura (ZapSign)'}
              </button>
              {ct.zapsign_doc_token && (
                <button onClick={verificarAssinatura} disabled={!!ocupado} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                  {ocupado === 'zap_ver' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verificar se o cliente assinou
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link2 className="w-4 h-4" style={{ color: C.muted, flex: 'none' }} />
              <input value={linkAssin} onChange={e => setLinkAssin(e.target.value)} placeholder="Link de assinatura (ZapSign ou outro)" style={{ ...inp, flex: 1 }} aria-label="Link de assinatura" />
              {linkAssin && <button onClick={() => { navigator.clipboard.writeText(linkAssin); toast.success('Link copiado.'); }} className="vx-btn vx-btn-ghost" style={{ height: 36, padding: '0 10px' }} aria-label="Copiar link"><Copy className="w-4 h-4" /></button>}
              {linkAssin !== (ct.link_assinatura || '') && <button onClick={salvarLinkAssin} className="vx-btn vx-btn-soft" style={{ height: 36, padding: '0 12px', fontSize: 12 }}>Salvar link</button>}
            </div>
          </>
        )}
      </Etapa>

      {/* 4. Contrato assinado */}
      <Etapa n={4} t={t} titulo="Contrato assinado" estado={!ct || !atingiu(st, 'gerado') ? 'bloqueado' : ct.contrato_assinado_url ? 'feito' : 'atual'} aberta={aberta === 3} onToggle={() => toggle(3)}
        sub={ct?.contrato_assinado_url ? ct.contrato_assinado_nome : 'Anexe a via assinada (vai junto para Vendas).'}>
        {ct && (ct.contrato_assinado_url
          ? <Arquivo nome={ct.contrato_assinado_nome} url={ct.contrato_assinado_url} onRemover={st === 'no_pipeline' ? null : async () => { if ((await confirmar('Remover o contrato assinado?'))) await aplicar({ contrato_assinado_url: null, contrato_assinado_nome: null }, 'Arquivo removido.'); }} />
          : <BotaoArquivo label="Anexar o contrato assinado" primario onArquivo={anexarAssinado} carregando={ocupado === 'assinado'} />)}
      </Etapa>

      {/* 5. Cobrança */}
      <Etapa n={5} t={t} titulo="Cobrança" estado={!ct?.contrato_assinado_url ? 'bloqueado' : (ct.link_pagamento || ct.boleto_url) ? 'feito' : 'atual'} aberta={aberta === 4} onToggle={() => toggle(4)}
        sub={ct?.link_pagamento ? 'Link de pagamento enviado.' : ct?.boleto_url ? 'Boleto anexado.' : 'Link de pagamento, boleto, PIX ou TED.'}>
        {ct && (
          <>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '200px 1fr' }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Como o cliente vai pagar
                <select value={ct.origem_pagamento || ''} onChange={e => aplicar({ origem_pagamento: e.target.value }, 'Forma de cobrança registrada.')} style={inp}>
                  <option value="">Selecione…</option>{ORIGENS_PAG.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Link de pagamento
                <span style={{ display: 'flex', gap: 8 }}>
                  <input value={linkPag} onChange={e => setLinkPag(e.target.value)} placeholder="https://…" style={{ ...inp, flex: 1 }} />
                  {linkPag && <button onClick={() => { navigator.clipboard.writeText(linkPag); toast.success('Link copiado.'); }} className="vx-btn vx-btn-ghost" style={{ height: 38, padding: '0 10px' }} aria-label="Copiar"><Copy className="w-4 h-4" /></button>}
                  {linkPag !== (ct.link_pagamento || '') && <button onClick={salvarCobranca} className="vx-btn vx-btn-primary" style={{ height: 38, padding: '0 12px', fontSize: 12 }}>Salvar</button>}
                </span>
              </label>
            </div>
            {ct.boleto_url
              ? <Arquivo nome={ct.boleto_nome || 'Boleto'} url={ct.boleto_url} onRemover={async () => { if ((await confirmar('Remover o boleto?'))) await aplicar({ boleto_url: null, boleto_nome: null }, 'Boleto removido.'); }} />
              : <BotaoArquivo label="Anexar boleto" onArquivo={anexarBoleto} carregando={ocupado === 'boleto'} />}
            {parseInt(ct.num_parcelas) > 0 && (
              <details className="vx-form-escuro" style={{ borderRadius: 12, border: `1px solid ${C.line}`, padding: '8px 12px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: C.txt2 }}>Boletos das parcelas ({(ct.boletos_parcelas || []).length})</summary>
                <div style={{ marginTop: 8 }}><BoletosParcelas contrato={ct} onUpdate={(c) => { setCt(c); onAtualizado?.(c); }} /></div>
              </details>
            )}
          </>
        )}
      </Etapa>

      {/* 6. Pagamento */}
      <Etapa n={6} t={t} titulo="Registro do pagamento" estado={!ct?.contrato_assinado_url ? 'bloqueado' : comprovantes.length ? 'feito' : 'atual'} aberta={aberta === 5} onToggle={() => toggle(5)}
        sub={comprovantes.length ? `${comprovantes.length} comprovante(s) anexado(s).` : 'Anexe o comprovante de pagamento (até 3).'}>
        {ct && (
          <>
            {comprovantes.map(c => <Arquivo key={c.url} nome={c.nome} url={c.url} onRemover={st === 'no_pipeline' ? null : () => removerComprovante(c.url)} />)}
            {comprovantes.length < 3 && st !== 'no_pipeline' && <BotaoArquivo label="Anexar comprovante" primario={!comprovantes.length} onArquivo={anexarComprovante} carregando={ocupado === 'comp'} />}
          </>
        )}
      </Etapa>

      {/* 7. Vendas */}
      <Etapa n={7} t={t} titulo="Envio para Vendas e Dash" estado={st === 'no_pipeline' ? 'feito' : atingiu(st, 'pago') && comprovantes.length ? 'atual' : 'bloqueado'} aberta={aberta === 6} onToggle={() => toggle(6)}
        sub={st === 'no_pipeline' ? 'Venda registrada — conta no Dash, em Vendas e nas comissões.' : 'Registra a venda com parcelamento, origem e indicadores do contrato.'}>
        {ct && (st === 'no_pipeline' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: C.ok }}><CheckCircle2 className="w-4 h-4" /> Enviado para Vendas</span>
            <button onClick={() => onVendaCriada?.()} className="vx-btn vx-btn-soft" style={{ height: 34, padding: '0 14px', fontSize: 13 }}><Receipt className="w-4 h-4" /> Ver venda e comissões</button>
            <button onClick={enviarVendas} disabled={!!ocupado} className="vx-btn vx-btn-ghost" style={{ height: 34, padding: '0 14px', fontSize: 12 }} title="Registrar o recebimento de uma parcela deste contrato">
              {ocupado === 'vendas' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Registrar recebimento de parcela
            </button>
          </div>
        ) : (
          <>
            <ul style={{ fontSize: 13, color: C.txt2, display: 'flex', flexDirection: 'column', gap: 4, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {[['Contrato assinado anexado', !!ct.contrato_assinado_url], ['Comprovante de pagamento', comprovantes.length > 0], ['Gerente responsável definido', !!ct.vendedor_id]].map(([l, ok]) => (
                <li key={l} style={{ display: 'flex', gap: 6, alignItems: 'center', color: ok ? C.ok : C.muted }}>{ok ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {l}</li>
              ))}
            </ul>
            <button onClick={enviarVendas} disabled={!!ocupado || (!isAdmin && !(atingiu(st, 'pago') && comprovantes.length && ct.contrato_assinado_url))} className="vx-btn vx-btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13, alignSelf: 'flex-start' }}>
              {ocupado === 'vendas' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar para Vendas
            </button>
          </>
        ))}
      </Etapa>
      {/* Coleta de dados e documentos do cliente (links públicos de CI, Offshore/LLC e Canal bancário) */}
      {ct && COLETAS[tipo] && <ColetaCliente tipo={tipo} contrato={ct} user={user} t={t} />}
      {envioDialog}
    </div>
  );
}
