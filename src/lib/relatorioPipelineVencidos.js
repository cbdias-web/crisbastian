// Relatório de operações em pipeline com fechamento vencido ou status desatualizado.
// Formato enxuto: nome, valor, data de fechamento e status (sem histórico de interação).
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { todayBrasilia } from '@/lib/dateUtils';

export const DIAS_DESATUALIZADO = 15;

const fmtVal = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => (d ? format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy') : '—');

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
  const nome = (n.vendedor_nome || '').trim().toLowerCase();
  return inativos.some(v =>
    (v.id && n.vendedor_id && v.id === n.vendedor_id) ||
    (nome && (v.nome || '').trim().toLowerCase() === nome)
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

  const linhas = itens.map(n => {
    const dias = diasEmAtraso(n.data_prevista);
    const atraso = dias === null ? '—' : dias > 0 ? `${dias} dia${dias > 1 ? 's' : ''}` : '0 dia';
    return `
      <tr>
        <td>${n.cliente_nome || '—'}</td>
        <td>${n.produto || '—'}</td>
        <td>${n.vendedor_nome || '—'}</td>
        <td class="num">${fmtVal(n.valor_estimado)}</td>
        <td>${fmtDate(n.data_prevista)}</td>
        <td class="num atraso">${atraso}</td>
        <td>${n.temperatura || '—'}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Operações Vencidas — Pipeline</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#333}.header{background:linear-gradient(135deg,#7c2d12,#b45309);color:#fff;padding:20px 24px;border-radius:8px;margin-bottom:18px}.header h1{margin:0;font-size:19px}.header p{margin:4px 0 0;font-size:11px;opacity:.85}.kpis{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;flex:1;min-width:130px}.kpi .val{font-size:18px;font-weight:bold;color:#7c2d12}.kpi .lbl{font-size:10px;color:#64748b;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:11px}thead tr{background:#7c2d12;color:#fff}th{padding:8px 10px;text-align:left;font-weight:600}th.num,td.num{text-align:right}td{padding:7px 10px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#fdfaf7}.footer{margin-top:18px;font-size:10px;color:#94a3b8;line-height:1.5}.vazio{padding:24px;text-align:center;font-size:12px;color:#94a3b8}td.atraso{color:#b91c1c;font-weight:bold}@media print{body{padding:10px}}</style>
</head><body>
<div class="header"><h1>Relatório de Operações Vencidas — Pipeline</h1><p>Villela Exchange — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
<div class="kpis">
  <div class="kpi"><div class="val">${itens.length}</div><div class="lbl">Operações em atenção</div></div>
  <div class="kpi"><div class="val">${fmtVal(totalValor)}</div><div class="lbl">Valor em negociação</div></div>
</div>
${itens.length === 0
    ? '<div class="vazio">Nenhuma operação em pipeline com fechamento vencido ou status desatualizado.</div>'
    : `<table><thead><tr><th>Nome</th><th>Produto</th><th>Gerente</th><th class="num">Valor</th><th>Fechamento previsto</th><th class="num">Vencido há</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table>`}
<div class="footer">Critério: operações em pipeline (não fechadas nem perdidas) com data de fechamento vencida, sem data de fechamento definida, ou status sem atualização há mais de ${DIAS_DESATUALIZADO} dias.<br>Villela Exchange — Pipeline Comercial</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
  return { total: itens.length, valorTotal: totalValor };
}