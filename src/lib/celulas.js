// Configuração das Células do portal.
// A célula não guarda dados próprios: ela lê Estudos de Viabilidade, Propostas
// Técnicas, Pipeline, Contratos, Implantações e formulários que já existem e
// organiza tudo numa jornada por produto.

// Tema de cada célula (cores do "modo imersivo").
const TEMA_OURO = { acc: '#C9A962', acc2: '#E3C982', txt: '#E3C982', dim: '#2A2416', line: '#3A3220', glow: 'rgba(201,169,98,0.55)', onAcc: '#1A1508', bg: '#0D1420', head: '#0F1726' };
const TEMA_AZUL = { acc: '#4F8DF5', acc2: '#7FB0FF', txt: '#9CC2FF', dim: '#14223D', line: '#22355C', glow: 'rgba(79,141,245,0.55)', onAcc: '#06122A', bg: '#0B1322', head: '#0E182B' };
const TEMA_VIOLETA = { acc: '#9B87F5', acc2: '#B9A9FF', txt: '#C5B8FF', dim: '#221C3D', line: '#352C5C', glow: 'rgba(155,135,245,0.55)', onAcc: '#140D2E', bg: '#100F1F', head: '#151329' };

export const CELULAS = {
  estruturados: { id: 'estruturados', nome: 'Produtos estruturados', fonte: 'estudo', produtos: ['offshore', 'conta_internacional', 'holding'], tema: TEMA_OURO },
  internacional: { id: 'internacional', nome: 'Área internacional', fonte: 'contrato', produtos: ['rof', 'canal_bancario', 'conta_global', 'dolarize', 'cambio'], tema: TEMA_AZUL },
  cross: { id: 'cross', nome: 'Operações cross', fonte: 'contrato', produtos: ['score', 'rating', 'diagnostico', 'monitore'], tema: TEMA_VIOLETA },
};
// compatibilidade
export const CELULA_ESTRUTURADOS = CELULAS.estruturados;

const ETAPAS_CONTRATO = [
  { titulo: 'Negociação', sub: 'Negócio aberto no Pipeline' },
  { titulo: 'Contrato', sub: 'Contrato em elaboração no portal' },
  { titulo: 'Assinatura', sub: 'Enviado ao cliente para assinar' },
  { titulo: 'Pagamento', sub: 'Assinado, aguardando o pagamento' },
  { titulo: 'Implantação', sub: 'Pago e em implantação' },
  { titulo: 'Concluída', sub: 'Operação entregue ao cliente' },
];

