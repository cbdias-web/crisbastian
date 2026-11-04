// Utilitários de limpeza/validação de leads (importação, score, fuso Brasília)

const DDDS = new Set([11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99]);

export const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '');
export const clean = (s) => String(s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

export function cpfOk(d) {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

export function cnpjOk(d) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [12, 13]) {
    const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * w[i];
    const r = s % 11;
    if ((r < 2 ? 0 : 11 - r) !== Number(d[n])) return false;
  }
  return true;
}

// Retorna { tipo: 'PF'|'PJ', digitos, formatado } ou null
export function parseDoc(raw) {
  const d = onlyDigits(raw);
  if (!d) return null;
  const cands = [d];
  if (d.length === 10) cands.push(d.padStart(11, '0'));
  if (d.length === 12 || d.length === 13) cands.push(d.padStart(14, '0'));
  for (const c of cands) {
    if (cpfOk(c)) return { tipo: 'PF', digitos: c, formatado: `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}` };
    if (cnpjOk(c)) return { tipo: 'PJ', digitos: c, formatado: `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}` };
  }
  return null;
}

// Telefone BR -> { e164: '+55...', formatado: '(11) 99999-9999', movel: bool } ou null
export function parsePhone(raw, dddPadrao) {
  let d = onlyDigits(raw);
  if (!d || d === '2147483647') return null;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if ((d.length === 8 || d.length === 9) && dddPadrao) d = String(dddPadrao) + d;
  if (d.length !== 10 && d.length !== 11) return null;
  if (!DDDS.has(Number(d.slice(0, 2)))) return null;
  const sub = d.slice(2);
  if (new Set(sub).size <= 2 && [...sub].filter(c => c === sub[0]).length >= sub.length - 1) return null;
  if (['987654321', '123456789', '12345678', '98765432'].includes(sub)) return null;
  if (d.length === 11 && sub[0] !== '9') return null;
  const movel = d.length === 11;
  const formatado = movel ? `(${d.slice(0,2)}) ${sub.slice(0,5)}-${sub.slice(5)}` : `(${d.slice(0,2)}) ${sub.slice(0,4)}-${sub.slice(4)}`;
  return { e164: `+55${d}`, formatado, movel };
}

