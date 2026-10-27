import { base44 } from '@/api/base44Client';
import { comprovantesDoContrato } from '@/lib/vendaProducao';

// Contrato assinado, boleto e comprovantes anexados no contrato precisam
// chegar também ao registro de Vendas vinculado.
export async function sincronizarDocumentosVenda(contrato) {
  if (!contrato?.id) return 0;
  const vendas = await base44.entities.Venda.filter({ contrato_id: contrato.id });
  if (!vendas.length) return 0;

  const campos = {
    contrato_assinado_url: contrato.contrato_assinado_url || '',
    contrato_assinado_nome: contrato.contrato_assinado_nome || '',
    boleto_url: contrato.boleto_url || '',
    boleto_nome: contrato.boleto_nome || '',
    comprovantes: comprovantesDoContrato(contrato),
  };

  await Promise.all(vendas.map(v => base44.entities.Venda.update(v.id, campos)));
  return vendas.length;
}