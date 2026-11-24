import { useLocation, useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { CELULA_ESTRUTURADOS } from '@/lib/celulas';

// Botão que abre a célula Produtos Estruturados por cima da página atual.
// A célula vive no endereço (?celula=estruturados), então o "voltar" do
// navegador fecha a célula e o link pode ser compartilhado.
export default function CelulaLauncher({ variant = 'header', onAbrir }) {
  const location = useLocation();
  const navigate = useNavigate();
  const abrir = () => {
    const sp = new URLSearchParams(location.search);
    sp.set('celula', CELULA_ESTRUTURADOS.id);
    navigate({ pathname: location.pathname, search: '?' + sp.toString() });
    onAbrir && onAbrir();
  };

  if (variant === 'mobile') {
    return (
      <button onClick={abrir}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-sm font-semibold"
        style={{ color: '#1A1508', background: '#C9A962' }}>
        <Layers className="w-4 h-4" /> {CELULA_ESTRUTURADOS.nome}
      </button>
    );
  }

  return (
    <button onClick={abrir} title={`Abrir a célula ${CELULA_ESTRUTURADOS.nome}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
      style={{ background: 'rgba(201,169,98,0.14)', color: '#E3C982', border: '1px solid rgba(201,169,98,0.45)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,169,98,0.24)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,169,98,0.14)'; }}>
      <Layers className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">{CELULA_ESTRUTURADOS.nome}</span>
      <span className="lg:hidden">Estruturados</span>
    </button>
  );
}
