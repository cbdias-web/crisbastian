import { Link } from 'react-router-dom';
import { ArrowLeft, ListTree } from 'lucide-react';

export default function ManualArticleNavigation({ module, article }) {
  return (
    <aside className="border-t border-primary/15 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-1">
      <div className="xl:sticky xl:top-28">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80"><ListTree className="h-3.5 w-3.5" />Neste módulo</p>
        <p className="mb-4 text-sm font-semibold leading-6 text-foreground">{module.title}</p>
        <nav aria-label="Artigos do módulo" className="max-h-[58vh] space-y-1 overflow-y-auto pr-1">
          {module.articles.map((entry) => (
            <Link key={entry.id} to={entry.href} aria-current={entry.id === article.id ? 'page' : undefined} className={`block rounded-md border-l-2 py-2 pl-3 pr-2 text-xs leading-5 transition ${entry.id === article.id ? 'border-primary bg-[linear-gradient(90deg,rgba(0,212,170,0.16),rgba(0,212,170,0.01))] font-medium text-primary shadow-[0_10px_20px_-18px_rgba(0,212,170,0.9)]' : 'border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'}`}>{entry.title}</Link>
          ))}
        </nav>
        <Link to={module.href} className="mt-6 flex items-center gap-2 text-xs font-medium text-primary transition hover:text-[#7ff0d8]"><ArrowLeft className="h-3.5 w-3.5" />Ver todos os artigos</Link>
      </div>
    </aside>
  );
}