// Remove prefixos/sufixos operacionais e documentos embutidos do nome
export function cleanName(n) {
  const orig = clean(n);
  let s = orig;
  s = s.replace(/\(?\s*\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\s*\)?/g, '');
  s = s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '');
  s = s.replace(/\b\d{11,14}\b/g, '');
  s = s.replace(/^\s*MONITORE(\s+AQUI)?\s*(\(?\s*(PJ|PF)\s*\)?)?\s*[-–_:]*\s*/i, '');
  s = s.replace(/\s*[-–_:]*\s*MONITORE(\s+AQUI)?\s*(\(?\s*(PJ|PF)\s*\)?)?\s*$/i, '');
  s = s.replace(/^\s*(CPF|CNPJ)\s+/i, '');
  s = s.replace(/^[\s\-–_:.,]+|[\s\-–_:.,(]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return ''; // só havia prefixo/documento: não é um nome
  return s.length >= 3 ? s : orig;
}

export function parseValor(v) {
  let s = clean(v).toUpperCase().replace('|BRL', '').replace('R$', '').trim();
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const norm = (s) => clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Sinônimos de cabeçalho -> campo canônico
const SINONIMOS = {
  id_externo: ['id negocio', 'id', 'id externo', 'deal id', 'id do negocio'],
  nome: ['nome do contratante', 'nome', 'name', 'razao social', 'cliente', 'contratante', 'nome do negocio'],
  tipo_pessoa: ['tipo pessoa', 'tipo de pessoa', 'tipo'],
  cpf_cnpj: ['cpf cnpj', 'cpf/cnpj', 'cpf', 'cnpj', 'documento', 'cpf ou cnpj'],
  telefone: ['telefone', 'celular', 'fone', 'phone', 'whatsapp', 'contato'],
  valor_contrato: ['valor do contrato r', 'valor do contrato', 'valor', 'renda', 'valor total'],
  produto_contratado: ['produto contratado', 'produto', 'produto texto'],
  responsavel_origem: ['responsavel', 'responsavel origem', 'responsavel pelo contrato', 'gerente'],
  endereco: ['endereco', 'logradouro', 'rua'],
  cidade: ['cidade', 'municipio'],
  uf: ['uf', 'estado'],
  cep: ['cep'],
  email: ['email', 'e mail'],
};

export const CAMPOS_IMPORT = [
  { key: 'nome', label: 'Nome *', obrigatorio: true },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ *', obrigatorio: true },
  { key: 'telefone', label: 'Telefone *', obrigatorio: true },
  { key: 'id_externo', label: 'ID do negócio (origem)' },
  { key: 'tipo_pessoa', label: 'Tipo Pessoa' },
  { key: 'valor_contrato', label: 'Valor do contrato' },
  { key: 'produto_contratado', label: 'Produto contratado' },
  { key: 'responsavel_origem', label: 'Responsável (origem)' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'cep', label: 'CEP' },
  { key: 'email', label: 'E-mail' },
];

// headers: string[] -> { campo: indiceColuna }
export function mapearColunas(headers) {
  const mapa = {};
  const usados = new Set();
  const hs = headers.map(norm);
  for (const [campo, syns] of Object.entries(SINONIMOS)) {
    for (const syn of syns) {
      const i = hs.findIndex((h, idx) => !usados.has(idx) && h === norm(syn));
      if (i >= 0) { mapa[campo] = i; usados.add(i); break; }
    }
  }
  return mapa;
}

// ---------- Score (0-100) ----------
export const PESOS_PADRAO = { valor_alto: 30, valor_medio: 15, pj: 10, celular_valido: 20, email: 5, endereco: 5, produto_afinidade: 20, indicacao: 40 };
export const AFINIDADE_PADRAO = ['regulariz', 'garantia', 'rating', 'hora tecnica', 'diagnost', 'score'];

export function calcularScore(l, cfg = {}) {
  const p = { ...PESOS_PADRAO, ...(cfg.score_pesos || {}) };
  const afin = (cfg.afinidade_produtos?.length ? cfg.afinidade_produtos : AFINIDADE_PADRAO).map(norm);
  let s = 0;
  const v = Number(l.valor_contrato) || 0;
  if (v >= 5000) s += p.valor_alto; else if (v >= 1500) s += p.valor_medio;
  if (l.tipo_pessoa === 'PJ') s += p.pj;
  if (l.telefone_valido !== false && l.telefone_e164) s += p.celular_valido;
  if (l.email) s += p.email;
  if (l.endereco || l.cidade) s += p.endereco;
  const prod = norm(l.produto_contratado || '');
  if (prod && afin.some(a => a && prod.includes(a))) s += p.produto_afinidade;
  if (l.tipo_origem === 'indicacao') s += p.indicacao;
  s = Math.max(0, Math.min(100, Math.round(s)));
  const segmento = s >= 60 ? 'quente' : s >= 35 ? 'morno' : 'frio';
  return { score: s, segmento };
}

// ---------- Fuso Brasília ----------
export function brasiliaParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const o = Object.fromEntries(f.formatToParts(date).map(p => [p.type, p.value]));
  return { data: `${o.year}-${o.month}-${o.day}`, hora: Number(o.hour === '24' ? '0' : o.hour), minuto: Number(o.minute) };
}
export const hojeBrasilia = () => brasiliaParts().data;

// ---------- Mensagens / datas ----------
export const primeiroNome = (n) => clean(n).split(' ')[0].replace(/^./, c => c.toUpperCase()).toLowerCase().replace(/^./, c => c.toUpperCase());

export function renderModelo(texto, ctx = {}, opts = {}) {
  let t = String(texto || '');
  const vars = {
    primeiro_nome: primeiroNome(ctx.nome || ''),
    gerente: primeiroNome(ctx.gerente || ''),
    produto_contratado: ctx.produto_contratado || ctx.produto || 'seu contrato com o Grupo Villela',
    produto: ctx.produto || ctx.produto_contratado || 'nossas soluções',
    responsavel_origem: ctx.responsavel_origem || 'nosso time',
  };
  for (const [k, v] of Object.entries(vars)) t = t.replaceAll(`{{${k}}}`, v);
  if (opts.descadastro && !t.toUpperCase().includes('SAIR')) t += `\n\n${opts.descadastro}`;
  return t;
}

export function somaDiasData(data, n) {
  const [a, m, d] = data.split('-').map(Number);
  const dt = new Date(a, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Próximo dia útil simples (fins de semana); feriados são tratados no servidor.
export function proximoDiaUtilBR(data) {
  let d = data;
  for (let i = 0; i < 8; i++) {
    const [a, m, dia] = d.split('-').map(Number);
    const w = new Date(a, m - 1, dia).getDay();
    if (w !== 0 && w !== 6) return d;
    d = somaDiasData(d, 1);
  }
  return d;
}

export const fmtDataBR = (d) => (d ? String(d).split('-').reverse().join('/') : '');
