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

// Data, minutos desde 00:00 e dia da semana (0=dom) em Brasília.
export function agoraBrasilia(d: Date = new Date()): { data: string; minutos: number; diaSemana: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
  const o: any = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hora = Number(o.hour === '24' ? '0' : o.hour);
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { data: `${o.year}-${o.month}-${o.day}`, minutos: hora * 60 + Number(o.minute), diaSemana: dias[o.weekday] ?? 0 };
}

// Soma n dias úteis (n >= 0) a partir de uma data yyyy-MM-dd.
export function somarDiasUteis(inicio: string, n: number): string {
  let atual = proximoDiaUtil(inicio);
  let faltam = n;
  while (faltam > 0) {
    const [a, m, d] = atual.split('-').map(Number);
    const dt = new Date(a, m - 1, d + 1);
    atual = proximoDiaUtil(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    faltam--;
  }
  return atual;
}
