import ManualSearch from '@/components/manual/ManualSearch';

export default function ManualHero({ busca, onBusca, moduleCount, articleCount, compact = false }) {
  return (
    <header className={compact ? 'border-b border-border/40 px-6 py-5 md:px-10' : 'border-b border-border/40 bg-primary/5 px-6 pb-9 pt-10 text-center md:px-12 md:pb-10 md:pt-12'}>
      {!compact && (
        <div key="heading">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Manual da plataforma</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-[42px]">Como podemos ajudar?</h1>
          <p className="mx-auto mb-7 mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Ferramentas, processos e regras da sua operação.<br className="hidden sm:block" /> Encontre o assunto e vá direto à resposta.</p>
        </div>
      )}
      <div key="search" className={compact ? 'mx-auto w-full' : 'mx-auto max-w-2xl'}><ManualSearch value={busca} onChange={onBusca} /></div>
      {!compact && <p key="count" className="mt-4 text-[11px] text-muted-foreground">Busca em {moduleCount} módulos e {articleCount} artigos documentados</p>}
    </header>
  );
}