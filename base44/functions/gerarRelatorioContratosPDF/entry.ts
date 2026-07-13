import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

function sanitize(text) {
  if (!text) return '';
  return String(text)
    .replace(/—/g, '-').replace(/–/g, '-')
    .replace(/'/g, "'").replace(/'/g, "'")
    .replace(/"/g, '"').replace(/"/g, '"')
    .replace(/\u2026/g, '...').replace(/\u00a0/g, ' ')
    .replace(/\u2022/g, '-').replace(/\u25CF/g, 'o')
    .replace(/\u2192/g, '->').replace(/\u00b7/g, '-')
    .replace(/\u2013/g, '-').replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'").replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"').replace(/\u2122/g, 'TM')
    .replace(/\u00ae/g, '(R)').replace(/\u00b0/g, ' deg ')
    .replace(/\u00d7/g, 'x').replace(/\u00f7/g, '/')
    .replace(/[\u2000-\u200F]/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2028-\u202F]/g, ' ')
    .replace(/[\u2050-\u205F]/g, ' ')
    .replace(/[\u2190-\u21FF]/g, '->')
    .replace(/[\u2200-\u22FF]/g, '')
    .replace(/[\u2300-\u23FF]/g, '')
    .replace(/[\u25A0-\u25FF]/g, '')
    .replace(/[\u2600-\u26FF]/g, '')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const fTipo = body.tipo || null;
    const fStatus = body.status || null;
    const fVendedor = body.vendedor_nome || null;
    const fDataInicio = body.data_inicio || null;
    const fDataFim = body.data_fim || null;

    const contratos = await base44.entities.Contrato.list('-created_date', 500);

    const filtrados = contratos.filter(c => {
      if (fTipo && c.tipo !== fTipo) return false;
      if (fStatus && c.status !== fStatus) return false;
      if (fVendedor && c.vendedor_nome !== fVendedor) return false;
      const dataRef = c.data_contrato || (c.created_date ? c.created_date.split('T')[0] : '');
      if (fDataInicio && dataRef < fDataInicio) return false;
      if (fDataFim && dataRef > fDataFim) return false;
      return true;
    });

    const fmtVal = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
    const fmtDate = (iso) => {
      if (!iso) return '-';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const TIPOS = ['CONTA GLOBAL', 'CONTA INTERNACIONAL', 'DOLARIZE', 'ROF', 'CANAL BANCARIO', 'OFFSHORE', 'GARANTIAS', 'HORA TECNICA'];
    const STATUS_LIST = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];
    const STATUS_LABELS = {
      rascunho: 'Rascunho', gerado: 'PDF Gerado', assinado: 'Assinado',
      aguardando_pagamento: 'Aguard. Pagamento', pago: 'Pago', no_pipeline: 'No Pipeline',
    };

    // Stats
    const totalContratos = filtrados.length;
    const valorTotal = filtrados.reduce((s, c) => s + (Number(c.valor_total) || 0), 0);
    const assinados = filtrados.filter(c => c.status === 'assinado' || c.contrato_assinado_url).length;
    const noPipeline = filtrados.filter(c => c.status === 'no_pipeline' || c.pipeline_id).length;
    const linkPendente = filtrados.filter(c => !c.link_assinatura && c.status !== 'rascunho').length;
    const comPagamento = filtrados.filter(c => c.comprovante_url || c.status === 'pago').length;

    // Por tipo
    const porTipo = {};
    for (const t of TIPOS) porTipo[t] = { count: 0, valor: 0 };
    for (const c of filtrados) {
      const t = c.tipo || 'OUTROS';
      if (!porTipo[t]) porTipo[t] = { count: 0, valor: 0 };
      porTipo[t].count++;
      porTipo[t].valor += Number(c.valor_total) || 0;
    }

    // Por status
    const porStatus = {};
    for (const s of STATUS_LIST) porStatus[s] = 0;
    for (const c of filtrados) {
      const s = c.status || 'rascunho';
      if (!porStatus[s]) porStatus[s] = 0;
      porStatus[s]++;
    }

    // Por vendedor
    const porVendedor = {};
    for (const c of filtrados) {
      const v = c.vendedor_nome || 'Nao informado';
      if (!porVendedor[v]) porVendedor[v] = { count: 0, valor: 0 };
      porVendedor[v].count++;
      porVendedor[v].valor += Number(c.valor_total) || 0;
    }
    const topVendedores = Object.entries(porVendedor).sort(([, a], [, b]) => b.count - a.count).slice(0, 8);

    // Top 8 tipos para grafico
    const topTipos = Object.entries(porTipo).filter(([, v]) => v.count > 0).sort(([, a], [, b]) => b.count - a.count).slice(0, 8);

    // ===== PDF =====
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const C = {
      darkBg: '#0d1117', darkNav: '#1a1a2e', darkBlue: '#16213e',
      accent: '#00D4AA', accentDark: '#00a886', accentLight: '#e6fffa',
      text: '#1a1a2e', textSecondary: '#334155', textLight: '#475569', textMuted: '#64748b',
      white: '#ffffff', border: '#d1dae3', rowAlt: '#f8fafc', detailBg: '#f0fdfa',
      green: '#059669', greenBg: '#ecfdf5',
      amber: '#d97706', amberBg: '#fffbeb',
      red: '#dc2626', redBg: '#fef2f2',
      blue: '#2563eb', blueBg: '#eff6ff',
      purple: '#7c3aed', purpleBg: '#f5f3ff',
    };

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    // ═══ HEADER ═══
    doc.setFillColor(...hexToRgb(C.darkBg));
    doc.rect(0, 0, pageW, 45, 'F');
    doc.setFillColor(...hexToRgb(C.accent));
    doc.rect(0, 45, pageW, 1.5, 'F');

    doc.setFillColor(...hexToRgb(C.accent));
    doc.roundedRect(14, 12, 18, 18, 3, 3, 'F');
    doc.setTextColor(...hexToRgb(C.white));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('VX', 23, 23, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(...hexToRgb(C.white));
    doc.text(sanitize('Relatorio de Contratos'), 38, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 200);
    doc.text(sanitize('Villela Exchange - Gestao Comercial'), 38, 27);
    doc.setFontSize(8);
    doc.text(sanitize(`Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`), 38, 33);

    // Box periodo
    doc.setFillColor(...hexToRgb(C.darkBlue));
    doc.roundedRect(pageW - 80, 10, 66, 28, 3, 3, 'F');
    doc.setTextColor(...hexToRgb(C.accent));
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FILTROS', pageW - 77, 17);
    doc.setTextColor(...hexToRgb(C.white));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let filtroStr = '';
    if (fTipo) filtroStr += `${fTipo} | `;
    if (fStatus) filtroStr += `${STATUS_LABELS[fStatus] || fStatus} | `;
    if (fVendedor) filtroStr += `${fVendedor.substring(0, 15)} | `;
    const periodo = fDataInicio || fDataFim ? `${fDataInicio || 'Inicio'} a ${fDataFim || 'Hoje'}` : 'Todos os periodos';
    filtroStr += periodo;
    doc.text(sanitize(filtroStr).substring(0, 50), pageW - 77, 24);
    doc.setFontSize(7);
    doc.setTextColor(180, 190, 200);
    doc.text(sanitize(`${totalContratos} contrato(s)`), pageW - 77, 31);

    // ═══ CARDS DE SUMARIO ═══
    const cardStartY = 55;
    const cardH = 15;
    const cardW = 120;
    const cardGap = 2;

    const cards = [
      { label: 'Total de Contratos', value: totalContratos, color: C.accent, bg: C.accentLight },
      { label: 'Valor Total', value: fmtVal(valorTotal), color: C.blue, bg: C.blueBg },
      { label: 'Assinados', value: assinados, color: C.green, bg: C.greenBg },
      { label: 'Encaminhados p/ Vendas', value: noPipeline, color: C.purple, bg: C.purpleBg },
      { label: 'Link de Assinatura Pendente', value: linkPendente, color: C.amber, bg: C.amberBg },
    ];

    cards.forEach((card, i) => {
      const cy = cardStartY + i * (cardH + cardGap);
      doc.setFillColor(...hexToRgb(card.bg));
      doc.roundedRect(14, cy, cardW, cardH, 2, 2, 'F');
      doc.setFillColor(...hexToRgb(card.color));
      doc.roundedRect(14, cy, 1.5, cardH, 0.5, 0.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.text(sanitize(card.label).toUpperCase(), 19, cy + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...hexToRgb(card.color));
      doc.text(sanitize(String(card.value)), 14 + cardW - 4, cy + 11, { align: 'right' });
    });

    // ═══ GRAFICO: Contratos por Tipo (coluna direita) ═══
    const chartX = 138;
    const chartY = 55;
    const chartH = 50;
    const chartW = pageW - 14 - chartX;

    doc.setFillColor(...hexToRgb(C.white));
    doc.setDrawColor(...hexToRgb(C.border));
    doc.roundedRect(chartX, chartY, chartW, chartH, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(C.text));
    doc.text('Contratos por Tipo', chartX + 4, chartY + 7);

    if (topTipos.length > 0) {
      const maxVal = Math.max(...topTipos.map(([, v]) => v.count), 1);
      const barAreaY = chartY + 12;
      const barAreaH = chartH - 18;
      const barAreaW = chartW - 10;
      const barAreaX = chartX + 6;
      const barW = (barAreaW / topTipos.length) - 3;

      for (let g = 0; g <= 3; g++) {
        const gy = barAreaY + (barAreaH / 3) * g;
        doc.setDrawColor(235, 238, 242);
        doc.setLineDashPattern([0.5, 1], 0);
        doc.line(barAreaX, gy, barAreaX + barAreaW - 5, gy);
      }
      doc.setLineDashPattern([], 0);

      topTipos.forEach(([tipo, data], i) => {
        const bx = barAreaX + i * (barW + 3);
        const barVal = (data.count / maxVal) * barAreaH;
        const by = barAreaY + barAreaH - barVal;
        doc.setFillColor(...hexToRgb(C.accent));
        doc.roundedRect(bx, by, barW, barVal, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...hexToRgb(C.accentDark));
        doc.text(String(data.count), bx + barW / 2, by - 1.5, { align: 'center' });
        const nome = sanitize(tipo).substring(0, 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...hexToRgb(C.textMuted));
        doc.text(nome, bx + barW / 2, barAreaY + barAreaH + 4, { align: 'center' });
      });
    }

    // ═══ GRAFICO: Top Vendedores (abaixo do grafico de tipos) ═══
    const chart2Y = chartY + chartH + 4;
    const chart2H = 29;
    doc.setFillColor(...hexToRgb(C.white));
    doc.setDrawColor(...hexToRgb(C.border));
    doc.roundedRect(chartX, chart2Y, chartW, chart2H, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(C.text));
    doc.text('Top Vendedores por Contratos', chartX + 4, chart2Y + 6);

    if (topVendedores.length > 0) {
      const maxVal = Math.max(...topVendedores.map(([, v]) => v.count), 1);
      const barAreaY = chart2Y + 10;
      const barAreaH = chart2H - 16;
      const barAreaW = chartW - 10;
      const barAreaX = chartX + 6;
      const barW = (barAreaW / topVendedores.length) - 2;

      topVendedores.forEach(([nome, data], i) => {
        const bx = barAreaX + i * (barW + 2);
        const barVal = (data.count / maxVal) * barAreaH;
        const by = barAreaY + barAreaH - barVal;
        doc.setFillColor(...hexToRgb(C.blue));
        doc.roundedRect(bx, by, barW, barVal, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...hexToRgb(C.blue));
        doc.text(String(data.count), bx + barW / 2, by - 1, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(...hexToRgb(C.textMuted));
        doc.text(sanitize(nome.split(' ')[0]).substring(0, 8), bx + barW / 2, barAreaY + barAreaH + 3, { align: 'center' });
      });
    }

    // ═══ TABELA DETALHADA ═══
    let y = cardStartY + cards.length * (cardH + cardGap) + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(C.text));
    doc.text(sanitize(`Detalhamento de Contratos (${filtrados.length})`), 14, y);
    y += 3;

    const cols = [
      { header: 'Cliente', w: 40, align: 'left' },
      { header: 'CPF/CNPJ', w: 28, align: 'left' },
      { header: 'Tipo', w: 28, align: 'left' },
      { header: 'Valor Total', w: 24, align: 'right' },
      { header: 'Data', w: 18, align: 'center' },
      { header: 'Status', w: 22, align: 'left' },
      { header: 'Vendedor', w: 28, align: 'left' },
      { header: 'Assinado', w: 18, align: 'center' },
      { header: 'Vendas', w: 16, align: 'center' },
      { header: 'Origem Pagto', w: 26, align: 'left' },
      { header: 'Valor Adesao', w: 24, align: 'right' },
    ];
    const rowH = 6.5;
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const tableX = 14;

    const drawTableHeader = (startY) => {
      let cx = tableX;
      doc.setFillColor(...hexToRgb(C.darkNav));
      doc.rect(cx, startY, tableW, rowH, 'F');
      doc.setFillColor(...hexToRgb(C.accent));
      doc.rect(cx, startY + rowH, tableW, 0.5, 'F');
      doc.setTextColor(...hexToRgb(C.white));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      for (const col of cols) {
        if (col.align === 'center') {
          doc.text(sanitize(col.header), cx + col.w / 2, startY + 4.5, { align: 'center' });
        } else if (col.align === 'right') {
          doc.text(sanitize(col.header), cx + col.w - 1, startY + 4.5, { align: 'right' });
        } else {
          doc.text(sanitize(col.header), cx + 1.5, startY + 4.5);
        }
        cx += col.w;
      }
      return startY + rowH;
    };

    y = drawTableHeader(y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    for (let i = 0; i < filtrados.length; i++) {
      const c = filtrados[i];

      if (y > pageH - 20) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
      }

      let cx = tableX;
      if (i % 2 === 0) {
        doc.setFillColor(...hexToRgb(C.rowAlt));
        doc.rect(cx, y, tableW, rowH, 'F');
      }

      const nome = sanitize(c.nome || '-').substring(0, 24);
      const cpf = sanitize(c.cpf_cnpj || '-').substring(0, 18);
      const tipo = sanitize(c.tipo || '-').substring(0, 16);
      const valorTotal = sanitize(fmtVal(c.valor_total));
      const data = sanitize(fmtDate(c.data_contrato || (c.created_date ? c.created_date.split('T')[0] : '')));
      const statusLabel = STATUS_LABELS[c.status] || c.status || '-';
      const vendedor = sanitize(c.vendedor_nome || '-').substring(0, 18);
      const assinado = c.contrato_assinado_url ? 'Sim' : (c.link_assinatura ? 'Link enviado' : 'Nao');
      const vendas = (c.status === 'no_pipeline' || c.pipeline_id) ? 'Sim' : 'Nao';
      const origem = sanitize(c.origem_pagamento || '-').substring(0, 16);
      const valorAdesao = sanitize(fmtVal(c.valor_adesao));

      // Status color
      let statusColor = C.textMuted;
      if (c.status === 'assinado') statusColor = C.green;
      else if (c.status === 'pago') statusColor = C.green;
      else if (c.status === 'no_pipeline') statusColor = C.purple;
      else if (c.status === 'aguardando_pagamento') statusColor = C.amber;
      else if (c.status === 'gerado') statusColor = C.blue;

      // Assinado color
      let assColor = C.red;
      if (c.contrato_assinado_url) assColor = C.green;
      else if (c.link_assinatura) assColor = C.amber;

      // Vendas color
      const vendColor = (c.status === 'no_pipeline' || c.pipeline_id) ? C.green : C.textMuted;

      doc.setTextColor(...hexToRgb(C.text));
      doc.setFont('helvetica', 'bold');
      doc.text(nome, cx + 1.5, y + 4.5); cx += cols[0].w;
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(cpf, cx + 1.5, y + 4.5); cx += cols[1].w;

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(tipo, cx + 1.5, y + 4.5); cx += cols[2].w;

      doc.setTextColor(...hexToRgb(C.accent));
      doc.setFont('helvetica', 'bold');
      doc.text(valorTotal, cx + cols[3].w - 1, y + 4.5, { align: 'right' }); cx += cols[3].w;
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(data, cx + cols[4].w / 2, y + 4.5, { align: 'center' }); cx += cols[4].w;

      doc.setTextColor(...hexToRgb(statusColor));
      doc.setFont('helvetica', 'bold');
      doc.text(sanitize(statusLabel), cx + 1.5, y + 4.5); cx += cols[5].w;
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(vendedor, cx + 1.5, y + 4.5); cx += cols[6].w;

      doc.setTextColor(...hexToRgb(assColor));
      doc.setFont('helvetica', 'bold');
      doc.text(assinado, cx + cols[7].w / 2, y + 4.5, { align: 'center' }); cx += cols[7].w;
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(...hexToRgb(vendColor));
      doc.setFont('helvetica', 'bold');
      doc.text(vendas, cx + cols[8].w / 2, y + 4.5, { align: 'center' }); cx += cols[8].w;
      doc.setFont('helvetica', 'normal');

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(origem, cx + 1.5, y + 4.5); cx += cols[9].w;

      doc.setTextColor(...hexToRgb(C.textSecondary));
      doc.text(valorAdesao, cx + cols[10].w - 1, y + 4.5, { align: 'right' });

      doc.setDrawColor(...hexToRgb(C.border));
      doc.setLineWidth(0.1);
      doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

      y += rowH;
    }

    // ═══ FOOTER ═══
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...hexToRgb(C.accent));
      doc.rect(0, pageH - 8, pageW, 0.5, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.setFont('helvetica', 'normal');
      doc.text('Villela Exchange - Gestao Comercial', 14, pageH - 3);
      doc.text(`Pagina ${p} de ${totalPages}`, pageW / 2, pageH - 3, { align: 'center' });
      doc.text(sanitize(`Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`), pageW - 14, pageH - 3, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio-contratos.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});