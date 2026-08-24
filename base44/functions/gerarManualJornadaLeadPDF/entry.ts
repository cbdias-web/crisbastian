import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';

// ── Paleta institucional Villela Exchange (tema claro, paisagem) ──
const C = {
  bg: [255, 255, 255],
  navy: [15, 43, 91],      // azul institucional Villela
  navy2: [30, 64, 120],
  accent: [0, 150, 136],   // verde-marisca Villela
  surface: [246, 247, 249],
  surface2: [236, 240, 244],
  border: [203, 213, 225],
  blue: [37, 99, 235],
  amber: [217, 119, 6],
  green: [22, 163, 74],
  red: [220, 38, 38],
  violet: [124, 58, 237],
  text: [17, 24, 39],
  muted: [107, 114, 128],
  white: [255, 255, 255],
};

function fill(doc, rgb, x, y, w, h) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(x, y, w, h, 'F'); }
function rrect(doc, rgb, x, y, w, h, r) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.roundedRect(x, y, w, h, r, r, 'F'); }
function rstroke(doc, rgb, x, y, w, h, r, lw) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(lw || 0.5); doc.roundedRect(x, y, w, h, r, r, 'S');
}
function line(doc, rgb, x1, y1, x2, y2, lw) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(lw || 0.5); doc.line(x1, y1, x2, y2); }
function txt(doc, rgb, str, x, y, opts = {}) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.text(str == null ? '' : String(str), x, y, opts); }
function mix(c1, c2, t) {
  return [Math.round(c1[0] * (1 - t) + c2[0] * t), Math.round(c1[1] * (1 - t) + c2[1] * t), Math.round(c1[2] * (1 - t) + c2[2] * t)];
}

// Caixa de etapa (numerada, topo colorido) — ilustração do fluxo
function stageBox(doc, x, y, w, h, num, titulo, color) {
  rrect(doc, C.white, x, y, w, h, 2.5);
  rstroke(doc, color, x, y, w, h, 2.5, 0.9);
  // topo colorido
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, 5.5, 2.5, 2.5, 'F');
  doc.rect(x, y + 2.5, w, 3, 'F');
  // número no topo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'bold');
  doc.text(String(num), x + w / 2, y + 4, { align: 'center' });
  // título
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'bold');
  const tlines = doc.splitTextToSize(titulo, w - 4);
  tlines.forEach((ln, i) => txt(doc, C.text, ln, x + w / 2, y + 10 + i * 3.6, { align: 'center' }));
}

// Bandeirinha (flag) com mensagem explicativa — "mastro" sobe até a caixa
function flag(doc, x, y, w, h, msg, color) {
  const tint = mix(color, C.white, 0.86);
  // mastro
  line(doc, color, x + 3, y - 3, x + 3, y, 0.5);
  // pano da bandeira
  rrect(doc, tint, x, y, w, h, 1.2);
  rstroke(doc, color, x, y, w, h, 1.2, 0.4);
  // mensagem
  doc.setFontSize(5.4);
  doc.setFont(undefined, 'normal');
  const lines = doc.splitTextToSize(msg, w - 3);
  lines.forEach((ln, i) => txt(doc, C.text, ln, x + 1.5, y + 3 + i * 3.1));
}

// Seta horizontal (indicação de movimento)
function arrowRight(doc, xFrom, xTo, y, color) {
  line(doc, color, xFrom, y, xTo, y, 0.9);
  line(doc, color, xTo, y, xTo - 2.2, y - 1.3, 0.9);
  line(doc, color, xTo, y, xTo - 2.2, y + 1.3, 0.9);
}
function arrowDown(doc, x, yFrom, yTo, color) {
  line(doc, color, x, yFrom, x, yTo, 0.9);
  line(doc, color, x, yTo, x - 1.3, yTo - 2.2, 0.9);
  line(doc, color, x, yTo, x + 1.3, yTo - 2.2, 0.9);
}

