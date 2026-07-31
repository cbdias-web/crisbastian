// Sanitizacao de dados gerados por LLM para gravar em entidades.
// LLMs costumam retornar numeros em formato pt-BR ("R$ 5.000,00", "12", "3,5%")
// e datas como DD/MM/YYYY. As entidades exigem numbers reais e datas YYYY-MM-DD.

export function parseNumber(val) {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return val;
  let s = String(val).trim().replace(/R\$|\$|USD|EUR|BRL|%/gi, '').trim();
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (s.includes(',')) s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

export function parseDate(val) {
  if (!val || typeof val !== 'string') return val;
  const s = val.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const brTime = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s/);
  if (brTime) return `${brTime[3]}-${brTime[2]}-${brTime[1]}`;
  return s;
}

export const NUMERICOS_CONTRATO = [
  'valor_adesao', 'valor_parcela', 'num_parcelas', 'valor_total',
  'cotacao', 'valor_em_moeda', 'prazo_meses', 'dia_vencimento',
  'mensalidade', 'valor_divida', 'percentual_montante',
];

export const NUMERICOS_VENDA = [
  'valor', 'valor_total_contrato', 'num_parcelas', 'percentual_comissao',
];

export const DATE_FIELDS = [
  'data_contrato', 'data_primeiro_pagamento', 'nascimento', 'data', 'parcelamento',
];

export function sanitizeDados(dados, camposNumericos) {
  const limpo = {};
  for (const [k, v] of Object.entries(dados)) {
    if (v === null || v === undefined || v === '') continue;
    let val = v;
    if (camposNumericos.includes(k)) {
      val = parseNumber(v);
      if (val === undefined) continue;
    } else if (DATE_FIELDS.includes(k)) {
      val = parseDate(v);
    }
    limpo[k] = val;
  }
  return limpo;
}