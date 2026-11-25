import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { BarChart3, Send, Loader2, MessageSquare, Trash2, ArrowRight, X, Layers, Image as ImageIcon } from 'lucide-react';
import { BLOCOS_VISUAL, CELULAS_CAPA } from '@/lib/novoPortal';
import { ICONE_BLOCO, ICONE_CELULA, BlocoItens } from './HeaderAvatares';

const OURO = '#C9A962';
const TEAL = '#00D4AA';
const T = { txt: '#e6edf3', muted: 'rgba(230,237,243,0.55)', card: 'rgba(22,27,34,0.9)', line: 'rgba(255,255,255,0.07)', input: 'rgba(13,17,23,0.9)' };

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
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const corAutor = (nome) => {
  const cores = ['#00D4AA', '#60A5FA', '#A78BFA', '#F59E0B', '#F472B6', '#34D399', '#C9A962'];
  let h = 0; for (const ch of String(nome || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
};

// Janela suspensa usada pelos blocos e pelas conversas do mural.
function Popup({ titulo, cor = TEAL, Icone, onClose, children, largura = 720 }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={titulo}
      style={{ background: 'rgba(3,6,10,0.7)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-3xl flex flex-col max-h-[85vh]" style={{ maxWidth: largura, background: '#121821', border: `1px solid ${cor}55`, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          {Icone && (
            <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: cor + '22', border: `1.5px solid ${cor}` }}>
              <Icone className="w-5 h-5" style={{ color: cor }} />
            </span>
          )}
          <h2 className="flex-1 text-lg font-semibold" style={{ color: T.txt }}>{titulo}</h2>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', color: T.muted }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function HubInicio({ user, groups, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [blocoAberto, setBlocoAberto] = useState(null);
  const [postAberto, setPostAberto] = useState(null);
  const [itens, setItens] = useState([]);
  const [estudosAbertos, setEstudosAbertos] = useState(null);
  const [dash, setDash] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [resposta, setResposta] = useState('');

  const nome = user?.nome_tratamento || user?.full_name || '';
  const autor = { autor_nome: nome || 'Usuário', autor_email: user?.email || '' };

  useEffect(() => {
    const inicioMes = new Date(); inicioMes.setDate(1);
    const ini = inicioMes.toISOString().slice(0, 10);
    Promise.all([
      base44.entities.CelulaComentario.list('-created_date', 200).catch(() => []),
      base44.entities.EstudoViabilidade.list('-updated_date', 500).catch(() => []),
      base44.entities.Venda.list('-data', 1000).catch(() => []),
      base44.entities.Contrato.list('-created_date', 300).catch(() => []),
    ]).then(([cs, es, vs, cts]) => {
      setItens(cs || []);
      setEstudosAbertos((es || []).filter(e => e.status !== 'cancelado').length);
      const vendasMes = (vs || []).filter(v => String(v.data || '') >= ini);
      const contratosAbertos = (cts || []).filter(c => ['rascunho', 'gerado', 'aguardando_pagamento'].includes(c.status)).length;
      setDash({ qtd: vendasMes.length, total: vendasMes.reduce((s, v) => s + (Number(v.valor) || 0), 0), contratosAbertos });
    }).finally(() => setCarregando(false));
  }, []);

  // Prospecção abre como painel imersivo (dash + ferramentas), no padrão das células
  const abrirPainel = (id) => {
    const sp = new URLSearchParams(location.search);
    sp.set('painel', id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
  };
  const abrirCelula = (id) => {
    const sp = new URLSearchParams(location.search);
    sp.set('celula', id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
  };

  const mural = useMemo(() => itens
    .filter(c => (c.celula === 'geral' && c.tipo === 'post') || c.tipo === 'duvida')
    .slice(0, 24), [itens]);
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
    try { await base44.entities.CelulaComentario.delete(p.id); setItens(l => l.filter(x => x.id !== p.id)); setPostAberto(null); }
    catch (e) { toast.error(e.message); }
  };

  const grupoAberto = groups.find(g => g.label === blocoAberto);
  const visualAberto = grupoAberto ? (BLOCOS_VISUAL[grupoAberto.label] || BLOCOS_VISUAL.Apoio) : null;
  const post = postAberto ? itens.find(i => i.id === postAberto) : null;

  return (
    <div className="px-4 md:px-8 pb-14 max-w-[1440px] mx-auto">
      {/* Saudação */}
      <div className="pt-4 pb-6">
        <p className="text-sm capitalize" style={{ color: T.muted }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: T.txt }}>{saudacao()}{nome ? `, ${nome.split(' ')[0]}` : ''}</h1>
      </div>

      {/* Dash + áreas de produto */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <button onClick={() => navigate('/Dashboard')}
          className="vx-card-lift flex flex-col items-center text-center gap-3 p-6 rounded-3xl"
          style={{ background: 'rgba(0,212,170,0.09)', border: '1px solid rgba(0,212,170,0.45)', '--vx-acc': TEAL, '--vx-glow': 'rgba(0,212,170,0.5)' }}>
          <span className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)', border: `2px solid ${TEAL}` }}>
            <BarChart3 className="w-9 h-9" style={{ color: TEAL }} />
          </span>
          <span className="text-base font-semibold" style={{ color: T.txt }}>Dash</span>
          <span className="grid grid-cols-3 gap-2 w-full">
            {[
              ['Vendas no mês', dash ? String(dash.qtd) : '—'],
              ['Valor no mês', dash ? brl(dash.total) : '—'],
              ['Contratos abertos', dash ? String(dash.contratosAbertos) : '—'],
            ].map(([l, v]) => (
              <span key={l} className="flex flex-col gap-0.5 rounded-xl py-2 px-1" style={{ background: 'rgba(13,17,23,0.55)' }}>
                <span className="text-sm font-semibold truncate" style={{ color: TEAL }}>{v}</span>
                <span className="text-[10px] leading-tight" style={{ color: T.muted }}>{l}</span>
              </span>
            ))}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(0,212,170,0.16)', color: TEAL }}>
            Abrir o Dash <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {CELULAS_CAPA.map(c => {
          const Icon = ICONE_CELULA[c.id];
          const cor = c.cor || OURO;
          return (
            <button key={c.id} onClick={() => c.ativa && abrirCelula(c.id)} disabled={!c.ativa}
              className="vx-card-lift flex flex-col items-center text-center gap-3 p-6 rounded-3xl"
              style={{ background: cor + '14', border: `1px solid ${cor}66`, cursor: c.ativa ? 'pointer' : 'default', opacity: c.ativa ? 1 : 0.65, '--vx-acc': cor, '--vx-glow': c.glow || 'rgba(201,169,98,0.5)' }}>
              <span className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: cor + '24', border: `2px solid ${cor}` }}>
                <Icon className="w-9 h-9" style={{ color: cor }} />
              </span>
              <span className="text-base font-semibold" style={{ color: '#F4EFE3' }}>{c.nome}</span>
              <span className="text-xs leading-relaxed" style={{ color: T.muted }}>{c.produtos}</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: cor + '2E', color: cor }}>
                {c.id === 'estruturados' && estudosAbertos != null ? `${estudosAbertos} ${estudosAbertos === 1 ? 'operação' : 'operações'} · entrar` : 'Entrar'} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Avatares dos menus */}
      <div className="flex flex-wrap justify-center gap-8 md:gap-12 py-10">
        {groups.map(g => {
          const v = BLOCOS_VISUAL[g.label] || BLOCOS_VISUAL.Apoio;
          const Icon = ICONE_BLOCO[g.label];
          const badge = g.items.reduce((s, i) => s + (i.badge || 0), 0);
          return (
            <button key={g.label} onClick={() => (g.label === 'Prospecção' ? abrirPainel('prospeccao') : setBlocoAberto(g.label))} className="vx-lift flex flex-col items-center gap-2 w-[120px] py-3 rounded-3xl"
              style={{ '--vx-glow': v.cor + '40' }}>
              <span className="vx-av relative w-[76px] h-[76px] rounded-full flex items-center justify-center"
                style={{ background: v.fundo, border: `2px solid ${v.cor}` }}>
                {Icon && <Icon className="w-8 h-8" style={{ color: v.cor }} />}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>{badge > 9 ? '9+' : badge}</span>
                )}
              </span>
              <span className="text-sm font-semibold" style={{ color: T.txt }}>{g.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mural da equipe */}
      <section aria-labelledby="hub-mural" className="rounded-3xl p-5 md:p-6" style={{ background: 'rgba(22,27,34,0.7)', border: `1px solid ${T.line}` }}>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h2 id="hub-mural" className="text-lg font-semibold flex-1" style={{ color: T.txt }}>Mural da equipe</h2>
        </div>

        <div className="flex items-center gap-3 p-2 pl-3 rounded-full mb-6" style={{ background: T.input, border: `1px solid ${T.line}` }}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: corAutor(nome) + '26', color: corAutor(nome), border: `1.5px solid ${corAutor(nome)}` }}>{iniciais(nome)}</span>
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') publicar(); }}
            placeholder="No que você está trabalhando? Compartilhe uma conquista, um aviso ou uma dúvida…" aria-label="Nova publicação no mural"
            className="flex-1 bg-transparent outline-none text-sm" style={{ color: T.txt }} />
          <button onClick={publicar} disabled={publicando || !texto.trim()}
            className="vx-btn vx-btn-primary h-10 px-5 text-sm">
            {publicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar
          </button>
        </div>

        {carregando && <div className="flex items-center gap-2 text-sm" style={{ color: T.muted }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>}
        {!carregando && mural.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ color: T.muted }}>
            <ImageIcon className="w-8 h-8" />
            <p className="text-sm">Ainda não há publicações. Comece a conversa com a equipe.</p>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {mural.map(p => {
            const rs = respostasDe(p.id);
            const ehDuvida = p.tipo === 'duvida';
            const cor = ehDuvida ? OURO : corAutor(p.autor_nome);
            return (
              <button key={p.id} onClick={() => { setPostAberto(p.id); setResposta(''); }}
                className="vx-card-lift text-left flex flex-col gap-3 p-4 rounded-2xl"
                style={{ background: T.card, border: `1px solid ${T.line}`, borderTop: `3px solid ${cor}`, '--vx-acc': cor + '88', '--vx-glow': cor + '55' }}>
                <span className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cor + '22', color: cor, border: `1.5px solid ${cor}` }}>{iniciais(p.autor_nome)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: T.txt }}>{p.autor_nome}</span>
                    <span className="block text-[11px]" style={{ color: T.muted }}>{quando(p.created_date)}</span>
                  </span>
                  {ehDuvida && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,98,0.15)', color: '#E3C982' }}>{p.resolvida ? 'Dúvida resolvida' : 'Dúvida'}</span>}
                </span>
                <span className="text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.88)' }}>{p.texto}</span>
                <span className="flex items-center gap-1.5 text-xs mt-auto" style={{ color: cor }}>
                  <MessageSquare className="w-3.5 h-3.5" /> {rs.length > 0 ? `${rs.length} ${rs.length === 1 ? 'resposta' : 'respostas'}` : 'Responder'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popup do menu */}
      {grupoAberto && (
        <Popup titulo={grupoAberto.label} cor={visualAberto.cor} Icone={ICONE_BLOCO[grupoAberto.label]} onClose={() => setBlocoAberto(null)}>
          <p className="text-sm mb-4" style={{ color: T.muted }}>{visualAberto.desc}</p>
          <BlocoItens grupo={grupoAberto} onNavigate={() => setBlocoAberto(null)} />
        </Popup>
      )}

      {/* Popup da conversa do mural */}
      {post && (
        <Popup titulo={post.tipo === 'duvida' ? 'Dúvida da equipe' : 'Publicação'} cor={post.tipo === 'duvida' ? OURO : corAutor(post.autor_nome)} onClose={() => setPostAberto(null)} largura={620}>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: corAutor(post.autor_nome) + '22', color: corAutor(post.autor_nome), border: `1.5px solid ${corAutor(post.autor_nome)}` }}>{iniciais(post.autor_nome)}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: T.txt }}>{post.autor_nome}</p>
              <p className="text-[11px]" style={{ color: T.muted }}>{quando(post.created_date)}</p>
            </div>
            {post.tipo === 'duvida' && (
              <button onClick={() => { setPostAberto(null); abrirCelula(post.celula); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(201,169,98,0.15)', color: '#E3C982' }}>
                <Layers className="w-3.5 h-3.5" /> Abrir em Produtos estruturados
              </button>
            )}
            {post.tipo === 'post' && (isAdmin || post.autor_email === user?.email) && (
              <button onClick={() => excluir(post)} aria-label="Excluir publicação" className="p-2 rounded-full" style={{ color: T.muted }}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-5" style={{ color: T.txt }}>{post.texto}</p>
          <div className="flex flex-col gap-3 pt-4" style={{ borderTop: `1px solid ${T.line}` }}>
            {respostasDe(post.id).map(r => (
              <div key={r.id} className="flex gap-2.5">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: (r.origem === 'ia' ? OURO : corAutor(r.autor_nome)) + '22', color: r.origem === 'ia' ? OURO : corAutor(r.autor_nome) }}>{iniciais(r.autor_nome)}</span>
                <div className="flex-1 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs font-semibold" style={{ color: T.txt }}>{r.autor_nome} <span className="font-normal" style={{ color: T.muted }}>· {quando(r.created_date)}</span></p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.85)' }}>{r.texto}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input value={resposta} onChange={e => setResposta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') responder(post); }} autoFocus
                placeholder="Escreva uma resposta…" aria-label="Responder publicação"
                className="flex-1 h-11 rounded-full px-4 text-sm outline-none" style={{ background: T.input, border: `1px solid ${T.line}`, color: T.txt }} />
              <button onClick={() => responder(post)} aria-label="Enviar resposta" className="vx-btn vx-btn-primary w-11 h-11">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}
