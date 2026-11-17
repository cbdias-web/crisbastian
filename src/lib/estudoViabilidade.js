// Configuração do Estudo de Viabilidade usada pelo frontend.
// Cópia de base44/shared/estudoViabilidade.ts (módulo exclusivo do backend, não
// servido ao navegador). Mantenha as duas versões iguais.

export const PRODUTOS_ESTUDO = {
  holding: {
    id: 'holding',
    nome: 'Holding',
    titulo: 'Estudo de Viabilidade — Holding',
    subtitulo: 'Holding patrimonial, familiar/sucessória, de participações ou SPE',
    descricao: 'Organização e proteção do patrimônio, planejamento sucessório e eficiência tributária sobre bens e participações.',
  },
  offshore: {
    id: 'offshore',
    nome: 'Offshore',
    titulo: 'Estudo de Viabilidade — Offshore',
    subtitulo: 'Estruturas internacionais (EUA, BVI, Panamá, Uruguai e outras jurisdições)',
    descricao: 'Estrutura no exterior para proteção patrimonial, investimentos, operações internacionais e sucessão.',
  },
  conta_internacional: {
    id: 'conta_internacional',
    nome: 'Conta Internacional',
    titulo: 'Estudo de Viabilidade — Conta Internacional',
    subtitulo: 'Conta global multimoedas, canais bancários internacionais e escrow',
    descricao: 'Dolarização do caixa, recebimentos e pagamentos no exterior e mitigação de bloqueios e penhoras.',
  },
};

export const OBJETIVOS_POR_PRODUTO = {
  holding: [
    'Proteção patrimonial',
    'Planejamento sucessório (evitar inventário)',
    'Redução da carga tributária sobre aluguéis e ganhos',
    'Organização da gestão do patrimônio familiar',
    'Separar o patrimônio dos riscos da atividade operacional',
    'Centralizar participações societárias',
    'Projeto ou empreendimento específico (SPE)',
    'Evitar condomínio de bens entre herdeiros',
  ],
  offshore: [
    'Proteção patrimonial internacional',
    'Investir no exterior',
    'Operações comerciais internacionais (importação, exportação, serviços)',
    'Planejamento sucessório internacional',
    'Diversificação de jurisdição e moeda',
    'Mobilidade ou residência no exterior',
    'Receber investidores estrangeiros',
  ],
  conta_internacional: [
    'Dolarização / proteção cambial do caixa',
    'Receber de clientes no exterior',
    'Pagar fornecedores no exterior',
    'Investir no exterior',
    'Mitigar bloqueios e penhoras (escrow account)',
    'Despesas pessoais, viagens ou estudos no exterior',
    'Reserva de liquidez em moeda forte',
  ],
};

export const TIPOS_HOLDING = [
  'Holding patrimonial (imóveis e bens)',
  'Holding familiar / sucessória',
  'Holding de participações (controladora de empresas)',
  'SPE — Sociedade de Propósito Específico',
  'Não sei — quero orientação',
];

export const JURISDICOES = [
  'EUA — Delaware',
  'EUA — Wyoming',
  'EUA — Flórida',
  'Ilhas Virgens Britânicas (BVI)',
  'Ilhas Cayman',
  'Panamá',
  'Uruguai',
  'Portugal / União Europeia',
  'Não sei — quero orientação',
];

export const MOEDAS = ['USD — Dólar', 'EUR — Euro', 'GBP — Libra', 'Outra'];

