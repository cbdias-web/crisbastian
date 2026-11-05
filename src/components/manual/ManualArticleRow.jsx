import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText } from 'lucide-react';
import { manualExcerpt } from '@/components/manual/manualKnowledge';

export default function ManualArticleRow({ article, query, showPath }) {
  return (
    <li>
      <Link to={article.href} className="manual-row group flex gap-4 px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" strokeWidth={1.6} /></span>
        <span className="min-w-0 flex-1">
          {showPath && <span className="mb-1.5 block text-[11px] leading-5 text-muted-foreground">{article.collectionLabel} <span className="px-1 text-primary/40">/</span> {article.sectionTitle}</span>}
          <span className="block text-[15px] font-semibold leading-6 text-foreground group-hover:text-primary">{article.title}</span>
          <span className="mt-1.5 block text-[13px] leading-6 text-muted-foreground">{manualExcerpt(article, query)}</span>
        </span>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
      </Link>
    </li>
  );
}