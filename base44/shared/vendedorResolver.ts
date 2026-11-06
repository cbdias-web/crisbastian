// Resolve qual registro de Vendedor corresponde a um usuário/contrato.
// Ordem: id do Vendedor → e-mail do usuário (principal ou alternativo) → nome normalizado → e-mail do criador do registro.
// "Normalizado" = sem acento, sem diferença de maiúsculas/minúsculas e com espaços colapsados.
export const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function acharVendedor(vendedores: any[], q: { vendedor_id?: string; email?: string; user?: any; nome?: string }) {
  const preferir = (lista: any[]) => lista.find((v) => v.ativo !== false) || lista[0] || null;
  const porEmail = (e: any) => {
    const en = norm(e);
    if (!en) return null;
    const hit = vendedores.filter((v) => [v.email, ...(v.emails_alternativos || [])].map(norm).some((x) => x && x === en));
    return hit.length ? { vendedor: preferir(hit), via: 'email', ambiguo: hit.length > 1 } : null;
  };
  if (q.vendedor_id) {
    const v = vendedores.find((x) => x.id === q.vendedor_id);
    if (v) return { vendedor: v, via: 'id' };
  }
  const r1 = porEmail(q.user?.email);
  if (r1) return r1;
  const nomes = [q.nome, q.user?.nome_tratamento, q.user?.full_name].map(norm).filter((n) => n && !n.includes('@'));
  if (nomes.length) {
    const hit = vendedores.filter((v) => nomes.includes(norm(v.nome)));
    if (hit.length) return { vendedor: preferir(hit), via: 'nome', ambiguo: hit.length > 1 };
  }
  const r2 = porEmail(q.email);
  if (r2) return r2;
  return { vendedor: null, via: null };
}