export const JORNADAS = {
  // ── Produtos estruturados (jornada pelo estudo de viabilidade)
  offshore: {
    nome: 'Offshore', lead: 'Do NDA até o contrato e o cadastro da LLC — tudo sob o guarda-chuva Offshore.', tipoContrato: 'OFFSHORE',
    etapas: [
      { titulo: 'NDA', sub: 'Assinado antes de o cliente compartilhar dados' },
      { titulo: 'Estudo de viabilidade', sub: 'Propósito, expectativas e documentos' },
      { titulo: 'Análise técnica', sub: 'IA gera a proposta técnica executiva' },
      { titulo: 'Proposta', sub: 'Aprovada e enviada ao cliente' },
      { titulo: 'Contrato', sub: 'Contrato tipo Offshore gerado no portal' },
      { titulo: 'Cadastro da LLC', sub: 'Documentos e nome sugerido' },
    ],
  },
  conta_internacional: {
    nome: 'Conta internacional', lead: 'NDA, estudo e KYC específico antes da proposta e do contrato.', tipoContrato: 'CONTA INTERNACIONAL',
    etapas: [
      { titulo: 'NDA', sub: 'Confidencialidade antes do KYC' },
      { titulo: 'Estudo e KYC', sub: 'Perfil, objetivo e origem de recursos' },
      { titulo: 'Análise técnica', sub: 'Proposta técnica executiva' },
      { titulo: 'Proposta', sub: 'Condições comerciais' },
      { titulo: 'Contrato', sub: 'Contrato Conta Internacional' },
      { titulo: 'Abertura da conta', sub: 'Formulário pós-assinatura' },
    ],
  },
  holding: {
    nome: 'Holding', lead: 'Do NDA à constituição da holding.', tipoContrato: null,
    etapas: [
      { titulo: 'NDA', sub: 'Confidencialidade do patrimônio' },
      { titulo: 'Estudo de viabilidade', sub: 'Patrimônio, sucessão e objetivos' },
      { titulo: 'Análise técnica', sub: 'Modelo de holding sugerido' },
      { titulo: 'Proposta', sub: 'Etapas, prazos e honorários' },
      { titulo: 'Contrato', sub: 'Contrato de estruturação' },
      { titulo: 'Constituição', sub: 'Documentos para registro' },
    ],
  },
  // ── Área internacional (jornada pelo contrato)
  rof: { nome: 'ROF', lead: 'Registro de Operação Financeira — da negociação à implantação.', tipoContrato: 'ROF', pipeline: ['rof'], etapas: ETAPAS_CONTRATO },
  canal_bancario: { nome: 'Canal bancário', lead: 'Contrato, formulário RNC do cliente e abertura do canal.', tipoContrato: 'CANAL BANCÁRIO', pipeline: ['canal'], etapas: ETAPAS_CONTRATO },
  conta_global: { nome: 'Conta global', lead: 'Conta em moeda estrangeira — da negociação à abertura.', tipoContrato: 'CONTA GLOBAL', pipeline: ['conta global'], etapas: ETAPAS_CONTRATO },
  dolarize: { nome: 'Dolarize', lead: 'Conta global com escrow para mitigar bloqueios e penhoras.', tipoContrato: 'DOLARIZE', pipeline: ['dolarize'], etapas: ETAPAS_CONTRATO },
  cambio: { nome: 'Câmbio', lead: 'Negociações de câmbio acompanhadas pelo Pipeline.', tipoContrato: null, pipeline: ['cambio', 'câmbio'], etapas: ETAPAS_CONTRATO },
  // ── Operações cross
  score: { nome: 'Score', lead: 'Reorganização financeira e remoção de apontamentos.', tipoContrato: 'SCORE', pipeline: ['score'], etapas: ETAPAS_CONTRATO },
  rating: { nome: 'Rating', lead: 'Diagnóstico, reorganização e monitoramento do rating.', tipoContrato: 'RATING', pipeline: ['rating'], pipelineExcluir: ['diagnostico'], etapas: ETAPAS_CONTRATO },
  diagnostico: { nome: 'Diagnóstico', lead: 'Diagnóstico de rating bancário.', tipoContrato: 'DIAGNÓSTICO', pipeline: ['diagnostico', 'diagnóstico'], etapas: ETAPAS_CONTRATO },
  monitore: { nome: 'Monitore', lead: 'Conta digital com monitoramento de riscos corporativos.', tipoContrato: 'MONITORE', pipeline: ['monitore'], etapas: ETAPAS_CONTRATO },
};

const digitos = (v) => String(v || '').replace(/\D/g, '');
export const normal = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// ───────────── Produtos estruturados (estudo) ─────────────
export function contratoDoEstudo(estudo, contratos) {
  const doc = digitos(estudo.cliente_documento);
  const nome = normal(estudo.cliente_nome);
  const vivos = contratos.filter(c => c.status !== 'cancelado');
  return vivos.find(c => c.estudo_id === estudo.id) || (doc && vivos.find(c => digitos(c.cpf_cnpj) === doc)) || (nome && vivos.find(c => normal(c.nome) === nome)) || null;
}

