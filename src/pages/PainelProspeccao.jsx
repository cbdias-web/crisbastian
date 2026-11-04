import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, Download, Timer, PhoneCall, CalendarCheck, Trophy, Ban } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { listAll, getConfigFila } from '@/lib/listAll';
import { hojeBrasilia, somaDiasData } from '@/lib/leadUtils';

const A = { bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const CONTATO = ['atendeu_interessado', 'atendeu_retorno', 'atendeu_sem_interesse'];
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

function Kpi({ ic: Ic, l, v, sub, cor = A.accent }) {
  return <div className="rounded-2xl p-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}><div className="flex items-center gap-2 mb-1"><Ic className="w-4 h-4" style={{ color: cor }} /><p className="text-[11px]" style={{ color: A.muted }}>{l}</p></div><p className="text-2xl font-bold" style={{ color: cor }}>{v}</p>{sub && <p className="text-[10px] mt-0.5" style={{ color: A.muted }}>{sub}</p>}</div>;
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
    return { total: regs.length, ligacoes: ligacoes.length, contatoTxt: pct(contatos.length, ligacoes.length), tocados: tocados.size, qualTxt: pct(interessados.size, tocados.size), reunioes, mediaMin, dentro5, nInbound: inbound.length, convertidos, optouts, optTxt: pct(optouts, regs.length), porGerente, cadRows: Object.values(cadRows).sort((a, b) => a.cad.localeCompare(b.cad) || a.passo - b.passo), segs, emAtraso };
  }, [data, ini, hoje]);

  const exportar = () => {
    const linhas = [['Gerente', 'Toques', 'Ligações', 'WhatsApps', 'Taxa de contato', 'Reuniões', 'Toques hoje', 'Meta diária'], ...m.porGerente.map(g => [g.nomeCompleto, g.toques, g.ligacoes, g.whatsapps, g.contato, g.reunioes, g.hoje, g.meta])];
    const csv = '\uFEFF' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `painel_prospeccao_${hoje}.csv`; a.click();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: A.bg }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: A.accent }} /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: A.bg, color: A.muted }}>Acesso restrito a administradores.</div>;

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: A.bg, color: A.text }}>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5" style={{ color: A.accent }} /><h1 className="text-xl font-bold">Painel de Prospecção</h1></div>
          <div className="flex gap-1.5 items-center">
            {[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([d, l]) => <button key={d} onClick={() => setDias(d)} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: dias === d ? 'rgba(0,212,170,0.18)' : A.surface, color: dias === d ? A.accent : A.muted, border: `1px solid ${dias === d ? A.accent : A.border}` }}>{l}</button>)}
            {m && <button onClick={exportar} className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1" style={{ background: A.surface, color: A.accent, border: `1px solid ${A.border}` }}><Download className="w-3.5 h-3.5" /> CSV</button>}
          </div>
        </div>

        {isLoading || !m ? <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: A.accent }} /></div> : (<>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi ic={PhoneCall} l="Toques no período" v={m.total.toLocaleString('pt-BR')} sub={`${m.ligacoes} ligações · taxa de contato ${m.contatoTxt}`} />
            <Kpi ic={Timer} l="Tempo até 1º toque (inbound)" v={m.mediaMin == null ? '—' : `${m.mediaMin} min`} sub={m.nInbound ? `${m.dentro5}/${m.nInbound} dentro de 5 min` : 'sem inbound no período'} cor="#fbbf24" />
            <Kpi ic={CalendarCheck} l="Reuniões marcadas" v={m.reunioes} sub={`qualificação (interessados/tocados): ${m.qualTxt}`} cor="#2dd4bf" />
            <Kpi ic={Trophy} l="Convertidos" v={m.convertidos} sub={`${m.tocados} leads tocados · ${m.emAtraso} em atraso`} cor="#34d399" />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: A.accent }}>Toques por gerente</p>
              <div style={{ height: 220 }}><ResponsiveContainer><BarChart data={m.porGerente}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="nome" tick={{ fill: A.muted, fontSize: 11 }} /><YAxis tick={{ fill: A.muted, fontSize: 11 }} /><Tooltip contentStyle={{ background: A.surface2, border: 'none', color: A.text }} /><Bar dataKey="ligacoes" stackId="a" fill="#60a5fa" name="Ligações" /><Bar dataKey="whatsapps" stackId="a" fill="#34d399" name="WhatsApp" /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: A.accent }}>Meta de hoje por gerente</p>
              {m.porGerente.length === 0 && <p className="text-xs" style={{ color: A.muted }}>Sem toques registrados.</p>}
              {m.porGerente.map(g => <div key={g.id} className="mb-2"><div className="flex justify-between text-[11px]"><span>{g.nomeCompleto}</span><span style={{ color: A.muted }}>{g.hoje}/{g.meta} · contato {g.contato} · {g.reunioes} reuniões</span></div><div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: A.surface2 }}><div className="h-full" style={{ width: `${Math.min(100, (g.hoje / g.meta) * 100)}%`, background: g.hoje >= g.meta ? '#34d399' : A.accent }} /></div></div>)}
            </div>
          </div>

          <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <p className="text-xs font-bold mb-2" style={{ color: A.accent }}>Desempenho por cadência e passo</p>
            <table className="w-full text-xs"><thead><tr style={{ color: A.muted }}>{['Cadência', 'Passo', 'Toques', 'Contatos/respostas', 'Taxa', 'Reuniões'].map(h => <th key={h} className="text-left p-1.5">{h}</th>)}</tr></thead>
              <tbody>{m.cadRows.length === 0 && <tr><td colSpan={6} className="p-3" style={{ color: A.muted }}>Sem toques vinculados a cadências ainda.</td></tr>}{m.cadRows.map((r, i) => <tr key={i} style={{ borderTop: `1px solid ${A.border}` }}><td className="p-1.5">{r.cad}</td><td className="p-1.5">{r.passo}</td><td className="p-1.5">{r.toques}</td><td className="p-1.5">{r.contatos}</td><td className="p-1.5">{pct(r.contatos, r.toques)}</td><td className="p-1.5">{r.reunioes}</td></tr>)}</tbody></table>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: A.accent }}>Funil por segmento (itens atualizados no período)</p>
              <table className="w-full text-xs"><thead><tr style={{ color: A.muted }}>{['Segmento', 'Total', 'Fila', 'Em contato', 'Reunião', 'Qualif.', 'Conv.', 'Nutrição', 'Desq.'].map(h => <th key={h} className="text-left p-1.5">{h}</th>)}</tr></thead>
                <tbody>{m.segs.map(s => <tr key={s.seg} style={{ borderTop: `1px solid ${A.border}` }}><td className="p-1.5 capitalize">{s.seg === 'sem' ? 'sem score' : s.seg}</td><td className="p-1.5">{s.total}</td><td className="p-1.5">{s.pendente}</td><td className="p-1.5">{s.atendeu}</td><td className="p-1.5">{s.reuniao}</td><td className="p-1.5">{s.qualificado}</td><td className="p-1.5">{s.convertido}</td><td className="p-1.5">{s.nutricao}</td><td className="p-1.5">{s.descartado}</td></tr>)}</tbody></table>
            </div>
            <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: A.accent }}>Modelos de mensagem (acumulado)</p>
              <table className="w-full text-xs"><thead><tr style={{ color: A.muted }}>{['Modelo', 'Envios', 'Respostas', 'Taxa'].map(h => <th key={h} className="text-left p-1.5">{h}</th>)}</tr></thead>
                <tbody>{data.modelos.filter(x => (x.envios || 0) > 0).sort((a, b) => (b.respostas || 0) / (b.envios || 1) - (a.respostas || 0) / (a.envios || 1)).map(x => <tr key={x.id} style={{ borderTop: `1px solid ${A.border}` }}><td className="p-1.5">{x.nome}</td><td className="p-1.5">{x.envios}</td><td className="p-1.5">{x.respostas || 0}</td><td className="p-1.5">{pct(x.respostas || 0, x.envios)}</td></tr>)}{!data.modelos.some(x => (x.envios || 0) > 0) && <tr><td colSpan={4} className="p-3" style={{ color: A.muted }}>Sem envios com modelo registrados.</td></tr>}</tbody></table>
              <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: m.optouts ? '#f87171' : A.muted }}><Ban className="w-3.5 h-3.5" /> Opt-outs no período: {m.optouts} ({m.optTxt} dos toques)</p>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
