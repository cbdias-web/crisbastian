// Configuração da Proposta Técnica usada pelo frontend.
// Cópia de base44/shared/propostaTecnica.ts (módulo exclusivo do backend, não
// servido ao navegador). Mantenha as duas versões iguais.

// Tabela de REFERÊNCIA de honorários (BRL) usada como balizador pelo motor de IA.
export const REFERENCIA_HONORARIOS = {
  holding: [
    { escopo: 'Holding patrimonial simples (até 3 imóveis, 1 família)', min: 18000, max: 35000 },
    { escopo: 'Holding familiar/sucessória com múltiplos bens e herdeiros', min: 35000, max: 90000 },
    { escopo: 'Holding de participações (controladora de empresas operacionais)', min: 30000, max: 80000 },
    { escopo: 'SPE — Sociedade de Propósito Específico', min: 20000, max: 60000 },
    { escopo: 'Manutenção societária/contábil anual da holding', min: 6000, max: 24000, recorrente: true },
  ],
  offshore: [
    { escopo: 'LLC nos EUA (Delaware/Wyoming/Flórida) com EIN e conta vinculada', min: 15000, max: 40000 },
    { escopo: 'Estrutura em BVI/Cayman/Panamá', min: 40000, max: 120000 },
    { escopo: 'Planejamento sucessório internacional (trust/fundação)', min: 60000, max: 180000 },
    { escopo: 'Manutenção anual (agente registrado, compliance, declarações)', min: 8000, max: 30000, recorrente: true },
  ],
  conta_internacional: [
    { escopo: 'Adesão à conta internacional PF (Dolarize)', min: 2500, max: 8000 },
    { escopo: 'Adesão à conta internacional PJ com canais bancários', min: 5000, max: 18000 },
    { escopo: 'Estruturação de escrow account e fluxo de custódia', min: 4000, max: 15000 },
    { escopo: 'Taxa de custódia / manutenção', min: 0, max: 0, recorrente: true, observacao: 'conforme tabela vigente' },
  ],
};

export const STATUS_PROPOSTA = {
  rascunho: { label: 'Rascunho', cor: '#94a3b8' },
  em_revisao: { label: 'Em revisão', cor: '#fbbf24' },
  aprovada: { label: 'Aprovada internamente', cor: '#60a5fa' },
  enviada_cliente: { label: 'Enviada ao cliente', cor: '#a78bfa' },
  aceita: { label: 'Aceita', cor: '#34d399' },
  recusada: { label: 'Recusada', cor: '#f87171' },
  substituida: { label: 'Substituída', cor: '#64748b' },
};

export const CLASSIFICACAO = {
  alta: { label: 'Viabilidade alta', cor: '#34d399' },
  media: { label: 'Viabilidade média', cor: '#fbbf24' },
  baixa: { label: 'Viabilidade baixa', cor: '#fb923c' },
  inviavel: { label: 'Inviável no cenário atual', cor: '#f87171' },
};

export const SIGLA_PRODUTO = { holding: 'HOL', offshore: 'OFF', conta_internacional: 'CI' };

export const CONDICOES_GERAIS_PADRAO = [
  'Os honorários são apresentados como valor único de projeto, negociável e parcelável conforme o cronograma acordado na formalização contratual.',
  'Taxas, emolumentos, tributos (ITBI, ITCMD, registros), custos cartorários, de juntas comerciais e de agentes no exterior não estão incluídos, salvo indicação expressa.',
  'Os prazos estimados dependem do envio tempestivo da documentação pelo cliente e dos prazos de órgãos públicos, cartórios e instituições financeiras.',
  'Esta proposta tem caráter técnico-comercial, é confidencial e destinada exclusivamente ao cliente identificado; não constitui parecer jurídico definitivo.',
  'As soluções observam a legislação vigente e as normas de prevenção à lavagem de dinheiro (KYC/PLD). Nenhuma estrutura será utilizada para frustrar direitos de credores.',
  'O tratamento de dados pessoais segue a Lei 13.709/2018 (LGPD).',
];

