import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const admin = base44.asServiceRole;

    // Buscar usuários e atividades em paralelo
    const [usuarios, vendas, mensagens, chamados, interacoes, agendas] = await Promise.all([
      admin.entities.User.list('full_name'),
      admin.entities.Venda.list('-created_date', 500),
      admin.entities.MensagemChat.list('-created_date', 500),
      admin.entities.ChamadoSuporte.list('-created_date', 500),
      admin.entities.InteracaoCliente.list('-created_date', 500),
      admin.entities.AgendaContato.list('-created_date', 500),
    ]);

    const contar = (lista) => {
      const map = {};
      for (const item of lista) {
        if (item.created_by_id) {
          map[item.created_by_id] = (map[item.created_by_id] || 0) + 1;
        }
      }
      return map;
    };

    const vMap = contar(vendas);
    const mMap = contar(mensagens);
    const cMap = contar(chamados);
    const iMap = contar(interacoes);
    const aMap = contar(agendas);

    const getOnlineStatus = (ultimo) => {
      if (!ultimo) return 'Offline';
      const diff = (Date.now() - new Date(ultimo).getTime()) / 1000 / 60;
      if (diff <= 3) return 'Online';
      if (diff <= 10) return 'Ausente';
      return 'Offline';
    };

    const formatDataHora = (iso) => {
      if (!iso) return 'Nunca acessou';
      const d = new Date(iso);
      const data = d.toLocaleDateString('pt-BR');
      const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${data} ${hora}`;
    };

    // ===== Gerar PDF =====
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Cores
    const DARK = '#0d1117';
    const ACCENT = '#00D4AA';
    const TEXT = '#1a1a2e';
    const MUTED = '#6b7280';
    const LIGHT_BG = '#f0fdfa';

    // Header
    doc.setFillColor(DARK);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('VILLELA EXCHANGE — Relatório de Acessos', 10, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, 16);
    doc.text(`Total de usuários: ${usuarios.length}`, pageW - 10, 10, { align: 'right' });
    doc.text(`Online agora: ${usuarios.filter(u => getOnlineStatus(u.ultimo_acesso) === 'Online').length}`, pageW - 10, 16, { align: 'right' });

    // Stats
    const online = usuarios.filter(u => getOnlineStatus(u.ultimo_acesso) === 'Online').length;
    const bloqueados = usuarios.filter(u => u.ativo === false).length;
    const nunca = usuarios.filter(u => !u.ultimo_acesso).length;

    let y = 28;
    doc.setTextColor(TEXT);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${usuarios.length}  |  Online: ${online}  |  Bloqueados: ${bloqueados}  |  Nunca acessou: ${nunca}`, 10, y);
    y += 4;

    // Tabela
    const cols = [
      { header: 'Usuário', w: 45 },
      { header: 'E-mail', w: 45 },
      { header: 'Papel', w: 18 },
      { header: 'Status', w: 16 },
      { header: 'Último Acesso', w: 30 },
      { header: 'Menus', w: 14 },
      { header: 'Vendas', w: 14 },
      { header: 'Msgs', w: 14 },
      { header: 'Cham.', w: 14 },
      { header: 'Interaç.', w: 16 },
      { header: 'Agenda', w: 14 },
      { header: 'Total', w: 16 },
    ];

    const rowH = 7;
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    let x = 10;

    // Header row
    doc.setFillColor(ACCENT);
    doc.rect(x, y, tableW, rowH, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    for (const col of cols) {
      doc.text(col.header, x + 1.5, y + 5);
      x += col.w;
    }
    y += rowH;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    for (let i = 0; i < usuarios.length; i++) {
      const u = usuarios[i];
      if (y > pageH - 15) {
        doc.addPage();
        y = 15;
        // Re-desenha header
        x = 10;
        doc.setFillColor(ACCENT);
        doc.rect(x, y, tableW, rowH, 'F');
        doc.setTextColor('#ffffff');
        doc.setFont('helvetica', 'bold');
        for (const col of cols) {
          doc.text(col.header, x + 1.5, y + 5);
          x += col.w;
        }
        y += rowH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
      }

      x = 10;
      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(LIGHT_BG);
        doc.rect(x, y, tableW, rowH, 'F');
      }

      const nome = (u.nome_tratamento || u.full_name || '—').substring(0, 28);
      const email = (u.email || '—').substring(0, 30);
      const isAdmin = u.role === 'admin' || u.permissao_admin === true;
      const papel = isAdmin ? 'Admin' : 'Usuário';
      const status = u.ativo === false ? 'Bloqueado' : getOnlineStatus(u.ultimo_acesso);
      const acesso = formatDataHora(u.ultimo_acesso).substring(0, 18);
      const menus = isAdmin ? 'Total' : String(u.menus_acesso?.length || 0);
      const v = vMap[u.id] || 0;
      const m = mMap[u.id] || 0;
      const c = cMap[u.id] || 0;
      const it = iMap[u.id] || 0;
      const ag = aMap[u.id] || 0;
      const total = v + m + c + it + ag;

      // Status color
      let statusColor = MUTED;
      if (status === 'Online') statusColor = '#10b981';
      else if (status === 'Ausente') statusColor = '#f59e0b';
      else if (status === 'Bloqueado') statusColor = '#ef4444';

      doc.setTextColor(TEXT);
      doc.text(nome, x + 1.5, y + 5); x += cols[0].w;
      doc.setTextColor(MUTED);
      doc.text(email, x + 1.5, y + 5); x += cols[1].w;
      doc.setTextColor(isAdmin ? '#d97706' : TEXT);
      doc.text(papel, x + 1.5, y + 5); x += cols[2].w;
      doc.setTextColor(statusColor);
      doc.setFont('helvetica', 'bold');
      doc.text(status, x + 1.5, y + 5); x += cols[3].w;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED);
      doc.text(acesso, x + 1.5, y + 5); x += cols[4].w;
      doc.setTextColor(TEXT);
      doc.text(menus, x + 1.5, y + 5, { align: 'center' }); x += cols[5].w;
      doc.text(String(v), x + 1.5, y + 5, { align: 'center' }); x += cols[6].w;
      doc.text(String(m), x + 1.5, y + 5, { align: 'center' }); x += cols[7].w;
      doc.text(String(c), x + 1.5, y + 5, { align: 'center' }); x += cols[8].w;
      doc.text(String(it), x + 1.5, y + 5, { align: 'center' }); x += cols[9].w;
      doc.text(String(ag), x + 1.5, y + 5, { align: 'center' }); x += cols[10].w;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(ACCENT);
      doc.text(String(total), x + 1.5, y + 5, { align: 'center' }); x += cols[11].w;
      doc.setFont('helvetica', 'normal');

      // Border
      doc.setDrawColor(220, 220, 220);
      doc.line(10, y + rowH, 10 + tableW, y + rowH);

      y += rowH;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(MUTED);
      doc.text(`Página ${p} de ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
      doc.text('Villela Exchange — Gestão Comercial', 10, pageH - 5);
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio-acessos.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});