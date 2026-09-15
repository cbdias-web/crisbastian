// ── Regra de Abertura de Conta Corrente (Rate + Link) nas Implantações ──
// Produtos que, por padrão, NÃO exigem Rate de Custódia nem Link de Abertura CC.
// A seleção por lead (Implantacao.requer_abertura_cc), feita no popup de
// implantação, SEMPRE tem prioridade sobre o padrão por produto.
export const PRODUTOS_SEM_ABERTURA_CC = ['RATING', 'SCORE', 'HORA TÉCNICA', 'HORA TECNICA', 'CÂMBIO', 'CAMBIO'];

export function requerAberturaCC(implantacao) {
  if (implantacao?.requer_abertura_cc === true) return true;
  if (implantacao?.requer_abertura_cc === false) return false;
  const produto = (implantacao?.produto || '').toUpperCase();
  return !PRODUTOS_SEM_ABERTURA_CC.some((p) => produto.includes(p));
}