// Campos financeiros dos contratos RATING, DIAGNÓSTICO e SCORE
// (espelham exatamente os campos do PDF modelo de cada contrato)
const ESCOPOS_RATING = ['Organização Financeira', 'Rating', 'Rating + Organização Financeira'];
const PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36];

const LABEL = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5';
const INPUT = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a3150]/20 focus:border-[#1a3150] transition-all bg-white hover:border-gray-300 placeholder:text-gray-300';

function Num({ label, k, form, set, placeholder, required, step }) {
  return (
    <div className="group">
      <label className={LABEL}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input type="number" step={step} value={form[k] ?? ''} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} className={INPUT} />
    </div>
  );
}

export default function ContratoFinanceiroModelos({ tipo, form, set, selectField, campo, formas }) {
  const isRating = tipo === 'RATING';
  const isScore = tipo === 'SCORE';
  const isDiag = tipo === 'DIAGNÓSTICO';
  const comParcelas = isRating || isScore || isDiag;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <Num label={isDiag ? 'Valor do Diagnóstico (R$)' : 'Valor da Adesão (R$)'} k="valor_total"
        form={form} set={set} placeholder="Ex: 5500,00" required step="0.01" />

      {comParcelas && (
        <>
          <div className="group">
            <label className={LABEL}>{isDiag ? 'Nº de Parcelas' : isScore ? 'Nº de Parcelas de Adesão' : 'Nº de Parcelas da Adesão'}</label>
            <select value={form.num_parcelas} onChange={e => set('num_parcelas', e.target.value)}
              className={`${INPUT} cursor-pointer`}>
              {PARCELAS.map(n => <option key={n} value={n}>{n}x</option>)}
            </select>
          </div>
          <div className="group">
            <label className={LABEL}>Valor da Parcela (R$) <span className="text-[9px] normal-case font-normal text-blue-400">(auto)</span></label>
            <input type="number" value={form.valor_parcela || ''} readOnly
              className="w-full px-3.5 py-2.5 text-sm border border-blue-200 bg-blue-50/50 rounded-xl" />
          </div>
          <Num label={isScore ? 'Vencimento das Parcelas de Adesão (dia)' : 'Dia de Vencimento das Parcelas'}
            k="dia_vencimento" form={form} set={set} placeholder="Ex: 10" />
        </>
      )}

      {isRating && (
        <>
          <Num label="Valor Somente Diagnóstico (R$)" k="valor_diagnostico" form={form} set={set} placeholder="Ex: 1500,00" step="0.01" />
          <Num label="Dia de Vencimento do Diagnóstico" k="dia_vencimento_diagnostico" form={form} set={set} placeholder="Ex: 10" />
          {selectField('Serviço Contratado', 'escopo_rating', ESCOPOS_RATING)}
        </>
      )}

      {isScore && (
        <>
          <Num label="Valor da Mensalidade (R$)" k="mensalidade" form={form} set={set} placeholder="Ex: 500,00" step="0.01" />
          <Num label="Vencimento da Mensalidade (dia)" k="dia_vencimento_mensalidade" form={form} set={set} placeholder="Ex: 10" />
        </>
      )}

      {selectField('Forma de Pagamento', 'forma_pagamento', formas)}
      {campo('Data do 1º Pagamento', 'data_primeiro_pagamento', 'date')}
    </div>
  );
}