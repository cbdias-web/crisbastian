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
    p1Mensalidade: 2000,
    p1Rate: 3.0,
    p1AdesaoPerc: 10,
    p1Piso: 8000,
    p1Teto: 50000,
    p2Rate: 2.0,
    p2AdesaoPerc: 10,
    p2CicloLTV: 24,
    p2Piso: 8000,
    p2Teto: 50000,
  },
  canalBancario: {
    p1Mensalidade: 1200,
    p1Rate: 2.5,
    p1AdesaoPerc: 6,
    p1Piso: 3000,
    p1Teto: 20000,
    p2Rate: 2.0,
    p2AdesaoPerc: 6,
    p2CicloLTV: 24,
    p2Piso: 3000,
    p2Teto: 20000,
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
        offshore: { ...DEFAULT_CONFIG.offshore, ...(parsed.offshore || {}) },
        canalBancario: { ...DEFAULT_CONFIG.canalBancario, ...(parsed.canalBancario || {}) },
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