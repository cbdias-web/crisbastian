import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ExternalLink, Receipt } from 'lucide-react';
import ContratoForm from '@/components/contratos/ContratoForm';
import ContratoViewer from '@/components/contratos/ContratoViewer';

// O contrato da operação, dentro da célula: mesmo formulário e mesma tela de acompanhamento da área
// Contratos (PDF, ZapSign, contrato assinado, boletos, link de pagamento, comprovantes, indicadores,
// envio para Vendas). A área Contratos continua mostrando o mesmo registro — só espelha.
export default function ContratoNaCelula({ contrato, tipoContrato, clienteId, clienteFallback, vinculo = {}, valoresIniciais, editarAoAbrir = false, onSalvo, onAtualizado, onVoltar, onVendaCriada, rotuloVoltar }) {
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      let c = null;
      if (!contrato && clienteId) c = await base44.entities.Cliente.get(clienteId).catch(() => null);
      if (!vivo) return;
      setUser(me);
      setCliente(c || (clienteFallback ? { ...clienteFallback } : null));
      setPronto(true);
    })();
    return () => { vivo = false; };
  }, [contrato?.id, clienteId]);

  if (!pronto) return <div className="flex items-center gap-2 p-6 text-sm" style={{ color: '#8E97A8' }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando contrato…</div>;
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  if (!contrato) {
    if (!tipoContrato) {
      return (
        <div className="p-6 rounded-2xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: '#C8D0DC' }}>
          Este produto ainda não tem modelo de contrato no portal.
        </div>
      );
    }
    return (
      <ContratoForm
        embutido
        tipo={tipoContrato}
        user={user}
        clientePreSelecionado={cliente}
        valoresIniciais={valoresIniciais}
        textoVoltar={rotuloVoltar || 'Voltar para a operação'}
        onCancel={onVoltar}
        onSaved={async (c) => {
          // vínculo com a operação (estudo/pipeline) para a célula reconhecer o contrato
          const extra = {};
          if (vinculo.estudo_id && c.estudo_id !== vinculo.estudo_id) extra.estudo_id = vinculo.estudo_id;
          if (vinculo.pipeline_id && !c.pipeline_id) extra.pipeline_id = vinculo.pipeline_id;
          if (cliente?.id && !c.cliente_id) extra.cliente_id = cliente.id;
          let final = c;
          if (Object.keys(extra).length) { await base44.entities.Contrato.update(c.id, extra).catch(() => {}); final = { ...c, ...extra }; }
          onSalvo?.(final);
        }}
      />
    );
  }

  return (
    <ContratoViewer
      embutido
      contrato={contrato}
      isAdmin={isAdmin}
      textoVoltar={rotuloVoltar || 'Voltar para a operação'}
      onBack={onVoltar}
      onUpdate={() => onAtualizado?.()}
      onVendaCriada={onVendaCriada}
      editarAoAbrir={editarAoAbrir}
    />
  );
}

// Venda gerada pelo contrato + comissionamento (mesmos registros da área Vendas/Comissões)
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');

