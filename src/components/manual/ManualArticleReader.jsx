import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import ManualArticleBody from '@/components/manual/ManualArticleBody';
import ManualArticleNavigation from '@/components/manual/ManualArticleNavigation';

export default function ManualArticleReader({ article, module }) {
  const index = module.articles.findIndex((entry) => entry.id === article.id);
  const previous = module.articles[index - 1];
  const next = module.articles[index + 1];
  return (
    <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1fr)_210px]">
      <article aria-labelledby="manual-article-title" className="min-w-0">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"><FileText className="h-3.5 w-3.5" />Artigo do manual</div>
        <h1 id="manual-article-title" className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-[34px]">{article.title}</h1>
        <Link to={module.href} className="mt-4 inline-block text-xs text-muted-foreground hover:text-primary">{module.title}</Link>
        <div className="my-8 h-px bg-border/40" />
        <ManualArticleBody block={article.block} />
        <nav aria-label="Artigos anterior e seguinte" className="mt-12 grid grid-cols-2 gap-4 border-t border-border/40 pt-6">
          {previous ? <Link to={previous.href} className="rounded-lg py-2 pr-3 text-sm leading-6 text-foreground/80 hover:text-primary"><span className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><ArrowLeft className="h-3 w-3" />Anterior</span>{previous.title}</Link> : <span />}
          {next && <Link to={next.href} className="rounded-lg py-2 pl-3 text-right text-sm leading-6 text-foreground/80 hover:text-primary"><span className="mb-2 flex items-center justify-end gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">Próximo<ArrowRight className="h-3 w-3" /></span>{next.title}</Link>}
        </nav>
      </article>
      <ManualArticleNavigation module={module} article={article} />
    </div>
  );
}