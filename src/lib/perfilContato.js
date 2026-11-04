import { base44 } from '@/api/base44Client';

// O celular/operadora do gerente vive no cadastro de Vendedor — o MESMO registro
// lido em Usuários, Vendedores, Fila de Contatos e na discagem. Salvar sempre aqui
// garante que a informação do Perfil acompanhe o usuário em todas as etapas.
export async function carregarVendedorDoUsuario(user) {
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  const todos = await base44.entities.Vendedor.list();
  return todos.find(v => v.email?.toLowerCase() === email) || null;
}

export async function salvarContatoDoUsuario(user, { celular, operadora }) {
  const atual = await carregarVendedorDoUsuario(user);
  const dados = { celular_operadora: celular || '', operadora };
  if (atual) {
    // Número novo = precisa confirmar de novo o teste de ligação
    if ((atual.celular_operadora || '') !== (celular || '')) dados.celular_validado_em = null;
    await base44.entities.Vendedor.update(atual.id, dados);
    return atual.id;
  }
  if (!celular) return null;
  const novo = await base44.entities.Vendedor.create({
    nome: user?.full_name || user?.nome_tratamento || user?.email,
    email: user?.email,
    celular_operadora: celular,
    operadora,
    ativo: true,
    recebe_leads_indicacao: false,
    ativo_central_leads: false,
  });
  return novo.id;
}