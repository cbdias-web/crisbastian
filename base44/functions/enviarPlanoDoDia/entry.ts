import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getConfigFila, listAll } from '../../shared/listAll.ts';
import { agoraBrasilia, isDiaUtil } from '../../shared/diaUtil.ts';

// E-mail "Plano do Dia" (08:00 Brasília, dias úteis) para cada gerente ativo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole.entities;
    const cfg = await getConfigFila(base44);
    const { data: hoje, diaSemana } = agoraBrasilia();
    if (cfg.email_plano_dia === false) return Response.json({ success: true, motivo: 'desativado' });
    if (!isDiaUtil(hoje) || (cfg.feriados || []).includes(hoje) || !(cfg.dias_uteis || [1, 2, 3, 4, 5]).includes(diaSemana)) {
      return Response.json({ success: true, motivo: 'fora_de_dia_util' });
    }
    const vendedores = (await sr.Vendedor.filter({ ativo: true }, 'nome', 200)).filter((v: any) => v.email && !/cris\s*bastian|crisbastian/i.test(`${v.nome} ${v.email}`));
    let enviados = 0;
    for (const v of vendedores) {
      if (v.alertas_silenciados || v.canal_alerta === 'push') continue;
      const fila = await listAll(sr.FilaContato, { vendedor_id: v.id, status: { $in: ['pendente', 'atendeu', 'reuniao_marcada'] } }, '-created_date');
      const inbound = fila.filter((f: any) => f.tipo_origem === 'indicacao' && f.status === 'pendente' && !f.primeiro_toque_em).length;
      const carteira = fila.filter((f: any) => f.tipo_origem === 'carteira' && f.status === 'pendente').length;
      const retornosHoje = fila.filter((f: any) => f.status === 'atendeu' && f.proximo_contato && f.proximo_contato <= hoje);
      const reunioes = fila.filter((f: any) => f.status === 'reuniao_marcada' && String(f.reuniao_em || '').startsWith(hoje));
      const meta = v.meta_diaria_toques || cfg.toques_dia || 80;
      const lista = retornosHoje.slice(0, 8).map((f: any) => `• ${f.proximo_contato_hora || '--:--'} — ${f.nome}`).join('\n') || '• (nenhum)';
      const corpo = `Bom dia, ${String(v.nome).split(' ')[0]}!\n\nSeu plano de hoje (${hoje.split('-').reverse().join('/')}):\n\n` +
        `🆕 Leads inbound sem primeiro toque: ${inbound}\n📅 Retornos para hoje/atrasados: ${retornosHoje.length}\n🤝 Reuniões hoje: ${reunioes.length}\n📋 Leads na agenda do dia (carteira): ${carteira}\n🎯 Meta de toques: ${meta}\n\nRetornos:\n${lista}\n\nComece pelos inbound (responda em até ${cfg.sla_inbound_alerta_min || 5} min), depois retornos e, por fim, a agenda do dia. Bom trabalho!`;
      await base44.asServiceRole.integrations.Core.SendEmail({ to: v.email, subject: `Plano do dia — ${inbound} inbound, ${retornosHoje.length} retornos, ${carteira} na agenda`, body: corpo }).catch(() => {});
      enviados++;
    }
    return Response.json({ success: true, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
