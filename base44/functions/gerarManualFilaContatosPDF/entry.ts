import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';
import {
  C, A, fill, rrect, rstroke, line, txt, mix, normal, bold,
  pageBg, stageBox, flag, arrowRight, marker, header, footer, setupFont,
} from '../../shared/pdfManualHelpers.ts';

// Manual da Nova Estrutura da Esteira de Fila de Contatos: Kanban de 7 colunas,
// SLA de inércia (48h), retorno obrigatório, tentativas/ghosting, esteira Nutrição,
// ação rápida de qualificação (tarefa 24h) e abordagem/pitch personalizado.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    await setupFont(doc);
    const pageW = doc.internal.pageSize.getWidth();   // 297
    const pageH = doc.internal.pageSize.getHeight();  // 210
    const TOTAL = 3;
    const NOME = 'Nova Esteira de Fila de Contatos';

    // ═══════════════ PÁGINA 1 — ESTRUTURA DO KANBAN (7 COLUNAS) ═══════════════
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Nova Esteira de Fila de Contatos', 'Kanban · Cadência · SLA de Leads');

    doc.setFontSize(15);
    bold(doc);
    txt(doc, C.navy, 'Nova Estrutura da Esteira de Fila de Contatos', 12, 29);
    line(doc, C.accent, 12, 31.5, 86, 31.5, 1.2);
    doc.setFontSize(8);
    normal(doc);
    txt(doc, C.muted, 'A esteira de Fila de Contatos foi reestruturada com controle de cadência, SLA de inércia e ações rápidas. O Kanban', 12, 36.5);
    txt(doc, C.muted, 'agora possui sete colunas — incluindo a nova esteira Nutrição — e regras claras de prioridade, retorno e contadores de tempo.', 12, 40.5);

    const etapas = [
      { n: 1, t: 'Indicações', f: 'Leads novos indicados — prioridade 2 da rotina diária', c: C.accent },
      { n: 2, t: 'Agenda do Dia', f: 'Carteira do gerente — 1ª prioridade: zere antes de atacar novos leads', c: C.navy2 },
      { n: 3, t: 'Em Contato', f: 'Exige retorno agendado (data/hora) + SLA de inércia de 48h', c: C.amber },
      { n: 4, t: 'Qualificado', f: 'Ação rápida cria tarefa de proposta com prazo máximo de 24h', c: C.blue },
      { n: 5, t: 'Convertido', f: 'Gera Cliente, Contrato, Pipeline e Venda automaticamente', c: C.green },
      { n: 6, t: 'Nutrição', f: 'NOVA: desqualificação temporária de leads em ghosting', c: C.violet },
      { n: 7, t: 'Desqualificado', f: 'Leads descartados definitivamente', c: C.red },
    ];
    const bw = 31, bgap = 5.5, bh = 16, fh = 23;
    const totalRow = etapas.length * bw + (etapas.length - 1) * bgap;
    let sx = (pageW - totalRow) / 2;
    const rowY = 48;
    etapas.forEach((e, i) => {
      stageBox(doc, sx, rowY, bw, bh, e.n, e.t, e.c);
      flag(doc, sx, rowY + bh + 2.5, bw, fh, e.f, e.c);
      if (i < etapas.length - 1) arrowRight(doc, sx + bw, sx + bw + bgap, rowY + bh / 2, C.accent);
      sx += bw + bgap;
    });

    // Banner de prioridade operacional (mesma faixa amarela da plataforma)
    const banY = rowY + bh + fh + 8;
    rrect(doc, mix(C.amber, C.white, 0.86), 12, banY, pageW - 24, 15, 2);
    rstroke(doc, C.amber, 12, banY, pageW - 24, 15, 2, 0.5);
    doc.setFontSize(7);
    bold(doc);
    txt(doc, C.amber, 'PRIORIDADE OPERACIONAL', 16, banY + 4.5);
    doc.setFontSize(6.6);
    normal(doc);
    txt(doc, C.text, 'Zere os compromissos da Agenda do Dia (carteira) antes de atacar os leads novos da fila geral. A faixa amarela acima do Kanban e o selo', 16, banY + 9);
    txt(doc, C.text, '"1ª" na coluna Agenda do Dia lembram a regra todos os dias.', 16, banY + 12.6);

    // Regras da esteira
    const regY = banY + 21;
    doc.setFontSize(9);
    bold(doc);
    txt(doc, C.navy, 'Regras da esteira', 12, regY + 2);
    line(doc, C.accent, 12, regY + 3.5, 32, regY + 3.5, 0.9);
    const regras = [
      'As colunas são reordenáveis arrastando o cabeçalho — a ordem personalizada é salva por usuário no navegador.',
      'Lead que não atende, ou que retorna de Em Contato, volta ao FINAL da fila de reposição do gerente, com a contagem dos 5 dias da Agenda do Dia reiniciada.',
      'Leads já trabalhados permanecem no Kanban independentemente do filtro de data — o filtro de período afeta apenas a fila do dia.',
      'O menu de cada card permite mover, registrar tentativa sem retorno, voltar à fila e (admin) excluir o item da esteira.',
    ];
    doc.setFontSize(6.8);
    normal(doc);
    let ry2 = regY + 9;
    regras.forEach(r => {
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(13.5, ry2 - 1.2, 0.8, 'F');
      const lines = doc.splitTextToSize(r, pageW - 40);
      lines.forEach((ln, i) => txt(doc, C.text, ln, 17, ry2 + i * 3.6));
      ry2 += lines.length * 3.6 + 1.8;
    });

    footer(doc, pageW, pageH, 1, TOTAL, NOME);

    // ═══════════════ PÁGINA 2 — CARD DO LEAD + NOVOS CAMPOS DA ENTIDADE ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Card do Lead & Campos', 'Inércia · Tentativas · Ações rápidas');

    doc.setFontSize(13.5);
    bold(doc);
    txt(doc, C.navy, 'O Card do Lead — Tempo, Tentativas e Ações Rápidas', 12, 29);
    line(doc, C.accent, 12, 31.2, 74, 31.2, 1);
    doc.setFontSize(7.8);
    normal(doc);
    txt(doc, C.muted, 'Cada card agora carrega um relógio de inércia (dias parado), o retorno agendado, o contador de tentativas e ações rápidas de desfecho.', 12, 36.5);

    // ── Mockup do card (tema Aurora, com alerta de inércia pulsante) ──
    const cx0 = 14, cy0 = 44, cw0 = 124, ch0 = 122;
    rrect(doc, A.bg, cx0, cy0, cw0, ch0, 2.5);
    rstroke(doc, A.red, cx0, cy0, cw0, ch0, 2.5, 1.1);
    rstroke(doc, A.red, cx0 - 1.6, cy0 - 1.6, cw0 + 3.2, ch0 + 3.2, 3, 0.3); // "pulso" do alerta
    rstroke(doc, A.red, cx0 - 3.2, cy0 - 3.2, cw0 + 6.4, ch0 + 6.4, 4, 0.2);

    // avatar + nome
    doc.setFillColor(A.accent[0], A.accent[1], A.accent[2]);
    doc.circle(cx0 + 9, cy0 + 9, 3.6, 'F');
    doc.setTextColor(13, 17, 23);
    doc.setFontSize(5.5);
    bold(doc);
    doc.text('J', cx0 + 9, cy0 + 10.2, { align: 'center' });
    doc.setFontSize(7);
    bold(doc);
    txt(doc, A.text, 'JEFFERSON VITORINO', cx0 + 15, cy0 + 8);
    doc.setFontSize(4.6);
    normal(doc);
    txt(doc, A.muted, '(55) 99123-4567 · Gerente: Kauana', cx0 + 15, cy0 + 11.5);

    // chip de produto
    rrect(doc, mix(A.accent, A.bg, 0.78), cx0 + 5, cy0 + 16, 32, 5, 2);
    doc.setFontSize(4.6);
    bold(doc);
    txt(doc, A.accent, 'CANAL BANCÁRIO', cx0 + 6.5, cy0 + 19.4);
    // chip de status Em Contato
    rrect(doc, mix(A.amber, A.bg, 0.78), cx0 + 40, cy0 + 16, 22, 5, 2);
    txt(doc, A.amber, 'EM CONTATO', cx0 + 41.5, cy0 + 19.4);

    // selo de inércia (vermelho, pulsante na plataforma)
    rrect(doc, mix(A.red, A.bg, 0.72), cx0 + 5, cy0 + 25, 40, 6, 2);
    rstroke(doc, A.red, cx0 + 5, cy0 + 25, 40, 6, 2, 0.4);
    doc.setFontSize(5.2);
    bold(doc);
    txt(doc, A.red, '3d sem interação', cx0 + 7, cy0 + 29.2);

    // retorno agendado
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.accent, 'retorno 16/09 · 09:00', cx0 + 50, cy0 + 29.2);

    // chips de tentativas
    rrect(doc, mix(A.amber, A.bg, 0.78), cx0 + 5, cy0 + 34, 12, 5.5, 2.5);
    doc.setFontSize(4.8);
    bold(doc);
    txt(doc, A.amber, 'T2', cx0 + 11, cy0 + 37.8, { align: 'center' });
    rrect(doc, mix(A.violet, A.bg, 0.78), cx0 + 19, cy0 + 34, 42, 5.5, 2.5);
    rstroke(doc, A.violet, cx0 + 19, cy0 + 34, 42, 5.5, 2.5, 0.3);
    txt(doc, A.violet, 'Sem retorno (ghosting)', cx0 + 21, cy0 + 37.8);

    // nota ghosting
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, '4+ tentativas sem resposta do cliente: sistema sugere mover para Nutrição.', cx0 + 5, cy0 + 45);

    // ações rápidas
    doc.setFontSize(6);
    bold(doc);
    rrect(doc, mix(A.blue, A.bg, 0.7), cx0 + 5, cy0 + 52, 38, 8, 1.5);
    rstroke(doc, A.blue, cx0 + 5, cy0 + 52, 38, 8, 1.5, 0.4);
    txt(doc, A.blue, 'QUALIFICAR', cx0 + 24, cy0 + 56.7, { align: 'center' });
    rrect(doc, mix(A.amber, A.bg, 0.75), cx0 + 46, cy0 + 52, 30, 8, 1.5);
    rstroke(doc, A.amber, cx0 + 46, cy0 + 52, 30, 8, 1.5, 0.4);
    txt(doc, A.amber, 'TENTATIVA', cx0 + 61, cy0 + 56.7, { align: 'center' });
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Qualificar: Pipeline + tarefa de proposta em até 24h na agenda do gerente.', cx0 + 5, cy0 + 66);
    txt(doc, A.muted, 'Tentativa: registra contato sem retorno (T1, T2, T3...) e reinicia o relógio de inércia.', cx0 + 5, cy0 + 70);

    // contadores
    doc.setFontSize(5.4);
    normal(doc);
    txt(doc, A.muted, 'Contadores: "2d parado" (Em Contato e Qualificado) · retorno agendado · T1..Tn', cx0 + 5, cy0 + 79);
    txt(doc, A.muted, 'Filtro "Só atrasados": isola os leads além do SLA (48h), combinável com o filtro por gerente.', cx0 + 5, cy0 + 83);

    // modal de retorno obrigatório (mini-mockup)
    rrect(doc, A.surface, cx0 + 5, cy0 + 90, 114, 26, 2);
    rstroke(doc, A.amber, cx0 + 5, cy0 + 90, 114, 26, 2, 0.6);
    doc.setFontSize(6);
    bold(doc);
    txt(doc, A.text, 'Modal obrigatório — entrada em Em Contato', cx0 + 8, cy0 + 96);
    doc.setFontSize(5);
    normal(doc);
    txt(doc, A.muted, 'Nenhum lead entra (ou fica) em Em Contato sem data e hora do próximo retorno:', cx0 + 8, cy0 + 100.5);
    rrect(doc, A.surface2, cx0 + 8, cy0 + 104, 34, 7, 1);
    txt(doc, A.muted, 'Data: 16/09/2026', cx0 + 10, cy0 + 108.3);
    rrect(doc, A.surface2, cx0 + 46, cy0 + 104, 26, 7, 1);
    txt(doc, A.muted, 'Hora: 09:00', cx0 + 48, cy0 + 108.3);

    // ── Novos campos da entidade (legenda, tema claro) ──
    const legX = 148, legY2 = 44, legW = pageW - legX - 12;
    rrect(doc, C.white, legX, legY2, legW, 122, 2);
    rstroke(doc, C.border, legX, legY2, legW, 122, 2, 0.4);
    doc.setFontSize(8);
    bold(doc);
    txt(doc, C.navy, 'Novos campos — entidade FilaContato', legX + 4, legY2 + 6);

    const campos = [
      { n: 1, t: 'status_desde', d: 'Data/hora de entrada no status atual — base do contador de dias parado e do relógio de inércia (SLA 48h). Reinicia a cada movimentação ou tentativa.', c: C.accent },
      { n: 2, t: 'alerta_stale', d: 'Flag do alerta de inércia (>48h em Em Contato sem interação). Marcado pelo verificador automático; resetado a cada nova interação.', c: C.red },
      { n: 3, t: 'tentativas_contato', d: 'Tentativas sem retorno do cliente (T1, T2, T3...). A partir da 4ª o lead entra em "ghosting" e é sugerida a movimentação para Nutrição.', c: C.amber },
      { n: 4, t: 'proximo_contato_hora', d: 'Com o já existente proximo_contato (data), guarda a hora do retorno obrigatório agendado ao mover o lead para Em Contato. Exibido no card.', c: C.green },
      { n: 5, t: 'status "nutricao"', d: 'Novo status da esteira: desqualificação temporária para leads em ghosting — sai da visão do operador sem ser perdido.', c: C.violet },
      { n: 6, t: 'historico', d: 'Linha do tempo do lead: cada tentativa, alerta de inércia e movimentação registra entrada com data/hora e observação.', c: C.blue },
    ];
    let ly = legY2 + 12;
    campos.forEach(l => {
      marker(doc, l.n, legX + 6, ly, l.c);
      doc.setFontSize(6.4);
      bold(doc);
      txt(doc, C.text, l.t, legX + 12, ly + 1);
      doc.setFontSize(5.6);
      normal(doc);
      const dl = doc.splitTextToSize(l.d, legW - 16);
      dl.forEach((ln, i) => txt(doc, C.muted, ln, legX + 12, ly + 5 + i * 3));
      ly += 5 + dl.length * 3 + 2.4;
    });

    footer(doc, pageW, pageH, 2, TOTAL, NOME);

    // ═══════════════ PÁGINA 3 — CADÊNCIA, SLA & ABORDAGEM ═══════════════
    doc.addPage();
    pageBg(doc, pageW, pageH);
    header(doc, pageW, 'Cadência, SLA & Abordagem', 'Regras de negócio e pitch personalizado');

    doc.setFontSize(13.5);
    bold(doc);
    txt(doc, C.navy, 'Cadência, SLA e Abordagem Comercial', 12, 29);
    line(doc, C.accent, 12, 31.2, 56, 31.2, 1);
    doc.setFontSize(7.8);
    normal(doc);
    txt(doc, C.muted, 'Regras de negócio aplicadas automaticamente pela esteira, pelo verificador de SLA (a cada 5 minutos) e pelo painel de abordagem.', 12, 36.5);

    const notas = [
      'RETORNO OBRIGATÓRIO — ao mover qualquer lead para "Em Contato" (arraste, menu ou classificação), o sistema abre um modal exigindo a data e a hora do próximo retorno. Nenhum card entra ou permanece na esteira sem uma tarefa futura ativa.',
      'SLA DE INÉRCIA (48H) — o verificador automático identifica leads parados em Em Contato por mais de 48h, marca o flag de alerta (alerta_stale) e registra a inércia no histórico do lead.',
      'ALERTA VISUAL — o card ganha borda vermelha pulsante e o selo "Xd sem interação". O contador de dias parado também aparece nos cards da esteira Qualificado.',
      'NOTIFICAÇÃO AUTOMÁTICA — o gerente responsável recebe mensagem consolidada via Jarvis com seus leads parados; os administradores recebem um resumo geral. O disparo ocorre apenas quando há alertas novos, sem spam.',
      'TENTATIVAS SEM RETORNO — o botão no card registra cada tentativa (T1, T2, T3...), reinicia o relógio de inércia e grava no histórico. A partir da 4ª tentativa o lead entra em ghosting.',
      'ESTEIRA NUTRIÇÃO — leads em ghosting são sugeridos (e podem ser movidos) para a nova coluna Nutrição: desqualificação temporária que despolui a visão do operador sem perder o lead.',
      'AÇÃO RÁPIDA QUALIFICAR — botão direto no card move o lead para Qualificado, registra no Pipeline e cria automaticamente uma tarefa de proposta comercial com prazo máximo de 24 horas na agenda do gerente.',
      'FILTRO "SÓ ATRASADOS" — chip na barra de filtros isola os leads parados além do SLA (com contador), combinável com o filtro por gerente para acompanhamento individual.',
      'PRIORIDADE OPERACIONAL — faixa amarela acima do Kanban e selo "1ª" na coluna Agenda do Dia orientam zerar a carteira antes de atacar os leads novos da fila geral.',
      'PITCH PERSONALIZADO — a abertura identifica o lead pelo primeiro nome (PF) ou pelo representante legal (PJ) e traz o primeiro nome do gerente responsável: "Oi Jefferson, aqui é Kauana da Villela Exchange."',
      'OBJEÇÕES E IA VINCULADAS AO PRODUTO — roteiro, objeções comuns e sugestões da IA seguem o produto selecionado na Negociação em tempo real; a IA responde exclusivamente sobre o produto em negociação.',
    ];
    doc.setFontSize(6.8);
    normal(doc);
    let ty = 46;
    notas.forEach(n => {
      doc.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
      doc.circle(13.5, ty - 1.2, 0.8, 'F');
      const lines = doc.splitTextToSize(n, 182);
      lines.forEach((ln, i) => txt(doc, C.text, ln, 17, ty + i * 3.5));
      ty += lines.length * 3.5 + 2;
    });

    // Resumo
    const dx = pageW - 86, dy = 46;
    rrect(doc, mix(C.navy, C.white, 0.93), dx, dy, 74, 76, 2);
    rstroke(doc, C.navy, dx, dy, 74, 76, 2, 0.5);
    doc.setFontSize(7);
    bold(doc);
    txt(doc, C.navy, 'Resumo das regras', dx + 5, dy + 6);
    line(doc, C.accent, dx + 5, dy + 7.5, dx + 30, dy + 7.5, 0.8);
    const resumo = [
      ['Entrada em Em Contato', 'retorno obrigatório'],
      ['Inércia', 'alerta 48h + Jarvis'],
      ['Ghosting', '4+ tentativas'],
      ['Descarte temporário', 'esteira Nutrição'],
      ['Qualificação rápida', 'tarefa 24h'],
      ['Pitch / Objeções', 'produto + nomes reais'],
    ];
    let ryy = dy + 12;
    resumo.forEach(([k, v]) => {
      doc.setFontSize(5.8);
      bold(doc);
      txt(doc, C.text, k, dx + 5, ryy);
      normal(doc);
      doc.setFontSize(5.4);
      txt(doc, C.accent, v, dx + 5, ryy + 4);
      line(doc, C.border, dx + 5, ryy + 5.8, dx + 69, ryy + 5.8, 0.2);
      ryy += 10.5;
    });

    footer(doc, pageW, pageH, 3, TOTAL, NOME);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=estrutura-fila-contatos.pdf' },
    });
  } catch (error) {
    console.error('gerarManualFilaContatosPDF:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}