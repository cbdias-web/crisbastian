import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, UserPlus } from 'lucide-react';

export default function ClienteSelector({ value, onChange }) {
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-precificacao'],
    queryFn: () => base44.entities.Cliente.list('nome', 300),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.length >= 2
    ? clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  function select(nome) {
    setSearch(nome);
    onChange(nome);
    setOpen(false);
  }

  function handleChange(e) {
    setSearch(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente ou digitar novo..."
          className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {filtered.map(c => (
            <button
              key={c.id}
              onMouseDown={() => select(c.nome)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
            >
              <span className="font-medium text-gray-800">{c.nome}</span>
              {c.cpf_cnpj && <span className="text-xs text-gray-400">{c.cpf_cnpj}</span>}
            </button>
          ))}
          {search.length >= 2 && !clientes.find(c => c.nome.toLowerCase() === search.toLowerCase()) && (
            <button
              onMouseDown={() => select(search)}
              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Usar "{search}" como novo cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}