// Configuração das Células do portal (piloto: Produtos Estruturados).
// A célula não guarda dados próprios: ela lê os Estudos de Viabilidade,
// Propostas Técnicas, Contratos e formulários que já existem e organiza
// tudo numa jornada por produto.

export const CELULA_ESTRUTURADOS = {
  id: 'estruturados',
  nome: 'Produtos estruturados',
  produtos: ['offshore', 'conta_internacional', 'holding'],
};

export const JORNADAS = {
  offshore: {
    nome: 'Offshore',
    lead: 'Do NDA até o contrato e o cadastro da LLC — tudo sob o guarda-chuva Offshore.',
    tipoContrato: 'OFFSHORE',
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
    nome: 'Conta internacional',
    lead: 'NDA, estudo e KYC específico antes da proposta e do contrato.',
    tipoContrato: 'CONTA INTERNACIONAL',
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
    nome: 'Holding',
    lead: 'Do NDA à constituição da holding.',
    tipoContrato: null,
    etapas: [
      { titulo: 'NDA', sub: 'Confidencialidade do patrimônio' },
      { titulo: 'Estudo de viabilidade', sub: 'Patrimônio, sucessão e objetivos' },
      { titulo: 'Análise técnica', sub: 'Modelo de holding sugerido' },
      { titulo: 'Proposta', sub: 'Etapas, prazos e honorários' },
      { titulo: 'Contrato', sub: 'Contrato de estruturação' },
      { titulo: 'Constituição', sub: 'Documentos para registro' },
    ],
  },
};

const digitos = (v) => String(v || '').replace(/\D/g, '');
const normal = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Contrato do mesmo cliente (CPF/CNPJ ou nome) e do tipo do produto.
export function contratoDoEstudo(estudo, contratos) {
  const doc = digitos(estudo.cliente_documento);
  const nome = normal(estudo.cliente_nome);
  const vivos = contratos.filter(c => c.status !== 'cancelado');
  return (
    (doc && vivos.find(c => digitos(c.cpf_cnpj) === doc)) ||
    (nome && vivos.find(c => normal(c.nome) === nome)) ||
    null
  );
}

const CONTRATO_FECHADO = ['assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];

// Etapa atual da operação (índice em JORNADAS[produto].etapas).
export function etapaDaOperacao(estudo, contrato) {
  if (contrato && CONTRATO_FECHADO.includes(contrato.status)) return 5;
  if (contrato) return 4;
  const ps = estudo.proposta_status;
  if (ps === 'aceita') return 4;
  if (ps === 'aprovada' || ps === 'enviada_cliente') return 3;
  if (estudo.status === 'em_analise_tecnica' || estudo.status === 'concluido' || estudo.proposta_atual_id) return 2;
  if (estudo.nda_url) return 1;
  return 0;
}

// Próxima ação sugerida e destino no portal.
export function proximaAcao(estudo, etapa, contrato, produto) {
  const tipo = JORNADAS[produto]?.tipoContrato;
  switch (etapa) {
    case 0: return { label: 'Anexar o NDA ao estudo', to: `/EstudoViabilidade?estudo=${estudo.id}` };
    case 1: {
      if (estudo.status === 'rascunho') return { label: 'Enviar o link do estudo ao cliente', to: `/EstudoViabilidade?estudo=${estudo.id}` };
      if (estudo.status === 'recebido' || estudo.cliente_devolveu_em) return { label: 'Enviar para análise técnica', to: `/EstudoViabilidade?estudo=${estudo.id}` };
      return { label: 'Acompanhar o preenchimento do cliente', to: `/EstudoViabilidade?estudo=${estudo.id}` };
    }
    case 2: return { label: estudo.proposta_atual_id ? 'Revisar e aprovar a proposta' : 'Gerar a análise técnica', to: `/AnaliseTecnica?estudo=${estudo.id}` };
    case 3: return { label: 'Registrar a decisão do cliente', to: `/AnaliseTecnica?estudo=${estudo.id}` };
    case 4:
      if (contrato) return { label: 'Concluir e assinar o contrato', to: `/Contratos?tipo=${encodeURIComponent(contrato.tipo)}` };
      return tipo ? { label: 'Gerar o contrato', to: `/Contratos?novo=${encodeURIComponent(tipo)}` } : { label: 'Gerar o contrato', to: '/Contratos' };
    default:
      return tipo ? { label: 'Acompanhar o formulário pós-contrato', to: `/Contratos?tipo=${encodeURIComponent(tipo)}` } : { label: 'Acompanhar a constituição', to: '/Implantacoes' };
  }
}
