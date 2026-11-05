import { useState } from 'react';
import { SearchX } from 'lucide-react';
import ManualArticleRow from '@/components/manual/ManualArticleRow';

export default function ManualArticleList({ articles, title, description, query = '', showPath = false }) {
  const [limit, setLimit] = useState(20);
  return (
    <section aria-labelledby="manual-article-list-title">
      <header className="mb-6">
        <h1 id="manual-article-list-title" className="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>}
        <p role="status" aria-live="polite" className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{articles.length} {articles.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}</p>
      </header>
      {articles.length ? (
        <ul className="manual-panel divide-y divide-primary/10 rounded-xl px-1.5 py-1.5">
          {articles.slice(0, limit).map((article) => <ManualArticleRow key={article.id} article={article} query={query} showPath={showPath} />)}
        </ul>
      ) : (
        <div className="manual-panel rounded-xl py-16 text-center"><SearchX className="mx-auto mb-4 h-7 w-7 text-primary/70" /><h2 className="text-base font-medium text-foreground">Nenhum artigo encontrado</h2><p className="mx-auto mt-2 max-w-sm px-4 text-sm leading-6 text-muted-foreground">Tente um termo mais simples ou navegue pelas coleções do Manual.</p></div>
      )}
      {limit < articles.length && <div className="mt-6 text-center"><button type="button" onClick={() => setLimit((value) => value + 20)} className="rounded-lg border border-primary/30 bg-[linear-gradient(160deg,#1c2533,#121924)] px-5 py-3 text-sm font-medium text-foreground shadow-[0_16px_30px_-22px_rgba(0,212,170,0.9)] transition hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary">Carregar mais artigos</button><p className="mt-3 text-xs text-muted-foreground">{Math.min(limit, articles.length)} de {articles.length} artigos</p></div>}
    </section>
  );
}