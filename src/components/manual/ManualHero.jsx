import ManualSearch from '@/components/manual/ManualSearch';

export default function ManualHero({ busca, onBusca, moduleCount, articleCount, compact = false }) {
  return (
    <header className={compact ? 'manual-hero border-b px-6 py-5 md:px-10' : 'manual-hero relative overflow-hidden border-b px-6 pb-9 pt-10 text-center md:px-12 md:pb-10 md:pt-12'}>
      {!compact && (
        <div key="heading">
          <span className="manual-eyebrow mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8ff3e0]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,212,170,0.9)]" />
            Manual da plataforma
          </span>
          <h1 className="manual-hero-title text-3xl font-semibold leading-tight tracking-tight md:text-[44px] drop-shadow-[0_10px_30px_rgba(0,212,170,0.18)]">Como podemos ajudar?</h1>
          <p className="mx-auto mb-7 mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Ferramentas, processos e regras da sua operação.<br className="hidden sm:block" /> Encontre o assunto e vá direto à resposta.</p>
        </div>
      )}
      <div key="search" className={compact ? 'mx-auto w-full' : 'mx-auto max-w-2xl'}><ManualSearch value={busca} onChange={onBusca} /></div>
      {!compact && <p key="count" className="mt-4 text-[11px] text-muted-foreground">Busca em {moduleCount} módulos e {articleCount} artigos documentados</p>}
    </header>
  );
}