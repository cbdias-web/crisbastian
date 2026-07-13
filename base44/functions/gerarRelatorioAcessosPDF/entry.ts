import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Sanitiza texto para WinAnsi/cp1252 (encoding padrao do jsPDF helvetica)
// Substitui caracteres Unicode que nao existem em cp1252 por equivalentes ASCII
function sanitize(text) {
  if (!text) return '';
  return String(text)
    .replace(/—/g, '-')    // em dash
    .replace(/–/g, '-')    // en dash
    .replace(/'/g, "'")    // right single quote
    .replace(/'/g, "'")    // left single quote
    .replace(/"/g, '"')    // right double quote
    .replace(/"/g, '"')    // left double quote
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u00a0/g, ' ')   // nbsp
    .replace(/\u2022/g, '-')   // bullet
    .replace(/\u25CF/g, 'o')   // black circle
    .replace(/\u2192/g, '->')  // right arrow
    .replace(/\u00b7/g, '-')   // middle dot
    .replace(/\u2013/g, '-')   // figure dash
    .replace(/\u2018/g, "'")   // left single quote
    .replace(/\u2019/g, "'")   // right single quote
    .replace(/\u201c/g, '"')   // left double quote
    .replace(/\u201d/g, '"')   // right double quote
    .replace(/\u2122/g, 'TM')  // trademark
    .replace(/\u00ae/g, '(R)') // registered
    .replace(/\u00b0/g, ' deg ') // degree
    .replace(/\u00d7/g, 'x')   // multiplication
    .replace(/\u00f7/g, '/')   // division
    .replace(/[\u2000-\u200F]/g, ' ') // various spaces
    .replace(/[\u2010-\u2015]/g, '-') // various dashes
    .replace(/[\u2028-\u202F]/g, ' ') // line/par sep, other punct
    .replace(/[\u2050-\u205F]/g, ' ') // other punct
    .replace(/[\u2190-\u21FF]/g, '->') // arrows
    .replace(/[\u2200-\u22FF]/g, '')   // math operators
    .replace(/[\u2300-\u23FF]/g, '')   // misc technical
    .replace(/[\u25A0-\u25FF]/g, '')   // geometric shapes
    .replace(/[\u2600-\u26FF]/g, '')   // misc symbols
    // Manter acentos Latin-1 (cp1252 suporta: á-ú, Á-Ú, ã-õ, Ã-Õ, ç, Ç, â-ê, etc.)
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.permissao_admin !== true) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    // Parse payload
    let body = {};
    try { body = await req.json(); } catch {}

    const fUsuarioId = body.usuario_id || null;
    const fUsuariosIds = body.usuarios_ids || null; // multi-selecao
    const fDataInicio = body.data_inicio || null;
    const fDataFim = body.data_fim || null;
    const fStatus = body.filtro_status || 'todos';
    const fSearch = (body.search_term || '').toLowerCase();

    const admin = base44.asServiceRole;

    // Buscar usuarios, atividades e sessoes em paralelo
    const [usuarios, navegacoes, sessoes] = await Promise.all([
      admin.entities.User.list('full_name'),
      admin.entities.NavegacaoUsuario.list('-acessado_em', 500),
      admin.entities.SessaoUsuario.list('-inicio', 500),
    ]);

    // Limpar sessoes stale (ativa=true mas heartbeat > 10 min) antes de gerar relatorio
    const staleThresholdMs = Date.now() - 10 * 60 * 1000;
    for (const s of sessoes) {
      if (!s.ativa) continue;
      const hbMs = s.ultimo_heartbeat ? new Date(s.ultimo_heartbeat).getTime() : (s.inicio ? new Date(s.inicio).getTime() : 0);
      if (hbMs < staleThresholdMs) {
        const fim = s.ultimo_heartbeat || s.inicio || new Date().toISOString();
        const duracaoMin = Math.max(0, Math.round((new Date(fim).getTime() - new Date(s.inicio).getTime()) / 1000 / 60));
        try {
          await admin.entities.SessaoUsuario.update(s.id, { fim, ativa: false, duracao_min: duracaoMin });
          s.fim = fim;
          s.ativa = false;
          s.duracao_min = duracaoMin;
        } catch (e) {}
      }
    }

    // Filtrar e agrupar sessoes por usuario
    const sessoesFiltradas = sessoes.filter(s => {
      if (!s.inicio) return false;
      const d = s.inicio.split('T')[0];
      if (fDataInicio && d < fDataInicio) return false;
      if (fDataFim && d > fDataFim) return false;
      return true;
    });
    const sessoesPorUsuario = {};
    for (const s of sessoesFiltradas) {
      if (!sessoesPorUsuario[s.user_id]) sessoesPorUsuario[s.user_id] = [];
      sessoesPorUsuario[s.user_id].push(s);
    }

    // Agrupar navegacoes por usuario e pagina
    const navegsFiltradas = navegacoes.filter(n => {
      if (!n.acessado_em) return false;
      const d = n.acessado_em.split('T')[0];
      if (fDataInicio && d < fDataInicio) return false;
      if (fDataFim && d > fDataFim) return false;
      return true;
    });
    const navegsPorUsuario = {};
    for (const n of navegsFiltradas) {
      if (!navegsPorUsuario[n.user_id]) navegsPorUsuario[n.user_id] = {};
      navegsPorUsuario[n.user_id][n.pagina] = (navegsPorUsuario[n.user_id][n.pagina] || 0) + 1;
    }

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
      return `${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
    };

    const formatDuracaoPdf = (min) => {
      if (!min || min <= 0) return '-';
      if (min < 60) return `${min} min`;
      return `${Math.floor(min / 60)}h ${min % 60}min`;
    };

    const formatSessao = (u) => {
      const userSessoes = sessoesPorUsuario[u.id] || [];
      const isOnline = getOnlineStatus(u.ultimo_acesso) === 'Online';
      const nowMs = Date.now();

      // Fallback: sem registros de sessao, usar dados do User entity
      if (userSessoes.length === 0) {
        const inicio = u.acesso_inicio;
        const ultimo = u.ultimo_acesso;
        const inicioStr = inicio
          ? new Date(inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
          : '-';
        let fimStr = '-';
        let duracao = '-';
        if (isOnline) {
          fimStr = 'Em sessao';
          if (inicio) {
            const diffMin = Math.round((nowMs - new Date(inicio).getTime()) / 1000 / 60);
            duracao = formatDuracaoPdf(diffMin);
          }
        } else if (ultimo) {
          fimStr = new Date(ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          if (inicio) {
            const diffMin = Math.round((new Date(ultimo).getTime() - new Date(inicio).getTime()) / 1000 / 60);
            duracao = formatDuracaoPdf(diffMin);
          }
        }
        return { inicio: inicioStr, fim: fimStr, duracao, numSessoes: 0 };
      }

      const sorted = [...userSessoes].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
      const primeira = sorted[0];
      const ultima = sorted[sorted.length - 1];
      const temAtiva = sorted.some(s => s.ativa);

      const inicioStr = new Date(primeira.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

      let fimStr = '-';
      if (temAtiva && isOnline) {
        fimStr = 'Em sessao';
      } else if (ultima.fim) {
        fimStr = new Date(ultima.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      } else if (ultima.ultimo_heartbeat) {
        fimStr = new Date(ultima.ultimo_heartbeat).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      }

      let totalMin = 0;
      for (const s of sorted) {
        let fimRef = null;
        if (s.fim) {
          fimRef = new Date(s.fim);
        } else if (s.ativa && isOnline) {
          // Sessao ativa de usuario online: usar horario atual
          fimRef = new Date(nowMs);
        } else if (s.ultimo_heartbeat) {
          fimRef = new Date(s.ultimo_heartbeat);
        }
        if (fimRef) {
          totalMin += Math.max(0, Math.round((fimRef - new Date(s.inicio)) / 1000 / 60));
        }
      }

      return {
        inicio: inicioStr,
        fim: fimStr,
        duracao: formatDuracaoPdf(totalMin),
        numSessoes: sorted.length,
      };
    };

    // Processar usuarios com dados
    const PAGE_LABELS_PDF = {
      Dashboard: 'Dashboard', MarketNews: 'Mercado', Vendas: 'Vendas',
      MeusClientes: 'Agenda', CentralLeads: 'Central Leads', Contratos: 'Contratos',
      Implantacoes: 'Implant.', Pipeline: 'Pipeline', Precificacao: 'Precific.',
      Desempenho: 'Desempenho', Clientes: 'Clientes', Vendedores: 'Vendedores',
      Espelhamentos: 'Indicad.', ChatPage: 'Chat', RelatorioInteracoes: 'Rel.Inter.',
      Manual: 'Manual', Treinamento: 'Capacit.', Suporte: 'Suporte',
      Comissoes: 'Comiss.', Notificacoes: 'Notifs', Comunicados: 'Comunic.',
      NotasFiscais: 'NF', TreinamentoAdmin: 'Cap.Admin', RelatorioComissoes: 'Rel.Com.',
      Leads: 'Prospec.', Metas: 'Metas', Produtos: 'Produtos', Importar: 'Importar',
      Usuarios: 'Usuarios', AssistenteTreinamentos: 'Assistente',
    };

    let usuariosProc = usuarios.map(u => {
      const isAdminUser = u.role === 'admin' || u.permissao_admin === true;
      const status = u.ativo === false ? 'Bloqueado' : getOnlineStatus(u.ultimo_acesso);
      const navegs = navegsPorUsuario[u.id] || {};
      const total = Object.values(navegs).reduce((s, v) => s + v, 0);
      const topPages = Object.entries(navegs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([p, c]) => `${PAGE_LABELS_PDF[p] || p} (${c})`)
        .join(', ');
      return {
        ...u,
        isAdminUser,
        statusStr: status,
        acessoStr: formatDataHora(u.ultimo_acesso),
        menusStr: isAdminUser ? 'Total' : String(u.menus_acesso?.length || 0),
        topPagesStr: topPages || '-',
        total,
        sessao: formatSessao(u),
      };
    });

    // Ignorar usuarios bloqueados e inativos (sem ultimo_acesso)
    usuariosProc = usuariosProc.filter(u => u.ativo !== false && u.ultimo_acesso);

    // Aplicar filtros
    if (fUsuarioId) usuariosProc = usuariosProc.filter(u => u.id === fUsuarioId);
    if (fUsuariosIds && Array.isArray(fUsuariosIds) && fUsuariosIds.length > 0) {
      usuariosProc = usuariosProc.filter(u => fUsuariosIds.includes(u.id));
    }
    if (fSearch) {
      usuariosProc = usuariosProc.filter(u =>
        (u.full_name || '').toLowerCase().includes(fSearch) ||
        (u.email || '').toLowerCase().includes(fSearch) ||
        (u.nome_tratamento || '').toLowerCase().includes(fSearch)
      );
    }
    if (fStatus === 'online') usuariosProc = usuariosProc.filter(u => u.statusStr === 'Online');
    if (fStatus === 'bloqueados') usuariosProc = usuariosProc.filter(u => u.ativo === false);
    if (fStatus === 'inativos') usuariosProc = usuariosProc.filter(u => !u.ultimo_acesso);

    // Stats
    const online = usuariosProc.filter(u => u.statusStr === 'Online').length;
    const bloqueados = usuariosProc.filter(u => u.ativo === false).length;
    const nunca = usuariosProc.filter(u => !u.ultimo_acesso).length;
    const totalAtuacoes = usuariosProc.reduce((s, u) => s + u.total, 0);

    // Top 8 para grafico
    const topUsuarios = [...usuariosProc].filter(u => u.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

    // ===== GERAR PDF =====
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();   // 297mm
    const pageH = doc.internal.pageSize.getHeight();  // 210mm

    // Paleta Aurora Borealis (adaptada para PDF - fundo claro com accents escuros)
    const C = {
      darkBg: '#0d1117',
      darkNav: '#1a1a2e',
      darkBlue: '#16213e',
      accent: '#00D4AA',
      accentDark: '#00a886',
      accentLight: '#e6fffa',
      text: '#1a1a2e',
      textLight: '#4a5568',
      textMuted: '#8895a6',
      white: '#ffffff',
      border: '#e2e8f0',
      rowAlt: '#f7fafc',
      green: '#10b981',
      greenBg: '#ecfdf5',
      amber: '#f59e0b',
      amberBg: '#fffbeb',
      red: '#ef4444',
      redBg: '#fef2f2',
      blue: '#3b82f6',
      blueBg: '#eff6ff',
      purple: '#8b5cf6',
      purpleBg: '#f5f3ff',
    };

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    // ═══════════════════════════════════════════════════
    // PAGINA 1: CAPA + SUMARIO + GRAFICO
    // ═══════════════════════════════════════════════════

    // Fundo escuro no topo (header)
    doc.setFillColor(...hexToRgb(C.darkBg));
    doc.rect(0, 0, pageW, 45, 'F');

    // Faixa accent
    doc.setFillColor(...hexToRgb(C.accent));
    doc.rect(0, 45, pageW, 1.5, 'F');

    // Logo / Brand
    doc.setFillColor(...hexToRgb(C.accent));
    doc.roundedRect(14, 12, 18, 18, 3, 3, 'F');
    doc.setTextColor(...hexToRgb(C.white));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('VX', 23, 23, { align: 'center' });

    // Titulo
    doc.setFontSize(18);
    doc.setTextColor(...hexToRgb(C.white));
    doc.text(sanitize('Relatorio de Acessos'), 38, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 200);
    doc.text(sanitize('Villela Exchange - Gestao Comercial'), 38, 27);
    doc.setFontSize(8);
    doc.text(sanitize(`Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`), 38, 33);

    // Box de periodo a direita
    doc.setFillColor(...hexToRgb(C.darkBlue));
    doc.roundedRect(pageW - 80, 10, 66, 28, 3, 3, 'F');
    doc.setTextColor(...hexToRgb(C.accent));
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PERIODO', pageW - 77, 17);
    doc.setTextColor(...hexToRgb(C.white));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const periodoLabel = fDataInicio || fDataFim
      ? sanitize(`${fDataInicio || 'Inicio'} a ${fDataFim || 'Hoje'}`)
      : 'Todos os periodos';
    doc.text(periodoLabel, pageW - 77, 24);
    if (fSearch) {
      doc.setFontSize(7);
      doc.setTextColor(180, 190, 200);
      doc.text(sanitize(`Busca: "${fSearch}"`), pageW - 77, 31);
    } else if (fUsuarioId) {
      const uSel = usuarios.find(u => u.id === fUsuarioId);
      doc.setFontSize(7);
      doc.setTextColor(180, 190, 200);
      doc.text(sanitize(`Usuario: ${uSel?.nome_tratamento || uSel?.full_name || 'Selecionado'}`), pageW - 77, 31);
    }

    // ═══ CARDS DE SUMARIO (coluna esquerda) ═══
    const cardStartY = 55;
    const cardH = 15;
    const cardW = 120;
    const cardGap = 2;

    const cards = [
      { label: 'Total', value: usuariosProc.length, color: C.accent, bg: C.accentLight },
      { label: 'Online', value: online, color: C.green, bg: C.greenBg },
      { label: 'Bloqueados', value: bloqueados, color: C.red, bg: C.redBg },
      { label: 'Nunca acessou', value: nunca, color: C.amber, bg: C.amberBg },
      { label: 'Total Navegacoes', value: totalAtuacoes, color: C.purple, bg: C.purpleBg },
    ];

    cards.forEach((card, i) => {
      const cy = cardStartY + i * (cardH + cardGap);
      // Card bg
      doc.setFillColor(...hexToRgb(card.bg));
      doc.roundedRect(14, cy, cardW, cardH, 2, 2, 'F');
      // Left accent bar
      doc.setFillColor(...hexToRgb(card.color));
      doc.roundedRect(14, cy, 1.5, cardH, 0.5, 0.5, 'F');
      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.text(sanitize(card.label).toUpperCase(), 19, cy + 6);
      // Value (alinhado a direita)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...hexToRgb(card.color));
      doc.text(String(card.value), 14 + cardW - 4, cy + 11, { align: 'right' });
    });

    // ═══ GRAFICO DE BARRAS (coluna direita) ═══
    const chartX = 138;
    const chartY = 55;
    const chartH = 83;
    const chartW = pageW - 14 - chartX;

    // Box do grafico
    doc.setFillColor(...hexToRgb(C.white));
    doc.setDrawColor(...hexToRgb(C.border));
    doc.roundedRect(chartX, chartY, chartW, chartH, 3, 3, 'FD');

    // Titulo do grafico
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(C.text));
    doc.text('Top 8 Usuarios por Navegacoes', chartX + 4, chartY + 7);

    if (topUsuarios.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.text('Nenhuma navegacao registrada no periodo selecionado.', chartX + 4, chartY + 20);
    } else {
      const maxVal = Math.max(...topUsuarios.map(u => u.total), 1);
      const barAreaY = chartY + 12;
      const barAreaH = chartH - 18;
      const barAreaW = chartW - 10;
      const barAreaX = chartX + 6;
      const barW = (barAreaW / topUsuarios.length) - 4;

      // Linhas de grade horizontais
      for (let g = 0; g <= 4; g++) {
        const gy = barAreaY + (barAreaH / 4) * g;
        doc.setDrawColor(235, 238, 242);
        doc.setLineDashPattern([0.5, 1], 0);
        doc.line(barAreaX, gy, barAreaX + barAreaW - 5, gy);
      }
      doc.setLineDashPattern([], 0);

      topUsuarios.forEach((u, i) => {
        const bx = barAreaX + i * (barW + 4);
        const barVal = (u.total / maxVal) * barAreaH;
        const by = barAreaY + barAreaH - barVal;

        // Barra com gradiente (simulado com cor solida)
        const opacity = 0.5 + (i / topUsuarios.length) * 0.5;
        const [r, g, b] = hexToRgb(C.accent);
        doc.setFillColor(r, g, b);
        doc.roundedRect(bx, by, barW, barVal, 1, 1, 'F');

        // Valor no topo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...hexToRgb(C.accentDark));
        doc.text(String(u.total), bx + barW / 2, by - 1.5, { align: 'center' });

        // Nome do usuario
        const nome = sanitize((u.nome_tratamento || u.full_name || 'N/A').split(' ')[0]).substring(0, 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...hexToRgb(C.textMuted));
        doc.text(nome, bx + barW / 2, barAreaY + barAreaH + 4, { align: 'center' });
      });
    }

    // ═══ TABELA DETALHADA ═══
    let y = chartY + chartH + 8;

    // Titulo da secao
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(C.text));
    doc.text(sanitize(`Detalhamento por Usuario (${usuariosProc.length})`), 14, y);
    y += 3;

    // Definicao das colunas
    const cols = [
      { header: 'Usuario', w: 42, align: 'left' },
      { header: 'E-mail', w: 42, align: 'left' },
      { header: 'Papel', w: 14, align: 'left' },
      { header: 'Status', w: 16, align: 'left' },
      { header: 'Inicio', w: 14, align: 'center' },
      { header: 'Fim', w: 16, align: 'center' },
      { header: 'Duracao', w: 16, align: 'center' },
      { header: 'Menus', w: 11, align: 'center' },
      { header: 'Top Paginas Visitadas', w: 90, align: 'left' },
      { header: 'Naveg.', w: 14, align: 'center' },
    ];
    const rowH = 6.5;
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    let tableX = 14;

    // Helper para desenhar header da tabela
    const drawTableHeader = (startY) => {
      let cx = tableX;
      doc.setFillColor(...hexToRgb(C.darkNav));
      doc.rect(cx, startY, tableW, rowH, 'F');
      // Accent line abaixo do header
      doc.setFillColor(...hexToRgb(C.accent));
      doc.rect(cx, startY + rowH, tableW, 0.5, 'F');
      doc.setTextColor(...hexToRgb(C.white));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      for (const col of cols) {
        if (col.align === 'center') {
          doc.text(sanitize(col.header), cx + col.w / 2, startY + 4.5, { align: 'center' });
        } else {
          doc.text(sanitize(col.header), cx + 1.5, startY + 4.5);
        }
        cx += col.w;
      }
      return startY + rowH;
    };

    y = drawTableHeader(y);

    // Linhas de dados
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    for (let i = 0; i < usuariosProc.length; i++) {
      const u = usuariosProc[i];

      // Quebra de pagina
      if (y > pageH - 20) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
      }

      let cx = tableX;

      // Alternating row
      if (i % 2 === 0) {
        doc.setFillColor(...hexToRgb(C.rowAlt));
        doc.rect(cx, y, tableW, rowH, 'F');
      }

      const nome = sanitize(u.nome_tratamento || u.full_name || '-').substring(0, 26);
      const email = sanitize(u.email || '-').substring(0, 28);
      const papel = u.isAdminUser ? 'Admin' : 'Usuario';
      const status = u.statusStr;

      // Cor do status
      let statusColor = C.textMuted;
      if (status === 'Online') statusColor = C.green;
      else if (status === 'Ausente') statusColor = C.amber;
      else if (status === 'Bloqueado') statusColor = C.red;

      // Usuario
      doc.setTextColor(...hexToRgb(C.text));
      doc.setFont('helvetica', 'bold');
      doc.text(nome, cx + 1.5, y + 4.5); cx += cols[0].w;
      doc.setFont('helvetica', 'normal');

      // Email
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.text(email, cx + 1.5, y + 4.5); cx += cols[1].w;

      // Papel
      doc.setTextColor(...hexToRgb(u.isAdminUser ? C.amber : C.blue));
      doc.text(papel, cx + 1.5, y + 4.5); cx += cols[2].w;

      // Status
      doc.setTextColor(...hexToRgb(statusColor));
      doc.setFont('helvetica', 'bold');
      doc.text(status, cx + 1.5, y + 4.5); cx += cols[3].w;
      doc.setFont('helvetica', 'normal');

      // Inicio da sessao
      doc.setTextColor(...hexToRgb(C.textMuted));
      doc.text(sanitize(u.sessao.inicio), cx + cols[4].w / 2, y + 4.5, { align: 'center' }); cx += cols[4].w;

      // Fim da sessao
      if (u.sessao.fim === 'Em sessao') {
        doc.setTextColor(...hexToRgb(C.green));
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(...hexToRgb(C.textMuted));
      }
      doc.text(sanitize(u.sessao.fim), cx + cols[5].w / 2, y + 4.5, { align: 'center' }); cx += cols[5].w;
      doc.setFont('helvetica', 'normal');

      // Duracao
      doc.setTextColor(...hexToRgb(u.sessao.duracao !== '-' ? C.accent : C.textMuted));
      doc.setFont('helvetica', u.sessao.duracao !== '-' ? 'bold' : 'normal');
      doc.text(sanitize(u.sessao.duracao), cx + cols[6].w / 2, y + 4.5, { align: 'center' }); cx += cols[6].w;
      doc.setFont('helvetica', 'normal');

      // Menus
      doc.setTextColor(...hexToRgb(C.text));
      doc.text(u.menusStr, cx + cols[7].w / 2, y + 4.5, { align: 'center' }); cx += cols[7].w;

      // Top paginas visitadas
      doc.setTextColor(...hexToRgb(u.topPagesStr !== '-' ? C.textLight : C.textMuted));
      doc.setFont('helvetica', 'normal');
      doc.text(sanitize(u.topPagesStr).substring(0, 60), cx + 1.5, y + 4.5); cx += cols[8].w;

      // Navegacoes total
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(u.total > 0 ? C.accent : C.textMuted));
      doc.text(String(u.total), cx + cols[9].w / 2, y + 4.5, { align: 'center' });

      // Bottom border
      doc.setDrawColor(...hexToRgb(C.border));
      doc.setLineWidth(0.1);
      doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

      y += rowH;
    }

    // ═══ FOOTER em todas as paginas ═══
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      // Linha accent no rodape
      doc.setFillColor(...hexToRgb(C.accent));
      doc.rect(0, pageH - 8, pageW, 0.5, 'F');
      // Texto
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
        'Content-Disposition': 'attachment; filename=relatorio-acessos.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});