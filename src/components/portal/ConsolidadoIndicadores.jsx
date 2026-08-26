import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, FileText, DollarSign, Trophy, RefreshCw, Loader2,
} from 'lucide-react';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  green: '#34d399',
};

const STATUS_CHART = {
  novo: { label: 'Novo', color: '#00D4AA' },
  em_atendimento: { label: 'Em Atendimento', color: '#fbbf24' },
  convertido_cliente: { label: '→ Cliente', color: '#34d399' },
  convertido_contrato: { label: '→ Contrato', color: '#a78bfa' },
  convertido_venda: { label: '→ Venda', color: '#22c55e' },
  descartado: { label: 'Descartado', color: '#6b7280' },
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

export default function ConsolidadoIndicadores() {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['consolidado-leads'],
    queryFn: () => base44.entities.LeadIndicacao.list('-created_date', 500),
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['consolidado-vendas-indicadores'],
    queryFn: () => base44.entities.Venda.list('-created_date', 500),
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ['consolidado-parceiros-ids'],
    queryFn: () => base44.entities.Parceiro.list('-created_date', 500),
  });

  // Vendas originadas de indicação e PAGAS: o espelhamento deve apontar para um
  // Parceiro/Indicador cadastrado (exclui espelhamentos internos entre vendedores)
  // e a venda precisa ter comprovante de pagamento (contrato assinado e pago).
  const parceiroIds = new Set(parceiros.map(p => p.id));
  const vendasIndicadas = vendas.filter(v =>
    Array.isArray(v.indicadores) &&
    v.indicadores.some(i => i && parceiroIds.has(i.id)) &&
    Array.isArray(v.comprovantes) && v.comprovantes.length > 0
  );
  const valorVenda = (v) => Number(v.valor_total_contrato) || Number(v.valor) || 0;

  const total = leads.length;
  const volumeIndicado = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const vendasConvertidasValor = vendasIndicadas.reduce((s, v) => s + valorVenda(v), 0);
  const vendasEfetivasCount = vendasIndicadas.length;
  const comissaoGerada = vendasIndicadas.reduce((s, v) => {
    const pct = (v.indicadores || [])
      .filter(i => i && parceiroIds.has(i.id))
      .reduce((a, i) => a + (Number(i.percentual) || 0), 0);
    return s + valorVenda(v) * (pct / 100);
  }, 0);

  const chartData = Object.entries(STATUS_CHART)
    .map(([key, cfg]) => ({ key, name: cfg.label, value: leads.filter(l => l.status === key).length, color: cfg.color }))
    .filter(d => d.value > 0);

  const isLoading = loadingLeads || loadingVendas;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: AURORA.text }}>
            <TrendingUp className="w-4 h-4" style={{ color: AURORA.accent }} /> Consolidação Geral
          </h2>
          <p className="text-xs" style={{ color: AURORA.textMuted }}>Soma de todas as indicações e conversões enviadas pelos indicadores</p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['consolidado-leads'] });
            queryClient.invalidateQueries({ queryKey: ['consolidado-vendas-indicadores'] });
          }}
          className="p-2 rounded-xl transition"
          style={{ background: AURORA.surface, color: AURORA.textMuted, border: `1px solid ${AURORA.border}` }}
          title="Atualizar consolidação">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi label="Volume indicado" value={fmtMoeda(volumeIndicado)} icon={TrendingUp} color={AURORA.accent} />
        <Kpi label="Total de indicações" value={total} icon={FileText} color={AURORA.text} />
        <Kpi label="Vendas convertidas" value={fmtMoeda(vendasConvertidasValor)} icon={DollarSign} color={AURORA.green} />
        <Kpi label="Vendas efetivas" value={vendasEfetivasCount} icon={Trophy} color={AURORA.green} />
        <Kpi label="Comissão gerada" value={fmtMoeda(comissaoGerada)} icon={DollarSign} color={AURORA.accent} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
        <p className="text-sm font-bold mb-3" style={{ color: AURORA.text }}>Distribuição por status</p>
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: AURORA.accent }} /></div>
        ) : total === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: AURORA.textMuted }}>Nenhuma indicação registrada</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="relative" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold" style={{ color: AURORA.text }}>{total}</p>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>indicações</p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 w-full">
              {chartData.map(d => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs flex-1" style={{ color: AURORA.textMuted }}>{d.name}</span>
                  <span className="text-xs font-bold" style={{ color: AURORA.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{label}</p>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}