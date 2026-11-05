import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// LIMPEZA ÚNICA (temporária): remove parcelas PENDENTES excedentes/zeradas identificadas na auditoria de 05/11/2026.
// Cada remoção só ocorre se o registro ainda bater com o esperado (status, valor, cliente) e fica registrada
// em AuditoriaVendas com a cópia integral do registro (permite restaurar). Idempotente.
const ALVOS = [
  { id: '6abbf3a6a4a0e3f153bdaa4a', cliente: 'Fillipin', valor: 2500, motivo: 'Venda nova já recebeu R$ 2.500 à vista; parcela 1/1 duplicava o mesmo valor' },
  { id: '6ab6cb714c751acb02da6b0b', cliente: 'ANA PAULA', valor: 1500, motivo: 'Parcela 2/1 duplicada (saldo da venda = R$ 1.500 já coberto pela parcela 1/1)' },
  { id: '6ab6b82c075ca6d839c51358', cliente: 'ROLIZOLA', valor: 4000, motivo: 'Parcela 2/1 duplicada (saldo da venda = R$ 4.000 já coberto pela parcela 1/1)' },
  { id: '6adf53e0912b6a1dabc7a179', cliente: 'RAPOSO', valor: 1500, motivo: 'Contrato já quitado (entrada + parcela recebida); parcela gerada a partir de venda de recorrência' },
  { id: '6adf495b91cc0954641e7bd3', cliente: 'GONCALVES KNOP', valor: 1250, motivo: 'Contrato já quitado (entrada + parcela recebida); parcela gerada a partir de venda de recorrência' },
  { id: '6adfac575b464e3561635459', cliente: 'TAVARES', valor: 0, motivo: 'Parcela pendente com valor R$ 0 (pagamento único já recebido)' },
  { id: '6ada56f3d85aa00d3ce0a95a', cliente: 'INSTAL AR', valor: 0, motivo: 'Parcela pendente com valor R$ 0 (pagamento único já recebido)' },
  { id: '6ab144a8cf6f204032877052', cliente: 'GLC', valor: 0, motivo: 'Parcela pendente com valor R$ 0 (pagamento único já recebido)' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
    const sr = base44.asServiceRole.entities;
    const resultado: any[] = [];
    for (const a of ALVOS) {
      const p = await sr.ParcelaVenda.get(a.id).catch(() => null);
      if (!p) { resultado.push({ id: a.id, status: 'ja_removida_ou_inexistente' }); continue; }
      const confere = p.status === 'pendente' && !p.venda_gerada_id && !p.pipeline_id
        && Math.abs(Number(p.valor_parcela || 0) - a.valor) < 0.005
        && String(p.cliente_nome || '').toUpperCase().includes(a.cliente.toUpperCase());
      if (!confere) { resultado.push({ id: a.id, status: 'nao_confere_mantida' }); continue; }
      await sr.AuditoriaVendas.create({ acao: 'parcela_excedente_removida', entidade: 'ParcelaVenda', registro_id: a.id, motivo: a.motivo, dados_originais: p, executado_em: new Date().toISOString() });
      await sr.ParcelaVenda.delete(a.id);
      resultado.push({ id: a.id, status: 'removida' });
    }
    return Response.json({ success: true, resultado });
  } catch (error: any) {
    return Response.json({ error: String(error?.message || error).slice(0, 300) }, { status: 500 });
  }
});
