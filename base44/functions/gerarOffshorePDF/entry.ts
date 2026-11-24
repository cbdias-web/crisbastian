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

    const rnc = await base44.entities.RncOffshore.get(rnc_id);
    if (!rnc) return Response.json({ error: 'Formulario nao encontrado' }, { status: 404 });

    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    const fontBold = await doc.embedFont('Helvetica-Bold');
    const fontOblique = await doc.embedFont('Helvetica-Oblique');


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
    cover.drawText('OFFSHORE', { x: 44, y: cy + 60, size: 52, font: fontBold, color: C.teal });
    cover.drawText('CONSTITUICAO DE LLC', { x: 44, y: cy + 14, size: 28, font: fontBold, color: C.teal });
    cover.drawText('FORMULARIO DE DADOS E DOCUMENTOS', { x: 46, y: cy - 8, size: 10, font, color: C.tealDim });
    cover.drawLine({ start: { x: 44, y: cy - 20 }, end: { x: 280, y: cy - 20 }, thickness: 1.5, color: C.teal });

    cover.drawText(winAnsi(rnc.llc_nome_opcao1 ? rnc.llc_nome_opcao1 : (rnc.contratante_nome || 'Estrutura Internacional')), { x: 44, y: cy - 42, size: 18, font: fontBold, color: C.white });
    cover.drawText('Villela Exchange — Servicos Financeiros Internacionais', { x: 44, y: cy - 64, size: 10, font: fontOblique, color: C.accent });
    cover.drawText('Documento confidencial para uso interno e registro da empresa.', { x: 44, y: cy - 82, size: 9, font, color: C.grayLt });

    const dataPreench = rnc.data_preenchimento ? new Date(rnc.data_preenchimento) : new Date();
    const dataFmt = `${String(dataPreench.getDate()).padStart(2,'0')} de ${MESES_PT[dataPreench.getMonth()]} de ${dataPreench.getFullYear()}`;

    cover.drawRectangle({ x: 0, y: 0, width: PW, height: 68, color: C.navy });
    cover.drawText('Contratante:', { x: 44, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(winAnsi((rnc.contratante_nome || rnc.cliente_nome || '-').toUpperCase().slice(0, 40)), { x: 44, y: 30, size: 11, font: fontBold, color: C.white });
    cover.drawText('Emitido em:', { x: 320, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(dataFmt, { x: 320, y: 30, size: 11, font: fontBold, color: C.white });
    const docId = `OFF-${rnc_id.slice(-6).toUpperCase()}`;
    cover.drawText('Ref.: ' + docId, { x: MR - font.widthOfTextAtSize('Ref.: ' + docId, 8), y: 10, size: 8, font, color: C.gray });

    // ─── HELPERS ───
    let page = doc.addPage([PW, PH]);
    let y = PH - 50;
    let pageNum = 1;

    function addFooter(pg: any, num: number) {
      pg.drawLine({ start: { x: ML, y: 38 }, end: { x: MR, y: 38 }, thickness: 0.5, color: C.lineSep });
      pg.drawRectangle({ x: 0, y: 0, width: 4, height: PH, color: C.teal });
      pg.drawText('Offshore / LLC — Formulario de Constituicao | Villela Exchange', { x: ML, y: 24, size: 7.5, font, color: C.gray });
      const pStr = 'Pag. ' + num;
      pg.drawText(pStr, { x: MR - font.widthOfTextAtSize(pStr, 7.5), y: 24, size: 7.5, font, color: C.gray });
    }
    addFooter(page, pageNum);

    function addHeader(pg: any) {
      pg.drawRectangle({ x: ML, y: PH - 36, width: 12, height: 12, color: C.teal });
      pg.drawRectangle({ x: ML + 8, y: PH - 42, width: 9, height: 9, color: C.white, borderColor: C.teal, borderWidth: 1 });
      pg.drawText('VILLELA EXCHANGE', { x: ML + 26, y: PH - 30, size: 8, font: fontBold, color: C.dark });
      pg.drawText('Offshore / LLC — Formulario de Constituicao', { x: ML + 26, y: PH - 41, size: 7, font, color: C.gray });
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
    const titDoc = 'FORMULARIO DE CONSTITUICAO DE LLC';
    const titW = fontBold.widthOfTextAtSize(titDoc, 12);
    dt(titDoc, (PW - titW) / 2, 12, fontBold, C.teal);
    page.drawLine({ start: { x: (PW - titW) / 2, y: y - 1 }, end: { x: (PW - titW) / 2 + titW, y: y - 1 }, thickness: 0.7, color: C.teal });
    y -= 16;

    const dsW = font.widthOfTextAtSize(dataFmt, 8.5);
    dt(dataFmt, MR - dsW, 8.5, font, C.gray);
    y -= 22;
    const membros = (rnc.llc_membros || []).filter((m: any) => m && m.nome);
    const simNao = (v: any) => v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '';

    // ── SECAO 1: CONTRATANTE ──
    secao('SEÇÃO 1 — DADOS DO CONTRATANTE');
    campo('Nome Completo', rnc.contratante_nome);
    campo('CPF', rnc.contratante_cpf);
    campo('RG / CNH', rnc.contratante_rg);
    campo('Data de Nascimento', rnc.contratante_nascimento ? fmtDate(rnc.contratante_nascimento) : '');
    campo('Nacionalidade', rnc.contratante_nacionalidade);
    campo('Estado Civil', rnc.contratante_estado_civil);
    campo('Profissão', rnc.contratante_profissao);
    campo('Passaporte', rnc.contratante_passaporte);
    campo('E-mail', rnc.contratante_email);
    campo('Telefone', rnc.contratante_telefone);
    const endereco = [rnc.contratante_endereco, rnc.contratante_bairro, [rnc.contratante_cidade, rnc.contratante_estado].filter(Boolean).join('/'), rnc.contratante_cep ? 'CEP ' + rnc.contratante_cep : ''].filter((s: any) => s && String(s).trim()).join(' — ');
    campo('Endereço', endereco);
    y -= 4;

    // ── SECAO 2: LLC ──
    secao('SEÇÃO 2 — DADOS DA LLC');
    campo('Nome — 1ª opção', rnc.llc_nome_opcao1);
    campo('Nome — 2ª opção', rnc.llc_nome_opcao2);
    campo('Nome — 3ª opção', rnc.llc_nome_opcao3);
    campo('Atividade', rnc.llc_atividade);
    campo('Propósito da estrutura', rnc.llc_proposito);
    campo('Estrutura societária', rnc.llc_tipo_membros === 'multi' ? 'Multi-member (vários sócios)' : rnc.llc_tipo_membros === 'single' ? 'Single-member (sócio único)' : '');
    campo('Gestor (manager)', rnc.llc_gestor === 'contratante' ? `O próprio contratante${rnc.contratante_nome ? ' (' + rnc.contratante_nome + ')' : ''}` : rnc.llc_gestor === 'outro' ? (rnc.llc_gestor_nome || 'Outro') : '');
    y -= 4;

    secao('SÓCIOS (MEMBERS) E PARTICIPAÇÃO');
    if (rnc.llc_tipo_membros === 'single') {
      dt(`1. ${rnc.contratante_nome || 'Contratante'} — 100%`, ML + 4, 9, font, C.black);
      nextLine(6);
    } else if (membros.length === 0) {
      dt('Nenhum sócio informado.', ML, 9, fontOblique, C.gray);
      nextLine(8);
    } else {
      dt('Nome', ML + 4, 8, fontBold, C.dark);
      dt('Documento', ML + 240, 8, fontBold, C.dark);
      dt('Participação', ML + 400, 8, fontBold, C.dark);
      nextLine(4);
      membros.forEach((m: any, i: number) => {
        dt(`${i + 1}. ${m.nome}${m.tipo === 'PJ' ? ' (PJ)' : ''}`, ML + 4, 8.5, font, C.black);
        dt(m.documento || '—', ML + 240, 8.5, font, C.black);
        dt(m.percentual != null && m.percentual !== '' ? `${m.percentual}%` : '—', ML + 400, 8.5, font, C.black);
        nextLine(3);
      });
      const soma = membros.reduce((s: number, m: any) => s + (Number(m.percentual) || 0), 0);
      dt(`Total: ${soma}%`, ML + 400, 8.5, fontBold, Math.abs(soma - 100) < 0.01 ? C.ok : C.gold);
      nextLine(6);
    }
    y -= 4;

    campo('Empresa sócia da LLC?', simNao(rnc.socio_pj));
    if (rnc.socio_pj === 'sim') {
      campo('Razão Social da empresa sócia', rnc.socio_pj_razao_social);
      campo('CNPJ da empresa sócia', rnc.socio_pj_cnpj);
    }
    y -= 4;

    // ── SECAO 3: PERFIL ──
    secao('SEÇÃO 3 — PERFIL DA OPERAÇÃO');
    campo('Movimentação prevista', rnc.perfil_movimentacao_prevista);
    campo('Países de operação', rnc.perfil_paises);
    campo('Pessoa politicamente exposta (PEP)', simNao(rnc.perfil_pep));
    if (rnc.perfil_pep === 'sim') campo('Detalhe PEP', rnc.perfil_pep_detalhe);
    y -= 4;

    // ── DOCUMENTAÇÃO ──
    const docs = rnc.documentos || [];
    if (docs.length > 0) {
      secao('DOCUMENTAÇÃO APRESENTADA');
      for (const d of docs) {
        const recebido = d.recebido === true;
        const statusTxt = recebido ? '[OK] RECEBIDO' : (d.obrigatorio ? '[!] PENDENTE (obrigatorio)' : '- Nao enviado (opcional)');
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

    // ── DECLARAÇÕES ──
    secao('DECLARAÇÕES DO CONTRATANTE');
    campo('Veracidade das informações', rnc.declaracao_veracidade ? 'Confirmada' : 'Pendente');
    campo('Autorização de uso dos dados (LGPD)', rnc.autorizacao_lgpd ? 'Concedida' : 'Pendente');
    if (rnc.declaracoes_aceitas_em) campo('Aceite registrado em', new Date(rnc.declaracoes_aceitas_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    y -= 4;

    if (rnc.observacoes) {
      secao('OBSERVAÇÕES');
      const obsLines = wrapText(winAnsi(rnc.observacoes), font, 9, TW);
      for (const ln of obsLines) { dt(ln, ML + 4, 9, font, C.black); nextLine(2); }
      y -= 6;
    }

    secao('METADADOS');
    if (rnc.preenchido_por) campo('Preenchido por', rnc.preenchido_por);
    if (rnc.data_preenchimento) campo('Data de preenchimento', new Date(rnc.data_preenchimento).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    y -= 6;

    if (y < 130) {
      addFooter(page, pageNum);
      pageNum++;
      page = doc.addPage([PW, PH]);
      addHeader(page);
      addFooter(page, pageNum);
      y = PH - 62;
    }
    y -= 16;
    const declTxt = 'Declaro que as informações fornecidas são verdadeiras e estou ciente de que serão utilizadas para a constituição e registro da LLC, autorizando seu tratamento nos termos da LGPD (Lei 13.709/2018).';
    const declLines = wrapText(winAnsi(declTxt), fontOblique, 8.5, TW);
    for (const ln of declLines) { dt(ln, ML, 8.5, fontOblique, C.gray); nextLine(2); }
    y -= 20;
    page.drawLine({ start: { x: ML, y }, end: { x: ML + 190, y }, thickness: 0.6, color: C.dark });
    page.drawLine({ start: { x: 320, y }, end: { x: MR, y }, thickness: 0.6, color: C.dark });
    y -= 12;
    dt(rnc.contratante_nome || 'Contratante', ML, 8, font, C.gray);
    dt('Villela Exchange', 320, 8, font, C.gray);
    y -= 20;
    dt('Data: _____ / _____ / __________', ML, 8.5, font, C.gray);

    const pdfBytes = await doc.save();
    const uint8 = new Uint8Array(pdfBytes);
    let base64 = '';
    for (let i = 0; i < uint8.length; i += 8192) {
      base64 += String.fromCharCode(...uint8.slice(i, i + 8192));
    }
    const nomeArquivo = `Offshore_LLC_${(rnc.contratante_nome || rnc.cliente_nome || 'formulario').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return Response.json({ pdf_base64: btoa(base64), filename: nomeArquivo, tipo: 'OFFSHORE_LLC' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
