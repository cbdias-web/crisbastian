import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

export default function RelatorioComissoes() {
  const [vendedores, setVendedores] = useState([]);
  const [indicadores, setIndicadores] = useState([]);
  const [selectedVendedores, setSelectedVendedores] = useState([]);
  const [selectedIndicadores, setSelectedIndicadores] = useState([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dataFim, setDataFim] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Vendedor.list("nome"),
      base44.entities.Espelhamento.list("nome")
    ]).then(([v, e]) => {
      setVendedores(v.filter(vd => vd.ativo !== false));
      setIndicadores(e.filter(ind => ind.ativo !== false));
    });
  }, []);

  const toggleVendedor = (id) => {
    setSelectedVendedores(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleIndicador = (id) => {
    setSelectedIndicadores(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllVendedores = () => {
    if (selectedVendedores.length === vendedores.length) {
      setSelectedVendedores([]);
    } else {
      setSelectedVendedores(vendedores.map(v => v.id));
    }
  };

  const toggleAllIndicadores = () => {
    if (selectedIndicadores.length === indicadores.length) {
      setSelectedIndicadores([]);
    } else {
      setSelectedIndicadores(indicadores.map(i => i.id));
    }
  };

  const gerarRelatorio = async () => {
    if (selectedVendedores.length === 0 && selectedIndicadores.length === 0) {
      toast.error("Selecione pelo menos um vendedor ou indicador");
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioComissoes', {
        vendedores_ids: selectedVendedores,
        indicadores_ids: selectedIndicadores,
        dataInicio,
        dataFim
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-comissoes-${dataInicio}-${dataFim}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar relatório');
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Comissões</h2>
          <p className="text-gray-400 text-sm mt-0.5">Gere relatórios consolidados de comissões por período</p>
        </div>

        {/* Filtros de Período */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Período</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a3150] bg-white"
            />
          </div>
        </div>

        {/* Seleção de Vendedores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Vendedores</h3>
              <span className="text-xs text-gray-400">({selectedVendedores.length} selecionados)</span>
            </div>
            <button
              onClick={toggleAllVendedores}
              className="text-xs text-[#1a3150] font-medium hover:underline"
            >
              {selectedVendedores.length === vendedores.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {vendedores.map(v => (
              <label key={v.id} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedVendedores.includes(v.id)}
                  onChange={() => toggleVendedor(v.id)}
                  className="w-4 h-4 accent-[#1a3150] cursor-pointer"
                />
                <span className="text-sm text-gray-700 truncate">{v.nome}</span>
              </label>
            ))}
          </div>
          {vendedores.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum vendedor ativo encontrado</p>
          )}
        </div>

        {/* Seleção de Indicadores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Indicadores</h3>
              <span className="text-xs text-gray-400">({selectedIndicadores.length} selecionados)</span>
            </div>
            <button
              onClick={toggleAllIndicadores}
              className="text-xs text-[#1a3150] font-medium hover:underline"
            >
              {selectedIndicadores.length === indicadores.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {indicadores.map(i => (
              <label key={i.id} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selectedIndicadores.includes(i.id)}
                  onChange={() => toggleIndicador(i.id)}
                  className="w-4 h-4 accent-[#1a3150] cursor-pointer"
                />
                <span className="text-sm text-gray-700 truncate">{i.nome}</span>
              </label>
            ))}
          </div>
          {indicadores.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum indicador ativo encontrado</p>
          )}
        </div>

        {/* Botão Gerar */}
        <div className="flex justify-end">
          <button
            onClick={gerarRelatorio}
            disabled={generating || (selectedVendedores.length === 0 && selectedIndicadores.length === 0)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0f1e35] to-[#1a3150] text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gerar Relatório PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}