export const somaEtapas = (etapas) => {
  const l = Array.isArray(etapas) ? etapas : [];
  return { prazo: l.reduce((s, e) => s + (Number(e.prazo_dias) || 0), 0) };
};

export const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Valor único de honorários do projeto: o definido pelo consultor, a sugestão da IA ou,
// em versões antigas (que traziam valores por etapa), a soma das etapas como valor único.
export const valorHonorariosProjeto = (conteudo) => {
  const inv = conteudo?.investimento || {};
  const definido = Number(inv.valor) || Number(inv.valor_sugerido) || 0;
  if (definido) return definido;
  return (Array.isArray(conteudo?.etapas) ? conteudo.etapas : [])
    .reduce((s, e) => s + (Number(e.investimento_max) || Number(e.investimento_min) || 0), 0);
};

// Parcelamento da proposta: campos estruturados (entrada, num_parcelas) ou, na falta deles, lido do texto
// de condições ("30% de entrada e saldo em 4 vezes", "entrada de R$ 20.000 + 5x", "em 3 parcelas").
const _num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
export function extrairParcelamento(texto, total) {
  const t = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!t.trim()) return {};
  const out = {};
  const pct = t.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:de\s+)?(?:entrada|sinal|na\s+assinatura|no\s+ato|a\s+vista|na\s+contratacao)/)
    || t.match(/(?:entrada|sinal)\s+(?:de\s+)?(\d{1,3}(?:[.,]\d+)?)\s*%/);
  const reais = t.match(/(?:entrada|sinal)\s+(?:de\s+)?r\$\s*([\d.]+(?:,\d{1,2})?)/);
  if (pct && total) out.entrada = Math.round(Number(total) * _num(pct[1].replace('.', ',')) / 100 * 100) / 100;
  else if (reais) out.entrada = _num(reais[1]);
  const parc = t.match(/(?:saldo|restante|remanescente|demais)[^.;]*?(?:em|de)\s+(?:ate\s+)?(\d{1,2})\s*(?:x\b|vezes|parcelas|prestac)/)
    || t.match(/(\d{1,2})\s*(?:x\b|vezes|parcelas\s+(?:mensais|iguais|fixas)?)/);
  if (parc) out.num_parcelas = Number(parc[1]);
  else if (/(a\s+vista|pagamento\s+unico|parcela\s+unica)/.test(t) && !pct) out.num_parcelas = 0;
  return out;
}
// Valor, entrada, parcelas e forma de pagamento da proposta, prontos para o contrato
export function parcelamentoDaProposta(conteudo) {
  const inv = conteudo?.investimento || {};
  const total = valorHonorariosProjeto(conteudo);
  const lido = extrairParcelamento(inv.condicoes, total);
  const temEntrada = inv.entrada !== undefined && inv.entrada !== '' && inv.entrada !== null;
  const temParc = inv.num_parcelas !== undefined && inv.num_parcelas !== '' && inv.num_parcelas !== null;
  const entrada = temEntrada ? Number(inv.entrada) || 0
    : inv.entrada_percentual ? Math.round(total * Number(inv.entrada_percentual)) / 100 : lido.entrada;
  const num_parcelas = temParc ? Number(inv.num_parcelas) || 0 : lido.num_parcelas;
  const r = { valor_total: total };
  if (entrada !== undefined) r.valor_adesao = entrada;
  if (num_parcelas !== undefined) {
    r.num_parcelas = num_parcelas;
    r.valor_parcela = num_parcelas > 0 ? Math.round((Math.max(0, total - (entrada || 0)) / num_parcelas) * 100) / 100 : 0;
  }
  if (inv.forma_pagamento) r.forma_pagamento = inv.forma_pagamento;
  return r;
}

