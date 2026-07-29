import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, degrees } from 'npm:pdf-lib@1.17.1';

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

// Colors
const C = {
  dark:     rgb(0.08, 0.13, 0.22),   // #141F38 — capa
  navy:     rgb(0.10, 0.17, 0.30),   // accent navy
  teal:     rgb(0.0,  0.72, 0.60),   // #00B89A — verde villela
  tealDim:  rgb(0.0,  0.52, 0.43),   // escuro
  accent:   rgb(0.20, 0.55, 0.90),   // #3390E6 — azul claro
  gold:     rgb(0.95, 0.72, 0.18),   // [!] pendente
  black:    rgb(0.08, 0.08, 0.08),
  white:    rgb(1,    1,    1),
  gray:     rgb(0.50, 0.50, 0.50),
  grayLt:   rgb(0.70, 0.70, 0.70),
  sectionBg:rgb(0.93, 0.95, 0.97),   // fundo leve das seções
  lineSep:  rgb(0.85, 0.87, 0.90),   // linha separadora
  ok:       rgb(0.0,  0.60, 0.45),
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

    const rnc = await base44.entities.RncCanalBancario.get(rnc_id);
    if (!rnc) return Response.json({ error: 'RNC nao encontrada' }, { status: 404 });

    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    const fontBold = await doc.embedFont('Helvetica-Bold');
    const fontOblique = await doc.embedFont('Helvetica-Oblique');

    // ─────────────────────────────────────────────────────────────────────
    // PÁGINA DE CAPA
    // ─────────────────────────────────────────────────────────────────────
    const cover = doc.addPage([PW, PH]);

    // Fundo escuro total
    cover.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: C.dark });

    // Barra teal lateral esquerda
    cover.drawRectangle({ x: 0, y: 0, width: 6, height: PH, color: C.teal });

    // Barra superior accent
    cover.drawRectangle({ x: 0, y: PH - 6, width: PW, height: 6, color: C.teal });

    // Bloco logo — canto superior esquerdo
    const lx = 44, ly = PH - 70;
    // Dois quadrados sobrepostos (ícone Villela Exchange)
    cover.drawRectangle({ x: lx, y: ly - 32, width: 26, height: 26, color: C.teal });
    cover.drawRectangle({ x: lx + 14, y: ly - 46, width: 20, height: 20, color: C.white, borderColor: C.teal, borderWidth: 1.5 });
    cover.drawText('VILLELA', { x: lx + 48, y: ly - 14, size: 20, font: fontBold, color: C.white });
    cover.drawText('EXCHANGE', { x: lx + 50, y: ly - 31, size: 9, font, color: C.tealDim });

    // Linha divisória após logo
    cover.drawLine({ start: { x: 44, y: PH - 82 }, end: { x: MR, y: PH - 82 }, thickness: 0.6, color: rgb(1,1,1) });

    // Bloco central — título principal do documento
    const cy = PH / 2 + 60;
    cover.drawText('RNC', { x: 44, y: cy + 60, size: 52, font: fontBold, color: C.teal });
    cover.drawText('CANAL BANCARIO', { x: 46, y: cy + 36, size: 11, font, color: C.tealDim });

    // Linha decorativa
    cover.drawLine({ start: { x: 44, y: cy + 24 }, end: { x: 220, y: cy + 24 }, thickness: 1.5, color: C.teal });

    // Subtítulo sofisticado
    cover.drawText('Formulario de Abertura de', { x: 44, y: cy - 2, size: 22, font: fontBold, color: C.white });
    cover.drawText('Canal Bancario', { x: 44, y: cy - 28, size: 22, font: fontBold, color: C.white });
    cover.drawText('Villela Exchange — Servicos Financeiros Internacionais', { x: 44, y: cy - 56, size: 10, font: fontOblique, color: C.accent });
    cover.drawText('Documento confidencial para uso interno e cadastro bancario.', { x: 44, y: cy - 74, size: 9, font, color: C.grayLt });

    // Tipo e data — bloco informativo inferior
    const tipoCover = rnc.tipo_canal === 'PJ' ? 'PESSOA JURIDICA' : 'PESSOA FISICA';
    const dataPreench = rnc.data_preenchimento ? new Date(rnc.data_preenchimento) : new Date();
    const dataFmt = `${String(dataPreench.getDate()).padStart(2,'0')} de ${MESES_PT[dataPreench.getMonth()]} de ${dataPreench.getFullYear()}`;

    // Caixa de info no rodapé da capa
    cover.drawRectangle({ x: 0, y: 0, width: PW, height: 68, color: C.navy });
    cover.drawText('Modalidade:', { x: 44, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(tipoCover, { x: 44, y: 30, size: 11, font: fontBold, color: C.white });

    const emitidoLabel = 'Emitido em:';
    cover.drawText(emitidoLabel, { x: 320, y: 46, size: 8, font: fontBold, color: C.tealDim });
    cover.drawText(dataFmt, { x: 320, y: 30, size: 11, font: fontBold, color: C.white });

    const docId = `RNC-${rnc_id.slice(-6).toUpperCase()}`;
    cover.drawText('Ref.: ' + docId, { x: MR - font.widthOfTextAtSize('Ref.: ' + docId, 8), y: 10, size: 8, font, color: C.gray });

    // ─────────────────────────────────────────────────────────────────────
    // PÁGINAS DE CONTEÚDO
    // ─────────────────────────────────────────────────────────────────────
    let page = doc.addPage([PW, PH]);
    let y = PH - 50;
    let pageNum = 1;

    function addFooter(pg: any, num: number) {
      // Linha
      pg.drawLine({ start: { x: ML, y: 38 }, end: { x: MR, y: 38 }, thickness: 0.5, color: C.lineSep });
      // Barra teal lateral
      pg.drawRectangle({ x: 0, y: 0, width: 4, height: PH, color: C.teal });
      // Rodapé esquerdo
      pg.drawText('RNC - Abertura de Canal Bancario | Villela Exchange', { x: ML, y: 24, size: 7.5, font, color: C.gray });
      // Rodapé direito — número de página
      const pStr = 'Pag. ' + num;
      pg.drawText(pStr, { x: MR - font.widthOfTextAtSize(pStr, 7.5), y: 24, size: 7.5, font, color: C.gray });
    }
    addFooter(page, pageNum);

    function addHeader(pg: any) {
      // Mini logo no cabeçalho das páginas de conteúdo
      pg.drawRectangle({ x: ML, y: PH - 36, width: 12, height: 12, color: C.teal });
      pg.drawRectangle({ x: ML + 8, y: PH - 42, width: 9, height: 9, color: C.white, borderColor: C.teal, borderWidth: 1 });
      pg.drawText('VILLELA EXCHANGE', { x: ML + 26, y: PH - 30, size: 8, font: fontBold, color: C.dark });
      pg.drawText('Canal Bancario — RNC', { x: ML + 26, y: PH - 41, size: 7, font, color: C.gray });
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
      page.drawText(String(text || ''), { x, y, size: sz, font: f, color: col });
    }

    // Título da seção — fundo colorido com barra teal esquerda
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
      page.drawText(label, { x: ML + 9, y: y + 2, size: 8.5, font: fontBold, color: C.dark });
      y -= 20;
    }

    // Campo: label bold + valor normal + linha separadora embaixo
    function campo(label: string, value: string | undefined | null) {
      const hasVal = value && String(value).trim();
      const v = hasVal ? String(value) : '';
      const lbW = fontBold.widthOfTextAtSize(label + ': ', 9);

      dt(label + ':', ML, 9, fontBold, C.black);
      if (hasVal) {
        const vLines = wrapText(v, font, 9, TW - lbW - 4);
        dt(vLines[0], ML + lbW, 9, font, C.black);
        for (let i = 1; i < vLines.length; i++) { nextLine(); dt(vLines[i], ML + lbW, 9, font, C.black); }
      } else {
        // linha preenchível
        page.drawLine({ start: { x: ML + lbW, y: y - 1 }, end: { x: MR - 20, y: y - 1 }, thickness: 0.4, color: C.grayLt });
      }
      // linha separadora sutil
      page.drawLine({ start: { x: ML, y: y - 6 }, end: { x: MR, y: y - 6 }, thickness: 0.3, color: C.lineSep });
      nextLine(3);
    }

    // ── Conteúdo ────────────────────────────────────────────────────────
    y = PH - 62;

    // TÍTULO DA PÁGINA DE CONTEÚDO
    const titDoc = 'REQUISICAO DE NOVO CANAL BANCARIO (RNC)';
    const titW = fontBold.widthOfTextAtSize(titDoc, 13);
    dt(titDoc, (PW - titW) / 2, 13, fontBold, C.teal);
    page.drawLine({ start: { x: (PW - titW) / 2, y: y - 1 }, end: { x: (PW - titW) / 2 + titW, y: y - 1 }, thickness: 0.7, color: C.teal });
    y -= 16;

    const subtit = rnc.tipo_canal === 'PJ' ? 'CANAL BANCARIO - PESSOA JURIDICA' : 'CANAL BANCARIO - PESSOA FISICA';
    const stW = font.widthOfTextAtSize(subtit, 8.5);
    dt(subtit, (PW - stW) / 2, 8.5, font, C.gray);
    y -= 6;

    const dataStr = `${String(dataPreench.getDate()).padStart(2,'0')} de ${MESES_PT[dataPreench.getMonth()]} de ${dataPreench.getFullYear()}`;
    const dsW = font.widthOfTextAtSize(dataStr, 8.5);
    dt(dataStr, MR - dsW, 8.5, font, C.gray);
    y -= 22;

    // ── DADOS DO TITULAR
    secao('DADOS DO TITULAR');
    campo(rnc.tipo_canal === 'PF' ? 'Nome Completo' : 'Razao Social', rnc.nome);
    campo(rnc.tipo_canal === 'PF' ? 'CPF' : 'CNPJ', rnc.cpf_cnpj);
    campo(rnc.tipo_canal === 'PF' ? 'RG' : 'Inscricao Estadual', rnc.rg_ie);
    campo(rnc.tipo_canal === 'PF' ? 'Data de Nascimento' : 'Data de Fundacao', rnc.nascimento_fundacao ? fmtDate(rnc.nascimento_fundacao) : '');
    campo('Nacionalidade', rnc.nacionalidade);
    campo(rnc.tipo_canal === 'PF' ? 'Profissao' : 'Natureza Juridica', rnc.profissao_natureza);
    if (rnc.tipo_canal === 'PF') {
      campo('Estado Civil', rnc.estado_civil);
      const dn = rnc.dupla_nacionalidade === 'sim' ? 'SIM' : (rnc.dupla_nacionalidade === 'nao' ? 'NAO' : '');
      campo('Possui Dupla Nacionalidade?', dn);
      campo('Media Salarial (R$)', rnc.media_salarial ? Number(rnc.media_salarial).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
    }
    if (rnc.tipo_canal === 'PJ') {
      campo('Quantidade de Funcionarios', rnc.quantidade_funcionarios != null ? String(rnc.quantidade_funcionarios) : '');
    }
    campo('E-mail', rnc.email);
    campo('Telefone / WhatsApp', rnc.telefone);
    y -= 4;

    // ── ENDEREÇO
    secao('ENDERECO');
    campo('CEP', rnc.cep);
    campo('Logradouro', rnc.endereco);
    campo('Bairro', rnc.bairro);
    campo('Cidade / Estado', (rnc.cidade || rnc.estado) ? `${rnc.cidade || ''} / ${rnc.estado || ''}` : '');
    y -= 4;

    // ── VOLUME DE OPERAÇÃO
    secao('VOLUME DE OPERACAO');
    const vol270 = rnc.operar_acima_270k
      ? 'SIM - Interesse em operar valores superiores a R$ 270.000,00 no periodo de 12 meses.'
      : 'NAO - Operacao dentro do limite de R$ 270.000,00 / 12 meses.';
    const vLines270 = wrapText(vol270, font, 9, TW - 4);
    for (const ln of vLines270) { dt(ln, ML, 9, font, rnc.operar_acima_270k ? C.gold : C.black); nextLine(2); }
    y -= 8;

    // ── DOCUMENTAÇÃO APRESENTADA
    secao('DOCUMENTACAO APRESENTADA');
    const docs = rnc.documentos || [];
    if (docs.length === 0) {
      dt('Nenhum documento registrado.', ML, 9, fontOblique, C.gray);
      nextLine(8);
    } else {
      for (const d of docs) {
        const recebido = d.recebido === true;
        const statusTxt = recebido ? '[OK] RECEBIDO' : (d.obrigatorio ? '[!] PENDENTE (obrigatorio)' : '- Nao aplicavel');
        const statusCol = recebido ? C.ok : (d.obrigatorio ? C.gold : C.grayLt);
        const stW2 = fontBold.widthOfTextAtSize(statusTxt, 8);
        const descLines = wrapText(d.descricao || '', font, 9, TW - stW2 - 16);
        dt(descLines[0] || '', ML + 4, 9, font, C.black);
        // Status alinhado à direita
        page.drawText(statusTxt, { x: MR - stW2, y, size: 8, font: fontBold, color: statusCol });
        for (let i = 1; i < descLines.length; i++) { nextLine(2); dt(descLines[i], ML + 4, 9, font, C.black); }
        if (recebido && d.nome_arquivo) {
          nextLine(2);
          dt('   Arquivo: ' + d.nome_arquivo, ML + 4, 7.5, fontOblique, C.gray);
        }
        page.drawLine({ start: { x: ML, y: y - 5 }, end: { x: MR, y: y - 5 }, thickness: 0.25, color: C.lineSep });
        nextLine(5);
      }
    }
    y -= 4;

    // ── SÓCIOS E ADMINISTRADORES (PJ)
    if (rnc.tipo_canal === 'PJ' && rnc.socios && rnc.socios.length > 0) {
      secao('SOCIOS E ADMINISTRADORES');
      for (let i = 0; i < rnc.socios.length; i++) {
        const s = rnc.socios[i];
        const socLabel = `${i + 1}. ${s.nome || '—'}  |  CPF: ${s.cpf || '—'}`;
        dt(socLabel, ML + 4, 9, fontBold, C.dark);
        nextLine(3);
        const ds = s.documento_url ? '[OK] Documento de identificacao anexado' : '[!] Documento de identificacao pendente';
        dt('   ' + ds, ML + 4, 8, fontOblique, s.documento_url ? C.ok : C.gold);
        nextLine(3);
        const cs = s.comprovante_url ? '[OK] Comprovante de endereco anexado' : '[!] Comprovante de endereco pendente';
        dt('   ' + cs, ML + 4, 8, fontOblique, s.comprovante_url ? C.ok : C.gold);
        nextLine(7);
      }
      y -= 4;
    }

    // ── OBSERVAÇÕES
    if (rnc.observacoes) {
      secao('OBSERVACOES');
      const obsLines = wrapText(rnc.observacoes, font, 9, TW);
      for (const ln of obsLines) { dt(ln, ML + 4, 9, font, C.black); nextLine(2); }
      y -= 6;
    }

    // ── METADADOS
    secao('METADADOS');
    if (rnc.preenchido_por) campo('Preenchido por', rnc.preenchido_por);
    if (rnc.data_preenchimento) campo('Data de preenchimento', new Date(rnc.data_preenchimento).toLocaleString('pt-BR'));
    y -= 6;

    // ── ASSINATURAS
    if (y < 130) {
      addFooter(page, pageNum);
      pageNum++;
      page = doc.addPage([PW, PH]);
      addHeader(page);
      addFooter(page, pageNum);
      y = PH - 62;
    }
    y -= 16;

    // Declaração
    const declTxt = 'Declaro que as informacoes fornecidas sao verdadeiras e estou ciente de que serao utilizadas para abertura do Canal Bancario.';
    const declLines = wrapText(declTxt, fontOblique, 8.5, TW);
    for (const ln of declLines) { dt(ln, ML, 8.5, fontOblique, C.gray); nextLine(2); }
    y -= 20;

    // Linhas de assinatura
    page.drawLine({ start: { x: ML, y }, end: { x: ML + 190, y }, thickness: 0.6, color: C.dark });
    page.drawLine({ start: { x: 320, y }, end: { x: MR, y }, thickness: 0.6, color: C.dark });
    y -= 12;
    dt(rnc.nome || 'Titular / Contratante', ML, 8, font, C.gray);
    dt('Villela Exchange', 320, 8, font, C.gray);
    y -= 20;
    dt('Data: _____ / _____ / __________', ML, 8.5, font, C.gray);

    // ─────────────────────────────────────────────────────────────────────
    // Finalizar
    // ─────────────────────────────────────────────────────────────────────
    const pdfBytes = await doc.save();
    const uint8 = new Uint8Array(pdfBytes);
    let base64 = '';
    for (let i = 0; i < uint8.length; i += 8192) {
      base64 += String.fromCharCode(...uint8.slice(i, i + 8192));
    }

    const nomeArquivo = `RNC_Canal_Bancario_${(rnc.nome || 'formulario').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return Response.json({
      pdf_base64: btoa(base64),
      filename: nomeArquivo,
      tipo: 'RNC_CANAL_BANCARIO',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});