import { useState, useMemo } from 'react';
import { X, BarChart3, TrendingUp, Download, ChevronDown, Check, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function MultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === options.length;

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
  const toggleAll = () => onChange(allSelected ? [] : options.map(o => o.id));

  const label = allSelected ? 'Todos os vendedores'
    : selected.length === 0 ? 'Nenhum selecionado'
    : `${selected.length} vendedor${selected.length > 1 ? 'es' : ''} selecionado${selected.length > 1 ? 's' : ''}`;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 hover:bg-gray-50 transition w-full justify-between min-w-[260px]">
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 max-h-64 overflow-y-auto">
            <button onClick={toggleAll}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-50">
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                {allSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              Todos
            </button>
            {options.map(o => (
              <button key={o.id} onClick={() => toggle(o.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-600">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(o.id) ? 'bg-[#1a3150] border-[#1a3150]' : 'border-gray-300'}`}>
                  {selected.includes(o.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RelatorioConsolidadoModal({ vendedores, vendas, metas, onClose }) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [dataInicio, setDataInicio] = useState(`${mesAtual}-01`);
  const [dataFim, setDataFim] = useState(() => {
    const [ano, mes] = mesAtual.split('-');
    const last = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    return `${mesAtual}-${String(last).padStart(2, '0')}`;
  });
  const [selectedIds, setSelectedIds] = useState(vendedores.map(v => v.id));

  const options = vendedores.map(v => ({ id: v.id, label: v.nome }));

  const rows = useMemo(() => {
    return vendedores
      .filter(v => selectedIds.includes(v.id))
      .map(v => {
        const vendasV = vendas.filter(vd =>
          (vd.vendedor_id ? vd.vendedor_id === v.id : vd.assessor_comercial === v.nome) &&
          vd.data && vd.data >= dataInicio && vd.data <= dataFim
        );

        const volume = vendasV.reduce((s, vd) => s + (parseFloat(vd.valor) || 0), 0);
        const volumeTotal = vendasV.reduce((s, vd) => s + (parseFloat(vd.valor_total_contrato) || parseFloat(vd.valor) || 0), 0);
        const comissaoEstimada = volume * ((v.percentual_comissao || 0) / 100);

        // Agrupar por produto
        const porProduto = {};
        vendasV.forEach(vd => {
          const prod = vd.produto || 'Sem produto';
          if (!porProduto[prod]) porProduto[prod] = { qtd: 0, valor: 0 };
          porProduto[prod].qtd++;
          porProduto[prod].valor += parseFloat(vd.valor) || 0;
        });

        // Meta do período (usa mês de início)
        const mesPeriodo = dataInicio.substring(0, 7);
        const meta = metas.find(m => m.mes === mesPeriodo && m.tipo === 'individual' && m.vendedor_id === v.id);
        const valorMeta = meta?.valor_meta || 0;
        const pctMeta = valorMeta > 0 ? (volume / valorMeta) * 100 : null;

        return {
          ...v,
          qtdVendas: vendasV.length,
          volume,
          volumeTotal,
          comissaoEstimada,
          porProduto,
          valorMeta,
          pctMeta,
        };
      })
      .sort((a, b) => b.volume - a.volume);
  }, [vendedores, vendas, metas, selectedIds, dataInicio, dataFim]);

  const totais = useMemo(() => ({
    qtdVendas: rows.reduce((s, r) => s + r.qtdVendas, 0),
    volume: rows.reduce((s, r) => s + r.volume, 0),
    volumeTotal: rows.reduce((s, r) => s + r.volumeTotal, 0),
    comissaoEstimada: rows.reduce((s, r) => s + r.comissaoEstimada, 0),
  }), [rows]);

  // Todos os produtos que aparecem
  const todosProdutos = useMemo(() => {
    const set = new Set();
    rows.forEach(r => Object.keys(r.porProduto).forEach(p => set.add(p)));
    return [...set].sort();
  }, [rows]);

  const [exportandoPDF, setExportandoPDF] = useState(false);

  const exportarPDF = () => {
    setExportandoPDF(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const margin = 14;
        const fmtPDF = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
        const fmtDate = (d) => d ? d.split('-').reverse().join('/') : '';

        // Header azul
        doc.setFillColor(15, 30, 53);
        doc.rect(0, 0, W, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('VILLELA EXCHANGE', margin, 10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 200, 230);
        doc.text('Relatório Consolidado de Vendas', margin, 16);
        doc.text(`Período: ${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`, W - margin, 10, { align: 'right' });
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, W - margin, 16, { align: 'right' });

        // KPIs
        let y = 30;
        const kpis = [
          { label: 'Vendedores', value: String(rows.length) },
          { label: 'Total Vendas', value: String(totais.qtdVendas) },
          { label: 'Vol. Entrada', value: fmtPDF(totais.volume) },
          { label: 'Vol. Total', value: fmtPDF(totais.volumeTotal) },
          { label: 'Comissão Est.', value: fmtPDF(totais.comissaoEstimada) },
        ];
        const kpiW = (W - margin * 2) / kpis.length;
        kpis.forEach((k, i) => {
          const x = margin + i * kpiW;
          doc.setFillColor(245, 247, 250);
          doc.roundedRect(x, y, kpiW - 3, 16, 2, 2, 'F');
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(k.label, x + 4, y + 6);
          doc.setTextColor(15, 30, 53);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(k.value, x + 4, y + 13);
        });

        y += 24;

        // Colunas base
        const baseHeaders = ['Vendedor', 'Vendas', 'Vol. Entrada', 'Vol. Total', 'Comissão Est.', '% Meta'];
        const prodHeaders = todosProdutos.map(p => p.length > 12 ? p.substring(0, 12) + '.' : p);
        const allHeaders = [...baseHeaders, ...prodHeaders];

        // Calcular larguras das colunas
        const totalCols = allHeaders.length;
        const vendedorW = 38;
        const vendasW = 14;
        const moneyW = 28;
        const metaW = 16;
        const prodW = Math.min(22, (W - margin * 2 - vendedorW - vendasW - moneyW * 3 - metaW) / Math.max(todosProdutos.length, 1));
        const colWidths = [vendedorW, vendasW, moneyW, moneyW, moneyW, metaW, ...todosProdutos.map(() => prodW)];

        // Header da tabela
        doc.setFillColor(26, 49, 80);
        const tableW = colWidths.reduce((s, w) => s + w, 0);
        doc.rect(margin, y, tableW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');

        let x = margin;
        allHeaders.forEach((h, i) => {
          const align = i === 0 ? 'left' : 'right';
          const tx = align === 'right' ? x + colWidths[i] - 2 : x + 2;
          doc.text(h, tx, y + 5.5, { align });
          x += colWidths[i];
        });

        y += 8;

        // Linhas de dados
        rows.forEach((r, idx) => {
          if (y > H - 20) {
            doc.addPage();
            y = 14;
          }
          const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
          doc.setFillColor(...bg);
          doc.rect(margin, y, tableW, 8, 'F');

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', idx === 0 && r.volume > 0 ? 'bold' : 'normal');

          const rowData = [
            r.nome?.length > 22 ? r.nome.substring(0, 22) + '…' : (r.nome || ''),
            String(r.qtdVendas),
            fmtPDF(r.volume),
            fmtPDF(r.volumeTotal),
            fmtPDF(r.comissaoEstimada),
            r.pctMeta != null ? `${r.pctMeta.toFixed(0)}%` : '—',
            ...todosProdutos.map(p => r.porProduto[p] ? `${r.porProduto[p].qtd}x` : '—'),
          ];

          x = margin;
          rowData.forEach((val, i) => {
            const align = i === 0 ? 'left' : 'right';
            const tx = align === 'right' ? x + colWidths[i] - 2 : x + 2;
            // Colorir comissão em verde
            if (i === 4) doc.setTextColor(5, 150, 105);
            else if (i === 0 && idx === 0 && r.volume > 0) doc.setTextColor(15, 30, 53);
            else doc.setTextColor(30, 41, 59);
            doc.text(val, tx, y + 5.5, { align });
            x += colWidths[i];
          });

          // Borda inferior leve
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 8, margin + tableW, y + 8);
          y += 8;
        });

        // Linha de total
        if (y > H - 14) { doc.addPage(); y = 14; }
        doc.setFillColor(15, 30, 53);
        doc.rect(margin, y, tableW, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');

        const totalData = [
          `TOTAL (${rows.length} vendedores)`,
          String(totais.qtdVendas),
          fmtPDF(totais.volume),
          fmtPDF(totais.volumeTotal),
          fmtPDF(totais.comissaoEstimada),
          '—',
          ...todosProdutos.map(p => {
            const qtd = rows.reduce((s, r) => s + (r.porProduto[p]?.qtd || 0), 0);
            return `${qtd}x`;
          }),
        ];

        x = margin;
        totalData.forEach((val, i) => {
          const align = i === 0 ? 'left' : 'right';
          const tx = align === 'right' ? x + colWidths[i] - 2 : x + 2;
          if (i === 4) doc.setTextColor(110, 231, 183);
          else doc.setTextColor(255, 255, 255);
          doc.text(val, tx, y + 6, { align });
          x += colWidths[i];
        });

        // Página de Gráfico — Desempenho por Vendedor
        if (rows.length > 0) {
          doc.addPage();
          let chartY = 0;
          const nameCol = 50;
          const pctCol = 16;
          const barColX = margin + nameCol + pctCol + 2;
          const barMaxW = W - margin * 2 - nameCol - pctCol - 36;
          const volColX = barColX + barMaxW + 3;
          const rowH = 13;
          const maxVol = Math.max(...rows.map(r => r.volume), 1);

          doc.setFillColor(15, 30, 53);
          doc.rect(0, 0, W, 20, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('DESEMPENHO POR VENDEDOR', margin, 13);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(180, 200, 230);
          doc.text(`Periodo: ${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`, W - margin, 13, { align: 'right' });

          chartY = 26;

          // Header da tabela
          doc.setFillColor(240, 244, 250);
          doc.rect(margin, chartY, W - margin * 2, 7, 'F');
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.text('VENDEDOR', margin + 2, chartY + 5);
          doc.text('% META', margin + nameCol + pctCol - 2, chartY + 5, { align: 'right' });
          doc.text('VOLUME (ENTRADA)', barColX, chartY + 5);
          doc.text('VALOR', W - margin - 2, chartY + 5, { align: 'right' });
          chartY += 7;

          rows.forEach((r, i) => {
            if (chartY + rowH > H - 14) { doc.addPage(); chartY = 14; }

            const bg = i % 2 === 0 ? [255, 255, 255] : [250, 251, 253];
            doc.setFillColor(...bg);
            doc.rect(margin, chartY, W - margin * 2, rowH, 'F');

            // Nome
            const nameTrunc = (r.nome || '').length > 20 ? r.nome.substring(0, 20) + '…' : (r.nome || '');
            doc.setTextColor(15, 30, 53);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
            doc.text(nameTrunc, margin + 2, chartY + rowH / 2 + 2.5);

            // % Meta
            if (r.pctMeta != null) {
              const mc = r.pctMeta >= 100 ? [161, 116, 0] : r.pctMeta >= 70 ? [37, 99, 235] : [220, 38, 38];
              doc.setTextColor(...mc);
              doc.setFont('helvetica', 'bold');
              doc.text(`${r.pctMeta > 100 ? '🏆' : ''}${r.pctMeta.toFixed(0)}%`, margin + nameCol + pctCol - 2, chartY + rowH / 2 + 2.5, { align: 'right' });
            } else {
              doc.setTextColor(190, 190, 190);
              doc.setFont('helvetica', 'normal');
              doc.text('—', margin + nameCol + pctCol - 2, chartY + rowH / 2 + 2.5, { align: 'right' });
            }

            // Barra de volume
            const barW = (r.volume / maxVol) * barMaxW;
            const barYpos = chartY + rowH / 2 - 3;
            doc.setFillColor(224, 231, 243);
            doc.roundedRect(barColX, barYpos, barMaxW, 6, 2, 2, 'F');
            if (r.pctMeta >= 100) doc.setFillColor(251, 191, 36);
            else if (r.pctMeta != null && r.pctMeta >= 70) doc.setFillColor(59, 130, 246);
            else doc.setFillColor(26, 49, 80);
            if (barW > 0.5) doc.roundedRect(barColX, barYpos, barW, 6, 2, 2, 'F');

            // Volume label
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(fmtPDF(r.volume), W - margin - 2, chartY + rowH / 2 + 2.5, { align: 'right' });

            chartY += rowH;
          });

          // Linha de total
          if (chartY + 10 <= H - 14) {
            doc.setFillColor(15, 30, 53);
            doc.rect(margin, chartY + 2, W - margin * 2, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text(`TOTAL (${rows.length} vendedores)`, margin + 2, chartY + 8.5);
            doc.text(fmtPDF(totais.volume), W - margin - 2, chartY + 8.5, { align: 'right' });
          }
        }

        // Rodapé
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.setFont('helvetica', 'normal');
          doc.text(`Villela Exchange — Relatório Consolidado de Vendas`, margin, H - 6);
          doc.text(`Página ${p} de ${totalPages}`, W - margin, H - 6, { align: 'right' });
        }

        doc.save(`relatorio-consolidado-${dataInicio}-${dataFim}.pdf`);
      } catch (e) {
        console.error(e);
      }
      setExportandoPDF(false);
    }, 50);
  };

  const exportarCSV = () => {
    const prodHeaders = todosProdutos.flatMap(p => [`Qtd ${p}`, `Valor ${p}`]);
    const headers = ['Vendedor', 'Qtd Vendas', 'Volume Entrada', 'Volume Total', 'Comissão Est.', '% Meta', ...prodHeaders];
    const rowsCSV = rows.map(r => [
      r.nome,
      r.qtdVendas,
      r.volume.toFixed(2).replace('.', ','),
      r.volumeTotal.toFixed(2).replace('.', ','),
      r.comissaoEstimada.toFixed(2).replace('.', ','),
      r.pctMeta != null ? `${r.pctMeta.toFixed(1)}%` : '—',
      ...todosProdutos.flatMap(p => [
        r.porProduto[p]?.qtd || 0,
        (r.porProduto[p]?.valor || 0).toFixed(2).replace('.', ','),
      ]),
    ]);
    const totalRow = [
      'TOTAL',
      totais.qtdVendas,
      totais.volume.toFixed(2).replace('.', ','),
      totais.volumeTotal.toFixed(2).replace('.', ','),
      totais.comissaoEstimada.toFixed(2).replace('.', ','),
      '—',
      ...todosProdutos.flatMap(p => {
        const qtd = rows.reduce((s, r) => s + (r.porProduto[p]?.qtd || 0), 0);
        const val = rows.reduce((s, r) => s + (r.porProduto[p]?.valor || 0), 0);
        return [qtd, val.toFixed(2).replace('.', ',')];
      }),
    ];
    const csv = [headers, ...rowsCSV, totalRow].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-consolidado-${dataInicio}-${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 100%)' }}>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-white text-base">Relatório Consolidado de Vendas</h3>
              <p className="text-blue-200/60 text-xs mt-0.5">Por vendedor no período selecionado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-end gap-4 flex-shrink-0 bg-gray-50/50">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Período</label>
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
              <span className="text-xs text-gray-400 font-medium">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Vendedores</label>
            <MultiSelect options={options} selected={selectedIds} onChange={setSelectedIds} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={exportarPDF} disabled={rows.length === 0 || exportandoPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0f1e35] text-white text-sm font-medium rounded-xl hover:bg-[#1a3150] transition disabled:opacity-40">
              {exportandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {exportandoPDF ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
            <button onClick={exportarCSV} disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-100 transition disabled:opacity-40">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Sumário KPIs */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-6 flex-shrink-0 bg-white">
          {[
            { label: 'Vendedores', value: rows.length, suffix: '' },
            { label: 'Total de Vendas', value: totais.qtdVendas, suffix: '' },
            { label: 'Volume de Entrada', value: fmt(totais.volume), suffix: '' },
            { label: 'Volume Total (Contratos)', value: fmt(totais.volumeTotal), suffix: '' },
            { label: 'Comissão Estimada', value: fmt(totais.comissaoEstimada), suffix: '' },
          ].map(k => (
            <div key={k.label} className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{k.label}</p>
              <p className="text-base font-bold text-gray-900 truncate">{k.value}{k.suffix}</p>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <TrendingUp className="w-10 h-10 mb-3 text-gray-200" />
              <p className="text-sm font-medium">Nenhuma venda no período selecionado</p>
              <p className="text-xs mt-1">Ajuste o período ou selecione outros vendedores</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Vendedor</th>
                  <th className="px-4 py-3 text-center font-semibold">Vendas</th>
                  <th className="px-4 py-3 text-right font-semibold">Vol. Entrada</th>
                  <th className="px-4 py-3 text-right font-semibold">Vol. Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Comissão Est.</th>
                  <th className="px-4 py-3 text-center font-semibold">Meta</th>
                  {todosProdutos.map(p => (
                    <th key={p} className="px-4 py-3 text-center font-semibold whitespace-nowrap">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {r.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm leading-tight">{r.nome}</p>
                          {r.time && <p className="text-[10px] text-gray-400">{r.time}</p>}
                        </div>
                        {i === 0 && r.volume > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full ml-1">🏆 1º</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-gray-900">{r.qtdVendas}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{fmt(r.volume)}</td>
                    <td className="px-4 py-3.5 text-right text-gray-600">{fmt(r.volumeTotal)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">{fmt(r.comissaoEstimada)}</td>
                    <td className="px-4 py-3.5 text-center">
                      {r.pctMeta != null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${r.pctMeta >= 100 ? 'text-emerald-600' : r.pctMeta >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                            {r.pctMeta > 100 ? `🏆 ${r.pctMeta.toFixed(0)}%` : `${r.pctMeta.toFixed(0)}%`}
                          </span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.pctMeta >= 100 ? 'bg-emerald-500' : r.pctMeta >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(r.pctMeta, 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    {todosProdutos.map(p => (
                      <td key={p} className="px-4 py-3.5 text-center">
                        {r.porProduto[p] ? (
                          <div>
                            <p className="text-xs font-bold text-gray-800">{r.porProduto[p].qtd}x</p>
                            <p className="text-[10px] text-gray-500">{fmt(r.porProduto[p].valor)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-200 text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Linha de totais */}
                <tr className="bg-[#0f1e35] text-white">
                  <td className="px-5 py-3.5 font-bold text-sm">TOTAL ({rows.length} vendedores)</td>
                  <td className="px-4 py-3.5 text-center font-bold">{totais.qtdVendas}</td>
                  <td className="px-4 py-3.5 text-right font-bold">{fmt(totais.volume)}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-white/80">{fmt(totais.volumeTotal)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-300">{fmt(totais.comissaoEstimada)}</td>
                  <td className="px-4 py-3.5" />
                  {todosProdutos.map(p => {
                    const qtd = rows.reduce((s, r) => s + (r.porProduto[p]?.qtd || 0), 0);
                    const val = rows.reduce((s, r) => s + (r.porProduto[p]?.valor || 0), 0);
                    return (
                      <td key={p} className="px-4 py-3.5 text-center">
                        <p className="text-xs font-bold">{qtd}x</p>
                        <p className="text-[10px] text-white/70">{fmt(val)}</p>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}