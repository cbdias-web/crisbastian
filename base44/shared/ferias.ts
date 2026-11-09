// Controle de férias dos gerentes.
// Um gerente em férias fica fora da roleta de distribuição de leads enquanto o
// período estiver ativo. Sem datas preenchidas, a marcação vale por tempo indeterminado.

function isoDate(ref: Date): string {
  return ref.toISOString().slice(0, 10);
}

export function estaDeFerias(vendedor: any, ref: Date = new Date()): boolean {
  if (!vendedor || vendedor.em_ferias !== true) return false;
  const hoje = isoDate(ref);
  if (vendedor.ferias_inicio && hoje < vendedor.ferias_inicio) return false;
  if (vendedor.ferias_fim && hoje > vendedor.ferias_fim) return false;
  return true;
}

export function filtrarForaDeFerias(vendedores: any[], ref: Date = new Date()): any[] {
  return (vendedores || []).filter((v) => !estaDeFerias(v, ref));
}