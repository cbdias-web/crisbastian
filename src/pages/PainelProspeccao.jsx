import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, Download, Timer, PhoneCall, CalendarCheck, Trophy, Ban } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { listAll, getConfigFila } from '@/lib/listAll';
import { hojeBrasilia, somaDiasData } from '@/lib/leadUtils';

const P = { bg: '#0B111C', card: 'rgba(255,255,255,0.03)', line: 'rgba(255,255,255,0.07)', acc: '#60A5FA', acc2: '#93C5FD', dim: 'rgba(96,165,250,0.12)', txt: '#F4EFE3', txt2: '#C8D0DC', muted: '#8E97A8', muted2: '#7D8799' };
const CONTATO = ['atendeu_interessado', 'atendeu_retorno', 'atendeu_sem_interesse'];
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

function Kpi({ ic: Ic, l, v, sub, cor = P.acc }) {
  return (
    <div style={{ borderRadius: 20, background: P.card, border: `1px solid ${P.line}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: P.muted }}>
        <span style={{ width: 34, height: 34, borderRadius: 17, background: cor + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic className="w-4 h-4" style={{ color: cor }} /></span>{l}
      </span>
      <span style={{ fontSize: 30, fontWeight: 600, color: P.txt, lineHeight: 1.1 }}>{v}</span>
      {sub && <span style={{ fontSize: 12, color: P.muted2 }}>{sub}</span>}
    </div>
  );
}

export default function PainelProspeccao() {
  const [user, setUser] = useState(null);
  const [dias, setDias] = useState(7);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  const hoje = hojeBrasilia();
  const ini = somaDiasData(hoje, -(dias - 1));

  const { data, isLoading } = useQuery({
    queryKey: ['painel-prosp', dias], enabled: isAdmin,
    queryFn: async () => {
      const [regs, cads, modelos, vends, cfg] = await Promise.all([
        listAll(base44.entities.RegistroContato, { data_dia: { $gte: ini } }, '-created_date'),
        base44.entities.Cadencia.list('nome', 100), base44.entities.ModeloMensagem.list('nome', 200),
        base44.entities.Vendedor.filter({ ativo: true }, 'nome', 100), getConfigFila(base44),
      ]);
      let fila = [];
      try { fila = await listAll(base44.entities.FilaContato, { updated_date: { $gte: new Date(`${ini}T00:00:00-03:00`).toISOString() } }, '-updated_date'); }
      catch { fila = await base44.entities.FilaContato.list('-updated_date', 5000); }
      return { regs, cads, modelos, vends, cfg, fila };
    },
  });

  const m = useMemo(() => {
    if (!data) return null;
    const { regs, fila, vends, cads, cfg } = data;
    const ligacoes = regs.filter(r => r.canal === 'ligacao');
    const contatos = ligacoes.filter(r => CONTATO.includes(r.resultado));
    const tocados = new Set(regs.map(r => r.fila_id).filter(Boolean));
    const interessados = new Set(regs.filter(r => ['atendeu_interessado', 'reuniao_marcada'].includes(r.resultado)).map(r => r.fila_id));
    const reunioes = regs.filter(r => r.resultado === 'reuniao_marcada').length;
    const inbound = regs.filter(r => r.primeiro_toque && r.segundos_ate_primeiro_toque != null);
    const mediaMin = inbound.length ? Math.round(inbound.reduce((s, r) => s + r.segundos_ate_primeiro_toque, 0) / inbound.length / 60) : null;
    const dentro5 = inbound.filter(r => r.segundos_ate_primeiro_toque <= 300).length;
    const iniIso = new Date(`${ini}T00:00:00-03:00`).getTime();
    const convertidos = fila.filter(f => f.status === 'convertido' && new Date(f.status_desde || f.updated_date).getTime() >= iniIso).length;
    const optouts = regs.filter(r => r.resultado === 'opt_out').length;

    const porGerente = vends.map(v => {
      const rs = regs.filter(r => r.vendedor_id === v.id); const hojeN = rs.filter(r => r.data_dia === hoje).length;
      const lig = rs.filter(r => r.canal === 'ligacao'); const cont = lig.filter(r => CONTATO.includes(r.resultado));
      return { id: v.id, nome: v.nome.split(' ')[0], nomeCompleto: v.nome, toques: rs.length, ligacoes: lig.length, whatsapps: rs.filter(r => r.canal === 'whatsapp').length, contato: pct(cont.length, lig.length), reunioes: rs.filter(r => r.resultado === 'reuniao_marcada').length, hoje: hojeN, meta: v.meta_diaria_toques || cfg.toques_dia || 80 };
    }).filter(g => g.toques > 0 || g.hoje > 0).sort((a, b) => b.toques - a.toques);

    const cadMap = Object.fromEntries(cads.map(c => [c.id, c.nome]));
    const cadRows = {};
    for (const r of regs) { if (!r.cadencia_id) continue; const k = `${r.cadencia_id}|${(r.passo_cadencia ?? 0) + 1}`; const o = cadRows[k] || (cadRows[k] = { cad: cadMap[r.cadencia_id] || '—', passo: (r.passo_cadencia ?? 0) + 1, toques: 0, contatos: 0, reunioes: 0 }); o.toques++; if (CONTATO.includes(r.resultado) || r.resultado === 'respondeu') o.contatos++; if (r.resultado === 'reuniao_marcada') o.reunioes++; }
    const segs = ['quente', 'morno', 'frio', 'sem'].map(s => { const fs = fila.filter(f => (f.segmento || 'sem') === s); const c = (st) => fs.filter(f => f.status === st).length; return { seg: s, total: fs.length, pendente: c('pendente'), atendeu: c('atendeu'), reuniao: c('reuniao_marcada'), qualificado: c('qualificado'), convertido: c('convertido'), nutricao: c('nutricao'), descartado: c('descartado') }; });
    const emAtraso = fila.filter(f => f.status === 'atendeu' && f.alerta_stale).length;
    return { contatosN: contatos.length, interessadosN: interessados.size, total: regs.length, ligacoes: ligacoes.length, contatoTxt: pct(contatos.length, ligacoes.length), tocados: tocados.size, qualTxt: pct(interessados.size, tocados.size), reunioes, mediaMin, dentro5, nInbound: inbound.length, convertidos, optouts, optTxt: pct(optouts, regs.length), porGerente, cadRows: Object.values(cadRows).sort((a, b) => a.cad.localeCompare(b.cad) || a.passo - b.passo), segs, emAtraso };
  }, [data, ini, hoje]);

  const exportar = () => {
    const linhas = [['Gerente', 'Toques', 'Ligações', 'WhatsApps', 'Taxa de contato', 'Reuniões', 'Toques hoje', 'Meta diária'], ...m.porGerente.map(g => [g.nomeCompleto, g.toques, g.ligacoes, g.whatsapps, g.contato, g.reunioes, g.hoje, g.meta])];
    const csv = '\uFEFF' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `painel_prospeccao_${hoje}.csv`; a.click();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: P.bg }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: P.acc }} /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: P.bg, color: P.muted }}>Acesso restrito a administradores.</div>;

  const funil = m ? [
    ['Toques', m.total, P.acc], ['Ligações', m.ligacoes, '#7FB0FF'], ['Conversas', m.contatosN, '#A78BFA'],
    ['Interessados', m.interessadosN, '#F472B6'], ['Reuniões', m.reunioes, '#F59E0B'], ['Convertidos', m.convertidos, '#34D399'],
  ] : [];
  const SEG_CORES = { pendente: '#64748B', atendeu: P.acc, reuniao: '#F59E0B', qualificado: '#A78BFA', convertido: '#34D399', nutricao: '#2DD4BF', descartado: '#F87171' };
  const SEG_ROT = { pendente: 'Na fila', atendeu: 'Em contato', reuniao: 'Reunião', qualificado: 'Qualificado', convertido: 'Convertido', nutricao: 'Nutrição', descartado: 'Descartado' };
  const card = { borderRadius: 20, background: P.card, border: `1px solid ${P.line}`, padding: 18 };

  return (
    <div className="min-h-screen p-4 md:p-7" style={{ background: P.bg, color: P.txt2 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ width: 52, height: 52, borderRadius: 26, background: P.dim, border: `2px solid ${P.acc}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 className="w-6 h-6" style={{ color: P.acc }} /></span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: P.txt }}>Painel de Prospecção</h1>
            <p style={{ fontSize: 14, color: P.muted, marginTop: 2 }}>Toques, conversas e conversões da equipe — por gerente, cadência e segmento.</p>
          </div>
          <div role="tablist" aria-label="Período" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(0,0,0,.28)', border: `1px solid ${P.line}` }}>
            {[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([d, l]) => (
              <button key={d} role="tab" aria-selected={dias === d} onClick={() => setDias(d)}
                style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: dias === d ? 600 : 500, background: dias === d ? `linear-gradient(135deg, ${P.acc2}, ${P.acc})` : 'transparent', color: dias === d ? '#06122A' : '#B8C0CC' }}>{l}</button>
            ))}
          </div>
          {m && <button onClick={exportar} className="vx-btn vx-btn-soft" style={{ height: 40, padding: '0 16px', fontSize: 13 }}><Download className="w-4 h-4" /> Exportar CSV</button>}
        </header>

        {isLoading || !m ? <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: P.acc }} /></div> : (<>
          {/* Números principais */}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Kpi ic={PhoneCall} l="Toques no período" v={m.total.toLocaleString('pt-BR')} sub={`${m.ligacoes} ligações · contato ${m.contatoTxt}`} cor={P.acc} />
            <Kpi ic={Timer} l="Tempo até o 1º toque (inbound)" v={m.mediaMin == null ? '—' : `${m.mediaMin} min`} sub={m.nInbound ? `${m.dentro5} de ${m.nInbound} em até 5 min` : 'sem inbound no período'} cor="#F59E0B" />
            <Kpi ic={CalendarCheck} l="Reuniões marcadas" v={m.reunioes} sub={`qualificação ${m.qualTxt} dos leads tocados`} cor="#A78BFA" />
            <Kpi ic={Trophy} l="Convertidos" v={m.convertidos} sub={`${m.tocados} leads tocados · ${m.emAtraso} em atraso`} cor="#34D399" />
          </div>

          {/* Funil */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: P.txt }}>Funil do período</span>
              <span style={{ fontSize: 12, color: m.optouts ? '#F87171' : P.muted, display: 'flex', alignItems: 'center', gap: 5 }}><Ban className="w-3.5 h-3.5" /> {m.optouts} opt-outs ({m.optTxt} dos toques)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {funil.map(([l, v, cor], i) => {
                const max = funil[0][1] || 1;
                const w = Math.max(6, (v / max) * 100);
                const ant = i > 0 ? funil[i - 1][1] : null;
                return (
                  <div key={l} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: P.txt2 }}>{l}</span>
                    <div style={{ height: 26, borderRadius: 8, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
                      <div style={{ width: `${w}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${cor}55, ${cor})`, display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 12, fontWeight: 600, color: '#0B1322' }}>{v.toLocaleString('pt-BR')}</div>
                    </div>
                    <span style={{ fontSize: 12, color: P.muted, textAlign: 'right' }}>{ant ? `${pct(v, ant)} da etapa anterior` : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gerentes */}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }} className="vx-pp-grid">
            <div style={card}>
              <p style={{ fontSize: 16, fontWeight: 600, color: P.txt, marginBottom: 10 }}>Toques por gerente</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={m.porGerente} barSize={22}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fill: P.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: P.muted2, fontSize: 11 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#162033', border: `1px solid ${P.line}`, borderRadius: 10, color: P.txt }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: P.muted }} />
                    <Bar dataKey="ligacoes" stackId="a" fill={P.acc} name="Ligações" />
                    <Bar dataKey="whatsapps" stackId="a" fill="#34D399" name="WhatsApp" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: P.txt }}>Meta de hoje</p>
              {m.porGerente.length === 0 && <p style={{ fontSize: 13, color: P.muted }}>Sem toques registrados.</p>}
              {m.porGerente.map(g => {
                const pc = Math.min(100, Math.round((g.hoje / (g.meta || 1)) * 100));
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Anel pct={pc} cor={g.hoje >= g.meta ? '#34D399' : P.acc} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                        <span style={{ flex: 1, color: P.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.nomeCompleto}</span>
                        <b style={{ color: P.txt }}>{g.hoje}<span style={{ color: P.muted, fontWeight: 400 }}>/{g.meta}</span></b>
                      </div>
                      <span style={{ fontSize: 11, color: P.muted2 }}>contato {g.contato} · {g.reunioes} reuniões · {g.toques} toques no período</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cadências */}
          <div style={card}>
            <p style={{ fontSize: 16, fontWeight: 600, color: P.txt, marginBottom: 10 }}>Desempenho por cadência e passo</p>
            {m.cadRows.length === 0 ? <p style={{ fontSize: 13, color: P.muted }}>Sem toques vinculados a cadências ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 90px 1.6fr 90px', gap: 12, fontSize: 11, color: P.muted2, textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px 8px' }}>
                  <span>Cadência</span><span>Passo</span><span>Toques</span><span>Taxa de resposta</span><span>Reuniões</span>
                </div>
                {m.cadRows.map((r, i) => {
                  const tx = r.toques ? Math.round((r.contatos / r.toques) * 100) : 0;
                  return (
                    <div key={i} className="vx-row-hover" style={{ display: 'grid', gridTemplateColumns: '2fr 70px 90px 1.6fr 90px', gap: 12, alignItems: 'center', padding: '9px 4px', borderTop: `1px solid ${P.line}`, fontSize: 13 }}>
                      <span style={{ color: P.txt }}>{r.cad}</span>
                      <span><span style={{ padding: '2px 9px', borderRadius: 999, background: P.dim, color: P.acc2, fontSize: 12 }}>{r.passo}º</span></span>
                      <span>{r.toques}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}><span style={{ display: 'block', width: `${tx}%`, height: '100%', borderRadius: 3, background: tx >= 30 ? '#34D399' : tx >= 15 ? '#F59E0B' : '#F87171' }} /></span>
                        <span style={{ width: 40, textAlign: 'right', color: P.txt2 }}>{tx}%</span>
                      </span>
                      <span>{r.reunioes}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }} className="vx-pp-grid">
            {/* Segmentos */}
            <div style={card}>
              <p style={{ fontSize: 16, fontWeight: 600, color: P.txt }}>Funil por segmento</p>
              <p style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>Leads da fila atualizados no período</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {m.segs.map(sg => (
                  <div key={sg.seg}>
                    <div style={{ display: 'flex', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ flex: 1, color: P.txt, textTransform: 'capitalize' }}>{sg.seg === 'sem' ? 'Sem score' : sg.seg}</span>
                      <span style={{ color: P.muted }}>{sg.total} leads</span>
                    </div>
                    <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                      {Object.keys(SEG_CORES).map(st => {
                        const v = sg[st] || 0;
                        return v ? <span key={st} title={`${SEG_ROT[st]}: ${v}`} style={{ width: `${(v / (sg.total || 1)) * 100}%`, background: SEG_CORES[st] }} /> : null;
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: P.muted }}>
                  {Object.entries(SEG_ROT).map(([k, l]) => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: SEG_CORES[k] }} />{l}</span>)}
                </div>
              </div>
            </div>
            {/* Modelos */}
            <div style={card}>
              <p style={{ fontSize: 16, fontWeight: 600, color: P.txt }}>Modelos de mensagem</p>
              <p style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>Taxa de resposta acumulada</p>
              {!data.modelos.some(x => (x.envios || 0) > 0) && <p style={{ fontSize: 13, color: P.muted }}>Sem envios com modelo registrados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.modelos.filter(x => (x.envios || 0) > 0).sort((a, b) => (b.respostas || 0) / (b.envios || 1) - (a.respostas || 0) / (a.envios || 1)).map(x => {
                  const tx = Math.round(((x.respostas || 0) / (x.envios || 1)) * 100);
                  return (
                    <div key={x.id}>
                      <div style={{ display: 'flex', fontSize: 13, gap: 8 }}>
                        <span style={{ flex: 1, color: P.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.nome}</span>
                        <span style={{ color: P.muted }}>{x.respostas || 0}/{x.envios}</span>
                        <b style={{ color: P.txt, width: 40, textAlign: 'right' }}>{tx}%</b>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.06)', marginTop: 4 }}><div style={{ width: `${tx}%`, height: '100%', borderRadius: 3, background: '#34D399' }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <style>{`@media (max-width:1000px){.vx-pp-grid{grid-template-columns:1fr !important}}`}</style>
        </>)}
      </div>
    </div>
  );
}

function Anel({ pct: p, cor }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 20 20)" />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fill="#F4EFE3" fontWeight="600">{p}%</text>
    </svg>
  );
}
