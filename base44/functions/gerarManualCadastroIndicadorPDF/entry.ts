import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';
import {
  C, A, fill, rrect, rstroke, line, txt, mix, normal, bold,
  pageBg, stageBox, flag, arrowRight, arrowDown, marker, header, footer, setupFont, inputField,
} from '../../shared/pdfManualHelpers.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    await setupFont(doc);
    const pageW = doc.internal.pageSize.getWidth();   // 297
    const pageH = doc.internal.pageSize.getHeight();  // 210
    const TOTAL = 5;

    // ═══════════════ PÁGINA 1 — CAPA + FLUXO DO CADASTRO ═══════════════
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Cadastro do Indicador', 'Do convite à primeira indicação');

    doc.setFontSize(17);
    bold(doc);
    txt(doc, C.navy, 'Cadastro do Indicador: do Convite à Primeira Indicação', 12, 30);
    line(doc, C.accent, 12, 32.5, 95, 32.5, 1.2);

    doc.setFontSize(8.5);
    normal(doc);
    txt(doc, C.muted, 'Este manual mostra o caminho completo do indicador na Villela Exchange — desde o recebimento do convite por e-mail', 12, 38);
    txt(doc, C.muted, 'até o cadastro validado, o aceite do termo e o início das indicações com o dashboard de acompanhamento.', 12, 42);

    const etapas = [
      { n: 1, t: 'Convite por e-mail', f: 'O admin cadastra o indicador e dispara o convite. Chega um e-mail com o botão de acesso ao portal.', c: C.blue },
      { n: 2, t: 'Definir senha', f: 'Na tela de login, use "Esqueci minha senha" com o e-mail do convite para criar sua senha de acesso.', c: C.accent },
      { n: 3, t: 'Validar cadastro', f: 'Você recebe um e-mail do portal com um código. Digite o código para confirmar e liberar o acesso.', c: C.violet },
      { n: 4, t: 'Aceitar o Termo', f: 'No primeiro acesso, leia o Termo de Uso (v1.0), marque "Li e concordo" e clique em "Aceitar e Acessar".', c: C.amber },
      { n: 5, t: 'Boas-vindas', f: 'Uma tela de boas-vindas confirma o cadastro e mostra sua comissão padrão. Clique em "Começar a indicar".', c: C.green },
      { n: 6, t: 'Indicar & Acompanhar', f: 'Cadastre novas indicações (PF/PJ) e acompanhe a jornada de cada lead no dashboard em tempo real.', c: C.pink },
    ];
    const bw = 42, bgap = 6.2, bh = 17, fh = 22;
    const totalRow = etapas.length * bw + (etapas.length - 1) * bgap;
    let sx = (pageW - totalRow) / 2;
    const rowY = 52;
    etapas.forEach((e, i) => {
      stageBox(doc, sx, rowY, bw, bh, e.n, e.t, e.c);
      flag(doc, sx, rowY + bh + 2.5, bw, fh, e.f, e.c);
      if (i < etapas.length - 1) arrowRight(doc, sx + bw, sx + bw + bgap, rowY + bh / 2, C.accent);
      sx += bw + bgap;
    });

    const legY = rowY + bh + fh + 10;
    rrect(doc, C.surface, 12, legY, pageW - 24, 22, 2);
    rstroke(doc, C.border, 12, legY, pageW - 24, 22, 2, 0.4);
    doc.setFontSize(7.5);
    bold(doc);
    txt(doc, C.navy, 'Como ler este manual', 16, legY + 5);
    doc.setFontSize(6.5);
    normal(doc);
    arrowRight(doc, 16, 30, legY + 10, C.accent);
    txt(doc, C.text, 'Seta = ordem das etapas do cadastro, do convite até a primeira indicação.', 33, legY + 10.5);
    flag(doc, 16, legY + 12, 14, 7, 'mensagem', C.amber);
    txt(doc, C.text, 'Bandeira = o que acontece em cada etapa e por quê (leia com atenção).', 33, legY + 16);

    rrect(doc, mix(C.accent, C.white, 0.88), pageW - 92, legY, 80, 22, 2);
    rstroke(doc, C.accent, pageW - 92, legY, 80, 22, 2, 0.4);
    doc.setFontSize(6.2);
    bold(doc);
    txt(doc, C.accent, 'GRUPO VILLELA · 20+ ANOS', pageW - 88, legY + 5);
    normal(doc);
    txt(doc, C.text, 'A Exchange é a vertical de câmbio e soluções', pageW - 88, legY + 9.5);
    txt(doc, C.text, 'internacionais do Grupo Villela — proteção patri-', pageW - 88, legY + 13);
    txt(doc, C.text, 'monial (offshore, conta internacional, canal bancário).', pageW - 88, legY + 16.5);

    footer(doc, pageW, pageH, 1, TOTAL, 'Manual de Cadastro do Indicador');

    // ═══════════════ PÁGINA 2 — E-MAIL DE CONVITE + LOGIN/DEFINIR SENHA ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Convite & Acesso', 'E-mail de convite · Definir senha');

    doc.setFontSize(14);
    bold(doc);
    txt(doc, C.navy, '1. Receber o convite e definir a senha de acesso', 12, 30);
    line(doc, C.accent, 12, 32, 120, 32, 1);
    doc.setFontSize(8);
    normal(doc);
    txt(doc, C.muted, 'O indicador recebe o convite por e-mail, acessa o portal e define sua senha pelo link "Esqueci minha senha".', 12, 37);

    // ── Mockup do e-mail de convite (esquerda) ──
    const ex = 14, ey = 44, ew = 130, eH = 120;
    rrect(doc, C.white, ex, ey, ew, eH, 2);
    rstroke(doc, C.border, ex, ey, ew, eH, 2, 0.5);
    rrect(doc, C.navy, ex, ey, ew, 22, 2);
    doc.rect(ex, ey + 12, ew, 10, 'F');
    doc.setFontSize(8);
    bold(doc);
    txt(doc, [0, 245, 180], 'Convite: Portal do Indicador', ex + ew / 2, ey + 9, { align: 'center' });
    doc.setFontSize(5.5);
    normal(doc);
    txt(doc, C.white, 'Villela Exchange', ex + ew / 2, ey + 16, { align: 'center' });
    doc.setFontSize(6.5);
    normal(doc);
    txt(doc, C.text, 'Olá, Indicador(a)!', ex + 6, ey + 30);
    txt(doc, C.text, 'Você foi cadastrado(a) como Indicador(a) da Villela Exchange.', ex + 6, ey + 37);
    txt(doc, C.text, 'Para começar, acesse o portal e homologue seu token aceitando', ex + 6, ey + 43);
    txt(doc, C.text, 'o Termo de Uso (v1.0). Em seguida você verá as opções de', ex + 6, ey + 49);
    txt(doc, C.text, 'indicação e acompanhamento.', ex + 6, ey + 55);
    rrect(doc, [0, 245, 180], ex + ew / 2 - 28, ey + 64, 56, 11, 2);
    doc.setTextColor(13, 27, 51);
    doc.setFontSize(6.5);
    bold(doc);
    doc.text('Acessar Portal do Indicador', ex + ew / 2, ey + 71, { align: 'center' });
    doc.setFontSize(5);
    normal(doc);
    txt(doc, C.muted, 'Seu acesso está vinculado ao e-mail do cadastro. Para entrar,', ex + 6, ey + 86);
    txt(doc, C.muted, 'use este e-mail e defina sua senha pelo link "Esqueci minha', ex + 6, ey + 91);
    txt(doc, C.muted, 'senha" na tela de login.', ex + 6, ey + 96);
    txt(doc, [160, 160, 160], 'Villela Exchange – Portal do Indicador', ex + ew / 2, ey + 112, { align: 'center' });

    marker(doc, 1, ex + 4, ey + 4, C.blue);
    marker(doc, 2, ex + ew / 2, ey + 70, C.accent);

    // ── Mockup da tela de login / definir senha (direita) ──
    const lx = 160, ly = 44, lw = 123, lH = 120;
    rrect(doc, A.bg, lx, ly, lw, lH, 2.5);
    rstroke(doc, A.border, lx, ly, lw, lH, 2.5, 0.8);
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.roundedRect(lx + lw / 2 - 6, ly + 10, 12, 12, 2, 2, 'F');
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6);
    bold(doc);
    doc.text('VX', lx + lw / 2, ly + 18, { align: 'center' });
    doc.setFontSize(8);
    bold(doc);
    txt(doc, A.text, 'Villela Exchange', lx + lw / 2, ly + 30, { align: 'center' });
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Portal do Indicador', lx + lw / 2, ly + 35, { align: 'center' });
    doc.setFontSize(7);
    bold(doc);
    txt(doc, A.text, 'Entrar', lx + lw / 2, ly + 46, { align: 'center' });
    inputField(doc, lx + 16, ly + 54, lw - 32, 10, 'E-MAIL', 'indicador@email.com');
    inputField(doc, lx + 16, ly + 74, lw - 32, 10, 'SENHA', '••••••••');
    rrect(doc, A.accent, lx + 16, ly + 90, lw - 32, 9, 1.5);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6.5);
    bold(doc);
    doc.text('Entrar', lx + lw / 2, ly + 96, { align: 'center' });
    doc.setFontSize(5.5);
    bold(doc);
    txt(doc, A.accent, 'Esqueci minha senha', lx + lw / 2, ly + 106, { align: 'center' });
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Use este link para definir sua senha no primeiro acesso.', lx + lw / 2, ly + 112, { align: 'center' });

    marker(doc, 3, lx + 16, ly + 59, C.accent);
    marker(doc, 4, lx + lw / 2, ly + 106, C.violet);

    const expY = 170;
    doc.setFontSize(7);
    bold(doc);
    txt(doc, C.navy, 'Passo a passo:', 14, expY);
    doc.setFontSize(6.5);
    normal(doc);
    const passos = [
      '① Abra o e-mail de convite e clique em "Acessar Portal do Indicador".',
      '② Na tela de login, digite o mesmo e-mail que recebeu o convite.',
      '③ Como é seu primeiro acesso, clique em "Esqueci minha senha" — você receberá um código por e-mail para criar sua senha.',
      '④ Com a senha criada, entre no portal. O sistema pedirá o aceite do Termo de Uso (próxima página).',
    ];
    passos.forEach((p, i) => txt(doc, C.text, p, 14, expY + 6 + i * 5));

    footer(doc, pageW, pageH, 2, TOTAL, 'Manual de Cadastro do Indicador');

    // ═══════════════ PÁGINA 3 — VALIDAÇÃO DO CÓDIGO + ACEITE DO TERMO + BOAS-VINDAS ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Validação & Termo', 'Código por e-mail · Aceite · Boas-vindas');

    doc.setFontSize(14);
    bold(doc);
    txt(doc, C.navy, '2. Validar o cadastro e aceitar o Termo de Uso', 12, 30);
    line(doc, C.accent, 12, 32, 110, 32, 1);
    doc.setFontSize(8);
    normal(doc);
    txt(doc, C.muted, 'Após definir a senha, o portal envia um código por e-mail para validar o cadastro. Depois, aceite o Termo de Uso.', 12, 37);

    // ── Mockup validação do código (esquerda) ──
    const vx = 14, vy = 44, vw = 84, vH = 78;
    rrect(doc, A.bg, vx, vy, vw, vH, 2.5);
    rstroke(doc, A.border, vx, vy, vw, vH, 2.5, 0.8);
    rrect(doc, A.surface2, vx, vy, vw, 10, 2.5);
    doc.rect(vx, vy + 5, vw, 5, 'F');
    doc.setFontSize(6.5);
    bold(doc);
    txt(doc, A.accent, 'VALIDAR CADASTRO', vx + vw / 2, vy + 6.5, { align: 'center' });
    doc.setFontSize(6);
    normal(doc);
    txt(doc, A.muted, 'Enviamos um código para o seu e-mail.', vx + vw / 2, vy + 18, { align: 'center' });
    txt(doc, A.muted, 'Digite-o abaixo para confirmar.', vx + vw / 2, vy + 23, { align: 'center' });
    const cw = 9, gap = 3;
    const codesX = vx + vw / 2 - (6 * cw + 5 * gap) / 2;
    for (let i = 0; i < 6; i++) {
      rrect(doc, A.surface2, codesX + i * (cw + gap), vy + 32, cw, cw, 1);
      rstroke(doc, A.border, codesX + i * (cw + gap), vy + 32, cw, cw, 1, 0.4);
    }
    rrect(doc, A.accent, vx + 12, vy + 52, vw - 24, 9, 1.5);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6.5);
    bold(doc);
    doc.text('Confirmar código', vx + vw / 2, vy + 58, { align: 'center' });
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Reenviar código', vx + vw / 2, vy + 68, { align: 'center' });

    marker(doc, 1, vx + vw / 2, vy + 6.5, C.violet);
    marker(doc, 2, vx + vw / 2, vy + 36, C.amber);

    // ── Mockup aceite do termo (centro) ──
    const tx = 104, ty = 44, tw = 92, tH = 110;
    rrect(doc, A.bg, tx, ty, tw, tH, 2.5);
    rstroke(doc, A.border, tx, ty, tw, tH, 2.5, 0.8);
    rrect(doc, A.surface2, tx, ty, tw, 14, 2.5);
    doc.rect(tx, ty + 7, tw, 7, 'F');
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.roundedRect(tx + 6, ty + 4, 6, 6, 1, 1, 'F');
    doc.setFontSize(5);
    bold(doc);
    txt(doc, A.text, 'Shield', tx + 8, ty + 8);
    doc.setFontSize(7);
    bold(doc);
    txt(doc, A.text, 'Formalização do Cadastro', tx + 14, ty + 7);
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Termo de Uso · Portal do Indicador', tx + 14, ty + 11);
    doc.setFontSize(6);
    normal(doc);
    txt(doc, A.text, 'Olá, Indicador(a)! Para acessar o', tx + 6, ty + 22);
    txt(doc, A.text, 'portal, leia e aceite o Termo de Uso:', tx + 6, ty + 27);
    rrect(doc, A.surface2, tx + 6, ty + 31, tw - 12, 44, 1.5);
    rstroke(doc, A.border, tx + 6, ty + 31, tw - 12, 44, 1.5, 0.3);
    doc.setFontSize(4.8);
    normal(doc);
    txt(doc, A.muted, '1. CADASTRO E ACESSO...', tx + 9, ty + 36);
    txt(doc, A.muted, '2. INDICAÇÕES...', tx + 9, ty + 41);
    txt(doc, A.muted, '3. COMISSÕES E ESPELHAMENTO...', tx + 9, ty + 46);
    txt(doc, A.muted, '4. NOTIFICAÇÕES...', tx + 9, ty + 51);
    txt(doc, A.muted, '5. CONFIDENCIALIDADE E LGPD...', tx + 9, ty + 56);
    txt(doc, A.muted, '6. ENCERRAMENTO...', tx + 9, ty + 61);
    txt(doc, A.muted, 'Ao aceitar, o Indicador concorda', tx + 9, ty + 68);
    txt(doc, A.muted, 'integralmente com os termos acima.', tx + 9, ty + 72);
    doc.setDrawColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(tx + 6, ty + 80, 5, 5, 1, 1, 'S');
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.rect(tx + 7, ty + 81, 3, 3, 'F');
    doc.setFontSize(5.5);
    normal(doc);
    txt(doc, A.text, 'Li e concordo com o Termo de Uso (v1.0)', tx + 13, ty + 84);
    rrect(doc, A.accent, tx + 6, ty + 90, tw - 12, 9, 1.5);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6.5);
    bold(doc);
    doc.text('Aceitar e Acessar o Portal', tx + tw / 2, ty + 96, { align: 'center' });
    doc.setFontSize(4.5);
    normal(doc);
    txt(doc, A.muted, 'Você receberá um e-mail de boas-vindas confirmando o aceite.', tx + tw / 2, ty + 105, { align: 'center' });

    marker(doc, 3, tx + 6, ty + 83, C.amber);
    marker(doc, 4, tx + tw / 2, ty + 95, C.green);

    // ── Mockup boas-vindas (direita) ──
    const wx = 202, wy = 44, ww = 81, wH = 110;
    rrect(doc, A.bg, wx, wy, ww, wH, 2.5);
    rstroke(doc, A.border, wx, wy, ww, wH, 2.5, 0.8);
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.roundedRect(wx + ww / 2 - 7, wy + 12, 14, 14, 2.5, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    bold(doc);
    doc.text('🎉', wx + ww / 2, wy + 21, { align: 'center' });
    doc.setFontSize(8);
    bold(doc);
    txt(doc, A.text, 'Bem-vindo, Indicador(a)!', wx + ww / 2, wy + 34, { align: 'center' });
    doc.setFontSize(5.5);
    normal(doc);
    txt(doc, A.muted, 'Seu cadastro foi formalizado com', wx + ww / 2, wy + 42, { align: 'center' });
    txt(doc, A.muted, 'sucesso. Agora você pode cadastrar', wx + ww / 2, wy + 47, { align: 'center' });
    txt(doc, A.muted, 'indicações e acompanhar a jornada', wx + ww / 2, wy + 52, { align: 'center' });
    txt(doc, A.muted, 'de cada lead em tempo real.', wx + ww / 2, wy + 57, { align: 'center' });
    doc.setFontSize(6);
    bold(doc);
    txt(doc, A.accent, 'Comissão padrão: 10%', wx + ww / 2, wy + 66, { align: 'center' });
    rrect(doc, A.accent, wx + 10, wy + 78, ww - 20, 10, 1.5);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6.5);
    bold(doc);
    doc.text('Começar a indicar →', wx + ww / 2, wy + 84, { align: 'center' });
    doc.setFontSize(4.5);
    normal(doc);
    txt(doc, A.muted, 'Boas-vindas enviadas para seu e-mail', wx + ww / 2, wy + 96, { align: 'center' });

    marker(doc, 5, wx + ww / 2, wy + 19, C.green);
    marker(doc, 6, wx + ww / 2, wy + 83, C.pink);

    doc.setFontSize(6.5);
    normal(doc);
    txt(doc, C.text, '1 E-mail com código  ·  2 Digite o código  ·  3 Marque "Li e concordo"  ·  4 Aceitar e acessar  ·  5 Boas-vindas  ·  6 Começar a indicar', pageW / 2, 168, { align: 'center' });

    footer(doc, pageW, pageH, 3, TOTAL, 'Manual de Cadastro do Indicador');

    // ═══════════════ PÁGINA 4 — DASHBOARD DE ACOMPANHAMENTO ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Dashboard', 'Acompanhamento das indicações');

    doc.setFontSize(14);
    bold(doc);
    txt(doc, C.navy, '3. Dashboard de Acompanhamento', 12, 30);
    line(doc, C.accent, 12, 32, 95, 32, 1);
    doc.setFontSize(8);
    normal(doc);
    txt(doc, C.muted, 'Após o cadastro validado, o portal abre o dashboard com KPIs, gráfico de status e a lista das suas indicações em tempo real.', 12, 37);

    // ── Mockup do dashboard (tema Aurora) ──
    const dx = 14, dy = 44, dw = 269, dH = 130;
    rrect(doc, A.bg, dx, dy, dw, dH, 2.5);
    rstroke(doc, A.border, dx, dy, dw, dH, 2.5, 0.8);

    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.roundedRect(dx + 6, dy + 6, 7, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(4);
    bold(doc);
    doc.text('VX', dx + 9.5, dy + 11, { align: 'center' });
    doc.setFontSize(8);
    bold(doc);
    txt(doc, A.text, 'Portal do Indicador', dx + 16, dy + 11);
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Indicador · indicador@email.com', dx + 16, dy + 14.5);

    rrect(doc, A.surface2, dx + 6, dy + 20, dw - 12, 12, 1.5);
    rstroke(doc, A.border, dx + 6, dy + 20, dw - 12, 12, 1.5, 0.3);
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.roundedRect(dx + 9, dy + 23, 6, 6, 1.2, 1.2, 'F');
    doc.setFontSize(6);
    bold(doc);
    txt(doc, A.text, 'Bem-vindo, Indicador(a)!', dx + 18, dy + 27);
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Cadastre indicações e acompanhe a jornada de cada lead. Comissão padrão: 10%', dx + 18, dy + 30.5);

    const kpis = [
      { l: 'Volume indicado', v: 'R$ 250.000', c: A.accent },
      { l: 'Total de indicações', v: '12', c: A.text },
      { l: 'Vendas convertidas', v: 'R$ 80.000', c: A.green },
      { l: 'Vendas efetivas', v: '3', c: A.green },
      { l: 'Comissão gerada', v: 'R$ 8.000', c: A.accent },
    ];
    const kw = (dw - 12 - 4 * 3) / 5;
    kpis.forEach((k, i) => {
      const kx = dx + 6 + i * (kw + 3);
      rrect(doc, A.surface, kx, dy + 36, kw, 18, 1.5);
      rstroke(doc, A.border, kx, dy + 36, kw, 18, 1.5, 0.3);
      doc.setFontSize(4.5);
      normal(doc);
      txt(doc, A.muted, k.l, kx + 2, dy + 40);
      doc.setFontSize(7);
      bold(doc);
      txt(doc, k.c, k.v, kx + 2, dy + 48);
    });

    rrect(doc, A.surface, dx + 6, dy + 58, 90, 50, 1.5);
    rstroke(doc, A.border, dx + 6, dy + 58, 90, 50, 1.5, 0.3);
    doc.setFontSize(5.5);
    bold(doc);
    txt(doc, A.text, 'Distribuição por status', dx + 9, dy + 63);
    // Barra empilhada horizontal (distribuição por status)
    const segs = [
      ['Novo', 5, A.accent], ['Em Atend.', 3, A.amber], ['→ Cliente', 2, A.green],
      ['→ Contrato', 1, A.violet], ['→ Venda', 1, [34, 197, 94]], ['Descart.', 0, [107, 114, 128]],
    ];
    const totalV = segs.reduce((a, s) => a + s[1], 0) || 1;
    const barX = dx + 9, barY = dy + 80, barW = 84, barH = 7;
    let acc = barX;
    segs.forEach((s) => {
      const wseg = (s[1] / totalV) * barW;
      if (wseg > 0) {
        doc.setFillColor(s[2][0], s[2][1], s[2][2]);
        doc.rect(acc, barY, wseg, barH, 'F');
      }
      acc += wseg;
    });
    // total no centro da barra
    doc.setFontSize(5);
    bold(doc);
    txt(doc, A.text, '12 indicações', barX + barW / 2, barY + barH / 2 + 1.5, { align: 'center' });
    // legenda em 2 colunas
    const legItems = [
      ['Novo', A.accent], ['Em Atendimento', A.amber], ['→ Cliente', A.green],
      ['→ Contrato', A.violet], ['→ Venda', [34, 197, 94]], ['Descartado', [107, 114, 128]],
    ];
    legItems.forEach((li, i) => {
      const lx2 = dx + 50 + (i % 2) * 22;
      const ly2 = dy + 70 + Math.floor(i / 2) * 5.5;
      doc.setFillColor(li[1][0], li[1][1], li[1][2]);
      doc.circle(lx2, ly2 - 1, 1.2, 'F');
      doc.setFontSize(4.5);
      normal(doc);
      txt(doc, A.muted, li[0], lx2 + 2.5, ly2);
    });

    rrect(doc, A.surface, dx + 100, dy + 58, dw - 106, 50, 1.5);
    rstroke(doc, A.border, dx + 100, dy + 58, dw - 106, 50, 1.5, 0.3);
    doc.setFontSize(5.5);
    bold(doc);
    txt(doc, A.text, 'Suas Indicações', dx + 103, dy + 63);
    doc.setFontSize(4.5);
    normal(doc);
    txt(doc, A.muted, 'Cliente', dx + 103, dy + 69);
    txt(doc, A.muted, 'Produto', dx + 150, dy + 69);
    txt(doc, A.muted, 'Valor', dx + 185, dy + 69);
    txt(doc, A.muted, 'Status', dx + 215, dy + 69);
    line(doc, A.border, dx + 103, dy + 71, dx + dw - 10, dy + 71, 0.2);
    const rows = [
      ['Laranjas SA', 'DOLARIZE', 'R$ 25.000', 'Novo', A.accent],
      ['Tech Ltda', 'OFFSHORE', 'R$ 80.000', '→ Venda', [34, 197, 94]],
      ['João Silva', 'CONTA GLOBAL', 'R$ 15.000', 'Em Atend.', A.amber],
      ['Maria Souza', 'CONTA INT.', 'R$ 40.000', '→ Cliente', A.green],
    ];
    rows.forEach((r, i) => {
      const ry = dy + 76 + i * 7;
      doc.setFontSize(4.8);
      normal(doc);
      txt(doc, A.text, r[0], dx + 103, ry);
      txt(doc, A.muted, r[1], dx + 150, ry);
      txt(doc, A.text, r[2], dx + 185, ry);
      rrect(doc, mix(r[4], A.surface, 0.78), dx + 213, ry - 3.5, 28, 5, 1);
      doc.setFontSize(4);
      bold(doc);
      txt(doc, r[4], r[3], dx + 227, ry + 0.5, { align: 'center' });
    });
    rrect(doc, A.accent, dx + dw - 42, dy + 124, 36, 6, 1.2);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(4.8);
    bold(doc);
    doc.text('+ Nova Indicação', dx + dw - 24, dy + 128.5, { align: 'center' });

    marker(doc, 1, dx + 6, dy + 11, C.blue);
    marker(doc, 2, dx + 9, dy + 45, C.accent);
    marker(doc, 3, dx + 50, dy + 83, C.violet);
    marker(doc, 4, dx + 150, dy + 76, C.pink);
    marker(doc, 5, dx + dw - 24, dy + 127, C.green);

    doc.setFontSize(6.5);
    normal(doc);
    txt(doc, C.text, '1 Header do portal  ·  2 KPIs em tempo real  ·  3 Gráfico por status  ·  4 Lista de indicações  ·  5 Nova indicação', pageW / 2, 182, { align: 'center' });

    footer(doc, pageW, pageH, 4, TOTAL, 'Manual de Cadastro do Indicador');

    // ═══════════════ PÁGINA 5 — NOVA INDICAÇÃO (FORMULÁRIO) ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Nova Indicação', 'Cadastro de leads PF/PJ');

    doc.setFontSize(14);
    bold(doc);
    txt(doc, C.navy, '4. Cadastrando uma nova indicação', 12, 30);
    line(doc, C.accent, 12, 32, 100, 32, 1);
    doc.setFontSize(8);
    normal(doc);
    txt(doc, C.muted, 'No botão "Nova Indicação", preencha o formulário com os dados do lead (PF ou PJ) e o produto de interesse.', 12, 37);

    // ── Mockup do formulário (tema Aurora) ──
    const fx = 14, fy = 44, fw = 269, fH = 124;
    rrect(doc, A.bg, fx, fy, fw, fH, 2.5);
    rstroke(doc, A.border, fx, fy, fw, fH, 2.5, 0.8);

    rrect(doc, A.surface, fx + 6, fy + 6, 18, 7, 1.2);
    doc.setFontSize(4.5);
    bold(doc);
    txt(doc, A.muted, '← Voltar', fx + 9, fy + 10.5);
    doc.setFontSize(8);
    bold(doc);
    txt(doc, A.text, 'Nova Indicação', fx + fw / 2, fy + 11, { align: 'center' });

    rrect(doc, A.accent, fx + 30, fy + 20, 20, 7, 1.2);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(5);
    bold(doc);
    doc.text('PF', fx + 40, fy + 24.5, { align: 'center' });
    rrect(doc, A.surface2, fx + 52, fy + 20, 20, 7, 1.2);
    rstroke(doc, A.border, fx + 52, fy + 20, 20, 7, 1.2, 0.3);
    doc.setTextColor(A.text[0], A.text[1], A.text[2]);
    doc.text('PJ', fx + 62, fy + 24.5, { align: 'center' });

    inputField(doc, fx + 12, fy + 34, 90, 9, 'PRODUTO DE INTERESSE *', 'DOLARIZE');
    inputField(doc, fx + 108, fy + 34, 60, 9, 'VALOR ESTIMADO (R$)', '25.000,00');

    doc.setFontSize(6.5);
    bold(doc);
    txt(doc, A.accent, 'Dados do Titular (PF)', fx + 12, fy + 48);
    line(doc, A.border, fx + 12, fy + 49.5, fx + 100, fy + 49.5, 0.3);
    inputField(doc, fx + 12, fy + 54, 60, 9, 'NOME COMPLETO *', 'João da Silva');
    inputField(doc, fx + 76, fy + 54, 44, 9, 'CPF', '123.456.789-00');
    inputField(doc, fx + 12, fy + 70, 50, 9, 'WHATSAPP *', '(11) 99999-9999');
    inputField(doc, fx + 66, fy + 70, 54, 9, 'E-MAIL', 'joao@email.com');
    inputField(doc, fx + 12, fy + 86, 108, 9, 'PROFISSÃO', 'Empresário');
    inputField(doc, fx + 12, fy + 102, 108, 12, 'OBSERVAÇÕES', 'Cliente com perfil internacional...');

    const rx = fx + 130, ry = fy + 48, rw = fw - 136;
    rrect(doc, A.surface, rx, ry, rw, 72, 1.5);
    rstroke(doc, A.border, rx, ry, rw, 72, 1.5, 0.3);
    doc.setFontSize(6.5);
    bold(doc);
    txt(doc, A.accent, 'Resumo da indicação', rx + 4, ry + 6);
    doc.setFontSize(5);
    normal(doc);
    const resumo = [
      ['Tipo', 'Pessoa Física'],
      ['Produto', 'DOLARIZE'],
      ['Valor est.', 'R$ 25.000,00'],
      ['Comissão', '10% (sua parcela)'],
      ['Distribuição', 'Round-robin (gerente)'],
    ];
    let sry = ry + 12;
    resumo.forEach(([k, v]) => {
      doc.setFontSize(4.8);
      bold(doc);
      txt(doc, A.muted, k, rx + 4, sry);
      normal(doc);
      txt(doc, A.accent, v, rx + 32, sry);
      line(doc, A.border, rx + 4, sry + 1.2, rx + rw - 4, sry + 1.2, 0.2);
      sry += 6.5;
    });
    rrect(doc, A.accent, rx + 4, ry + 56, rw - 8, 10, 1.5);
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(6);
    bold(doc);
    doc.text('Enviar Indicação →', rx + rw / 2, ry + 62, { align: 'center' });

    marker(doc, 1, fx + 40, fy + 23, C.accent);
    marker(doc, 2, fx + 12, fy + 38, C.blue);
    marker(doc, 3, fx + 12, fy + 58, C.violet);
    marker(doc, 4, rx + rw / 2, ry + 61, C.green);

    doc.setFontSize(6.5);
    normal(doc);
    txt(doc, C.text, '1 Escolha PF ou PJ  ·  2 Produto + valor  ·  3 Dados do titular/empresa  ·  4 Enviar — o lead entra na Central automaticamente', pageW / 2, 176, { align: 'center' });

    rrect(doc, mix(C.green, C.white, 0.9), 14, 186, pageW - 28, 14, 1.5);
    rstroke(doc, C.green, 14, 186, pageW - 28, 14, 1.5, 0.4);
    doc.setFontSize(6);
    bold(doc);
    txt(doc, C.green, '✓ Pronto!', 18, 192);
    normal(doc);
    txt(doc, C.text, 'Ao enviar, a indicação cai na Central de Leads, é distribuída a um gerente (round-robin) e entra na Fila de Contatos do dia. Você acompanha tudo no dashboard.', 30, 192);

    footer(doc, pageW, pageH, 5, TOTAL, 'Manual de Cadastro do Indicador');

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=manual-cadastro-indicador.pdf' },
    });
  } catch (error) {
    console.error('gerarManualCadastroIndicadorPDF:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}