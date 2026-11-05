import { useState } from 'react';
import { SearchX } from 'lucide-react';
import ManualArticleRow from '@/components/manual/ManualArticleRow';

export default function ManualArticleList({ articles, title, description, query = '', showPath = false }) {
  const [limit, setLimit] = useState(20);
  return (
    <section aria-labelledby="manual-article-list-title">
      <header className="mb-6"><h1 id="manual-article-list-title" className="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>{description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>}<p role="status" aria-live="polite" className="mt-3 text-xs text-muted-foreground">{articles.length} {articles.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}</p></header>
      {articles.length ? (
        <ul className="divide-y divide-border/30 rounded-xl border border-border/40 bg-card/30 px-1">
          {articles.slice(0, limit).map((article) => <ManualArticleRow key={article.id} article={article} query={query} showPath={showPath} />)}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center"><SearchX className="mx-auto mb-4 h-7 w-7 text-muted-foreground" /><h2 className="text-base font-medium text-foreground">Nenhum artigo encontrado</h2><p className="mx-auto mt-2 max-w-sm px-4 text-sm leading-6 text-muted-foreground">Tente um termo mais simples ou navegue pelas coleções do Manual.</p></div>
      )}
      {limit < articles.length && <div className="mt-6 text-center"><button type="button" onClick={() => setLimit((value) => value + 20)} className="rounded-lg border border-border/50 bg-card px-5 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary">Carregar mais artigos</button><p className="mt-3 text-xs text-muted-foreground">{Math.min(limit, articles.length)} de {articles.length} artigos</p></div>}
    </section>
  );
}