const brlTexto = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Parcelamento efetivo: valor único + entrada + parcelas definidos no investimento.
const parcelamentoAtual = (conteudo) => {
  const inv = conteudo?.investimento || {};
  const total = valorHonorariosProjeto(conteudo);
  const temEntrada = inv.entrada !== undefined && inv.entrada !== null && inv.entrada !== '';
  const entrada = temEntrada ? Number(inv.entrada) || 0
    : (Number(inv.entrada_percentual) ? Math.round(total * Number(inv.entrada_percentual)) / 100 : 0);
  const temParcelas = inv.num_parcelas !== undefined && inv.num_parcelas !== null && inv.num_parcelas !== '';
  const num_parcelas = temParcelas ? Number(inv.num_parcelas) || 0 : null;
  const saldo = Math.max(0, total - entrada);
  const parcela = num_parcelas ? Math.round((saldo / num_parcelas) * 100) / 100 : 0;
  return { total, entrada, num_parcelas, saldo, parcela, temEntrada, temParcelas };
};

// Texto da forma de pagamento montado a partir do valor e do parcelamento definidos no investimento.
// Vazio quando o consultor não definiu entrada nem parcelas (nesse caso vale o texto livre).
export const textoFormaPagamento = (conteudo) => {
  const { total, entrada, num_parcelas, saldo, parcela, temEntrada, temParcelas } = parcelamentoAtual(conteudo);
  if (!total || (!temEntrada && !temParcelas)) return '';
  const pct = entrada > 0 ? Math.round((entrada / total) * 100) : 0;
  const entradaTxt = `com entrada de ${brlTexto(entrada)}${pct ? ` (${pct}%)` : ''} na assinatura`;
  let frase;
  if (num_parcelas && num_parcelas > 0) {
    const parcelasTxt = `${num_parcelas} ${num_parcelas === 1 ? 'parcela mensal' : 'parcelas mensais'} de ${brlTexto(parcela)}`;
    frase = entrada > 0
      ? `Honorários de ${brlTexto(total)}, ${entradaTxt} e saldo de ${brlTexto(saldo)} em ${parcelasTxt}`
      : `Honorários de ${brlTexto(total)}, divididos em ${parcelasTxt}`;
  } else if (num_parcelas === 0) {
    frase = entrada > 0
      ? `Honorários de ${brlTexto(total)}, ${entradaTxt} e saldo de ${brlTexto(saldo)} na assinatura do contrato`
      : `Honorários de ${brlTexto(total)}, com pagamento à vista na assinatura do contrato`;
  } else {
    frase = entrada > 0
      ? `Honorários de ${brlTexto(total)}, ${entradaTxt} e saldo conforme cronograma acordado`
      : `Honorários de ${brlTexto(total)}, com saldo conforme cronograma acordado`;
  }
  const fp = String(conteudo?.investimento?.forma_pagamento || '').trim();
  return `${frase}.${fp ? ` Pagamento via ${fp}.` : ''}`;
};

// O texto livre de condições cita valor que não corresponde ao parcelamento atual (texto antigo da IA).
export const condicoesDesatualizadas = (conteudo) => {
  const texto = String(conteudo?.investimento?.condicoes || '');
  if (!texto.trim()) return false;
  const citados = (texto.match(/r\$\s*[\d.]+(?:,\d{1,2})?/gi) || [])
    .map((s) => Number(s.replace(/r\$\s*/i, '').replace(/\./g, '').replace(',', '.')) || 0)
    .filter(Boolean);
  if (!citados.length) return false;
  const { total, entrada, parcela } = parcelamentoAtual(conteudo);
  const permitidos = [total, entrada, parcela].filter((v) => v > 0);
  return citados.some((v) => !permitidos.some((p) => Math.abs(p - v) < 1));
};

