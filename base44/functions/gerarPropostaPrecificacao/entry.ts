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

    const txt = (t, x, fy, sz, style = 'normal', color = [30, 30, 30]) => {
      doc.setFontSize(sz); doc.setFont('helvetica', style); doc.setTextColor(...color);
      doc.text(String(t ?? ''), x, fy);
    };
    const drawLine = (x1, fy, x2, r = 200, g = 210, b = 225) => {
      doc.setDrawColor(r, g, b); doc.line(x1, fy, x2, fy);
    };

    // ---------- header ----------
    doc.setFillColor(10, 31, 53); doc.rect(0, 0, W, 38, 'F');
    txt('VILLELA EXCHANGE', M, 14, 18, 'bold', [255, 255, 255]);
    txt('Gestao Patrimonial Internacional', M, 22, 8, 'normal', [160, 200, 240]);
    txt('PROPOSTA TECNICA COMERCIAL', W - M, 14, 12, 'bold', [255, 210, 50]);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 200, 240);
    doc.text('www.villelaexchange.com.br', W - M, 22, { align: 'right' });

    const hoje = new Date();
    const validade = new Date(hoje.getTime() + validadeDias * 86400000);
    const fmt = (d) => d.toLocaleDateString('pt-BR');

    doc.setFillColor(255, 210, 50); doc.roundedRect(W - M - 56, 26, 56, 9, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 31, 53);
    doc.text(`Validade: ${fmt(validade)}`, W - M - 28, 32, { align: 'center' });

    y = 50;

    // ---------- client info ----------
    doc.setFillColor(245, 248, 252); doc.rect(M - 4, y - 6, W - (M - 4) * 2, 22, 'F');
    txt('DADOS DO CLIENTE', M, y, 7.5, 'bold', [80, 100, 130]);
    y += 6;
    txt(cliente || 'A Definir', M, y, 13, 'bold', [10, 31, 53]);
    if (cpfCnpj) txt(`CPF/CNPJ: ${cpfCnpj}`, M + 90, y, 9, 'normal', [80, 100, 130]);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 120, 150);
    doc.text(`Emitido em: ${fmt(hoje)}`, W - M, y, { align: 'right' });
    y += 5;
    txt(`Consultor: ${user.full_name || user.email}`, M, y, 8.5, 'normal', [100, 120, 150]);
    y += 14;

    // ---------- product bar ----------
    doc.setFillColor(10, 31, 53); doc.roundedRect(M - 4, y - 5, W - (M - 4) * 2, 13, 2, 2, 'F');
    txt(`PRODUTO: ${(produto || '').toUpperCase()}`, M, y + 3, 10, 'bold', [255, 255, 255]);
    y += 17;

    // ---------- proposals ----------
    for (const [pi, proposta] of (propostas || []).entries()) {
      if (y > 242) { doc.addPage(); y = 20; }

      const hColor = pi === 0 ? [26, 86, 219] : pi === 1 ? [5, 120, 87] : [100, 50, 180];
      doc.setFillColor(...hColor); doc.roundedRect(M - 4, y - 4, W - (M - 4) * 2, 11, 1.5, 1.5, 'F');
      txt(proposta.titulo || `Proposta ${pi + 1}`, M, y + 4, 9.5, 'bold', [255, 255, 255]);
      if (proposta.tag) {
        doc.setFontSize(7.5); doc.setTextColor(200, 230, 255);
        doc.text(proposta.tag, W - M, y + 4, { align: 'right' });
      }
      y += 14;

      for (const [ii, item] of (proposta.items || []).filter(Boolean).entries()) {
        if (y > 272) { doc.addPage(); y = 20; }
        if (ii % 2 === 0) { doc.setFillColor(248, 250, 253); doc.rect(M - 4, y - 4, W - (M - 4) * 2, 8, 'F'); }
        txt(item.label || '', M, y + 1, item.highlight ? 9 : 8.5, item.highlight ? 'bold' : 'normal', item.highlight ? [10, 31, 53] : [80, 100, 130]);
        doc.setFontSize(item.highlight ? 9.5 : 8.5);
        doc.setFont('helvetica', item.highlight ? 'bold' : 'normal');
        doc.setTextColor(...(item.highlight ? [10, 31, 53] : [60, 80, 110]));
        doc.text(String(item.value || ''), W - M, y + 1, { align: 'right' });
        drawLine(M - 4, y + 4, W - M + 4);
        y += 8.5;
      }
      y += 5;
    }

    // ---------- observations ----------
    if (observacoes?.trim()) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 249, 230); doc.rect(M - 4, y - 4, W - (M - 4) * 2, 22, 'F');
      txt('OBSERVACOES:', M, y + 1, 7.5, 'bold', [120, 80, 0]);
      y += 7;
      const lns = doc.splitTextToSize(observacoes, W - M * 2);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 60, 0);
      doc.text(lns, M, y); y += lns.length * 5 + 5;
    }

    // ---------- conditions ----------
    if (y > 238) { doc.addPage(); y = 20; }
    y += 3; drawLine(M - 4, y, W - M + 4); y += 7;
    txt('CONDICOES GERAIS', M, y, 7.5, 'bold', [80, 100, 130]); y += 5;
    const conds = [
      `Proposta valida ate ${fmt(validade)} (${validadeDias} dias corridos a partir da data de emissao).`,
      'Os valores apresentados sao em Reais (BRL) salvo indicacao contraria.',
      'Esta proposta e de carater confidencial e destinada exclusivamente ao cliente identificado.',
      'Villela Exchange reserva-se o direito de alterar condicoes apos vencimento da validade.',
      'Sujeito a aprovacao cadastral e conformidade com politicas internas.',
    ];
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 110, 130);
    for (const c of conds) {
      if (y > 273) break;
      const ls = doc.splitTextToSize('• ' + c, W - M * 2);
      doc.text(ls, M, y); y += ls.length * 4.2;
    }

    // ---------- signature ----------
    if (y < 258) {
      y = Math.max(y + 5, 250);
      drawLine(M, y, M + 65); drawLine(W - M - 65, y, W - M);
      y += 5;
      txt('Contratante', M + 32, y, 7.5, 'normal', [100, 110, 130]);
      txt('Villela Exchange', W - M - 32, y, 7.5, 'normal', [100, 110, 130]);
    }

    // ---------- footer ----------
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(10, 31, 53); doc.rect(0, 285, W, 12, 'F');
      txt('Villela Exchange  |  Gestao Patrimonial Internacional', M, 292, 7, 'normal', [160, 200, 240]);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 200, 240);
      doc.text(`Pagina ${i} / ${totalPages}  |  ${fmt(hoje)}`, W - M, 292, { align: 'right' });
    }

    // Return base64 (same pattern as gerarContratosPDF)
    const uint8 = doc.output('arraybuffer');
    const arr = new Uint8Array(uint8);
    let b64 = '';
    const chunk = 8192;
    for (let i = 0; i < arr.length; i += chunk) {
      b64 += String.fromCharCode(...arr.slice(i, i + chunk));
    }
    b64 = btoa(b64);

    return Response.json({ pdf_base64: b64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});