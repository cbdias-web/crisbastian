import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

// Barra de navegação em todas as páginas: Voltar (para a tela de origem) + caminho Portal › Bloco › Página.
// O bloco reabre o menu de origem: Prospecção abre o painel; os demais abrem o popup do bloco na capa.
const NOMES_EXTRA = { Inicio: 'Início', Perfil: 'Meu perfil' };

export default function BarraNavegacao({ grupos = [], currentPageName, home = '/Inicio', origem, novoPortal }) {
  const navigate = useNavigate();
  const grupo = grupos.find(g => g.items.some(i => i.page === currentPageName));
  const item = grupo?.items.find(i => i.page === currentPageName);
  const nomePagina = item?.name || NOMES_EXTRA[currentPageName] || String(currentPageName || '').replace(/([a-z])([A-Z])/g, '$1 $2');

  const voltar = () => {
    // Histórico do próprio portal (react-router guarda o índice); sem histórico → tela de origem ou capa
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(origem || home);
  };
  const abrirBloco = () => {
    if (!grupo) return navigate(home);
    if (novoPortal && grupo.label === 'Prospecção') return navigate({ search: '?painel=prospeccao' });
    navigate(novoPortal ? `${home}?bloco=${encodeURIComponent(grupo.label)}` : home);
  };
  const btn = { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' };

  return (
    <nav aria-label="Navegação" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 24px 10px', fontSize: 13, color: '#8E97A8', flexWrap: 'wrap' }}>
      <button onClick={voltar} className="vx-btn vx-btn-ghost" style={{ height: 32, padding: '0 12px', fontSize: 13 }} title="Voltar para a tela anterior">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} aria-hidden="true" />
      <button onClick={() => navigate(novoPortal ? home : createPageUrl('Dashboard'))} style={btn} className="vx-crumb-link"><Home className="w-3.5 h-3.5" /> Portal</button>
      {grupo && (
        <>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <button onClick={abrirBloco} style={btn} className="vx-crumb-link" title={`Abrir o menu ${grupo.label}`}>{grupo.label}</button>
        </>
      )}
      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
      <span style={{ color: '#F4EFE3', fontWeight: 500 }} aria-current="page">{nomePagina}</span>
      <style>{`.vx-crumb-link:hover{color:#F4EFE3;text-decoration:underline}`}</style>
    </nav>
  );
}
