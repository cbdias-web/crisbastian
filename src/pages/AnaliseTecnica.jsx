import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Landmark, Globe2, Wallet, ArrowLeft, BrainCircuit, Sparkles, Loader2, FileDown, History, Gauge, ShieldCheck,
  ListChecks, Layers, ChevronUp, ChevronDown, Plus, Trash2, Lock, PencilLine, WandSparkles, Target, Scale,
  ChartGantt, CheckCircle2, Send, XCircle, ThumbsUp, AlertTriangle, Search, FileText, Paperclip, Save, X, Copy,
  ClipboardCheck, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { PRODUTOS_ESTUDO, STATUS_ESTUDO, checklistDocumentos } from '@/lib/estudoViabilidade';
import { STATUS_PROPOSTA, CLASSIFICACAO, CONDICOES_GERAIS_PADRAO, somaEtapas, brl } from '@/lib/propostaTecnica';

const A = {
  bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', surface3: '#222b3d',
  border: 'rgba(0,212,170,0.15)', borderActive: 'rgba(0,212,170,0.35)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', muted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171', violet: '#a78bfa',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const label = { color: A.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };
const ICONE = { holding: Landmark, offshore: Globe2, conta_internacional: Wallet };
const NIVEL_COR = { alto: '#f87171', medio: '#fbbf24', baixo: '#34d399' };
const ORIGEM = { ia: 'Análise IA', revisao_ia: 'Revisão IA', manual: 'Edição manual' };
const EDITAVEL = ['rascunho', 'em_revisao'];
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const Badge = ({ cor, children }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}55` }}>{children}</span>
);

// ───────────── Campos de edição (fora do componente para manter foco) ─────────────
const TextoEd = ({ titulo, value, onChange, rows = 4, readOnly, placeholder }) => (
  <div>
    {titulo && <p className="mb-1.5" style={label}>{titulo}</p>}
    {readOnly
      ? <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: value ? A.text : A.muted }}>{value || '—'}</p>
      : <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y leading-relaxed" style={inputStyle} />}
  </div>
);

const ListaTexto = ({ titulo, items, onChange, readOnly, addLabel = 'Adicionar item' }) => {
  const l = Array.isArray(items) ? items : [];
  return (
    <div>
      {titulo && <p className="mb-1.5" style={label}>{titulo}</p>}
      {readOnly ? (
        l.length ? <ul className="space-y-1">{l.map((t, i) => <li key={i} className="text-sm flex gap-2"><span style={{ color: A.accent }}>•</span><span>{t}</span></li>)}</ul>
          : <p className="text-sm" style={{ color: A.muted }}>—</p>
      ) : (
        <div className="space-y-1.5">
          {l.map((t, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <textarea value={t} rows={1} onChange={e => onChange(l.map((x, j) => j === i ? e.target.value : x))}
                className="flex-1 px-2.5 py-1.5 text-sm rounded-md focus:outline-none resize-y" style={inputStyle} />
              <button onClick={() => onChange(l.filter((_, j) => j !== i))} className="p-1.5" style={{ color: A.danger }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => onChange([...l, ''])} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold" style={{ background: A.accentDim, color: A.accent }}>
            <Plus className="w-3 h-3" /> {addLabel}
          </button>
        </div>
      )}
    </div>
  );
};

const ListaObjetos = ({ titulo, items, onChange, campos, readOnly, addLabel = 'Adicionar' }) => {
  const l = Array.isArray(items) ? items : [];
  const novo = () => Object.fromEntries(campos.map(c => [c.k, c.opts ? c.opts[0] : '']));
  return (
    <div>
      {titulo && <p className="mb-1.5" style={label}>{titulo}</p>}
      <div className="space-y-2">
        {l.length === 0 && readOnly && <p className="text-sm" style={{ color: A.muted }}>—</p>}
        {l.map((it, i) => (
          <div key={i} className="rounded-xl p-3 relative" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: campos.map(c => c.span || '1fr').join(' ') }}>
              {campos.map(c => (
                <div key={c.k} className="min-w-0">
                  <p className="text-[9.5px] mb-0.5 font-semibold uppercase tracking-wide" style={{ color: A.muted }}>{c.label}</p>
                  {readOnly ? (
                    c.opts ? <Badge cor={NIVEL_COR[it[c.k]] || A.muted}>{(it[c.k] || '—').toUpperCase()}</Badge>
                      : <p className="text-[13px] leading-snug whitespace-pre-wrap">{it[c.k] || '—'}</p>
                  ) : c.opts ? (
                    <select value={it[c.k] || ''} onChange={e => onChange(l.map((x, j) => j === i ? { ...x, [c.k]: e.target.value } : x))}
                      className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none" style={{ ...inputStyle, background: A.surface }}>
                      {c.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <textarea value={it[c.k] || ''} rows={c.rows || 1} onChange={e => onChange(l.map((x, j) => j === i ? { ...x, [c.k]: e.target.value } : x))}
                      className="w-full px-2 py-1.5 text-xs rounded-md focus:outline-none resize-y" style={{ ...inputStyle, background: A.surface }} />
                  )}
                </div>
              ))}
            </div>
            {!readOnly && (
              <button onClick={() => onChange(l.filter((_, j) => j !== i))} className="absolute top-2 right-2" style={{ color: A.danger }}><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button onClick={() => onChange([...l, novo()])} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold" style={{ background: A.accentDim, color: A.accent }}>
            <Plus className="w-3 h-3" /> {addLabel}
          </button>
        )}
      </div>
    </div>
  );
};

const Cartao = ({ titulo, icon: Icon, children, acao }) => (
  <div className="rounded-2xl p-5 space-y-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: A.accent }}>{Icon && <Icon className="w-4 h-4" />} {titulo}</h3>
      {acao}
    </div>
    {children}
  </div>
);

function ScoreRing({ score = 0, cor }) {
  const r = 46, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score));
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="800" fill={A.text}>{Math.round(v)}</text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill={A.muted}>de 100</text>
    </svg>
  );
}

function Gantt({ etapas }) {
  const tot = somaEtapas(etapas).prazo || 1;
  let acc = 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] pl-[30%]" style={{ color: A.muted }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => <span key={f}>D{Math.round(tot * f)}</span>)}
      </div>
      {(etapas || []).map((e, i) => {
        const d = Number(e.prazo_dias) || 0; const left = (acc / tot) * 100; const w = Math.max(2, (d / tot) * 100); acc += d;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-[30%] min-w-0 text-[11px] truncate"><b style={{ color: A.accent }}>{e.fase}</b> <span style={{ color: A.muted }}>{e.titulo}</span></div>
            <div className="flex-1 h-5 rounded-md relative" style={{ background: A.surface2 }}>
              <div className="absolute top-0 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ left: `${left}%`, width: `${w}%`, background: i % 2 ? '#3b82f6' : A.accent, color: '#0d1117' }}>{d}d</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════ PÁGINA ═══════════════════════════════
export default function AnaliseTecnica() {
  const loc = useLocation();
  const estudoId = new URLSearchParams(loc.search).get('estudo');
  return estudoId ? <Workspace key={estudoId} estudoId={estudoId} /> : <Painel />;
}

// ───────────── Painel (lista) ─────────────
function Painel() {
  const nav = useNavigate();
  const [estudos, setEstudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    base44.entities.EstudoViabilidade.list('-updated_date', 500)
      .then(l => setEstudos((l || []).filter(e => ['recebido', 'em_analise_tecnica', 'concluido'].includes(e.status) || e.proposta_atual_id)))
      .catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  const kpi = useMemo(() => {
    const aguard = estudos.filter(e => !e.proposta_atual_id && e.status === 'recebido').length;
    const emAn = estudos.filter(e => e.proposta_atual_id && ['rascunho', 'em_revisao', 'aprovada'].includes(e.proposta_status)).length;
    const env = estudos.filter(e => e.proposta_status === 'enviada_cliente').length;
    const ac = estudos.filter(e => e.proposta_status === 'aceita').length;
    const dec = estudos.filter(e => ['aceita', 'recusada'].includes(e.proposta_status)).length;
    const sc = estudos.filter(e => e.score_viabilidade != null);
    return { aguard, emAn, env, ac, conv: dec ? Math.round((ac / dec) * 100) : null, score: sc.length ? Math.round(sc.reduce((s, e) => s + e.score_viabilidade, 0) / sc.length) : null };
  }, [estudos]);

  const lista = estudos.filter(e => {
    if (filtro === 'aguardando' && (e.proposta_atual_id || e.status !== 'recebido')) return false;
    if (filtro === 'andamento' && !['rascunho', 'em_revisao', 'aprovada'].includes(e.proposta_status)) return false;
    if (filtro === 'enviadas' && e.proposta_status !== 'enviada_cliente') return false;
    if (filtro === 'decididas' && !['aceita', 'recusada'].includes(e.proposta_status)) return false;
    if (busca && !`${e.cliente_nome} ${e.cliente_documento} ${e.responsavel_nome}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const KPIS = [
    { k: 'Aguardando análise', v: kpi.aguard, cor: A.gold },
    { k: 'Propostas em elaboração', v: kpi.emAn, cor: '#60a5fa' },
    { k: 'Enviadas ao cliente', v: kpi.env, cor: A.violet },
    { k: 'Aceitas', v: kpi.ac, cor: '#34d399' },
    { k: 'Conversão', v: kpi.conv == null ? '—' : `${kpi.conv}%`, cor: A.accent },
    { k: 'Score médio', v: kpi.score ?? '—', cor: A.accent },
  ];
  const FILTROS = [['todos', 'Todos'], ['aguardando', 'Aguardando análise'], ['andamento', 'Em elaboração'], ['enviadas', 'Enviadas'], ['decididas', 'Decididas']];

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: A.text }}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: A.accent }}>Comercial · Estudos técnicos</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BrainCircuit className="w-6 h-6" style={{ color: A.accent }} /> Análise Técnica e Propostas</h1>
        <p className="text-xs mt-1" style={{ color: A.muted }}>O motor de IA avalia o formulário e os documentos do cliente e gera a proposta técnica executiva, com etapas, prazos e investimento. Cada revisão gera uma nova versão.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPIS.map(k => (
          <div key={k.k} className="rounded-2xl p-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: A.muted }}>{k.k}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: k.cor }}>{k.v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: A.muted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou consultor..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
        </div>
        {FILTROS.map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={filtro === k ? { background: A.accent, color: '#0d1117' } : { background: A.surface, color: A.muted, border: `1px solid ${A.border}` }}>{l}</button>
        ))}
      </div>
      {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: A.accent }} /></div>
        : lista.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2" style={{ color: A.muted }} />
            <p className="text-sm" style={{ color: A.muted }}>Nenhum estudo neste filtro. Os formulários recebidos em Estudo de Viabilidade aparecem aqui.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lista.map(e => {
              const Icon = ICONE[e.produto] || Landmark; const cl = CLASSIFICACAO[e.classificacao_viabilidade];
              const sp = STATUS_PROPOSTA[e.proposta_status];
              return (
                <button key={e.id} onClick={() => nav(`/AnaliseTecnica?estudo=${e.id}`)} className="text-left rounded-2xl p-4 transition hover:-translate-y-0.5"
                  style={{ background: A.surface, border: `1px solid ${A.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: A.accentDim }}><Icon className="w-4 h-4" style={{ color: A.accent }} /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{e.cliente_nome}</p>
                        <p className="text-[11px]" style={{ color: A.muted }}>{PRODUTOS_ESTUDO[e.produto]?.nome} · {e.tipo_cliente}</p>
                      </div>
                    </div>
                    {e.score_viabilidade != null && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-extrabold leading-none" style={{ color: cl?.cor || A.text }}>{Math.round(e.score_viabilidade)}</p>
                        <p className="text-[9px]" style={{ color: A.muted }}>score</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {sp ? <Badge cor={sp.cor}>v{e.proposta_versao} · {sp.label}</Badge> : <Badge cor={A.gold}>Aguardando análise</Badge>}
                    {cl && <Badge cor={cl.cor}>{cl.label}</Badge>}
                  </div>
                  <p className="text-[10.5px] mt-2" style={{ color: A.muted }}>{e.responsavel_nome || '—'} · atualizado {fmtData(e.updated_date)}</p>
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ───────────── Workspace do estudo ─────────────
const ETAPAS_IA = ['Lendo formulário e documentos', 'Avaliando viabilidade e riscos', 'Desenhando a estrutura recomendada', 'Estimando etapas, prazos e investimento', 'Redigindo a proposta executiva'];

function Workspace({ estudoId }) {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [estudo, setEstudo] = useState(null);
  const [versoes, setVersoes] = useState([]);
  const [selId, setSelId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('resumo');
  const [loading, setLoading] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [passoIA, setPassoIA] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [revisaoAberta, setRevisaoAberta] = useState(false);
  const timer = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;
  const sel = versoes.find(v => v.id === selId) || null;
  const editavel = sel && EDITAVEL.includes(sel.status);
  const c = draft || {};

  const carregar = async (preferId) => {
    const [e, vs] = await Promise.all([
      base44.entities.EstudoViabilidade.get(estudoId),
      base44.entities.PropostaTecnica.filter({ estudo_id: estudoId }, '-versao', 100),
    ]);
    setEstudo(e); setVersoes(vs || []);
    const alvo = (vs || []).find(v => v.id === (preferId || e?.proposta_atual_id)) || (vs || [])[0];
    if (alvo) { setSelId(alvo.id); setDraft(JSON.parse(JSON.stringify(alvo.conteudo || {}))); setDirty(false); }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    carregar().catch(e => toast.error(e.message)).finally(() => setLoading(false));
    return () => clearInterval(timer.current);
  }, [estudoId]);

  useEffect(() => {
    const h = (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = (k, v) => { setDraft(d => ({ ...d, [k]: v })); setDirty(true); };
  const setER = (k, v) => set('estrutura_recomendada', { ...(c.estrutura_recomendada || {}), [k]: v });

  const selecionar = (v) => {
    if (dirty && !confirm('Há alterações não salvas. Descartar?')) return;
    setSelId(v.id); setDraft(JSON.parse(JSON.stringify(v.conteudo || {}))); setDirty(false);
  };

  const rodarIA = async (payload) => {
    setRodando(true); setPassoIA(0);
    timer.current = setInterval(() => setPassoIA(p => Math.min(p + 1, ETAPAS_IA.length - 1)), 9000);
    try {
      const res = await base44.functions.invoke('analisarEstudoViabilidade', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      await carregar(res.data.proposta.id);
      toast.success(`Proposta v${res.data.proposta.versao} gerada. Revise antes de enviar.`);
      setTab('resumo');
    } catch (e) { toast.error('Falha na análise: ' + (e?.response?.data?.error || e.message)); }
    clearInterval(timer.current); setRodando(false);
  };

  const salvar = async () => {
    if (!sel) return;
    setSalvando(true);
    try {
      await base44.entities.PropostaTecnica.update(sel.id, { conteudo: draft });
      setVersoes(vs => vs.map(v => v.id === sel.id ? { ...v, conteudo: draft } : v));
      setDirty(false); toast.success('Proposta salva.');
    } catch (e) { toast.error('Erro ao salvar: ' + e.message); }
    setSalvando(false);
  };

  const mudarStatus = async (status, extra = {}) => {
    if (dirty) await salvar();
    const now = new Date().toISOString();
    const dados = { status, ...extra };
    if (status === 'aprovada') Object.assign(dados, { aprovada_por: user?.full_name || user?.email, aprovada_em: now });
    if (status === 'enviada_cliente') dados.enviada_em = now;
    if (['aceita', 'recusada'].includes(status)) dados.decisao_em = now;
    try {
      await base44.entities.PropostaTecnica.update(sel.id, dados);
      const updE = { proposta_status: status, proposta_atual_id: sel.id, proposta_versao: sel.versao };
      if (status === 'aceita') updE.status = 'concluido';
      await base44.entities.EstudoViabilidade.update(estudoId, updE);
      await carregar(sel.id);
      toast.success(`Proposta: ${STATUS_PROPOSTA[status].label}`);
    } catch (e) { toast.error(e.message); }
  };

  const gerarPdf = async () => {
    if (dirty) await salvar();
    setGerandoPdf(true);
    try {
      const res = await base44.functions.invoke('gerarPropostaTecnicaPDF', { proposta_id: sel.id });
      if (res?.data?.error) throw new Error(res.data.error);
      setVersoes(vs => vs.map(v => v.id === sel.id ? { ...v, pdf_url: res.data.pdf_url, pdf_gerado_em: new Date().toISOString() } : v));
      window.open(res.data.pdf_url, '_blank');
      toast.success('PDF gerado.');
    } catch (e) { toast.error('Erro ao gerar PDF: ' + (e?.response?.data?.error || e.message)); }
    setGerandoPdf(false);
  };

  if (loading) return <div className="p-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin" style={{ color: A.accent }} /></div>;
  if (!estudo) return <div className="p-10 text-center" style={{ color: A.muted }}>Estudo não encontrado.</div>;

  const prod = PRODUTOS_ESTUDO[estudo.produto];
  const Icon = ICONE[estudo.produto] || Landmark;
  const tot = somaEtapas(c.etapas);
  const cl = CLASSIFICACAO[sel?.classificacao];
  const docs = estudo.documentos || [];
  const notas = sel?.notas_internas_ia || {};

  const TABS = [
    ['resumo', 'Resumo executivo', Target], ['diagnostico', 'Diagnóstico', Search], ['estrutura', 'Estrutura', Layers],
    ['riscos', 'Riscos', ShieldCheck], ['etapas', 'Etapas e investimento', ChartGantt], ['condicoes', 'Premissas e condições', Scale],
    ['cliente', 'Dados do cliente', User],
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24" style={{ color: A.text }}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => { if (!dirty || confirm('Descartar alterações não salvas?')) nav('/AnaliseTecnica'); }} className="mt-1 p-2 rounded-lg" style={{ background: A.surface, border: `1px solid ${A.border}` }}><ArrowLeft className="w-4 h-4" /></button>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: A.accentDim }}><Icon className="w-5 h-5" style={{ color: A.accent }} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: A.accent }}>Análise Técnica · {prod?.titulo}</p>
            <h1 className="text-xl font-bold">{estudo.cliente_nome}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge cor={STATUS_ESTUDO[estudo.status]?.cor || A.muted}>Estudo: {STATUS_ESTUDO[estudo.status]?.label}</Badge>
              {sel && <Badge cor={STATUS_PROPOSTA[sel.status].cor}>{sel.codigo} · {STATUS_PROPOSTA[sel.status].label}</Badge>}
              <span className="text-[11px]" style={{ color: A.muted }}>{estudo.tipo_cliente === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} · {estudo.responsavel_nome}</span>
            </div>
          </div>
        </div>
        {sel && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRevisaoAberta(true)} disabled={rodando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold" style={inputStyle}>
              <History className="w-3.5 h-3.5" /> Revisar / nova versão
            </button>
            <button onClick={gerarPdf} disabled={gerandoPdf || rodando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60" style={{ background: A.accent, color: '#0d1117' }}>
              {gerandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Gerar PDF executivo
            </button>
          </div>
        )}
      </div>

      {/* Estado: IA rodando */}
      {rodando && (
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.10), #161b22)', border: `1px solid ${A.borderActive}` }}>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 animate-pulse" style={{ color: A.accent }} />
            <p className="font-bold">O motor de IA está trabalhando na análise…</p>
            <span className="text-[11px]" style={{ color: A.muted }}>pode levar até 2 minutos</span>
          </div>
          <div className="grid sm:grid-cols-5 gap-2">
            {ETAPAS_IA.map((t, i) => (
              <div key={t} className="rounded-lg p-2.5 text-[11px] flex items-center gap-1.5" style={{ background: A.surface2, color: i <= passoIA ? A.text : A.muted, border: `1px solid ${i === passoIA ? A.accent : A.border}` }}>
                {i < passoIA ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: A.accent }} /> : i === passoIA ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: A.accent }} /> : <span className="w-3.5 h-3.5 rounded-full border flex-shrink-0" style={{ borderColor: A.muted }} />}
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado: sem análise */}
      {!sel && !rodando && (
        <div className="rounded-2xl p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><BrainCircuit className="w-5 h-5" style={{ color: A.accent }} /> Iniciar Análise Técnica</h2>
            <p className="text-sm mt-1.5" style={{ color: A.muted }}>O motor de IA vai considerar as respostas do formulário, os documentos anexados e as diretrizes técnicas de {prod?.nome} para gerar a primeira versão da proposta: score de viabilidade, diagnóstico, estrutura recomendada, riscos, etapas com prazos e faixas de investimento.</p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <Badge cor={A.accent}>{Object.keys(estudo.respostas || {}).length} respostas</Badge>
              <Badge cor={A.accent}>{docs.length} documentos</Badge>
              {estudo.status !== 'recebido' && estudo.status !== 'em_analise_tecnica' && <Badge cor={A.gold}>Formulário ainda não concluído pelo cliente</Badge>}
            </div>
          </div>
          <button onClick={() => rodarIA({ action: 'analisar', estudo_id: estudoId })} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold" style={{ background: A.accent, color: '#0d1117' }}>
            <Sparkles className="w-4 h-4" /> Rodar análise com IA
          </button>
        </div>
      )}

      {sel && !rodando && (
        <div className="grid xl:grid-cols-[300px_1fr] gap-4 items-start">
          {/* Coluna lateral */}
          <div className="space-y-4 xl:sticky xl:top-4">
            <div className="rounded-2xl p-5 flex flex-col items-center text-center" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="self-start mb-1" style={label}><Gauge className="w-3 h-3 inline mr-1" />Viabilidade</p>
              <ScoreRing score={sel.score_viabilidade} cor={cl?.cor || A.accent} />
              {cl && <Badge cor={cl.cor}>{cl.label}</Badge>}
              <div className="grid grid-cols-3 gap-2 w-full mt-4">
                {[['Prazo', `${tot.prazo}d`], ['Etapas', (c.etapas || []).length], ['Docs', docs.length]].map(([k, v]) => (
                  <div key={k} className="rounded-lg py-2" style={{ background: A.surface2 }}>
                    <p className="text-[9.5px] uppercase" style={{ color: A.muted }}>{k}</p><p className="font-bold text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <div className="w-full rounded-lg p-2.5 mt-2" style={{ background: A.surface2 }}>
                <p className="text-[9.5px] uppercase" style={{ color: A.muted }}>Investimento estimado</p>
                <p className="font-bold text-sm" style={{ color: A.accent }}>{tot.max ? `${brl(tot.min)} – ${brl(tot.max)}` : '—'}</p>
              </div>
            </div>

            {/* Fluxo de status */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p style={label}>Fluxo da proposta</p>
              {EDITAVEL.includes(sel.status) && (
                <button onClick={() => mudarStatus('aprovada')} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold" style={{ background: '#60a5fa', color: '#0d1117' }}>
                  <ThumbsUp className="w-3.5 h-3.5" /> Aprovar internamente
                </button>
              )}
              {sel.status === 'aprovada' && (
                <button onClick={() => mudarStatus('enviada_cliente')} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold" style={{ background: A.violet, color: '#0d1117' }}>
                  <Send className="w-3.5 h-3.5" /> Marcar como enviada ao cliente
                </button>
              )}
              {['aprovada', 'enviada_cliente'].includes(sel.status) && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => mudarStatus('aceita')} className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold" style={{ background: '#34d399', color: '#0d1117' }}><CheckCircle2 className="w-3.5 h-3.5" /> Aceita</button>
                  <button onClick={() => { const o = prompt('Motivo da recusa (opcional):'); if (o !== null) mudarStatus('recusada', { decisao_observacao: o }); }} className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(248,113,113,0.15)', color: A.danger, border: '1px solid rgba(248,113,113,0.35)' }}><XCircle className="w-3.5 h-3.5" /> Recusada</button>
                </div>
              )}
              {sel.status === 'aprovada' && isAdmin && (
                <button onClick={() => mudarStatus('em_revisao')} className="w-full text-[11px] py-1.5 rounded-lg" style={{ color: A.muted }}>Voltar para revisão</button>
              )}
              {!editavel && (
                <p className="text-[11px] flex items-start gap-1.5 pt-1" style={{ color: A.muted }}><Lock className="w-3 h-3 mt-0.5 flex-shrink-0" /> Esta versão está bloqueada para preservar o histórico. Use "Revisar / nova versão" para alterar.</p>
              )}
              {sel.pdf_url && (
                <a href={sel.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] pt-1 hover:underline" style={{ color: A.accent }}>
                  <FileText className="w-3.5 h-3.5" /> Último PDF desta versão ({fmtData(sel.pdf_gerado_em)})
                </a>
              )}
            </div>

            {/* Versões */}
            <div className="rounded-2xl p-4" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <p className="mb-2" style={label}><History className="w-3 h-3 inline mr-1" />Versões ({versoes.length})</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {versoes.map(v => (
                  <button key={v.id} onClick={() => selecionar(v)} className="w-full text-left rounded-lg p-2.5 transition"
                    style={{ background: v.id === selId ? A.accentDim : A.surface2, border: `1px solid ${v.id === selId ? A.accent : 'transparent'}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">v{v.versao} <span className="font-normal" style={{ color: A.muted }}>· {ORIGEM[v.origem] || v.origem}</span></span>
                      <Badge cor={STATUS_PROPOSTA[v.status]?.cor || A.muted}>{STATUS_PROPOSTA[v.status]?.label}</Badge>
                    </div>
                    <p className="text-[10.5px] mt-1" style={{ color: A.muted }}>{fmtData(v.created_date)} · score {Math.round(v.score_viabilidade || 0)}</p>
                    {v.motivo_revisao && <p className="text-[10.5px] mt-0.5 line-clamp-2" style={{ color: A.text }}>“{v.motivo_revisao}”</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas internas da IA */}
            <NotasInternas notas={notas} />
          </div>

          {/* Área principal */}
          <div className="space-y-4 min-w-0">
            {!editavel && (
              <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2" style={{ background: A.goldDim, border: '1px solid rgba(251,191,36,0.25)', color: A.gold }}>
                <Lock className="w-3.5 h-3.5" /> Visualizando v{sel.versao} ({STATUS_PROPOSTA[sel.status].label}) — somente leitura.
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TABS.map(([k, l, I]) => (
                <button key={k} onClick={() => setTab(k)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                  style={tab === k ? { background: A.accent, color: '#0d1117' } : { background: A.surface, color: A.muted, border: `1px solid ${A.border}` }}>
                  <I className="w-3.5 h-3.5" /> {l}
                </button>
              ))}
            </div>

            {tab === 'resumo' && (
              <>
                <Cartao titulo="Sumário executivo" icon={Target}>
                  {editavel
                    ? <input value={c.titulo_estrutura || ''} onChange={e => set('titulo_estrutura', e.target.value)} placeholder="Título da solução" className="w-full px-3 py-2 text-base font-bold rounded-lg focus:outline-none" style={inputStyle} />
                    : <p className="text-base font-bold">{c.titulo_estrutura}</p>}
                  <TextoEd value={c.sumario_executivo} onChange={v => set('sumario_executivo', v)} rows={8} readOnly={!editavel} />
                  <TextoEd titulo="Leitura da viabilidade" value={c.justificativa_score} onChange={v => set('justificativa_score', v)} rows={3} readOnly={!editavel} />
                </Cartao>
                <Cartao titulo="Contexto e objetivos" icon={ListChecks}>
                  <TextoEd titulo="Contexto" value={c.contexto} onChange={v => set('contexto', v)} rows={5} readOnly={!editavel} />
                  <ListaTexto titulo="Objetivos do cliente" items={c.objetivos_cliente} onChange={v => set('objetivos_cliente', v)} readOnly={!editavel} />
                </Cartao>
                <Cartao titulo="Benefícios esperados" icon={CheckCircle2}>
                  <ListaObjetos items={c.beneficios} onChange={v => set('beneficios', v)} readOnly={!editavel} addLabel="Adicionar benefício"
                    campos={[{ k: 'titulo', label: 'Benefício', span: '1fr' }, { k: 'descricao', label: 'Descrição', span: '2fr', rows: 2 }]} />
                </Cartao>
              </>
            )}

            {tab === 'diagnostico' && (
              <Cartao titulo="Diagnóstico" icon={Search}>
                <ListaObjetos items={c.diagnostico} onChange={v => set('diagnostico', v)} readOnly={!editavel} addLabel="Adicionar achado"
                  campos={[{ k: 'tema', label: 'Tema', span: '1fr' }, { k: 'achado', label: 'Achado', span: '2.4fr', rows: 2 }, { k: 'impacto', label: 'Impacto', span: '110px', opts: ['alto', 'medio', 'baixo'] }]} />
              </Cartao>
            )}

            {tab === 'estrutura' && (
              <>
                <Cartao titulo="Estrutura recomendada" icon={Layers}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {editavel ? (
                      <>
                        <div><p className="mb-1" style={label}>Nome</p><input value={c.estrutura_recomendada?.nome || ''} onChange={e => setER('nome', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} /></div>
                        <div><p className="mb-1" style={label}>Jurisdição / enquadramento</p><input value={c.estrutura_recomendada?.jurisdicao || ''} onChange={e => setER('jurisdicao', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} /></div>
                      </>
                    ) : (
                      <>
                        <div><p style={label}>Nome</p><p className="text-sm font-bold">{c.estrutura_recomendada?.nome || '—'}</p></div>
                        <div><p style={label}>Jurisdição / enquadramento</p><p className="text-sm">{c.estrutura_recomendada?.jurisdicao || '—'}</p></div>
                      </>
                    )}
                  </div>
                  <TextoEd titulo="Descrição" value={c.estrutura_recomendada?.descricao} onChange={v => setER('descricao', v)} rows={5} readOnly={!editavel} />
                  <ListaTexto titulo="Componentes" items={c.estrutura_recomendada?.componentes} onChange={v => setER('componentes', v)} readOnly={!editavel} />
                </Cartao>
                <Cartao titulo="Alternativas avaliadas" icon={Scale}>
                  <ListaObjetos items={c.alternativas} onChange={v => set('alternativas', v)} readOnly={!editavel} addLabel="Adicionar alternativa"
                    campos={[{ k: 'nome', label: 'Alternativa' }, { k: 'descricao', label: 'Descrição', span: '1.6fr', rows: 2 }, { k: 'motivo', label: 'Por que não é a principal', span: '1.6fr', rows: 2 }]} />
                </Cartao>
              </>
            )}

            {tab === 'riscos' && (
              <Cartao titulo="Riscos e mitigação" icon={ShieldCheck}>
                <ListaObjetos items={c.riscos} onChange={v => set('riscos', v)} readOnly={!editavel} addLabel="Adicionar risco"
                  campos={[{ k: 'risco', label: 'Risco', span: '1.5fr', rows: 2 }, { k: 'nivel', label: 'Nível', span: '110px', opts: ['alto', 'medio', 'baixo'] }, { k: 'mitigacao', label: 'Mitigação', span: '2fr', rows: 2 }]} />
              </Cartao>
            )}

            {tab === 'etapas' && (
              <>
                <Cartao titulo="Cronograma" icon={ChartGantt}
                  acao={<span className="text-xs font-bold" style={{ color: A.accent }}>{tot.prazo} dias · {brl(tot.min)} – {brl(tot.max)}</span>}>
                  {(c.etapas || []).length ? <Gantt etapas={c.etapas} /> : <p className="text-sm" style={{ color: A.muted }}>Sem etapas.</p>}
                </Cartao>
                <EditorEtapas etapas={c.etapas || []} onChange={v => set('etapas', v)} readOnly={!editavel} />
                <Cartao titulo="Custos recorrentes e de terceiros (fora dos honorários)" icon={Wallet}>
                  <ListaObjetos items={c.custos_recorrentes} onChange={v => set('custos_recorrentes', v)} readOnly={!editavel} addLabel="Adicionar custo"
                    campos={[{ k: 'item', label: 'Item', span: '2fr' }, { k: 'valor', label: 'Valor estimado' }, { k: 'periodicidade', label: 'Periodicidade' }]} />
                </Cartao>
                <Cartao titulo="Success fee" icon={Sparkles}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" disabled={!editavel} checked={!!c.success_fee?.aplicavel} onChange={e => set('success_fee', { ...(c.success_fee || {}), aplicavel: e.target.checked })} style={{ accentColor: A.accent }} />
                    Incluir success fee opcional na proposta
                  </label>
                  {c.success_fee?.aplicavel && <TextoEd value={c.success_fee?.descricao} onChange={v => set('success_fee', { ...(c.success_fee || {}), descricao: v })} rows={3} readOnly={!editavel} placeholder="Ex.: 10% sobre a economia tributária comprovada nos primeiros 12 meses." />}
                </Cartao>
              </>
            )}

            {tab === 'condicoes' && (
              <>
                <Cartao titulo="Premissas e documentação" icon={ListChecks}>
                  <ListaTexto titulo="Premissas adotadas" items={c.premissas} onChange={v => set('premissas', v)} readOnly={!editavel} />
                  <ListaTexto titulo="Documentos e informações pendentes" items={c.documentos_pendentes} onChange={v => set('documentos_pendentes', v)} readOnly={!editavel} />
                  <ListaTexto titulo="Próximos passos" items={c.proximos_passos} onChange={v => set('proximos_passos', v)} readOnly={!editavel} />
                  <ListaTexto titulo="Referências normativas" items={c.base_legal} onChange={v => set('base_legal', v)} readOnly={!editavel} />
                </Cartao>
                <Cartao titulo="Condições gerais" icon={Scale}
                  acao={editavel && <button onClick={() => set('condicoes_gerais', CONDICOES_GERAIS_PADRAO)} className="text-[11px]" style={{ color: A.muted }}>Restaurar padrão</button>}>
                  <ListaTexto items={c.condicoes_gerais || CONDICOES_GERAIS_PADRAO} onChange={v => set('condicoes_gerais', v)} readOnly={!editavel} />
                  <div className="flex items-center gap-2 text-sm">
                    <span style={label}>Validade</span>
                    <input type="number" min={1} disabled={!editavel} value={sel.validade_dias || 15}
                      onChange={async e => { const v = Number(e.target.value) || 15; await base44.entities.PropostaTecnica.update(sel.id, { validade_dias: v }); setVersoes(vs => vs.map(x => x.id === sel.id ? { ...x, validade_dias: v } : x)); }}
                      className="w-20 px-2 py-1 text-sm rounded-md" style={inputStyle} /> dias
                  </div>
                </Cartao>
              </>
            )}

            {tab === 'cliente' && <DadosCliente estudo={estudo} />}
          </div>
        </div>
      )}

      {/* Barra de salvar */}
      {dirty && editavel && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl"
          style={{ background: A.surface3, border: `1px solid ${A.borderActive}` }}>
          <span className="text-xs flex items-center gap-1.5"><PencilLine className="w-3.5 h-3.5" style={{ color: A.gold }} /> Alterações não salvas em v{sel.versao}</span>
          <button onClick={() => { setDraft(JSON.parse(JSON.stringify(sel.conteudo || {}))); setDirty(false); }} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: A.muted }}>Descartar</button>
          <button onClick={salvar} disabled={salvando} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: A.accent, color: '#0d1117' }}>
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
          </button>
        </div>
      )}

      {revisaoAberta && sel && (
        <RevisaoModal versao={sel} onClose={() => setRevisaoAberta(false)}
          onIA={(motivo, instrucoes) => { setRevisaoAberta(false); rodarIA({ action: 'revisar', estudo_id: estudoId, proposta_id: sel.id, motivo, instrucoes }); }}
          onManual={async (motivo) => {
            setRevisaoAberta(false);
            try {
              if (dirty) await salvar();
              const res = await base44.functions.invoke('analisarEstudoViabilidade', { action: 'nova_versao', proposta_id: sel.id, motivo });
              if (res?.data?.error) throw new Error(res.data.error);
              await carregar(res.data.proposta.id);
              toast.success(`v${res.data.proposta.versao} criada para edição.`);
            } catch (e) { toast.error(e.message); }
          }}
          onReanalisar={() => { setRevisaoAberta(false); rodarIA({ action: 'analisar', estudo_id: estudoId }); }}
        />
      )}
    </div>
  );
}

