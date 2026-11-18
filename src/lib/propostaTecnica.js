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
  'Os honorários são apresentados em faixas por etapa e serão fixados na formalização contratual, após validação da documentação.',
  'Taxas, emolumentos, tributos (ITBI, ITCMD, registros), custos cartorários, de juntas comerciais e de agentes no exterior não estão incluídos, salvo indicação expressa.',
  'Os prazos estimados dependem do envio tempestivo da documentação pelo cliente e dos prazos de órgãos públicos, cartórios e instituições financeiras.',
  'Esta proposta tem caráter técnico-comercial, é confidencial e destinada exclusivamente ao cliente identificado; não constitui parecer jurídico definitivo.',
  'As soluções observam a legislação vigente e as normas de prevenção à lavagem de dinheiro (KYC/PLD). Nenhuma estrutura será utilizada para frustrar direitos de credores.',
  'O tratamento de dados pessoais segue a Lei 13.709/2018 (LGPD).',
];

export const somaEtapas = (etapas) => {
  const l = Array.isArray(etapas) ? etapas : [];
  return {
    prazo: l.reduce((s, e) => s + (Number(e.prazo_dias) || 0), 0),
    min: l.reduce((s, e) => s + (Number(e.investimento_min) || 0), 0),
    max: l.reduce((s, e) => s + (Number(e.investimento_max) || 0), 0),
  };
};

export const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

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
              investimento_min: { type: 'number', description: 'Honorários mínimos em BRL' },
              investimento_max: { type: 'number', description: 'Honorários máximos em BRL' },
            },
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