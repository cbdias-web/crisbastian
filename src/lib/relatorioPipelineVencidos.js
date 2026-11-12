// Relatório de operações em pipeline com fechamento vencido ou status desatualizado.
// Formato enxuto: nome, valor, data de fechamento e status (sem histórico de interação).
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { todayBrasilia } from '@/lib/dateUtils';
import { normNome } from '@/lib/nomes';

export const DIAS_DESATUALIZADO = 15;

const fmtVal = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => (d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—');

// Paleta padrão dos relatórios da plataforma (Aurora / azul institucional)
const AZUL = [15, 30, 53];
const AZUL_TABELA = [26, 49, 80];
const AZUL_CLARO = [180, 200, 230];
const CINZA_CARD = [245, 247, 250];
const CINZA_LABEL = [100, 116, 139];
const CINZA_LINHA = [248, 250, 252];
const VERMELHO = [153, 27, 27];

export function motivosDeAlerta(n) {
  if (!n) return [];
  if (n.temperatura === 'Fechado' || n.temperatura === 'Perdido') return [];
  const motivos = [];
  const hoje = todayBrasilia();
  if (!n.data_prevista) motivos.push('sem data de fechamento');
  else if (n.data_prevista < hoje) motivos.push('fechamento vencido');
  const base = n.updated_date || n.created_date;
  if (base) {
    const dias = Math.floor((Date.now() - new Date(base).getTime()) / 86400000);
    if (dias > DIAS_DESATUALIZADO) motivos.push('status desatualizado');
  }
  return motivos;
}

export function diasEmAtraso(dataPrevista) {
  if (!dataPrevista) return null;
  const hoje = new Date(todayBrasilia() + 'T00:00:00');
  const alvo = new Date(dataPrevista + 'T00:00:00');
  if (isNaN(alvo.getTime())) return null;
  return Math.floor((hoje - alvo) / 86400000);
}

// Gerentes inativos (ou não cadastrados como ativos) ficam fora do relatório
function gerenteInativo(n, vendedores) {
  if (!vendedores || vendedores.length === 0) return false;
  const inativos = vendedores.filter(v => v.ativo === false);
  const nome = normNome(n.vendedor_nome);
  return inativos.some(v =>
    (v.id && n.vendedor_id && v.id === n.vendedor_id) ||
    (nome && normNome(v.nome) === nome)
  );
}

export function operacoesVencidas(negocios, vendedores = []) {
  return (negocios || [])
    .filter(n => motivosDeAlerta(n).length > 0 && !gerenteInativo(n, vendedores))
    .sort((a, b) => {
      const da = diasEmAtraso(a.data_prevista);
      const db = diasEmAtraso(b.data_prevista);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return db - da;
    });
}

export function gerarRelatorioVencidosPDF(negocios, vendedores = []) {
  const itens = operacoesVencidas(negocios, vendedores);
  const totalValor = itens.reduce((s, n) => s + (n.valor_estimado || 0), 0);
  const hoje = todayBrasilia();
  const vencidas = itens.filter(n => n.data_prevista && n.data_prevista < hoje).length;
  const semData = itens.filter(n => !n.data_prevista).length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;
  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const cortar = (txt, maxMM) => {
    let s = semAcento(txt || '-') || '-';
    if (doc.getTextWidth(s) <= maxMM) return s;
    while (s.length > 1 && doc.getTextWidth(s + '.') > maxMM) s = s.slice(0, -1);
    return s + '.';
  };

  // Cabeçalho institucional
  const cabecalho = (altura) => {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, W, altura, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('VILLELA EXCHANGE', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...AZUL_CLARO);
    doc.text('Relatório de Operações Vencidas - Pipeline', margin, altura - 6);
  };

  cabecalho(22);
  doc.setTextColor(...AZUL_CLARO);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, W - margin, 10, { align: 'right' });
  doc.text(`Critério: vencido, sem data ou parado há mais de ${DIAS_DESATUALIZADO} dias`, W - margin, 16, { align: 'right' });

  // KPIs
  let y = 30;
  const kpis = [
    { label: 'Operações em atenção', value: String(itens.length) },
    { label: 'Valor em negociação', value: fmtVal(totalValor) },
    { label: 'Fechamento vencido', value: String(vencidas) },
    { label: 'Sem data de fechamento', value: String(semData) },
  ];
  const kpiW = (W - margin * 2) / kpis.length;
  kpis.forEach((k, i) => {
    const x = margin + i * kpiW;
    doc.setFillColor(...CINZA_CARD);
    doc.roundedRect(x, y, kpiW - 3, 16, 2, 2, 'F');
    doc.setTextColor(...CINZA_LABEL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(k.label, x + 4, y + 6);
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(k.value, x + 4, y + 13);
  });
  doc.setTextColor(0, 0, 0);

  y = 54;

  if (itens.length === 0) {
    doc.setFillColor(...CINZA_CARD);
    doc.roundedRect(margin, y, W - margin * 2, 20, 2, 2, 'F');
    doc.setTextColor(...CINZA_LABEL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nenhuma operação em pipeline com fechamento vencido ou status desatualizado.', W / 2, y + 12, { align: 'center' });
  } else {
    const cols = [
      { titulo: 'Nome', largura: 56, alinhamento: 'left' },
      { titulo: 'Produto', largura: 46, alinhamento: 'left' },
      { titulo: 'Gerente', largura: 44, alinhamento: 'left' },
      { titulo: 'Valor', largura: 30, alinhamento: 'right' },
      { titulo: 'Fechamento', largura: 30, alinhamento: 'left' },
      { titulo: 'Vencido há', largura: 24, alinhamento: 'right' },
      { titulo: 'Status', largura: 39, alinhamento: 'left' },
    ];
    const totalCols = cols.reduce((s, c) => s + c.largura, 0);

    const cabecalhoTabela = () => {
      doc.setFillColor(...AZUL_TABELA);
      doc.rect(margin, y, totalCols, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      let x = margin;
      cols.forEach((c) => {
        const tx = c.alinhamento === 'right' ? x + c.largura - 2 : x + 2;
        doc.text(c.titulo, tx, y + 5.5, { align: c.alinhamento });
        x += c.largura;
      });
      y += 8;
    };

    const novaPagina = () => {
      doc.addPage();
      cabecalho(18);
      y = 24;
      cabecalhoTabela();
    };

    cabecalhoTabela();

    itens.forEach((n, idx) => {
      if (y > H - 24) novaPagina();

      if (idx % 2 === 1) {
        doc.setFillColor(...CINZA_LINHA);
        doc.rect(margin, y, totalCols, 7, 'F');
      }

      const dias = diasEmAtraso(n.data_prevista);
      const atraso = dias === null ? '-' : dias > 0 ? `${dias}d` : '0d';
      const valores = [
        n.cliente_nome || '-',
        n.produto || '-',
        n.vendedor_nome || '-',
        fmtVal(n.valor_estimado),
        fmtDate(n.data_prevista),
        atraso,
        n.temperatura || '-',
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      let x = margin;
      cols.forEach((c, i) => {
        const tx = c.alinhamento === 'right' ? x + c.largura - 2 : x + 2;
        if (i === 5 && dias !== null && dias > 0) doc.setTextColor(...VERMELHO);
        doc.text(cortar(valores[i], c.largura - 4), tx, y + 4.8, { align: c.alinhamento });
        doc.setTextColor(0, 0, 0);
        x += c.largura;
      });
      y += 7;
    });

    // Total
    if (y > H - 24) novaPagina();
    doc.setFillColor(...CINZA_CARD);
    doc.rect(margin, y, totalCols, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...AZUL);
    doc.text(`TOTAL: ${itens.length} operação(ões)`, margin + 2, y + 5.5);
    doc.text(fmtVal(totalValor), margin + cols[0].largura + cols[1].largura + cols[2].largura + cols[3].largura - 2, y + 5.5, { align: 'right' });
    y += 8;
  }

  // Rodapé com paginação
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA_LABEL);
    doc.text(`Página ${p} de ${totalPaginas} - Villela Exchange - Pipeline Comercial`, W / 2, H - 6, { align: 'center' });
  }

  doc.save('operacoes-vencidas-pipeline.pdf');
  return { total: itens.length, valorTotal: totalValor };
}