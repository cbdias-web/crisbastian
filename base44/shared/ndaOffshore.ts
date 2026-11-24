// Acordo de Confidencialidade e Não Divulgação (NDA) — Estruturação Internacional (Offshore).
// Modelo-base validado: NDA Villela Exchange × EDP Corretora de Seguros / Pereira Imobiliária (nov/2026).
// Variáveis: partes do CLIENTE (1 ou mais, PF ou PJ), multa, vigência, sigilo pós-vigência,
// não evasão, foro, local e data. O texto das cláusulas é o do modelo validado.
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';
import { winAnsi } from './pdfWinAnsi.ts';
import { inteiroExtenso, reaisExtenso, brl, fmtDoc } from './contratoOffshore.ts';

export type ParteNda = {
  tipo?: 'PF' | 'PJ';
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  natureza?: string;          // ex.: "sociedade simples limitada" (PJ)
  endereco?: string;          // logradouro, número e complemento
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  representante?: string;     // PJ
  representante_cargo?: string; // ex.: "sócio administrador"
  representante_tratamento?: string; // "Sr." | "Sra."
  nacionalidade?: string;     // PF
  estado_civil?: string;      // PF
  profissao?: string;         // PF
  genero?: 'M' | 'F';         // PF (concordância)
  sigla?: string;             // como a parte é chamada no texto (ex.: "EDP")
};

export type ConfigNda = {
  multa?: number;
  vigencia_meses?: number;
  sigilo_anos?: number;
  nao_evasao_meses?: number;
  foro?: string;
  local?: string;
  data?: string; // AAAA-MM-DD; vazio = linha de data em branco
};

const RNC = {
  nome: 'RNC REDE NACIONAL DE CÂMBIO LTDA',
  fantasia: 'VILLELA EXCHANGE',
  cnpj: '57.847.120/0001-46',
  rodape: 'RNC Rede Nacional de Câmbio Ltda · CNPJ 57.847.120/0001-46 · Av. Padre Cacique, 320, Menino Deus, Porto Alegre/RS',
};
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ORD = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'];
const limpa = (s: any) => String(s ?? '').trim();
const dig = (s: any) => String(s ?? '').replace(/\D/g, '');
const fmtCep = (s: any) => { const d = dig(s); return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : limpa(s); };
const n = (v: number, fem = false) => `${v} (${inteiroExtenso(v, fem)})`;

export function siglaPadrao(p: ParteNda): string {
  if (limpa(p.sigla)) return limpa(p.sigla).toUpperCase();
  if (limpa(p.nome_fantasia)) return limpa(p.nome_fantasia).toUpperCase();
  const pal = limpa(p.nome).split(/\s+/).filter(Boolean);
  if (!pal.length) return 'CLIENTE';
  if (dig(p.cpf_cnpj).length === 11 || p.tipo === 'PF') return pal[0].toUpperCase();
  return pal[0].replace(/[^A-Za-zÀ-ú0-9&]/g, '').toUpperCase() || 'CLIENTE';
}

const listaE = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

// ───────────────────────── Layout ─────────────────────────
const PW = 595.28, PH = 841.89;
const ML = 62, MR = PW - 62, TW = MR - ML;
const TOPO = PH - 118, BASE = 84;
const FS = 10.2, LH = 15.2;
const AZUL = rgb(0.13, 0.17, 0.27), CINZA = rgb(0.45, 0.47, 0.52), TEXTO = rgb(0.1, 0.1, 0.12);
const FUNDO = rgb(0.9, 0.91, 0.93), BARRA = rgb(0.35, 0.38, 0.45), LINHA = rgb(0.7, 0.72, 0.76);

type Seg = { t: string; b?: boolean };

