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


// ---------- Cronograma de parcelas (datas + valores) ----------
// Fonte única do parcelamento: o contrato define; o envio para Vendas leva o MESMO cronograma
// (ParcelaVenda) — sem redigitar em Vendas e sem duplicar.
const pad2 = (n: number) => String(n).padStart(2, '0');
const diasNoMes = (y: number, mIdx: number) => new Date(Date.UTC(y, mIdx + 1, 0)).getUTCDate();
function somaMeses(iso: string, meses: number, diaFixo: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + meses;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const alvo = diaFixo >= 1 && diaFixo <= 31 ? Math.round(diaFixo) : d;
  return `${ny}-${pad2(nm + 1)}-${pad2(Math.min(alvo, diasNoMes(ny, nm)))}`;
}
export function gerarCronograma(ct: any = {}, est?: any, hojeISO?: string) {
  const e = est || calcularEstruturaPagamento(ct);
  if (!e.parcelas || e.parcelas <= 0) return [];
  const iso = (v: any) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const explicita = iso(ct.data_primeira_parcela);
  const baseRef = iso(ct.data_primeiro_pagamento) || iso(ct.data_contrato) || hojeISO || new Date().toISOString().slice(0, 10);
  // 1ª parcela: data informada; senão, com entrada paga na contratação ela vence 1 mês depois; sem entrada, na própria data-base
  const primeira = explicita || (e.tipo === 'entrada_parcelas' ? somaMeses(baseRef, 1, Number(ct.dia_vencimento)) : somaMeses(baseRef, 0, Number(ct.dia_vencimento)));
  const dia = Number(ct.dia_vencimento) >= 1 ? Number(ct.dia_vencimento) : null;
  const out: any[] = [];
  let acumulado = 0;
  for (let i = 1; i <= e.parcelas; i++) {
    const venc = somaMeses(primeira, i - 1, dia);
    let valor = e.valorParcela;
    if (i === e.parcelas) valor = r2(e.saldo - acumulado); // última absorve arredondamento
    acumulado = r2(acumulado + valor);
    out.push({ numero: i, vencimento: venc, valor });
  }
  return out;
}
