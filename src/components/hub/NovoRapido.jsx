import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Layers, Globe2, BarChart3, UserPlus, Receipt, Target, Briefcase, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import { CELULAS, JORNADAS } from '@/lib/celulas';
import { createPageUrl } from '@/utils';

// "+ Novo" do cabeçalho: toda inserção do portal a partir de qualquer tela.
// Operações abrem a criação dentro da célula do produto (?celula=…&produto=…&nova=1);
// os demais itens abrem a página e acionam o botão padrão de inserção dela ([data-novo]).
const ICONE_CEL = { estruturados: Layers, internacional: Globe2, cross: BarChart3 };
const COR_CEL = { estruturados: '#C9A962', internacional: '#4F8DF5', cross: '#9B87F5' };
const OUTROS = [
  { label: 'Cliente', page: 'Clientes', Icon: UserPlus, cor: '#00D4AA' },
  { label: 'Lead', page: 'MeusClientes', Icon: Target, cor: '#60A5FA' },
  { label: 'Negociação (outros produtos)', page: 'Pipeline', Icon: Briefcase, cor: '#F472B6' },
  { label: 'Venda', page: 'Vendas', Icon: Receipt, cor: '#34D399' },
  { label: 'Chamado de suporte', page: 'Suporte', Icon: LifeBuoy, cor: '#A78BFA' },
];

export default function NovoRapido() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!aberto) return;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const k = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', f); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); window.removeEventListener('keydown', k); };
  }, [aberto]);

  const novaOperacao = (celula, produto) => {
    const sp = new URLSearchParams(location.search);
    sp.set('celula', celula); sp.set('produto', produto); sp.set('nova', '1'); sp.delete('op');
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
    setAberto(false);
  };
  const abrirPagina = (page) => { navigate(createPageUrl(page) + '?novo=1'); setAberto(false); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAberto(a => !a)} className="vx-novo" aria-expanded={aberto} aria-haspopup="menu" title="Inserir: operação, cliente, lead, venda…" style={{ height: 38 }}>
        <Plus className="w-4 h-4" /> Novo
      </button>
      {aberto && (
        <div role="menu" className="vx-suspensa" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 60, width: 'min(520px, 92vw)', borderRadius: 20, background: '#101826', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,.6)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8E97A8' }}>Nova operação</span>
          {Object.values(CELULAS).map(c => {
            const Icon = ICONE_CEL[c.id];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 16, background: COR_CEL[c.id] + '1f', border: `1.5px solid ${COR_CEL[c.id]}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon className="w-4 h-4" style={{ color: COR_CEL[c.id] }} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F4EFE3', marginBottom: 6 }}>{c.nome}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.produtos.map(p => (
                      <button key={p} role="menuitem" onClick={() => novaOperacao(c.id, p)} className="vx-btn vx-btn-soft" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>{JORNADAS[p].nome}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <span style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8E97A8' }}>Cadastros e registros</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6 }}>
            {OUTROS.map(o => (
              <button key={o.page} role="menuitem" onClick={() => abrirPagina(o.page)} className="vx-row-hover"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', color: '#DCE2EA', fontSize: 13 }}>
                <o.Icon className="w-4 h-4" style={{ color: o.cor, flex: 'none' }} /> {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Na página de destino: com ?novo=1, aciona o botão padrão de inserção ([data-novo]) assim que ele aparecer.
export function useAcionarNovo() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('novo') !== '1') return;
    let tentativas = 0;
    const t = setInterval(() => {
      const el = document.querySelector('main [data-novo]');
      tentativas++;
      if (el || tentativas > 40) {
        clearInterval(t);
        sp.delete('novo');
        navigate({ pathname: location.pathname, search: sp.toString() ? '?' + sp.toString() : '' }, { replace: true });
        if (el) el.click(); else toast.error('Você não tem permissão para esta inserção nesta página.');
      }
    }, 100);
    return () => clearInterval(t);
  }, [location.pathname, location.search]);
}