function EditorEtapas({ etapas, onChange, readOnly }) {
  const upd = (i, k, v) => onChange(etapas.map((e, j) => j === i ? { ...e, [k]: v } : e));
  const mover = (i, d) => { const l = [...etapas]; const t = l[i]; l[i] = l[i + d]; l[i + d] = t; onChange(l.map((e, j) => ({ ...e, fase: `Fase ${j + 1}` }))); };
  const num = (v) => v === '' ? '' : Number(v);
  return (
    <div className="space-y-3">
      {etapas.map((e, i) => (
        <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0" style={{ background: A.accentDim, color: A.accent }}>{i + 1}</span>
            {readOnly ? <p className="font-bold text-sm flex-1">{e.fase} · {e.titulo}</p> : (
              <input value={e.titulo || ''} onChange={ev => upd(i, 'titulo', ev.target.value)} placeholder="Título da etapa" className="flex-1 px-3 py-1.5 text-sm font-bold rounded-lg focus:outline-none" style={inputStyle} />
            )}
            {!readOnly && (
              <div className="flex gap-1">
                <button disabled={i === 0} onClick={() => mover(i, -1)} className="p-1.5 rounded disabled:opacity-30" style={{ color: A.muted }}><ChevronUp className="w-4 h-4" /></button>
                <button disabled={i === etapas.length - 1} onClick={() => mover(i, 1)} className="p-1.5 rounded disabled:opacity-30" style={{ color: A.muted }}><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => onChange(etapas.filter((_, j) => j !== i).map((x, j) => ({ ...x, fase: `Fase ${j + 1}` })))} className="p-1.5" style={{ color: A.danger }}><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['prazo_dias', 'Prazo (dias)'], ['investimento_min', 'Honorários mín. (R$)'], ['investimento_max', 'Honorários máx. (R$)']].map(([k, l]) => (
              <div key={k}>
                <p className="mb-1" style={label}>{l}</p>
                {readOnly ? <p className="text-sm font-bold">{k === 'prazo_dias' ? `${e[k] || 0} dias` : brl(e[k])}</p>
                  : <input type="number" min={0} value={e[k] ?? ''} onChange={ev => upd(i, k, num(ev.target.value))} className="w-full px-2.5 py-1.5 text-sm rounded-md focus:outline-none" style={inputStyle} />}
              </div>
            ))}
          </div>
          <TextoEd titulo="Objetivo" value={e.objetivo} onChange={v => upd(i, 'objetivo', v)} rows={2} readOnly={readOnly} />
          <div className="grid md:grid-cols-2 gap-3">
            <ListaTexto titulo="Atividades" items={e.atividades} onChange={v => upd(i, 'atividades', v)} readOnly={readOnly} addLabel="Atividade" />
            <ListaTexto titulo="Entregáveis" items={e.entregaveis} onChange={v => upd(i, 'entregaveis', v)} readOnly={readOnly} addLabel="Entregável" />
          </div>
        </div>
      ))}
      {!readOnly && (
        <button onClick={() => onChange([...etapas, { fase: `Fase ${etapas.length + 1}`, titulo: '', objetivo: '', atividades: [], entregaveis: [], prazo_dias: 15, investimento_min: 0, investimento_max: 0 }])}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold" style={{ border: `1px dashed ${A.borderActive}`, color: A.accent }}>
          <Plus className="w-4 h-4" /> Adicionar etapa
        </button>
      )}
    </div>
  );
}

