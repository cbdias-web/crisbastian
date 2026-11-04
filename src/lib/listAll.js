// Pagina uma entidade inteira (sem limite silencioso). Use apenas onde realmente
// for necessario varrer tudo (importacao/distribuicao). Em telas, prefira paginar.
export async function listAll(entity, query = {}, sort = '-created_date', pagina = 500, max = 60000) {
  const out = [];
  for (let skip = 0; skip < max; skip += pagina) {
    const lote = await entity.filter(query || {}, sort, pagina, skip);
    if (!lote?.length) break;
    out.push(...lote);
    if (lote.length < pagina) break;
  }
  return out;
}

export async function getConfigFila(base44) {
  try {
    const r = await base44.entities.ConfigFila.filter({ chave: 'padrao' }, '-created_date', 1);
    return r[0] || {};
  } catch { return {}; }
}
