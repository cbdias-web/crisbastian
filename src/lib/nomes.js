// Comparação de nomes de gerentes: ignora maiúsculas/minúsculas, acentos e
// espaços extras. "CLAUDIA MAGUETA" e "Claudia Magueta" são a mesma pessoa.
export const normNome = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const mesmoNome = (a, b) => {
  const na = normNome(a);
  return !!na && na === normNome(b);
};

// Nome como está no cadastro do Vendedor (fonte única da grafia).
export function nomeCanonico(nome, vendedores = []) {
  const alvo = normNome(nome);
  if (!alvo) return nome;
  const achado = (vendedores || []).find((v) => normNome(v.nome) === alvo);
  return achado ? achado.nome : nome;
}