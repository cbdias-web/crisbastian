import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';

function ra(str) {
  return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
}

// Paleta Aurora Borealis (dark theme)
const C = {
  bg: [13, 17, 23],
  surface: [22, 27, 34],
  surface2: [28, 35, 51],
  accent: [0, 212, 170],
  accentDim: [0, 212, 170],
  blue: [96, 165, 250],
  amber: [251, 191, 36],
  green: [52, 211, 153],
  red: [248, 113, 113],
  violet: [167, 139, 250],
  text: [230, 237, 243],
  muted: [139, 150, 163],
  border: [0, 212, 170],
};

function fill(doc, rgb, x, y, w, h) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y, w, h, 'F');
}
function stroke(doc, rgb, x, y, w, h) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(x, y, w, h, 'S');
}
function txt(doc, rgb, str, x, y, opts = {}) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(ra(str), x, y, opts);
}

// Caixa de fluxo com ícone (número) + título + sub
function flowBox(doc, x, y, w, h, num, titulo, sub, color) {
  fill(doc, C.surface2, x, y, w, h);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');
  // círculo número
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x + 6, y + 6, 3, 'F');
  doc.setTextColor(13, 17, 23);
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.text(String(num), x + 6, y + 7.5, { align: 'center' });
  // título
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'bold');
  txt(doc, color, titulo, x + 11, y + 6.5);
  // sub
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'normal');
  txt(doc, C.muted, sub, x + 11, y + 11);
  doc.setTextColor(C.text[0], C.text[1], C.text[2]);
}

