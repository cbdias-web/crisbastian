import {
  TrendingUp, CheckCircle2, Clock, FileText, DollarSign, UserCheck,
  Rocket, CreditCard, AlertCircle, CalendarClock, Bell,
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

const STATUS_IMPLANTACAO = {
  aguardando_documentacao: { label: 'Aguardando documentação', color: AURORA.warning },
  em_andamento: { label: 'Em andamento', color: AURORA.accent },
  aguardando_cliente: { label: 'Aguardando cliente', color: '#60a5fa' },
  rejeitado_compliance: { label: 'Rejeitada por Compliance', color: AURORA.danger },
  concluido: { label: 'Concluída', color: AURORA.green },
  concluido_feedback: { label: 'Concluída — feedback enviado', color: AURORA.purple },
  cancelado: { label: 'Cancelada', color: AURORA.danger },
};

const ST_PARCELA = {
  recebida: { color: AURORA.green, bg: 'rgba(52,211,153,0.12)', label: 'Recebida' },
  inadimplente: { color: AURORA.danger, bg: 'rgba(248,113,113,0.12)', label: 'Inadimplente' },
  atrasada: { color: AURORA.danger, bg: 'rgba(248,113,113,0.12)', label: 'Atrasada' },
  vincenda: { color: AURORA.warning, bg: 'rgba(251,191,36,0.14)', label: 'Vincenda' },
  a_vencer: { color: AURORA.textMuted, bg: 'rgba(230,237,243,0.06)', label: 'A vencer' },
  pendente: { color: AURORA.warning, bg: 'rgba(251,191,36,0.12)', label: 'Pendente' },
};

function Milestone({ icon: Icon, titulo, sub, subColor, done, data }) {
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
        {sub && <p className="text-[11px] mt-0.5 font-semibold" style={{ color: subColor || AURORA.textMuted }}>{sub}</p>}
        {data && done && <p className="text-[10px] mt-0.5" style={{ color: AURORA.green }}>✓ {data}</p>}
      </div>
    </div>
  );
}

// Deriva o cronograma de parcelas a partir do contrato quando não há registros de ParcelaVenda.
function deriverParcelas(contrato, numParcelas, valorParcela) {
  if (numParcelas <= 0) return [];
  const diaVenc = Number(contrato?.dia_vencimento) || 0;
  const baseStr = contrato?.data_primeiro_pagamento || contrato?.data_contrato;
  const base = baseStr ? new Date(baseStr + 'T00:00:00') : null;
  const baseDay = base ? base.getDate() : 0;
  // Se o dia de data_primeiro_pagamento bate com o dia_vencimento, ele é a 1ª parcela;
  // caso contrário, é a data da entrada e as parcelas começam no mês seguinte.
  const primeiraEhParcela = base && diaVenc > 0 && baseDay === diaVenc;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const arr = [];
  for (let i = 1; i <= numParcelas; i++) {
    let venc = null;
    if (base && diaVenc > 0) {
      const off = primeiraEhParcela ? (i - 1) : i;
      venc = new Date(base.getFullYear(), base.getMonth() + off, diaVenc);
    } else if (base) {
      venc = new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
    }
    let status = 'pendente';
    if (venc) {
      const diff = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
      status = diff < 0 ? 'atrasada' : diff <= 7 ? 'vincenda' : 'a_vencer';
    }
    arr.push({
      numero_parcela: i,
      total_parcelas: numParcelas,
      valor_parcela: valorParcela,
      data_vencimento: venc ? venc.toISOString().slice(0, 10) : null,
      status,
      derived: true,
    });
  }
  return arr;
}

