import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { produto, cliente, cpfCnpj, validadeDias = 15, observacoes, propostas } = await req.json();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 18;
    let y = 0;

    // ---------- helpers ----------
    const rgb = (r, g, b) => { doc.setFillColor(r, g, b); };
    const txt = (t, x, fy, sz, style = 'normal', color = [30, 30, 30]) => {
      doc.setFontSize(sz);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      doc.text(String(t), x, fy);
    };
    const line = (x1, fy, x2, fy2, r = 180, g = 180, b = 180) => {
      doc.setDrawColor(r, g, b);
      doc.line(x1, fy, x2, fy2);
    };

    // ---------- header ----------
    rgb(10, 31, 53); doc.rect(0, 0, W, 38, 'F');
    txt('VILLELA EXCHANGE', M, 16, 20, 'bold', [255, 255, 255]);
    txt('Gestao Patrimonial Internacional', M, 23, 9, 'normal', [160, 200, 240]);
    txt('PROPOSTA TECNICA COMERCIAL', W - M, 16, 13, 'bold', [255, 210, 50]);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 200, 240);
    doc.text('www.villelaexchange.com.br', W - M, 23, { align: 'right' });

    // validity badge
    const hoje = new Date();
    const validade = new Date(hoje.getTime() + validadeDias * 86400000);
    const fmt = (d) => d.toLocaleDateString('pt-BR');
    rgb(255, 210, 50); doc.roundedRect(W - M - 52, 26, 52, 9, 2, 2, 'F');
    txt(`Validade: ${fmt(validade)}`, W - M - 50 + 26, 32, 7.5, 'bold', [10, 31, 53]);

    y = 50;

    // ---------- client info ----------
    rgb(245, 248, 252); doc.rect(M - 4, y - 6, W - (M - 4) * 2, 22, 'F');
    txt('DADOS DO CLIENTE', M, y, 8, 'bold', [80, 100, 130]);
    y += 6;
    txt(cliente || 'A Definir', M, y, 12, 'bold', [10, 31, 53]);
    if (cpfCnpj) { txt(`CPF/CNPJ: ${cpfCnpj}`, M + 90, y, 10, 'normal', [80, 100, 130]); }
    txt(`Emitido em: ${fmt(hoje)}`, W - M, y, 9, 'normal', [80, 100, 130]);
    y += 5;
    txt(`Consultor responsavel: ${user.full_name || user.email}`, M, y, 9, 'normal', [100, 120, 150]);
    y += 14;

    // ---------- product title ----------
    rgb(10, 31, 53); doc.roundedRect(M - 4, y - 5, W - (M - 4) * 2, 13, 2, 2, 'F');
    txt(`PRODUTO: ${(produto || '').toUpperCase()}`, M, y + 3, 11, 'bold', [255, 255, 255]);
    y += 18;

    // ---------- proposals ----------
    for (const [pi, proposta] of (propostas || []).entries()) {
      if (y > 240) { doc.addPage(); y = 20; }

      // proposal header
      const headerColor = pi === 0 ? [26, 86, 219] : [5, 120, 87];
      rgb(...headerColor); doc.roundedRect(M - 4, y - 4, W - (M - 4) * 2, 11, 1.5, 1.5, 'F');
      txt(proposta.titulo || `Proposta ${pi + 1}`, M, y + 4, 10, 'bold', [255, 255, 255]);
      if (proposta.tag) {
        doc.setFontSize(8); doc.setTextColor(220, 240, 255);
        doc.text(proposta.tag, W - M, y + 4, { align: 'right' });
      }
      y += 15;

      // items table
      for (const [ii, item] of (proposta.items || []).filter(Boolean).entries()) {
        if (y > 270) { doc.addPage(); y = 20; }
        const even = ii % 2 === 0;
        if (even) { rgb(248, 250, 253); doc.rect(M - 4, y - 4, W - (M - 4) * 2, 8, 'F'); }
        const isHighlight = item.highlight;
        txt(item.label || '', M, y + 1, isHighlight ? 9.5 : 9, isHighlight ? 'bold' : 'normal', isHighlight ? [10, 31, 53] : [80, 100, 130]);
        txt(item.value || '', W - M, y + 1, isHighlight ? 10 : 9, isHighlight ? 'bold' : 'normal', isHighlight ? [10, 31, 53] : [60, 80, 110]);
        line(M - 4, y + 4, W - M + 4, y + 4, 220, 225, 235);
        y += 9;
      }
      y += 6;
    }

    // ---------- observacoes ----------
    if (observacoes && observacoes.trim()) {
      if (y > 240) { doc.addPage(); y = 20; }
      rgb(255, 249, 230); doc.rect(M - 4, y - 4, W - (M - 4) * 2, 6 + Math.ceil(observacoes.length / 80) * 5.5, 'F');
      txt('OBSERVACOES:', M, y + 1, 8, 'bold', [120, 80, 0]);
      y += 7;
      const lines = doc.splitTextToSize(observacoes, W - M * 2);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 60, 0);
      doc.text(lines, M, y);
      y += lines.length * 5 + 6;
    }

    // ---------- conditions ----------
    if (y > 240) { doc.addPage(); y = 20; }
    y += 4;
    line(M - 4, y, W - M + 4, y, 200, 210, 225);
    y += 7;
    txt('CONDICOES GERAIS', M, y, 8, 'bold', [80, 100, 130]);
    y += 5;
    const condicoes = [
      `• Proposta valida ate ${fmt(validade)} (${validadeDias} dias corridos a partir da data de emissao).`,
      '• Os valores apresentados sao em Reais (BRL) salvo indicacao em contrario.',
      '• Esta proposta e de carater confidencial e destinada exclusivamente ao cliente identificado.',
      '• Villela Exchange reserva-se o direito de alterar condicoes apos vencimento da validade.',
      '• Sujeito a aprovacao cadastral e conformidade com politicas internas.',
    ];
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 110, 130);
    for (const c of condicoes) {
      if (y > 275) break;
      const ls = doc.splitTextToSize(c, W - M * 2);
      doc.text(ls, M, y); y += ls.length * 4.5;
    }

    // ---------- footer ----------
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      rgb(10, 31, 53); doc.rect(0, 285, W, 12, 'F');
      txt('Villela Exchange  |  Gestao Patrimonial Internacional', M, 292, 7.5, 'normal', [160, 200, 240]);
      txt(`Pagina ${i} / ${totalPages}  |  Documento gerado em ${fmt(hoje)}`, W - M, 292, 7.5, 'normal', [160, 200, 240]);
    }

    const pdfBase64 = doc.output('datauristring');
    const base64Data = pdfBase64.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});