// Seta vertical entre caixas
function arrowDown(doc, x, yFrom, yTo, color) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  doc.line(x, yFrom, x, yTo);
  // ponta
  doc.line(x, yTo, x - 1.5, yTo - 2.5);
  doc.line(x, yTo, x + 1.5, yTo - 2.5);
}
// Seta horizontal
function arrowRight(doc, xFrom, xTo, y, color) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  doc.line(xFrom, y, xTo, y);
  doc.line(xTo, y, xTo - 2.5, y - 1.5);
  doc.line(xTo, y, xTo - 2.5, y + 1.5);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── PÁGINA 1: CAPA + FLUXO DA JORNADA ──
    // fundo dark
    fill(doc, C.bg, 0, 0, pageW, pageH);
    // header accent
    doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.rect(0, 0, pageW, 2, 'F');

    // título
    doc.setFont(undefined, 'bold');
    doc.setFontSize(22);
    txt(doc, C.accent, 'VILLELA EXCHANGE', pageW / 2, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Gestao Comercial · Manual Tecnico', pageW / 2, 35, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Jornada do Lead: da Captacao a Conversao', pageW / 2, 52, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Fila de Leads · Agenda do Dia · Central de Leads · Contrato & Venda', pageW / 2, 59, { align: 'center' });

    // linha divisória
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setLineWidth(0.3);
    doc.line(60, 66, pageW - 60, 66);

    // ── FLUXOGRAMA VERTICAL (7 etapas) ──
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Fluxo da Jornada do Lead', 14, 80);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1.5);
    doc.line(14, 82, 50, 82);

    const boxW = 120, boxH = 16, boxX = (pageW - boxW) / 2;
    let y = 90;
    const gap = 8;

    const etapas = [
      { n: 1, t: 'Captacao do Lead', s: 'Webhook (Make/Zapier) ou Portal do Indicador', c: C.blue },
      { n: 2, t: 'Central de Leads', s: 'Conversa WhatsApp criada + Kanban de funil', c: C.accent },
      { n: 3, t: 'Distribuicao Round-Robin', s: 'Gerente disponivel selecionado por roleta justa', c: C.violet },
      { n: 4, t: 'Fila de Contatos / Agenda do Dia', s: 'Lead entra na esteira do dia do gerente', c: C.amber },
      { n: 5, t: 'Popup de Atendimento', s: 'QR codes de acao + Pitch IA + registros', c: C.green },
      { n: 6, t: 'Qualificacao', s: 'Lead classificado: Qualificado -> Pipeline', c: C.blue },
      { n: 7, t: 'Conversao', s: 'Contrato + Venda efetiva gerados automaticamente', c: C.green },
    ];

    etapas.forEach((e, i) => {
      flowBox(doc, boxX, y, boxW, boxH, e.n, e.t, e.s, e.c);
      if (i < etapas.length - 1) {
        arrowDown(doc, pageW / 2, y + boxH, y + boxH + gap, C.accent);
      }
      y += boxH + gap;
    });

    // ramificação pós-conversão
    y += 2;
    arrowDown(doc, pageW / 2, y, y + 6, C.accent);
    y += 6;
    // caixa implantação
    flowBox(doc, boxX, y, boxW, boxH, 8, 'Implantacao (Pos-Venda)', 'Checklist de fases + notificacoes Jarvis', C.amber);

    // rodapé
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Villela Exchange · Manual da Jornada do Lead · Ago/2026', 14, pageH - 8);

    // ── PÁGINA 2: DETALHES DO POPUP + PITCH IA ──
    doc.addPage();
    fill(doc, C.bg, 0, 0, pageW, pageH);
    doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.rect(0, 0, pageW, 2, 'F');

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Popup de Atendimento — Fila de Contatos', 14, 18);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1.2);
    doc.line(14, 21, 80, 21);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Interface central do atendimento ao lead. Dois QR codes de acao (WhatsApp e Ligacao),', 14, 28);
    txt(doc, C.muted, 'painel de Pitch com IA para tratar objeções em tempo real e registros do contato.', 14, 33);

    // Diagrama do popup: duas colunas
    const popY = 40, popH = 110;
    // coluna principal
    const colA = { x: 14, w: 90 };
    const colB = { x: 110, w: 86 };
    // container
    fill(doc, C.surface, 14, popY, pageW - 28, popH);
    stroke(doc, C.border, 14, popY, pageW - 28, popH);
    doc.setLineWidth(0.5);

    // header popup
    fill(doc, C.surface2, 14, popY, pageW - 28, 8);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    txt(doc, C.accent, 'CAPA DO CONTATO', pageW / 2, popY + 5.5, { align: 'center' });

    // coluna A — QR + botoes
    doc.setFontSize(8);
    txt(doc, C.text, 'Coluna Principal', colA.x + 3, popY + 14);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.line(colA.x + 3, popY + 15.5, colA.x + 40, popY + 15.5);

    // QR WhatsApp (quadrado verde)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(colA.x + 8, popY + 20, 22, 22, 1.5, 1.5, 'F');
    doc.setDrawColor(C.green[0], C.green[1], C.green[2]);
    doc.roundedRect(colA.x + 8, popY + 20, 22, 22, 1.5, 1.5, 'S');
    // "QR" placeholder pattern
    doc.setFillColor(0, 0, 0);
    for (let qx = 0; qx < 5; qx++) for (let qy = 0; qy < 5; qy++) {
      if ((qx + qy) % 2 === 0) doc.rect(colA.x + 11 + qx * 3.2, popY + 23 + qy * 3.2, 2.8, 2.8, 'F');
    }
    doc.setFontSize(6);
    txt(doc, C.green, 'WhatsApp', colA.x + 19, popY + 45, { align: 'center' });

    // QR Ligação (azul)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(colA.x + 48, popY + 20, 22, 22, 1.5, 1.5, 'F');
    doc.setDrawColor(C.blue[0], C.blue[1], C.blue[2]);
    doc.roundedRect(colA.x + 48, popY + 20, 22, 22, 1.5, 1.5, 'S');
    doc.setFillColor(0, 0, 0);
    for (let qx = 0; qx < 5; qx++) for (let qy = 0; qy < 5; qy++) {
      if ((qx + qy * 2) % 3 === 0) doc.rect(colA.x + 51 + qx * 3.2, popY + 23 + qy * 3.2, 2.8, 2.8, 'F');
    }
    doc.setFontSize(6);
    txt(doc, C.blue, 'Ligacao', colA.x + 59, popY + 45, { align: 'center' });

    // botões de desfecho
    doc.setFillColor(C.green[0], C.green[1], C.green[2]);
    doc.roundedRect(colA.x + 6, popY + 52, 38, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont(undefined, 'bold');
    doc.text(ra('Atendeu'), colA.x + 25, popY + 56.5, { align: 'center' });
    doc.setFillColor(C.red[0], C.red[1], C.red[2]);
    doc.roundedRect(colA.x + 48, popY + 52, 38, 7, 1.5, 1.5, 'F');
    doc.text(ra('Nao Atendeu'), colA.x + 67, popY + 56.5, { align: 'center' });

    // barra de classificação
    doc.setFillColor(C.surface2[0], C.surface2[1], C.surface2[2]);
    doc.roundedRect(colA.x + 6, popY + 63, 80, 6, 1, 1, 'F');
    doc.setFontSize(5.5);
    doc.setFont(undefined, 'normal');
    txt(doc, C.muted, 'Classificar:', colA.x + 8, popY + 67);
    ['Em Contato', 'Qualificado', 'Convertido'].forEach((c, i) => {
      const cx = colA.x + 22 + i * 20;
      doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.roundedRect(cx, popY + 63.5, 18, 5, 1, 1, 'S');
      doc.setFontSize(5);
      txt(doc, C.accent, c, cx + 9, popY + 67, { align: 'center' });
    });

    // link cadastro
    doc.setFontSize(6);
    txt(doc, C.accent, '> Ver cadastro do cliente', colA.x + 6, popY + 76);

    // coluna B — Pitch IA
    doc.setFontSize(8);
    txt(doc, C.text, 'Painel de Pitch (IA)', colB.x + 3, popY + 14);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.line(colB.x + 3, popY + 15.5, colB.x + 40, popY + 15.5);

    // roteiro
    fill(doc, C.surface2, colB.x + 3, popY + 20, colB.w - 6, 30);
    doc.setFontSize(6);
    txt(doc, C.muted, 'Roteiro do produto...', colB.x + 5, popY + 25);
    doc.setDrawColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.setLineWidth(0.2);
    for (let l = 0; l < 6; l++) doc.line(colB.x + 5, popY + 29 + l * 3, colB.x + colB.w - 10, popY + 29 + l * 3);

    // objeções (pills)
    doc.setFontSize(5.5);
    txt(doc, C.muted, 'Objeções comuns', colB.x + 3, popY + 53);
    [0, 1].forEach((r) => {
      [0, 1].forEach((c) => {
        const px = colB.x + 3 + c * 38;
        const py = popY + 55 + r * 6;
        doc.setFillColor(C.surface2[0], C.surface2[1], C.surface2[2]);
        doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
        doc.roundedRect(px, py, 36, 5, 2.5, 2.5, 'FD');
        txt(doc, C.accent, '"É seguro?"', px + 3, py + 3.5);
      });
    });

    // chat IA
    doc.setFontSize(5.5);
    txt(doc, C.muted, 'Trabalhe objeções — clique ou digite', colB.x + 3, popY + 70);
    fill(doc, C.surface2, colB.x + 3, popY + 72, colB.w - 6, 12);
    // bolha IA
    const bolha = rgba(C.accent, 0.15);
    doc.setFillColor(bolha[0], bolha[1], bolha[2]);
    doc.roundedRect(colB.x + 5, popY + 74, 50, 7, 1.5, 1.5, 'F');
    txt(doc, C.accent, 'IA: responda com foco em proteção...', colB.x + 7, popY + 78);

    // input
    fill(doc, C.surface, colB.x + 3, popY + 86, colB.w - 10, 6);
    stroke(doc, C.border, colB.x + 3, popY + 86, colB.w - 10, 6);
    txt(doc, C.muted, 'Digite a objeção do lead...', colB.x + 5, popY + 90);
    // botão enviar
    doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.roundedRect(colB.x + colB.w - 6, popY + 86, 6, 6, 1, 1, 'F');
    doc.setTextColor(13, 17, 23);
    doc.setFont(undefined, 'bold');
    doc.text('>', colB.x + colB.w - 3, popY + 90, { align: 'center' });

    // ── Legenda de cores (status) ──
    const legY = popY + popH + 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Legenda de Status da Fila', 14, legY);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.line(14, legY + 1.5, 60, legY + 1.5);

    const statusLeg = [
      { c: C.muted, l: 'Pendente' },
      { c: C.amber, l: 'Em Contato' },
      { c: C.blue, l: 'Qualificado' },
      { c: C.green, l: 'Convertido' },
      { c: C.red, l: 'Descartado' },
    ];
    statusLeg.forEach((s, i) => {
      const lx = 14 + i * 35;
      doc.setFillColor(s.c[0], s.c[1], s.c[2]);
      doc.roundedRect(lx, legY + 6, 6, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      txt(doc, C.text, s.l, lx + 8, legY + 10.5);
    });

    // rodapé
    doc.setFontSize(7);
    txt(doc, C.muted, 'Villela Exchange · Manual da Jornada do Lead · Ago/2026', 14, pageH - 8);

    // ── PÁGINA 3: FLUXO DE CONVERSÃO ──
    doc.addPage();
    fill(doc, C.bg, 0, 0, pageW, pageH);
    doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.rect(0, 0, pageW, 2, 'F');

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Conversao em Contrato & Venda', 14, 18);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.setLineWidth(1.2);
    doc.line(14, 21, 90, 21);

    // fluxo horizontal de conversão
    const convY = 45, convH = 18;
    const convSteps = [
      { t: 'Lead Qualificado', s: 'Fila: qualificado', c: C.blue },
      { t: 'Pipeline', s: 'Negocio aberto', c: C.violet },
      { t: 'Contrato', s: 'Rascunho gerado', c: C.amber },
      { t: 'Assinatura', s: 'Link assinatura', c: C.accent },
      { t: 'Venda', s: 'Comissao gerada', c: C.green },
    ];
    const sw = 32, sgap = 6;
    const totalW = convSteps.length * sw + (convSteps.length - 1) * sgap;
    let sx = (pageW - totalW) / 2;
    convSteps.forEach((st, i) => {
      flowBox(doc, sx, convY, sw, convH, i + 1, st.t, st.s, st.c);
      if (i < convSteps.length - 1) arrowRight(doc, sx + sw, sx + sw + sgap, convY + convH / 2, C.accent);
      sx += sw + sgap;
    });

    // ramificação implantação
    arrowDown(doc, pageW / 2, convY + convH, convY + convH + 8, C.amber);
    flowBox(doc, (pageW - 120) / 2, convY + convH + 8, 120, 16, 6, 'Implantacao (Pos-Venda)', 'Checklist de fases + Jarvis + e-mail', C.amber);

    // notas técnicas
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    txt(doc, C.text, 'Notas Tecnicas', 14, convY + convH + 38);
    doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    doc.line(14, convY + convH + 39.5, 50, convY + convH + 39.5);

    const notas = [
      'Lead externo (webhook) entra pela Central de Leads e e distribuido por round-robin entre gerentes ativos na esteira.',
      'Indicacao do Portal do Indicador gera LeadIndicacao e entra na Fila de Contatos do gerente sorteado.',
      'O popup de atendimento exibe QR codes de acao: WhatsApp (wa.me) e Ligacao (tel:) — toque para iniciar contato.',
      'O painel de Pitch oferece roteiro por produto, objeções comuns e chat com IA para responder em tempo real.',
      'Classificar como "Qualificado" envia o lead para o Pipeline; "Convertido" gera Contrato + Venda automaticamente.',
      'A conversao cria Cliente, Contrato (rascunho), Pipeline (Fechado) e Venda com comissoes do vendedor e indicadores.',
      'Venda do tipo "nova" dispara a criacao automatica da Implantacao; "recorrencia" apenas atualiza o financeiro.',
    ];
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    let ny = convY + convH + 46;
    notas.forEach((n) => {
      // bullet
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(16, ny - 1, 0.8, 'F');
      const lines = doc.splitTextToSize(ra(n), pageW - 36);
      lines.forEach((ln, li) => {
        txt(doc, C.text, ln, 20, ny + li * 4.2);
      });
      ny += lines.length * 4.2 + 1.5;
    });

    // rodapé
    doc.setFontSize(7);
    txt(doc, C.muted, 'Villela Exchange · Manual da Jornada do Lead · Ago/2026', 14, pageH - 8);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=manual-jornada-lead.pdf' },
    });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// helper rgba inline (jsPDF setFillColor aceita 3 canais)
function rgba(c, a) {
  // aproximacao: mistura com bg
  const bg = C.bg;
  return [
    Math.round(c[0] * a + bg[0] * (1 - a)),
    Math.round(c[1] * a + bg[1] * (1 - a)),
    Math.round(c[2] * a + bg[2] * (1 - a)),
  ];
}