function NotasInternas({ notas }) {
  const blocos = [
    ['alertas_compliance', 'Alertas de compliance', A.danger], ['pontos_atencao_comercial', 'Pontos de atenção', A.gold],
    ['objecoes_provaveis', 'Objeções prováveis', '#fb923c'], ['argumentos_venda', 'Argumentos de venda', '#34d399'],
    ['informacoes_faltantes', 'Informações faltantes', '#60a5fa'],
  ].filter(([k]) => (notas?.[k] || []).length);
  if (!blocos.length) return null;
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
      <p style={label}><Lock className="w-3 h-3 inline mr-1" />Notas internas da IA <span className="normal-case font-normal">(não vão ao PDF)</span></p>
      {blocos.map(([k, l, cor]) => (
        <div key={k}>
          <p className="text-[11px] font-bold mb-1" style={{ color: cor }}>{l}</p>
          <ul className="space-y-1">{notas[k].map((t, i) => <li key={i} className="text-[11.5px] leading-snug flex gap-1.5"><span style={{ color: cor }}>•</span>{t}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

function DadosCliente({ estudo }) {
  const r = estudo.respostas || {};
  const docs = estudo.documentos || [];
  const cl = checklistDocumentos(estudo.produto, estudo.tipo_cliente);
  const fmt = (v) => Array.isArray(v) ? (v.length && typeof v[0] === 'object' ? v.map(o => Object.values(o).filter(Boolean).join(' · ')).join('\n') : v.join(' · ')) : v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : String(v);
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <Cartao titulo="Respostas do formulário" icon={User}>
        <dl className="space-y-1.5">
          {Object.entries(r).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2 text-xs py-1" style={{ borderBottom: `1px solid ${A.border}` }}>
              <dt style={{ color: A.muted }}>{k.replace(/_/g, ' ')}</dt><dd className="col-span-2 whitespace-pre-wrap">{fmt(v)}</dd>
            </div>
          ))}
        </dl>
      </Cartao>
      <Cartao titulo={`Documentos (${docs.length})`} icon={Paperclip}>
        <ul className="space-y-2">
          {cl.map(c => {
            const fs = docs.filter(d => d.tipo === c.tipo);
            return (
              <li key={c.tipo} className="text-[11.5px]">
                <p className="flex gap-1.5" style={{ color: fs.length ? A.text : A.muted }}>
                  {fs.length ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#34d399' }} /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.obrigatorio ? A.danger : A.muted }} />}
                  {c.descricao}
                </p>
                {fs.map(f => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="block pl-5 truncate hover:underline" style={{ color: A.accent }}>{f.nome_arquivo}</a>)}
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}

function RevisaoModal({ versao, onClose, onIA, onManual, onReanalisar }) {
  const [motivo, setMotivo] = useState('');
  const [instr, setInstr] = useState('');
  const exigeMotivo = () => { if (!motivo.trim()) { toast.error('Descreva o que mudou na negociação.'); return false; } return true; };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 space-y-4" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4" style={{ color: A.accent }} /> Revisar proposta (base: v{versao.versao})</h3>
          <button onClick={onClose} style={{ color: A.muted }}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs" style={{ color: A.muted }}>A versão atual fica preservada no histórico. A revisão gera uma nova versão em rascunho.</p>
        <div>
          <p className="mb-1" style={label}>O que mudou na negociação? *</p>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Ex.: cliente decidiu não incluir os imóveis rurais; pediu parcelamento dos honorários em 3 etapas; prazo precisa ser de até 60 dias."
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
        </div>
        <div>
          <p className="mb-1" style={label}>Instruções para a IA (opcional)</p>
          <textarea value={instr} onChange={e => setInstr(e.target.value)} rows={2} placeholder="Ex.: reduzir a faixa da Fase 2 em 15% e unir as fases 3 e 4."
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" style={inputStyle} />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <button onClick={() => exigeMotivo() && onIA(motivo, instr)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold" style={{ background: A.accent, color: '#0d1117' }}>
            <WandSparkles className="w-3.5 h-3.5" /> Revisar com IA
          </button>
          <button onClick={() => exigeMotivo() && onManual(motivo)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold" style={inputStyle}>
            <Copy className="w-3.5 h-3.5" /> Nova versão para editar
          </button>
        </div>
        <button onClick={() => confirm('Rodar uma análise do zero com os dados atuais do formulário?') && onReanalisar()} className="w-full text-[11px] py-1" style={{ color: A.muted }}>
          ou refazer a análise completa do zero (ex.: cliente reenviou documentos)
        </button>
      </div>
    </div>
  );
}
