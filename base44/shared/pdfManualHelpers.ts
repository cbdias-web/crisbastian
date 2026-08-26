// Helpers compartilhados de geração de PDFs institucionais (manual da jornada,
// manual de cadastro do indicador e futuros). Paleta institucional clara + paleta
// Aurora escura da plataforma. Fonte Inter (Unicode) para acentuação correta.

// ── Paleta institucional (tema claro para a página) ──
export const C = {
  bg: [255, 255, 255],
  navy: [15, 43, 91],
  navy2: [30, 64, 120],
  accent: [0, 150, 136],
  surface: [246, 247, 249],
  surface2: [236, 240, 244],
  border: [203, 213, 225],
  blue: [37, 99, 235],
  amber: [217, 119, 6],
  green: [22, 163, 74],
  red: [220, 38, 38],
  violet: [124, 58, 237],
  pink: [219, 39, 119],
  text: [17, 24, 39],
  muted: [107, 114, 128],
  white: [255, 255, 255],
};

// ── Paleta Aurora (tema escuro da plataforma) ──
export const A = {
  bg: [13, 17, 23],
  surface: [22, 27, 34],
  surface2: [28, 35, 51],
  border: [0, 212, 170],
  accent: [0, 212, 170],
  text: [230, 237, 243],
  muted: [139, 150, 163],
  green: [52, 211, 153],
  blue: [96, 165, 250],
  red: [248, 113, 113],
  amber: [251, 191, 36],
  violet: [167, 139, 250],
};

export function fill(doc, rgb, x, y, w, h) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(x, y, w, h, 'F'); }
export function rrect(doc, rgb, x, y, w, h, r) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.roundedRect(x, y, w, h, r, r, 'F'); }
export function rstroke(doc, rgb, x, y, w, h, r, lw) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(lw || 0.5); doc.roundedRect(x, y, w, h, r, r, 'S');
}
export function line(doc, rgb, x1, y1, x2, y2, lw) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(lw || 0.5); doc.line(x1, y1, x2, y2); }
export function txt(doc, rgb, str, x, y, opts = {}) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.text(str == null ? '' : String(str), x, y, opts); }
export function mix(c1, c2, t) {
  return [Math.round(c1[0] * (1 - t) + c2[0] * t), Math.round(c1[1] * (1 - t) + c2[1] * t), Math.round(c1[2] * (1 - t) + c2[2] * t)];
}
export function normal(doc) { doc.setFont('Inter', 'normal'); }
export function bold(doc) { doc.setFont('Inter', 'bold'); }

// Fundo degradê vertical (claro, institucional)
export function pageBg(doc, w, h) {
  const top = [240, 248, 245];
  const bot = [222, 233, 246];
  const steps = 90;
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const c = mix(top, bot, t);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(0, i * sh, w, sh + 0.6, 'F');
  }
}

// Caixa de etapa (numerada, topo colorido)
export function stageBox(doc, x, y, w, h, num, titulo, color) {
  rrect(doc, C.white, x, y, w, h, 2.5);
  rstroke(doc, color, x, y, w, h, 2.5, 0.9);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, 5.5, 2.5, 2.5, 'F');
  doc.rect(x, y + 2.5, w, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  bold(doc);
  doc.text(String(num), x + w / 2, y + 4, { align: 'center' });
  doc.setFontSize(7.5);
  bold(doc);
  const tlines = doc.splitTextToSize(titulo, w - 4);
  tlines.forEach((ln, i) => txt(doc, C.text, ln, x + w / 2, y + 10 + i * 3.6, { align: 'center' }));
}

// Bandeirinha (flag) com mensagem explicativa
export function flag(doc, x, y, w, h, msg, color) {
  const tint = mix(color, C.white, 0.86);
  line(doc, color, x + 3, y - 3, x + 3, y, 0.5);
  rrect(doc, tint, x, y, w, h, 1.2);
  rstroke(doc, color, x, y, w, h, 1.2, 0.4);
  doc.setFontSize(5.4);
  normal(doc);
  const lines = doc.splitTextToSize(msg, w - 3);
  lines.forEach((ln, i) => txt(doc, C.text, ln, x + 1.5, y + 3 + i * 3.1));
}