const CONTRATO_FECHADO = ['assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];

// NDA concluído: anexado (fluxo antigo) ou gerado no portal E com a via assinada anexada.
export const ndaConcluido = (e) => !!e.nda_url && (e.nda_origem !== 'gerado' || !!e.nda_assinado_url);

export function etapaDaOperacao(estudo, contrato) {
  if (contrato && CONTRATO_FECHADO.includes(contrato.status)) return 5;
  if (contrato) return 4;
  const ps = estudo.proposta_status;
  if (ps === 'aceita') return 4;
  if (ps === 'aprovada' || ps === 'enviada_cliente') return 3;
  if (estudo.status === 'em_analise_tecnica' || estudo.status === 'concluido' || estudo.proposta_atual_id) return 2;
  if (ndaConcluido(estudo)) return 1;
  return 0;
}

export function proximaAcao(estudo, etapa, contrato, produto) {
  const tipo = JORNADAS[produto]?.tipoContrato;
  switch (etapa) {
    case 0:
      if (produto === 'offshore') {
        if (!estudo.nda_url) return { label: 'Gerar o NDA', acao: 'nda', to: '' };
        if (estudo.nda_origem === 'gerado') return { label: 'Anexar o NDA assinado', acao: 'nda_assinado', to: '' };
      }
      return { label: 'Anexar o NDA ao estudo', acao: 'estudo', to: '' };
    case 1: {
      if (estudo.status === 'rascunho') return { label: 'Enviar o link do estudo ao cliente', acao: 'estudo', to: '' };
      if (estudo.status === 'recebido' || estudo.cliente_devolveu_em) return { label: 'Enviar para análise técnica', acao: 'estudo', to: '' };
      return { label: 'Acompanhar o preenchimento do cliente', acao: 'estudo', to: '' };
    }
    case 2: return { label: estudo.proposta_atual_id ? 'Revisar e aprovar a proposta' : 'Gerar a análise técnica', acao: 'analise', to: '' };
    case 3: return { label: 'Registrar a decisão do cliente', acao: 'analise', to: '' };
    case 4:
      if (contrato) return { label: contrato.status === 'rascunho' ? 'Gerar o PDF do contrato' : 'Assinatura e pagamento', acao: 'contrato', to: '' };
      return tipo ? { label: 'Gerar o contrato', acao: 'contrato', to: '' } : { label: 'Gerar o contrato', acao: 'contrato', to: '' };
    default:
      if (contrato && contrato.status !== 'no_pipeline') return { label: 'Pagamento e envio para Vendas', acao: 'contrato', to: '' };
      return tipo ? { label: 'Ver venda e comissões', acao: 'venda', to: '' } : { label: 'Acompanhar a constituição', acao: 'venda', to: '' };
  }
}

// ───────────── Área internacional / Operações cross (contrato) ─────────────
const IMPL_CONCLUIDA = ['concluido', 'concluido_feedback'];

export function etapaContrato(contrato, implantacao) {
  if (!contrato) return 0;
  if (implantacao && IMPL_CONCLUIDA.includes(implantacao.status)) return 5;
  if (implantacao || ['pago', 'no_pipeline'].includes(contrato.status)) return 4;
  if (['assinado', 'aguardando_pagamento'].includes(contrato.status)) return 3;
  if (contrato.status === 'gerado') return 2;
  return 1;
}

export function proximaAcaoContrato(etapa, contrato, produto) {
  const tipo = JORNADAS[produto]?.tipoContrato;
  switch (etapa) {
    case 0: return tipo ? { label: 'Gerar o contrato', acao: 'contrato', to: '' } : { label: 'Atualizar a negociação', to: '/Pipeline' };
    case 1: return { label: 'Concluir e gerar o PDF', acao: 'contrato', to: '' };
    case 2: return { label: 'Acompanhar a assinatura', acao: 'contrato', to: '' };
    case 3: return { label: contrato?.status === 'assinado' ? 'Registrar o pagamento' : 'Confirmar o pagamento e enviar para Vendas', acao: 'contrato', to: '' };
    case 4: return contrato && contrato.status !== 'no_pipeline' ? { label: 'Enviar para Vendas', acao: 'contrato', to: '' } : { label: 'Acompanhar a implantação', to: '/Implantacoes' };
    default: return { label: 'Ver a implantação concluída', to: '/Implantacoes' };
  }
}

// Para qual célula/produto um negócio do Pipeline deve ir quando for convertido.
// Retorna { celula, produto, tipoContrato } ou null (produto sem célula: segue o fluxo antigo).
export function celulaDoProdutoPipeline(produtoTexto) {
  const p = ` ${normal(produtoTexto).replace(/[^a-z0-9]+/g, ' ')} `;
  if (!p.trim()) return null;
  const tem = (s) => p.includes(` ${s} `);
  const regras = [
    ['estruturados', 'offshore', 'offshore'],
    ['estruturados', 'conta_internacional', 'conta internacional'],
    ['estruturados', 'holding', 'holding'],
    ['internacional', 'dolarize', 'dolarize'],
    ['internacional', 'canal_bancario', 'canal bancario'],
    ['internacional', 'conta_global', 'conta global'],
    ['internacional', 'rof', 'rof'],
    ['internacional', 'cambio', 'cambio'],
    ['cross', 'diagnostico', 'diagnostico'],
    ['cross', 'rating', 'rating'],
    ['cross', 'score', 'score'],
    ['cross', 'monitore', 'monitore'],
  ];
  for (const [celula, produto, chave] of regras) {
    if (tem(chave)) return { celula, produto, tipoContrato: JORNADAS[produto].tipoContrato };
  }
  return null;
}

// Negócio do Pipeline pertence ao produto?
export function pipelineDoProduto(neg, produto) {
  const chaves = JORNADAS[produto]?.pipeline || [];
  const fora = JORNADAS[produto]?.pipelineExcluir || [];
  const p = normal(neg.produto);
  return !!p && chaves.some(k => p.includes(normal(k))) && !fora.some(k => p.includes(normal(k)));
}

export function mesmoCliente(a, b) {
  const da = digitos(a.doc), db = digitos(b.doc);
  if (da && db) return da === db;
  const na = normal(a.nome), nb = normal(b.nome);
  return !!na && na === nb;
}
