import { Link } from 'react-router-dom';
import { BookOpen, Library } from 'lucide-react';

export default function CategoriasManual({ collections, activeCollection, moduleCount, articleCount }) {
  return (
    <aside className="manual-sidebar border-b border-border/40 lg:border-b-0 lg:border-r">
      <div className="lg:sticky lg:top-24">
        <Link to="/Manual" className="flex items-center gap-3 px-6 py-6 lg:pb-8 lg:pt-8">
          <span className="manual-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 text-primary"><BookOpen className="h-5 w-5" strokeWidth={1.6} /></span>
          <span><span className="block text-base font-semibold tracking-tight text-foreground">Manual</span><span className="text-[11px] text-muted-foreground">Central de conhecimento</span></span>
        </Link>
        <p className="hidden px-6 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:block">Biblioteca da plataforma</p>
        <nav aria-label="Coleções do manual" className="flex gap-1.5 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-8">
          <Link to="/Manual" data-active={!activeCollection} aria-current={!activeCollection ? 'page' : undefined} className="manual-nav-link flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:text-foreground"><Library className="h-4 w-4 shrink-0" />Visão geral</Link>
          {collections.map((collection) => {
            const Icon = collection.icon;
            const active = activeCollection?.id === collection.id;
            return (
              <Link key={collection.id} to={collection.href} data-active={active} aria-current={active ? 'page' : undefined} className="manual-nav-link flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-[13px] leading-5 text-muted-foreground hover:text-foreground">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                <span className="flex-1">{collection.label}</span>
                <span className="hidden rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground lg:block">{collection.articleCount}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mx-6 hidden border-t border-primary/15 py-6 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/60">Villela Exchange</p>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{moduleCount} módulos · {articleCount} artigos</p>
        </div>
      </div>
    </aside>
  );
}