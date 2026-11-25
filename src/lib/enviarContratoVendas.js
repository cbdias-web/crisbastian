import { base44 } from '@/api/base44Client';
import { todayBrasilia } from '@/lib/dateUtils';
import { comprovantesDoContrato } from '@/lib/vendaProducao';
import { resolverVendedorDoContrato, MSG_VENDEDOR_NAO_VINCULADO } from '@/lib/vendedorContrato';

// Envio do contrato para Vendas — mesma regra da área Contratos (venda nova com cronograma de parcelas,
// ou recebimento de parcela como recorrência), usada pelas células do novo ambiente.
// `pedirOpcoes` vem de useEnvioVendasDialog (natureza, valor recebido, parcelas, cronograma).
export async function enviarContratoParaVendas({ contrato, isAdmin, pedirOpcoes }) {
  const ORDEM = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];
  const c = await base44.entities.Contrato.get(contrato.id).catch(() => contrato) || contrato;
  const comprovantes = comprovantesDoContrato(c);
  const pronto = ORDEM.indexOf(c.status) >= ORDEM.indexOf('pago') && comprovantes.length > 0;
  if (!isAdmin && !pronto) throw new Error('Registre o pagamento (comprovante) antes de enviar para Vendas.');
  if (!c.vendedor_nome || !c.vendedor_id) throw new Error('Defina o gerente responsável no contrato antes de enviar para Vendas.');
  const faltando = [];
  if (!c.contrato_assinado_url) faltando.push('o contrato assinado');
  if (comprovantes.length === 0) faltando.push('o comprovante de pagamento');
  if (faltando.length) throw new Error(`Anexe ${faltando.join(' e ')} antes de enviar para Vendas.`);

  let vendedor = null;
  try { vendedor = await resolverVendedorDoContrato(c); } catch { /* tratado abaixo */ }
  if (!vendedor) throw new Error(MSG_VENDEDOR_NAO_VINCULADO);

  const opcoes = await pedirOpcoes(c);
  if (!opcoes) return { cancelado: true };

  const notificar = (evento, destinatarios) => base44.functions.invoke('notificarStatusContrato', { contrato_id: c.id, evento, destinatarios }).catch(() => {});

  if (opcoes.natureza === 'recorrencia') {
    const r = await base44.functions.invoke('receberParcelaVenda', {
      parcela_id: opcoes.parcela.id, valor_recebido: opcoes.valorRecebido, contrato_id: c.id,
      comprovantes, contrato_assinado_url: c.contrato_assinado_url || '', contrato_assinado_nome: c.contrato_assinado_nome || '',
      boleto_url: c.boleto_url || '', boleto_nome: c.boleto_nome || '',
    });
    const d = r?.data || r;
    if (d?.error) throw new Error(d.error);
    await base44.entities.Contrato.update(c.id, { status: 'no_pipeline' });
    return { ok: true, recorrencia: true, jaRecebida: !!d?.ja_recebida, contrato: { ...c, status: 'no_pipeline' } };
  }

  const venda = {
    produto: c.tipo,
    assessor_comercial: vendedor.nome,
    vendedor_id: vendedor.id,
    time: c.time || vendedor.time || '',
    cliente: c.nome || '',
    cpf_cnpj: c.cpf_cnpj || '',
    valor: opcoes.valorRecebido,
    valor_total_contrato: c.valor_total || 0,
    num_parcelas: opcoes.parcelas,
    estrutura_pagamento: opcoes.estrutura.tipo,
    ...(opcoes.cronograma?.[0]?.vencimento ? { parcelamento: opcoes.cronograma[0].vencimento } : {}),
    data: todayBrasilia(),
    tipo_venda: 'nova',
    forma_pagamento: c.origem_pagamento || '',
    observacao: `Originado do Contrato ${c.tipo}. Contrato assinado e comprovante de pagamento anexados.`,
    comprovantes,
    contrato_id: c.id,
    contrato_assinado_url: c.contrato_assinado_url || '',
    contrato_assinado_nome: c.contrato_assinado_nome || '',
    boleto_url: c.boleto_url || '',
    boleto_nome: c.boleto_nome || '',
    origem_registro: 'contrato',
    autorizacao_status: 'autorizada',
    exige_documentos: true,
  };
  if (c.indicadores?.length > 0) {
    venda.indicadores = c.indicadores;
    venda.espelhamento = c.indicadores[0]?.nome || '';
    venda.espelhamento_id = c.indicadores[0]?.id || '';
    venda.percentual_comissao_espelhamento = c.indicadores[0]?.percentual || 0;
  }
  const gerada = await base44.entities.Venda.create(venda);
  let avisoParcelas = null;
  try {
    await base44.functions.invoke('criarParcelasContrato', { contrato_id: c.id, venda_id: gerada.id, valor_recebido: opcoes.overrideRecebido ? opcoes.valorRecebido : undefined, cronograma: opcoes.cronograma });
  } catch (e) { avisoParcelas = e.message; }
  await base44.entities.Contrato.update(c.id, { status: 'no_pipeline' });
  notificar('no_pipeline', 'todos');
  return { ok: true, venda: gerada, avisoParcelas, contrato: { ...c, status: 'no_pipeline' } };
}
