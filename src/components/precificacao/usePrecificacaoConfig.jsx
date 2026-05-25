// Hook para ler/salvar configurações de precificação no localStorage

export const DEFAULT_CONFIG = {
  ci: {
    mensalidadePadrao: 199,
    pisoAdesao: 999,
    ltvMeses: 24,
    cambio: 5.80,
    adesaoPerc: 3,
  },
  dolarize: {
    p1Mensalidade: 1500,
    p1Rate: 3.5,
    p1AdesaoPerc: 8,
    p1Piso: 5000,
    p1Teto: 30000,
    p2Rate: 2.5,
    p2AdesaoPerc: 8,
    p2CicloLTV: 24,
    p2Piso: 5000,
    p2Teto: 30000,
  },
  offshore: {
    cambio: 5.80,
    p1AdesaoPerc: 1.5,
    p1PisoUSD: 10000,
    p1TetoUSD: 25000,
    p1MensalidadePercAUM: 0.10,
    p1MensalidadeMinUSD: 300,
    p2AdesaoPerc: 2.5,
    p2PisoUSD: 10000,
    p2TetoUSD: 50000,
    p2MensalidadePercAUM: 0.15,
    p2MensalidadeMinUSD: 500,
    p2TaxaJuridicaUSD: 300,
  },
  canalBancario: {
    p1AdesaoPorConta: 1500,
    p1TetoAdesao: 6000,
    p1MensalidadePorConta: 800,
    p1PercVolume: 0.003,
    p1TetoMensalidade: 4000,
    p2AdesaoPorConta: 3000,
    p2SetupFixo: 2000,
    p2TetoAdesao: 15000,
    p2MensalidadePorConta: 1500,
    p2PercVolume: 0.005,
    p2TetoMensalidade: 8000,
  },
  sg: {
    duracao: 60,
    parcelasPagas: 12,
    pisoMensalidadeExito: 500,
    pisoAceitacaoPerc: 5,
    tabelaPrincipal: [
      { min: 0, investPerc: 8, txManutencao: 800 },
      { min: 100000, investPerc: 7, txManutencao: 1200 },
      { min: 500000, investPerc: 6, txManutencao: 2000 },
      { min: 1000000, investPerc: 5, txManutencao: 3500 },
    ],
    tabelaExito: [
      { min: 0, mensalidade: 500 },
      { min: 100000, mensalidade: 1000 },
      { min: 500000, mensalidade: 2500 },
      { min: 1000000, mensalidade: 4500 },
    ],
  },
};

export function loadConfig() {
  try {
    const saved = localStorage.getItem('precificacao_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        ci: { ...DEFAULT_CONFIG.ci, ...(parsed.ci || {}) },
        dolarize: { ...DEFAULT_CONFIG.dolarize, ...(parsed.dolarize || {}) },
        offshore: { ...DEFAULT_CONFIG.offshore, ...(parsed.offshore || {}) },
        canalBancario: { ...DEFAULT_CONFIG.canalBancario, ...(parsed.canalBancario || {}) },
        sg: { ...DEFAULT_CONFIG.sg, ...(parsed.sg || {}) },
      };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config) {
  localStorage.setItem('precificacao_config', JSON.stringify(config));
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export function findTableRow(table, value) {
  if (!table || table.length === 0) return null;
  let row = table[0];
  for (const r of table) {
    if (value >= r.min) row = r;
  }
  return row;
}

export function fmtBRL(v) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtUSD(v) {
  if (v == null || isNaN(v)) return '—';
  return 'US$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNum(v, dec = 2) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}