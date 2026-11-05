import ManualSectionCard from '@/components/manual/ManualSectionCard';

export default function ManualCollectionsDirectory({ collections }) {
  return (
    <section aria-labelledby="manual-collections-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><h2 id="manual-collections-title" className="text-xl font-semibold tracking-tight text-foreground">Explore por área</h2><p className="mt-2 text-[13px] leading-6 text-muted-foreground">Escolha uma coleção para navegar pelos módulos e artigos.</p></div>
        <span className="hidden shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 pb-1 text-[11px] font-medium text-primary sm:block">{collections.length} coleções</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-3">
        {collections.map((collection) => <ManualSectionCard key={collection.id} collection={collection} />)}
      </div>
    </section>
  );
}