// Roleta justa de distribuição de leads na Central de Leads.
// Garante "um lead por gerente" obedecendo a sequência: seleciona o gerente
// disponível que há mais tempo não recebeu um lead (ultimo_lead_distribuido_em
// mais antigo, ou null = nunca recebeu). Empate resolvido por nome para uma
// sequência estável. Após selecionar, atualiza ultimo_lead_distribuido_em.
//
// `pool` já deve vir filtrado pelos critérios de elegibilidade (ativo,
// flag do canal — ativo_central_leads ou recebe_leads_indicacao) e por
// disponibilidade da agenda (StatusGerente).

export async function proximoDaRoleta(base44, pool) {
  if (!pool || pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => {
    const ta = a.ultimo_lead_distribuido_em ? new Date(a.ultimo_lead_distribuido_em).getTime() : 0;
    const tb = b.ultimo_lead_distribuido_em ? new Date(b.ultimo_lead_distribuido_em).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return (a.nome || '').localeCompare(b.nome || '');
  });
  const escolhido = sorted[0];
  try {
    await base44.asServiceRole.entities.Vendedor.update(escolhido.id, {
      ultimo_lead_distribuido_em: new Date().toISOString(),
    });
  } catch (e) {
    console.log('Falha ao atualizar roleta:', e?.message || e);
  }
  return escolhido;
}