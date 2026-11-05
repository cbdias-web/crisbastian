import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function ManualSectionCard({ collection }) {
  const Icon = collection.icon;
  return (
    <Link to={collection.href} className="manual-collection group flex h-full flex-col rounded-xl border border-border/40 bg-card/50 p-6 transition-shadow hover:border-primary/40 hover:bg-card hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="mb-5 flex items-center justify-between">
        <Icon className="h-7 w-7 text-primary" strokeWidth={1.4} />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
      </div>
      <h3 className="text-[17px] font-semibold leading-6 tracking-tight text-foreground">{collection.label}</h3>
      <p className="mb-6 mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{collection.description}</p>
      <p className="border-t border-border/25 pt-4 text-[11px] text-muted-foreground"><span className="font-medium text-foreground/75">{collection.modules.length} módulos</span><span className="mx-2 opacity-40">/</span>{collection.articleCount} artigos</p>
    </Link>
  );
}