import {
  TrendingUp, CheckCircle2, Clock, FileText, DollarSign, UserCheck,
  Rocket, CreditCard, AlertCircle,
} from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  warning: '#fbbf24',
  green: '#34d399',
  purple: '#a78bfa',
  danger: '#f87171',
};

const fmtMoeda = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_CONTRATO = {
  rascunho: { label: 'Rascunho', color: AURORA.textMuted },
  gerado: { label: 'Gerado', color: AURORA.accent },
  assinado: { label: 'Assinado', color: AURORA.purple },
  aguardando_pagamento: { label: 'Aguardando pagamento', color: AURORA.warning },
  pago: { label: 'Pago', color: AURORA.green },
  no_pipeline: { label: 'No pipeline', color: AURORA.accent },
};

function Milestone({ icon: Icon, titulo, sub, done, data }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: done ? 'rgba(52,211,153,0.15)' : AURORA.surface2,
            border: `1px solid ${done ? 'rgba(52,211,153,0.4)' : AURORA.border}`,
          }}>
          {done ? <CheckCircle2 className="w-4 h-4" style={{ color: AURORA.green }} />
            : <Clock className="w-3.5 h-3.5" style={{ color: AURORA.textMuted }} />}
        </div>
        <div className="w-px flex-1 mt-1" style={{ background: AURORA.border, minHeight: 14 }} />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color: done ? AURORA.accent : AURORA.textMuted }} />
          <p className="text-xs font-semibold" style={{ color: done ? AURORA.text : AURORA.textMuted }}>{titulo}</p>
        </div>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: AURORA.textMuted }}>{sub}</p>}
        {data && done && <p className="text-[10px] mt-0.5" style={{ color: AURORA.green }}>✓ {data}</p>}
      </div>
    </div>
  );
}

