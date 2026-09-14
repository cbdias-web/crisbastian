import { Zap, Clock, PhoneCall, BadgeCheck, Trophy, XCircle, Sprout } from 'lucide-react';

// Constantes e helpers compartilhados da esteira de Fila de Contatos
// (Kanban + Card + página). Mantidos aqui para evitar duplicação.

export const STATUS_LABEL = {
  pendente: 'Pendente',
  atendeu: 'Em Contato',
  nao_atendeu: 'Não Atendeu',
  qualificado: 'Qualificado',
  convertido: 'Convertido',
  descartado: 'Desqualificado',
  nutricao: 'Nutrição',
};

export const COLUNAS = [
  { key: 'indicacao', label: 'Indicações', icon: Zap, color: '#00D4AA', bg: 'rgba(0,212,170,0.08)', statuses: ['pendente'], origem: 'indicacao' },
  { key: 'carteira', label: 'Agenda do Dia', icon: Clock, color: '#818cf8', bg: 'rgba(99,102,241,0.08)', statuses: ['pendente'], origem: 'carteira' },
  { key: 'em_contato', label: 'Em Contato', icon: PhoneCall, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', statuses: ['atendeu'] },
  { key: 'qualificado', label: 'Qualificado', icon: BadgeCheck, color: '#60a5fa', bg: 'rgba(59,130,249,0.08)', statuses: ['qualificado'] },
  { key: 'convertido', label: 'Convertido', icon: Trophy, color: '#34d399', bg: 'rgba(52,211,153,0.08)', statuses: ['convertido'] },
  { key: 'nutricao', label: 'Nutrição', icon: Sprout, color: '#c084fc', bg: 'rgba(192,132,252,0.08)', statuses: ['nutricao'] },
  { key: 'desqualificado', label: 'Desqualificado', icon: XCircle, color: '#f87171', bg: 'rgba(248,113,113,0.08)', statuses: ['descartado'] },
];

// Opções do menu "Mover para" no card
export const STATUS_MENU = [
  { key: 'em_contato', label: 'Em Contato' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'nutricao', label: 'Nutrição' },
  { key: 'convertido', label: 'Convertido' },
  { key: 'desqualificado', label: 'Desqualificado' },
];

// SLA de inércia: horas sem interação que marcam um lead como "atrasado" em Em Contato
export const STALE_HORAS = 48;
// Tentativas sem retorno que sugerem mover o lead para Nutrição (ghosting)
export const LIMITE_TENTATIVAS_GHOSTING = 4;

// Ordem das colunas da esteira — personalizada pelo usuário (arrastar o
// cabeçalho) e persistida no navegador.
export const ORDEN_STORAGE_KEY = 'fila_contato_ordem_colunas';

export const carregarOrdem = () => {
  try {
    const salvas = JSON.parse(localStorage.getItem(ORDEN_STORAGE_KEY) || '[]');
    if (Array.isArray(salvas) && salvas.length === COLUNAS.length && salvas.every(k => COLUNAS.some(c => c.key === k))) {
      return salvas.map(k => COLUNAS.find(c => c.key === k));
    }
  } catch {}
  return [...COLUNAS];
};

export const destinoPara = (colKey) => {
  const col = COLUNAS.find(c => c.key === colKey);
  if (!col) return null;
  if (col.key === 'indicacao') return { status: 'pendente', tipo_origem: 'indicacao' };
  if (col.key === 'carteira') return { status: 'pendente', tipo_origem: 'carteira' };
  return { status: col.statuses[0] };
};

// Normaliza timestamps do banco (date-only vira início do dia local; datetime
// sem fuso é interpretado como UTC) para cálculo correto do tempo parado.
export const parseTs = (str) => {
  if (!str) return null;
  let s = String(str);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00';
  else if (s.includes('T') && !/[zZ]$/.test(s) && !/[+-]\d{2}:\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
};

// Horas desde a última movimentação/interação (relógio de inércia do card)
export const horasParadoItem = (item) => {
  const t = parseTs(item?.status_desde) || parseTs(item?.updated_date) || parseTs(item?.created_date);
  return t ? Math.max(0, (Date.now() - t) / 3600000) : 0;
};

// Lead em "Em Contato" parado além do SLA de inércia (>48h sem interação)
export const isStaleItem = (item) => item?.status === 'atendeu' && horasParadoItem(item) >= STALE_HORAS;

export const fmtDataLead = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};