import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem mesclar conversas' }, { status: 403 });

    const { conversa_origem_id, conversa_destino_id } = await req.json();
    if (!conversa_origem_id || !conversa_destino_id) {
      return Response.json({ error: 'conversa_origem_id e conversa_destino_id são obrigatórios' }, { status: 400 });
    }
    if (conversa_origem_id === conversa_destino_id) {
      return Response.json({ error: 'Origem e destino não podem ser a mesma conversa' }, { status: 400 });
    }

    // Buscar ambas as conversas via service role
    const origemList = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ id: conversa_origem_id });
    const destinoList = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ id: conversa_destino_id });
    if (!origemList.length) return Response.json({ error: 'Conversa de origem não encontrada' }, { status: 404 });
    if (!destinoList.length) return Response.json({ error: 'Conversa de destino não encontrada' }, { status: 404 });

    const origem = origemList[0];
    const destino = destinoList[0];

    const msgsOrigem = origem.mensagens || [];
    const msgsDestino = destino.mensagens || [];

    // Marca de sistema indicando a mesclagem
    const marcaSistema = {
      de: 'Sistema',
      texto: `📎 Conversa de "${origem.lead_nome}" mesclada em ${new Date().toLocaleString('pt-BR')}`,
      timestamp: new Date().toISOString(),
      tipo: 'sistema',
    };

    // Combinar mensagens preservando ordem cronológica
    const msgsCombinadas = [...msgsDestino, marcaSistema, ...msgsOrigem];

    // Preparar dados de atualização do destino
    const updateData = {
      mensagens: msgsCombinadas,
    };

    // Atualizar ultima_mensagem se a origem tinha mensagens mais recentes
    if (msgsOrigem.length > 0) {
      const ultimaOrigem = msgsOrigem[msgsOrigem.length - 1];
      const ultimaDestino = msgsDestino[msgsDestino.length - 1];
      const tsOrigem = ultimaOrigem.timestamp ? new Date(ultimaOrigem.timestamp).getTime() : 0;
      const tsDestino = ultimaDestino?.timestamp ? new Date(ultimaDestino.timestamp).getTime() : 0;
      if (tsOrigem > tsDestino) {
        updateData.ultima_mensagem = ultimaOrigem.texto;
        updateData.ultima_mensagem_em = ultimaOrigem.timestamp || new Date().toISOString();
      }
    }

    // Preservar observação IA e produto de interesse se destino não tem
    if (origem.observacao_ia && !destino.observacao_ia) updateData.observacao_ia = origem.observacao_ia;
    if (origem.produto_interesse && !destino.produto_interesse) updateData.produto_interesse = origem.produto_interesse;

    // Preservar histórico de migrações
    const migracoesCombinadas = [...(destino.migracoes || []), ...(origem.migracoes || [])];
    if (migracoesCombinadas.length > 0) updateData.migracoes = migracoesCombinadas;

    // Atualizar destino
    await base44.asServiceRole.entities.ConversaWhatsapp.update(destino.id, updateData);

    // Excluir origem
    await base44.asServiceRole.entities.ConversaWhatsapp.delete(origem.id);

    return Response.json({
      success: true,
      mensagens_combinadas: msgsCombinadas.length,
      conversa_destino_id: destino.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});