export default function JornadaCliente({ detalhe }) {
  const { lead, contrato, venda, parcelas = [], implantacao } = detalhe;

  const numParcelas = Number(venda?.num_parcelas || contrato?.num_parcelas || 0);
  const parcelado = numParcelas > 1;
  const valorParcela = Number(venda?.valor || contrato?.valor_parcela || 0);
  const totalParcelasReg = parcelas.length;
  const parcelasRecebidas = parcelas.filter(p => p.status === 'recebida').length;
  const parcelasPendentes = parcelas.filter(p => p.status === 'pendente').length;
  const pctRecebido = totalParcelasReg > 0 ? Math.round((parcelasRecebidas / totalParcelasReg) * 100) : 0;

  const stContrato = contrato ? (STATUS_CONTRATO[contrato.status] || STATUS_CONTRATO.rascunho) : null;

  return (
    <div className="mb-4">
      <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: AURORA.accent }}>
        <TrendingUp className="w-3.5 h-3.5" /> Jornada do Cliente
      </p>

      <div className="rounded-xl p-3" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
        {/* 1. Indicação */}
        <Milestone icon={UserCheck} titulo="Indicação recebida" done sub={`Produto: ${lead.produto}`} data={fmtData(lead.created_date)} />
        {/* 2. Cliente criado */}
        <Milestone icon={UserCheck} titulo="Cliente criado" done={!!lead.cliente_id} sub={lead.cliente_id ? 'Cadastro formalizado no CRM' : 'Pendente'} data={lead.cliente_id ? fmtData(lead.convertido_em) : null} />
        {/* 3. Contrato */}
        <Milestone
          icon={FileText}
          titulo="Contrato gerado"
          done={!!contrato}
          sub={contrato ? `Status: ${stContrato.label}${contrato.data_contrato ? ' · ' + fmtData(contrato.data_contrato) : ''}` : 'Pendente'}
        />
        {/* 4. Venda efetivada */}
        <Milestone
          icon={DollarSign}
          titulo="Venda efetivada"
          done={!!venda}
          sub={venda ? `${fmtMoeda(venda.valor)}${venda.tipo_venda === 'recorrencia' ? ' · Recorrência' : ' · Nova'}${venda.forma_pagamento ? ' · ' + venda.forma_pagamento : ''}` : 'Pendente'}
          data={venda ? fmtData(venda.data) : null}
        />
        {/* 5. Implantação */}
        <Milestone
          icon={Rocket}
          titulo="Implantação"
          done={!!implantacao}
          sub={implantacao ? `Status: ${implantacao.status || '—'}${implantacao.responsavel_implantacao ? ' · ' + implantacao.responsavel_implantacao : ''}` : 'Aguardando'}
          data={implantacao ? fmtData(implantacao.data_conclusao || implantacao.data_entrada) : null}
        />
      </div>

      {/* ─── Parcelamento ─── */}
      <div className="rounded-xl p-3 mt-2"
        style={{
          background: parcelado ? 'rgba(251,191,36,0.06)' : AURORA.surface2,
          border: `1px solid ${parcelado ? 'rgba(251,191,36,0.3)' : AURORA.border}`,
        }}>
        <div className="flex items-center gap-2 mb-1.5">
          <CreditCard className="w-4 h-4" style={{ color: parcelado ? AURORA.warning : AURORA.textMuted }} />
          <p className="text-xs font-bold" style={{ color: parcelado ? AURORA.warning : AURORA.text }}>
            {parcelado ? `Parcelado em ${numParcelas}x` : 'Pagamento à vista'}
          </p>
        </div>
        {parcelado ? (
          <>
            <p className="text-[11px] mb-2" style={{ color: AURORA.textMuted }}>
              {valorParcela ? `${numParcelas}x de ${fmtMoeda(valorParcela)}` : `${numParcelas} parcelas`} · A comissão do indicador é liberada conforme o recebimento de cada parcela.
            </p>
            {totalParcelasReg > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: AURORA.textMuted }}>Parcelas recebidas</span>
                  <span style={{ color: AURORA.text }}><strong style={{ color: AURORA.green }}>{parcelasRecebidas}</strong> / {totalParcelasReg}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: AURORA.surface }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctRecebido}%`, background: 'linear-gradient(90deg, #00D4AA, #34d399)' }} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                  <span style={{ color: AURORA.green }}>● {parcelasRecebidas} recebidas</span>
                  <span style={{ color: AURORA.warning }}>● {parcelasPendentes} pendentes</span>
                </div>
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Parcelas ainda não cadastradas no sistema.</p>
            )}
          </>
        ) : (
          <p className="text-[11px]" style={{ color: AURORA.textMuted }}>
            Pagamento à vista — a comissão do indicador é liberada de uma única vez após a efetivação da venda.
          </p>
        )}
      </div>

      {/* Lista detalhada das parcelas */}
      {parcelado && totalParcelasReg > 0 && (
        <div className="rounded-xl p-3 mt-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px] font-bold mb-2" style={{ color: AURORA.text }}>Detalhamento das parcelas</p>
          <div className="space-y-1">
            {parcelas.map((p, i) => {
              const stCfg = p.status === 'recebida'
                ? { color: AURORA.green, bg: 'rgba(52,211,153,0.12)', label: 'Recebida' }
                : p.status === 'inadimplente'
                ? { color: AURORA.danger, bg: 'rgba(248,113,113,0.12)', label: 'Inadimplente' }
                : { color: AURORA.warning, bg: 'rgba(251,191,36,0.12)', label: 'Pendente' };
              return (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg" style={{ background: stCfg.bg }}>
                  <span style={{ color: AURORA.text }}>Parcela {p.numero_parcela}/{p.total_parcelas || numParcelas}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ color: AURORA.textMuted }}>{fmtMoeda(p.valor_parcela)}</span>
                    <span style={{ color: AURORA.textMuted }}>Venc: {fmtData(p.data_vencimento)}</span>
                    <span className="font-semibold px-1.5 py-0.5 rounded-full text-[10px]" style={{ color: stCfg.color, background: stCfg.bg }}>{stCfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}