import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2, AlertTriangle, Info, CheckCircle2, Repeat, ShoppingBag } from 'lucide-react';
import { calcularEstruturaPagamento, ROTULO_ESTRUTURA } from '@/lib/estruturaPagamento';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d) => (d ? String(d).split('-').reverse().join('/') : '—');

// Hook: const { dialog, pedirOpcoes } = useEnvioVendasDialog();
// const opcoes = await pedirOpcoes(contrato);  // null = cancelou
// opcoes = { natureza: 'nova'|'recorrencia', estrutura: {...}, valorRecebido, parcela }
export function useEnvioVendasDialog() {
  const [ct, setCt] = useState(null);
  const resolver = useRef(null);
  const pedirOpcoes = useCallback((contrato) => new Promise((resolve) => { resolver.current = resolve; setCt(contrato); }), []);
  const fechar = (resultado) => { setCt(null); resolver.current?.(resultado); resolver.current = null; };
  const dialog = ct ? <EnviarVendasDialog contrato={ct} onConfirm={fechar} onCancel={() => fechar(null)} /> : null;
  return { dialog, pedirOpcoes };
}

function EnviarVendasDialog({ contrato, onConfirm, onCancel }) {
  const [natureza, setNatureza] = useState('nova');
  const [recebido, setRecebido] = useState('');
  const [editouRecebido, setEditouRecebido] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [vendasDoContrato, setVendasDoContrato] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [parcelaSel, setParcelaSel] = useState('');
  const [valorParcela, setValorParcela] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [vs, ps] = await Promise.all([
          base44.entities.Venda.filter({ contrato_id: contrato.id }),
          contrato.cpf_cnpj ? base44.entities.ParcelaVenda.filter({ cliente_cpf_cnpj: contrato.cpf_cnpj, status: 'pendente' }, 'data_vencimento', 100) : Promise.resolve([]),
        ]);
        setVendasDoContrato(vs);
        setParcelas(ps);
        // Se já existe venda nova deste contrato e há parcela pendente, sugere recorrência
        if (vs.some(v => v.tipo_venda === 'nova') && ps.length > 0) setNatureza('recorrencia');
      } catch (e) { /* segue sem sugestões */ }
      setCarregando(false);
    })();
  }, [contrato.id, contrato.cpf_cnpj]);

  const est = calcularEstruturaPagamento(contrato, editouRecebido && recebido !== '' ? { valorRecebido: recebido } : {});
  const parcela = parcelas.find(p => p.id === parcelaSel);
  const jaTemNova = vendasDoContrato.some(v => v.tipo_venda === 'nova');

  useEffect(() => { if (parcela) setValorParcela(String(parcela.valor_parcela ?? '')); }, [parcelaSel]); // eslint-disable-line

  const podeConfirmar = natureza === 'nova'
    ? !jaTemNova
    : !!parcela && Number(valorParcela) > 0;

  const confirmar = () => {
    if (natureza === 'nova') onConfirm({ natureza: 'nova', estrutura: est, valorRecebido: est.recebido, parcelas: est.parcelas, overrideRecebido: editouRecebido && recebido !== '' });
    else onConfirm({ natureza: 'recorrencia', parcela, valorRecebido: Number(valorParcela) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Enviar para Vendas</p>
            <h3 className="font-semibold text-gray-900 text-sm">{contrato.nome} · {contrato.tipo}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {[['nova', 'Venda nova', 'Primeira contratação', ShoppingBag], ['recorrencia', 'Pagamento de parcela', 'Recorrência de venda existente', Repeat]].map(([k, t, s, Ic]) => (
              <button key={k} onClick={() => setNatureza(k)} className={`text-left rounded-xl border p-3 transition ${natureza === k ? 'border-[#1a3150] bg-[#1a3150]/5 ring-1 ring-[#1a3150]/30' : 'border-gray-200 hover:border-gray-300'}`}>
                <Ic className={`w-4 h-4 mb-1 ${natureza === k ? 'text-[#1a3150]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-gray-800">{t}</p>
                <p className="text-[11px] text-gray-500">{s}</p>
              </button>
            ))}
          </div>

          {carregando && <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin inline text-gray-400" /></div>}

          {natureza === 'nova' && (
            <>
              {jaTemNova && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Já existe uma <b>venda nova</b> vinculada a este contrato. Para registrar o pagamento de uma parcela, escolha "Pagamento de parcela". Se for outra contratação, crie um novo contrato.</span>
                </div>
              )}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Estrutura identificada</span>
                  <span className="text-xs font-semibold text-[#1a3150]">{ROTULO_ESTRUTURA[est.tipo]}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-gray-50 p-2"><p className="text-[10px] text-gray-400 uppercase">Valor do contrato</p><p className="text-sm font-bold text-gray-800">{brl(est.total)}</p></div>
                  <div className="rounded-lg bg-emerald-50 p-2"><p className="text-[10px] text-emerald-600 uppercase">Recebido agora</p><p className="text-sm font-bold text-emerald-700">{brl(est.recebido)}</p></div>
                  <div className="rounded-lg bg-amber-50 p-2"><p className="text-[10px] text-amber-600 uppercase">Saldo a receber</p><p className="text-sm font-bold text-amber-700">{brl(est.saldo)}</p></div>
                </div>
                <p className="text-xs text-gray-600">
                  {est.parcelas > 0 ? <>Serão geradas <b>{est.parcelas} parcela(s) de {brl(est.valorParcela)}</b> na esteira de recebimentos. Cada parcela recebida entra como <b>recorrência</b>.</> : <>Nenhuma parcela será gerada: o valor já foi recebido na contratação.</>}
                </p>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Ajustar valor recebido agora (opcional)</label>
                  <input type="number" step="0.01" min="0" value={recebido} placeholder={String(est.recebido)}
                    onChange={e => { setRecebido(e.target.value); setEditouRecebido(e.target.value !== ''); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>
              {est.tipo === 'somente_parcelas' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Contrato sem entrada: a venda nova entra com <b>R$ 0,00</b> e as parcelas entram como recorrência quando recebidas. Se a 1ª parcela já foi paga, informe o valor em "Ajustar valor recebido".</span>
                </div>
              )}
            </>
          )}

          {natureza === 'recorrencia' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Escolha a parcela deste cliente que está sendo paga. O contrato assinado e os comprovantes serão anexados à venda de recorrência, sem criar nova implantação.</p>
              {parcelas.length === 0 && !carregando && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Não há parcelas pendentes para o CPF/CNPJ deste contrato. Confira o cadastro ou use "Venda nova".</div>
              )}
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {parcelas.map(p => (
                  <label key={p.id} className={`flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer ${parcelaSel === p.id ? 'border-[#1a3150] bg-[#1a3150]/5' : 'border-gray-200'}`}>
                    <input type="radio" checked={parcelaSel === p.id} onChange={() => setParcelaSel(p.id)} />
                    <span className="text-xs text-gray-700 flex-1"><b>Parcela {p.numero_parcela}/{p.total_parcelas}</b> · {p.produto} · vence {fmtData(p.data_vencimento)}</span>
                    <span className="text-xs font-semibold text-gray-800">{brl(p.valor_parcela)}</span>
                  </label>
                ))}
              </div>
              {parcela && (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Valor recebido (R$)</label>
                  <input type="number" step="0.01" min="0" value={valorParcela} onChange={e => setValorParcela(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150]" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={confirmar} disabled={!podeConfirmar} className="px-4 py-2 text-sm bg-[#0f1e35] hover:bg-[#1a3150] text-white rounded-xl font-medium disabled:opacity-40 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {natureza === 'nova' ? 'Criar venda nova' : 'Registrar recorrência'}
          </button>
        </div>
      </div>
    </div>
  );
}