export default function JornadaCliente({ detalhe }) {
  const { lead, contrato, venda, parcelas = [], implantacao } = detalhe;

  const numParcelas = Number(contrato?.num_parcelas || venda?.num_parcelas || 0);
  // É parcelado quando há saldo após a entrada (entrada < total) ou mais de 1 parcela.
  // Isso captura corretamente "entrada + 1 parcela" (ex.: 5.000 + 1x 5.000 = 10.000),
  // que antes era exibido como "à vista" porque num_parcelas era 1.
  const valorTotal = Number(venda?.valor_total_contrato || contrato?.valor_total || 0);
  const entrada = Number(venda?.valor || contrato?.valor_adesao || 0);
  const valorParcela = Number(contrato?.valor_parcela || (numParcelas > 0 && valorTotal ? (valorTotal - entrada) / numParcelas : venda?.valor) || 0);
  const parcelado = (valorTotal > 0 && entrada < valorTotal) || numParcelas > 1;

  // Usa parcelas reais (ParcelaVenda) se existirem; senão deriva do contrato.
  const parcelasReais = parcelas.length > 0 ? parcelas : deriverParcelas(contrato, numParcelas, valorParcela);
  const totalParcelasReg = parcelasReais.length;
  const parcelasRecebidas = parcelasReais.filter(p => p.status === 'recebida').length;
  const parcelasPendentes = parcelasReais.filter(p => p.status !== 'recebida').length;
  const pctRecebido = totalParcelasReg > 0 ? Math.round((parcelasRecebidas / totalParcelasReg) * 100) : 0;

  // Próxima parcela a cobrar: a mais próxima do vencimento ainda não recebida.
  const proximaParcela = parcelasReais
    .filter(p => p.status !== 'recebida')
    .map(p => ({ ...p, _ts: p.data_vencimento ? new Date(p.data_vencimento + 'T00:00:00').getTime() : Infinity }))
    .sort((a, b) => a._ts - b._ts)[0] || null;

  const stContrato = contrato ? (STATUS_CONTRATO[contrato.status] || STATUS_CONTRATO.rascunho) : null;
  const stImplantacao = implantacao
    ? (STATUS_IMPLANTACAO[implantacao.status] || { label: implantacao.status, color: AURORA.textMuted })
    : null;

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
          sub={venda ? `${fmtMoeda(venda.valor_total_contrato || venda.valor)}${venda.tipo_venda === 'recorrencia' ? ' · Recorrência' : ' · Nova'}${venda.forma_pagamento ? ' · ' + venda.forma_pagamento : ''}` : 'Pendente'}
          data={venda ? fmtData(venda.data) : null}
        />
        {/* 5. Implantação */}
        <Milestone
          icon={Rocket}
          titulo="Implantação"
          done={!!implantacao}
          sub={implantacao ? `Status: ${stImplantacao.label}${implantacao.responsavel_implantacao ? ' · ' + implantacao.responsavel_implantacao : ''}` : 'Aguardando'}
          subColor={implantacao ? stImplantacao.color : undefined}
          data={implantacao ? fmtData(implantacao.data_conclusao || implantacao.data_entrada) : null}
        />
      </div>

      {/* ─── Rejeição por Compliance (acompanha o lead na jornada) ─── */}
      {implantacao?.status === 'rejeitado_compliance' && (
        <div className="rounded-xl p-3 mt-2 flex items-center gap-2"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.35)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: AURORA.danger }} />
          <p className="text-xs font-semibold" style={{ color: AURORA.danger }}>
            Implantação rejeitada por Compliance — o processo foi barrado pela área de compliance.
          </p>
        </div>
      )}

      {/* ─── Parcelamento ─── */}
      <div className="rounded-xl p-3 mt-2"
        style={{
          background: parcelado ? 'rgba(251,191,36,0.06)' : AURORA.surface2,
          border: `1px solid ${parcelado ? 'rgba(251,191,36,0.3)' : AURORA.border}`,
        }}>
        <div className="flex items-center gap-2 mb-1.5">
          <CreditCard className="w-4 h-4" style={{ color: parcelado ? AURORA.warning : AURORA.textMuted }} />
          <p className="text-xs font-bold" style={{ color: parcelado ? AURORA.warning : AURORA.text }}>
            {parcelado ? (entrada > 0 ? `Entrada + ${numParcelas}x` : `Parcelado em ${numParcelas}x`) : 'Pagamento à vista'}
          </p>
          {valorTotal > 0 && (
            <span className="ml-auto text-[11px] font-semibold" style={{ color: AURORA.text }}>
              Total: {fmtMoeda(valorTotal)}
            </span>
          )}
        </div>
        {parcelado ? (
          <>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span style={{ color: AURORA.textMuted }}>Entrada</span>
              <span style={{ color: AURORA.text }}><strong>{fmtMoeda(entrada)}</strong></span>
            </div>
            <p className="text-[11px] mb-2" style={{ color: AURORA.textMuted }}>
              {valorParcela ? `+ ${numParcelas}x de ${fmtMoeda(valorParcela)}` : `+ ${numParcelas} parcelas`} · A comissão do indicador é liberada conforme o recebimento de cada parcela.
            </p>
            {totalParcelasReg > 0 && parcelas.length > 0 ? (
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
              <p className="text-[10px] flex items-center gap-1" style={{ color: AURORA.textMuted }}>
                <AlertCircle className="w-3 h-3" /> Cronograma de parcelas estimado a partir do contrato — confirme os vencimentos com o gestor comercial.
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px]" style={{ color: AURORA.textMuted }}>
            Pagamento à vista — a comissão do indicador é liberada de uma única vez após a efetivação da venda.
          </p>
        )}
      </div>

      {/* ─── Próxima parcela vincenda (destaque para cobrança) ─── */}
      {parcelado && proximaParcela && (
        <div className="rounded-xl p-3 mt-2 flex items-start gap-3"
          style={{
            background: proximaParcela.status === 'atrasada' ? 'rgba(248,113,113,0.10)' : 'rgba(251,191,36,0.10)',
            border: `1px solid ${proximaParcela.status === 'atrasada' ? 'rgba(248,113,113,0.35)' : 'rgba(251,191,36,0.35)'}`,
          }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: proximaParcela.status === 'atrasada' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)' }}>
            <CalendarClock className="w-4 h-4" style={{ color: proximaParcela.status === 'atrasada' ? AURORA.danger : AURORA.warning }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-xs font-bold" style={{ color: AURORA.text }}>
                Próxima parcela · {proximaParcela.numero_parcela}/{proximaParcela.total_parcelas || numParcelas}
              </p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color: (ST_PARCELA[proximaParcela.status] || ST_PARCELA.pendente).color, background: (ST_PARCELA[proximaParcela.status] || ST_PARCELA.pendente).bg }}>
                {(ST_PARCELA[proximaParcela.status] || ST_PARCELA.pendente).label}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Valor</p>
                <p className="text-sm font-bold" style={{ color: AURORA.text }}>{fmtMoeda(proximaParcela.valor_parcela)}</p>
              </div>
              <div>
                <p className="text-[10px]" style={{ color: AURORA.textMuted }}>Vencimento</p>
                <p className="text-sm font-semibold" style={{ color: proximaParcela.status === 'atrasada' ? AURORA.danger : AURORA.text }}>
                  {proximaParcela.data_vencimento ? fmtData(proximaParcela.data_vencimento) : 'A definir'}
                </p>
              </div>
            </div>
            <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}>
              <Bell className="w-3 h-3" />
              {proximaParcela.status === 'atrasada'
                ? 'Parcela em atraso — repasse ao cliente para regularizar.'
                : 'Cobrança pendente — repasse ao cliente próximo do vencimento.'}
            </p>
          </div>
        </div>
      )}

      {/* Lista detalhada das parcelas */}
      {parcelado && totalParcelasReg > 0 && (
        <div className="rounded-xl p-3 mt-2" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
          <p className="text-[11px] font-bold mb-2" style={{ color: AURORA.text }}>
            Detalhamento das parcelas{parcelas.length === 0 ? ' (estimado)' : ''}
          </p>
          <div className="space-y-1">
            {parcelasReais.map((p, i) => {
              const stCfg = ST_PARCELA[p.status] || ST_PARCELA.pendente;
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