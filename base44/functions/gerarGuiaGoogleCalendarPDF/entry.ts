import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Helper: remove acentos e caracteres especiais para compatibilidade Latin-1
function s(str) {
  return str
    .replace(/[áàãâä]/g, 'a').replace(/[ÁÀÃÂÄ]/g, 'A')
    .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[íìîï]/g, 'i').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[óòõôö]/g, 'o').replace(/[ÓÒÕÔÖ]/g, 'O')
    .replace(/[úùûü]/g, 'u').replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/[ç]/g, 'c').replace(/[Ç]/g, 'C')
    .replace(/[ñ]/g, 'n').replace(/[Ñ]/g, 'N')
    .replace(/[""]/g, '"').replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[⚠️⚠]/g, '(!)')
    .replace(/[✓✔]/g, '(ok)')
    .replace(/[❌]/g, '(x)')
    .replace(/[🔗📅🎥🔔⏰📱✅🔄]/g, '*')
    .replace(/[^\x00-\xFF]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 18;
    const contentW = W - margin * 2;
    let y = 0;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const addPage = () => {
      doc.addPage();
      y = 18;
    };

    const checkY = (needed = 20) => {
      if (y + needed > 275) addPage();
    };

    const drawRect = (x, yy, w, h, fillColor) => {
      doc.setFillColor(...fillColor);
      doc.roundedRect(x, yy, w, h, 3, 3, 'F');
    };

    const wrapText = (txt, x, yy, maxWidth, size = 10, color = [60, 60, 60], style = 'normal', lineH = 5.5) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(s(txt), maxWidth);
      doc.text(lines, x, yy);
      return lines.length * lineH;
    };

    const sectionHeader = (title, yy, bgColor = [26, 49, 80]) => {
      drawRect(margin, yy, contentW, 9, bgColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(s(title), margin + 4, yy + 6.2);
      return yy + 13;
    };

    const stepBox = (num, txt, yy) => {
      doc.setFillColor(26, 115, 232);
      doc.circle(margin + 4, yy + 3, 3.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(num), margin + 4, yy + 4.8, { align: 'center' });
      const lines = doc.splitTextToSize(s(txt), contentW - 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(lines, margin + 10, yy + 4.2);
      return lines.length * 5.2 + 3;
    };

    const bulletBox = (icon, title, body, yy, accentColor = [26, 49, 80]) => {
      checkY(22);
      doc.setFillColor(240, 244, 248);
      doc.roundedRect(margin, yy, contentW, 18, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text(icon, margin + 3, yy + 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text(s(title), margin + 12, yy + 7);
      const lines = doc.splitTextToSize(s(body), contentW - 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(lines, margin + 12, yy + 12.5);
      return 22;
    };

    const alertBox = (txt, yy, bgColor = [255, 243, 205], textColor = [133, 100, 4]) => {
      const lines = doc.splitTextToSize(s(txt), contentW - 10);
      const h = lines.length * 5 + 8;
      checkY(h);
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, yy, contentW, h, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('(!)  ' + lines[0], margin + 5, yy + 6);
      if (lines.length > 1) {
        doc.setFont('helvetica', 'normal');
        doc.text(lines.slice(1), margin + 10, yy + 11);
      }
      return h + 4;
    };

    // ── COVER PAGE ───────────────────────────────────────────────────────────

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 80, 'F');
    doc.setFillColor(26, 49, 80);
    doc.rect(0, 60, W, 25, 'F');

    // Google logo colors bar
    const colors = [[66,133,244],[52,168,83],[251,188,5],[234,67,53]];
    colors.forEach((c, i) => {
      doc.setFillColor(...c);
      doc.rect(margin + i * 10, 30, 9, 9, 'F');
    });

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Google Calendar & Meet', margin, 55);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 205, 235);
    doc.text('Guia Pratico de Integracao', margin, 65);

    doc.setFontSize(9);
    doc.setTextColor(120, 150, 190);
    doc.text('Villela Exchange  |  Gestao Comercial  |  Capacitacao da Equipe  |  Mai/2026', margin, 75);

    // Intro box
    y = 92;
    doc.setFillColor(235, 245, 255);
    doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 49, 80);
    doc.text('O que voce vai aprender neste guia:', margin + 5, y + 8);
    const items = [
      'Como vincular sua conta Google ao portal (1 vez por usuario)',
      'Como criar reunioes Google Meet com um clique',
      'Como receber notificacoes automaticas de compromissos',
      'Como resolver os problemas mais comuns',
    ];
    items.forEach((item, i) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 80, 120);
      doc.text('(ok)  ' + item, margin + 7, y + 15 + i * 5.5);
    });
    y += 38;

    // Important callout
    doc.setFillColor(255, 243, 205);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(133, 100, 4);
    doc.text('(!)  ATENCAO: Cada usuario precisa conectar sua conta Google UMA VEZ.', margin + 5, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('A conexao fica salva permanentemente. Nao e necessario repetir o processo.', margin + 5, y + 13);
    y += 24;

    // ── PAGE 2 ────────────────────────────────────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE  |  CAPACITACAO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet  |  Guia Pratico', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('1.  VISAO GERAL DA INTEGRACAO', y, [15, 30, 53]);

    const overviewItems = [
      ['[I]', 'Integracao individual', 'Cada usuario do portal conecta sua propria conta Google. A conexao e pessoal e permanente — nao precisa ser refeita.'],
      ['[C]', 'Google Calendar', 'Os eventos de reuniao sao criados automaticamente no Google Calendar do gerente quando ele gera um link Meet.'],
      ['[M]', 'Google Meet', 'O link da videochamada e gerado automaticamente e salvo no agendamento. Pode ser copiado e enviado ao cliente.'],
      ['[N]', 'Notificacoes', 'O portal avisa 15 minutos antes de cada compromisso agendado com horario definido, tanto na tela quanto pelo navegador.'],
    ];

    overviewItems.forEach(([icon, title, body]) => {
      checkY(24);
      y += bulletBox(icon, title, body, y) + 2;
    });

    y += 4;
    y = sectionHeader('2.  CONFIGURACAO TECNICA (Apenas Administrador)', y, [55, 90, 50]);

    wrapText('Esta secao descreve o que o administrador ja configurou. Os usuarios NAO precisam fazer nada tecnico.', margin, y, contentW, 9, [80, 80, 80], 'italic');
    y += 10;

    const techSteps = [
      'Acesso ao Google Cloud Console (console.cloud.google.com)',
      'Criacao/selecao do projeto da Villela Exchange',
      'Ativacao da API do Google Calendar',
      'Configuracao da tela de consentimento OAuth com tipo "Externo"',
      'Adicao das URIs de redirecionamento autorizadas no painel OAuth',
      'Publicacao do aplicativo para liberar acesso a todos os usuarios Google',
    ];

    techSteps.forEach((step, i) => {
      checkY(12);
      y += stepBox(i + 1, step, y);
    });

    y += 6;
    y += alertBox('Importante: A URI de redirecionamento ja esta configurada. Qualquer erro de "redirect_uri_mismatch" indica que a URI do portal precisa ser adicionada novamente no Google Cloud Console.', y, [220, 237, 255], [26, 49, 80]);

    // ── PAGE 3 ────────────────────────────────────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE  |  CAPACITACAO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet  |  Guia Pratico', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('3.  COMO VINCULAR SUA CONTA GOOGLE (1a vez)', y, [26, 49, 80]);

    const connectSteps = [
      'Acesse a pagina "Agenda do Dia" no menu lateral do portal.',
      'Clique no botao azul "Google Calendar" (com o icone colorido do Google) no canto superior direito.',
      'Uma janela popup do Google abrira. Selecione ou faca login com sua conta Google corporativa.',
      'Na tela de permissoes do Google, leia as permissoes solicitadas e clique em "Continuar".',
      'O popup fechara automaticamente. O portal exibira a mensagem "Google Calendar vinculado com sucesso!".',
      'Clique em "Fechar". A conexao esta salva — voce nao precisara repetir este processo.',
    ];

    connectSteps.forEach((step, i) => {
      checkY(14);
      y += stepBox(i + 1, step, y);
    });

    y += 6;

    doc.setFillColor(232, 245, 233);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 50);
    doc.text('(ok)  Dica: A conexao e permanente!', margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('Apos conectar uma vez, voce nao precisa repetir. A autorizacao fica salva no sistema.', margin + 5, y + 11);
    y += 20;

    y = sectionHeader('4.  COMO GERAR UM LINK GOOGLE MEET', y, [26, 49, 80]);

    const meetSteps = [
      'Na Agenda do Dia, encontre o agendamento desejado (visao Semana ou Dia).',
      'No card do contato, clique no botao "Gerar Link Meet" (icone de camera de video).',
      'Uma caixa sera exibida. Informe o horario de inicio da reuniao (ex: 14:00).',
      'Clique em "Gerar Link". O sistema criara o evento no seu Google Calendar.',
      'O link Meet aparecera no card. Clique em "Copiar" para enviar ao cliente.',
      'O link fica salvo permanentemente no agendamento para consulta futura.',
    ];

    meetSteps.forEach((step, i) => {
      checkY(14);
      y += stepBox(i + 1, step, y);
    });

    y += 8;
    y += alertBox('ATENCAO com o horario: Informe sempre o horario correto no fuso de Brasilia. O evento aparecera com esse horario exato no Google Calendar.', y, [255, 243, 205], [133, 100, 4]);

    // ── PAGE 4 ────────────────────────────────────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE  |  CAPACITACAO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet  |  Guia Pratico', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('5.  NOTIFICACOES AUTOMATICAS DE COMPROMISSOS', y, [26, 49, 80]);

    wrapText('O portal monitora automaticamente todos os seus agendamentos com horario definido e envia alertas preventivos.', margin, y, contentW, 10, [50, 50, 50]);
    y += 10;

    const notifItems = [
      ['[T]', 'Quando acontece', 'Exatamente 15 minutos antes do horario do compromisso agendado.'],
      ['[P]', 'Como aparece', 'Toast na tela do portal + notificacao do navegador (se voce permitiu notificacoes).'],
      ['[R]', 'Pre-requisito', 'O agendamento deve ter um horario definido (campo "Horario" preenchido).'],
      ['[A]', 'Automatico', 'Funciona em segundo plano. Nao e necessario fazer nada — so manter o portal aberto.'],
    ];

    notifItems.forEach(([icon, title, body]) => {
      checkY(24);
      y += bulletBox(icon, title, body, y) + 2;
    });

    y += 4;
    y = sectionHeader('6.  SOLUCAO DE PROBLEMAS COMUNS', y, [180, 40, 40]);

    const problems = [
      {
        title: '"Conexao nao foi concluida"',
        cause: 'O popup foi fechado antes de completar a autorizacao do Google.',
        fix: 'Clique em "Tentar novamente" no modal e complete o processo ate o final sem fechar o popup prematuramente.',
      },
      {
        title: '"Acesso bloqueado" pelo Google',
        cause: 'A conta Google usada pode nao ter permissao ou o app ainda nao foi publicado.',
        fix: 'Use a conta Google corporativa correta. Se persistir, contate o administrador para verificar a configuracao no Google Cloud Console.',
      },
      {
        title: 'Botao "Conectar Google Calendar" aparece no card',
        cause: 'Sua conta Google ainda nao esta vinculada ao portal.',
        fix: 'Acesse "Agenda do Dia", clique em "Google Calendar" no canto superior direito e siga o passo a passo de vinculacao.',
      },
      {
        title: 'Evento com horario errado no Google Calendar',
        cause: 'O horario informado ao gerar o Meet estava incorreto.',
        fix: 'Gere o link Meet novamente informando o horario correto. O sistema usa automaticamente o fuso de Brasilia (UTC-3).',
      },
      {
        title: 'Nao recebo notificacoes de compromissos',
        cause: 'O agendamento pode nao ter horario definido, ou o navegador bloqueou notificacoes.',
        fix: 'Verifique se o campo "Horario" esta preenchido no agendamento. Permita notificacoes do portal no navegador quando solicitado.',
      },
    ];

    problems.forEach(({ title, cause, fix }) => {
      checkY(30);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, contentW, 26, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 40, 40);
      doc.text('(x)  ' + title, margin + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 60, 60);
      doc.text('Causa:', margin + 4, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const causeLines = doc.splitTextToSize(cause, contentW - 20);
      doc.text(causeLines, margin + 18, y + 13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 100, 50);
      doc.text('Solucao:', margin + 4, y + 19);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 80, 40);
      const fixLines = doc.splitTextToSize(fix, contentW - 20);
      doc.text(fixLines, margin + 22, y + 19);
      y += 30;
    });

    // ── FOOTER ───────────────────────────────────────────────────────────────
    checkY(20);
    y += 6;
    doc.setFillColor(15, 30, 53);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Villela Exchange  |  Gestao Comercial  |  Modulo de Capacitacao: Google Calendar & Meet  |  Mai/2026', W / 2, y + 6, { align: 'center' });
    doc.text('Este documento e parte do programa de capacitacao interno. Para duvidas, consulte o administrador.', W / 2, y + 11, { align: 'center' });

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Pagina ' + i + ' de ' + totalPages, W - margin, 290, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=guia-google-calendar-meet.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});