import { Link } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, FileText } from 'lucide-react';

export default function ManualModuleDirectory({ collection }) {
  const Icon = collection.icon;
  return (
    <div>
      <header className="mb-8 flex items-start gap-4">
        <span className="manual-icon-tile flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25"><Icon className="h-7 w-7 text-[#9df6e4]" strokeWidth={1.5} /></span>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{collection.label}</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{collection.description}</p>
          <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-primary/90">{collection.modules.length} módulos</span> · {collection.articleCount} artigos</p>
        </div>
      </header>
      <div className="space-y-2.5">
        {collection.modules.map((module) => (
          <details key={module.id} className="manual-module group rounded-xl border border-border/40">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><module.icon className="h-4 w-4" /></span>
              <span className="flex-1 text-sm font-semibold text-foreground">{module.title}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{module.articles.length} artigos</span>
              <ChevronDown className="manual-module-chevron h-4 w-4 shrink-0 text-muted-foreground" />
            </summary>
            <div className="border-t border-primary/10 px-5 py-3 sm:pl-16">
              {module.articles.map((article) => (
                <Link key={article.id} to={article.href} className="manual-row flex items-start gap-3 px-2 py-3 text-sm leading-6 text-foreground/75 hover:text-primary"><FileText className="mt-1 h-3.5 w-3.5 shrink-0 opacity-50" />{article.title}</Link>
              ))}
              <Link to={module.href} className="mt-2 inline-flex items-center gap-2 px-2 py-2 text-xs font-medium text-primary">Ver módulo completo <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}