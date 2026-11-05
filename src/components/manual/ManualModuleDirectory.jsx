import { Link } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, FileText } from 'lucide-react';

export default function ManualModuleDirectory({ collection }) {
  const Icon = collection.icon;
  return (
    <div>
      <header className="mb-8">
        <Icon className="mb-4 h-8 w-8 text-primary" strokeWidth={1.5} />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{collection.label}</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{collection.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{collection.modules.length} módulos · {collection.articleCount} artigos</p>
      </header>
      <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40">
        {collection.modules.map((module) => (
          <details key={module.id} className="manual-module group border-b border-border/30 last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-5 hover:bg-secondary/40">
              <module.icon className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="flex-1 text-sm font-semibold text-foreground">{module.title}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{module.articles.length} artigos</span>
              <ChevronDown className="manual-module-chevron h-4 w-4 shrink-0 text-muted-foreground" />
            </summary>
            <div className="border-t border-border/20 bg-background/40 px-5 py-3 sm:pl-12">
              {module.articles.map((article) => (
                <Link key={article.id} to={article.href} className="flex items-start gap-3 rounded-lg px-2 py-3 text-sm leading-6 text-foreground/75 hover:bg-secondary/40 hover:text-primary"><FileText className="mt-1 h-3.5 w-3.5 shrink-0 opacity-50" />{article.title}</Link>
              ))}
              <Link to={module.href} className="mt-2 inline-flex items-center gap-2 px-2 py-2 text-xs font-medium text-primary">Ver módulo completo <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}