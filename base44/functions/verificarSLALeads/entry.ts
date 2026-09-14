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

  // ─── Inércia na Fila de Contatos ("Em Contato" parado > 48h) ───
  // Leads estagnados na esteira Em Contato sem interação: marca o flag de alerta
  // (borda vermelha no card) e notifica gerente responsável + admins via Jarvis
  // (mensagem consolidada por gerente, apenas quando há alertas NOVOS).
  const LIMITE_STALE_HORAS = 48;
  const emContato = await base44.asServiceRole.entities.FilaContato.filter({ status: 'atendeu' }, '-updated_date', 500);
  const stalesPorGerente = {};
  let stalesNovos = 0;
  for (const f of emContato) {
    const baseTs = f.status_desde || f.updated_date;
    if (!baseTs) continue;
    let str = String(baseTs);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T00:00:00';
    else if (str.includes('T') && !/[zZ]$/.test(str) && !/[+-]\d{2}:\d{2}$/.test(str)) str += 'Z';
    const horas = (agora - new Date(str)) / 3600000;
    if (horas < LIMITE_STALE_HORAS) continue;
    const gid = f.vendedor_id || 'sem-gerente';
    if (!stalesPorGerente[gid]) stalesPorGerente[gid] = { vendedor_id: f.vendedor_id, vendedor_nome: f.vendedor_nome || '—', leads: [], novos: 0 };
    stalesPorGerente[gid].leads.push({ nome: f.nome, horas: Math.floor(horas) });
    if (!f.alerta_stale) {
      stalesNovos++;
      stalesPorGerente[gid].novos++;
      await base44.asServiceRole.entities.FilaContato.update(f.id, {
        alerta_stale: true,
        historico: [...(f.historico || []), { status: 'atendeu', observacao: `⚠️ Inércia: ${Math.floor(horas)}h parado em Em Contato sem interação — alerta disparado`, data: agora.toISOString() }],
      });
    }
  }
  const totalStale = Object.values(stalesPorGerente).reduce((s, g) => s + g.leads.length, 0);
  // Notifica cada gerente responsável (somente se houver alertas novos)
  for (const g of Object.values(stalesPorGerente)) {
    if (g.novos === 0) continue;
    try {
      if (!g.vendedor_id) continue;
      const vend = await base44.asServiceRole.entities.Vendedor.get(g.vendedor_id);
      if (!vend?.email) continue;
      const lista = g.leads.slice(0, 10).map(l => `• ${l.nome} — ${Math.floor(l.horas / 24)} dia(s) parado`).join('\n');
      await base44.asServiceRole.entities.JarvisMensagem.create({
        destinatario_email: vend.email,
        remetente_nome: 'Sistema',
        remetente_email: '',
        mensagem: `⚠️ *Leads parados em "Em Contato"*\n\nVocê tem ${g.leads.length} lead(s) há mais de ${LIMITE_STALE_HORAS}h sem interação na esteira Em Contato:\n\n${lista}\n\nRegistre uma tentativa, agende o retorno ou mova o lead (Qualificado / Nutrição / Desqualificado).`,
        lida: false,
      });
    } catch (e) {}
  }
  // Resumo consolidado para admins (somente quando há alertas novos)
  if (stalesNovos > 0) {
    try {
      const usuarios = await base44.asServiceRole.entities.User.list();
      const resumo = `⚠️ *Inércia na Fila de Contatos*\n\n${totalStale} lead(s) parado(s) há mais de ${LIMITE_STALE_HORAS}h na esteira "Em Contato":\n\n` + Object.values(stalesPorGerente).map(g => `• ${g.vendedor_nome}: ${g.leads.length} lead(s)`).join('\n');
      for (const u of usuarios) {
        if ((u.role === 'admin' || u.permissao_admin === true) && u.email) {
          await base44.asServiceRole.entities.JarvisMensagem.create({ destinatario_email: u.email, remetente_nome: 'Sistema', remetente_email: '', mensagem: resumo, lida: false });
        }
      }
    } catch (e) {}
  }

  return Response.json({ success: true, conversas_verificadas: conversas.length, migradas, alertadas, leads_stale: totalStale, stales_marcados: stalesNovos });
});