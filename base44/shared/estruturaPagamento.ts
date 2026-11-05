// Cópia server-side de src/lib/estruturaPagamento.js — mantenha as duas iguais.
const EPS = 0.005;
const num = (v: any) => { const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v: number) => Math.round(v * 100) / 100;

export function calcularEstruturaPagamento(ct: any = {}, opts: { valorRecebido?: any } = {}) {
  const total = num(ct.valor_total);
  const entrada = num(ct.valor_adesao);
  const n = Math.max(0, Math.round(num(ct.num_parcelas)));
  let tipo: string; let recebido: number;
  const temOverride = opts.valorRecebido !== undefined && opts.valorRecebido !== null && opts.valorRecebido !== '';

  if (temOverride) {
    recebido = Math.max(0, num(opts.valorRecebido));
    if (n <= 0 || total - recebido <= EPS) tipo = 'a_vista';
    else if (recebido > EPS) tipo = 'entrada_parcelas';
    else tipo = 'somente_parcelas';
  } else if (n <= 0) {
    tipo = 'a_vista'; recebido = total > 0 ? total : entrada;
  } else if (entrada > EPS && total - entrada > EPS) {
    tipo = 'entrada_parcelas'; recebido = entrada;
  } else if (entrada > EPS) {
    tipo = 'a_vista'; recebido = total > 0 ? total : entrada;
  } else if (n === 1) {
    tipo = 'a_vista'; recebido = total;
  } else {
    tipo = 'somente_parcelas'; recebido = 0;
  }

  const saldo = tipo === 'a_vista' ? 0 : Math.max(0, r2(total - recebido));
  const parcelas = saldo > EPS ? Math.max(1, n) : 0;
  const calculada = parcelas > 0 ? r2(saldo / parcelas) : 0;
  const manual = num(ct.valor_parcela);
  const valorParcela = parcelas > 0 ? (!temOverride && manual > EPS ? r2(manual) : calculada) : 0;
  return { tipo, total: r2(total), recebido: r2(recebido), saldo, parcelas, valorParcela };
}
