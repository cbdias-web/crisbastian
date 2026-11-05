import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText } from 'lucide-react';
import { manualExcerpt } from '@/components/manual/manualKnowledge';

export default function ManualArticleRow({ article, query, showPath }) {
  return (
    <li>
      <Link to={article.href} className="group flex gap-4 rounded-lg px-4 py-5 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <FileText className="mt-1 h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.6} />
        <span className="min-w-0 flex-1">
          {showPath && <span className="mb-1.5 block text-[11px] leading-5 text-muted-foreground">{article.collectionLabel} <span className="px-1 opacity-40">/</span> {article.sectionTitle}</span>}
          <span className="block text-[15px] font-semibold leading-6 text-foreground group-hover:text-primary">{article.title}</span>
          <span className="mt-1.5 block text-[13px] leading-6 text-muted-foreground">{manualExcerpt(article, query)}</span>
        </span>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
      </Link>
    </li>
  );
}