// Contrato de Prestação de Serviços — OFFSHORE (RNC / Villela Exchange).
// Modelo-base: Contrato nº 000142/2026 (caso Guilherme Augusto de Almeida).
// Variáveis: contratante (PF/PJ), valores, cronograma, prazo de implantação, jurisdição,
// estrutura nacional no Brasil e Anexo I (dação de veículo ou anexo personalizado) —
// as cláusulas da dação só entram quando a entrada for paga com veículo.
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';
import { winAnsi } from './pdfWinAnsi.ts';
import { TIMBRADO_RNC_JPG_B64 } from './timbradoRnc.ts';
import { calcularEstruturaPagamento, gerarCronograma } from './estruturaPagamento.ts';

// ───────────────────────── Dados fixos ─────────────────────────
export const CONTRATADA = {
  nome: 'RNC - REDE NACIONAL DE CÂMBIO LTDA',
  cnpj: '57.847.120/0001-46',
  qualificacao: 'inscrita no CNPJ sob o n.º 57.847.120/0001-46, com sede na Av. Padre Cacique, n.º 320, térreo B, Menino Deus, Porto Alegre/RS, CEP 90.810-240, representada neste ato por seu diretor legalmente autorizado',
};
const DADOS_BANCARIOS = [
  'Beneficiário: RNC REDE NACIONAL DE CAMBIO LTDA',
  'CNPJ: 57.847.120/0001-46',
  'Banco: 033 (Santander)',
  'Agência: 3527',
  'Conta Corrente: 13007425-3',
  'Chave PIX: 57847120000146',
];
const ADQUIRENTE = {
  nome: 'VILLELA BRASIL CONSULTORIA EM GESTÃO EMPRESARIAL S.A. – FILIAL',
  cnpj: '31.655.393/0002-86',
  endereco: 'Av. Padre Cacique, nº 320, Andar 5, Praia de Belas, Porto Alegre/RS, CEP 90.810-240',
};
const DESCRICAO_ESTADO: Record<string, string> = {
  Wyoming: ', conhecido por sua flexibilidade e benefícios fiscais',
};

// ───────────────────────── Utilitários de texto ─────────────────────────
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ORDINAIS = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA',
  'DÉCIMA PRIMEIRA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCEIRA', 'DÉCIMA QUARTA', 'DÉCIMA QUINTA', 'DÉCIMA SEXTA', 'DÉCIMA SÉTIMA', 'DÉCIMA OITAVA'];
const ORDINAL_CAP = (i: number) => ORDINAIS[i].charAt(0) + ORDINAIS[i].slice(1).toLowerCase().replace(/ (\S)/g, (m) => m.toUpperCase());

const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const UF_ = ['', 'uma', 'duas'];
const T = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const H = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const HF = ['', 'cento', 'duzentas', 'trezentas', 'quatrocentas', 'quinhentas', 'seiscentas', 'setecentas', 'oitocentas', 'novecentas'];

