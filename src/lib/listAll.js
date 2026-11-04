// Pagina uma entidade inteira (sem limite silencioso). Para ao receber página vazia
// (não confia em "página menor que o limite": o servidor pode reduzir o limite pedido).
export async function listAll(entity, query = {}, sort = '-created_date', pagina = 500, max = 100000) {
  const out = [];
  for (let skip = 0; skip < max; skip += pagina) {
    const lote = await entity.filter(query || {}, sort, pagina, skip);
    if (!lote?.length) break;
    out.push(...lote);
    skip += lote.length - pagina; // ajusta quando o servidor devolve menos que o pedido
  }
  return out;
}

export async function getConfigFila(base44) {
  try {
    const r = await base44.entities.ConfigFila.filter({ chave: 'padrao' }, '-created_date', 1);
    return r[0] || {};
  } catch { return {}; }
}
