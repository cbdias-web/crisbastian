// Foto do colaborador: a imagem definida em "Meu Perfil" é a fonte única.
// O cadastro de Vendedor pode não ter a foto (ex.: usuário que subiu a foto
// depois), então as telas herdam a imagem do usuário correspondente.
export function mapaAvataresUsuarios(usuarios = []) {
  const mapa = {};
  for (const u of usuarios) {
    if (!u?.email || !u?.avatar_url) continue;
    mapa[u.email.toLowerCase()] = u.avatar_url;
  }
  return mapa;
}

export function avatarDoVendedor(vendedor, mapa = {}) {
  if (!vendedor) return '';
  if (vendedor.avatar_url) return vendedor.avatar_url;
  const emails = [vendedor.email, ...(vendedor.emails_alternativos || [])].filter(Boolean);
  for (const email of emails) {
    const url = mapa[email.toLowerCase()];
    if (url) return url;
  }
  return '';
}