// Marcador numerado (callout) — círculo branco com borda colorida
function marker(doc, num, x, y, color) {
  doc.setFillColor(255, 255, 255);
  doc.circle(x, y, 3.2, 'F');
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.6);
  doc.circle(x, y, 3.2, 'S');
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y, 1.4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.5);
  doc.setFont(undefined, 'bold');
  doc.text(String(num), x, y + 1.2, { align: 'center' });
}

// Padrão "QR" decorativo (placeholder)
function qrPattern(doc, x, y, size, seed) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 1, 1, 'F');
  doc.setFillColor(20, 20, 30);
  const n = 6, cell = (size - 4) / n;
  for (let qx = 0; qx < n; qx++) for (let qy = 0; qy < n; qy++) {
    if ((qx * 3 + qy * 5 + seed) % 4 === 0) doc.rect(x + 2 + qx * cell, y + 2 + qy * cell, cell, cell, 'F');
  }
  // cantos
  [[2, 2], [n - 1, 2], [2, n - 1]].forEach(([cx, cy]) => {
    doc.rect(x + 2 + (cx - 1) * cell, y + 2 + (cy - 1) * cell, cell * 2, cell * 2, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 2 + (cx - 1) * cell + cell * 0.4, y + 2 + (cy - 1) * cell + cell * 0.4, cell * 1.2, cell * 1.2, 'F');
    doc.setFillColor(20, 20, 30);
    doc.rect(x + 2 + (cx - 1) * cell + cell * 0.8, y + 2 + (cy - 1) * cell + cell * 0.8, cell * 0.4, cell * 0.4, 'F');
  });
}

