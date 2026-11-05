import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ManualArticleNavigation({ module, article }) {
  return (
    <aside className="border-t border-border/40 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-1">
      <div className="xl:sticky xl:top-28">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Neste módulo</p>
        <p className="mb-4 text-sm font-semibold leading-6 text-foreground">{module.title}</p>
        <nav aria-label="Artigos do módulo" className="max-h-[60vh] space-y-1 overflow-y-auto">
          {module.articles.map((entry) => (
            <Link key={entry.id} to={entry.href} aria-current={entry.id === article.id ? 'page' : undefined} className={`block border-l-2 py-2 pl-3 text-xs leading-5 ${entry.id === article.id ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>{entry.title}</Link>
          ))}
        </nav>
        <Link to={module.href} className="mt-6 flex items-center gap-2 text-xs font-medium text-primary"><ArrowLeft className="h-3.5 w-3.5" />Ver todos os artigos</Link>
      </div>
    </aside>
  );
}