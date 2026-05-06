import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Feriados nacionais brasileiros fixos (MM-DD) e móveis calculados por ano
function getFeriadosBrasil(ano) {
  // Cálculo da Páscoa (algoritmo de Meeus/Jones/Butcher)
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pascoa = new Date(ano, mes - 1, dia);

  const addDias = (date, dias) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  };

  const fmt = (d) => `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const moveis = [
    fmt(addDias(pascoa, -47)), // Carnaval segunda
    fmt(addDias(pascoa, -48)), // Carnaval terça
    fmt(addDias(pascoa, -2)),  // Sexta-feira Santa
    fmt(pascoa),               // Páscoa
    fmt(addDias(pascoa, 60)),  // Corpus Christi
  ];

  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Sra. Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra
    `${ano}-12-25`, // Natal
  ];

  return new Set([...fixos, ...moveis]);
}

function isDiaUtil(dateStr) {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const date = new Date(ano, mes - 1, dia);
  const diaSemana = date.getDay(); // 0=Dom, 6=Sáb
  if (diaSemana === 0 || diaSemana === 6) return false;
  const feriados = getFeriadosBrasil(ano);
  return !feriados.has(dateStr);
}

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
    let pulados = 0;

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
        // Pular finais de semana e feriados
        if (!isDiaUtil(inter.proximo_contato)) {
          pulados++;
          continue;
        }

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
            let clientes = await base44.asServiceRole.entities.Cliente.list();
            const cliente = clientes.find(c => c.id === inter.cliente_id) || {};

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
      message: `Sincronização concluída: ${novasAgendas} nova(s) agenda(s) criada(s), ${pulados} pulada(s) por fim de semana/feriado`,
      dataHoje: hojeStr,
      timezoneBrasilia: true
    });
  } catch (error) {
    console.error('Erro na sincronização de agenda:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});