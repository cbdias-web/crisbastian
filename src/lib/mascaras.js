// Máscaras e conversões no padrão brasileiro

const apenasDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function maskCPF(v) {
  const d = apenasDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskCNPJ(v) {
  const d = apenasDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// CPF até 11 dígitos, CNPJ acima disso
export function maskCpfCnpj(v) {
  const d = apenasDigitos(v);
  return d.length <= 11 ? maskCPF(d) : maskCNPJ(d);
}

export function maskCEP(v) {
  const d = apenasDigitos(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

// Telefone BR: (11) 99999-9999 / (11) 9999-9999.
// Se começar com 55 e tiver mais de 11 dígitos (formato com DDI), mantém +55.
export function maskTelefone(v) {
  let d = apenasDigitos(v);
  let ddi = '';
  if (d.length > 11 && d.startsWith('55')) {
    ddi = '+55 ';
    d = d.slice(2);
  }
  d = d.slice(0, 11);
  if (d.length === 0) return ddi.trim();
  if (d.length <= 2) return `${ddi}(${d}`;
  if (d.length <= 6) return `${ddi}(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `${ddi}(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `${ddi}(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── Valores monetários ──────────────────────────────────────────────
// Entrada: número (3500.5) ou string numérica ("3500.50") vinda do banco/estado.
// Saída: "3.500,50"
export function formatarMoeda(valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const n = typeof valor === 'number' ? valor : parseFloat(valor);
  if (isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converte o que o usuário digitou (apenas dígitos viram centavos) em número.
// Ex.: "350050" -> 3500.5
export function digitosParaNumero(texto) {
  const d = apenasDigitos(texto);
  if (!d) return 0;
  return parseInt(d, 10) / 100;
}

// Máscara de digitação: começa em "0,00" e vai empurrando os dígitos (estilo caixa registradora).
export function maskMoeda(texto) {
  return formatarMoeda(digitosParaNumero(texto));
}