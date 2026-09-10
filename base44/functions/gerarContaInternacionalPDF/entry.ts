import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1';
import { winAnsi } from '../../shared/pdfWinAnsi.ts';

const MESES_PT = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function fmtDate(d: string | undefined): string {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function wrapText(text: string, f: any, size: number, maxW: number): string[] {
  const words = String(text || '').split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (f.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

const C = {
  dark:      rgb(0.08, 0.13, 0.22),
  navy:      rgb(0.10, 0.17, 0.30),
  teal:      rgb(0.0,  0.72, 0.60),
  tealDim:   rgb(0.0,  0.52, 0.43),
  accent:    rgb(0.20, 0.55, 0.90),
  gold:      rgb(0.95, 0.72, 0.18),
  black:     rgb(0.08, 0.08, 0.08),
  white:     rgb(1,    1,    1),
  gray:      rgb(0.50, 0.50, 0.50),
  grayLt:    rgb(0.70, 0.70, 0.70),
  sectionBg: rgb(0.93, 0.95, 0.97),
  lineSep:   rgb(0.85, 0.87, 0.90),
  ok:        rgb(0.0,  0.60, 0.45),
  indigo:    rgb(0.24, 0.30, 0.90),
};

const PW = 595, PH = 842;
const ML = 48, MR = 547, TW = MR - ML;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { rnc_id } = body;
    if (!rnc_id) return Response.json({ error: 'rnc_id obrigatorio' }, { status: 400 });

    const rnc = await base44.entities.RncContaInternacional.get(rnc_id);
    if (!rnc) return Response.json({ error: 'Formulario nao encontrado' }, { status: 404 });

    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    const fontBold = await doc.embedFont('Helvetica-Bold');
    const fontOblique = await doc.embedFont('Helvetica-Oblique');

    const isPJ = rnc.tipo_conta === 'PJ';

    // ─── CAPA ───
    const cover = doc.addPage([PW, PH]);
    cover.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: C.dark });
    cover.drawRectangle({ x: 0, y: 0, width: 6, height: PH, color: C.teal });
    cover.drawRectangle({ x: 0, y: PH - 6, width: PW, height: 6, color: C.teal });

    const lx = 44, ly = PH - 70;
    cover.drawRectangle({ x: lx, y: ly - 32, width: 26, height: 26, color: C.teal });
    cover.drawRectangle({ x: lx + 14, y: ly - 46, width: 20, height: 20, color: C.white, borderColor: C.teal, borderWidth: 1.5 });
    cover.drawText('VILLELA', { x: lx + 48, y: ly - 14, size: 20, font: fontBold, color: C.white });
    cover.drawText('EXCHANGE', { x: lx + 50, y: ly - 31, size: 9, font, color: C.tealDim });
    cover.drawLine({ start: { x: 44, y: PH - 82 }, end: { x: MR, y: PH - 82 }, thickness: 0.6, color: C.white });

    const cy = PH / 2 + 60;
    cover.drawText('CONTA', { x: 44, y: cy + 60, size: 52, font: fontBold, color: C.teal });
    cover.drawText('INTERNACIONAL', { x: 44, y: cy + 14, size: 28, font: fontBold, color: C.teal });
    cover.drawText('FORMULÁRIO DE ABERTURA DE CONTA', { x: 46, y: cy - 8, size: 10, font, color: C.tealDim });
    cover.drawLine({ start: { x: 44, y: cy - 20 }, end: { x: 280, y: cy - 20 }, thickness: 1.5, color: C.teal });

    cover.drawText(isPJ ? 'Conta Juridica — Pessoa Juridica' : 'Conta Pessoal — Pessoa Fisica', { x: 44, y: cy - 42, size: 18, font: fontBold, color: C.white });
    cover.drawText('Villela Exchange — Servicos Financeiros Internacionais', { x: 44, y: cy - 64, size: 10, font: fontOblique, color: C.accent });
    cover.drawText('Documento confidencial para uso interno e cadastro bancario.', { x: 44, y: cy - 82, size: 9, font, color: C.grayLt });

    const dataPreench = rnc.data_preenchimento ? new Date(rnc.data_preenchimento) : new Date();
    const dataFmt = `${String(dataPreench.getDate()).padStart(2,'0')} de ${MESES_PT[dataPreench.getMonth()]} de ${dataPreench.getFullYear()}`;

    cover.drawRectangle({ x: 0, y: 0, width: PW, height: 68, color: C.navy });
    cover.drawText('Modalidade:', { x: 44, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(isPJ ? 'PESSOA JURIDICA' : 'PESSOA FISICA', { x: 44, y: 30, size: 11, font: fontBold, color: C.white });
    cover.drawText('Emitido em:', { x: 320, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(dataFmt, { x: 320, y: 30, size: 11, font: fontBold, color: C.white });
    const docId = `CI-${rnc_id.slice(-6).toUpperCase()}`;
    cover.drawText('Ref.: ' + docId, { x: MR - font.widthOfTextAtSize('Ref.: ' + docId, 8), y: 10, size: 8, font, color: C.gray });

    // ─── HELPERS ───
    let page = doc.addPage([PW, PH]);
    let y = PH - 50;
    let pageNum = 1;

    function addFooter(pg: any, num: number) {
      pg.drawLine({ start: { x: ML, y: 38 }, end: { x: MR, y: 38 }, thickness: 0.5, color: C.lineSep });
      pg.drawRectangle({ x: 0, y: 0, width: 4, height: PH, color: C.teal });
      pg.drawText('Conta Internacional — Formulario de Abertura | Villela Exchange', { x: ML, y: 24, size: 7.5, font, color: C.gray });
      const pStr = 'Pag. ' + num;
      pg.drawText(pStr, { x: MR - font.widthOfTextAtSize(pStr, 7.5), y: 24, size: 7.5, font, color: C.gray });
    }
    addFooter(page, pageNum);

    function addHeader(pg: any) {
      pg.drawRectangle({ x: ML, y: PH - 36, width: 12, height: 12, color: C.teal });
      pg.drawRectangle({ x: ML + 8, y: PH - 42, width: 9, height: 9, color: C.white, borderColor: C.teal, borderWidth: 1 });
      pg.drawText('VILLELA EXCHANGE', { x: ML + 26, y: PH - 30, size: 8, font: fontBold, color: C.dark });
      pg.drawText('Conta Internacional — Formulario de Abertura', { x: ML + 26, y: PH - 41, size: 7, font, color: C.gray });
      pg.drawLine({ start: { x: ML, y: PH - 48 }, end: { x: MR, y: PH - 48 }, thickness: 0.5, color: C.lineSep });
    }
    addHeader(page);

    function nextLine(extra = 0) {
      y -= 14 + extra;
      if (y < 55) {
        addFooter(page, pageNum);
        pageNum++;
        page = doc.addPage([PW, PH]);
        addHeader(page);
        addFooter(page, pageNum);
        y = PH - 62;
      }
    }

    function dt(text: string, x: number, sz: number, f: any, col = C.black) {
      if (y < 55) {
        addFooter(page, pageNum);
        pageNum++;
        page = doc.addPage([PW, PH]);
        addHeader(page);
        addFooter(page, pageNum);
        y = PH - 62;
      }
      page.drawText(winAnsi(String(text || '')), { x, y, size: sz, font: f, color: col });
    }

    function secao(label: string) {
      if (y < 90) {
        addFooter(page, pageNum);
        pageNum++;
        page = doc.addPage([PW, PH]);
        addHeader(page);
        addFooter(page, pageNum);
        y = PH - 62;
      }
      y -= 8;
      page.drawRectangle({ x: ML, y: y - 5, width: TW, height: 17, color: C.sectionBg });
      page.drawRectangle({ x: ML, y: y - 5, width: 3, height: 17, color: C.teal });
      page.drawText(winAnsi(label), { x: ML + 9, y: y + 2, size: 8.5, font: fontBold, color: C.dark });
      y -= 20;
    }

    function campo(label: string, value: string | undefined | null) {
      const hasVal = value && String(value).trim();
      const v = hasVal ? winAnsi(String(value)) : '';
      const lbW = fontBold.widthOfTextAtSize(label + ': ', 9);
      dt(label + ':', ML, 9, fontBold, C.black);
      if (hasVal) {
        const vLines = wrapText(v, font, 9, TW - lbW - 4);
        dt(vLines[0], ML + lbW, 9, font, C.black);
        for (let i = 1; i < vLines.length; i++) { nextLine(); dt(vLines[i], ML + lbW, 9, font, C.black); }
      } else {
        page.drawLine({ start: { x: ML + lbW, y: y - 1 }, end: { x: MR - 20, y: y - 1 }, thickness: 0.4, color: C.grayLt });
      }
      page.drawLine({ start: { x: ML, y: y - 6 }, end: { x: MR, y: y - 6 }, thickness: 0.3, color: C.lineSep });
      nextLine(3);
    }

    // ─── CONTEÚDO ───
    y = PH - 62;
    const titDoc = isPJ ? 'QUESTIONARIO DE ABERTURA DE CONTA JURIDICA' : 'QUESTIONARIO DE ABERTURA DE CONTA PESSOAL';
    const titW = fontBold.widthOfTextAtSize(titDoc, 12);
    dt(titDoc, (PW - titW) / 2, 12, fontBold, C.teal);
    page.drawLine({ start: { x: (PW - titW) / 2, y: y - 1 }, end: { x: (PW - titW) / 2 + titW, y: y - 1 }, thickness: 0.7, color: C.teal });
    y -= 16;

    const dsW = font.widthOfTextAtSize(dataFmt, 8.5);
    dt(dataFmt, MR - dsW, 8.5, font, C.gray);
    y -= 22;

    // ── SECAO 1: INFORMACOES DA CONTA ──
    secao('SECAO 1 — INFORMACOES DA CONTA');

    if (isPJ) {
      campo('Nome Completo da Empresa', rnc.secao1_pj_razao_social);
      campo('CNPJ/EIN', rnc.secao1_pj_cnpj);
    }
    campo('Tipo de Conta', rnc.secao1_tipo_conta);
    campo('Proposito da Conta nos EUA', rnc.secao1_proposito);
    y -= 4;

    secao('DEPOSITO INICIAL');
    campo('Nome do Remetente', rnc.secao1_deposito_remetente);
    campo('Nome do Banco', rnc.secao1_deposito_banco);
    campo('Valor do Deposito', rnc.secao1_deposito_valor);
    campo('Origem dos Fundos', rnc.secao1_origem_fundos);
    y -= 4;

    secao('BANCOS EXISTENTES DO TITULAR');
    const bancos = rnc.secao1_bancos_existentes || [];
    if (bancos.length === 0) {
      dt('Nenhum banco informado.', ML, 9, fontOblique, C.gray);
      nextLine(8);
    } else {
      bancos.forEach((b: any, i: number) => {
        const txt = `${i + 1}. ${b.nome_banco || '—'} | Pais: ${b.pais || '—'} | Tipo: ${b.tipo_conta || '—'}`;
        dt(txt, ML + 4, 9, font, C.black);
        nextLine(4);
      });
    }
    y -= 4;

    secao('DADOS DE CONTATO DA CONTA');
    campo('E-mail', rnc.secao1_email);
    campo('Telefone Escritorio 1', rnc.secao1_telefone_escritorio1);
    campo('Telefone Escritorio 2', rnc.secao1_telefone_escritorio2);
    campo('Celular', rnc.secao1_celular);
    campo('Endereco para Correspondencias', rnc.secao1_endereco_correspondencia);
    y -= 4;

    secao('ASSINANTES E PREFERENCIAS');
    const assList = rnc.secao1_assinantes || [];
    if (assList.length > 0) {
      dt('Assinantes da conta:', ML, 9, fontBold, C.black);
      nextLine(4);
      assList.forEach((a: string, i: number) => {
        dt(`  ${i + 1}. ${a}`, ML + 4, 9, font, C.black);
        nextLine(3);
      });
    }
    campo('Tipo de Assinatura', rnc.secao1_assinatura_tipo);
    campo('Deseja Talao de Cheques', rnc.secao1_talao_cheques === 'sim' ? 'Sim' : rnc.secao1_talao_cheques === 'nao' ? 'Nao' : '');
    campo('Deseja Cartao de Debito', rnc.secao1_cartao_debito === 'sim' ? 'Sim' : rnc.secao1_cartao_debito === 'nao' ? 'Nao' : '');
    y -= 4;

    // ── PJ EXTRA ──
    if (isPJ) {
      secao('INFORMACOES ADICIONAIS DA EMPRESA (PJ)');
      campo('Linha de Negocios da Empresa', rnc.secao1_pj_linha_negocios);
      campo('Numero de Empregados', rnc.secao1_pj_num_empregados);
      campo('Produtos e Servicos', rnc.secao1_pj_produtos_servicos);
      campo('Pais de Operacao', rnc.secao1_pj_pais_operacao);
      campo('Receita Bruta Ultimo Ano (USD)', rnc.secao1_pj_receita_bruta ? `$ ${rnc.secao1_pj_receita_bruta}` : '');
      campo('Prospecao de Receita (empresa nova)', rnc.secao1_pj_prospeccao_receita ? `$ ${rnc.secao1_pj_prospeccao_receita}` : '');
      y -= 4;

      const clientes = rnc.secao1_pj_clientes || [];
      if (clientes.length > 0) {
        secao('CLIENTES QUE ENVIARAO PAGAMENTOS (PJ)');
        clientes.forEach((c: any, i: number) => {
          dt(`${i + 1}. ${c.nome || '—'} | Pais: ${c.pais || '—'}`, ML + 4, 9, font, C.black);
          nextLine(4);
        });
        y -= 4;
      }

      const fornecedores = rnc.secao1_pj_fornecedores || [];
      if (fornecedores.length > 0) {
        secao('FORNECEDORES QUE SERAO PAGOS PELA CONTA (PJ)');
        fornecedores.forEach((f: any, i: number) => {
          dt(`${i + 1}. ${f.nome || '—'} | Pais: ${f.pais || '—'}`, ML + 4, 9, font, C.black);
          nextLine(4);
        });
        y -= 4;
      }

      const acionistas = rnc.secao1_pj_acionistas || [];
      if (acionistas.length > 0) {
        secao('ACIONISTAS E PARTICIPACAO SOCIETARIA (PJ)');
        acionistas.forEach((a: any, i: number) => {
          dt(`${i + 1}. ${a.nome || '—'} — ${a.percentual != null ? a.percentual + '%' : '—'}`, ML + 4, 9, font, C.black);
          nextLine(4);
        });
        y -= 4;
      }
    }

    // ── SECAO 2: ASSINANTES AUTORIZADOS ──
    const secao2 = rnc.secao2_assinantes || [];
    if (secao2.length > 0) {
      for (let i = 0; i < secao2.length; i++) {
        const a = secao2[i];
        secao(`SECAO 2 — ASSINANTE AUTORIZADO ${i + 1}${a.nome ? ': ' + a.nome.toUpperCase() : ''}`);
        campo('Nome Completo', a.nome);
        campo('E-mail', a.email);
        campo('Telefone Residencia', a.telefone_residencia);
        campo('Telefone Celular', a.telefone_celular);
        campo('Telefone Escritorio', a.telefone_escritorio);
        campo('Endereco de Correspondencia', a.endereco_correspondencia);
        campo('Nome da Empresa', a.nome_empresa);
        campo('Atividade da Empresa', a.atividade_empresa);
        campo('Titulo/Posicao na Empresa', a.titulo_posicao);
        campo('Tipo de Emprego', a.tipo_emprego);
        campo('Salario Anual (USD)', a.salario_anual_usd ? `$ ${a.salario_anual_usd}` : '');
        campo('Outra Fonte de Renda', a.outra_fonte_renda);
        campo('Valor Outra Renda (USD)', a.valor_outra_renda ? `$ ${a.valor_outra_renda}` : '');
        campo('Explicacao Heranca', a.explicacao_heranca);
        campo('Pais de Nascimento', a.pais_nascimento);
        campo('Possui Dupla Nacionalidade?', a.dupla_nacionalidade === 'sim' ? 'SIM' : a.dupla_nacionalidade === 'nao' ? 'NAO' : '');
        campo('Numero do Passaporte', a.numero_passaporte);
        if (a.dupla_nacionalidade === 'sim') {
          campo('Pais da 2a Nacionalidade', a.pais_segunda_nacionalidade);
        }
        campo('Ficou +182 dias nos EUA (ultimo ano)?', a.mais_182_dias_eua === 'sim' ? 'SIM — necessario W9' : a.mais_182_dias_eua === 'nao' ? 'NAO' : '');
        campo('Ficou media +122 dias nos EUA (3 anos)?', a.mais_122_dias_eua_3anos === 'sim' ? 'SIM — necessario W9' : a.mais_122_dias_eua_3anos === 'nao' ? 'NAO' : '');
        if (a.mais_182_dias_eua === 'sim' || a.mais_122_dias_eua_3anos === 'sim') {
          campo('Endereco/Telefone nos EUA', a.endereco_eua);
        }
        y -= 6;
      }
    }

    // ── SECAO 3: TITULAR / BENEFICIARIOS (PF) ──
    if (!isPJ) {
      secao('SECAO 3 — DADOS DO TITULAR (CONTA PESSOAL)');
      campo('Nome Completo', rnc.secao3_nome);
      campo('CPF', rnc.secao3_cpf);
      campo('Data de Nascimento', rnc.secao3_nascimento ? fmtDate(rnc.secao3_nascimento) : '');
      campo('Nacionalidade', rnc.secao3_nacionalidade);
      campo('E-mail', rnc.secao3_email);
      campo('Telefone', rnc.secao3_telefone);
      campo('Número do Passaporte', rnc.secao3_passaporte);
      y -= 4;

      const benef = rnc.secao3_beneficiarios || [];
      if (benef.length > 0) {
        secao('BENEFICIARIOS DA CONTA (em caso de falecimento)');
        dt('Nome Completo', ML + 4, 8, fontBold, C.dark);
        dt('Data de Nascimento', ML + 220, 8, fontBold, C.dark);
        dt('Parentesco', ML + 360, 8, fontBold, C.dark);
        nextLine(4);
        benef.forEach((b: any) => {
          dt(b.nome_completo || '—', ML + 4, 8.5, font, C.black);
          dt(b.data_nascimento ? fmtDate(b.data_nascimento) : '—', ML + 220, 8.5, font, C.black);
          dt(b.parentesco || '—', ML + 360, 8.5, font, C.black);
          nextLine(3);
        });
        y -= 6;
      }
    }

    // ── DOCUMENTAÇÃO ──
    const docs = rnc.documentos || [];
    if (docs.length > 0) {
      secao('DOCUMENTACAO APRESENTADA');
      for (const d of docs) {
        const recebido = d.recebido === true;
        const statusTxt = recebido ? '[OK] RECEBIDO' : (d.obrigatorio ? '[!] PENDENTE (obrigatorio)' : '- Nao aplicavel');
        const statusCol = recebido ? C.ok : (d.obrigatorio ? C.gold : C.grayLt);
        const stW2 = fontBold.widthOfTextAtSize(statusTxt, 8);
        const descLines = wrapText(winAnsi(d.descricao || ''), font, 9, TW - stW2 - 16);
        dt(descLines[0] || '', ML + 4, 9, font, C.black);
        page.drawText(statusTxt, { x: MR - stW2, y, size: 8, font: fontBold, color: statusCol });
        for (let i = 1; i < descLines.length; i++) { nextLine(2); dt(descLines[i], ML + 4, 9, font, C.black); }
        if (recebido && d.nome_arquivo) { nextLine(2); dt('   Arquivo: ' + d.nome_arquivo, ML + 4, 7.5, fontOblique, C.gray); }
        page.drawLine({ start: { x: ML, y: y - 5 }, end: { x: MR, y: y - 5 }, thickness: 0.25, color: C.lineSep });
        nextLine(5);
      }
      y -= 4;
    }

    // ── OBSERVAÇÕES ──
    if (rnc.observacoes) {
      secao('OBSERVACOES');
      const obsLines = wrapText(rnc.observacoes, font, 9, TW);
      for (const ln of obsLines) { dt(ln, ML + 4, 9, font, C.black); nextLine(2); }
      y -= 6;
    }

    // ── METADADOS ──
    secao('METADADOS');
    if (rnc.preenchido_por) campo('Preenchido por', rnc.preenchido_por);
    if (rnc.data_preenchimento) campo('Data de preenchimento', new Date(rnc.data_preenchimento).toLocaleString('pt-BR'));
    y -= 6;

    // ── ASSINATURA ──
    if (y < 130) {
      addFooter(page, pageNum);
      pageNum++;
      page = doc.addPage([PW, PH]);
      addHeader(page);
      addFooter(page, pageNum);
      y = PH - 62;
    }
    y -= 16;
    const declTxt = 'Declaro que as informacoes fornecidas sao verdadeiras e estou ciente de que serao utilizadas para abertura da Conta Internacional.';
    const declLines = wrapText(declTxt, fontOblique, 8.5, TW);
    for (const ln of declLines) { dt(ln, ML, 8.5, fontOblique, C.gray); nextLine(2); }
    y -= 20;
    page.drawLine({ start: { x: ML, y }, end: { x: ML + 190, y }, thickness: 0.6, color: C.dark });
    page.drawLine({ start: { x: 320, y }, end: { x: MR, y }, thickness: 0.6, color: C.dark });
    y -= 12;
    dt(rnc.secao1_pj_razao_social || rnc.secao3_nome || 'Titular / Contratante', ML, 8, font, C.gray);
    dt('Villela Exchange', 320, 8, font, C.gray);
    y -= 20;
    dt('Data: _____ / _____ / __________', ML, 8.5, font, C.gray);

    const pdfBytes = await doc.save();
    const uint8 = new Uint8Array(pdfBytes);
    let base64 = '';
    for (let i = 0; i < uint8.length; i += 8192) {
      base64 += String.fromCharCode(...uint8.slice(i, i + 8192));
    }
    const nomeArquivo = `Conta_Internacional_${((rnc.secao1_pj_razao_social || rnc.secao3_nome) || 'formulario').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return Response.json({ pdf_base64: btoa(base64), filename: nomeArquivo, tipo: 'CONTA_INTERNACIONAL' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});