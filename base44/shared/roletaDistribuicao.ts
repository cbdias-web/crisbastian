// Roleta justa de distribuição de leads na Central de Leads.
// Garante "um lead por gerente" obedecendo a sequência: seleciona o gerente
// disponível que há mais tempo não recebeu um lead (ultimo_lead_distribuido_em
// mais antigo, ou null = nunca recebeu). Empate resolvido por nome para uma
// sequência estável. Após selecionar, atualiza ultimo_lead_distribuido_em.
//
// A roleta é CONSTANTE: o pool deve conter TODOS os gerentes ativos da esteira
// (ativo + flag do canal). A disponibilidade da agenda (StatusGerente) é passada
// como predicado `isDisponivel` — a roleta percorre a fila ordenada e escolhe o
// primeiro gerente disponível, preservando a ordem justa. Assim um gerente
// temporariamente bloqueado não é removido da rotação: ele continua no topo da
// fila (timestamp não atualizado) e recebe o próximo lead assim que fica livre.
// Se ninguém estiver disponível, cai para o mais antigo (fallback).

export async function proximoDaRoleta(base44, pool, isDisponivel = null) {
  if (!pool || pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => {
    const ta = a.ultimo_lead_distribuido_em ? new Date(a.ultimo_lead_distribuido_em).getTime() : 0;
    const tb = b.ultimo_lead_distribuido_em ? new Date(b.ultimo_lead_distribuido_em).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return (a.nome || '').localeCompare(b.nome || '');
  });
  // Prefere o gerente DISPONÍVEL mais antigo na rotação (mantém a roleta constante)
  let escolhido = null;
  if (isDisponivel) {
    escolhido = sorted.find((v) => isDisponivel(v)) || null;
  }
  // Fallback: ninguém disponível → o mais antigo da fila (mesmo bloqueado)
  if (!escolhido) escolhido = sorted[0];
  try {
    await base44.asServiceRole.entities.Vendedor.update(escolhido.id, {
      ultimo_lead_distribuido_em: new Date().toISOString(),
    });
  } catch (e) {
    console.log('Falha ao atualizar roleta:', e?.message || e);
  }
  return escolhido;
}