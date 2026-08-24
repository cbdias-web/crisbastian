// Utilitários de dia útil (Brasil) — feriados fixos + móveis (Pascoa).
// Extraído para reuso entre montarFilaContatoDia e registrarTentativaContato.

function getFeriadosBrasil(ano: number): Set<string> {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pascoa = new Date(ano, mes - 1, dia);

  const addDias = (date: Date, dias: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  };
  const fmt = (d: Date) =>
    `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const moveis = [
    fmt(addDias(pascoa, -48)), // Carnaval terca
    fmt(addDias(pascoa, -47)), // Carnaval segunda
    fmt(addDias(pascoa, -2)),  // Sexta-feira Santa
    fmt(pascoa),               // Pascoa
    fmt(addDias(pascoa, 60)),  // Corpus Christi
  ];
  const fixos = [
    `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`,
    `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`,
  ];
  return new Set([...fixos, ...moveis]);
}

export function isDiaUtil(dateStr: string): boolean {
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const date = new Date(ano, mes - 1, dia);
  const diaSemana = date.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !getFeriadosBrasil(ano).has(dateStr);
}

// Retorna o próximo dia útil a partir de `apartirDe` (inclusive).
export function proximoDiaUtil(apartirDe: string): string {
  let [ano, mes, dia] = apartirDe.split('-').map(Number);
  let date = new Date(ano, mes - 1, dia);
  let tentativas = 0;
  while (tentativas < 15) {
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (isDiaUtil(ds)) return ds;
    date.setDate(date.getDate() + 1);
    tentativas++;
  }
  return apartirDe;
}

// Data de hoje no fuso de Brasília (America/Sao_Paulo) no formato yyyy-MM-dd.
export function hojeBrasilia(): string {
  const agora = new Date();
  const brasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${brasilia.getFullYear()}-${String(brasilia.getMonth() + 1).padStart(2, '0')}-${String(brasilia.getDate()).padStart(2, '0')}`;
}