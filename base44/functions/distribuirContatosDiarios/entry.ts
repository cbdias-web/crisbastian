import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { listAll, getConfigFila } from '../../shared/listAll.ts';
import { hojeBrasilia, isDiaUtil } from '../../shared/diaUtil.ts';

// Reposição diária da Agenda (carteira). Antes: 5 clientes aleatórios por gerente e
// leitura de TODA a base de clientes (50.000). Agora: usa o ritmo do ConfigFila
// (novos_por_dia), prioriza por score (quentes primeiro), respeita opt-out e não
// repete quem já tem agenda pendente em qualquer data.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const hoje = hojeBrasilia();
    if (!isDiaUtil(hoje)) return Response.json({ success: true, data: hoje, total_criados: 0, motivo: 'nao_e_dia_util' });

    const cfg = await getConfigFila(base44);
    const META_DIA = Math.max(1, Number(cfg.novos_por_dia) || 5);

    const todosVendedores = await base44.asServiceRole.entities.Vendedor.filter({ ativo: true });
    const NOMES_EXCLUIDOS = ['cris bastian', 'cris.bastian', 'crisbastian'];
    const vendedores = todosVendedores.filter(v => {
      const nomeMin = (v.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const emailMin = (v.email || '').toLowerCase();
      return !NOMES_EXCLUIDOS.some(n => nomeMin.includes(n) || emailMin.includes(n));
    });

    let totalCriados = 0;
    for (const vendedor of vendedores) {
      const pendentes = await listAll(base44.asServiceRole.entities.AgendaContato, { vendedor_id: vendedor.id, status: 'pendente' }, 'data_agendada');
      const hojeQtd = pendentes.filter(a => a.data_agendada === hoje).length;
      const faltam = META_DIA - hojeQtd;
      if (faltam <= 0) continue;

      const comAgenda = new Set(pendentes.flatMap(a => [a.lead_id, a.cliente_id].filter(Boolean)));
      // Candidatos: carteira do gerente, melhores scores primeiro, sem agenda pendente e sem opt-out
      const clientes = await base44.asServiceRole.entities.Cliente.filter({ vendedor_id: vendedor.id }, '-score', 400);
      const candidatos = clientes.filter(c =>
        !comAgenda.has(c.id) && !(c.lead_id && comAgenda.has(c.lead_id)) &&
        c.consentimento_status !== 'opt_out' && c.consentimento_status !== 'nao_perturbe' &&
        c.telefone_valido !== false && (c.telefone || '').trim()
      );
      if (!candidatos.length) continue;

      let posicao = hojeQtd + 1;
      for (const cliente of candidatos.slice(0, faltam)) {
        await base44.asServiceRole.entities.AgendaContato.create({
          lead_id: cliente.id,
          lead_nome: cliente.nome,
          lead_cpf_cnpj: cliente.cpf_cnpj || '',
          lead_telefone: cliente.telefone || '',
          cliente_id: cliente.id,
          vendedor_id: vendedor.id,
          vendedor_nome: vendedor.nome,
          data_agendada: hoje,
          posicao_dia: posicao++,
          lote_id: '',
          status: 'pendente',
          resultado: '',
        });
        totalCriados++;
      }
    }

    return Response.json({ success: true, data: hoje, total_criados: totalCriados, vendedores_processados: vendedores.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
