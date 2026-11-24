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
