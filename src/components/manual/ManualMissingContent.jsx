import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function ManualMissingContent() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <div className="py-20 text-center">
      <FileQuestion className="mx-auto mb-5 h-8 w-8 text-muted-foreground" />
      <h1 className="text-2xl font-semibold text-foreground">Conteúdo não encontrado</h1>
      <p className="mt-3 text-sm text-muted-foreground">Esse artigo ou módulo não está disponível neste endereço.</p>
      <Link to="/Manual" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Voltar para o Manual</Link>
    </div>
  );
}