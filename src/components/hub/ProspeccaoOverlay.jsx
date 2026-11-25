import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { X, Zap, Upload, Activity, FileText, Settings, Handshake, ChevronRight, Phone, MessageCircle, CalendarClock, Flame, Target, Loader2, Trophy, Users, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { resolverVendedorDoUsuarioLogado } from '@/lib/vendedorContrato';
import { urlItem } from './HeaderAvatares';

// Prospecção no novo portal: painel imersivo (mesmo padrão das células) com o dia da prospecção
// em números, ritmo da semana, ranking, últimos contatos e as ferramentas do bloco.
// Abre com ?painel=prospeccao a partir da capa ou do avatar do cabeçalho.

const AZ = { acc: '#60A5FA', acc2: '#93C5FD', dim: 'rgba(96,165,250,0.12)', line: 'rgba(96,165,250,0.28)', glow: 'rgba(96,165,250,0.5)', bg: '#0B1322', head: '#0E182B' };
const C = { card: 'rgba(255,255,255,0.03)', card2: 'rgba(255,255,255,0.05)', line: 'rgba(255,255,255,0.07)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799', ok: '#8FD9B0', warn: '#E3C982' };
const FERRAMENTAS = {
  FilaContato: { Icon: Zap, desc: 'Sua fila do dia: ligar, registrar o resultado e seguir a cadência.', cor: '#60A5FA' },
  Leads: { Icon: Upload, desc: 'Importar lotes e distribuir leads entre os gerentes.', cor: '#34D399' },
  PainelProspeccao: { Icon: Activity, desc: 'Indicadores da equipe: toques, conversas e conversões.', cor: '#A78BFA' },
  RelatorioInteracoes: { Icon: FileText, desc: 'Histórico de interações por gerente e período.', cor: '#F59E0B' },
  ConfigProspeccao: { Icon: Settings, desc: 'Cadências, filas, metas diárias e regras de distribuição.', cor: '#94A3B8' },
  DashParceiro: { Icon: Handshake, desc: 'Indicações de parceiros e o retorno de cada uma.', cor: '#F472B6' },
};
const RES = {
  atendeu_interessado: ['Interessado', C.ok], reuniao_marcada: ['Reunião marcada', C.ok], atendeu_retorno: ['Pediu retorno', C.warn], respondeu: ['Respondeu', C.warn],
  whatsapp_enviado: ['WhatsApp enviado', C.muted], atendeu_sem_interesse: ['Sem interesse', '#F4A3A3'], nao_atendeu: ['Não atendeu', C.muted2], caixa_postal: ['Caixa postal', C.muted2],
  numero_errado: ['Número errado', '#F4A3A3'], opt_out: ['Pediu para sair', '#F4A3A3'], no_show: ['Não compareceu', '#F4A3A3'],
};
const CONVERSA = ['atendeu_interessado', 'atendeu_retorno', 'atendeu_sem_interesse', 'respondeu', 'reuniao_marcada'];
const POSITIVO = ['atendeu_interessado', 'reuniao_marcada'];
const hojeBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const diaMenos = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const hora = (d) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

export default function ProspeccaoOverlay({ grupo, user, isAdmin }) {
  const [sp, setSp] = useSearchParams();
  if (sp.get('painel') !== 'prospeccao' || !grupo) return null;
  const fechar = () => { const n = new URLSearchParams(sp); n.delete('painel'); setSp(n); };
  return <Painel grupo={grupo} user={user} isAdmin={isAdmin} fechar={fechar} />;
}

function Painel({ grupo, user, isAdmin, fechar }) {
  const [d, setD] = useState(null);
  const [escopo, setEscopo] = useState(isAdmin ? 'equipe' : 'meu');

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let vivo = true;
    setD(null);
    (async () => {
      let vend = null;
      try { vend = await resolverVendedorDoUsuarioLogado(); } catch { /* sem vínculo */ }
      const meu = escopo === 'meu' && vend?.id ? { vendedor_id: vend.id } : {};
      const hoje = hojeBR();
      const ini7 = diaMenos(hoje, 6);
      const mesIni = hoje.slice(0, 8) + '01';
      const seguro = (p) => p.then(r => (Array.isArray(r) ? r : [])).catch(() => []);
      const [regs, agenda, indicacoes, pipe, convertidos, vendedores] = await Promise.all([
        seguro(base44.entities.RegistroContato.filter({ data_dia: { $gte: ini7 }, ...meu }, '-created_date', 5000)),
        seguro(base44.entities.AgendaContato.filter({ data_agendada: hoje, ...meu }, 'horario', 300)),
        seguro(base44.entities.LeadIndicacao.filter({ status: 'novo' }, '-created_date', 200)),
        seguro(base44.entities.Pipeline.filter({ temperatura: { $in: ['Frio', 'Morno', 'Quente'] }, ...meu }, '-created_date', 1000)),
        seguro(base44.entities.Lead.filter({ convertido: true, convertido_em: { $gte: mesIni }, ...meu }, '-convertido_em', 1000)),
        seguro(base44.entities.Vendedor.filter({ ativo: true }, 'nome', 200)),
      ]);
      if (!vivo) return;
      const doDia = regs.filter(r => r.data_dia === hoje);
      const meta = escopo === 'meu' ? (Number(vend?.meta_diaria_toques) || 0) : vendedores.reduce((s, v) => s + (Number(v.meta_diaria_toques) || 0), 0);
      setD({ vend, hoje, regs, doDia, agenda, indicacoes, pipe, convertidos, meta });
    })();
    return () => { vivo = false; };
  }, [escopo]);

  const semana = useMemo(() => {
    if (!d) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const dia = diaMenos(d.hoje, 6 - i);
      const rs = d.regs.filter(r => r.data_dia === dia);
      const lbl = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
      return { dia: lbl, Toques: rs.length, Conversas: rs.filter(r => CONVERSA.includes(r.resultado)).length };
    });
  }, [d]);

  const ranking = useMemo(() => {
    if (!d) return [];
    const m = new Map();
    d.doDia.forEach(r => {
      const k = r.vendedor_nome || '—';
      const x = m.get(k) || { nome: k, toques: 0, conversas: 0, positivos: 0 };
      x.toques++; if (CONVERSA.includes(r.resultado)) x.conversas++; if (POSITIVO.includes(r.resultado)) x.positivos++;
      m.set(k, x);
    });
    return [...m.values()].sort((a, b) => b.toques - a.toques).slice(0, 8);
  }, [d]);

  const k = d ? {
    toques: d.doDia.length,
    conversas: d.doDia.filter(r => CONVERSA.includes(r.resultado)).length,
    positivos: d.doDia.filter(r => POSITIVO.includes(r.resultado)).length,
    agenda: d.agenda.length,
    agendaFeita: d.agenda.filter(a => a.status === 'realizado').length,
    pipeQtd: d.pipe.length,
    pipeValor: d.pipe.reduce((s, p) => s + (Number(p.valor_estimado) || 0), 0),
    quentes: d.pipe.filter(p => p.temperatura === 'Quente').length,
    convertidos: d.convertidos.length,
    indicacoes: d.indicacoes.length,
  } : null;
  const pctMeta = k && d.meta ? Math.min(100, Math.round((k.toques / d.meta) * 100)) : null;
  const taxaConversa = k && k.toques ? Math.round((k.conversas / k.toques) * 100) : 0;

  return (
    <div data-manter-jarvis className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-7" role="dialog" aria-modal="true" aria-label="Prospecção"
      style={{ background: 'rgba(3,6,10,0.62)', backdropFilter: 'blur(6px)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <style>{`
        .vx-pr-body{flex:1;display:flex;gap:20px;padding:20px 24px;min-height:0;overflow:hidden}
        .vx-pr-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;overflow-y:auto;padding-right:4px}
        .vx-pr-aside{width:360px;flex:none;display:flex;flex-direction:column;gap:14px;overflow-y:auto;padding-right:4px}
        .vx-pr-aside>*,.vx-pr-main>*{flex-shrink:0}
        .vx-pr-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .vx-pr-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        @media (max-width:1180px){.vx-pr-body{flex-direction:column;overflow:auto}.vx-pr-main,.vx-pr-aside{overflow:visible;width:auto}.vx-pr-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.vx-pr-tools{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
      <section className="vx-suspensa" style={{ width: '100%', maxWidth: 1680, height: '100%', borderRadius: 24, background: `linear-gradient(${AZ.bg}ee, ${AZ.bg}f5)`, border: `1px solid ${AZ.line}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: C.txt2, boxShadow: `0 50px 120px -30px rgba(0,0,0,.9), 0 0 80px -40px ${AZ.glow}` }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 24px', borderBottom: `1px solid ${C.line}`, background: AZ.head, flexWrap: 'wrap' }}>
          <span style={{ width: 46, height: 46, borderRadius: 23, background: AZ.dim, border: `2px solid ${AZ.acc}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap className="w-5 h-5" style={{ color: AZ.acc }} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <nav aria-label="Você está em" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
              <button onClick={fechar} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }}>Portal</button>
              <ChevronRight className="w-3 h-3" /><span style={{ color: AZ.acc }}>Prospecção</span>
            </nav>
            <span style={{ fontSize: 24, fontWeight: 600, color: C.txt }}>Prospecção</span>
          </div>
          <div style={{ flex: 1 }} />
          {isAdmin && (
            <div role="tablist" aria-label="Escopo" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(0,0,0,.28)', border: `1px solid ${C.line}` }}>
              {[['equipe', 'Equipe'], ['meu', 'Só eu']].map(([v, l]) => (
                <button key={v} role="tab" aria-selected={escopo === v} onClick={() => setEscopo(v)}
                  style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: escopo === v ? 600 : 500, background: escopo === v ? `linear-gradient(135deg, ${AZ.acc2}, ${AZ.acc})` : 'transparent', color: escopo === v ? '#06122A' : '#B8C0CC' }}>{l}</button>
              ))}
            </div>
          )}
          <button onClick={fechar} className="vx-btn vx-btn-ghost" style={{ height: 40, padding: '0 16px', fontSize: 14 }}><X className="w-4 h-4" /> Voltar ao portal</button>
        </header>

        <div className="vx-pr-body">
          <main className="vx-pr-main">
            {!d ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: 40 }}><Loader2 className="w-5 h-5 animate-spin" /> Montando o dia da prospecção…</div>
            ) : (
              <>
                {/* Hoje */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 19, fontWeight: 600, color: C.txt }}>Hoje{escopo === 'meu' && d.vend?.nome ? ` · ${d.vend.nome}` : ' · equipe'}</div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{new Date(d.hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
                  </div>
                  <Link to={createUrl('FilaContato')} onClick={fechar} className="vx-btn vx-btn-primary" style={{ height: 44, padding: '0 20px', fontSize: 14 }}>
                    <Zap className="w-4 h-4" /> Abrir minha fila de contatos
                  </Link>
                </div>

                <div className="vx-pr-kpis">
                  <Kpi Icon={Phone} titulo="Toques" valor={k.toques} sub={pctMeta != null ? `${pctMeta}% da meta de ${d.meta}` : 'sem meta diária definida'} barra={pctMeta} />
                  <Kpi Icon={MessageCircle} titulo="Conversas" valor={k.conversas} sub={`${taxaConversa}% dos toques · ${k.positivos} positivas`} />
                  <Kpi Icon={CalendarClock} titulo="Agenda de hoje" valor={k.agenda} sub={`${k.agendaFeita} realizados`} />
                  <Kpi Icon={Target} titulo="Leads convertidos no mês" valor={k.convertidos} sub="viraram cliente ou negociação" />
                </div>

                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  <div style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(244,114,182,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flame className="w-5 h-5" style={{ color: '#F472B6' }} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: C.muted }}>Negociações abertas</p>
                      <p style={{ fontSize: 20, fontWeight: 600, color: C.txt }}>{k.pipeQtd} <span style={{ fontSize: 13, color: C.txt2, fontWeight: 400 }}>· {brl(k.pipeValor)}</span></p>
                      <p style={{ fontSize: 12, color: C.muted2 }}>{k.quentes} quentes</p>
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(52,211,153,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Handshake className="w-5 h-5" style={{ color: '#34D399' }} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: C.muted }}>Indicações novas de parceiros</p>
                      <p style={{ fontSize: 20, fontWeight: 600, color: C.txt }}>{k.indicacoes}</p>
                      <p style={{ fontSize: 12, color: C.muted2 }}>aguardando o primeiro atendimento</p>
                    </div>
                    {k.indicacoes > 0 && <Link to={createUrl('DashParceiro') + '?aba=indicacoes'} onClick={fechar} className="vx-btn vx-btn-soft" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>Ver <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
                  </div>
                </div>

                {/* Ritmo da semana */}
                <div style={{ padding: 18, borderRadius: 18, background: C.card, border: `1px solid ${C.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>Ritmo dos últimos 7 dias</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{d.regs.length} toques · {d.regs.filter(r => CONVERSA.includes(r.resultado)).length} conversas</span>
                  </div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={semana} barGap={4}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.muted2, fontSize: 11 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#162033', border: `1px solid ${C.line}`, borderRadius: 10, color: C.txt }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} />
                        <Bar dataKey="Toques" fill={AZ.acc} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Conversas" fill="#34D399" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* Ferramentas */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.txt, marginBottom: 10 }}>Ferramentas da prospecção</div>
              <div className="vx-pr-tools">
                {grupo.items.map(it => {
                  const f = FERRAMENTAS[it.page] || { Icon: it.icon || Users, desc: '', cor: AZ.acc };
                  const Icon = f.Icon;
                  return (
                    <Link key={it.page} to={urlItem(it)} onClick={fechar} className="vx-card-lift"
                      style={{ position: 'relative', padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 132, textDecoration: 'none' }}>
                      <span style={{ width: 44, height: 44, borderRadius: 22, background: f.cor + '1f', border: `1.5px solid ${f.cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon className="w-5 h-5" style={{ color: f.cor }} /></span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.txt }}>{it.name}</span>
                      <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{f.desc}</span>
                      {it.badge > 0 && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ef4444', color: '#fff' }}>{it.badge}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </main>

          <aside className="vx-pr-aside">
            <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy className="w-4 h-4" style={{ color: AZ.acc }} /> {escopo === 'meu' ? 'Meu dia' : 'Ranking de hoje'}</span>
              {!d && <span style={{ fontSize: 13, color: C.muted }}>Carregando…</span>}
              {d && ranking.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nenhum toque registrado hoje ainda.</span>}
              {ranking.map((r, i) => {
                const max = ranking[0]?.toques || 1;
                return (
                  <div key={r.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 15, background: i === 0 ? 'rgba(227,201,130,.18)' : AZ.dim, color: i === 0 ? C.warn : AZ.acc2, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(r.nome)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, fontSize: 13 }}>
                        <span style={{ flex: 1, color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</span>
                        <b style={{ color: C.txt }}>{r.toques}</b>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)', marginTop: 4 }}><div style={{ width: `${(r.toques / max) * 100}%`, height: '100%', borderRadius: 2, background: AZ.acc }} /></div>
                      <span style={{ fontSize: 11, color: C.muted2 }}>{r.conversas} conversas · {r.positivos} positivas</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock className="w-4 h-4" style={{ color: AZ.acc }} /> Agenda de hoje</span>
              {d && d.agenda.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Nada agendado para hoje.</span>}
              {(d?.agenda || []).slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ width: 48, color: AZ.acc2, fontWeight: 600 }}>{a.horario || '—'}</span>
                  <span style={{ flex: 1, minWidth: 0, color: C.txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.lead_nome || 'Contato'}</span>
                  <span style={{ fontSize: 11, color: a.status === 'realizado' ? C.ok : C.muted2 }}>{a.status === 'realizado' ? 'feito' : (a.status || 'pendente').replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.txt, display: 'flex', alignItems: 'center', gap: 8 }}><Activity className="w-4 h-4" style={{ color: AZ.acc }} /> Últimos contatos</span>
              {d && d.doDia.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>Sem contatos hoje.</span>}
              {(d?.doDia || []).slice(0, 10).map(r => {
                const [rl, rc] = RES[r.resultado] || [r.resultado || '—', C.muted];
                return (
                  <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                    <span style={{ width: 38, color: C.muted2 }}>{hora(r.created_date)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', color: C.txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.lead_nome || 'Contato'}</span>
                      <span style={{ color: C.muted2 }}>{escopo === 'equipe' ? `${r.vendedor_nome || ''} · ` : ''}<span style={{ color: rc }}>{rl}</span></span>
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

const createUrl = (page) => urlItem({ page });

function Kpi({ Icon, titulo, valor, sub, barra }) {
  return (
    <div style={{ padding: 16, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}><Icon className="w-4 h-4" style={{ color: AZ.acc }} /> {titulo}</span>
      <span style={{ fontSize: 28, fontWeight: 600, color: C.txt, lineHeight: 1.1 }}>{valor}</span>
      {barra != null && <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}><div style={{ width: `${barra}%`, height: '100%', borderRadius: 3, background: barra >= 100 ? '#34D399' : AZ.acc }} /></div>}
      <span style={{ fontSize: 12, color: C.muted2 }}>{sub}</span>
    </div>
  );
}
