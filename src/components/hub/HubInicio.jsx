import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { BarChart3, Send, Loader2, MessageCircle, Trash2, ArrowRight, Layers, MessageSquare } from 'lucide-react';
import { BLOCOS_VISUAL, CELULAS_CAPA } from '@/lib/novoPortal';
import { ICONE_BLOCO, ICONE_CELULA, BlocoItens } from './HeaderAvatares';

const OURO = '#C9A962';
const T = { txt: '#e6edf3', muted: 'rgba(230,237,243,0.55)', card: 'rgba(22,27,34,0.88)', line: 'rgba(255,255,255,0.07)', input: 'rgba(13,17,23,0.9)' };

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const iniciais = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const quando = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 60000;
  if (diff < 1) return 'agora';
  if (diff < 60) return `há ${Math.floor(diff)} min`;
  if (diff < 1440) return `há ${Math.floor(diff / 60)} h`;
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export default function HubInicio({ user, groups, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [blocoAberto, setBlocoAberto] = useState(null);
  const [itens, setItens] = useState([]);
  const [estudosAbertos, setEstudosAbertos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [respAberta, setRespAberta] = useState(null);
  const [resposta, setResposta] = useState('');

  const nome = user?.nome_tratamento || user?.full_name || '';
  const autor = { autor_nome: nome || 'Usuário', autor_email: user?.email || '' };

  useEffect(() => {
    Promise.all([
      base44.entities.CelulaComentario.list('-created_date', 200).catch(() => []),
      base44.entities.EstudoViabilidade.list('-updated_date', 500).catch(() => []),
    ]).then(([cs, es]) => {
      setItens(cs || []);
      setEstudosAbertos((es || []).filter(e => e.status !== 'cancelado').length);
    }).finally(() => setCarregando(false));
  }, []);

  const abrirCelula = (id) => {
    const sp = new URLSearchParams(location.search);
    sp.set('celula', id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
  };

  // Mural: publicações da capa + dúvidas das células.
  const mural = useMemo(() => itens
    .filter(c => (c.celula === 'geral' && c.tipo === 'post') || c.tipo === 'duvida')
    .slice(0, 30), [itens]);
  const respostasDe = (id) => itens.filter(c => c.tipo === 'resposta' && c.pai_id === id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const publicar = async () => {
    if (!texto.trim()) return;
    setPublicando(true);
    try {
      const novo = await base44.entities.CelulaComentario.create({ celula: 'geral', tipo: 'post', texto: texto.trim(), origem: 'usuario', ...autor });
      setItens(l => [novo, ...l]);
      setTexto('');
    } catch (e) { toast.error(e.message); }
    setPublicando(false);
  };
  const responder = async (p) => {
    if (!resposta.trim()) return;
    try {
      const novo = await base44.entities.CelulaComentario.create({ celula: p.celula, produto: p.produto, tipo: 'resposta', pai_id: p.id, texto: resposta.trim(), origem: 'usuario', ...autor });
      setItens(l => [novo, ...l]);
      setResposta('');
    } catch (e) { toast.error(e.message); }
  };
  const excluir = async (p) => {
    if (!confirm('Excluir esta publicação?')) return;
    try { await base44.entities.CelulaComentario.delete(p.id); setItens(l => l.filter(x => x.id !== p.id)); }
    catch (e) { toast.error(e.message); }
  };

  const grupoAberto = groups.find(g => g.label === blocoAberto);

  return (
    <div className="px-4 md:px-8 pb-12 max-w-[1440px] mx-auto">
      <style>{`.hub-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px}@media(max-width:1100px){.hub-grid{grid-template-columns:minmax(0,1fr)}}`}</style>

      {/* Boas-vindas */}
      <div className="flex flex-wrap items-end gap-4 pt-4 pb-6">
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm" style={{ color: T.muted }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-3xl font-semibold mt-1" style={{ color: T.txt }}>{saudacao()}{nome ? `, ${nome.split(' ')[0]}` : ''}</h1>
          <p className="text-sm mt-1" style={{ color: T.muted }}>Escolha uma célula ou um bloco para começar, e acompanhe a equipe no mural.</p>
        </div>
        <Link to="/Dashboard" className="flex items-center gap-3 px-5 py-3 rounded-2xl transition"
          style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.35)', color: '#00D4AA' }}>
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm font-semibold">Abrir Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="hub-grid">
        <div className="flex flex-col gap-8 min-w-0">
          {/* Células */}
          <section aria-labelledby="hub-celulas">
            <h2 id="hub-celulas" className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: OURO }}>Células</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CELULAS_CAPA.map(c => {
                const Icon = ICONE_CELULA[c.id];
                return (
                  <button key={c.id} onClick={() => c.ativa && abrirCelula(c.id)} disabled={!c.ativa}
                    className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl transition"
                    style={{ background: c.ativa ? 'rgba(201,169,98,0.08)' : T.card, border: `1px solid ${c.ativa ? 'rgba(201,169,98,0.4)' : T.line}`, cursor: c.ativa ? 'pointer' : 'default', opacity: c.ativa ? 1 : 0.65 }}
                    onMouseEnter={e => { if (c.ativa) e.currentTarget.style.background = 'rgba(201,169,98,0.14)'; }}
                    onMouseLeave={e => { if (c.ativa) e.currentTarget.style.background = 'rgba(201,169,98,0.08)'; }}>
                    <span className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,169,98,0.14)', border: `2px solid ${OURO}` }}>
                      <Icon className="w-9 h-9" style={{ color: OURO }} />
                    </span>
                    <span className="text-base font-semibold" style={{ color: '#F4EFE3' }}>{c.nome}</span>
                    <span className="text-xs leading-relaxed" style={{ color: T.muted }}>{c.produtos}</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: c.ativa ? 'rgba(201,169,98,0.18)' : 'rgba(255,255,255,0.06)', color: c.ativa ? '#E3C982' : T.muted }}>
                      {c.ativa ? (estudosAbertos == null ? 'Entrar na célula' : `${estudosAbertos} ${estudosAbertos === 1 ? 'operação' : 'operações'} · entrar`) : 'Em breve'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Blocos de menu */}
          <section aria-labelledby="hub-blocos">
            <h2 id="hub-blocos" className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00D4AA' }}>Blocos</h2>
            <div className="flex flex-wrap gap-6">
              {groups.map(g => {
                const v = BLOCOS_VISUAL[g.label] || BLOCOS_VISUAL.Apoio;
                const Icon = ICONE_BLOCO[g.label];
                const ativo = blocoAberto === g.label;
                const badge = g.items.reduce((s, i) => s + (i.badge || 0), 0);
                return (
                  <button key={g.label} onClick={() => setBlocoAberto(ativo ? null : g.label)} aria-expanded={ativo}
                    className="flex flex-col items-center gap-2 w-[120px] group">
                    <span className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition"
                      style={{ background: ativo ? v.cor + '33' : v.fundo, border: `2px solid ${ativo ? v.cor : v.cor + '88'}`, boxShadow: ativo ? `0 0 0 4px ${v.cor}22` : 'none' }}>
                      {Icon && <Icon className="w-7 h-7" style={{ color: v.cor }} />}
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>{badge > 9 ? '9+' : badge}</span>
                      )}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: T.txt }}>{g.label}</span>
                    <span className="text-[11px]" style={{ color: T.muted }}>{g.items.length} {g.items.length === 1 ? 'item' : 'itens'}</span>
                  </button>
                );
              })}
            </div>
            {grupoAberto && (
              <div className="mt-5 p-4 rounded-2xl" style={{ background: T.card, border: `1px solid ${(BLOCOS_VISUAL[grupoAberto.label] || BLOCOS_VISUAL.Apoio).cor}44` }}>
                <p className="text-sm mb-3" style={{ color: T.muted }}>{(BLOCOS_VISUAL[grupoAberto.label] || {}).desc}</p>
                <BlocoItens grupo={grupoAberto} />
              </div>
            )}
          </section>
        </div>

        {/* Mural da equipe */}
        <aside className="flex flex-col gap-3 min-w-0">
          <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: T.txt }}>
              <MessageCircle className="w-4 h-4" style={{ color: '#00D4AA' }} /> Mural da equipe
            </h2>
            <div className="flex gap-2 items-start">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#00D4AA,#0066cc)', color: '#fff' }}>{iniciais(nome)}</span>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} placeholder="Compartilhe uma conquista, um aviso ou uma dúvida com a equipe…"
                aria-label="Nova publicação no mural"
                className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none"
                style={{ background: T.input, border: `1px solid ${T.line}`, color: T.txt }} />
            </div>
            <div className="flex justify-end">
              <button onClick={publicar} disabled={publicando || !texto.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                style={{ background: '#00D4AA', color: '#0d1117' }}>
                {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar
              </button>
            </div>
          </div>

          {carregando && <div className="flex items-center gap-2 text-sm p-4" style={{ color: T.muted }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando o mural…</div>}
          {!carregando && mural.length === 0 && (
            <div className="p-4 rounded-2xl text-sm" style={{ background: T.card, border: `1px solid ${T.line}`, color: T.muted }}>
              O mural ainda está vazio. Faça a primeira publicação.
            </div>
          )}
          {mural.map(p => {
            const rs = respostasDe(p.id);
            const aberto = respAberta === p.id;
            const ehDuvida = p.tipo === 'duvida';
            const podeExcluir = isAdmin || p.autor_email === user?.email;
            return (
              <article key={p.id} className="p-4 rounded-2xl flex flex-col gap-2" style={{ background: T.card, border: `1px solid ${ehDuvida ? 'rgba(201,169,98,0.3)' : T.line}` }}>
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: ehDuvida ? 'rgba(201,169,98,0.18)' : 'rgba(0,212,170,0.15)', color: ehDuvida ? '#E3C982' : '#00D4AA' }}>{iniciais(p.autor_nome)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.txt }}>{p.autor_nome}</p>
                    <p className="text-[11px]" style={{ color: T.muted }}>
                      {quando(p.created_date)}{ehDuvida ? ` · dúvida em ${p.celula === 'estruturados' ? 'Produtos estruturados' : p.celula}` : ''}{p.resolvida ? ' · resolvida' : ''}
                    </p>
                  </div>
                  {podeExcluir && p.tipo === 'post' && (
                    <button onClick={() => excluir(p)} aria-label="Excluir publicação" className="p-1.5 rounded-lg" style={{ color: T.muted }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.88)' }}>{p.texto}</p>
                <div className="flex gap-4">
                  <button onClick={() => setRespAberta(aberto ? null : p.id)} className="flex items-center gap-1.5 text-xs" style={{ color: ehDuvida ? '#E3C982' : '#00D4AA' }}>
                    <MessageSquare className="w-3.5 h-3.5" /> {rs.length > 0 ? `${rs.length} ${rs.length === 1 ? 'resposta' : 'respostas'}` : 'Responder'}
                  </button>
                  {ehDuvida && (
                    <button onClick={() => abrirCelula(p.celula)} className="flex items-center gap-1.5 text-xs" style={{ color: T.muted }}>
                      <Layers className="w-3.5 h-3.5" /> Ver na célula
                    </button>
                  )}
                </div>
                {aberto && (
                  <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${T.line}` }}>
                    {rs.map(r => (
                      <p key={r.id} className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.8)' }}>
                        <span className="font-semibold" style={{ color: r.origem === 'ia' ? '#E3C982' : T.txt }}>{r.autor_nome}: </span>{r.texto}
                      </p>
                    ))}
                    <div className="flex gap-2">
                      <input value={resposta} onChange={e => setResposta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') responder(p); }}
                        placeholder="Escreva uma resposta…" aria-label="Responder publicação"
                        className="flex-1 h-9 rounded-lg px-3 text-sm outline-none" style={{ background: T.input, border: `1px solid ${T.line}`, color: T.txt }} />
                      <button onClick={() => responder(p)} aria-label="Enviar resposta" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA' }}>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
