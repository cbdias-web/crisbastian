import { useState } from 'react';
import { SlidersHorizontal, RotateCcw, ChevronDown, Calendar, Thermometer, FileCheck, Users, Package, Building2 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const PERIODOS_PRESET = [
  { label: 'Este mês', value: 'mes_atual' },
  { label: 'Mês anterior', value: 'mes_anterior' },
  { label: 'Últimos 3 meses', value: '3_meses' },
  { label: 'Últimos 6 meses', value: '6_meses' },
  { label: 'Este ano', value: 'ano_atual' },
  { label: 'Personalizado', value: 'custom' },
];

const TEMPERATURAS = [
  { label: 'Frio', value: 'Frio', color: '#93c5fd', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-500' },
  { label: 'Morno', value: 'Morno', color: '#fbbf24', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-500' },
  { label: 'Quente', value: 'Quente', color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', activeBg: 'bg-orange-500' },
  { label: 'Fechado', value: 'Fechado', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-500' },
  { label: 'Perdido', value: 'Perdido', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', activeBg: 'bg-red-500' },
];

const STATUS_CONTRATOS = [
  { label: 'Rascunho', value: 'rascunho' },
  { label: 'Gerado', value: 'gerado' },
  { label: 'Assinado', value: 'assinado' },
  { label: 'Aguard. Pagamento', value: 'aguardando_pagamento' },
  { label: 'Pago', value: 'pago' },
  { label: 'No Pipeline', value: 'no_pipeline' },
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

function FilterSection({ icon: Icon, label, children }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</span>
      </div>
      {children}
    </div>
  );
}

function PillButton({ active, onClick, children, activeClass = 'bg-[#0f1e35] text-white border-[#0f1e35]' }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium whitespace-nowrap ${
        active
          ? activeClass
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function FiltrosDesempenho({ vendedores, produtos, filtros, onChange, isAdmin }) {
  const [expanded, setExpanded] = useState(true);

  const handleChange = (key, value) => onChange({ ...filtros, [key]: value });

  const totalAtivos = [
    filtros.vendedores_sel?.length > 0,
    filtros.produtos_sel?.length > 0,
    filtros.periodo !== '6_meses',
    !!filtros.temperatura,
    !!filtros.status_contrato,
    !!filtros.time,
  ].filter(Boolean).length;

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

  const vendedoresFiltrados = filtros.time
    ? vendedores.filter(v => v.time === filtros.time)
    : vendedores;

  // Deduplica produtos (case-insensitive)
  const produtosDedup = [...new Map(produtos.map(p => [p.toLowerCase().trim(), p])).values()].sort();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2.5 flex-1 text-left">
          <div className="w-7 h-7 rounded-lg bg-[#0f1e35]/5 flex items-center justify-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0f1e35]" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Filtros</span>
          {totalAtivos > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0f1e35] text-white text-[10px] font-bold">
              {totalAtivos}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {totalAtivos > 0 && (
            <button
              onClick={resetar}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar filtros
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)}>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-5 py-5 space-y-6">

          {/* Linha 1: Período + seletores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Período */}
            <FilterSection icon={Calendar} label="Período">
              <div className="relative">
                <select
                  value={filtros.periodo}
                  onChange={e => handleChange('periodo', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-[#0f1e35] appearance-none pr-8 text-gray-700 font-medium"
                >
                  {PERIODOS_PRESET.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              {filtros.periodo === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <input type="date" value={filtros.dataInicio}
                    onChange={e => handleChange('dataInicio', e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#0f1e35]" />
                  <span className="text-gray-300 self-center">→</span>
                  <input type="date" value={filtros.dataFim}
                    onChange={e => handleChange('dataFim', e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#0f1e35]" />
                </div>
              )}
            </FilterSection>

            {/* Temperatura Pipeline */}
            <FilterSection icon={Thermometer} label="Temperatura Pipeline">
              <div className="flex flex-wrap gap-1.5">
                {TEMPERATURAS.map(t => {
                  const active = filtros.temperatura === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => handleChange('temperatura', active ? '' : t.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                        active
                          ? `${t.activeBg} text-white border-transparent`
                          : `${t.bg} ${t.text} ${t.border} hover:opacity-80`
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Status Contrato */}
            <FilterSection icon={FileCheck} label="Status do Contrato">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_CONTRATOS.map(s => (
                  <PillButton
                    key={s.value}
                    active={filtros.status_contrato === s.value}
                    onClick={() => handleChange('status_contrato', filtros.status_contrato === s.value ? '' : s.value)}
                    activeClass="bg-[#0f1e35] text-white border-[#0f1e35]"
                  >
                    {s.label}
                  </PillButton>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Seções admin */}
          {isAdmin && (
            <>
              <div className="border-t border-gray-50" />

              {/* Times */}
              {times.length > 0 && (
                <FilterSection icon={Building2} label="Time">
                  <div className="flex flex-wrap gap-1.5">
                    {times.map(t => (
                      <PillButton
                        key={t}
                        active={filtros.time === t}
                        onClick={() => handleChange('time', filtros.time === t ? '' : t)}
                        activeClass="bg-indigo-600 text-white border-indigo-600"
                      >
                        {t}
                      </PillButton>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Gerentes */}
              <FilterSection icon={Users} label={`Gerentes${filtros.vendedores_sel?.length > 0 ? ` · ${filtros.vendedores_sel.length} selecionado${filtros.vendedores_sel.length > 1 ? 's' : ''}` : ''}`}>
                <div className="flex flex-wrap gap-2">
                  {vendedoresFiltrados.map(v => {
                    const selected = filtros.vendedores_sel?.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggleVendedor(v.id)}
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                          selected
                            ? 'bg-[#0f1e35] text-white border-[#0f1e35] shadow-sm'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-white'
                        }`}
                      >
                        {v.avatar_url ? (
                          <img src={v.avatar_url} className="w-4 h-4 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${selected ? 'bg-white/20 text-white' : 'bg-gray-300 text-white'}`}>
                            {v.nome?.charAt(0)}
                          </span>
                        )}
                        <span className="truncate max-w-[100px]">{v.nome?.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                  {vendedoresFiltrados.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Nenhum gerente neste time</span>
                  )}
                </div>
              </FilterSection>

              {/* Produtos */}
              <FilterSection icon={Package} label={`Produtos${filtros.produtos_sel?.length > 0 ? ` · ${filtros.produtos_sel.length} selecionado${filtros.produtos_sel.length > 1 ? 's' : ''}` : ''}`}>
                <div className="flex flex-wrap gap-1.5">
                  {produtosDedup.map(p => (
                    <PillButton
                      key={p}
                      active={filtros.produtos_sel?.includes(p)}
                      onClick={() => toggleProduto(p)}
                      activeClass="bg-emerald-600 text-white border-emerald-600"
                    >
                      {p}
                    </PillButton>
                  ))}
                  {produtosDedup.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Nenhum produto registrado</span>
                  )}
                </div>
              </FilterSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}