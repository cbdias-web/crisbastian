import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, FileText, DollarSign, BarChart2, Users, ArrowUpRight, Award, CalendarClock, Target, Sparkles } from 'lucide-react';
import { CELULAS_CAPA } from '@/lib/novoPortal';
import { ICONE_CELULA } from '@/components/hub/HeaderAvatares';
import VendasGerentePopup from '@/components/dashboard/VendasGerentePopup';

const TEAL = '#00D4AA';
const GOLD = '#D4AF37';
const T = { txt: '#e6edf3', muted: 'rgba(230,237,243,0.55)', line: 'rgba(255,255,255,0.07)' };
const CARD = { background: 'linear-gradient(180deg, rgba(28,35,51,0.88) 0%, rgba(18,23,31,0.88) 100%)', border: `1px solid ${T.line}`, backdropFilter: 'blur(8px)', minWidth: 0 };

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const brlCurto = (v) => {
  const n = Number(v || 0);
  if (n >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return brl(n);
};
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const dataCurta = (s) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '');
const corDe = (nome) => {
  const cores = ['#00D4AA', '#60A5FA', '#A78BFA', '#F59E0B', '#F472B6', '#34D399', '#C9A962'];
  let h = 0; for (const ch of String(nome || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
};

function Anel({ pct, cor, tamanho = 132, espessura = 12, children }) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="relative flex-shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={espessura} fill="none" />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={cor} strokeWidth={espessura} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: 'stroke-dashoffset .9s ease', filter: `drop-shadow(0 0 6px ${cor}88)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function Kpi({ icon: Icon, cor, label, valor, sub }) {
  return (
    <div className="vx-card-lift rounded-3xl p-5 flex flex-col gap-3" style={{ ...CARD, '--vx-acc': cor + '88', '--vx-glow': cor + '55' }}>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: cor + '1F', border: `1px solid ${cor}55` }}>
        <Icon className="w-5 h-5" style={{ color: cor }} />
      </span>
      <div>
        <p className="text-2xl font-semibold tracking-tight" style={{ color: T.txt }}>{valor}</p>
        <p className="text-xs mt-0.5" style={{ color: T.muted }}>{label}</p>
      </div>
      {sub && <p className="text-[11px] mt-auto" style={{ color: cor }}>{sub}</p>}
    </div>
  );
}

