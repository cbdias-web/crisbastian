import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Search, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

export default function ClientesDraggableSidebar({ user, isAdmin, onDragStart }) {
  const [collapsed, setCollapsed] = useState(false);
  const [busca, setBusca] = useState('');

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-sidebar-contratos', isAdmin ? 'admin' : user?.id],
    queryFn: () => {
      if (isAdmin) return base44.entities.Cliente.list('nome', 5000);
      return base44.entities.Cliente.filter({ vendedor_id: user?.id }, 'nome', 5000);
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const filtrados = clientes.filter(c =>
    !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cpf_cnpj?.includes(busca)
  );

  const handleDragStart = (e, cliente) => {
    e.dataTransfer.setData('clienteId', cliente.id);
    e.dataTransfer.setData('clienteData', JSON.stringify(cliente));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart && onDragStart(cliente);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center bg-white border border-gray-200 rounded-2xl shadow-sm p-2 gap-3 w-10">
        <button onClick={() => setCollapsed(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#1a3150] transition" title="Expandir lista de clientes">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="writing-mode-vertical text-[10px] font-semibold text-gray-400 uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Clientes
        </div>
        <Users className="w-4 h-4 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1a3150]" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Clientes</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">{filtrados.length}</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Instrução */}
      <div className="px-3 py-2 bg-blue-50/60 border-b border-blue-100">
        <p className="text-[10px] text-blue-600 font-medium leading-snug">
          🖱️ Arraste um cliente para o card de contrato desejado para iniciar um contrato pré-preenchido.
        </p>
      </div>

      {/* Busca */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150]"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1 max-h-[60vh] p-2 space-y-1">
        {filtrados.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Nenhum cliente encontrado</p>
        )}
        {filtrados.map(c => (
          <div
            key={c.id}
            draggable
            onDragStart={e => handleDragStart(e, c)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 cursor-grab active:cursor-grabbing transition group select-none"
            title={`Arraste para criar um contrato para ${c.nome}`}
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
            <div className="w-7 h-7 rounded-full bg-[#0f1e35] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {(c.nome || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{c.nome}</p>
              {c.cpf_cnpj && <p className="text-[10px] text-gray-400 truncate">{c.cpf_cnpj}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}