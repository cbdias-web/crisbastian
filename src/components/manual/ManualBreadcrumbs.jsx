import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function ManualBreadcrumbs({ collection, module, article, search }) {
  const entries = [
    { label: 'Manual', href: '/Manual' },
    ...(search ? [{ label: 'Resultados da busca' }] : []),
    ...(collection ? [{ label: collection.label, href: collection.href }] : []),
    ...(module ? [{ label: module.title, href: module.href }] : []),
    ...(article ? [{ label: article.title }] : []),
  ];
  return (
    <nav aria-label="Localização no manual" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground">
      {entries.map((entry, index) => (
        <Fragment key={`${entry.label}-${index}`}>
          {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 opacity-50" />}
          {entry.href && index < entries.length - 1 ? <Link to={entry.href} className="hover:text-primary">{entry.label}</Link> : <span aria-current="page" className="text-foreground/80">{entry.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}