export default function DashNovo(p) {
  const {
    valorTotal, valorNovas, valorRecorrencia, totalVendas, totalRecorrencias, ticketMedio, comissaoGerada, vendedoresAtivos,
    metaTimeMes, metaTimePct, metaTimeAtingida, periodoMesLabel, rankingData, recentes, ranking, vendasAcumulado,
    dataInicio, dataFim, bonusAtingido, metaIndividual, faltaParaBonus, parcelasMes, mesIni, mesFim, onParcelas, navigate,
  } = p;

  // Gerente selecionado no ranking → popup com resumo e histórico de vendas (ao vivo)
  const [gerenteAberto, setGerenteAberto] = useState(null);

  // Ritmo: produção acumulada dia a dia no período x ritmo linear da meta
  const ritmo = useMemo(() => {
    if (!dataInicio || !dataFim) return [];
    const ini = new Date(dataInicio + 'T12:00:00');
    const fim = new Date(dataFim + 'T12:00:00');
    const dias = Math.max(1, Math.round((fim - ini) / 86400000) + 1);
    if (dias > 400) return [];
    const porDia = {};
    vendasAcumulado.forEach(v => { if (v.data) porDia[v.data] = (porDia[v.data] || 0) + (parseFloat(v.valor) || 0); });
    let acum = 0;
    const out = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date(ini.getTime() + i * 86400000);
      const k = d.toISOString().slice(0, 10);
      acum += porDia[k] || 0;
      out.push({ dia: dataCurta(k), realizado: acum, meta: metaTimeMes > 0 ? Math.round(metaTimeMes * (i + 1) / dias) : null });
    }
    return out;
  }, [vendasAcumulado, dataInicio, dataFim, metaTimeMes]);

  const vincendasMes = parcelasMes.filter(x => x.data_vencimento >= mesIni && x.data_vencimento <= mesFim);
  const totalVincendas = vincendasMes.reduce((s, x) => s + (parseFloat(x.valor_parcela) || 0), 0);
  const rank = ranking.filter(v => v.vol > 0 || v.vincendas > 0);
  const podio = rank.filter(v => v.vol > 0).slice(0, 3);
  const resto = rank.filter(v => !podio.includes(v));
  const maxVol = podio[0]?.vol || 1;
  const medalhas = [{ cor: GOLD, label: '1º' }, { cor: '#C0C7D1', label: '2º' }, { cor: '#CD7F32', label: '3º' }];
  const metasInd = rankingData.filter(r => r.meta > 0 || r.volume > 0).slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      {/* Bônus */}
      {(bonusAtingido || (metaIndividual && faltaParaBonus > 0)) && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-full self-start text-sm"
          style={{ background: bonusAtingido ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${bonusAtingido ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`, color: bonusAtingido ? '#34d399' : '#fbbf24' }}>
          <Sparkles className="w-4 h-4" />
          {bonusAtingido
            ? <>Meta batida! Bônus garantido de <b>{brl(metaIndividual.valor_bonus)}</b>.</>
            : <>Faltam <b>{brl(faltaParaBonus)}</b> para o bônus de <b>{brl(metaIndividual.valor_bonus)}</b>.</>}
        </div>
      )}

      {/* Destaque + KPIs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="vx-card-lift rounded-3xl p-6 flex items-center gap-6 flex-wrap"
          style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(0,212,170,0.22) 0%, rgba(0,102,204,0.14) 45%, rgba(18,23,31,0.92) 100%)', border: '1px solid rgba(0,212,170,0.35)', '--vx-acc': TEAL, '--vx-glow': 'rgba(0,212,170,0.45)' }}>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: TEAL }}><TrendingUp className="w-3.5 h-3.5" /> Total vendido no período</p>
            <p className="text-4xl md:text-5xl font-semibold tracking-tight mt-2" style={{ color: T.txt }}>{brl(valorTotal)}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.25)', color: T.txt }}>Novas <b style={{ color: TEAL }}>{brlCurto(valorNovas)}</b></span>
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.25)', color: T.txt }}>Recorrência <b style={{ color: '#60A5FA' }}>{brlCurto(valorRecorrencia)}</b> · {totalRecorrencias} parc.</span>
            </div>
          </div>
          <Anel pct={metaTimePct ?? 0} cor={metaTimeAtingida ? '#34d399' : TEAL}>
            {metaTimeMes > 0 ? (
              <>
                <span className="text-2xl font-semibold" style={{ color: T.txt }}>{metaTimePct}%</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>da meta</span>
              </>
            ) : <span className="text-[11px] text-center px-4" style={{ color: T.muted }}>Sem meta no mês</span>}
          </Anel>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Kpi icon={FileText} cor="#60A5FA" label="Vendas novas" valor={totalVendas} sub={totalRecorrencias ? `+ ${totalRecorrencias} recorrência${totalRecorrencias !== 1 ? 's' : ''}` : null} />
          <Kpi icon={DollarSign} cor={GOLD} label="Comissão gerada" valor={brlCurto(comissaoGerada)} />
          <Kpi icon={BarChart2} cor="#A78BFA" label="Ticket médio" valor={brlCurto(ticketMedio)} />
          <Kpi icon={Users} cor={TEAL} label="Gerentes com venda" valor={vendedoresAtivos} />
        </div>
      </div>

      {/* Ritmo + Metas individuais */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
        <div className="rounded-3xl p-5" style={CARD}>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold flex-1" style={{ color: T.txt }}>Ritmo de vendas</h3>
            {metaTimeMes > 0 && <span className="text-xs" style={{ color: T.muted }}>Meta de {periodoMesLabel}: <b style={{ color: T.txt }}>{brlCurto(metaTimeMes)}</b></span>}
          </div>
          <p className="text-xs mb-4" style={{ color: T.muted }}>Produção acumulada no período{metaTimeMes > 0 ? ' comparada ao ritmo necessário para a meta' : ''}.</p>
          {ritmo.length === 0
            ? <div className="h-56 flex items-center justify-center text-sm" style={{ color: T.muted }}>Sem dados no período</div>
            : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={ritmo} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vxRitmo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} width={44} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.15)' }} content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload.find(x => x.dataKey === 'realizado');
                    const m = payload.find(x => x.dataKey === 'meta');
                    return (
                      <div className="rounded-xl px-3 py-2 text-xs" style={{ background: '#0d1117', border: '1px solid rgba(0,212,170,0.35)', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
                        <p style={{ color: T.muted }}>{label}</p>
                        <p className="font-semibold" style={{ color: TEAL }}>Realizado {brl(r?.value)}</p>
                        {m?.value != null && <p style={{ color: GOLD }}>Ritmo da meta {brl(m.value)}</p>}
                      </div>
                    );
                  }} />
                  {metaTimeMes > 0 && <Area type="monotone" dataKey="meta" stroke={GOLD} strokeDasharray="5 5" strokeWidth={1.5} fill="none" dot={false} />}
                  <Area type="monotone" dataKey="realizado" stroke={TEAL} strokeWidth={2.5} fill="url(#vxRitmo)" dot={false} activeDot={{ r: 4, fill: TEAL, stroke: '#0d1117', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="rounded-3xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="text-sm font-semibold flex-1" style={{ color: T.txt }}>Metas individuais</h3>
            <Link to="/Metas" className="vx-btn vx-btn-soft h-7 px-3 text-[11px]">Metas <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {metasInd.length === 0 && <p className="text-sm py-6 text-center" style={{ color: T.muted }}>Nenhuma meta ou venda no período</p>}
          <div className="flex flex-col gap-3.5">
            {metasInd.map(r => {
              const pct = r.meta > 0 ? Math.min(100, Math.round(r.volume / r.meta * 100)) : null;
              const ok = r.meta > 0 && r.volume >= r.meta;
              const cor = ok ? '#34d399' : corDe(r.nome);
              return (
                <div key={r.nome} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: cor + '22', color: cor, border: `1.5px solid ${cor}` }}>{iniciais(r.nome)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-medium truncate" style={{ color: T.txt }}>{r.nome}</span>
                      <span style={{ color: T.muted }}><b style={{ color: T.txt }}>{brlCurto(r.volume)}</b>{r.meta > 0 ? ` / ${brlCurto(r.meta)}` : ''}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct ?? 100}%`, background: ok ? 'linear-gradient(90deg,#34d399,#059669)' : `linear-gradient(90deg, ${cor}, ${cor}99)`, opacity: pct == null ? 0.35 : 1, transition: 'width .8s ease' }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold w-10 text-right" style={{ color: ok ? '#34d399' : T.muted }}>{pct != null ? `${pct}%` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pódio + Últimas vendas */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))' }}>
        <div className="rounded-3xl p-5" style={CARD}>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <Award className="w-4 h-4" style={{ color: GOLD }} />
            <h3 className="text-sm font-semibold flex-1" style={{ color: T.txt }}>Ranking de gerentes</h3>
            {parcelasMes.length > 0 && (
              <button onClick={onParcelas} className="vx-btn vx-btn-soft h-7 px-3 text-[11px]" style={{ '--vx-txt': GOLD, '--vx-dim': 'rgba(212,175,55,0.12)', '--vx-line': 'rgba(212,175,55,0.35)' }}>
                <CalendarClock className="w-3 h-3" /> Parcelas ({parcelasMes.filter(x => x.status === 'pendente').length})
              </button>
            )}
            <Link to="/Vendedores" className="vx-btn vx-btn-soft h-7 px-3 text-[11px]">Equipe <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {podio.length === 0 && <p className="text-sm py-6 text-center" style={{ color: T.muted }}>Nenhuma venda no período</p>}
          {podio.length > 0 && (
            <div className="grid grid-cols-3 gap-3 items-end mb-5">
              {[podio[1], podio[0], podio[2]].map((v, idx) => {
                if (!v) return <div key={idx} />;
                const pos = podio.indexOf(v);
                const m = medalhas[pos];
                const alto = pos === 0;
                return (
                  <div key={v.id} onClick={() => setGerenteAberto(v)} title={`Ver vendas de ${v.nome}`}
                    className="vx-card-lift flex flex-col items-center text-center gap-2 rounded-2xl px-2 pb-4"
                    style={{ paddingTop: alto ? 22 : 14, cursor: 'pointer', background: `linear-gradient(180deg, ${m.cor}1F 0%, rgba(0,0,0,0) 100%)`, border: `1px solid ${m.cor}44`, '--vx-acc': m.cor, '--vx-glow': m.cor + '55' }}>
                    <span className="relative">
                      {v.avatar_url
                        ? <img src={v.avatar_url} alt="" className="rounded-full object-cover" style={{ width: alto ? 64 : 52, height: alto ? 64 : 52, border: `2px solid ${m.cor}` }} />
                        : <span className="rounded-full flex items-center justify-center font-bold" style={{ width: alto ? 64 : 52, height: alto ? 64 : 52, background: m.cor + '22', color: m.cor, border: `2px solid ${m.cor}` }}>{iniciais(v.nome)}</span>}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.cor, color: '#0d1117' }}>{m.label}</span>
                    </span>
                    <span className="text-xs font-semibold mt-1 truncate max-w-full" style={{ color: T.txt }}>{v.nome}</span>
                    <span className="text-sm font-semibold" style={{ color: m.cor }}>{brlCurto(v.vol)}</span>
                    <span className="text-[10px]" style={{ color: T.muted }}>{v.qtd} venda{v.qtd !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {resto.map((v, i) => (
              <div key={v.id} onClick={() => setGerenteAberto(v)} title={`Ver vendas de ${v.nome}`}
                className="vx-row-hover flex items-center gap-3 px-3 py-2 rounded-xl" style={{ '--vx-acc': TEAL }}>
                <span className="w-6 text-xs font-semibold text-center" style={{ color: T.muted }}>{v.vol > 0 ? podio.length + i + 1 : '—'}</span>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: corDe(v.nome) + '22', color: corDe(v.nome) }}>{iniciais(v.nome)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="truncate" style={{ color: T.txt }}>{v.nome}</span>
                    <span className="font-semibold" style={{ color: T.txt }}>{brlCurto(v.vol)}{v.vincendas > 0 && <span style={{ color: GOLD }}> +{brlCurto(v.vincendas)}</span>}</span>
                  </div>
                  <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round(v.vol / maxVol * 100)}%`, background: `linear-gradient(90deg, ${TEAL}, #0066cc)` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalVincendas > 0 && (
            <div className="flex justify-between items-center mt-4 pt-3 text-xs" style={{ borderTop: `1px solid ${T.line}` }}>
              <span style={{ color: T.muted }}>Parcelas a vencer no mês (time)</span>
              <b style={{ color: GOLD }}>{brl(totalVincendas)}</b>
            </div>
          )}
        </div>

        <div className="rounded-3xl p-5 flex flex-col" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold flex-1" style={{ color: T.txt }}>Últimas vendas</h3>
            <Link to="/Vendas" className="vx-btn vx-btn-soft h-7 px-3 text-[11px]">Todas <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {recentes.length === 0 && <p className="text-sm py-6 text-center" style={{ color: T.muted }}>Nenhuma venda no período</p>}
          <div className="flex flex-col">
            {recentes.map((v, i) => {
              const cor = corDe(v.assessor_comercial);
              return (
                <div key={v.id} className="vx-row-hover flex gap-3 px-2 py-2.5 rounded-xl" style={{ '--vx-acc': cor }}>
                  <div className="flex flex-col items-center">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: cor + '22', color: cor, border: `1.5px solid ${cor}` }}>{iniciais(v.assessor_comercial)}</span>
                    {i < recentes.length - 1 && <span className="flex-1 w-px mt-1" style={{ background: T.line }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: T.txt }}>{v.cliente || '—'}</span>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: T.txt }}>{brl(v.valor)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: TEAL }}>{v.produto || '—'}</span>
                      <span className="text-[11px]" style={{ color: T.muted }}>{v.assessor_comercial || '—'} · {dataCurta(v.data)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operações por área */}
      <div className="rounded-3xl p-5" style={CARD}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="font-semibold text-sm flex-1" style={{ color: T.txt }}>Operações por área</h3>
          <Link to="/Contratos" className="vx-btn vx-btn-soft h-8 px-3 text-xs">Contratos <ArrowUpRight className="w-3 h-3" /></Link>
          <Link to="/Pipeline" className="vx-btn vx-btn-soft h-8 px-3 text-xs">Pipeline <ArrowUpRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CELULAS_CAPA.map(c => {
            const Icon = ICONE_CELULA[c.id];
            return (
              <button key={c.id} onClick={() => navigate({ pathname: '/Dashboard', search: `?celula=${c.id}` })}
                className="vx-card-lift flex items-center gap-4 p-4 rounded-2xl text-left"
                style={{ background: c.cor + '12', border: `1px solid ${c.cor}55`, '--vx-acc': c.cor, '--vx-glow': c.glow }}>
                <span className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.cor + '22', border: `1.5px solid ${c.cor}` }}>
                  {Icon && <Icon className="w-6 h-6" style={{ color: c.cor }} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: T.txt }}>{c.nome}</span>
                  <span className="block text-xs truncate" style={{ color: T.muted }}>{c.produtos}</span>
                </span>
                <ArrowUpRight className="w-4 h-4 flex-shrink-0" style={{ color: c.cor }} />
              </button>
            );
          })}
        </div>
      </div>

      {gerenteAberto && (
        <VendasGerentePopup vendedor={gerenteAberto} dataInicio={dataInicio} dataFim={dataFim}
          onClose={() => setGerenteAberto(null)} />
      )}
    </div>
  );
}