// JSON schema da saída do motor de IA (conteúdo da proposta + avaliação)
export const SCHEMA_ANALISE = {
  type: 'object',
  properties: {
    score_viabilidade: { type: 'number', description: '0 a 100' },
    classificacao: { type: 'string', enum: ['alta', 'media', 'baixa', 'inviavel'] },
    justificativa_score: { type: 'string' },
    conteudo: {
      type: 'object',
      properties: {
        titulo_estrutura: { type: 'string', description: 'Nome curto da solução recomendada' },
        sumario_executivo: { type: 'string', description: '2 a 4 parágrafos objetivos para o decisor' },
        contexto: { type: 'string', description: 'Situação atual do cliente e motivação' },
        objetivos_cliente: { type: 'array', items: { type: 'string' } },
        diagnostico: {
          type: 'array',
          items: { type: 'object', properties: { tema: { type: 'string' }, achado: { type: 'string' }, impacto: { type: 'string', enum: ['alto', 'medio', 'baixo'] } } },
        },
        estrutura_recomendada: {
          type: 'object',
          properties: {
            nome: { type: 'string' }, jurisdicao: { type: 'string' }, descricao: { type: 'string' },
            componentes: { type: 'array', items: { type: 'string' } },
          },
        },
        alternativas: {
          type: 'array',
          items: { type: 'object', properties: { nome: { type: 'string' }, descricao: { type: 'string' }, motivo: { type: 'string', description: 'Por que não é a recomendação principal' } } },
        },
        beneficios: { type: 'array', items: { type: 'object', properties: { titulo: { type: 'string' }, descricao: { type: 'string' } } } },
        riscos: {
          type: 'array',
          items: { type: 'object', properties: { risco: { type: 'string' }, nivel: { type: 'string', enum: ['alto', 'medio', 'baixo'] }, mitigacao: { type: 'string' } } },
        },
        etapas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fase: { type: 'string', description: 'Ex.: Fase 1' },
              titulo: { type: 'string' },
              objetivo: { type: 'string' },
              atividades: { type: 'array', items: { type: 'string' } },
              entregaveis: { type: 'array', items: { type: 'string' } },
              prazo_dias: { type: 'number', description: 'Duração estimada em dias corridos' },
            },
          },
        },
        investimento: {
          type: 'object',
          properties: {
            valor_sugerido: { type: 'number', description: 'Honorários totais sugeridos em BRL — valor único do projeto (nunca por etapa)' },
            justificativa: { type: 'string', description: 'Como o valor foi composto: escopo, complexidade, horas e riscos' },
            condicoes: { type: 'string', description: 'Condições de pagamento sugeridas: parcelamento, marcos e margem de negociação' },
            entrada_percentual: { type: 'number', description: 'Percentual de entrada (0 a 100) coerente com as condições; 0 se não houver entrada' },
            num_parcelas: { type: 'number', description: 'Número de parcelas do saldo após a entrada; 0 se pagamento único à vista' },
          },
        },
        custos_recorrentes: {
          type: 'array',
          items: { type: 'object', properties: { item: { type: 'string' }, valor: { type: 'string' }, periodicidade: { type: 'string' } } },
        },
        success_fee: { type: 'object', properties: { aplicavel: { type: 'boolean' }, descricao: { type: 'string' } } },
        premissas: { type: 'array', items: { type: 'string' } },
        documentos_pendentes: { type: 'array', items: { type: 'string' } },
        proximos_passos: { type: 'array', items: { type: 'string' } },
        base_legal: { type: 'array', items: { type: 'string' } },
      },
    },
    notas_internas: {
      type: 'object',
      properties: {
        pontos_atencao_comercial: { type: 'array', items: { type: 'string' } },
        objecoes_provaveis: { type: 'array', items: { type: 'string' } },
        argumentos_venda: { type: 'array', items: { type: 'string' } },
        alertas_compliance: { type: 'array', items: { type: 'string' } },
        informacoes_faltantes: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  required: ['score_viabilidade', 'classificacao', 'conteudo'],
};