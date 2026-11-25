import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Briefcase, Zap, LifeBuoy, Settings, Handshake, Layers, Globe2, BarChart3 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { BLOCOS_VISUAL, CELULAS_CAPA } from '@/lib/novoPortal';

export const ICONE_BLOCO = { 'Comercial': Briefcase, 'Prospecção': Zap, 'Apoio': LifeBuoy, 'Admin': Settings, 'Indicador': Handshake };
export const ICONE_CELULA = { estruturados: Layers, internacional: Globe2, cross: BarChart3 };
const OURO = '#C9A962';

export const urlItem = (it) => createPageUrl(it.page) + (it.search || '');

// Avatares no cabeçalho (substituem os menus suspensos na nova capa).
export default function HeaderAvatares({ groups, currentPageName }) {
  const [aberto, setAberto] = useState(null);
  const ref = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { setAberto(null); }, [location.pathname]);

  const abrirPainel = (id) => {
    const sp = new URLSearchParams(location.search);
    sp.set('painel', id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
    setAberto(null);
  };
  const abrirCelula = (id) => {
    const sp = new URLSearchParams(location.search);
    sp.set('celula', id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
    setAberto(null);
  };

  const noInicio = currentPageName === 'Inicio' || location.pathname === '/';

  const Avatar = ({ id, label, Icon, cor, ativo, badge, onClick, title }) => (
    <button onClick={onClick} title={title || label} aria-expanded={aberto === id}
      className="vx-lift flex items-center gap-2 pl-1 pr-3 py-1 rounded-full flex-shrink-0"
      style={{ background: ativo || aberto === id ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${ativo || aberto === id ? cor + '66' : 'transparent'}`, '--vx-glow': cor + '40' }}>
      <span className="vx-av relative w-8 h-8 rounded-full flex items-center justify-center" style={{ background: cor + '22', border: `1.5px solid ${cor}` }}>
        <Icon className="w-4 h-4" style={{ color: cor }} />
        {badge > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', border: '2px solid #0d1117' }} />}
      </span>
      <span className="hidden xl:inline text-sm font-medium" style={{ color: ativo ? '#e6edf3' : 'rgba(230,237,243,0.7)' }}>{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="flex items-center gap-1 relative">
      <Link to="/Inicio" title="Início" className="vx-lift flex items-center gap-2 pl-1 pr-3 py-1 rounded-full flex-shrink-0"
        style={{ background: noInicio ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${noInicio ? '#00D4AA66' : 'transparent'}`, '--vx-glow': 'rgba(0,212,170,0.25)' }}>
        <span className="vx-av w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.14)', border: '1.5px solid #00D4AA' }}>
          <Home className="w-4 h-4" style={{ color: '#00D4AA' }} />
        </span>
        <span className="hidden xl:inline text-sm font-medium" style={{ color: noInicio ? '#e6edf3' : 'rgba(230,237,243,0.7)' }}>Início</span>
      </Link>

      <Avatar id="celulas" label="Células" Icon={Layers} cor={OURO} onClick={() => setAberto(aberto === 'celulas' ? null : 'celulas')} />

      {groups.map(g => {
        const v = BLOCOS_VISUAL[g.label] || BLOCOS_VISUAL.Apoio;
        const Icon = ICONE_BLOCO[g.label] || Briefcase;
        const ativo = g.items.some(i => i.page === currentPageName);
        const badge = g.items.reduce((s, i) => s + (i.badge || 0), 0);
        return <Avatar key={g.label} id={g.label} label={g.label} Icon={Icon} cor={v.cor} ativo={ativo} badge={badge}
          onClick={() => (g.label === 'Prospecção' ? abrirPainel('prospeccao') : setAberto(aberto === g.label ? null : g.label))} />;
      })}

      {aberto && (
        <div className="absolute top-full left-0 mt-3 rounded-2xl p-3 z-50 w-[min(560px,90vw)]"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.55)' }}>
          {aberto === 'celulas' ? (
            <div className="grid grid-cols-1 gap-2">
              {CELULAS_CAPA.map(c => {
                const Icon = ICONE_CELULA[c.id];
                const cor = c.cor || OURO;
                return (
                  <button key={c.id} disabled={!c.ativa} onClick={() => c.ativa && abrirCelula(c.id)}
                    className="vx-card-lift flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: cor + '14', border: `1px solid ${cor}55`, opacity: c.ativa ? 1 : 0.6, cursor: c.ativa ? 'pointer' : 'default', '--vx-acc': cor, '--vx-glow': c.glow }}>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: cor + '24', border: `1.5px solid ${cor}` }}>
                      <Icon className="w-5 h-5" style={{ color: cor }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold" style={{ color: '#F4EFE3' }}>{c.nome}</span>
                      <span className="block text-xs" style={{ color: 'rgba(230,237,243,0.55)' }}>{c.produtos}</span>
                    </span>
                    {!c.ativa && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(230,237,243,0.6)' }}>Em breve</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <BlocoItens grupo={groups.find(g => g.label === aberto)} currentPageName={currentPageName} />
          )}
        </div>
      )}
    </div>
  );
}

export function BlocoItens({ grupo, currentPageName, onNavigate }) {
  if (!grupo) return null;
  const v = BLOCOS_VISUAL[grupo.label] || BLOCOS_VISUAL.Apoio;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {grupo.items.map(it => {
        const Icon = it.icon;
        const ativo = currentPageName === it.page;
        return (
          <Link key={it.page} to={urlItem(it)} onClick={onNavigate}
            className="vx-card-lift relative flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: ativo ? v.fundo : 'rgba(255,255,255,0.03)', border: `1px solid ${ativo ? v.cor + '66' : 'rgba(255,255,255,0.06)'}`, '--vx-acc': v.cor + '88', '--vx-glow': v.cor + '55' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: v.fundo }}>
              {Icon && <Icon className="w-4 h-4" style={{ color: v.cor }} />}
            </span>
            <span className="text-sm font-medium leading-tight" style={{ color: '#e6edf3' }}>{it.name}</span>
            {it.badge > 0 && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: '#fff' }}>
                {it.badge > 9 ? '9+' : it.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
