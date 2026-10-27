// Regras de produção: uma venda só entra nos indicadores (Dashboard, Vendas,
// relatórios) quando está autorizada pela gerência e com a documentação
// obrigatória anexada (contrato assinado + comprovante de pagamento).
// Vendas antigas (sem a flag exige_documentos) seguem contando como antes.

export function vendaAutorizada(venda) {
  if (!venda) return false;
  return !['pendente', 'rejeitada'].includes(venda.autorizacao_status);
}

export function documentosDaVendaOk(venda) {
  if (!venda) return false;
  if (!venda.exige_documentos) return true;
  const comprovantes = Array.isArray(venda.comprovantes) ? venda.comprovantes.filter(c => c && c.url) : [];
  return !!venda.contrato_assinado_url && comprovantes.length > 0;
}

export function vendaContaProducao(venda) {
  if (!venda) return false;
  if (venda.considerar_acumulado === false) return false;
  return vendaAutorizada(venda) && documentosDaVendaOk(venda);
}

export function motivoForaProducao(venda) {
  if (!venda) return '';
  if (venda.autorizacao_status === 'pendente') return 'Aguardando autorização da gerência';
  if (venda.autorizacao_status === 'rejeitada') return 'Lançamento não autorizado';
  if (!documentosDaVendaOk(venda)) return 'Documentos pendentes (contrato assinado e comprovante)';
  return '';
}

export function comprovantesDoContrato(contrato) {
  if (!contrato) return [];
  const arr = Array.isArray(contrato.comprovantes) ? contrato.comprovantes.filter(c => c && c.url) : [];
  const lista = [];
  const vistos = new Set();
  if (contrato.comprovante_url && !arr.some(c => c.url === contrato.comprovante_url)) {
    lista.push({ url: contrato.comprovante_url, nome: contrato.comprovante_nome || 'Comprovante' });
    vistos.add(contrato.comprovante_url);
  }
  for (const c of arr) {
    if (c.url && !vistos.has(c.url)) { lista.push({ url: c.url, nome: c.nome || 'Comprovante' }); vistos.add(c.url); }
  }
  return lista;
}

export function contratoProntoParaVendas(contrato) {
  if (!contrato) return false;
  return !!contrato.contrato_assinado_url && comprovantesDoContrato(contrato).length > 0;
}

export function pendenciasDoContrato(contrato) {
  const faltando = [];
  if (!contrato?.contrato_assinado_url) faltando.push('contrato assinado');
  if (comprovantesDoContrato(contrato).length === 0) faltando.push('comprovante de pagamento');
  return faltando;
}

// Produtos da venda → tipo aceito no contrato
const TIPOS_CONTRATO = [
  'CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCÁRIO',
  'OFFSHORE', 'GARANTIAS', 'HORA TÉCNICA', 'RATING', 'DIAGNÓSTICO', 'SCORE',
];

export function tipoContratoDoProduto(produto) {
  const primeiro = String(produto || '').split(',')[0].trim().toUpperCase();
  return TIPOS_CONTRATO.find(t => t === primeiro) || 'CONTA GLOBAL';
}