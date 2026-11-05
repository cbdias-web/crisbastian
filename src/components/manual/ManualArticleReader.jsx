import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import ManualArticleBody from '@/components/manual/ManualArticleBody';
import ManualArticleNavigation from '@/components/manual/ManualArticleNavigation';

export default function ManualArticleReader({ article, module }) {
  const index = module.articles.findIndex((entry) => entry.id === article.id);
  const previous = module.articles[index - 1];
  const next = module.articles[index + 1];
  return (
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_215px]">
      <article aria-labelledby="manual-article-title" className="manual-reader min-w-0 rounded-2xl p-6 md:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"><FileText className="h-3.5 w-3.5" />Artigo do manual</div>
        <h1 id="manual-article-title" className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-[34px]">{article.title}</h1>
        <Link to={module.href} className="mt-4 inline-block text-xs text-muted-foreground transition hover:text-primary">{module.title}</Link>
        <div className="my-8 h-px bg-gradient-to-r from-primary/45 via-primary/15 to-transparent" />
        <ManualArticleBody block={article.block} />
        <nav aria-label="Artigos anterior e seguinte" className="mt-12 grid grid-cols-2 gap-4 border-t border-primary/15 pt-6">
          {previous ? <Link to={previous.href} className="rounded-xl border border-primary/15 bg-[linear-gradient(160deg,rgba(30,39,55,0.7),rgba(15,21,30,0.7))] p-4 text-sm leading-6 text-foreground/80 shadow-[0_14px_28px_-26px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary"><span className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><ArrowLeft className="h-3 w-3" />Anterior</span>{previous.title}</Link> : <span />}
          {next && <Link to={next.href} className="rounded-xl border border-primary/15 bg-[linear-gradient(160deg,rgba(30,39,55,0.7),rgba(15,21,30,0.7))] p-4 text-right text-sm leading-6 text-foreground/80 shadow-[0_14px_28px_-26px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary"><span className="mb-2 flex items-center justify-end gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">Próximo<ArrowRight className="h-3 w-3" /></span>{next.title}</Link>}
        </nav>
      </article>
      <ManualArticleNavigation module={module} article={article} />
    </div>
  );
}