import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function ManualSectionCard({ collection }) {
  const Icon = collection.icon;
  return (
    <Link to={collection.href} className="manual-collection group flex h-full flex-col rounded-xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="mb-5 flex items-center justify-between">
        <span className="manual-icon-tile flex h-11 w-11 items-center justify-center rounded-xl"><Icon className="h-[22px] w-[22px] text-[#9df6e4]" strokeWidth={1.5} /></span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
      </div>
      <h3 className="text-[17px] font-semibold leading-6 tracking-tight text-foreground">{collection.label}</h3>
      <p className="mb-6 mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{collection.description}</p>
      <p className="border-t border-primary/15 pt-4 text-[11px] text-muted-foreground"><span className="font-medium text-foreground/80">{collection.modules.length} módulos</span><span className="mx-2 text-primary/50">/</span>{collection.articleCount} artigos</p>
    </Link>
  );
}