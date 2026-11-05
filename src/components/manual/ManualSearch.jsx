import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function ManualSearch({ value, onChange }) {
  const input = useRef(null);
  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  return (
    <div role="search" className="manual-search relative w-full rounded-xl border border-border/60 bg-card shadow-lg focus-within:ring-2 focus-within:ring-primary/40">
      <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
      <input ref={input} type="search" aria-label="Pesquisar em todo o manual" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Pesquise uma dúvida, ferramenta ou processo…" className="h-16 w-full rounded-xl border-0 pl-14 pr-20 text-sm text-foreground outline-none md:text-base" />
      {value ? (
        <button type="button" aria-label="Limpar pesquisa" onClick={() => { onChange(''); input.current?.focus(); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
      ) : (
        <kbd className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 px-2 py-1 font-mono text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
      )}
    </div>
  );
}