import { base44 } from '@/api/base44Client';
import { normNome } from '@/lib/nomes';

// O celular/operadora do gerente vive no cadastro de Vendedor — o MESMO registro
// lido em Usuários, Vendedores, Fila de Contatos e na discagem. Salvar sempre aqui
// garante que a informação do Perfil acompanhe o usuário em todas as etapas.
// Todos os cadastros de Vendedor ligados ao usuário logado: e-mail principal,
// e-mails alternativos ou nome igual ao do perfil. Garante que dados salvos no
// Perfil (foto, celular, operadora) cheguem ao cadastro do gerente mesmo quando
// o e-mail do usuário difere do e-mail cadastrado no vendedor.
export async function carregarVendedoresDoUsuario(user) {
  if (!user) return [];
  const email = (user.email || '').toLowerCase();
  const nomes = [user.full_name, user.nome_tratamento].filter(Boolean).map(normNome);
  const todos = await base44.entities.Vendedor.list();
  return todos.filter(v => {
    const emails = [v.email, ...(v.emails_alternativos || [])].filter(Boolean).map(e => e.toLowerCase());
    if (email && emails.includes(email)) return true;
    const nome = normNome(v.nome);
    return !!nome && nomes.includes(nome);
  });
}

export async function carregarVendedorDoUsuario(user) {
  const vinculados = await carregarVendedoresDoUsuario(user);
  return vinculados[0] || null;
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