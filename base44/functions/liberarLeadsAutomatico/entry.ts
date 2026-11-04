import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listAll, getConfigFila } from '../../shared/listAll.ts';
import { hojeBrasilia, isDiaUtil } from '../../shared/diaUtil.ts';
import { calcularBacklog, excluido } from '../../shared/backlog.ts';

// Liberação automática e fracionada de leads (lotes com liberacao='automatica').
// Regra: cada gerente recebe no máximo `novos_por_dia` leads novos por dia, e SÓ se o backlog dele
// (fila pendente + retornos vencidos) estiver abaixo de `backlog_max_por_gerente`.
// Os melhores leads (score) saem primeiro e são intercalados entre os gerentes (qualidade equilibrada).
// Chamada pelo workflow (a cada hora, dias úteis) ou manualmente por admin ("Liberar agora").
// Body opcional: { dry_run: true, lote_id }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) {
      if (i < tries - 1 && /429|Rate limit/i.test(e?.message || '')) await sleep(1000 * 2 ** i); else throw e;
    }
  }
  throw new Error('retry esgotado');
}
const MAX_POR_EXECUCAO = 300;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};
    // Chamada de usuário exige admin; chamada do agendador (sem usuário) é permitida
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && !user.permissao_admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const cfg = await getConfigFila(base44);
    const hoje = hojeBrasilia();
    if (cfg.liberacao_automatica_ativa === false) return Response.json({ success: true, motivo: 'liberacao_desativada' });
    if (!isDiaUtil(hoje) || (cfg.feriados || []).includes(hoje)) return Response.json({ success: true, motivo: 'fora_de_dia_util' });

    const QUOTA = Math.max(1, Number(cfg.novos_por_dia) || 15);
    const BACKLOG_MAX = Math.max(1, Number(cfg.backlog_max_por_gerente) || 60);

    const lotes = (await sr.LoteLead.filter({ liberacao: 'automatica' }, 'created_date', 100))
      .filter((l: any) => !l.pausado && l.status !== 'distribuido' && (!body.lote_id || l.id === body.lote_id));
    if (!lotes.length) return Response.json({ success: true, motivo: 'sem_lotes_automaticos', liberados: 0 });

    // Gerentes elegíveis (ativos, fora da exclusão, disponíveis)
    const vends = (await sr.Vendedor.filter({ ativo: true }, 'nome', 200)).filter((v: any) => !excluido(v));
    const sts = await sr.StatusGerente.list().catch(() => []);
    const stMap: Record<string, any> = {}; for (const s of sts) stMap[s.vendedor_id] = s;
    const agora = new Date();
    const elegiveis = vends.filter((v: any) => { const st = stMap[v.id]; if (!st || st.disponivel !== false) return true; return !!(st.bloqueado_ate && new Date(st.bloqueado_ate) < agora); });

    // Capacidade por gerente
    const cap: Array<{ v: any; backlog: number; jaHoje: number; pode: number }> = [];
    for (const v of elegiveis) {
      const backlog = await calcularBacklog(sr, v.id, hoje);
      const jaHoje = (await listAll(sr.Lead, { vendedor_id: v.id, liberar_em: hoje }, '-created_date')).length;
      const pode = Math.max(0, Math.min(QUOTA - jaHoje, BACKLOG_MAX - backlog));
      cap.push({ v, backlog, jaHoje, pode });
    }
    const totalPode = Math.min(MAX_POR_EXECUCAO, cap.reduce((s, c) => s + c.pode, 0));
    const resumo = cap.map((c) => ({ gerente: c.v.nome, backlog: c.backlog, liberados_hoje: c.jaHoje, pode_receber: c.pode }));
    if (totalPode <= 0) return Response.json({ success: true, liberados: 0, motivo: 'sem_capacidade', gerentes: resumo });

    // Lista de supressão (opt-out) — nunca libera
    const sup = await listAll(sr.ListaSupressao, {}, '-created_date');
    const supDoc = new Set(sup.map((s: any) => String(s.cpf_cnpj || '').replace(/\D/g, '')).filter(Boolean));
    const supTel = new Set(sup.map((s: any) => s.telefone_e164).filter(Boolean));

    let liberados = 0; const porGerente: Record<string, number> = {}; let pos = 0;
    for (const lote of lotes) {
      if (liberados >= totalPode) break;
      const faltam = totalPode - liberados;
      const limite = Math.min(500, faltam + 40); // folga para descartar inválidos/opt-out
      const pool = await sr.Lead.filter({ lote_id: lote.id, status: 'pendente' }, '-score', limite);
      if (pool.length === 0) { await sr.LoteLead.update(lote.id, { status: 'distribuido', distribuido_em: agora.toISOString() }).catch(() => {}); continue; }
      const validos = pool.filter((l: any) => l.consentimento_status !== 'opt_out' && l.consentimento_status !== 'nao_perturbe' && l.telefone_valido !== false
        && !supDoc.has(String(l.cpf_cnpj || '').replace(/\D/g, '')) && !supTel.has(l.telefone_e164));

      // Rodízio intercalado: cada gerente leva o próximo melhor lead enquanto tiver capacidade
      const plano: Array<{ lead: any; c: (typeof cap)[number] }> = [];
      const usados = new Map<any, number>();
      let i = 0, rodou = true;
      while (plano.length < faltam && i < validos.length && rodou) {
        rodou = false;
        for (const c of cap) {
          if (plano.length >= faltam || i >= validos.length) break;
          if ((usados.get(c) || 0) >= c.pode - (porGerente[c.v.id] || 0)) continue;
          plano.push({ lead: validos[i++], c }); usados.set(c, (usados.get(c) || 0) + 1); rodou = true;
        }
      }

      if (!body.dry_run) {
        for (const { lead, c } of plano) {
          const v = c.v;
          const clienteData: any = { nome: lead.nome, cpf_cnpj: lead.cpf_cnpj || '', telefone: lead.telefone || '', vendedor_id: v.id, vendedor_nome: v.nome, origem: 'lead', lead_id: lead.id, observacao: `Lead liberado automaticamente — lote: ${lote.nome}` };
          for (const k of ['id_externo', 'produto_contratado', 'valor_contrato', 'responsavel_origem', 'tipo_pessoa', 'endereco', 'cidade', 'email', 'cep', 'telefone_e164', 'telefone_valido', 'score', 'segmento', 'consentimento_status', 'cadencia_id']) {
            if (lead[k] !== undefined && lead[k] !== null && lead[k] !== '') clienteData[k] = lead[k];
          }
          if (lead.uf) clienteData.estado = lead.uf;
          const cliente = await withRetry(() => sr.Cliente.create(clienteData));
          await withRetry(() => sr.Lead.update(lead.id, { status: 'distribuido', vendedor_id: v.id, vendedor_nome: v.nome, cliente_id: cliente.id, liberar_em: hoje }));
          await withRetry(() => sr.AgendaContato.create({ lead_id: lead.id, lead_nome: lead.nome, lead_cpf_cnpj: lead.cpf_cnpj || '', lead_telefone: lead.telefone || '', cliente_id: cliente.id, vendedor_id: v.id, vendedor_nome: v.nome, data_agendada: hoje, posicao_dia: ++pos, lote_id: lote.id, status: 'pendente', resultado: '' }));
          if (plano.indexOf(plano.find((p) => p.lead === lead)!) % 10 === 9) await sleep(250);
        }
      }
      for (const { c } of plano) porGerente[c.v.id] = (porGerente[c.v.id] || 0) + 1;
      liberados += plano.length;

      // lote esgotado: veio menos que o limite pedido e todos os válidos foram liberados (restos são inválidos/opt-out)
      const esgotado = pool.length < limite && plano.length >= validos.length;
      if (!body.dry_run) {
        await sr.LoteLead.update(lote.id, { liberados: (lote.liberados || 0) + plano.length, ultima_liberacao_em: agora.toISOString(), status: esgotado ? 'distribuido' : 'em_liberacao', ...(esgotado ? { distribuido_em: agora.toISOString() } : {}) }).catch(() => {});
      }
    }

    return Response.json({ success: true, dry_run: !!body.dry_run, liberados, por_gerente: porGerente, gerentes: resumo, cota_diaria: QUOTA, backlog_max: BACKLOG_MAX });
  } catch (error: any) {
    console.error('liberarLeadsAutomatico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
