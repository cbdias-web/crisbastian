/**
 * Utilitário: verifica se uma data é dia útil brasileiro
 * (exclui sábados, domingos e feriados nacionais)
 */

function getFeriadosBrasil(ano) {
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

  const addDias = (date, dias) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  };

  const fmt = (d) =>
    `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const moveis = [
    fmt(addDias(pascoa, -48)), // Carnaval segunda
    fmt(addDias(pascoa, -47)), // Carnaval terça
    fmt(addDias(pascoa, -2)),  // Sexta-feira Santa
    fmt(pascoa),               // Páscoa
    fmt(addDias(pascoa, 60)),  // Corpus Christi
  ];

  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Sra. Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra
    `${ano}-12-25`, // Natal
  ];

  return new Set([...fixos, ...moveis]);
}

/**
 * Verifica se uma string de data (YYYY-MM-DD) é dia útil brasileiro.
 */
export function isDiaUtil(dateStr) {
  if (!dateStr) return false;
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const date = new Date(ano, mes - 1, dia);
  const diaSemana = date.getDay(); // 0=Dom, 6=Sáb
  if (diaSemana === 0 || diaSemana === 6) return false;
  const feriados = getFeriadosBrasil(ano);
  return !feriados.has(dateStr);
}

/**
 * Retorna mensagem amigável caso a data não seja dia útil.
 */
export function mensagemNaoDiaUtil(dateStr) {
  if (!dateStr) return null;
  const [ano, mes, dia] = dateStr.split('-').map(Number);
  const date = new Date(ano, mes - 1, dia);
  const diaSemana = date.getDay();
  if (diaSemana === 0) return 'Domingo não é dia útil.';
  if (diaSemana === 6) return 'Sábado não é dia útil.';
  const feriados = getFeriadosBrasil(ano);
  if (feriados.has(dateStr)) return 'Esta data é feriado nacional.';
  return null;
}