export function arrowRight(doc, xFrom, xTo, y, color) {
  line(doc, color, xFrom, y, xTo, y, 0.9);
  line(doc, color, xTo, y, xTo - 2.2, y - 1.3, 0.9);
  line(doc, color, xTo, y, xTo - 2.2, y + 1.3, 0.9);
}
export function arrowDown(doc, x, yFrom, yTo, color) {
  line(doc, color, x, yFrom, x, yTo, 0.9);
  line(doc, color, x, yTo, x - 1.3, yTo - 2.2, 0.9);
  line(doc, color, x, yTo, x + 1.3, yTo - 2.2, 0.9);
}

// Marcador numerado (callout)
export function marker(doc, num, x, y, color) {
  doc.setFillColor(255, 255, 255);
  doc.circle(x, y, 3.2, 'F');
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.6);
  doc.circle(x, y, 3.2, 'S');
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y, 1.4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.5);
  bold(doc);
  doc.text(String(num), x, y + 1.2, { align: 'center' });
}

// Cabeçalho institucional
export function header(doc, pageW, titulo, subtitulo) {
  fill(doc, C.navy, 0, 0, pageW, 16);
  doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
  doc.roundedRect(12, 4, 8, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  bold(doc);
  doc.text('VX', 16, 9.6, { align: 'center' });
  doc.setFontSize(9);
  bold(doc);
  txt(doc, C.white, 'VILLELA EXCHANGE', 23, 8.2);
  doc.setFontSize(5.5);
  normal(doc);
  txt(doc, [180, 199, 231], 'Câmbio & Soluções Internacionais', 23, 12);
  doc.setFontSize(8);
  bold(doc);
  txt(doc, C.white, titulo, pageW - 12, 7, { align: 'right' });
  doc.setFontSize(5.5);
  normal(doc);
  txt(doc, [180, 199, 231], subtitulo, pageW - 12, 11.5, { align: 'right' });
  fill(doc, C.accent, 0, 16, pageW, 1);
}

export function footer(doc, pageW, pageH, page, total, nomeManual = 'Manual da Jornada do Lead') {
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.setLineWidth(0.3);
  doc.line(12, pageH - 8, pageW - 12, pageH - 8);
  doc.setFontSize(5.5);
  normal(doc);
  txt(doc, C.muted, `Villela Exchange · ${nomeManual} · v1.0`, 12, pageH - 4);
  txt(doc, C.muted, `${page} / ${total}`, pageW - 12, pageH - 4, { align: 'right' });
}

// Baixa e registra a fonte Inter (Unicode) para renderizar acentos
export async function setupFont(doc) {
  const regUrl = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_400Regular.ttf';
  const boldUrl = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_700Bold.ttf';
  const toB64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  };
  const [r1, r2] = await Promise.all([fetch(regUrl), fetch(boldUrl)]);
  if (!r1.ok || !r2.ok) throw new Error('Falha ao baixar fonte Inter');
  const [regB64, boldB64] = [toB64(await r1.arrayBuffer()), toB64(await r2.arrayBuffer())];
  doc.addFileToVFS('Inter-Regular.ttf', regB64);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', boldB64);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
  doc.setFont('Inter', 'normal');
}

// Campo de input (mockup escuro Aurora)
export function inputField(doc, x, y, w, h, label, value) {
  doc.setFontSize(4.5);
  normal(doc);
  txt(doc, A.muted, label, x, y - 0.8);
  rrect(doc, A.surface2, x, y, w, h, 1);
  rstroke(doc, A.border, x, y, w, h, 1, 0.3);
  doc.setFontSize(5.5);
  normal(doc);
  txt(doc, A.text, value || '', x + 1.5, y + h / 2 + 1.2);
}

// Padrão "QR" decorativo (placeholder)
export function qrPattern(doc, x, y, size, seed) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 1, 1, 'F');
  doc.setFillColor(20, 20, 30);
  const n = 6, cell = (size - 4) / n;
  for (let qx = 0; qx < n; qx++) for (let qy = 0; qy < n; qy++) {
    if ((qx * 3 + qy * 5 + seed) % 4 === 0) doc.rect(x + 2 + qx * cell, y + 2 + qy * cell, cell, cell, 'F');
  }
  [[0, 0], [n - 1, 0], [0, n - 1]].forEach(([cx, cy]) => {
    doc.rect(x + 2 + cx * cell, y + 2 + cy * cell, cell * 2, cell * 2, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 2 + cx * cell + cell * 0.35, y + 2 + cy * cell + cell * 0.35, cell * 1.3, cell * 1.3, 'F');
    doc.setFillColor(20, 20, 30);
    doc.rect(x + 2 + cx * cell + cell * 0.75, y + 2 + cy * cell + cell * 0.75, cell * 0.5, cell * 0.5, 'F');
  });
}