// Cabeçalho institucional (banda navy + logo VX) — presente em todas as páginas
function header(doc, pageW, titulo, subtitulo) {
  fill(doc, C.navy, 0, 0, pageW, 16);
  // logo VX
  doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.roundedRect(12, 4, 8, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.text('VX', 16, 9.6, { align: 'center' });
  // marca
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  txt(doc, C.white, 'VILLELA EXCHANGE', 23, 8.2);
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  txt(doc, [180, 199, 231], 'Câmbio & Soluções Internacionais', 23, 12);
  // título da página à direita
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  txt(doc, C.white, titulo, pageW - 12, 7, { align: 'right' });
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  txt(doc, [180, 199, 231], subtitulo, pageW - 12, 11.5, { align: 'right' });
  // filete accent
  fill(doc, C.accent, 0, 16, pageW, 1);
}

function footer(doc, pageW, pageH, page, total) {
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.setLineWidth(0.3);
  doc.line(12, pageH - 8, pageW - 12, pageH - 8);
  doc.setFontSize(5.5);
  doc.setFont(undefined, 'normal');
  txt(doc, C.muted, 'Villela Exchange · Manual da Jornada do Lead · v1.0', 12, pageH - 4);
  txt(doc, C.muted, `${page} / ${total}`, pageW - 12, pageH - 4, { align: 'right' });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();   // 297
    const pageH = doc.internal.pageSize.getHeight();  // 210
    const TOTAL = 3;

    // ═══════════════ PÁGINA 1 — CAPA + FLUXO DA JORNADA ═══════════════
    fill(doc, C.bg, 0, 0, pageW, pageH);
    header(doc, pageW, 'Jornada do Lead', 'Da captação à conversão');

    // Título
    doc.setFontSize(17);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Jornada do Lead: da Captação à Conversão', 12, 30);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1.2);
    doc.line(12, 32.5, 70, 32.5);

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Este manual descreve o caminho completo de um lead dentro da Villela Exchange — desde a captação', 12, 38);
    txt(doc, C.muted, '(webhook externo ou Portal do Indicador) até a conversão em contrato, venda e implantação.', 12, 42);

    // ── Fluxo horizontal (8 etapas) com flags explicativas ──
    const etapas = [
      { n: 1, t: 'Captação', f: 'Lead chega por webhook (Make) ou pelo Portal do Indicador', c: C.blue },
      { n: 2, t: 'Central de Leads', f: 'Cria a conversa no WhatsApp e o card no Kanban de funil', c: C.accent },
      { n: 3, t: 'Distribuição', f: 'Round-robin escolhe o gerente disponível de forma justa', c: C.violet },
      { n: 4, t: 'Fila de Contatos', f: 'Lead entra na esteira do dia do gerente sorteado', c: C.amber },
      { n: 5, t: 'Atendimento', f: 'Popup abre com QR codes, pitch IA e registros do contato', c: C.green },
      { n: 6, t: 'Qualificação', f: 'Classificado como Qualificado segue para o Pipeline', c: C.blue },
      { n: 7, t: 'Conversão', f: 'Gera Cliente, Contrato e Venda com as comissões', c: C.green },
      { n: 8, t: 'Implantação', f: 'Pós-venda: checklist de fases + notificações Jarvis', c: C.amber },
    ];
    const bw = 28, bg = 6.2, bh = 17, fh = 22;
    const totalRow = etapas.length * bw + (etapas.length - 1) * bg;
    let sx = (pageW - totalRow) / 2;
    const rowY = 52;
    etapas.forEach((e, i) => {
      stageBox(doc, sx, rowY, bw, bh, e.n, e.t, e.c);
      // flag abaixo
      flag(doc, sx, rowY + bh + 2.5, bw, fh, e.f, e.c);
      // seta de movimento para a próxima etapa
      if (i < etapas.length - 1) arrowRight(doc, sx + bw, sx + bw + bg, rowY + bh / 2, C.accent);
      sx += bw + bg;
    });

    // ── Mini-legenda "como ler" ──
    const legY = rowY + bh + fh + 10;
    rrect(doc, C.surface, 12, legY, pageW - 24, 22, 2);
    rstroke(doc, C.border, 12, legY, pageW - 24, 22, 2, 0.4);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Como ler este manual', 16, legY + 5);

    // seta
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'normal');
    arrowRight(doc, 16, 30, legY + 10, C.accent);
    txt(doc, C.text, 'Seta = sentido do movimento do lead entre as etapas do funil.', 33, legY + 10.5);
    // flag
    flag(doc, 16, legY + 12, 14, 7, 'mensagem', C.amber);
    txt(doc, C.text, 'Bandeira = mensagem explicativa daquela etapa (o que acontece e por quê).', 33, legY + 16);

    // destaque lateral
    rrect(doc, mix(C.accent, C.white, 0.88), pageW - 92, legY, 80, 22, 2);
    rstroke(doc, C.accent, pageW - 92, legY, 80, 22, 2, 0.4);
    doc.setFontSize(6.2);
    doc.setFont(undefined, 'bold');
    txt(doc, C.accent, 'GRUPO VILLELA · 20+ ANOS', pageW - 88, legY + 5);
    doc.setFont(undefined, 'normal');
    txt(doc, C.text, 'A Exchange é a vertical de câmbio e soluções', pageW - 88, legY + 9.5);
    txt(doc, C.text, 'internacionais do Grupo Villela — proteção patri-', pageW - 88, legY + 13);
    txt(doc, C.text, 'monial (offshore, conta internacional, canal bancário).', pageW - 88, legY + 16.5);

    footer(doc, pageW, pageH, 1, TOTAL);

    // ═══════════════ PÁGINA 2 — POPUP DE ATENDIMENTO ═══════════════
    doc.addPage();
    fill(doc, C.bg, 0, 0, pageW, pageH);
    header(doc, pageW, 'Popup de Atendimento', 'Fila de Contatos · Pitch IA');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Popup de Atendimento — Fila de Contatos', 12, 30);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1);
    doc.line(12, 32, 80, 32);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Interface central do atendimento. Toque nos QR codes para iniciar o contato, use o painel de Pitch IA', 12, 37);
    txt(doc, C.muted, 'para tratar objeções em tempo real e classifique o desfecho do lead na barra inferior.', 12, 41);

    // ── Ilustração do popup ──
    const popX = 14, popY = 47, popW = 178, popH = 132;
    rrect(doc, C.white, popX, popY, popW, popH, 2.5);
    rstroke(doc, C.border, popX, popY, popW, popH, 2.5, 0.6);
    // header do popup
    rrect(doc, C.surface2, popX, popY, popW, 8, 2.5);
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'CAPA DO CONTATO', popX + popW / 2, popY + 5.5, { align: 'center' });

    // coluna A (principal)
    const colA = { x: popX + 4, w: 96 };
    doc.setFontSize(6.5);
    txt(doc, C.navy, 'Coluna Principal', colA.x + 1, popY + 14);
    line(doc, C.border, colA.x + 1, popY + 15, colA.x + 35, popY + 15, 0.3);

    // QR WhatsApp (verde)
    rrect(doc, C.white, colA.x + 6, popY + 20, 24, 24, 1.5);
    rstroke(doc, C.green, colA.x + 6, popY + 20, 24, 24, 1.5, 0.8);
    qrPattern(doc, colA.x + 8, popY + 22, 20, 3);
    doc.setFontSize(5.5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.green, 'WhatsApp', colA.x + 18, popY + 47, { align: 'center' });

    // QR Ligação (azul)
    rrect(doc, C.white, colA.x + 54, popY + 20, 24, 24, 1.5);
    rstroke(doc, C.blue, colA.x + 54, popY + 20, 24, 24, 1.5, 0.8);
    qrPattern(doc, colA.x + 56, popY + 22, 20, 7);
    doc.setFontSize(5.5);
    txt(doc, C.blue, 'Ligação', colA.x + 66, popY + 47, { align: 'center' });

    // botões de desfecho
    rrect(doc, C.green, colA.x + 4, popY + 54, 40, 8, 1.5);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.text('Atendeu', colA.x + 24, popY + 59, { align: 'center' });
    rrect(doc, C.red, colA.x + 52, popY + 54, 40, 8, 1.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Não Atendeu', colA.x + 72, popY + 59, { align: 'center' });

    // barra de classificação
    rrect(doc, C.surface2, colA.x + 4, popY + 66, 88, 8, 1.2);
    doc.setFontSize(5);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Classificar:', colA.x + 6, popY + 70.5);
    ['Em Contato', 'Qualificado', 'Convertido', 'Descartar'].forEach((c, i) => {
      const cx = colA.x + 22 + i * 17.5;
      rstroke(doc, C.accent, cx, popY + 67, 16, 6, 1, 0.4);
      doc.setFontSize(4.6);
      txt(doc, C.accent, c, cx + 8, popY + 71, { align: 'center' });
    });

    // link cadastro
    doc.setFontSize(6);
    doc.setFont(undefined, 'bold');
    txt(doc, C.accent, '› Ver cadastro do cliente', colA.x + 4, popY + 82);
    // bloco negociação
    rrect(doc, C.surface, colA.x + 4, popY + 88, 88, 34, 1.5);
    rstroke(doc, C.border, colA.x + 4, popY + 88, 88, 34, 1.5, 0.3);
    doc.setFontSize(5.5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Negociação em andamento', colA.x + 6, popY + 93);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Produto: ___  Valor: R$ ___', colA.x + 6, popY + 98);
    rrect(doc, C.accent, colA.x + 6, popY + 112, 30, 6, 1);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.setFont(undefined, 'bold');
    doc.text('Salvar', colA.x + 21, popY + 116, { align: 'center' });

    // coluna B (Pitch IA)
    const colB = { x: popX + 104, w: 70 };
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Painel de Pitch (IA)', colB.x + 1, popY + 14);
    line(doc, C.border, colB.x + 1, popY + 15, colB.x + 35, popY + 15, 0.3);

    // roteiro
    rrect(doc, C.surface, colB.x + 1, popY + 18, colB.w - 2, 34, 1.5);
    rstroke(doc, C.border, colB.x + 1, popY + 18, colB.w - 2, 34, 1.5, 0.3);
    doc.setFontSize(5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.muted, 'Roteiro do produto', colB.x + 3, popY + 23);
    doc.setFont(undefined, 'normal');
    line(doc, C.border, colB.x + 3, popY + 25, colB.x + colB.w - 5, popY + 25, 0.2);
    for (let l = 0; l < 6; l++) line(doc, C.border, colB.x + 3, popY + 28 + l * 3.4, colB.x + colB.w - 6, popY + 28 + l * 3.4, 0.2);

    // objeções (pills)
    doc.setFontSize(5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.muted, 'Objeções comuns', colB.x + 1, popY + 55);
    ['"É seguro?"', '"Quanto custa?"', '"Tenho medo"'].forEach((o, i) => {
      const px = colB.x + 1 + (i % 2) * 33;
      const py = popY + 57 + Math.floor(i / 2) * 7;
      rrect(doc, mix(C.accent, C.white, 0.85), px, py, 31, 5.5, 2.5);
      rstroke(doc, C.accent, px, py, 31, 5.5, 2.5, 0.3);
      doc.setFontSize(4.6);
      doc.setFont(undefined, 'normal');
      txt(doc, C.accent, o, px + 2, py + 3.6);
    });

    // chat IA
    doc.setFontSize(5);
    doc.setFont(undefined, 'bold');
    txt(doc, C.muted, 'Trabalhe objeções — digite', colB.x + 1, popY + 73);
    rrect(doc, mix(C.accent, C.white, 0.82), colB.x + 3, popY + 75, colB.w - 6, 12, 1.5);
    doc.setFontSize(4.6);
    doc.setFont(undefined, 'normal');
    txt(doc, C.accent, 'IA: responda com foco em proteção patrimonial...', colB.x + 5, popY + 80);
    line(doc, C.border, colB.x + 5, popY + 83, colB.x + colB.w - 8, popY + 83, 0.2);
    txt(doc, C.accent, 'e gere um roteiro sob medida para o lead.', colB.x + 5, popY + 86);

    // input fixo
    rrect(doc, C.white, colB.x + 1, popY + 112, colB.w - 8, 7, 1);
    rstroke(doc, C.border, colB.x + 1, popY + 112, colB.w - 8, 7, 1, 0.4);
    doc.setFontSize(4.8);
    txt(doc, C.muted, 'Digite a objeção do lead...', colB.x + 3, popY + 116.5);
    rrect(doc, C.accent, colB.x + colB.w - 6, popY + 112, 5, 7, 1);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('›', colB.x + colB.w - 3.5, popY + 116.8, { align: 'center' });

    // ── Marcadores numerados sobre a ilustração ──
    const marks = [
      { n: 1, x: colA.x + 6, y: popY + 20, c: C.green },
      { n: 2, x: colA.x + 54, y: popY + 20, c: C.blue },
      { n: 3, x: colA.x + 4, y: popY + 54, c: C.green },
      { n: 4, x: colA.x + 52, y: popY + 54, c: C.red },
      { n: 5, x: colA.x + 4, y: popY + 66, c: C.accent },
      { n: 6, x: colA.x + 4, y: popY + 82, c: C.accent },
      { n: 7, x: colB.x + 1, y: popY + 18, c: C.violet },
      { n: 8, x: colB.x + 3, y: popY + 75, c: C.accent },
    ];
    marks.forEach(m => marker(doc, m.n, m.x - 1, m.y - 1, m.c));

    // ── Legenda dos marcadores (lado direito) ──
    const legX = 200, legY2 = 47, legW = 86;
    rrect(doc, C.surface, legX, legY2, legW, 132, 2);
    rstroke(doc, C.border, legX, legY2, legW, 132, 2, 0.4);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Legenda das flags', legX + 4, legY2 + 6);

    const legenda = [
      { n: 1, t: 'QR WhatsApp', d: 'Toque abre o WhatsApp Web já com o número do lead.', c: C.green },
      { n: 2, t: 'QR Ligação', d: 'Disca o telefone direto no discador do sistema.', c: C.blue },
      { n: 3, t: 'Atendeu', d: 'Registra o contato e abre a agenda da reunião.', c: C.green },
      { n: 4, t: 'Não Atendeu', d: 'Reagenda o lead para o próximo dia útil.', c: C.red },
      { n: 5, t: 'Classificar', d: 'Move o lead na esteira: Em Contato, Qualificado, Convertido ou Descartar.', c: C.accent },
      { n: 6, t: 'Ver cadastro', d: 'Abre os dados completos do lead (PF/PJ, endereço, origem).', c: C.accent },
      { n: 7, t: 'Roteiro do Pitch', d: 'Pitch estruturado por produto selecionado.', c: C.violet },
      { n: 8, t: 'Chat com IA', d: 'Trata objeções do lead em tempo real, com foco em proteção patrimonial.', c: C.accent },
    ];
    let ly = legY2 + 12;
    legenda.forEach(l => {
      marker(doc, l.n, legX + 6, ly, l.c);
      doc.setFontSize(6.2);
      doc.setFont(undefined, 'bold');
      txt(doc, C.text, l.t, legX + 12, ly + 1);
      doc.setFontSize(5.4);
      doc.setFont(undefined, 'normal');
      const dl = doc.splitTextToSize(l.d, legW - 16);
      dl.forEach((ln, i) => txt(doc, C.muted, ln, legX + 12, ly + 5 + i * 3.1));
      ly += 5 + dl.length * 3.1 + 2.2;
    });

    // legenda de status (rodapé da página)
    const stY = popY + popH + 6;
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Status da Fila', 14, stY);
    line(doc, C.accent, 14, stY + 1.3, 34, stY + 1.3, 1);
    const statusLeg = [
      { c: C.muted, l: 'Pendente' },
      { c: C.amber, l: 'Em Contato' },
      { c: C.blue, l: 'Qualificado' },
      { c: C.green, l: 'Convertido' },
      { c: C.red, l: 'Descartado' },
    ];
    statusLeg.forEach((s, i) => {
      const lx = 14 + i * 36;
      rrect(doc, s.c, lx, stY + 4, 5, 5, 1);
      doc.setFontSize(6);
      doc.setFont(undefined, 'normal');
      txt(doc, C.text, s.l, lx + 7, stY + 8);
    });

    footer(doc, pageW, pageH, 2, TOTAL);

    // ═══════════════ PÁGINA 3 — CONVERSÃO + NOTAS ═══════════════
    doc.addPage();
    fill(doc, C.bg, 0, 0, pageW, pageH);
    header(doc, pageW, 'Conversão & Notas', 'Contrato, Venda e Implantação');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Conversão em Contrato & Venda', 12, 30);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1);
    doc.line(12, 32, 70, 32);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Ao classificar o lead como "Convertido", o sistema gera automaticamente Cliente, Contrato (rascunho),', 12, 37);
    txt(doc, C.muted, 'Pipeline (Fechado) e Venda — com as comissões do vendedor e dos indicadores vinculados.', 12, 41);

    // ── Fluxo horizontal de conversão (6 etapas) ──
    const conv = [
      { n: 1, t: 'Qualificado', f: 'Lead sai da fila e entra no Pipeline', c: C.blue },
      { n: 2, t: 'Pipeline', f: 'Negócio aberto para negociação', c: C.violet },
      { n: 3, t: 'Contrato', f: 'Rascunho gerado com dados do lead', c: C.amber },
      { n: 4, t: 'Assinatura', f: 'Link enviado ao cliente', c: C.accent },
      { n: 5, t: 'Venda', f: 'Comissão gerada p/ vendedor e indicadores', c: C.green },
      { n: 6, t: 'Implantação', f: 'Checklist de fases + notificações Jarvis', c: C.amber },
    ];
    const cw = 34, cg = 8, ch = 18, cfh = 20;
    const convTotal = conv.length * cw + (conv.length - 1) * cg;
    let cx = (pageW - convTotal) / 2;
    const convY = 50;
    conv.forEach((s, i) => {
      stageBox(doc, cx, convY, cw, ch, s.n, s.t, s.c);
      flag(doc, cx, convY + ch + 2.5, cw, cfh, s.f, s.c);
      if (i < conv.length - 1) arrowRight(doc, cx + cw, cx + cw + cg, convY + ch / 2, C.accent);
      cx += cw + cg;
    });

    // ── Notas técnicas ──
    const ny = convY + ch + cfh + 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Notas técnicas', 12, ny);
    line(doc, C.accent, 12, ny + 1.5, 36, ny + 1.5, 1);

    const notas = [
      'Lead externo (webhook Make/Zapier) entra pela Central de Leads e é distribuído por round-robin entre os gerentes ativos na esteira.',
      'Indicação do Portal do Indicador gera uma LeadIndicação e entra na Fila de Contatos do gerente sorteado.',
      'O popup de atendimento exibe QR codes de ação: WhatsApp (wa.me) e Ligação (tel:) — basta tocar para iniciar o contato.',
      'O painel de Pitch oferece roteiro por produto, objeções comuns e chat com IA para responder em tempo real.',
      'Classificar como "Qualificado" envia o lead para o Pipeline; "Convertido" gera Contrato + Venda automaticamente.',
      'A conversão cria Cliente, Contrato (rascunho), Pipeline (Fechado) e Venda com comissões do vendedor e indicadores.',
      'Venda do tipo "nova" dispara a criação automática da Implantação; "recorrência" apenas atualiza o financeiro.',
      'O controle de SLA monitora o tempo de resposta do gerente e dispara alertas quando o prazo estoura.',
      'O histórico de interações do lead aparece no Portal do Indicador (acompanhamento em tempo real pelo parceiro).',
    ];
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    let ty = ny + 8;
    notas.forEach(n => {
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(14, ty - 1, 0.9, 'F');
      const lines = doc.splitTextToSize(n, pageW - 60);
      lines.forEach((ln, i) => txt(doc, C.text, ln, 18, ty + i * 4));
      ty += lines.length * 4 + 2;
    });

    // bloco destaque lateral direito
    const dx = pageW - 86, dy = ny;
    rrect(doc, mix(C.navy, C.white, 0.93), dx, dy, 74, 70, 2);
    rstroke(doc, C.navy, dx, dy, 74, 70, 2, 0.5);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    txt(doc, C.navy, 'Resumo do funil', dx + 5, dy + 6);
    line(doc, C.accent, dx + 5, dy + 7.5, dx + 30, dy + 7.5, 0.8);
    const resumo = [
      ['Captação', 'webhook / portal'],
      ['Distribuição', 'round-robin'],
      ['Atendimento', 'popup + Pitch IA'],
      ['Qualificação', 'Pipeline'],
      ['Conversão', 'Contrato + Venda'],
      ['Pós-venda', 'Implantação + Jarvis'],
    ];
    let ry = dy + 12;
    resumo.forEach(([k, v]) => {
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      txt(doc, C.text, k, dx + 5, ry);
      doc.setFont(undefined, 'normal');
      txt(doc, C.accent, v, dx + 38, ry);
      line(doc, C.border, dx + 5, ry + 1.5, dx + 69, ry + 1.5, 0.2);
      ry += 8;
    });

    footer(doc, pageW, pageH, 3, TOTAL);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=manual-jornada-lead.pdf' },
    });
  } catch (error) {
    console.error('gerarManualJornadaLeadPDF:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}