export async function gerarNdaOffshorePdf(partesIn: ParteNda[], cfgIn: ConfigNda = {}): Promise<Uint8Array> {
  const partes = (partesIn || []).filter((p) => limpa(p?.nome));
  if (!partes.length) throw new Error('Informe ao menos uma parte do CLIENTE.');
  const cfg = {
    multa: Number(cfgIn.multa) > 0 ? Number(cfgIn.multa) : 30000,
    vigencia: Number(cfgIn.vigencia_meses) > 0 ? Math.round(Number(cfgIn.vigencia_meses)) : 24,
    sigilo: Number(cfgIn.sigilo_anos) > 0 ? Math.round(Number(cfgIn.sigilo_anos)) : 5,
    naoEvasao: Number(cfgIn.nao_evasao_meses) > 0 ? Math.round(Number(cfgIn.nao_evasao_meses)) : 24,
    foro: limpa(cfgIn.foro) || 'Porto Alegre/RS',
    local: limpa(cfgIn.local) || 'Porto Alegre/RS',
    data: limpa(cfgIn.data),
  };
  const siglas = partes.map(siglaPadrao);
  const multiplas = partes.length > 1;
  const vias = partes.length + 1;
  const multaTxt = `${brl(cfg.multa)} (${reaisExtenso(cfg.multa)})`;

  const doc = await PDFDocument.create();
  doc.setTitle('Acordo de Confidencialidade e Não Divulgação — Estruturação Internacional');
  doc.setAuthor('RNC Rede Nacional de Câmbio Ltda — Villela Exchange');
  const S = await doc.embedFont('Times-Roman');
  const SB = await doc.embedFont('Times-Bold');
  const H = await doc.embedFont('Helvetica');
  const HB = await doc.embedFont('Helvetica-Bold');

  const paginas: any[] = [];
  let page: any = null;
  let y = TOPO;

  const cabecalho = (pg: any) => {
    pg.drawText('VILLELA', { x: ML, y: PH - 62, size: 13, font: HB, color: AZUL });
    pg.drawText('EXCHANGE', { x: ML + HB.widthOfTextAtSize('VILLELA ', 13), y: PH - 62, size: 13, font: H, color: CINZA });
    pg.drawText(winAnsi('RNC REDE NACIONAL DE CÂMBIO LTDA'), { x: ML, y: PH - 73, size: 6.6, font: H, color: CINZA });
    const t1 = 'DOCUMENTO CONFIDENCIAL';
    pg.drawText(t1, { x: MR - HB.widthOfTextAtSize(t1, 7.2), y: PH - 58, size: 7.2, font: HB, color: AZUL });
    const t2 = winAnsi('Acordo de Confidencialidade · Estruturação Internacional');
    pg.drawText(t2, { x: MR - H.widthOfTextAtSize(t2, 7), y: PH - 70, size: 7, font: H, color: CINZA });
    pg.drawLine({ start: { x: ML, y: PH - 80 }, end: { x: MR, y: PH - 80 }, thickness: 0.6, color: LINHA });
  };
  const novaPagina = () => {
    page = doc.addPage([PW, PH]);
    paginas.push(page);
    cabecalho(page);
    y = TOPO;
  };
  const garantir = (h: number) => { if (!page || y - h < BASE) novaPagina(); };

  // parágrafo justificado com trechos em negrito
  type Run = { t: string; f: any };
  const paragrafo = (segs: Seg[] | string, o: { indent?: number; size?: number; after?: number; justify?: boolean; align?: 'left' | 'center'; fonte?: 'serif' | 'sans'; cor?: any; keep?: number } = {}) => {
    const size = o.size || FS;
    const indent = o.indent || 0;
    const reg = o.fonte === 'sans' ? H : S;
    const bold = o.fonte === 'sans' ? HB : SB;
    const lista: Seg[] = typeof segs === 'string' ? [{ t: segs }] : segs;
    const palavras: Run[][] = [];
    let atual: Run[] = [];
    for (const s of lista) {
      const f = s.b ? bold : reg;
      for (const p of winAnsi(s.t).split(/( +)/)) {
        if (!p) continue;
        if (/^ +$/.test(p)) { if (atual.length) palavras.push(atual); atual = []; continue; }
        atual.push({ t: p, f });
      }
    }
    if (atual.length) palavras.push(atual);
    const larg = (w: Run[]) => w.reduce((a, r) => a + r.f.widthOfTextAtSize(r.t, size), 0);
    const esp = reg.widthOfTextAtSize(' ', size);
    const x0 = ML + indent, maxW = TW - indent;
    const linhas: Run[][][] = [];
    let linha: Run[][] = [], w = 0;
    for (const p of palavras) {
      const pw = larg(p);
      if (linha.length && w + esp + pw > maxW) { linhas.push(linha); linha = [p]; w = pw; } else { w += (linha.length ? esp : 0) + pw; linha.push(p); }
    }
    if (linha.length) linhas.push(linha);
    garantir(Math.min(linhas.length, 2) * LH + (o.keep || 0));
    linhas.forEach((ln, i) => {
      if (i > 0) garantir(LH);
      const ultima = i === linhas.length - 1;
      const conteudo = ln.reduce((a, p) => a + larg(p), 0);
      const gaps = ln.length - 1;
      let gap = esp;
      if ((o.justify ?? true) && !ultima && gaps > 0) { const extra = (maxW - conteudo) / gaps; if (extra < esp * 4) gap = extra; }
      let x = o.align === 'center' ? ML + (TW - conteudo - gaps * esp) / 2 : x0;
      ln.forEach((p, k) => {
        p.forEach((r, j) => {
          const fim = j === p.length - 1 && k < ln.length - 1;
          page.drawText(fim ? r.t + ' ' : r.t, { x, y, size, font: r.f, color: o.cor || TEXTO });
          x += r.f.widthOfTextAtSize(r.t, size);
        });
        x += gap;
      });
      y -= LH;
    });
    y -= o.after ?? 6;
  };
  const clausula = (num: number, titulo: string) => {
    garantir(LH * 4);
    y -= 4;
    paragrafo([{ t: `CLÁUSULA ${ORD[num - 1]} — ${titulo}`, b: true }], { fonte: 'sans', size: 9.6, justify: false, after: 4, cor: AZUL });
  };
  const item = (num: string, segs: Seg[] | string, after = 6) => paragrafo([{ t: `${num} ` }, ...(typeof segs === 'string' ? [{ t: segs }] : segs)], { after });
  const alinea = (letra: string, segs: Seg[] | string, after = 4) => paragrafo([{ t: `${letra}) `, b: true }, ...(typeof segs === 'string' ? [{ t: segs }] : segs)], { indent: 20, after });

  // ───────────────────────── Página 1 ─────────────────────────
  novaPagina();
  y = TOPO + 6;
  paragrafo([{ t: 'ACORDO DE CONFIDENCIALIDADE E NÃO DIVULGAÇÃO', b: true }], { fonte: 'sans', size: 16, justify: false, after: 0, cor: AZUL });
  y += 4;
  paragrafo('Non-Disclosure Agreement (NDA) · Estruturação empresarial no exterior (offshore) e respectiva nacionalização', { fonte: 'sans', size: 8.6, justify: false, after: 8, cor: CINZA });

  // quadro-resumo
  const resumo: [string, Seg[]][] = [
    ['OBJETO', [{ t: 'Sigilo sobre as informações trocadas na concepção, estruturação e implantação de estrutura empresarial no exterior e de suas ramificações no Brasil.' }]],
    ['NATUREZA', [{ t: 'Bilateral — as obrigações de sigilo são recíprocas.' }]],
    ['MULTA', [{ t: multaTxt, b: true }, { t: ' por infração, sem prejuízo de perdas e danos.' }]],
    ['VIGÊNCIA', [{ t: `${cfg.vigencia} meses, com sigilo sobrevivente por ${cfg.sigilo} ${cfg.sigilo === 1 ? 'ano' : 'anos'} após o término.` }]],
    ['FORO', [{ t: `Comarca de ${cfg.foro}.` }]],
  ];
  const colL = 92;
  for (const [rot, segs] of resumo) {
    // mede a altura da célula de valor
    const yAntes = y;
    const tmpPage = page;
    // desenha fundo depois de saber a altura: calcula linhas de forma aproximada pela largura
    const texto = winAnsi(segs.map((s) => s.t).join(''));
    const palavras = texto.split(' ');
    let l = '', nl = 1;
    for (const p of palavras) { const s = l ? l + ' ' + p : p; if (l && S.widthOfTextAtSize(s, 9.6) > TW - colL - 14) { nl++; l = p; } else l = s; }
    const h = nl * 13.4 + 9;
    tmpPage.drawRectangle({ x: ML, y: yAntes - h + 12, width: TW, height: h, color: FUNDO });
    tmpPage.drawRectangle({ x: ML, y: yAntes - h + 12, width: 2.4, height: h, color: BARRA });
    tmpPage.drawText(winAnsi(rot), { x: ML + 10, y: yAntes - 2, size: 7, font: HB, color: AZUL });
    // valor
    const ySalvo = y;
    y = yAntes - 2;
    const partesTxt: Run[] = [];
    void partesTxt;
    // valor com quebra simples (negrito preservado por trecho)
    let x = ML + colL, yy = y;
    for (const s of segs) {
      const f = s.b ? SB : S;
      for (const pal of winAnsi(s.t).split(' ')) {
        if (!pal) continue;
        const wpal = f.widthOfTextAtSize(pal, 9.6);
        if (x + wpal > MR - 8) { yy -= 13.4; x = ML + colL; }
        tmpPage.drawText(pal + ' ', { x, y: yy, size: 9.6, font: f, color: TEXTO });
        x += wpal + S.widthOfTextAtSize(' ', 9.6);
      }
    }
    y = ySalvo - h - 1.5;
  }
  y -= 12;

  // ───────────────────────── Das partes ─────────────────────────
  paragrafo([{ t: 'DAS PARTES', b: true }], { fonte: 'sans', size: 9.6, justify: false, after: 4, cor: AZUL });
  paragrafo([
    { t: RNC.nome, b: true }, { t: ', nome fantasia ' }, { t: RNC.fantasia, b: true },
    { t: `, pessoa jurídica de direito privado inscrita no CNPJ sob o nº ${RNC.cnpj}, com sede na Av. Padre Cacique, 320, térreo, Menino Deus, Porto Alegre/RS, neste ato representada na forma de seus atos constitutivos, doravante denominada ` },
    { t: 'VILLELA EXCHANGE', b: true }, { t: ';' },
  ]);
  partes.forEach((p, i) => {
    const pj = p.tipo ? p.tipo === 'PJ' : dig(p.cpf_cnpj).length === 14;
    const alias = multiplas ? siglas[i] : 'CLIENTE';
    const fim = i === partes.length - 1 ? '.' : (i === partes.length - 2 ? '; e' : ';');
    const endereco = [limpa(p.endereco), limpa(p.bairro), [limpa(p.cidade), limpa(p.estado)].filter(Boolean).join('/')].filter(Boolean).join(', ');
    const cep = fmtCep(p.cep);
    const segs: Seg[] = [{ t: limpa(p.nome).toUpperCase(), b: true }];
    if (pj) {
      if (limpa(p.nome_fantasia)) segs.push({ t: ', nome fantasia ' }, { t: limpa(p.nome_fantasia), b: false });
      const nat = limpa(p.natureza) || 'pessoa jurídica de direito privado';
      const rep = limpa(p.representante);
      const repTxt = rep
        ? `neste ato representada por seu ${limpa(p.representante_cargo) || 'representante legal'}, ${limpa(p.representante_tratamento) || 'Sr.'} ${rep}`
        : 'neste ato representada na forma de seus atos constitutivos';
      segs.push({ t: `, ${nat} inscrita no CNPJ sob o nº ${fmtDoc(p.cpf_cnpj) || '________________'}${endereco ? `, com sede na ${endereco}` : ''}${cep ? `, CEP ${cep}` : ''}, ${repTxt}, doravante denominada ` });
    } else {
      const f = p.genero === 'F';
      const qual = [limpa(p.nacionalidade), limpa(p.estado_civil), limpa(p.profissao)].filter(Boolean).map((s) => s.toLowerCase());
      segs.push({ t: `${qual.length ? ', ' + qual.join(', ') : ''}, ${f ? 'inscrita' : 'inscrito'} no CPF sob o nº ${fmtDoc(p.cpf_cnpj) || '______________'}${endereco ? `, ${f ? 'residente e domiciliada' : 'residente e domiciliado'} na ${endereco}` : ''}${cep ? `, CEP ${cep}` : ''}, doravante ${f ? 'denominada' : 'denominado'} ` });
    }
    segs.push({ t: alias, b: true }, { t: fim });
    paragrafo(segs);
  });
  if (multiplas) {
    paragrafo([
      { t: `${listaE(siglas)}, em conjunto, são denominados ` }, { t: 'CLIENTE', b: true },
      { t: '; VILLELA EXCHANGE e CLIENTE, em conjunto, ' }, { t: 'PARTES', b: true },
      { t: ' e, individualmente, ' }, { t: 'PARTE', b: true }, { t: '. A PARTE que fornece a informação é a ' },
      { t: 'REVELADORA', b: true }, { t: ' e a que a recebe, a ' }, { t: 'RECEPTORA', b: true }, { t: '.' },
    ]);
  } else {
    paragrafo([
      { t: 'VILLELA EXCHANGE e CLIENTE, em conjunto, ' }, { t: 'PARTES', b: true },
      { t: ' e, individualmente, ' }, { t: 'PARTE', b: true }, { t: '. A PARTE que fornece a informação é a ' },
      { t: 'REVELADORA', b: true }, { t: ' e a que a recebe, a ' }, { t: 'RECEPTORA', b: true }, { t: '.' },
    ]);
  }
  paragrafo('As PARTES, iniciando tratativas para avaliar e implementar o Projeto descrito a seguir, celebram o presente Acordo, que se regerá pelas cláusulas abaixo.');

  // ───────────────────────── Cláusulas ─────────────────────────
  clausula(1, 'DO OBJETO');
  item('1.1.', [{ t: 'Este Acordo disciplina o tratamento das Informações Confidenciais trocadas entre as PARTES no âmbito do estudo, concepção, estruturação e implantação de estrutura empresarial no exterior em favor do CLIENTE (' }, { t: 'Projeto', b: true }, { t: '), compreendendo, entre outros:' }]);
  alinea('a', 'a constituição ou aquisição de sociedades, holdings, fundos, fundações ou veículos patrimoniais em jurisdição estrangeira, bem como a abertura de contas bancárias, de custódia e de investimento no exterior;');
  alinea('b', [{ t: 'as ramificações nacionais da estrutura (' }, { t: 'nacionalização', b: true }, { t: '), tais como constituição ou alteração de sociedades no Brasil, reorganizações societárias, ingresso e retorno de recursos, registros perante o Banco Central do Brasil, operações de câmbio e obrigações declaratórias correlatas;' }]);
  alinea('c', 'o planejamento patrimonial, sucessório e de governança associado à estrutura.', 6);
  item('1.2.', 'A celebração deste Acordo não obriga as PARTES a contratar o Projeto, cuja eventual execução dependerá de instrumento próprio.');

  clausula(2, 'DAS INFORMAÇÕES CONFIDENCIAIS');
  item('2.1.', [{ t: 'Consideram-se ' }, { t: 'Informações Confidenciais', b: true }, { t: ' todos os dados e documentos, escritos, verbais ou eletrônicos, revelados antes ou depois da assinatura deste Acordo, incluindo: informações patrimoniais, fiscais, financeiras, societárias e familiares do CLIENTE; declarações de imposto de renda, contratos sociais e documentos pessoais; organogramas, jurisdições, veículos e fluxos propostos; metodologias, modelos, pareceres, propostas comerciais, custos e honorários; e a identidade de bancos, correspondentes, agentes e parceiros indicados pela VILLELA EXCHANGE.' }]);
  item('2.2.', 'Não são Informações Confidenciais as que, comprovadamente: (i) sejam ou se tornem públicas sem culpa da RECEPTORA; (ii) já fossem de conhecimento legítimo da RECEPTORA antes da revelação; (iii) sejam recebidas licitamente de terceiro sem dever de sigilo; ou (iv) sejam desenvolvidas de forma independente.');
  item('2.3.', 'A revelação exigida por lei, autoridade ou ordem judicial não configura infração, desde que limitada ao estritamente exigido e, quando permitido, comunicada previamente à REVELADORA.');

  clausula(3, 'DAS OBRIGAÇÕES DA RECEPTORA');
  item('3.1.', 'A RECEPTORA obriga-se a:', 4);
  alinea('a', 'utilizar as Informações Confidenciais exclusivamente para os fins do Projeto;');
  alinea('b', 'não divulgar, copiar, reproduzir ou transferir as Informações Confidenciais a terceiros sem autorização prévia e escrita da REVELADORA;');
  alinea('c', 'restringir o acesso a sócios, administradores, empregados e assessores (advogados, contadores, bancos, agentes registrados e correspondentes no exterior) que delas necessitem para o Projeto, assegurando que estejam vinculados a dever de sigilo equivalente e respondendo por seus atos;');
  alinea('d', 'adotar, para sua proteção, no mínimo o mesmo grau de cuidado que dispensa às próprias informações sigilosas, nunca inferior ao razoável;');
  alinea('e', 'comunicar à REVELADORA, em até 48 (quarenta e oito) horas, qualquer acesso indevido, perda ou divulgação de que tenha conhecimento, adotando as medidas para mitigar seus efeitos.', 6);
  item('3.2.', [{ t: 'Não evasão.', b: true }, { t: ` Durante a vigência deste Acordo e por ${n(cfg.naoEvasao)} meses após seu término, o CLIENTE não contratará, diretamente ou por interposta pessoa, bancos, correspondentes, agentes ou parceiros apresentados pela VILLELA EXCHANGE no âmbito do Projeto com o fim de executar, total ou parcialmente, a estrutura sem a participação da VILLELA EXCHANGE.` }]);

  clausula(4, 'DA CONFORMIDADE LEGAL E REGULATÓRIA');
  item('4.1.', 'As PARTES declaram que o Projeto será conduzido em estrita observância à legislação aplicável, em especial à Lei nº 14.754/2023 (tributação de aplicações e entidades no exterior), à Lei nº 14.286/2021 (mercado de câmbio e capitais estrangeiros), às normas do Banco Central do Brasil, inclusive quanto à declaração de Capitais Brasileiros no Exterior (CBE), e à Lei nº 9.613/1998 (prevenção à lavagem de dinheiro).');
  item('4.2.', 'O dever de sigilo aqui previsto não se presta, em nenhuma hipótese, à ocultação de bens, direitos ou valores, nem impede o cumprimento de obrigações declaratórias, fiscais, cambiais e de diligência (KYC) perante autoridades e instituições financeiras.');
  item('4.3.', 'O CLIENTE declara que os recursos e bens a serem alocados na estrutura têm origem lícita e se obriga a fornecer a documentação comprobatória que lhe for solicitada.');

  clausula(5, 'DA PROTEÇÃO DE DADOS PESSOAIS');
  item('5.1.', 'Os dados pessoais compartilhados serão tratados nos termos da Lei nº 13.709/2018 (LGPD), exclusivamente para as finalidades do Projeto, com medidas técnicas e administrativas aptas a protegê-los. A transferência internacional de dados, quando necessária à constituição da estrutura no exterior, observará os artigos 33 e seguintes da LGPD, ficando desde já ciente o titular de que tal transferência é indispensável à execução do Projeto.');

  clausula(6, 'DA PROPRIEDADE DAS INFORMAÇÕES');
  item('6.1.', 'As Informações Confidenciais permanecem de propriedade exclusiva da REVELADORA, não sendo conferida à RECEPTORA qualquer licença ou direito sobre elas. Os modelos, metodologias e desenhos de estrutura elaborados pela VILLELA EXCHANGE constituem propriedade intelectual sua e não poderão ser utilizados fora do Projeto.');

  clausula(7, 'DA VIGÊNCIA E DA DEVOLUÇÃO');
  item('7.1.', `Este Acordo vigora por ${n(cfg.vigencia)} meses a contar da assinatura. As obrigações de sigilo subsistirão por ${n(cfg.sigilo)} ${cfg.sigilo === 1 ? 'ano' : 'anos'} após o término da vigência ou, quanto a dados pessoais, patrimoniais e fiscais do CLIENTE, por prazo indeterminado.`);
  item('7.2.', 'Encerradas as tratativas ou mediante solicitação escrita, a RECEPTORA devolverá ou destruirá, em até 10 (dez) dias, as Informações Confidenciais em seu poder, ressalvada a guarda exigida por lei ou norma regulatória, que permanecerá sob sigilo.');

  clausula(8, 'DA MULTA');
  item('8.1.', [{ t: 'O descumprimento de qualquer obrigação deste Acordo sujeitará a PARTE infratora ao pagamento de multa de ' }, { t: multaTxt, b: true }, { t: ' por infração, corrigida pelo IPCA/IBGE desde a data da assinatura, exigível independentemente de prova de prejuízo.' }]);
  item('8.2.', 'A multa tem caráter não compensatório e não exclui a indenização suplementar por perdas e danos que excedam seu valor (art. 416, parágrafo único, do Código Civil), nem a adoção de medidas judiciais para fazer cessar a infração.');
  item('8.3.', `A PARTE responde pelas infrações cometidas por seus sócios, administradores, empregados e assessores.${multiplas ? ` Em relação ao CLIENTE, ${listaE(siglas)} respondem solidariamente.` : ''}`);

  clausula(9, 'DAS DISPOSIÇÕES GERAIS');
  item('9.1.', 'Este Acordo não cria vínculo societário, de exclusividade, mandato ou representação entre as PARTES, nem pode ser cedido sem anuência escrita da outra PARTE.');
  item('9.2.', 'A tolerância quanto ao descumprimento de qualquer cláusula não implica novação ou renúncia. A eventual invalidade de uma disposição não afeta as demais.');
  item('9.3.', 'As PARTES admitem a assinatura eletrônica deste instrumento, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020, e reconhecem-no como título executivo extrajudicial, dispensadas as testemunhas quando assinado eletronicamente (art. 784, III e § 4º, do Código de Processo Civil).');

  clausula(10, 'DO FORO');
  item('10.1.', `Fica eleito o foro da Comarca de ${cfg.foro} para dirimir quaisquer questões oriundas deste Acordo, com renúncia a qualquer outro, por mais privilegiado que seja.`);
  paragrafo(`E, por estarem justas e acordadas, as PARTES assinam o presente instrumento em ${n(vias, true)} vias de igual teor, ou eletronicamente.`, { after: 14 });

  // data e assinaturas
  const ano = cfg.data ? cfg.data.slice(0, 4) : String(new Date().getFullYear());
  let dataLinha = `${cfg.local}, ____ de ________________ de ${ano}.`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cfg.data)) {
    const d = new Date(cfg.data + 'T12:00:00');
    dataLinha = `${cfg.local}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}.`;
  }
  const blocos = [
    { nome: RNC.nome, l2: `VILLELA EXCHANGE · CNPJ ${RNC.cnpj}`, l3: 'Representante legal' },
    ...partes.map((p) => {
      const pj = p.tipo ? p.tipo === 'PJ' : dig(p.cpf_cnpj).length === 14;
      return {
        nome: limpa(p.nome).toUpperCase(),
        l2: `${pj ? 'CNPJ' : 'CPF'} ${fmtDoc(p.cpf_cnpj)}`,
        l3: pj ? (limpa(p.representante) ? `p. ${limpa(p.representante)}` : 'Representante legal') : '',
      };
    }),
  ];
  const linhasAss = Math.ceil(blocos.length / 2);
  garantir(40 + linhasAss * 92);
  paragrafo(dataLinha, { align: 'center', justify: false, after: 46 });
  const colW = 215;
  for (let r = 0; r < linhasAss; r++) {
    const par = blocos.slice(r * 2, r * 2 + 2);
    const xs = par.length === 2 ? [ML + 10, MR - 10 - colW] : [ML + (TW - colW) / 2];
    par.forEach((b, i) => {
      const x = xs[i], cx = x + colW / 2;
      page.drawLine({ start: { x, y }, end: { x: x + colW, y }, thickness: 0.6, color: TEXTO });
      const centro = (t: string, f: any, s: number, dy: number, c = TEXTO) => {
        const tt = winAnsi(t);
        page.drawText(tt, { x: cx - f.widthOfTextAtSize(tt, s) / 2, y: y - dy, size: s, font: f, color: c });
      };
      centro(b.nome, HB, 7.8, 11, AZUL);
      centro(b.l2, H, 7, 21, CINZA);
      if (b.l3) centro(b.l3, H, 7, 31, CINZA);
    });
    y -= 92;
  }

  // rodapé com "Página X de Y" e rubricas
  const total = paginas.length;
  const rubricas = 'Rubricas: ' + Array.from({ length: vias }, () => '________').join('  ');
  paginas.forEach((pg, i) => {
    pg.drawLine({ start: { x: ML, y: 52 }, end: { x: ML + 60, y: 52 }, thickness: 0.6, color: LINHA });
    pg.drawText(winAnsi(RNC.rodape), { x: ML, y: 42, size: 6.4, font: H, color: CINZA });
    pg.drawText(winAnsi(rubricas), { x: ML, y: 31, size: 6.4, font: H, color: CINZA });
    const t = `Página ${i + 1} de ${total}`;
    pg.drawText(winAnsi(t), { x: MR - H.widthOfTextAtSize(winAnsi(t), 7), y: 42, size: 7, font: H, color: CINZA });
  });

  return await doc.save();
}