// Checklist de documentos conforme produto e natureza do cliente.
// obrigatorio: bloqueia o envio; recomendado: ajuda na análise técnica.
export function checklistDocumentos(produto, tipo) {
  const L = [];
  const add = (tipoDoc, descricao, obrigatorio = false, recomendado = false, multiplo = false) =>
    L.push({ tipo: tipoDoc, descricao, obrigatorio, recomendado, multiplo });

  if (tipo === 'PJ') {
    add('contrato_social', 'Contrato social / Estatuto e última alteração consolidada', true);
    add('cartao_cnpj', 'Cartão CNPJ atualizado', false, true);
    add('doc_socios', 'Documento de identificação dos sócios e administradores (RG/CNH)', true, false, true);
    add('comprovante_endereco_empresa', 'Comprovante de endereço da empresa (até 90 dias)', true);
    add('irpj', 'IRPJ / ECF do último exercício', false, true);
    add('dre', 'DRE — Demonstração do Resultado do Exercício', false, true);
    add('balanco', 'Balanço Patrimonial', false, true);
    if (produto === 'holding') {
      add('irpf_socios', 'IRPF dos sócios (último exercício + recibo)', false, true, true);
      add('escrituras', 'Escrituras / matrículas atualizadas dos imóveis', false, false, true);
      add('veiculos', 'Documentos dos veículos (CRLV)', false, false, true);
      add('endividamento', 'Relação de endividamento / parcelamentos / certidões fiscais', false, false, true);
    } else {
      add('faturamento', 'Faturamento dos últimos 12 meses', false, true);
      add('passaporte_socios', 'Passaporte dos sócios / beneficiários finais', false, true, true);
      add('origem_recursos', 'Comprovantes de origem dos recursos (extratos, contratos)', false, false, true);
    }
  } else {
    add('doc_identificacao', 'Documento de identificação com foto (RG ou CNH)', true);
    add('comprovante_endereco', 'Comprovante de endereço (até 90 dias)', true);
    add('irpf', 'IRPF do último exercício + recibo de entrega', true);
    if (produto === 'holding') {
      add('estado_civil', 'Certidão de casamento / nascimento e pacto antenupcial (se houver)', false, true);
      add('escrituras', 'Escrituras / matrículas atualizadas dos imóveis', false, true, true);
      add('veiculos', 'Documentos dos veículos (CRLV)', false, false, true);
      add('participacoes', 'Contratos sociais das empresas em que participa', false, false, true);
    } else {
      add('passaporte', 'Passaporte vigente', false, true);
      add('origem_recursos', 'Comprovantes de origem dos recursos (extratos, contratos)', false, false, true);
    }
  }
  add('outros', 'Outros documentos que julgar relevantes', false, false, true);
  return L;
}

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);

// Lista de pendências que impedem o envio do formulário.
export function calcularPendenciasEstudo(estudo) {
  const p = [];
  const r = (estudo && estudo.respostas) || {};
  const tipo = estudo && estudo.tipo_cliente;
  const produto = estudo && estudo.produto;

  if (tipo === 'PJ') {
    if (vazio(r.razao_social)) p.push('Identificação: Razão social');
    if (vazio(r.cnpj)) p.push('Identificação: CNPJ');
    if (vazio(r.resp_nome)) p.push('Identificação: Nome do responsável legal');
  } else {
    if (vazio(r.nome)) p.push('Identificação: Nome completo');
    if (vazio(r.cpf)) p.push('Identificação: CPF');
  }
  if (vazio(r.email)) p.push('Identificação: E-mail');
  if (vazio(r.telefone)) p.push('Identificação: Telefone / WhatsApp');

  if (vazio(r.objetivos)) p.push('Propósito: Selecione ao menos um objetivo');
  if (vazio(r.proposito_descricao)) p.push('Propósito: Descreva o propósito');
  if (vazio(r.expectativa)) p.push('Propósito: Descreva sua expectativa');

  if (produto === 'holding' && vazio(r.holding_tipos)) p.push('Holding: Tipo de holding de interesse');
  if (produto === 'offshore' && vazio(r.jurisdicoes)) p.push('Offshore: Jurisdição de interesse');
  if (produto === 'conta_internacional' && vazio(r.moedas)) p.push('Conta Internacional: Moedas de interesse');

  const docs = (estudo && estudo.documentos) || [];
  for (const d of checklistDocumentos(produto, tipo)) {
    if (d.obrigatorio && !docs.some((x) => x.tipo === d.tipo && x.url)) p.push('Documento: ' + d.descricao);
  }

  if (vazio(estudo && estudo.preenchido_por_nome)) p.push('Declaração: Nome de quem preencheu');
  if (!(estudo && estudo.aceite_lgpd)) p.push('Declaração: Aceite do tratamento de dados (LGPD)');
  return p;
}

export const STATUS_ESTUDO = {
  rascunho: { label: 'Rascunho', cor: '#94a3b8' },
  enviado_cliente: { label: 'Enviado ao cliente', cor: '#60a5fa' },
  em_preenchimento: { label: 'Em preenchimento', cor: '#fbbf24' },
  recebido: { label: 'Recebido', cor: '#34d399' },
  em_analise_tecnica: { label: 'Em análise técnica', cor: '#a78bfa' },
  concluido: { label: 'Concluído', cor: '#00D4AA' },
  cancelado: { label: 'Cancelado', cor: '#f87171' },
};

// Status em que o cliente não pode mais editar o formulário
export const STATUS_BLOQUEADOS_CLIENTE = ['recebido', 'em_analise_tecnica', 'concluido', 'cancelado'];