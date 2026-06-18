import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Período comercial: 08:00 às 18:00 horário de Brasília (UTC-3)
function isHorarioComercial() {
  const now = new Date();
  const horaBrasilia = now.getUTCHours() - 3; // UTC-3
  const diaSemana = now.getUTCDay(); // 0=Dom, 6=Sáb
  if (diaSemana === 0 || diaSemana === 6) return false;
  return horaBrasilia >= 8 && horaBrasilia < 18;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Aceita chamadas agendadas da plataforma (sem auth) ou chamadas manuais de admin
  const authHeader = req.headers.get('authorization') || '';
  const hasAuth = authHeader.startsWith('Bearer ');
  if (hasAuth) {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  // Se não tem auth → é chamada agendada da plataforma, prosseguir normalmente

  const agora = new Date();
  const LIMITE_MIGRACAO_MIN = 30;
  const LIMITE_ALERTA_MIN = 5;

  // Buscar conversas ativas
  const conversas = await base44.asServiceRole.entities.ConversaWhatsapp.filter({ status: 'ativa' });
  // Buscar gerentes disponíveis
  const vendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true }, 'nome');
  const statusGerentes = await base44.asServiceRole.entities.StatusGerente.list();
  const statusMap = {};
  for (const s of statusGerentes) statusMap[s.vendedor_id] = s;

  const gerentesDisponiveis = vendedores.filter(v => {
    const st = statusMap[v.id];
    if (!st) return true; // sem registro = disponível
    if (!st.disponivel) {
      // Verificar se o bloqueio expirou
      if (st.bloqueado_ate && new Date(st.bloqueado_ate) < agora) return true;
      return false;
    }
    return true;
  });

  let migradas = 0;
  let alertadas = 0;

  for (const conv of conversas) {
    const ultimaMsgEm = conv.ultima_mensagem_em ? new Date(conv.ultima_mensagem_em) : null;
    const ultimaRespGerenteEm = conv.ultima_resposta_gerente_em ? new Date(conv.ultima_resposta_gerente_em) : null;
    if (!ultimaMsgEm) continue;

    const minutosSemResposta = (agora - ultimaMsgEm) / 60000;

    // Verificar se a última mensagem foi do lead (recebida), não do gerente
    const msgs = conv.mensagens || [];
    const ultimaMsg = msgs[msgs.length - 1];
    if (!ultimaMsg || ultimaMsg.tipo !== 'recebida') continue;

    // Alerta 5 minutos
    if (minutosSemResposta >= LIMITE_ALERTA_MIN && !conv.alerta_sem_resposta) {
      await base44.asServiceRole.entities.ConversaWhatsapp.update(conv.id, { alerta_sem_resposta: true });
      alertadas++;
    }

    // Migração 30 minutos
    if (minutosSemResposta >= LIMITE_MIGRACAO_MIN) {
      // Escolher próximo gerente disponível (excluindo o atual)
      const candidatos = gerentesDisponiveis.filter(v => v.id !== conv.vendedor_id);
      if (!candidatos.length) continue;

      // Round-robin simples pelo índice de migrações
      const migracoes = conv.migracoes || [];
      const novoIdx = migracoes.length % candidatos.length;
      const novoGerente = candidatos[novoIdx];

      // Mensagem de sistema notificando a migração
      const msgSistema = {
        de: 'Sistema',
        texto: `⚡ Lead migrado automaticamente de ${conv.vendedor_nome} para ${novoGerente.nome} após ${Math.round(minutosSemResposta)} min sem resposta. Verifique o histórico — este lead pode estar próximo do fechamento!`,
        timestamp: agora.toISOString(),
        tipo: 'sistema',
      };

      const novasMigracoes = [...migracoes, {
        de_nome: conv.vendedor_nome,
        para_nome: novoGerente.nome,
        motivo: 'timeout_30min',
        em: agora.toISOString(),
      }];

      await base44.asServiceRole.entities.ConversaWhatsapp.update(conv.id, {
        vendedor_id: novoGerente.id,
        vendedor_nome: novoGerente.nome,
        migracoes: novasMigracoes,
        mensagens: [...msgs, msgSistema],
        alerta_sem_resposta: false,
        nao_lidas: (conv.nao_lidas || 0) + 1,
      });

      // Registrar log de migração
      await base44.asServiceRole.entities.LogMigracaoLead.create({
        conversa_id: conv.id,
        lead_nome: conv.lead_nome,
        telefone: conv.telefone,
        vendedor_origem_id: conv.vendedor_id,
        vendedor_origem_nome: conv.vendedor_nome,
        vendedor_destino_id: novoGerente.id,
        vendedor_destino_nome: novoGerente.nome,
        motivo: 'timeout_30min',
        tempo_espera_min: Math.round(minutosSemResposta),
        migrado_em: agora.toISOString(),
      });

      migradas++;
    }
  }

  return Response.json({ success: true, conversas_verificadas: conversas.length, migradas, alertadas });
});