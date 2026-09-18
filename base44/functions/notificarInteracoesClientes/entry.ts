import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hoje = new Date().toISOString().split('T')[0];

    // Busca todos os usuários ativos
    const usuarios = await base44.asServiceRole.entities.User.list();
    const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });

    // Contagem de interações de hoje por vendedor
    const interacoesHoje = await base44.asServiceRole.entities.InteracaoCliente.list('-data_interacao');
    const interacoesDeHoje = interacoesHoje.filter(i => i.data_interacao === hoje);

    let enviados = 0;
    let erros = 0;

    for (const usuario of usuarios) {
      if (!usuario.email) continue;

      // Encontra o vendedor vinculado ao usuário
      const vendedor = vendedores.find(v => v.email?.toLowerCase() === usuario.email?.toLowerCase());
      const nomeVendedor = vendedor?.nome || usuario.full_name || usuario.email;

      // Conta interações de hoje deste vendedor
      const contagemHoje = vendedor
        ? interacoesDeHoje.filter(i => i.vendedor_id === vendedor.id).length
        : 0;

      if (contagemHoje >= 3) continue; // Já atingiu a meta, não precisa notificar

      const restantes = 3 - contagemHoje;

      try {
        await base44.asServiceRole.entities.JarvisMensagem.create({
          destinatario_email: usuario.email,
          remetente_nome: 'Jarvis',
          remetente_email: '',
          mensagem: `📋 *Lembrete Diário — Interações com Clientes*\n\nOlá, ${nomeVendedor}! Você registrou ${contagemHoje} interação(ões) hoje. Faltam ${restantes} para a meta diária de 3.\n\nAcesse *Meus Clientes* e registre suas interações de hoje.`,
          lida: false,
        });
        enviados++;
      } catch (e) {
        erros++;
      }
    }

    return Response.json({ success: true, enviados, erros, data: hoje });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});