// Pagina uma entidade inteira sem teto silencioso. Para ao receber página vazia
// (não confia em "página menor que o limite", pois o servidor pode reduzir o limite).
export async function listAll(entity: any, query: any = {}, sort = '-created_date', pagina = 500, max = 100000): Promise<any[]> {
  const out: any[] = [];
  for (let skip = 0; skip < max; skip += pagina) {
    const lote = await entity.filter(query || {}, sort, pagina, skip);
    if (!lote?.length) break;
    out.push(...lote);
    skip += lote.length - pagina; // ajusta quando o servidor devolve menos que o pedido
  }
  return out;
}

export async function getConfigFila(base44: any): Promise<any> {
  try {
    const r = await base44.asServiceRole.entities.ConfigFila.filter({ chave: 'padrao' }, '-created_date', 1);
    return r[0] || {};
  } catch { return {}; }
}