export function VendaDaOperacao({ contrato, t }) {
  const [vendas, setVendas] = useState(null);
  const [comissoes, setComissoes] = useState({});
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!contrato?.id) { setVendas([]); return; }
      const vs = await base44.entities.Venda.filter({ contrato_id: contrato.id }, '-data', 50).catch(() => []);
      const cm = {};
      await Promise.all((vs || []).map(async v => {
        const [com, esp] = await Promise.all([
          base44.entities.Comissao.filter({ venda_id: v.id }, '-created_date', 50).catch(() => []),
          base44.entities.ComissaoEspelhamento.filter({ venda_id: v.id }, '-created_date', 50).catch(() => []),
        ]);
        cm[v.id] = [
          ...(com || []).map(c => ({ ...c, _tipo: c.tipo === 'bonus' ? 'Bônus' : c.vendedor_id === v.vendedor_id ? 'Vendedor' : 'Indicador (vendedor)' })),
          ...(esp || []).map(c => ({ ...c, _tipo: 'Indicador' })),
        ].filter(c => (Number(c.valor_comissao) || 0) > 0 || c.tipo === 'bonus');
      }));
      if (vivo) { setVendas(vs || []); setComissoes(cm); }
    })();
    return () => { vivo = false; };
  }, [contrato?.id, contrato?.status]);

  const acc = t?.acc || '#00D4AA';
  if (vendas === null) return <div className="flex items-center gap-2 p-6 text-sm" style={{ color: '#8E97A8' }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando venda…</div>;
  if (!contrato) return <p className="p-6 text-sm" style={{ color: '#8E97A8' }}>A venda aparece aqui depois que o contrato for gerado, assinado, pago e enviado para Vendas.</p>;
  if (vendas.length === 0) {
    return (
      <div className="p-6 rounded-2xl text-sm flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', color: '#C8D0DC' }}>
        <span className="font-semibold" style={{ color: '#F4EFE3' }}>Ainda não há venda para este contrato.</span>
        <span style={{ color: '#8E97A8' }}>Quando o contrato estiver assinado e com comprovante de pagamento, use "Enviar para Vendas" na aba Contrato. A venda e as comissões aparecem aqui.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {vendas.map(v => {
        const cms = comissoes[v.id] || [];
        const totalCom = cms.reduce((s, c) => s + (Number(c.valor_comissao) || 0), 0);
        return (
          <div key={v.id} className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: acc + '22', border: `1.5px solid ${acc}` }}><Receipt className="w-5 h-5" style={{ color: acc }} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold" style={{ color: '#F4EFE3' }}>{v.tipo_venda === 'recorrencia' ? 'Recebimento de parcela' : 'Venda'} · {v.produto}</p>
                <p className="text-xs" style={{ color: '#8E97A8' }}>{dataBR(v.data)} · {v.assessor_comercial || '—'}{v.autorizacao_status ? ` · ${v.autorizacao_status}` : ''}</p>
              </div>
              <span className="text-xl font-semibold" style={{ color: acc }}>{brl(v.valor)}</span>
            </div>
            <div className="grid gap-3 text-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {[
                ['Valor total do contrato', brl(v.valor_total_contrato)],
                ['Forma de pagamento', v.forma_pagamento || '—'],
                ['Parcelas', v.num_parcelas ? `${v.num_parcelas}x` : 'À vista'],
                ['Estrutura', ({ entrada_parcelas: 'Entrada + parcelas', a_vista: 'À vista', parcelado: 'Parcelado', parcela: 'Parcela' })[v.estrutura_pagamento] || (v.estrutura_pagamento ? String(v.estrutura_pagamento).replace(/_/g, ' ') : '—')],
                [(v.indicadores?.length || 0) > 1 ? 'Indicadores' : 'Indicador', v.indicadores?.length ? v.indicadores.map(i => `${i.nome}${i.percentual ? ` (${i.percentual}%)` : ''}`).join(' · ') : v.espelhamento ? `${v.espelhamento}${v.percentual_comissao_espelhamento ? ` (${v.percentual_comissao_espelhamento}%)` : ''}` : '—'],
                ['Comissão total', brl(totalCom)],
              ].map(([l, val]) => (
                <div key={l}><p className="text-[11px]" style={{ color: '#8E97A8' }}>{l}</p><p style={{ color: '#F4EFE3' }}>{val}</p></div>
              ))}
            </div>
            {v.observacao && <p className="text-xs" style={{ color: '#8E97A8' }}>{v.observacao}</p>}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#C8D0DC' }}>Comissionamento</p>
              {cms.length === 0 && <p className="text-xs" style={{ color: '#8E97A8' }}>Nenhuma comissão lançada para esta venda ainda.</p>}
              {cms.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <table className="w-full text-sm">
                    <thead><tr style={{ color: '#8E97A8', fontSize: 11 }}><th className="text-left px-3 py-2 font-medium">Beneficiário</th><th className="text-left px-3 py-2 font-medium">Tipo</th><th className="text-right px-3 py-2 font-medium">%</th><th className="text-right px-3 py-2 font-medium">Valor</th><th className="text-right px-3 py-2 font-medium">Situação</th></tr></thead>
                    <tbody>
                      {cms.map(c => (
                        <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#F4EFE3' }}>
                          <td className="px-3 py-2">{c.vendedor_nome || '—'}</td>
                          <td className="px-3 py-2" style={{ color: '#C8D0DC' }}>{c._tipo}</td>
                          <td className="px-3 py-2 text-right">{c.percentual != null ? `${c.percentual}%` : '—'}</td>
                          <td className="px-3 py-2 text-right">{brl(c.valor_comissao)}</td>
                          <td className="px-3 py-2 text-right" style={{ color: c.pago ? '#8FD9B0' : '#E3C982' }}>{c.pago ? 'Paga' : 'A pagar'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(v.comprovantes || []).filter(x => x?.url).map((x, i) => (
                <a key={i} href={x.url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-soft h-8 px-3 text-xs">Comprovante {i + 1} <ExternalLink className="w-3 h-3" /></a>
              ))}
              {v.contrato_assinado_url && <a href={v.contrato_assinado_url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-soft h-8 px-3 text-xs">Contrato assinado <ExternalLink className="w-3 h-3" /></a>}
              {v.boleto_url && <a href={v.boleto_url} target="_blank" rel="noreferrer" className="vx-btn vx-btn-soft h-8 px-3 text-xs">Boleto <ExternalLink className="w-3 h-3" /></a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
