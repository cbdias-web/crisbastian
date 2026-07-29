import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function wrapText(text, f, size, maxW) {
  const words = String(text || '').split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (f.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { rnc_id } = body;
    if (!rnc_id) return Response.json({ error: 'rnc_id obrigatório' }, { status: 400 });

    const rnc = await base44.entities.RncCanalBancario.get(rnc_id);
    if (!rnc) return Response.json({ error: 'RNC não encontrada' }, { status: 404 });

    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    const fontBold = await doc.embedFont('Helvetica-Bold');

    const BLACK = { type: 'RGB', red: 0, green: 0, blue: 0 };
    const WHITE = { type: 'RGB', red: 1, green: 1, blue: 1 };
    const GRAY = { type: 'RGB', red: 0.45, green: 0.45, blue: 0.45 };
    const DKGRAY = { type: 'RGB', red: 0.25, green: 0.25, blue: 0.25 };
    const TEAL = { type: 'RGB', red: 0.0, green: 0.52, blue: 0.40 };
    const GOLD = { type: 'RGB', red: 0.88, green: 0.69, blue: 0.14 };
    const VIOLET = { type: 'RGB', red: 0.43, green: 0.16, blue: 0.86 };
    const LIGHTBG = { type: 'RGB', red: 0.93, green: 0.95, blue: 0.96 };

    const PW = 595, PH = 842, ML = 50, MR = 545, TW = MR - ML;
    const FS = 10, LH = 14.5;

    let page = doc.addPage([PW, PH]);
    let y = PH - 40;

    function nextLine(extra = 0) {
      y -= LH + extra;
      if (y < 60) { page = doc.addPage([PW, PH]); y = PH - 60; }
    }
    function dt(text, x, sz, f, col = BLACK) {
      if (y < 60) { page = doc.addPage([PW, PH]); y = PH - 60; }
      page.drawText(String(text || ''), { x, y, size: sz, font: f, color: col });
    }

    // Logo
    page.drawRectangle({ x: 0, y: PH - 75, width: PW, height: 75, color: WHITE });
    const iconX = ML, iconY = PH - 20;
    page.drawRectangle({ x: iconX, y: iconY - 38, width: 30, height: 30, color: TEAL });
    page.drawRectangle({ x: iconX + 16, y: iconY - 54, width: 22, height: 22, color: WHITE, borderColor: TEAL, borderWidth: 2 });
    page.drawText('VILLELA', { x: iconX + 44, y: iconY - 12, size: 22, font: fontBold, color: DKGRAY });
    page.drawText('EXCHANGE', { x: iconX + 46, y: iconY - 32, size: 10, font, color: GRAY });
    page.drawLine({ start: { x: ML, y: PH - 80 }, end: { x: MR, y: PH - 80 }, thickness: 0.5, color: GRAY });
    y = PH - 100;

    // Título
    const titulo = 'REQUISIÇÃO DE NOVO CANAL BANCÁRIO (RNC)';
    const tW = fontBold.widthOfTextAtSize(titulo, 12);
    dt(titulo, (PW - tW) / 2, 12, fontBold, VIOLET);
    page.drawLine({ start: { x: (PW - tW) / 2, y: y - 1 }, end: { x: (PW - tW) / 2 + tW, y: y - 1 }, thickness: 0.8, color: VIOLET });
    y -= 16;
    const subtitulo = rnc.tipo_canal === 'PJ' ? 'CANAL BANCÁRIO — PESSOA JURÍDICA' : 'CANAL BANCÁRIO — PESSOA FÍSICA';
    const sW = font.widthOfTextAtSize(subtitulo, 9);
    dt(subtitulo, (PW - sW) / 2, 9, font, GRAY);
    y -= 8;

    // Data
    const dataPreench = rnc.data_preenchimento ? new Date(rnc.data_preenchimento) : new Date();
    const diaFmt = `${String(dataPreench.getDate()).padStart(2, '0')} de ${MESES_PT[dataPreench.getMonth()]} de ${dataPreench.getFullYear()}`;
    dt(diaFmt, MR - font.widthOfTextAtSize(diaFmt, 9), 9, font, GRAY);
    y -= 20;

    // Seção: Dados do Titular
    function secao(label) {
      page.drawRectangle({ x: ML, y: y - 4, width: TW, height: 16, color: LIGHTBG });
      dt(label, ML, 9, fontBold, DKGRAY);
      y -= 22;
    }
    function campo(label, value) {
      const hasVal = value && String(value).trim();
      const v = hasVal ? String(value) : '______________________________________________';
      dt(label + ':', ML, 9, fontBold, BLACK);
      const labelW = fontBold.widthOfTextAtSize(label + ': ', 9);
      const vLines = wrapText(v, font, 9, TW - labelW);
      if (vLines.length > 0) {
        dt(vLines[0], ML + labelW, 9, font, hasVal ? BLACK : GRAY);
        for (let i = 1; i < vLines.length; i++) { nextLine(); dt(vLines[i], ML, 9, font, hasVal ? BLACK : GRAY); }
      }
      nextLine(4);
    }

    secao('DADOS DO TITULAR');
    campo(rnc.tipo_canal === 'PF' ? 'Nome Completo' : 'Razão Social', rnc.nome);
    campo(rnc.tipo_canal === 'PF' ? 'CPF' : 'CNPJ', rnc.cpf_cnpj);
    campo(rnc.tipo_canal === 'PF' ? 'RG' : 'Inscrição Estadual', rnc.rg_ie);
    campo(rnc.tipo_canal === 'PF' ? 'Data de Nascimento' : 'Data de Fundação', rnc.nascimento_fundacao ? fmtDate(rnc.nascimento_fundacao) : '');
    campo('Nacionalidade', rnc.nacionalidade);
    campo(rnc.tipo_canal === 'PF' ? 'Profissão' : 'Natureza Jurídica', rnc.profissao_natureza);
    if (rnc.tipo_canal === 'PF') campo('Estado Civil', rnc.estado_civil);
    campo('E-mail', rnc.email);
    campo('Telefone / WhatsApp', rnc.telefone);

    // Endereço
    secao('ENDEREÇO');
    campo('CEP', rnc.cep);
    campo('Logradouro', rnc.endereco);
    campo('Bairro', rnc.bairro);
    campo('Cidade / Estado', rnc.cidade || rnc.estado ? `${rnc.cidade || ''} / ${rnc.estado || ''}` : '');

    // Flag 270k
    secao('VOLUME DE OPERAÇÃO');
    const vol270 = rnc.operar_acima_270k
      ? 'SIM — Interesse em operar valores superiores a R$ 270.000,00 no período de 12 meses.'
      : 'NÃO — Operação dentro do limite de R$ 270.000,00 / 12 meses.';
    const vLines = wrapText(vol270, font, 9, TW);
    for (const ln of vLines) { dt(ln, ML, 9, font, rnc.operar_acima_270k ? GOLD : BLACK); nextLine(2); }
    y -= 6;

    // Documentação
    secao('DOCUMENTAÇÃO APRESENTADA');
    const docs = rnc.documentos || [];
    if (docs.length === 0) {
      dt('Nenhum documento registrado.', ML, 9, font, GRAY);
      nextLine(8);
    } else {
      for (const d of docs) {
        const status = d.recebido ? '[OK] RECEBIDO' : (d.obrigatorio ? '[!] PENDENTE (obrigatorio)' : '- Nao aplicavel');
        const statusColor = d.recebido ? TEAL : (d.obrigatorio ? GOLD : GRAY);
        // Descrição
        const descLines = wrapText(d.descricao, font, 9, TW - 120);
        dt(descLines[0] || '', ML, 9, font, BLACK);
        for (let i = 1; i < descLines.length; i++) { nextLine(2); dt(descLines[i], ML, 9, font, BLACK); }
        // Status à direita
        dt(status, MR - fontBold.widthOfTextAtSize(status, 8), 8, fontBold, statusColor);
        if (d.recebido && d.nome_arquivo) {
          nextLine(2);
          dt('Arquivo: ' + d.nome_arquivo, ML + 10, 8, font, GRAY);
        }
        nextLine(6);
      }
    }
    y -= 4;

    // Sócios (PJ)
    if (rnc.tipo_canal === 'PJ' && rnc.socios && rnc.socios.length > 0) {
      secao('SÓCIOS E ADMINISTRADORES');
      for (let i = 0; i < rnc.socios.length; i++) {
        const s = rnc.socios[i];
        dt(`${i + 1}. ${s.nome || '—'}  —  CPF: ${s.cpf || '—'}`, ML, 9, fontBold, BLACK);
        nextLine(4);
        const docStatus = s.documento_url ? '[OK] Documento de identificacao anexado' : '[!] Documento de identificacao pendente';
        dt(docStatus, ML + 15, 8, font, s.documento_url ? TEAL : GOLD);
        nextLine(2);
        const compStatus = s.comprovante_url ? '[OK] Comprovante de endereco anexado' : '[!] Comprovante de endereco pendente';
        dt(compStatus, ML + 15, 8, font, s.comprovante_url ? TEAL : GOLD);
        nextLine(8);
      }
      y -= 4;
    }

    // Observações
    if (rnc.observacoes) {
      secao('OBSERVAÇÕES');
      const obsLines = wrapText(rnc.observacoes, font, 9, TW);
      for (const ln of obsLines) { dt(ln, ML, 9, font, BLACK); nextLine(2); }
      y -= 6;
    }

    // Preenchido por
    secao('METADADOS');
    if (rnc.preenchido_por) campo('Preenchido por', rnc.preenchido_por);
    if (rnc.data_preenchimento) campo('Data de preenchimento', new Date(rnc.data_preenchimento).toLocaleString('pt-BR'));
    if (rnc.contrato_id) campo('Contrato vinculado', rnc.contrato_id);
    nextLine(10);

    // Assinatura
    if (y < 120) { page = doc.addPage([PW, PH]); y = PH - 60; }
    dt('_________________________________', ML, 10, font, BLACK);
    dt('_________________________________', 330, 10, font, BLACK);
    nextLine(14);
    dt(rnc.nome || 'Titular', ML, 9, font, GRAY);
    dt('Villela Exchange', 340, 9, font, GRAY);

    const pdfBytes = await doc.save();
    const uint8 = new Uint8Array(pdfBytes);
    let base64 = '';
    for (let i = 0; i < uint8.length; i += 8192) {
      base64 += String.fromCharCode(...uint8.slice(i, i + 8192));
    }

    const nomeArquivo = `RNC_Canal_Bancario_${(rnc.nome || '').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return Response.json({
      pdf_base64: btoa(base64),
      filename: nomeArquivo,
      tipo: 'RNC_CANAL_BANCARIO',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});