function ate999(x: number, fem = false): string {
  if (!x) return '';
  if (x === 100) return 'cem';
  const un = (n: number) => (fem && n <= 2 ? UF_[n] : U[n]);
  if (x < 20) return un(x);
  if (x < 100) return T[Math.floor(x / 10)] + (x % 10 ? ' e ' + un(x % 10) : '');
  const r = x % 100;
  return (fem ? HF : H)[Math.floor(x / 100)] + (r ? ' e ' + ate999(r, fem) : '');
}
// Inteiro por extenso (até bilhões). fem: "uma", "duas", "duzentas"...
export function inteiroExtenso(n: number, fem = false): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zero';
  const bi = Math.floor(n / 1e9), mi = Math.floor((n % 1e9) / 1e6), mil = Math.floor((n % 1e6) / 1e3), r = n % 1000;
  const grupos: { v: number; t: string }[] = [];
  if (bi) grupos.push({ v: bi, t: bi === 1 ? 'um bilhão' : ate999(bi) + ' bilhões' });
  if (mi) grupos.push({ v: mi, t: mi === 1 ? 'um milhão' : ate999(mi) + ' milhões' });
  if (mil) grupos.push({ v: mil, t: mil === 1 ? 'mil' : ate999(mil, fem) + ' mil' });
  if (r) grupos.push({ v: r, t: ate999(r, fem) });
  // "e" antes de um grupo < 100 ou centena redonda ("mil e duzentos", "mil e cinco");
  // caso contrário, só espaço ("mil duzentos e cinquenta")
  let s = grupos[0].t;
  for (let i = 1; i < grupos.length; i++) {
    const g = grupos[i];
    s += (g.v < 100 || g.v % 100 === 0) ? ' e ' + g.t : ' ' + g.t;
  }
  return s;
}
export function reaisExtenso(v: number): string {
  const total = Math.round((Number(v) || 0) * 100);
  const reais = Math.floor(total / 100), cent = total % 100;
  let s = '';
  if (reais > 0) {
    const ext = inteiroExtenso(reais);
    const redondoMilhao = reais % 1000000 === 0;
    s = ext + (reais === 1 ? ' real' : (redondoMilhao ? ' de reais' : ' reais'));
  }
  if (cent > 0) s += (s ? ' e ' : '') + inteiroExtenso(cent) + (cent === 1 ? ' centavo' : ' centavos');
  return s || 'zero reais';
}
export const brl = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad2 = (n: number) => String(Math.round(n)).padStart(2, '0');
const qtd = (n: number, fem = false) => `${pad2(n)} (${inteiroExtenso(n, fem)})`;
const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const dataExtenso = (iso?: string) => {
  const d = iso ? new Date(iso.slice(0, 10) + 'T12:00:00') : new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const digitos = (s: any) => String(s || '').replace(/\D/g, '');
export function fmtDoc(s: any): string {
  const d = digitos(s);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(s || '').trim();
}
const fmtCep = (s: any) => { const d = digitos(s); return d.length === 8 ? d.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3') : String(s || '').trim(); };
const minusc = (s: any) => String(s || '').trim().toLowerCase();
const limpa = (s: any) => String(s || '').trim();

// ───────────────────────── Motor de diagramação ─────────────────────────
type Seg = { t: string; b?: boolean };
const PW = 595.28, PH = 841.89;
const ML = 75, MR = 520, TW = MR - ML;
const TOPO = PH - 128, BASE = 112;
const FS = 10.5, LH = 15;
const PRETO = rgb(0, 0, 0), CINZA = rgb(0.45, 0.45, 0.45), BORDA = rgb(0.55, 0.55, 0.55), FUNDO = rgb(0.93, 0.95, 0.97);

export async function gerarContratoOffshorePdf(c: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Contrato de Prestação de Serviços nº ${c.numero_contrato || ''}`);
  doc.setAuthor('RNC - Rede Nacional de Câmbio Ltda');
  const F = await doc.embedFont('Helvetica');
  const FB = await doc.embedFont('Helvetica-Bold');
  const bg = await doc.embedJpg(Uint8Array.from(atob(TIMBRADO_RNC_JPG_B64), (ch) => ch.charCodeAt(0)));

  let page: any = null;
  let y = TOPO;
  let nPag = 0;
  const novaPagina = () => {
    page = doc.addPage([PW, PH]);
    page.drawImage(bg, { x: 0, y: 0, width: PW, height: PH });
    nPag++;
    const txt = `Página ${nPag}`;
    page.drawText(txt, { x: MR - F.widthOfTextAtSize(txt, 8), y: 64, size: 8, font: F, color: CINZA });
    y = TOPO;
  };
  const garantir = (h: number) => { if (!page || y - h < BASE) novaPagina(); };

  // Parágrafo com trechos em negrito, quebra de linha e justificação
  type Run = { t: string; f: any };
  const paragrafo = (segs: Seg[] | string, o: { indent?: number; size?: number; after?: number; justify?: boolean; align?: 'left' | 'center' | 'right'; color?: any; bullet?: string; keep?: number } = {}) => {
    const size = o.size || FS;
    const indent = o.indent || 0;
    const lista: Seg[] = typeof segs === 'string' ? [{ t: segs }] : segs;
    // palavras como sequências de runs (fontes) separadas por espaço
    const palavras: Run[][] = [];
    let atual: Run[] = [];
    let colado = false;
    for (const s of lista) {
      const f = s.b ? FB : F;
      const txt = winAnsi(s.t);
      const partes = txt.split(/( +)/);
      for (const p of partes) {
        if (!p) continue;
        if (/^ +$/.test(p)) { if (atual.length) palavras.push(atual); atual = []; colado = false; continue; }
        if (colado || atual.length) atual.push({ t: p, f }); else atual = [{ t: p, f }];
        colado = true;
      }
    }
    if (atual.length) palavras.push(atual);
    const larg = (w: Run[]) => w.reduce((a, r) => a + r.f.widthOfTextAtSize(r.t, size), 0);
    const esp = F.widthOfTextAtSize(' ', size);
    const x0 = ML + indent;
    const maxW = TW - indent;
    const linhas: Run[][][] = [];
    let linha: Run[][] = [];
    let w = 0;
    for (const p of palavras) {
      const pw = larg(p);
      if (linha.length && w + esp + pw > maxW) { linhas.push(linha); linha = [p]; w = pw; }
      else { w += (linha.length ? esp : 0) + pw; linha.push(p); }
    }
    if (linha.length) linhas.push(linha);
    garantir(Math.min(linhas.length, 2) * LH + (o.keep || 0));
    if (o.bullet) page.drawText(winAnsi(o.bullet), { x: x0 - 11, y, size, font: F, color: o.color || PRETO });
    linhas.forEach((ln, i) => {
      if (i > 0) garantir(LH);
      const ultima = i === linhas.length - 1;
      const conteudo = ln.reduce((a, p) => a + larg(p), 0);
      const gaps = ln.length - 1;
      let gap = esp;
      if ((o.justify ?? true) && !ultima && gaps > 0) {
        const extra = (maxW - conteudo) / gaps;
        if (extra < esp * 4) gap = extra;
      }
      let x = x0;
      if (o.align === 'center') x = ML + (TW - conteudo - gaps * esp) / 2;
      if (o.align === 'right') x = MR - conteudo - gaps * esp;
      ln.forEach((p, k) => {
        p.forEach((r, j) => {
          // espaço real ao fim de cada palavra (invisível) para cópia/leitura do texto do PDF
          const fimPalavra = j === p.length - 1 && k < ln.length - 1;
          page.drawText(fimPalavra ? r.t + ' ' : r.t, { x, y, size, font: r.f, color: o.color || PRETO });
          x += r.f.widthOfTextAtSize(r.t, size);
        });
        x += gap;
      });
      y -= LH;
    });
    y -= o.after ?? 6;
  };
  const titulo = (t: string) => { garantir(LH * 4); y -= 4; paragrafo([{ t, b: true }], { justify: false, after: 5 }); };
  const item = (n: string, segs: Seg[] | string) => paragrafo([{ t: n + ' ', b: true }, ...(typeof segs === 'string' ? [{ t: segs }] : segs)]);
  const bullets = (itens: (Seg[] | string)[], after = 6) => itens.forEach((s, i) => paragrafo(s, { indent: 22, bullet: '•', after: i === itens.length - 1 ? after : 2 }));
  const tabela = (cols: { w: number; align?: 'left' | 'right' | 'center' }[], linhas: { cells: string[]; bold?: boolean; fill?: boolean }[], size = 10) => {
    const rh = 17;
    const totalW = cols.reduce((a, c) => a + c.w, 0);
    const x0 = ML + (TW - totalW) / 2;
    for (const l of linhas) {
      // células com quebra (ex.: anexo do veículo)
      const linhasCel = l.cells.map((t, i) => quebra(winAnsi(t), l.bold ? FB : F, size, cols[i].w - 10));
      const h = Math.max(1, ...linhasCel.map((x) => x.length)) * 12.5 + 5;
      garantir(h + 2);
      let x = x0;
      l.cells.forEach((_, i) => {
        page.drawRectangle({ x, y: y - h + 11, width: cols[i].w, height: h, borderColor: BORDA, borderWidth: 0.6, color: l.fill ? FUNDO : undefined });
        linhasCel[i].forEach((t: string, k: number) => {
          const f = l.bold ? FB : F;
          const tw = f.widthOfTextAtSize(t, size);
          const tx = cols[i].align === 'right' ? x + cols[i].w - 5 - tw : cols[i].align === 'center' ? x + (cols[i].w - tw) / 2 : x + 5;
          page.drawText(t, { x: tx, y: y - k * 12.5, size, font: f, color: PRETO });
        });
        x += cols[i].w;
      });
      y -= h;
      void rh;
    }
    y -= 8;
  };
  const quebra = (t: string, f: any, size: number, maxW: number) => {
    const out: string[] = []; let l = '';
    for (const w of t.split(' ')) { const s = l ? l + ' ' + w : w; if (l && f.widthOfTextAtSize(s, size) > maxW) { out.push(l); l = w; } else l = s; }
    if (l) out.push(l); return out.length ? out : [''];
  };
  const assinaturas = (local: string, data: string, contratante: { nome: string; doc: string; rotuloDoc: string }, testemunhas: boolean) => {
    garantir(testemunhas ? 330 : 190);
    paragrafo(`${local}, ${data}.`, { after: 34, justify: false });
    const bloco = (nome: string, docTxt: string, papel: string) => {
      paragrafo('_______________________________', { justify: false, after: 0 });
      paragrafo([{ t: nome, b: true }], { justify: false, after: 0 });
      paragrafo(docTxt, { justify: false, after: 0 });
      paragrafo(papel, { justify: false, after: 26 });
    };
    bloco(CONTRATADA.nome, `CNPJ ${CONTRATADA.cnpj}`, 'CONTRATADA');
    bloco(contratante.nome, `${contratante.rotuloDoc} ${contratante.doc}`, 'CONTRATANTE');
    if (testemunhas) {
      paragrafo('Testemunhas:', { justify: false, after: 14 });
      for (const n of [1, 2]) {
        paragrafo(`${n}. _____________________________`, { justify: false, after: 2 });
        paragrafo('Nome: _________________________', { justify: false, after: 2 });
        paragrafo('CPF: __________________________', { justify: false, after: 16 });
      }
    }
  };

  // ───────────────────────── Dados do contrato ─────────────────────────
  const docCont = digitos(c.cpf_cnpj);
  const isPJ = docCont.length === 14;
  const numero = limpa(c.numero_contrato) || '______/____';
  const local = limpa(c.local_assinatura) || 'Porto Alegre';
  const dataTxt = dataExtenso(c.data_contrato);
  const nome = limpa(c.nome).toUpperCase();
  const jur = limpa(c.estrutura_jurisdicao) || 'Wyoming';
  const estado = jur.replace(/\s*[,/-]\s*EUA\s*$/i, '').trim() || 'Wyoming';
  const entidade = limpa(c.offshore_tipo_entidade) || 'Limited Liability Company (LLC)';
  const sigla = (entidade.match(/\(([A-Z]{2,6})\)/) || [])[1] || 'entidade';
  const nacional = c.offshore_estrutura_nacional !== false;
  const manut = Number(c.offshore_manutencao_meses) > 0 ? Number(c.offshore_manutencao_meses) : 12;
  const prazo = Number(c.prazo_implantacao_dias) > 0 ? Number(c.prazo_implantacao_dias) : 90;
  const dacao = c.offshore_entrada_forma === 'dacao_veiculo';
  const v = c.anexo_veiculo || {};
  const anexoTipo = dacao ? 'veiculo' : (c.anexo_ativo && c.anexo_tipo === 'personalizado' && limpa(c.anexo_texto) ? 'personalizado' : null);
  const anexoNome = anexoTipo === 'veiculo' ? 'Anexo I – Termo de Dação em Pagamento de Veículo'
    : anexoTipo === 'personalizado' ? `Anexo I – ${limpa(c.anexo_titulo) || 'Condições Específicas'}` : '';

  const est = calcularEstruturaPagamento(c);
  const crono = gerarCronograma(c, est);
  const total = Number(c.valor_total) || 0;
  const entrada = est.tipo === 'entrada_parcelas' ? est.recebido : 0;

  // Numeração dinâmica das cláusulas
  let nCl = -1;
  const clausula = (nomeCl: string) => { nCl++; titulo(`CLÁUSULA ${ORDINAIS[nCl]} – ${nomeCl}`); return nCl + 1; };
  // índices fixos usados em referências cruzadas
  const IDX = { escopo: 2, conformidade: 5, pagamento: 6 };

  // ───────────────────────── Página 1: título e partes ─────────────────────────
  novaPagina();
  paragrafo([{ t: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº ${numero}`, b: true }], { align: 'center', justify: false, after: 18 });

  paragrafo([{ t: CONTRATADA.nome, b: true }, { t: ', ' + CONTRATADA.qualificacao + ', doravante denominada ' }, { t: 'CONTRATADA', b: true }, { t: ';' }], { after: 10 });

  const end = [limpa(c.endereco), limpa(c.bairro)].filter(Boolean).join(', ');
  const cidUf = [limpa(c.cidade), limpa(c.estado).toUpperCase()].filter(Boolean).join('/');
  const endCompleto = [end, cidUf].filter(Boolean).join(', ') + (c.cep ? `, CEP ${fmtCep(c.cep)}` : '');
  let qualif: Seg[];
  if (isPJ) {
    const resp = limpa(c.responsavel_legal).toUpperCase();
    qualif = [{ t: nome, b: true }, {
      t: `, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${fmtDoc(c.cpf_cnpj)}, com sede na ${endCompleto}` +
        (c.email ? `, endereço eletrônico ${limpa(c.email)}` : '') +
        (resp ? `, neste ato representada por ${resp}` + (c.cpf_responsavel ? `, inscrito(a) no CPF sob o nº ${fmtDoc(c.cpf_responsavel)}` : '') : '') +
        ', doravante denominada ',
    }, { t: 'CONTRATANTE', b: true }, { t: '.' }];
  } else {
    // gênero pela nacionalidade informada (brasileiro/brasileira); sem pista, mantém "(a)"
    const nac = minusc(c.nacionalidade);
    const g = /o$/.test(nac) ? 'm' : /a$/.test(nac) ? 'f' : '';
    const fl = (m: string, f: string, n: string) => (g === 'm' ? m : g === 'f' ? f : n);
    const ec = minusc(c.estado_civil).replace(/o\(a\)/, fl('o', 'a', 'o(a)')).replace(/\(a\)/, fl('', 'a', '(a)'));
    const partes = [nac, ec, minusc(c.profissao)].filter(Boolean);
    qualif = [{ t: nome, b: true }, {
      t: (partes.length ? ', ' + partes.join(', ') : '') +
        (c.rg ? `, ${fl('portador', 'portadora', 'portador(a)')} do RG nº ${limpa(c.rg)}` : '') +
        `, ${fl('inscrito', 'inscrita', 'inscrito(a)')} no CPF sob o nº ${fmtDoc(c.cpf_cnpj)}` +
        (c.email ? `, endereço eletrônico ${limpa(c.email)}` : '') +
        `, ${fl('residente e domiciliado', 'residente e domiciliada', 'residente e domiciliado(a)')} na ${endCompleto}, doravante ${fl('denominado', 'denominada', 'denominado(a)')} `,
    }, { t: 'CONTRATANTE', b: true }, { t: '.' }];
  }
  paragrafo(qualif, { after: 10 });
  paragrafo('As partes acima qualificadas têm entre si justo e contratado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições a seguir.', { after: 10 });

  // 1 — Objeto
  clausula('DO OBJETO DO CONTRATO');
  item('1.1.', nacional
    ? 'O presente contrato tem como objeto a contratação de um pacote integrado de soluções para criar, implantar e gerenciar uma estrutura empresarial e financeira robusta, conectando operações internacionais (EUA) e nacionais (Brasil), conforme detalhado no escopo de serviços abaixo.'
    : 'O presente contrato tem como objeto a contratação de um pacote integrado de soluções para criar, implantar e gerenciar uma estrutura empresarial e financeira internacional nos EUA, conforme detalhado no escopo de serviços abaixo.');

  // 2 — Escopo
  clausula('DO ESCOPO E LOCALIZAÇÃO DA ESTRUTURA OFFSHORE');
  item('2.1.', 'O escopo completo dos serviços inclui:');
  item('2.1.1.', [{ t: `Estrutura Internacional nos EUA (${estado}):`, b: true }]);
  bullets([
    [{ t: 'Criação de Entidade Offshore: ', b: true }, { t: `Constituição de uma ${entidade} no estado de ${estado}, EUA${DESCRICAO_ESTADO[estado] || ''};` }],
    [{ t: 'Estrutura Financeira nos EUA: ', b: true }, { t: `Abertura de conta bancária empresarial em dólares americanos (USD) para a ${sigla}, permitindo operações comerciais e financeiras internacionais;` }],
    [{ t: 'Obtenção do EIN: ', b: true }, { t: 'Solicitação e obtenção do Employer Identification Number (EIN) junto ao IRS (Receita Federal Americana), essencial para todas as operações da empresa.' }],
  ]);
  let sub = 2;
  if (nacional) {
    item(`2.1.${sub++}.`, [{ t: 'Estrutura Nacional no Brasil:', b: true }]);
    bullets([
      [{ t: 'Estrutura Jurídica: ', b: true }, { t: 'Acompanhamento e assessoria na abertura e regularização da representação legal da empresa estrangeira no Brasil ou na constituição de uma entidade correlata, conforme a melhor estratégia para o caso do CONTRATANTE;' }],
      [{ t: 'Estrutura Financeira no Brasil: ', b: true }, { t: 'Abertura de conta corrente em Reais (BRL) em instituição financeira integrante do Sistema Financeiro Nacional, em conformidade com os aspectos legais e registros habilitados junto ao BACEN, facilitando a movimentação de recursos entre a matriz e a filial.' }],
    ]);
  }
  item(`2.1.${sub}.`, [{ t: 'Assessoria e Acompanhamento:', b: true }]);
  bullets([
    [{ t: 'Consultoria Estratégica: ', b: true }, { t: nacional ? 'Definição do modelo operacional mais eficiente entre as entidades;' : 'Definição do modelo operacional mais eficiente para a entidade;' }],
    [{ t: 'Gestão da Implantação: ', b: true }, { t: 'Um gestor dedicado para coordenar todos os processos de abertura, documentação e compliance;' }],
    [{ t: 'Suporte Contábil e Fiscal: ', b: true }, { t: nacional ? 'Orientação inicial sobre as obrigações fiscais e contábeis principais nas duas jurisdições;' : 'Orientação inicial sobre as obrigações fiscais e contábeis principais da entidade;' }],
    [{ t: `Manutenção Anual (${manut === 12 ? 'Primeiro Ano' : 'Período Inicial'}): `, b: true }, { t: `Serviços de registered agent nos EUA e suporte contínuo para dúvidas operacionais durante os primeiros ${qtd(manut)} meses.` }],
  ]);

  // 3 — Estrutura financeira
  clausula('DA ESTRUTURA FINANCEIRA');
  item('3.1.', 'Será disponibilizada ao CONTRATANTE uma Conta Internacional em moeda estrangeira (Dólar), permitindo realizar operações transacionais bancárias internacionais, incluindo transferências, recebimentos, investimentos e conversões cambiais.');
  item('3.2.', [{ t: 'Acesso a Canal Bancário Internacional:', b: true }]);
  bullets(['Permite ao CONTRATANTE enviar e receber ordens de transferências internacionais;', 'Suporte de códigos IBAN e SWIFT para identificação da conta no exterior.']);
  item('3.3.', [{ t: 'Realização de Operações de Câmbio via Mesa:', b: true }]);
  bullets(['Transações de importação, exportação e remessas internacionais em multimoedas;', 'Conforme condições cambiais vigentes no momento da operação.']);

  // 4 — Soluções sob demanda
  clausula('DAS SOLUÇÕES SOB DEMANDA E RESPONSABILIDADES');
  item('4.1.', `A CONTRATADA disponibiliza soluções corporativas de alta complexidade, mediante contratação sob demanda e personalizada, não incluídas no valor previsto na Cláusula ${ORDINAL_CAP(IDX.pagamento - 1)}.`);
  item('4.2.', 'Os procedimentos serão desenvolvidos em estreita colaboração com o CONTRATANTE, que se obriga a fornecer, de forma tempestiva e completa, todas as informações e documentos solicitados pela CONTRATADA.');

  // 5 — Conformidade
  clausula('CONFORMIDADE LEGAL E COMPLIANCE');
  let s5 = 1;
  if (nacional) {
    item(`5.${s5++}.`, [{ t: 'Estrutura Nacional no Brasil (Compliance e Legalidade):', b: true }]);
    bullets([
      'Acompanhamento e assessoria na abertura e regularização da representação legal da empresa estrangeira no Brasil (Filial);',
      'Aderência aos marcos regulatórios da Receita Federal do Brasil (RFB), do Banco Central do Brasil (BACEN) e dos demais órgãos anuentes;',
      'Todo o processo conduzido dentro da mais estrita legalidade, assegurando transparência e regularidade da operação desde sua constituição.',
    ]);
    item(`5.${s5++}.`, [{ t: 'Tradução Juramentada:', b: true }]);
    bullets([
      'Inclusão da tradução juramentada de toda documentação necessária (atos constitutivos, apostilas de Haia, poderes etc.);',
      'Realizada por tradutor público juramentado oficialmente reconhecido no Brasil;',
      'Atendimento a todos os protocolos legais exigidos pelas autoridades brasileiras.',
    ]);
  }
  item(`5.${s5++}.`, [{ t: 'Conformidade e Legalidade do Processo:', b: true }]);
  bullets(nacional ? [
    'Todo o processo de nacionalização da operação executado em estrita conformidade com os marcos regulatórios brasileiros e internacionais;',
    'Análise de compliance regulatório específica para a atividade do CONTRATANTE;',
    'Preparação e organização de toda documentação com as devidas apostilas de Haia;',
    'Assessoria durante todo o processo de habilitação jurídica perante os órgãos reguladores.',
  ] : [
    `Constituição da entidade em estrita conformidade com a legislação do estado de ${estado} e as normas federais americanas aplicáveis;`,
    'Análise de compliance regulatório específica para a atividade do CONTRATANTE;',
    'Preparação e organização de toda a documentação necessária, com apostilamento quando exigido.',
  ]);
  item(`5.${s5++}.`, [{ t: 'Manutenção da Conformidade:', b: true }]);
  bullets([
    'A manutenção da conformidade legal e fiscal da estrutura após a entrega do projeto é de responsabilidade exclusiva do CONTRATANTE;',
    `Inclui o pagamento de taxas anuais (Annual Report no estado de ${estado}), declaração de impostos federais americanos e cumprimento de obrigações legais futuras.`,
  ]);

  // 6 — Valor e forma de pagamento
  clausula('DO VALOR E FORMA DE PAGAMENTO');
  const forma = limpa(c.forma_pagamento) || 'PIX';
  const v1 = limpa(v.marca_modelo).toUpperCase() || '[VEÍCULO]';
  const descVeic = `${v1}, ano de fabricação ${limpa(v.ano_fabricacao) || '____'}, ano modelo ${limpa(v.ano_modelo) || '____'}, cor ${minusc(v.cor) || '____'}, placa ${limpa(v.placa).toUpperCase() || '____'}, RENAVAM ${limpa(v.renavam) || '____'}, chassi ${limpa(v.chassi).toUpperCase() || '____'}`;
  const parcelas = crono.length;
  const ajuste = parcelas > 1 ? Math.round((crono[0].valor - crono[parcelas - 1].valor) * 100) / 100 : 0;
  const txtAjuste = ajuste !== 0
    ? `, sendo a última parcela ajustada em ${brl(Math.abs(ajuste))} (${reaisExtenso(Math.abs(ajuste))}) para fechamento exato do saldo`
    : '';

  if (est.tipo === 'a_vista' || parcelas === 0) {
    if (dacao) {
      item('6.1.', `Pelo presente contrato, o CONTRATANTE pagará à CONTRATADA o valor total de ${brl(total)} (${reaisExtenso(total)}), mediante dação em pagamento (arts. 356 a 359 do Código Civil) do veículo ${descVeic}, de propriedade do CONTRATANTE, nas condições estabelecidas nesta Cláusula e no ${anexoNome}, que integra este contrato.`);
    } else {
      item('6.1.', `Pelo presente contrato, o CONTRATANTE pagará à CONTRATADA o valor total de ${brl(total)} (${reaisExtenso(total)}), à vista, mediante ${forma}${c.data_primeiro_pagamento ? `, até ${dataBR(c.data_primeiro_pagamento)}` : ', na data da assinatura deste instrumento'}.`);
    }
  } else {
    item('6.1.', `Pelo presente contrato, o CONTRATANTE pagará à CONTRATADA o valor total de ${brl(total)} (${reaisExtenso(total)}), da seguinte forma:`);
    if (est.tipo === 'entrada_parcelas') {
      const a = dacao
        ? `Entrada de ${brl(entrada)} (${reaisExtenso(entrada)}), mediante dação em pagamento (arts. 356 a 359 do Código Civil) do veículo ${descVeic}, de propriedade do CONTRATANTE, nas condições estabelecidas nesta Cláusula e no ${anexoNome}, que integra este contrato;`
        : `Entrada de ${brl(entrada)} (${reaisExtenso(entrada)}), mediante ${forma}${c.data_primeiro_pagamento ? `, até ${dataBR(c.data_primeiro_pagamento)}` : ', na data da assinatura deste instrumento'};`;
      paragrafo([{ t: 'a) ', b: true }, { t: a }], { indent: 22, after: 3 });
      paragrafo([{ t: 'b) ', b: true }, { t: `Saldo de ${brl(est.saldo)} (${reaisExtenso(est.saldo)}), a ser pago em ${qtd(parcelas, true)} parcela${parcelas > 1 ? 's mensais e sucessivas' : ''}, conforme quadro abaixo${txtAjuste}.` }], { indent: 22, after: 8 });
    } else {
      paragrafo([{ t: `Em ${qtd(parcelas, true)} parcela${parcelas > 1 ? 's mensais e sucessivas' : ''}, conforme quadro abaixo${txtAjuste}.` }], { indent: 22, after: 8 });
    }
    tabela([{ w: 90, align: 'center' }, { w: 130, align: 'center' }, { w: 130, align: 'right' }], [
      { cells: ['Parcela', 'Vencimento', 'Valor'], bold: true, fill: true },
      ...crono.map((p: any) => ({ cells: [`${p.numero}ª`, dataBR(p.vencimento), brl(p.valor)] })),
      { cells: ['Total', '', brl(crono.reduce((a: number, p: any) => a + p.valor, 0))], bold: true, fill: true },
    ]);
  }
  let s6 = 2;
  item(`6.${s6++}.`, 'Caso a data de vencimento de qualquer parcela recaia em sábado, domingo ou feriado, o pagamento poderá ser realizado no primeiro dia útil subsequente, sem incidência de encargos.');
  item(`6.${s6++}.`, [{ t: parcelas > 0 ? 'Dados Bancários para Pagamento das parcelas:' : 'Dados Bancários para Pagamento:', b: true }]);
  bullets(DADOS_BANCARIOS);
  const iBanco = s6 - 1;
  item(`6.${s6++}.`, `Os pagamentos em dinheiro deverão ser realizados mediante transferência bancária ou PIX para os dados acima, sendo considerados efetivados a partir da confirmação do crédito na conta da CONTRATADA.`);
  let iAdq = 0;
  if (dacao) {
    iAdq = s6;
    item(`6.${s6++}.`, [{ t: 'Adquirente indicada do veículo. ', b: true }, { t: `Por indicação expressa da CONTRATADA, com a qual o CONTRATANTE concorda, o veículo dado em pagamento será transferido diretamente para a ${ADQUIRENTE.nome}, inscrita no CNPJ sob o nº ${ADQUIRENTE.cnpj}, com endereço na ${ADQUIRENTE.endereco}, que figurará como compradora na Autorização para Transferência de Propriedade do Veículo (ATPV-e) e na comunicação de venda ao DETRAN, sem que tal indicação a torne parte deste contrato. A transferência à adquirente indicada produz, perante o CONTRATANTE, o mesmo efeito liberatório do pagamento feito à CONTRATADA.` }]);
    const oQue = est.tipo === 'entrada_parcelas' ? 'A entrada somente será considerada quitada' : 'O pagamento somente será considerado quitado';
    item(`6.${s6++}.`, `${oQue} após o cumprimento cumulativo das condições do Anexo I, a saber: (i) entrega do veículo e da documentação; (ii) emissão da ATPV-e e registro da comunicação de venda em nome da adquirente indicada. Cumpridas as condições, a CONTRATADA dará quitação ${est.tipo === 'entrada_parcelas' ? 'da entrada' : 'do pagamento'} por escrito.`);
    const valDac = est.tipo === 'entrada_parcelas' ? entrada : total;
    item(`6.${s6++}.`, `Caso o veículo não seja entregue no prazo previsto, não atenda às condições do Anexo I ou apresente qualquer irregularidade que impeça sua transferência, o CONTRATANTE deverá, em até 05 (cinco) dias úteis contados da notificação da CONTRATADA, sanar a pendência ou pagar ${est.tipo === 'entrada_parcelas' ? 'a entrada' : 'o valor'} de ${brl(valDac)} (${reaisExtenso(valDac)}) em dinheiro, nos dados bancários do item 6.${iBanco}, ficando o prazo de implantação suspenso até a regularização.`);
  }
  const iInadVeic = s6 - 1;

  // 7 — Prazo
  clausula('DO PRAZO DE IMPLANTAÇÃO E RENOVAÇÃO');
  item('7.1.', `O prazo para a completa implantação da estrutura ${nacional ? 'offshore e nacional' : 'offshore'} objeto deste contrato será de ${qtd(prazo)} dias, contados a partir da data de assinatura do presente instrumento, desde que todas as condições abaixo sejam integralmente atendidas:`);
  bullets([
    `Pagamento dos valores conforme estabelecido na Cláusula ${ORDINAL_CAP(IDX.pagamento - 1)}${dacao ? ', inclusive a efetivação da dação em pagamento nos termos do Anexo I' : ''};`,
    `Fornecimento tempestivo e completo de toda documentação necessária pelo CONTRATANTE, em conformidade com as exigências das Cláusulas Quarta e Quinta;`,
    'Aprovação pela instituição financeira responsável pela abertura das contas;',
    'Cumprimento de todas as demais obrigações previstas neste contrato pelas partes.',
  ]);
  item('7.2.', `Eventuais atrasos não imputáveis à CONTRATADA, incluindo, mas não se limitando a, demora no fornecimento de documentação, pendências na análise de compliance pelo banco${dacao ? ', pendências na dação do veículo' : ''} e casos fortuitos ou de força maior, suspenderão o prazo de ${qtd(prazo)} dias até a regularização da pendência.`);
  item('7.3.', 'Findo o prazo de implantação, o contrato perdurará por prazo indeterminado para fins de manutenção e suporte contínuo, podendo ser rescindido por qualquer parte mediante notificação prévia de 30 (trinta) dias.');
  item('7.4.', 'A CONTRATADA notificará formalmente o CONTRATANTE sobre a conclusão de cada etapa do processo, bem como sobre eventuais pendências que possam impactar o prazo total de implantação.');

  // 8 — Inadimplência
  clausula('DA INADIMPLÊNCIA');
  item('8.1.', 'As parcelas pagas em atraso estarão sujeitas a multa de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês, capitalizados anualmente, calculados sobre o valor em atraso.');
  paragrafo([{ t: 'Parágrafo Único: ', b: true }, { t: 'A inadimplência poderá resultar na suspensão parcial ou total dos serviços e plataformas até a regularização dos pagamentos e a retomada da adimplência do contrato.' }]);

  // 9 — Rescisão
  clausula('DA RESCISÃO');
  item('9.1.', `Em caso de cancelamento unilateral pelo CONTRATANTE após a abertura da estrutura objeto deste contrato, as parcelas vincendas terão seu vencimento antecipado e deverão ser quitadas pelo CONTRATANTE, devendo o comprovante de quitação ser encaminhado à CONTRATADA, anexo à notificação de cancelamento.${dacao ? ' A dação em pagamento já efetivada é irrevogável e não será desfeita.' : ''}`);

  // 10 — LGPD
  clausula('DA LGPD');
  item('10.1.', `O CONTRATANTE autoriza a CONTRATADA a compartilhar seus dados com empresas parceiras e homologadas${dacao ? `, inclusive com a adquirente indicada na Cláusula 6.${iAdq}` : ''}, exclusivamente para a execução dos serviços e produtos contratados${dacao ? ' e para a transferência do veículo' : ''}.`);
  paragrafo([{ t: 'Parágrafo Único: ', b: true }, { t: 'A CONTRATADA garante o armazenamento seguro dos dados do CONTRATANTE, com expresso consentimento deste, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).' }]);

  // 11 — Transparência
  clausula('DA TRANSPARÊNCIA E ISENÇÃO FINANCEIRA');
  item('11.1.', 'Fica expressamente pactuado entre as partes que nenhum ganho financeiro, sob qualquer forma (comissões, participações, bonificações, taxas adicionais não contratadas ou quaisquer outros proveitos), será auferido por terceiros, pela RNC, pelo Grupo Villela ou por quaisquer empresas de seu grupo econômico sobre as movimentações de recursos realizadas pelo CONTRATANTE na estrutura offshore objeto deste contrato, seja em contas bancárias, aplicações financeiras, operações de câmbio ou demais transações.');
  paragrafo([{ t: 'Parágrafo Único: ', b: true }, { t: `Qualquer descumprimento desta cláusula, caracterizado pelo recebimento de valores não contratuais ou não autorizados, sujeitará a CONTRATADA à devolução em dobro dos valores indevidamente cobrados, além de multa correspondente a 20% (vinte por cento) do valor total do contrato, sem prejuízo de outras sanções legais cabíveis.${dacao ? ` Não se enquadra nesta cláusula o recebimento do veículo dado em pagamento pela adquirente indicada na Cláusula 6.${iAdq}.` : ''}` }]);

  // 12 — Confidencialidade
  clausula('DA CONFIDENCIALIDADE');
  item('12.1.', 'As partes comprometem-se a manter caráter estritamente confidencial em relação a todas as informações, documentos, dados, estratégias, valores, estruturas e quaisquer outras matérias objeto ou relacionadas a este contrato, bem como às operações nele realizadas.');
  item('12.2.', 'A obrigação de confidencialidade estende-se a:');
  bullets(['Informações comerciais e financeiras;', 'Estruturas societárias e operacionais;', 'Dados de clientes e fornecedores;', 'Métodos, processos e tecnologias utilizadas;', 'Quaisquer outras informações identificadas como confidenciais.']);
  item('12.3.', 'A confidencialidade permanecerá vigente mesmo após o término do contrato, por prazo indeterminado.');
  item('12.4.', 'Excetuam-se da obrigação de confidencialidade as informações que:');
  bullets(['Sejam de conhecimento público;', 'Tenham sido legalmente obtidas de terceiros sem obrigação de confidencialidade;',
    `Sejam exigidas por determinação judicial ou regulatória específica${dacao ? ', ou necessárias à transferência do veículo perante o órgão de trânsito' : ''}.`]);
  item('12.5.', 'Em caso de violação desta cláusula, a parte infringente ficará sujeita ao pagamento de multa correspondente a 50% (cinquenta por cento) do valor total do contrato, sem prejuízo de outras medidas judiciais cabíveis.');

  // 13 — Disposições gerais
  clausula('DAS DISPOSIÇÕES GERAIS');
  let s13 = 1;
  if (anexoTipo) {
    item(`13.${s13++}.`, `O ${anexoNome} integra o presente contrato para todos os fins. Em caso de divergência, prevalecem as condições específicas do Anexo I quanto ${anexoTipo === 'veiculo' ? 'à dação do veículo' : 'à matéria nele tratada'}.`);
  }
  item(`13.${s13++}.`, 'A tolerância de qualquer das partes quanto ao descumprimento de obrigação da outra não importará novação ou renúncia de direitos.');
  item(`13.${s13++}.`, `As partes reconhecem como válida a assinatura deste instrumento${anexoTipo ? ' e de seu anexo' : ''} por meio eletrônico, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001.`);

  // 14 — Foro
  clausula('DO FORO');
  item('14.1.', 'Para dirimir quaisquer controvérsias oriundas do contrato, as partes elegem o foro da comarca de Porto Alegre/RS.');

  y -= 4;
  paragrafo('E por estarem assim justas e acordadas, as partes assinam o presente instrumento em duas vias de igual teor e forma, na presença de duas testemunhas.', { after: 14 });
  const contratanteAss = { nome, doc: fmtDoc(c.cpf_cnpj), rotuloDoc: isPJ ? 'CNPJ' : 'CPF' };
  assinaturas(local, dataTxt, contratanteAss, true);

  // ───────────────────────── Anexo I ─────────────────────────
  if (anexoTipo) {
    novaPagina();
    paragrafo([{ t: anexoNome.toUpperCase().replace('ANEXO I – ', 'ANEXO I – '), b: true }], { align: 'center', justify: false, after: 2 });
    paragrafo(`Parte integrante do Contrato de Prestação de Serviços nº ${numero}`, { align: 'center', justify: false, after: 16 });
    if (anexoTipo === 'veiculo') {
      const valDac = est.tipo === 'entrada_parcelas' ? entrada : total;
      const comoQue = est.tipo === 'entrada_parcelas' ? 'como entrada do contrato acima referido' : 'como pagamento do contrato acima referido';
      paragrafo([{ t: 'Pelo presente termo, ' }, { t: nome, b: true }, { t: `, ${isPJ ? 'CNPJ' : 'CPF'} nº ${fmtDoc(c.cpf_cnpj)} (` }, { t: 'CONTRATANTE', b: true }, { t: '), entrega em dação em pagamento à ' }, { t: CONTRATADA.nome, b: true }, { t: `, CNPJ nº ${CONTRATADA.cnpj} (` }, { t: 'CONTRATADA', b: true }, { t: `), o veículo abaixo descrito, ${comoQue}, nas seguintes condições:` }], { after: 10 });
      titulo('1. IDENTIFICAÇÃO DO VEÍCULO');
      const muni = limpa(v.municipio_registro);
      const ufDetran = ((muni.match(/\/\s*([A-Za-z]{2})\b/) || [])[1] || limpa(c.estado)).toUpperCase();
      const linhasV: [string, string][] = [
        ['Marca / Modelo / Versão', limpa(v.marca_modelo).toUpperCase()],
        ['Espécie / Tipo', limpa(v.especie_tipo).toUpperCase()],
        ['Carroceria', limpa(v.carroceria).toUpperCase()],
        ['Ano fabricação / modelo', [limpa(v.ano_fabricacao), limpa(v.ano_modelo)].filter(Boolean).join(' / ')],
        ['Placa', limpa(v.placa).toUpperCase()],
        ['RENAVAM', limpa(v.renavam)],
        ['Chassi', limpa(v.chassi).toUpperCase()],
        ['Motor', limpa(v.motor).toUpperCase()],
        ['Cor predominante', limpa(v.cor).toUpperCase()],
        ['Combustível', limpa(v.combustivel).toUpperCase()],
        ['Potência / Cilindrada', limpa(v.potencia).toUpperCase()],
        ['Número do CRV', limpa(v.crv)],
        ['Proprietário (CRLV)', `${nome} – ${isPJ ? 'CNPJ' : 'CPF'} ${fmtDoc(c.cpf_cnpj)}`],
        ['Município de registro', muni + (ufDetran && !/DETRAN/i.test(muni) ? ` – DETRAN-${ufDetran}` : '')],
      ];
      tabela([{ w: 160 }, { w: 285 }], linhasV.filter(([, val]) => val && val.trim()).map(([k, val]) => ({ cells: [k, val] })), 9.5);
      titulo('2. VALOR ATRIBUÍDO');
      item('2.1.', `As partes atribuem ao veículo o valor de ${brl(valDac)} (${reaisExtenso(valDac)}), aceito ${est.tipo === 'entrada_parcelas' ? 'como entrada do contrato' : 'como pagamento do contrato'}, condicionado ao cumprimento integral das condições deste Anexo.`);
      titulo('3. CONDIÇÕES OBRIGATÓRIAS DO BEM');
      item('3.1.', 'O CONTRATANTE declara e garante que o veículo será entregue em perfeitas condições de uso, conservação e funcionamento, compatíveis com seu ano e quilometragem, observado especialmente que:');
      bullets([
        'motor, câmbio, suspensão, freios, direção, sistema elétrico, ar-condicionado e demais componentes estejam em pleno e regular funcionamento;',
        'estrutura, carroceria, chassi, vidros, pneus (incluindo estepe) e interior estejam íntegros, sem avarias relevantes não informadas previamente por escrito;',
        'o veículo não tenha histórico de sinistro com perda total, origem em leilão, remarcação de chassi ou motor, nem adulteração de hodômetro;',
        'o veículo esteja livre e desembaraçado de quaisquer ônus, tais como alienação fiduciária, reserva de domínio, arrendamento, penhora, bloqueio judicial (RENAJUD), restrição administrativa ou tributária, busca e apreensão ou queixa de furto/roubo;',
        'estejam quitados o IPVA, o licenciamento, as taxas, as multas e quaisquer débitos vinculados ao veículo até a data da entrega;',
        'seja entregue com chave principal, chave reserva e manual do proprietário, se houver.',
      ]);
      item('3.2.', `Constatado, a qualquer tempo, que o veículo não atendia às condições acima na data da entrega, aplicar-se-á o disposto no item 6.${iInadVeic} do contrato, sem prejuízo da responsabilidade do CONTRATANTE por vícios ocultos (arts. 441 e seguintes do Código Civil) e pela evicção, hipótese em que se restabelece a obrigação de pagamento ${est.tipo === 'entrada_parcelas' ? 'da entrada' : 'do valor'} em dinheiro (art. 359 do Código Civil).`);
      titulo('4. ENTREGA');
      const pz = Number(v.prazo_entrega_dias) > 0 ? Number(v.prazo_entrega_dias) : 5;
      item('4.1.', `O veículo será entregue em até ${qtd(pz)} dias úteis contados da assinatura do contrato, em local a ser indicado pela CONTRATADA, mediante assinatura de Termo de Entrega e Recebimento com registro de data, hora e quilometragem.`);
      item('4.2.', 'No ato da entrega, o CONTRATANTE apresentará o CRLV-e vigente e os comprovantes de quitação de débitos, e assinará eletronicamente a ATPV-e conforme o item 5 abaixo.');
      titulo('5. TRANSFERÊNCIA E COMUNICAÇÃO DE VENDA');
      item('5.1.', `A ATPV-e (Autorização para Transferência de Propriedade do Veículo) e a comunicação de venda ao DETRAN${ufDetran ? '-' + ufDetran : ''} deverão ser feitas obrigatoriamente em nome da adquirente indicada:`);
      tabela([{ w: 110 }, { w: 335 }], [
        { cells: ['Razão social', ADQUIRENTE.nome] },
        { cells: ['CNPJ', ADQUIRENTE.cnpj] },
        { cells: ['Endereço', ADQUIRENTE.endereco] },
      ], 9.5);
      item('5.2.', 'A comunicação de venda deverá ser registrada pelo CONTRATANTE no ato da entrega ou, no máximo, em até 02 (dois) dias úteis, enviando o comprovante à CONTRATADA, em cumprimento ao art. 134 do Código de Trânsito Brasileiro. É vedada a emissão da ATPV-e ou da comunicação de venda em nome da CONTRATADA ou de qualquer outra pessoa que não a adquirente indicada.');
      item('5.3.', 'As despesas de transferência para a adquirente indicada serão de responsabilidade desta.');
      titulo('6. RESPONSABILIDADES ATÉ E APÓS A ENTREGA');
      item('6.1.', 'São de responsabilidade exclusiva do CONTRATANTE todos os débitos, multas, infrações de trânsito e respectivas pontuações, tributos e obrigações relativos ao veículo cujo fato gerador seja anterior à data e hora da entrega registradas no Termo de Entrega e Recebimento. Os posteriores serão de responsabilidade da adquirente indicada.');
      titulo('7. QUITAÇÃO');
      item('7.1.', est.tipo === 'entrada_parcelas'
        ? `Cumpridas todas as condições deste Anexo, a CONTRATADA dará ao CONTRATANTE quitação da entrada de ${brl(valDac)} (${reaisExtenso(valDac)}), permanecendo em vigor a obrigação de pagamento do saldo nos termos da Cláusula ${ORDINAL_CAP(IDX.pagamento - 1)}.`
        : `Cumpridas todas as condições deste Anexo, a CONTRATADA dará ao CONTRATANTE quitação do valor de ${brl(valDac)} (${reaisExtenso(valDac)}).`);
    } else {
      const blocos = String(c.anexo_texto || '').split(/\n\s*\n/).map((b) => b.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
      for (const b of blocos) paragrafo(b, { after: 8 });
    }
    y -= 6;
    assinaturas(local, dataTxt, contratanteAss, false);
  }

  return await doc.save();
}

// Próximo número sequencial no formato 000143/2026 (sequência anual)
export function proximoNumeroContrato(existentes: string[], ano: number): string {
  let max = 0;
  for (const n of existentes) {
    const m = String(n || '').match(/^(\d+)\/(\d{4})$/);
    if (m && Number(m[2]) === ano) max = Math.max(max, Number(m[1]));
  }
  return `${String(max + 1).padStart(6, '0')}/${ano}`;
}
