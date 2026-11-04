// Rótulo de origem exibido na Fila de Contatos.
// Distingue a base de clientes atual ("Carteira") dos leads vindos de uma
// listagem importada (CSV/lote) — nesses casos o pitch precisa citar o produto
// que o cliente já possui com o Grupo Villela.
export function rotuloOrigem(R: any): string {
  if (!R) return 'Carteira';
  // Cliente criado pela importação usa origem 'lead'; Lead importado usa
  // 'base_clientes' e sempre traz lote_id/lote_nome.
  const importado = R.origem === 'lead' || R.origem === 'base_clientes' || !!R.lote_id;
  if (!importado) return 'Carteira';
  const lote = (R.lote_nome || '').toString().trim();
  return lote ? `Base importada · ${lote}` : 'Base importada';
}