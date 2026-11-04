// Normalização/exibição do celular do gerente (mesma regra usada em salvarPerfilGerente).
export function normalizarCelular(valor) {
  const d = String(valor || '').replace(/\D/g, '');
  if (!d) return '';
  const n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  if (n.length !== 11 || n[2] !== '9') return null; // inválido
  return `+55${n}`;
}

export function formatarCelular(e164) {
  const d = String(e164 || '').replace(/\D/g, '');
  const n = d.startsWith('55') ? d.slice(2) : d;
  if (n.length !== 11) return e164 || '';
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}