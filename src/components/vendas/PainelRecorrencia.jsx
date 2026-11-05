import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Repeat, Link2, AlertTriangle } from 'lucide-react';
import CampoMoeda from '@/components/ui/campo-moeda';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d) => (d ? String(d).split('-').reverse().join('/') : '—');

// Substitui "Estrutura de Pagamento" quando a venda é RECORRÊNCIA (pagamento de parcela):
// mostra qual parcela está sendo paga, a venda original e permite ajustar só o valor recebido.
// Em lançamento NOVO, exige escolher a parcela pendente do cliente (evita lançamento solto e duplicado).
export default function PainelRecorrencia({ venda, formData, valorRecebido, setValorRecebido, setValorTotal, onVinculo }) {
  const editando = !!venda?.id;
  const [parcela, setParcela] = useState(null);
  const [origem, setOrigem] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [sel, setSel] = useState('');
  const [semParcela, setSemParcela] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const cpf = (formData.cpf_cnpj || '').trim();

  // Edição: descobre a parcela e a venda original (inclusive registros antigos, via venda_gerada_id)
  useEffect(() => {
    if (!editando) return;
    (async () => {
      try {
        let p = null;
        if (venda.parcela_id) p = await base44.entities.ParcelaVenda.get(venda.parcela_id).catch(() => null);
        if (!p) { const ps = await base44.entities.ParcelaVenda.filter({ venda_gerada_id: venda.id }); p = ps[0] || null; }
        setParcela(p);
        const oid = p?.venda_id || venda.venda_origem_id;
        if (oid) {
          const o = await base44.entities.Venda.get(oid).catch(() => null);
          setOrigem(o);
          if (o?.valor_total_contrato) { setValorTotal(String(o.valor_total_contrato)); onVinculo({ origemTotal: Number(o.valor_total_contrato) }); }
        }
      } catch (e) { /* segue sem vínculo */ }
      setCarregando(false);
    })();
  }, [venda?.id]); // eslint-disable-line

  // Novo lançamento: parcelas pendentes do cliente
  useEffect(() => {
    if (editando) return;
    (async () => {
      try {
        const ps = cpf ? await base44.entities.ParcelaVenda.filter({ cliente_cpf_cnpj: cpf, status: 'pendente' }, 'data_vencimento', 100) : [];
        setPendentes(ps);
      } catch (e) { setPendentes([]); }
      setCarregando(false);
    })();
  }, [cpf, editando]);

  const escolher = (id) => {
    setSel(id);
    const p = pendentes.find(x => x.id === id);
    if (p) { setValorRecebido(String(p.valor_parcela ?? '')); onVinculo({ parcelaId: p.id, semParcela: false }); }
    else onVinculo({ parcelaId: '', semParcela });
  };

  // Rótulo da parcela (registros novos têm numero/total; antigos: tenta pela observação)
  const doTexto = (venda?.observacao || '').match(/Parcela\s+(\d+)\s*\/\s*(\d+)/i);
  const numero = venda?.numero_parcela || parcela?.numero_parcela || (doTexto && Number(doTexto[1]));
  const total = venda?.total_parcelas || parcela?.total_parcelas || (doTexto && Number(doTexto[2]));

  return (
    <div className="md:col-span-2">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-amber-700" />
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pagamento de parcela (recorrência)</p>
        </div>

        {editando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="text-[10px] text-gray-500">Parcela paga</p>
              <p className="text-sm font-bold text-gray-800">{numero ? `${numero}${total ? ` de ${total}` : ''}` : '—'}</p>
              {parcela && <p className="text-[10px] text-gray-400">venc. {fmt(parcela.data_vencimento)}</p>}
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="text-[10px] text-gray-500">Venda original</p>
              {origem
                ? <><p className="text-sm font-bold text-gray-800">{origem.produto} · {brl(origem.valor_total_contrato)}</p><p className="text-[10px] text-gray-400">contratada em {fmt(origem.data)} · entrada {brl(origem.valor)}</p></>
                : <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {carregando ? 'Carregando…' : 'Sem vínculo com a venda original (registro antigo)'}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {!cpf && <p className="text-xs text-amber-700">Informe o cliente (CPF/CNPJ) para listar as parcelas pendentes.</p>}
            {cpf && pendentes.length === 0 && !carregando && <p className="text-xs text-amber-700">Nenhuma parcela pendente para este CPF/CNPJ.</p>}
            {pendentes.length > 0 && (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {pendentes.map(p => (
                  <label key={p.id} className={`flex items-center gap-3 rounded-lg border p-2 cursor-pointer bg-white ${sel === p.id ? 'border-amber-500 ring-1 ring-amber-300' : 'border-amber-100'}`}>
                    <input type="radio" name="parcela_pend" checked={sel === p.id} onChange={() => escolher(p.id)} />
                    <span className="text-xs text-gray-700 flex-1"><b>Parcela {p.numero_parcela}/{p.total_parcelas}</b> · {p.produto} · vence {fmt(p.data_vencimento)}</span>
                    <span className="text-xs font-semibold">{brl(p.valor_parcela)}</span>
                  </label>
                ))}
              </div>
            )}
            <label className="flex items-start gap-2 text-[11px] text-gray-600 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={semParcela} onChange={e => { setSemParcela(e.target.checked); if (e.target.checked) { setSel(''); onVinculo({ parcelaId: '', semParcela: true }); } else onVinculo({ semParcela: false }); }} />
              <span>Esta recorrência não tem parcela cadastrada (ex.: mensalidade avulsa). <b>Descreva na observação.</b></span>
            </label>
            {sel && <p className="text-[10px] text-emerald-700 flex items-center gap-1"><Link2 className="w-3 h-3" /> Vinculada à parcela: produto, vendedor e comissão seguem os da parcela.</p>}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Valor recebido nesta parcela (R$) *</label>
          <CampoMoeda asString value={valorRecebido} onChange={setValorRecebido}
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <p className="text-[10px] text-gray-400 mt-0.5">Conta na produção/meta do mês. Não gera implantação nem novas parcelas.</p>
        </div>
      </div>
    </div>
  );
}
