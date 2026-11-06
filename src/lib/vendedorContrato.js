import { base44 } from '@/api/base44Client';

// Descobre o cadastro de Vendedor correto (id + nome canônico) para um contrato.
// O contrato guarda o id do USUÁRIO que o criou e o nome de exibição dele (ex.: "Jonathan Dutra"), que não
// coincidem com o cadastro de Vendedor ("JONATHAN DUTRA"). O servidor resolve por: id de Vendedor → e-mail do
// usuário (principal ou alternativo) → nome normalizado (sem diferença de maiúsculas, acentos e espaços).
export async function resolverVendedorDoContrato(ct) {
  const r = await base44.functions.invoke('resolverVendedorUsuario', {
    vendedor_id: ct?.vendedor_id || undefined,
    nome: ct?.vendedor_nome || undefined,
    email: ct?.created_by || undefined,
  });
  const d = r?.data || r;
  if (d?.error) throw new Error(d.error);
  return d?.encontrado ? d.vendedor : null;
}

// Vendedor do usuário logado (para novos contratos).
export async function resolverVendedorDoUsuarioLogado() {
  const r = await base44.functions.invoke('resolverVendedorUsuario', {});
  const d = r?.data || r;
  if (d?.error) return null;
  return d?.encontrado ? d.vendedor : null;
}

export const MSG_VENDEDOR_NAO_VINCULADO = 'Não consegui vincular o vendedor deste contrato a um cadastro de Vendedor. Peça ao administrador para conferir o e-mail do usuário em Vendedores (campo "E-mails alternativos") e tente novamente.';
