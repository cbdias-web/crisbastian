import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os vendedores ativos
    const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });

    // Buscar todas as interações
    const interacoes = await base44.asServiceRole.entities.InteracaoCliente.list('-data_interacao');

    // Data de hoje no horário de Brasília
    const agora = new Date();
    const dataHojeBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hojeStr = dataHojeBrasilia.toISOString().split('T')[0];

    // Buscar agendas existentes
    const agendas = await base44.asServiceRole.entities.AgendaContato.list();
    const agendaMap = new Set(agendas.map(a => `${a.lead_id}-${a.data_agendada}`));

    let novasAgendas = 0;

    // Mapear última interação por cliente para verificar resultado
    const ultimaInteracaoPorCliente = new Map();
    for (const inter of interacoes) {
      if (!ultimaInteracaoPorCliente.has(inter.cliente_id) || 
          new Date(inter.data_interacao) > new Date(ultimaInteracaoPorCliente.get(inter.cliente_id).data_interacao)) {
        ultimaInteracaoPorCliente.set(inter.cliente_id, inter);
      }
    }

    // Para cada interação com próximo_contato definido
    for (const inter of interacoes) {
      if (inter.proximo_contato && inter.proximo_contato >= hojeStr) {
        // Pular leads com resultado negativo na última interação
        const ultimaInteracao = ultimaInteracaoPorCliente.get(inter.cliente_id);
        if (ultimaInteracao && ultimaInteracao.resultado === 'Negativo') {
          continue;
        }

        const key = `${inter.cliente_id}-${inter.proximo_contato}`;

        // Se não existe agenda para este cliente nesta data, criar
        if (!agendaMap.has(key)) {
          try {
            // Buscar cliente para obter telefone e cpf_cnpj
            let cliente = await base44.asServiceRole.entities.Cliente.list();
            cliente = cliente.find(c => c.id === inter.cliente_id) || {};

            // Definir posição do dia automaticamente
            const mesmaData = agendas.filter(a => a.data_agendada === inter.proximo_contato && a.vendedor_id === inter.vendedor_id);
            const posicaoDia = mesmaData.length + 1;

            await base44.asServiceRole.entities.AgendaContato.create({
              lead_id: inter.cliente_id,
              lead_nome: inter.cliente_nome,
              lead_cpf_cnpj: cliente.cpf_cnpj || '',
              lead_telefone: cliente.telefone || '',
              cliente_id: inter.cliente_id,
              vendedor_id: inter.vendedor_id,
              vendedor_nome: inter.vendedor_nome,
              data_agendada: inter.proximo_contato,
              posicao_dia: posicaoDia,
              lote_id: '',
              status: 'pendente',
              resultado: ''
            });

            novasAgendas++;
          } catch (e) {
            console.error(`Erro ao criar agenda para ${inter.cliente_nome}:`, e.message);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Sincronização concluída: ${novasAgendas} nova(s) agenda(s) criada(s)`,
      dataHoje: hojeStr,
      timezoneBrasilia: true
    });
  } catch (error) {
    console.error('Erro na sincronização de agenda:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});