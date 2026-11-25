// Formulários de coleta que usam a estrutura do RNC (Canal bancário): o mesmo formulário serve ROF e Dolarize.
export const PRODUTOS_RNC = {
  'CANAL BANCÁRIO': { titulo: 'Canal Bancário', curto: 'canal bancário', msg: 'canal', pdf: 'Canal Bancario' },
  'ROF': { titulo: 'ROF — Registro de Operação Financeira', curto: 'ROF', msg: 'rof', pdf: 'ROF - Registro de Operacao Financeira' },
  'DOLARIZE': { titulo: 'Dolarize', curto: 'Dolarize', msg: 'dolarize', pdf: 'Dolarize' },
};
export const produtoRnc = (p) => PRODUTOS_RNC[p] ? p : 'CANAL BANCÁRIO';
export const infoRnc = (p) => PRODUTOS_RNC[produtoRnc(p)];
