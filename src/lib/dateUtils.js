/**
 * Utilitários de data/hora para o fuso de Brasília (America/Sao_Paulo)
 */

const TZ = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso de Brasília como objeto Date
 * (útil para cálculos)
 */
export function nowBrasilia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Retorna a data atual no formato YYYY-MM-DD (horário de Brasília)
 */
export function todayBrasilia() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('/')
    .reverse()
    .join('-');
}

/**
 * Retorna o ISO string no fuso de Brasília (YYYY-MM-DDTHH:mm:ss-03:00)
 */
export function isoNowBrasilia() {
  const d = new Date();
  // Obtém offset em minutos para America/Sao_Paulo
  const tzOffset = getTimezoneOffsetMinutes(d, TZ);
  const local = new Date(d.getTime() - tzOffset * 60000);
  return local.toISOString().replace('Z', getBrasiliaOffsetString(d));
}

/**
 * Formata uma data/hora ISO para exibição em pt-BR (horário de Brasília)
 */
export function formatDateTimeBrasilia(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata apenas a data para exibição em pt-BR
 */
export function formatDateBrasilia(dateString) {
  if (!dateString) return '—';
  // Se vier só YYYY-MM-DD, adiciona T00:00:00 para evitar deslocamento de fuso
  const iso = dateString.length === 10 ? dateString + 'T00:00:00' : dateString;
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ });
}

// --- helpers internos ---

function getTimezoneOffsetMinutes(date, tz) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate  = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  return (utcDate - tzDate) / 60000;
}

function getBrasiliaOffsetString(date) {
  const offsetMin = getTimezoneOffsetMinutes(date, TZ);
  const sign = offsetMin <= 0 ? '+' : '-';
  const abs  = Math.abs(offsetMin);
  const hh   = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm   = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}