// Código de liberação: cupom de uso único gerado pela gerência para autorizar
// UM lançamento manual de venda.
export function gerarCodigoLiberacao() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += chars[b % chars.length];
  return `VX-${s.slice(0, 4)}-${s.slice(4)}`;
}