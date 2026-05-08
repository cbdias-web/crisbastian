import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

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

    const text = (txt, x, yy, opts = {}) => {
      doc.setFontSize(opts.size || 10);
      doc.setFont('helvetica', opts.style || 'normal');
      doc.setTextColor(...(opts.color || [60, 60, 60]));
      doc.text(txt, x, yy, { maxWidth: opts.maxWidth || undefined, align: opts.align || 'left' });
    };

    const wrapText = (txt, x, yy, maxWidth, size = 10, color = [60, 60, 60], style = 'normal', lineH = 5.5) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(txt, maxWidth);
      doc.text(lines, x, yy);
      return lines.length * lineH;
    };

    const sectionHeader = (title, yy, bgColor = [26, 49, 80]) => {
      drawRect(margin, yy, contentW, 9, bgColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 4, yy + 6.2);
      return yy + 13;
    };

    const stepBox = (num, txt, yy) => {
      // number circle
      doc.setFillColor(26, 115, 232);
      doc.circle(margin + 4, yy + 3, 3.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(num), margin + 4, yy + 4.8, { align: 'center' });

      // text
      const lines = doc.splitTextToSize(txt, contentW - 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(lines, margin + 10, yy + 4.2);
      return lines.length * 5.2 + 3;
    };

    const bulletBox = (emoji, title, body, yy, accentColor = [26, 49, 80]) => {
      checkY(22);
      drawRect(margin, yy, contentW, 1, [240, 244, 248]);
      doc.setFillColor(240, 244, 248);
      doc.roundedRect(margin, yy, contentW, 18, 2, 2, 'F');
      doc.setFontSize(14);
      doc.text(emoji, margin + 3, yy + 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text(title, margin + 12, yy + 7);
      const lines = doc.splitTextToSize(body, contentW - 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(lines, margin + 12, yy + 12.5);
      return 22;
    };

    const alertBox = (txt, yy, bgColor = [255, 243, 205], textColor = [133, 100, 4]) => {
      const lines = doc.splitTextToSize(txt, contentW - 10);
      const h = lines.length * 5 + 8;
      checkY(h);
      doc.setFillColor(...bgColor);
      doc.roundedRect(margin, yy, contentW, h, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('⚠  ' + lines[0], margin + 5, yy + 6);
      if (lines.length > 1) {
        doc.setFont('helvetica', 'normal');
        doc.text(lines.slice(1), margin + 10, yy + 11);
      }
      return h + 4;
    };

    // ── COVER PAGE ───────────────────────────────────────────────────────────

    // Dark gradient header area
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
    doc.text('Guia Prático de Integração', margin, 65);

    doc.setFontSize(9);
    doc.setTextColor(120, 150, 190);
    doc.text('Villela Exchange — Gestão Comercial  |  Capacitação da Equipe  |  Mai/2026', margin, 75);

    // Intro box
    y = 92;
    doc.setFillColor(235, 245, 255);
    doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 49, 80);
    doc.text('O que você vai aprender neste guia:', margin + 5, y + 8);
    const items = ['Como vincular sua conta Google ao portal (1 vez por usuário)', 'Como criar reuniões Google Meet com um clique', 'Como receber notificações automáticas de compromissos', 'Como resolver os problemas mais comuns'];
    items.forEach((item, i) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 80, 120);
      doc.text(`✓  ${item}`, margin + 7, y + 15 + i * 5.5);
    });
    y += 36;

    // Important callout
    doc.setFillColor(255, 243, 205);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(133, 100, 4);
    doc.text('⚠  ATENÇÃO: Cada usuário precisa conectar sua conta Google UMA VEZ.', margin + 5, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('A conexão fica salva permanentemente. Não é necessário repetir o processo.', margin + 5, y + 13);
    y += 24;

    // ── PAGE 2: CONFIGURAÇÃO TÉCNICA (admin) ─────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE — CAPACITAÇÃO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet — Guia Prático', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('1.  VISÃO GERAL DA INTEGRAÇÃO', y, [15, 30, 53]);

    const overviewItems = [
      ['🔗', 'Integração individual', 'Cada usuário do portal conecta sua própria conta Google. A conexão é pessoal e permanente — não precisa ser refeita.'],
      ['📅', 'Google Calendar', 'Os eventos de reunião são criados automaticamente no Google Calendar do gerente quando ele gera um link Meet.'],
      ['🎥', 'Google Meet', 'O link da videochamada é gerado automaticamente e salvo no agendamento. Pode ser copiado e enviado ao cliente.'],
      ['🔔', 'Notificações', 'O portal avisa 15 minutos antes de cada compromisso agendado com horário definido, tanto na tela quanto pelo navegador.'],
    ];

    overviewItems.forEach(([emoji, title, body]) => {
      checkY(24);
      y += bulletBox(emoji, title, body, y) + 2;
    });

    y += 4;
    y = sectionHeader('2.  CONFIGURAÇÃO TÉCNICA (Apenas Administrador)', y, [55, 90, 50]);

    wrapText('Esta seção descreve o que o administrador já configurou. Os usuários NÃO precisam fazer nada técnico.', margin, y, contentW, 9, [80, 80, 80], 'italic');
    y += 10;

    const techSteps = [
      'Acesso ao Google Cloud Console (console.cloud.google.com)',
      'Criação/seleção do projeto da Villela Exchange',
      'Ativação da API do Google Calendar',
      'Configuração da tela de consentimento OAuth com tipo "Externo"',
      'Adição das URIs de redirecionamento autorizadas no painel OAuth',
      'Publicação do aplicativo para liberar acesso a todos os usuários Google',
    ];

    techSteps.forEach((step, i) => {
      checkY(12);
      y += stepBox(i + 1, step, y);
    });

    y += 6;
    y += alertBox('Importante: A URI de redirecionamento já está configurada. Qualquer erro de "redirect_uri_mismatch" indica que a URI do portal precisa ser adicionada novamente no Google Cloud Console.', y, [220, 237, 255], [26, 49, 80]);

    // ── PAGE 3: PASSO A PASSO DO USUÁRIO ─────────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE — CAPACITAÇÃO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet — Guia Prático', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('3.  COMO VINCULAR SUA CONTA GOOGLE (1ª vez)', y, [26, 49, 80]);

    const connectSteps = [
      'Acesse a página "Agenda do Dia" no menu lateral do portal.',
      'Clique no botão azul "Google Calendar" (com o ícone colorido do Google) no canto superior direito.',
      'Uma janela popup do Google abrirá. Selecione ou faça login com sua conta Google corporativa.',
      'Na tela de permissões do Google, leia as permissões solicitadas e clique em "Continuar".',
      'O popup fechará automaticamente. O portal exibirá a mensagem "Google Calendar vinculado com sucesso!".',
      'Clique em "Fechar". A conexão está salva — você não precisará repetir este processo.',
    ];

    connectSteps.forEach((step, i) => {
      checkY(14);
      y += stepBox(i + 1, step, y);
    });

    y += 6;

    // tip box
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 50);
    doc.text('✓  Dica: A conexão é permanente!', margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('Após conectar uma vez, você não precisa repetir. A autorização fica salva no sistema.', margin + 5, y + 11);
    y += 20;

    y = sectionHeader('4.  COMO GERAR UM LINK GOOGLE MEET', y, [26, 49, 80]);

    const meetSteps = [
      'Na Agenda do Dia, encontre o agendamento desejado (visão Semana ou Dia).',
      'No card do contato, clique no botão "Gerar Link Meet" (ícone de câmera de vídeo).',
      'Uma caixa será exibida. Informe o horário de início da reunião (ex: 14:00).',
      'Clique em "Gerar Link". O sistema criará o evento no seu Google Calendar.',
      'O link Meet aparecerá no card. Clique em "Copiar" para enviar ao cliente.',
      'O link fica salvo permanentemente no agendamento para consulta futura.',
    ];

    meetSteps.forEach((step, i) => {
      checkY(14);
      y += stepBox(i + 1, step, y);
    });

    y += 8;
    y += alertBox('ATENÇÃO com o horário: Informe sempre o horário correto no fuso de Brasília. O evento aparecerá com esse horário exato no Google Calendar.', y, [255, 243, 205], [133, 100, 4]);

    // ── PAGE 4: NOTIFICAÇÕES E PROBLEMAS ─────────────────────────────────────
    addPage();

    doc.setFillColor(15, 30, 53);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('VILLELA EXCHANGE — CAPACITAÇÃO', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Google Calendar & Meet — Guia Prático', W - margin, 9, { align: 'right' });

    y = 22;
    y = sectionHeader('5.  NOTIFICAÇÕES AUTOMÁTICAS DE COMPROMISSOS', y, [26, 49, 80]);

    wrapText('O portal monitora automaticamente todos os seus agendamentos com horário definido e envia alertas preventivos.', margin, y, contentW, 10, [50, 50, 50]);
    y += 10;

    const notifItems = [
      ['⏰', 'Quando acontece', 'Exatamente 15 minutos antes do horário do compromisso agendado.'],
      ['📱', 'Como aparece', 'Toast na tela do portal + notificação do navegador (se você permitiu notificações).'],
      ['✅', 'Pré-requisito', 'O agendamento deve ter um horário definido (campo "Horário" preenchido).'],
      ['🔄', 'Automático', 'Funciona em segundo plano. Não é necessário fazer nada — só manter o portal aberto.'],
    ];

    notifItems.forEach(([emoji, title, body]) => {
      checkY(24);
      y += bulletBox(emoji, title, body, y) + 2;
    });

    y += 4;
    y = sectionHeader('6.  SOLUÇÃO DE PROBLEMAS COMUNS', y, [180, 40, 40]);

    const problems = [
      {
        title: '"Conexão não foi concluída"',
        cause: 'O popup foi fechado antes de completar a autorização do Google.',
        fix: 'Clique em "Tentar novamente" no modal e complete o processo até o final sem fechar o popup prematuramente.',
      },
      {
        title: '"Acesso bloqueado" pelo Google',
        cause: 'A conta Google usada pode não ter permissão ou o app ainda não foi publicado.',
        fix: 'Use a conta Google corporativa correta. Se persistir, contate o administrador para verificar a configuração no Google Cloud Console.',
      },
      {
        title: 'Botão "Conectar Google Calendar" aparece no card',
        cause: 'Sua conta Google ainda não está vinculada ao portal.',
        fix: 'Acesse "Agenda do Dia", clique em "Google Calendar" no canto superior direito e siga o passo a passo de vinculação.',
      },
      {
        title: 'Evento com horário errado no Google Calendar',
        cause: 'O horário informado ao gerar o Meet estava incorreto.',
        fix: 'Gere o link Meet novamente informando o horário correto. O sistema usa automaticamente o fuso de Brasília (UTC-3).',
      },
      {
        title: 'Não recebo notificações de compromissos',
        cause: 'O agendamento pode não ter horário definido, ou o navegador bloqueou notificações.',
        fix: 'Verifique se o campo "Horário" está preenchido no agendamento. Permita notificações do portal no navegador quando solicitado.',
      },
    ];

    problems.forEach(({ title, cause, fix }) => {
      checkY(30);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, contentW, 26, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 40, 40);
      doc.text(`❌  ${title}`, margin + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 60, 60);
      doc.text('Causa:', margin + 4, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const causeLines = doc.splitTextToSize(cause, contentW - 20);
      doc.text(causeLines, margin + 18, y + 13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 100, 50);
      doc.text('Solução:', margin + 4, y + 19);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 80, 40);
      const fixLines = doc.splitTextToSize(fix, contentW - 20);
      doc.text(fixLines, margin + 22, y + 19);
      y += 30;
    });

    // ── FOOTER on last page ───────────────────────────────────────────────────
    checkY(20);
    y += 6;
    doc.setFillColor(15, 30, 53);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 180, 220);
    doc.text('Villela Exchange — Gestão Comercial  |  Módulo de Capacitação: Google Calendar & Meet  |  Mai/2026', W / 2, y + 6, { align: 'center' });
    doc.text('Este documento é parte do programa de capacitação interno. Para dúvidas, consulte o administrador do sistema.', W / 2, y + 11, { align: 'center' });

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, 290, { align: 'right' });
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