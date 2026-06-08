import { useState } from 'react';
import { Filter, X, ChevronDown, RotateCcw } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PERIODOS_PRESET = [
  { label: 'Este mês', value: 'mes_atual' },
  { label: 'Mês anterior', value: 'mes_anterior' },
  { label: 'Últimos 3 meses', value: '3_meses' },
  { label: 'Últimos 6 meses', value: '6_meses' },
  { label: 'Este ano', value: 'ano_atual' },
  { label: 'Personalizado', value: 'custom' },
];

export function buildDateRange(periodo, dataInicio, dataFim) {
  const hoje = new Date();
  switch (periodo) {
    case 'mes_atual':
      return { start: format(startOfMonth(hoje), 'yyyy-MM-dd'), end: format(endOfMonth(hoje), 'yyyy-MM-dd') };
    case 'mes_anterior': {
      const m = subMonths(hoje, 1);
      return { start: format(startOfMonth(m), 'yyyy-MM-dd'), end: format(endOfMonth(m), 'yyyy-MM-dd') };
    }
    case '3_meses':
      return { start: format(startOfMonth(subMonths(hoje, 2)), 'yyyy-MM-dd'), end: format(endOfMonth(hoje), 'yyyy-MM-dd') };
    case '6_meses':
      return { start: format(startOfMonth(subMonths(hoje, 5)), 'yyyy-MM-dd'), end: format(endOfMonth(hoje), 'yyyy-MM-dd') };
    case 'ano_atual':
      return { start: `${hoje.getFullYear()}-01-01`, end: `${hoje.getFullYear()}-12-31` };
    case 'custom':
      return { start: dataInicio || '', end: dataFim || '' };
    default:
      return { start: format(startOfMonth(subMonths(hoje, 5)), 'yyyy-MM-dd'), end: format(endOfMonth(hoje), 'yyyy-MM-dd') };
  }
}

export default function FiltrosDesempenho({ vendedores, produtos, filtros, onChange, isAdmin }) {
  const [expanded, setExpanded] = useState(true);

  const handleChange = (key, value) => onChange({ ...filtros, [key]: value });

  const hasAtivos = (filtros.vendedores_sel?.length > 0) ||
    (filtros.produtos_sel?.length > 0) ||
    filtros.periodo !== '6_meses' ||
    filtros.temperatura ||
    filtros.status_contrato;

  const resetar = () => onChange({
    periodo: '6_meses',
    dataInicio: '',
    dataFim: '',
    vendedores_sel: [],
    produtos_sel: [],
    temperatura: '',
    status_contrato: '',
    tipo_interacao: '',
    time: '',
  });

  const toggleVendedor = (id) => {
    const atual = filtros.vendedores_sel || [];
    handleChange('vendedores_sel', atual.includes(id) ? atual.filter(v => v !== id) : [...atual, id]);
  };

  const toggleProduto = (p) => {
    const atual = filtros.produtos_sel || [];
    handleChange('produtos_sel', atual.includes(p) ? atual.filter(x => x !== p) : [...atual, p]);
  };

  const times = [...new Set(vendedores.map(v => v.time).filter(Boolean))].sort();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header do painel */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#1a3150]" />
          <span className="text-sm font-semibold text-gray-800">Filtros</span>
          {hasAtivos && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a3150] text-white font-bold">Ativos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasAtivos && (
            <button
              onClick={(e) => { e.stopPropagation(); resetar(); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition"
            >
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 p-5 space-y-5">
          {/* Linha 1: Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Período</label>
              <select
                value={filtros.periodo}
                onChange={e => handleChange('periodo', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#1a3150]"
              >
                {PERIODOS_PRESET.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {filtros.periodo === 'custom' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Data início</label>
                  <input type="date" value={filtros.dataInicio}
                    onChange={e => handleChange('dataInicio', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Data fim</label>
                  <input type="date" value={filtros.dataFim}
                    onChange={e => handleChange('dataFim', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#1a3150]" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Temperatura Pipeline</label>
              <select
                value={filtros.temperatura}
                onChange={e => handleChange('temperatura', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#1a3150]"
              >
                <option value="">Todas</option>
                {['Frio', 'Morno', 'Quente', 'Fechado', 'Perdido'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Status Contrato</label>
              <select
                value={filtros.status_contrato}
                onChange={e => handleChange('status_contrato', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#1a3150]"
              >
                <option value="">Todos</option>
                {['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Admin-only filters */}
          {isAdmin && (
            <>
              {/* Filtro de Time */}
              {times.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Time</label>
                  <div className="flex flex-wrap gap-2">
                    {times.map(t => (
                      <button
                        key={t}
                        onClick={() => handleChange('time', filtros.time === t ? '' : t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                          filtros.time === t
                            ? 'bg-[#1a3150] text-white border-[#1a3150]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro de Gerentes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Gerentes
                  {filtros.vendedores_sel?.length > 0 && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#1a3150]/10 text-[#1a3150] rounded-full font-bold">
                      {filtros.vendedores_sel.length} selecionado{filtros.vendedores_sel.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {(filtros.time
                    ? vendedores.filter(v => v.time === filtros.time)
                    : vendedores
                  ).map(v => (
                    <button
                      key={v.id}
                      onClick={() => toggleVendedor(v.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium flex items-center gap-1.5 ${
                        filtros.vendedores_sel?.includes(v.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {v.avatar_url
                        ? <img src={v.avatar_url} className="w-4 h-4 rounded-full object-cover" alt="" />
                        : <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white">{v.nome?.charAt(0)}</span>
                      }
                      {v.nome}
                    </button>
                  ))}
                  {vendedores.length === 0 && (
                    <span className="text-xs text-gray-400">Nenhum gerente cadastrado</span>
                  )}
                </div>
              </div>

              {/* Filtro de Produtos */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Produtos
                  {filtros.produtos_sel?.length > 0 && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#1a3150]/10 text-[#1a3150] rounded-full font-bold">
                      {filtros.produtos_sel.length} selecionado{filtros.produtos_sel.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {produtos.map(p => (
                    <button
                      key={p}
                      onClick={() => toggleProduto(p)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                        filtros.produtos_sel?.includes(p)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {produtos.length === 0 && (
                    <span className="text-xs text-gray-400">Nenhum produto registrado</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}