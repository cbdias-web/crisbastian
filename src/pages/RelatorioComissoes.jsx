import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Calendar, Users, Mail, X, Send } from "lucide-react";
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
  const [sendingEmails, setSendingEmails] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Vendedor.list("nome"),
      base44.entities.Espelhamento.list("nome")
    ]).then(([v, e]) => {
      const vendAtivos = v.filter(vd => vd.ativo !== false);
      setVendedores(vendAtivos);
      // Indicadores = Espelhamentos ativos + Vendedores ativos (podem ser usados como indicadores)
      const espAtivos = e.filter(ind => ind.ativo !== false);
      const vendComoInd = vendAtivos.map(vd => ({ ...vd, _tipo: 'vendedor' }));
      const espComTipo = espAtivos.map(esp => ({ ...esp, _tipo: 'indicador' }));
      setIndicadores([...espComTipo, ...vendComoInd].sort((a, b) => a.nome.localeCompare(b.nome)));
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

  const toggleSelectForEmail = (tipo, id) => {
    const key = `${tipo}_${id}`;
    setSelectedForEmail(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAllForEmail = () => {
    const todosVendedoresComEmail = vendedores.filter(v => v.email).map(v => `vendedor_${v.id}`);
    const todosIndicadoresComEmail = indicadores.filter(i => i.email).map(i => `indicador_${i.id}`);
    const todos = [...todosVendedoresComEmail, ...todosIndicadoresComEmail];
    
    if (selectedForEmail.length === todos.length) {
      setSelectedForEmail([]);
    } else {
      setSelectedForEmail(todos);
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

  const abrirModalEnvio = () => {
    if (selectedForEmail.length === 0) {
      toast.error("Selecione ao menos um vendedor/indicador com e-mail");
      return;
    }
    setShowEmailModal(true);
  };

  const enviarRelatoriosEmMassa = async () => {
    const vendedoresSelecionados = selectedForEmail
      .filter(key => key.startsWith('vendedor_'))
      .map(key => key.replace('vendedor_', ''))
      .map(id => vendedores.find(v => v.id === id))
      .filter(v => v && v.email);

    const indicadoresSelecionados = selectedForEmail
      .filter(key => key.startsWith('indicador_'))
      .map(key => key.replace('indicador_', ''))
      .map(id => indicadores.find(i => i.id === id))
      .filter(i => i && i.email);

    setSendingEmails(true);
    let sucessos = 0;
    let erros = 0;

    for (const v of vendedoresSelecionados) {
      try {
        await base44.functions.invoke('enviarRelatorioPorEmail', {
          tipo: 'vendedor',
          vendedor_id: v.id,
          vendedor_nome: v.nome,
          vendedor_email: v.email,
          dataInicio,
          dataFim
        });
        sucessos++;
      } catch (error) {
        erros++;
      }
    }

    for (const i of indicadoresSelecionados) {
      try {
        await base44.functions.invoke('enviarRelatorioPorEmail', {
          tipo: 'indicador',
          vendedor_id: i.id,
          vendedor_nome: i.nome,
          vendedor_email: i.email,
          dataInicio,
          dataFim
        });
        sucessos++;
      } catch (error) {
        erros++;
      }
    }

    setSendingEmails(false);
    setShowEmailModal(false);
    setSelectedForEmail([]);

    if (erros === 0) {
      toast.success(`${sucessos} relatório(s) enviado(s) com sucesso!`);
    } else {
      toast.warning(`${sucessos} enviado(s), ${erros} erro(s)`);
    }
  };

  const getSelecionadosParaEmail = () => {
    const vendedoresSelecionados = selectedForEmail
      .filter(key => key.startsWith('vendedor_'))
      .map(key => key.replace('vendedor_', ''))
      .map(id => vendedores.find(v => v.id === id))
      .filter(v => v && v.email);

    const indicadoresSelecionados = selectedForEmail
      .filter(key => key.startsWith('indicador_'))
      .map(key => key.replace('indicador_', ''))
      .map(id => indicadores.find(i => i.id === id))
      .filter(i => i && i.email);

    return [...vendedoresSelecionados.map(v => ({ ...v, tipo: 'vendedor' })), ...indicadoresSelecionados.map(i => ({ ...i, tipo: 'indicador' }))];
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
              <span className="text-xs text-gray-400">({selectedVendedores.length} selecionados para relatório)</span>
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
              <div key={v.id} className={`flex items-center gap-2 p-3 rounded-xl border transition ${selectedForEmail.includes(`vendedor_${v.id}`) ? 'border-green-400 bg-green-50/30' : 'border-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={selectedVendedores.includes(v.id)}
                  onChange={() => toggleVendedor(v.id)}
                  className="w-4 h-4 accent-[#1a3150] cursor-pointer"
                />
                <span className="text-sm text-gray-700 truncate flex-1">{v.nome}</span>
                {v.email && (
                  <input
                    type="checkbox"
                    checked={selectedForEmail.includes(`vendedor_${v.id}`)}
                    onChange={() => toggleSelectForEmail('vendedor', v.id)}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                    title="Enviar por e-mail"
                  />
                )}
              </div>
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
              <span className="text-xs text-gray-400">({selectedIndicadores.length} selecionados para relatório)</span>
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
              <div key={i.id} className={`flex items-center gap-2 p-3 rounded-xl border transition ${selectedForEmail.includes(`indicador_${i.id}`) ? 'border-green-400 bg-green-50/30' : 'border-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={selectedIndicadores.includes(i.id)}
                  onChange={() => toggleIndicador(i.id)}
                  className="w-4 h-4 accent-[#1a3150] cursor-pointer"
                />
                <span className="text-sm text-gray-700 truncate flex-1">{i.nome}</span>
                {i.email && (
                  <input
                    type="checkbox"
                    checked={selectedForEmail.includes(`indicador_${i.id}`)}
                    onChange={() => toggleSelectForEmail('indicador', i.id)}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                    title="Enviar por e-mail"
                  />
                )}
              </div>
            ))}
          </div>
          {indicadores.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum indicador ativo encontrado</p>
          )}
        </div>

        {/* Seleção global para e-mail */}
        {(vendedores.some(v => v.email) || indicadores.some(i => i.email)) && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <button
              onClick={toggleSelectAllForEmail}
              className="text-sm text-[#1a3150] hover:text-blue-900 flex items-center gap-2 font-medium"
            >
              <input 
                type="checkbox" 
                checked={selectedForEmail.length > 0 && selectedForEmail.length === ([...vendedores.filter(v => v.email), ...indicadores.filter(i => i.email)].length)}
                onChange={toggleSelectAllForEmail}
                className="w-4 h-4 accent-green-600 cursor-pointer"
              />
              Selecionar todos com e-mail para envio
            </button>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3">
          {selectedForEmail.length > 0 && (
            <button
              onClick={abrirModalEnvio}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              Enviar Relatórios
            </button>
          )}
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

        {/* Modal de Confirmação de Envio */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Enviar Relatórios por E-mail</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Selecione os vendedores que receberão o relatório do período</p>
                </div>
                <button onClick={() => setShowEmailModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                {/* Período */}
                <div className="bg-blue-50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-gray-500 mb-1">Período do Relatório:</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(dataInicio).toLocaleDateString('pt-BR')} até {new Date(dataFim).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Lista de Selecionados */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      Vendedores/Indicadores (com e-mail cadastrado)
                    </p>
                    <button
                      onClick={() => setSelectedForEmail([])}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {getSelecionadosParaEmail().map(pessoa => (
                      <div key={`${pessoa.tipo}_${pessoa.id}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => toggleSelectForEmail(pessoa.tipo, pessoa.id)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{pessoa.nome}</p>
                          <p className="text-xs text-gray-500">{pessoa.email}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {pessoa.tipo === 'vendedor' ? 'Vendedor' : 'Indicador'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mensagem do E-mail */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Mensagem do E-mail:</p>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    "Relatório para conferência e acompanhamento da comissão gerada no período especificado. Caso haja alguma divergência ou necessidade de ajuste, falar com a gestão do produto.
                    <br /><br />
                    Atenciosamente!<br />
                    <strong>VILLELA EXCHANGE</strong>"
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {getSelecionadosParaEmail().length} vendedor(es) selecionado(s)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarRelatoriosEmMassa}
                    disabled={sendingEmails}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                  >
                    {sendingEmails ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Relatórios
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}