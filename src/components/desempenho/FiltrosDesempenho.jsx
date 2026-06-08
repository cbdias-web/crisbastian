import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, ChevronDown, Calendar, Check } from 'lucide-react';
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
  { label: 'Frio', value: 'Frio', dot: 'bg-blue-400' },
  { label: 'Morno', value: 'Morno', dot: 'bg-amber-400' },
  { label: 'Quente', value: 'Quente', dot: 'bg-orange-500' },
  { label: 'Fechado', value: 'Fechado', dot: 'bg-emerald-500' },
  { label: 'Perdido', value: 'Perdido', dot: 'bg-red-400' },
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

// Dropdown genérico reutilizável
function Dropdown({ label, count, children, minWidth = 220 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = count > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
          active
            ? 'bg-[#0f1e35] text-white border-[#0f1e35] shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
        }`}
      >
        <span>{label}</span>
        {active && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-bold">
            {count}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-gray-400'}`} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 overflow-hidden"
          style={{ minWidth }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Item simples (radio-like)
function DropdownItem({ label, selected, onClick, dot }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
    >
      {dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />}
      <span className="flex-1">{label}</span>
      {selected && <Check className="w-3.5 h-3.5 text-[#0f1e35]" />}
    </button>
  );
}

// Item com checkbox (multi-select)
function DropdownCheckItem({ label, selected, onClick, avatar }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
    >
      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${selected ? 'bg-[#0f1e35] border-[#0f1e35]' : 'border-gray-300'}`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
      {avatar && (
        avatar.url
          ? <img src={avatar.url} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
          : <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">{avatar.inicial}</span>
      )}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

export default function FiltrosDesempenho({ vendedores, produtos, filtros, onChange, isAdmin }) {
  const handleChange = (key, value) => onChange({ ...filtros, [key]: value });

  const toggleVendedor = (id) => {
    const atual = filtros.vendedores_sel || [];
    handleChange('vendedores_sel', atual.includes(id) ? atual.filter(v => v !== id) : [...atual, id]);
  };

  const toggleProduto = (p) => {
    const atual = filtros.produtos_sel || [];
    handleChange('produtos_sel', atual.includes(p) ? atual.filter(x => x !== p) : [...atual, p]);
  };

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

  const times = [...new Set(vendedores.map(v => v.time).filter(Boolean))].sort();
  const vendedoresFiltrados = filtros.time ? vendedores.filter(v => v.time === filtros.time) : vendedores;
  const produtosDedup = [...new Map(produtos.map(p => [p.toLowerCase().trim(), p])).values()].sort();

  const periodoLabel = PERIODOS_PRESET.find(p => p.value === filtros.periodo)?.label || 'Período';

  const totalAtivos = [
    filtros.vendedores_sel?.length > 0,
    filtros.produtos_sel?.length > 0,
    filtros.periodo !== '6_meses',
    !!filtros.temperatura,
    !!filtros.status_contrato,
    !!filtros.time,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Ícone */}
        <div className="flex items-center gap-2 mr-1">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Período */}
        <Dropdown label={periodoLabel} count={filtros.periodo !== '6_meses' ? 1 : 0} minWidth={200}>
          {PERIODOS_PRESET.map(p => (
            <DropdownItem
              key={p.value}
              label={p.label}
              selected={filtros.periodo === p.value}
              onClick={() => handleChange('periodo', p.value)}
            />
          ))}
          {filtros.periodo === 'custom' && (
            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-gray-50 mt-1">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">De</label>
                <input type="date" value={filtros.dataInicio}
                  onChange={e => handleChange('dataInicio', e.target.value)}
                  className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0f1e35]" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Até</label>
                <input type="date" value={filtros.dataFim}
                  onChange={e => handleChange('dataFim', e.target.value)}
                  className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0f1e35]" />
              </div>
            </div>
          )}
        </Dropdown>

        {/* Pipeline */}
        <Dropdown label={filtros.temperatura || 'Pipeline'} count={filtros.temperatura ? 1 : 0} minWidth={180}>
          <DropdownItem label="Todas" selected={!filtros.temperatura} onClick={() => handleChange('temperatura', '')} />
          <div className="border-t border-gray-50 my-1" />
          {TEMPERATURAS.map(t => (
            <DropdownItem
              key={t.value}
              label={t.label}
              dot={t.dot}
              selected={filtros.temperatura === t.value}
              onClick={() => handleChange('temperatura', filtros.temperatura === t.value ? '' : t.value)}
            />
          ))}
        </Dropdown>

        {/* Status Contrato */}
        <Dropdown
          label={filtros.status_contrato ? STATUS_CONTRATOS.find(s => s.value === filtros.status_contrato)?.label : 'Contrato'}
          count={filtros.status_contrato ? 1 : 0}
          minWidth={210}
        >
          <DropdownItem label="Todos os status" selected={!filtros.status_contrato} onClick={() => handleChange('status_contrato', '')} />
          <div className="border-t border-gray-50 my-1" />
          {STATUS_CONTRATOS.map(s => (
            <DropdownItem
              key={s.value}
              label={s.label}
              selected={filtros.status_contrato === s.value}
              onClick={() => handleChange('status_contrato', filtros.status_contrato === s.value ? '' : s.value)}
            />
          ))}
        </Dropdown>

        {/* Admin filters */}
        {isAdmin && (
          <>
            {/* Time */}
            {times.length > 0 && (
              <Dropdown label={filtros.time || 'Time'} count={filtros.time ? 1 : 0} minWidth={180}>
                <DropdownItem label="Todos os times" selected={!filtros.time} onClick={() => handleChange('time', '')} />
                <div className="border-t border-gray-50 my-1" />
                {times.map(t => (
                  <DropdownItem key={t} label={t} selected={filtros.time === t} onClick={() => handleChange('time', filtros.time === t ? '' : t)} />
                ))}
              </Dropdown>
            )}

            {/* Gerentes */}
            <Dropdown
              label="Gerentes"
              count={filtros.vendedores_sel?.length || 0}
              minWidth={230}
            >
              {filtros.vendedores_sel?.length > 0 && (
                <>
                  <button onClick={() => handleChange('vendedores_sel', [])} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition font-medium">
                    Limpar seleção
                  </button>
                  <div className="border-t border-gray-50" />
                </>
              )}
              <div className="max-h-56 overflow-y-auto">
                {vendedoresFiltrados.map(v => (
                  <DropdownCheckItem
                    key={v.id}
                    label={v.nome}
                    selected={filtros.vendedores_sel?.includes(v.id)}
                    onClick={() => toggleVendedor(v.id)}
                    avatar={{ url: v.avatar_url, inicial: v.nome?.charAt(0) }}
                  />
                ))}
                {vendedoresFiltrados.length === 0 && (
                  <p className="px-4 py-3 text-xs text-gray-400 italic">Nenhum gerente neste time</p>
                )}
              </div>
            </Dropdown>

            {/* Produtos */}
            <Dropdown
              label="Produtos"
              count={filtros.produtos_sel?.length || 0}
              minWidth={220}
            >
              {filtros.produtos_sel?.length > 0 && (
                <>
                  <button onClick={() => handleChange('produtos_sel', [])} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition font-medium">
                    Limpar seleção
                  </button>
                  <div className="border-t border-gray-50" />
                </>
              )}
              <div className="max-h-56 overflow-y-auto">
                {produtosDedup.map(p => (
                  <DropdownCheckItem
                    key={p}
                    label={p}
                    selected={filtros.produtos_sel?.includes(p)}
                    onClick={() => toggleProduto(p)}
                  />
                ))}
              </div>
            </Dropdown>
          </>
        )}

        {/* Limpar tudo */}
        {totalAtivos > 0 && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={resetar}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar tudo
            </button>
          </>
        )}
      </div>
    </div>
  );
}