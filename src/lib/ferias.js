// Controle de férias dos gerentes (espelho do helper do backend).
export function estaDeFerias(vendedor, ref = new Date()) {
  if (!vendedor || vendedor.em_ferias !== true) return false;
  const hoje = ref.toISOString().slice(0, 10);
  if (vendedor.ferias_inicio && hoje < vendedor.ferias_inicio) return false;
  if (vendedor.ferias_fim && hoje > vendedor.ferias_fim) return false;
  return true;
}

export function formatarPeriodoFerias(vendedor) {
  const fmt = (d) => {
    if (!d) return '';
    const [a, m, dia] = d.split('-');
    return `${dia}/${m}/${a}`;
  };
  if (vendedor?.ferias_inicio && vendedor?.ferias_fim) {
    return `${fmt(vendedor.ferias_inicio)} a ${fmt(vendedor.ferias_fim)}`;
  }
  if (vendedor?.ferias_inicio) return `a partir de ${fmt(vendedor.ferias_inicio)}`;
  if (vendedor?.ferias_fim) return `até ${fmt(vendedor.ferias_fim)}`;
  return 'sem período definido';
}