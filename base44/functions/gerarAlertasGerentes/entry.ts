import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listAll, getConfigFila } from '../../shared/listAll.ts';
import { agoraBrasilia, isDiaUtil } from '../../shared/diaUtil.ts';

// Gera alertas dos gerentes (AlertaGerente) e escalona inbound sem toque.
// Roda a cada 5 minutos (workflow). Idempotente: cada alerta tem uma "chave" única.
// Tipos: inbound_novo, sla_inbound, escalonado, retorno_agora, retorno_atrasado,
// reuniao_15min, no_show, lead_respondeu, cadencia_vencida, meta_diaria.

const hm = (s: string, pad = '09:00') => { const [h, m] = (s || pad).split(':').map(Number); return h * 60 + (m || 0); };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole.entities;
    const cfg = await getConfigFila(base44);
    const agora = new Date();
    const nowB = agoraBrasilia(agora);
    const hoje = nowB.data;
    const iniJ = hm(cfg.janela_inicio, '09:00'), fimJ = hm(cfg.janela_fim, '18:00');
    const diaOk = isDiaUtil(hoje) && !(cfg.feriados || []).includes(hoje) && (cfg.dias_uteis || [1, 2, 3, 4, 5]).includes(nowB.diaSemana);
    const dentroJanela = diaOk && nowB.minutos >= iniJ && nowB.minutos <= fimJ;
    const SLA_ALERTA = (cfg.sla_inbound_alerta_min || 5) * 60000;
    const SLA_ESCALONA = (cfg.sla_inbound_escalonar_min || 10) * 60000;

    const vendedores = (await sr.Vendedor.filter({ ativo: true }, 'nome', 200)).filter((v: any) => !/cris\s*bastian|crisbastian/i.test(`${v.nome} ${v.email}`));
    const vPorId = new Map(vendedores.map((v: any) => [v.id, v]));

    const desde = new Date(agora.getTime() - 48 * 3600000).toISOString();
    const recentes = await listAll(sr.AlertaGerente, { criado_em: { $gte: desde } }, '-criado_em');
    const chaves = new Set(recentes.map((a: any) => a.chave).filter(Boolean));
    let criados = 0, escalonados = 0;

    const alerta = async (vendedor_id: string, tipo: string, titulo: string, texto: string, fila_id: string | undefined, chave: string, prioridade = 'media') => {
      if (!vendedor_id || chaves.has(chave)) return;
      chaves.add(chave);
      await sr.AlertaGerente.create({ vendedor_id, tipo, titulo, texto, fila_id, chave, prioridade, lido: false, criado_em: agora.toISOString(), expira_em: new Date(agora.getTime() + 36 * 3600000).toISOString() }).catch(() => {});
      criados++;
      // E-mail só para o que é urgente e para quem optou por e-mail
      const v: any = vPorId.get(vendedor_id);
      if (v?.email && prioridade === 'alta' && v.canal_alerta !== 'push' && !v.alertas_silenciados) {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: v.email, subject: `🔔 ${titulo}`, body: `${texto}\n\nAbra a Fila de Contatos para atender.` }).catch(() => {});
      }
    };

    // ---- 1) Inbound: novo, SLA e escalonamento ----
    const inbound = await listAll(sr.FilaContato, { tipo_origem: 'indicacao', status: 'pendente' }, '-created_date');
    const disponiveis = async () => {
      const sts = await sr.StatusGerente.list();
      const stMap: any = {}; for (const s of sts) stMap[s.vendedor_id] = s;
      return vendedores.filter((v: any) => v.recebe_leads_indicacao !== false && (() => {
        const st = stMap[v.id]; if (!st) return true;
        if (!st.disponivel) return !!(st.bloqueado_ate && new Date(st.bloqueado_ate) < agora);
        return true;
      })());
    };
    let candidatos: any[] | null = null;
    for (const f of inbound) {
      if (f.primeiro_toque_em) continue;
      const base = f.entrada_inbound_em || f.created_date; if (!base) continue;
      let t0 = new Date(String(base).endsWith('Z') || String(base).includes('+') ? base : base + 'Z').getTime();
      // relógio do SLA só corre dentro da janela de contato
      const ini = new Date(`${hoje}T${String(Math.floor(iniJ / 60)).padStart(2, '0')}:${String(iniJ % 60).padStart(2, '0')}:00-03:00`).getTime();
      if (t0 < ini) t0 = ini;
      const espera = agora.getTime() - t0;
      if (espera < 0) continue;
      const jaEscalonado = (f.historico || []).some((h: any) => /Escalonado/.test(h.observacao || ''));
      if (espera < 3 * 60000 && dentroJanela && !jaEscalonado) await alerta(f.vendedor_id, 'inbound_novo', `Lead novo: ${f.nome}`, `Indicação nova — ligue em até ${cfg.sla_inbound_alerta_min || 5} min. ${f.telefone || ''}`, f.id, `inbound|${f.id}`, 'alta');
      if (!dentroJanela) continue;
      if (espera >= SLA_ALERTA) await alerta(f.vendedor_id, 'sla_inbound', `SLA: ${f.nome} sem primeiro toque`, `Lead inbound aguardando há ${Math.round(espera / 60000)} min. Faça o primeiro contato agora.`, f.id, `sla|${f.id}`, 'alta');
      if (espera >= SLA_ESCALONA && !(f.historico || []).some((h: any) => /Escalonado/.test(h.observacao || ''))) {
        candidatos = candidatos || await disponiveis();
        const outros = candidatos.filter((v: any) => v.id !== f.vendedor_id).sort((a: any, b: any) => String(a.ultimo_lead_distribuido_em || '').localeCompare(String(b.ultimo_lead_distribuido_em || '')));
        const novo = outros[0]; if (!novo) continue;
        const hist = [...(f.historico || []), { status: 'pendente', observacao: `⚡ Escalonado de ${f.vendedor_nome} para ${novo.nome} após ${Math.round(espera / 60000)} min sem primeiro toque`, data: agora.toISOString() }];
        await sr.FilaContato.update(f.id, { vendedor_id: novo.id, vendedor_nome: novo.nome, vendedor_email: novo.email || '', entrada_inbound_em: agora.toISOString(), historico: hist });
        if (f.ref_id) await sr.ConversaWhatsapp.update(f.ref_id, { vendedor_id: novo.id, vendedor_nome: novo.nome }).catch(() => {});
        await sr.Vendedor.update(novo.id, { ultimo_lead_distribuido_em: agora.toISOString() }).catch(() => {});
        await alerta(novo.id, 'escalonado', `Lead escalonado para você: ${f.nome}`, `Veio de ${f.vendedor_nome} (sem toque em ${Math.round(espera / 60000)} min). Atenda agora.`, f.id, `esc|${f.id}|${novo.id}`, 'alta');
        await alerta(f.vendedor_id, 'escalonado', `Lead ${f.nome} foi escalonado`, `Sem primeiro toque em ${Math.round(espera / 60000)} min — passou para ${novo.nome}.`, f.id, `esc-de|${f.id}`, 'media');
        escalonados++;
      }
    }

    // ---- 2) Retornos agendados (Em Contato) ----
    const retornos = await listAll(sr.FilaContato, { status: 'atendeu', proximo_contato: { $lte: hoje } }, 'proximo_contato');
    for (const f of retornos) {
      if (!f.proximo_contato || !f.proximo_contato_hora) continue;
      const alvo = new Date(`${f.proximo_contato}T${f.proximo_contato_hora}:00-03:00`).getTime();
      const diffMin = (agora.getTime() - alvo) / 60000;
      const tratado = f.ultima_tentativa_em && new Date(f.ultima_tentativa_em).getTime() > alvo - 30 * 60000;
      if (diffMin >= 0 && diffMin <= 10 && !tratado) await alerta(f.vendedor_id, 'retorno_agora', `Retorno agora: ${f.nome}`, `Retorno marcado para ${f.proximo_contato_hora}. ${f.telefone || ''}`, f.id, `ret|${f.id}|${f.proximo_contato}|${f.proximo_contato_hora}`, 'alta');
      else if (diffMin > 15 && diffMin < 24 * 60 && !tratado) await alerta(f.vendedor_id, 'retorno_atrasado', `Retorno atrasado: ${f.nome}`, `Era para ${String(f.proximo_contato).split('-').reverse().join('/')} ${f.proximo_contato_hora}. Registre o contato ou reagende.`, f.id, `ret-atr|${f.id}|${f.proximo_contato}`, 'media');
    }

    // ---- 3) Reuniões (15 min antes / no-show) ----
    const reunioes = await listAll(sr.FilaContato, { status: 'reuniao_marcada' }, '-updated_date');
    for (const f of reunioes) {
      if (!f.reuniao_em) continue;
      const diffMin = (new Date(f.reuniao_em).getTime() - agora.getTime()) / 60000;
      if (diffMin > 0 && diffMin <= 16) await alerta(f.vendedor_id, 'reuniao_15min', `Reunião em ${Math.ceil(diffMin)} min: ${f.nome}`, f.meet_link ? `Meet: ${f.meet_link}` : 'Prepare o briefing e abra o Meet.', f.id, `reu|${f.id}|${f.reuniao_em}`, 'alta');
      if (diffMin < -15 && diffMin > -24 * 60) await alerta(f.vendedor_id, 'no_show', `A reunião com ${f.nome} aconteceu?`, 'Marque "Compareceu" ou "No-show" para acionar a cadência correta.', f.id, `noshow|${f.id}|${f.reuniao_em}`, 'media');
    }

    // ---- 4) Toques de cadência no mesmo dia ----
    if (dentroJanela) {
      const venc = await listAll(sr.FilaContato, { status: 'pendente', proximo_toque_em: { $lte: agora.toISOString() } }, 'proximo_toque_em');
      for (const f of venc) await alerta(f.vendedor_id, 'cadencia_vencida', `Toque da cadência: ${f.nome}`, `Passo ${(f.cadencia_passo ?? 0) + 1} da cadência está no horário.`, f.id, `cad|${f.id}|${f.cadencia_passo ?? 0}`, 'media');
    }

    // ---- 5) Lead respondeu no WhatsApp ----
    const conv = await sr.ConversaWhatsapp.filter({ nao_lidas: { $gt: 0 } }, '-ultima_mensagem_em', 100).catch(() => []);
    for (const c of conv) {
      const ult = c.ultima_mensagem_em ? new Date(c.ultima_mensagem_em).getTime() : 0;
      if (agora.getTime() - ult < 15 * 60000) await alerta(c.vendedor_id, 'lead_respondeu', `${c.lead_nome} respondeu no WhatsApp`, c.ultima_mensagem || 'Nova mensagem', undefined, `resp|${c.id}|${c.ultima_mensagem_em}`, 'alta');
    }

    // ---- 6) Metas do dia: resumo às 09:00 e fechamento às 17:30 ----
    const janelaMin = (alvo: number) => nowB.minutos >= alvo && nowB.minutos < alvo + 10;
    if (diaOk && (janelaMin(iniJ) || janelaMin(17 * 60 + 30))) {
      const manha = janelaMin(iniJ);
      const regs = await listAll(sr.RegistroContato, { data_dia: hoje }, '-created_date');
      for (const v of vendedores) {
        const meta = v.meta_diaria_toques || cfg.toques_dia || 80;
        const feitos = regs.filter((r: any) => r.vendedor_id === v.id).length;
        if (manha) await alerta(v.id, 'meta_diaria', 'Bom dia! Plano do dia pronto', `Meta de hoje: ${meta} toques. Abra o Modo Foco e comece pelos retornos e leads novos.`, undefined, `meta-am|${v.id}|${hoje}`, 'baixa');
        else await alerta(v.id, 'meta_diaria', `Fechamento: ${feitos}/${meta} toques`, feitos >= meta ? 'Meta batida! 🎉' : `Faltam ${meta - feitos} toques — ainda dá tempo.`, undefined, `meta-pm|${v.id}|${hoje}`, 'baixa');
      }
    }

    return Response.json({ success: true, alertas_criados: criados, escalonados, dentro_janela: dentroJanela });
  } catch (error) {
    console.error('gerarAlertasGerentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
