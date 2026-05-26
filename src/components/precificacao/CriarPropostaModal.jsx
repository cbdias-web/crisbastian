import { useState, useEffect } from 'react';
import { X, FileText, Download, Loader2, Search, UserPlus, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

// Extrai valor numérico de uma string formatada como "R$ 10.000,00" ou "US$ 5.000,00"
function extrairValor(items) {
  if (!items) return 0;
  for (const item of items) {
    if (!item) continue;
    if (item.highlight && item.value) {
      const num = parseFloat(String(item.value).replace(/[^\d,]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

export default function CriarPropostaModal({ produto, cliente: clienteInicial, propostas, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'done'
  const [clienteNome, setClienteNome] = useState(clienteInicial || '');
  const [clienteId, setClienteId] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [validadeDias, setValidadeDias] = useState(15);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Busca de clientes
  const [busca, setBusca] = useState(clienteInicial || '');
  const [clientes, setClientes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [modoNovo, setModoNovo] = useState(false);

  useEffect(() => {
    if (busca.length < 2) { setClientes([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await base44.entities.Cliente.list('-updated_date', 100);
        const q = busca.toLowerCase();
        setClientes(r.filter(c => c.nome?.toLowerCase().includes(q) || c.cpf_cnpj?.includes(busca)).slice(0, 8));
      } catch {}
      setBuscando(false);
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  function selecionarCliente(c) {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setCpfCnpj(c.cpf_cnpj || '');
    setBusca(c.nome);
    setClientes([]);
    setModoNovo(false);
  }

  async function gerar() {
    if (!clienteNome.trim()) { toast.error('Informe o nome do cliente'); return; }
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Salvar proposta na entidade
      const dataValidade = new Date(Date.now() + validadeDias * 86400000).toISOString().split('T')[0];
      const valorEstimado = extrairValor(propostas?.[0]?.items);

      const proposta = await base44.entities.PropostaPrecificacao.create({
        produto,
        cliente_id: clienteId || '',
        cliente_nome: clienteNome,
        cpf_cnpj: cpfCnpj || '',
        vendedor_id: user.id,
        vendedor_nome: user.full_name || user.email,
        validade_dias: validadeDias,
        data_validade: dataValidade,
        observacoes: observacoes || '',
        propostas: propostas || [],
        status: 'rascunho',
        valor_estimado: valorEstimado,
      });

      // Gerar PDF
      const resp = await base44.functions.invoke('gerarPropostaPrecificacao', {
        produto, cliente: clienteNome, cpfCnpj, validadeDias, observacoes, propostas,
      });

      const b64 = resp.data?.pdf_base64;
      if (!b64) throw new Error('PDF não gerado');

      // Criar blob URL
      const byteStr = atob(b64);
      const arr = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setStep('done');
      toast.success('Proposta gerada e arquivada!');
    } catch (e) {
      toast.error('Erro: ' + (e.message || 'tente novamente'));
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 z-10"
          style={{ background: 'linear-gradient(90deg, #0a1f35 0%, #1a3150 100%)' }}>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="font-bold text-white text-sm">Criar Proposta Técnica</h2>
              <p className="text-[11px] text-blue-300/80">{produto} — Villela Exchange</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 'form' ? (
            <>
              {/* Busca de cliente */}
              <Field label="Buscar Cliente Cadastrado">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setClienteId(''); setClienteNome(e.target.value); }}
                    placeholder="Digite nome ou CPF/CNPJ..."
                    className="w-full border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                  {clienteId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                </div>
                {buscando && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                {clientes.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    {clientes.map(c => (
                      <button key={c.id} onClick={() => selecionarCliente(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-gray-100 last:border-0">
                        <div className="text-sm font-semibold text-gray-800">{c.nome}</div>
                        {c.cpf_cnpj && <div className="text-xs text-gray-400">{c.cpf_cnpj}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              {/* Novo cliente */}
              <button onClick={() => setModoNovo(v => !v)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <UserPlus className="w-3.5 h-3.5" />
                {modoNovo ? 'Cancelar novo cliente' : 'Ou cadastrar novo cliente'}
              </button>

              {modoNovo && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Field label="Nome *">
                    <input value={clienteNome} onChange={e => { setClienteNome(e.target.value); setBusca(e.target.value); setClienteId(''); }}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                  </Field>
                  <Field label="CPF / CNPJ">
                    <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                  </Field>
                </div>
              )}

              {clienteId && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-medium">
                  ✅ Cliente vinculado: <strong>{clienteNome}</strong>{cpfCnpj ? ` — ${cpfCnpj}` : ''}
                </div>
              )}

              <Field label="Validade da Proposta">
                <div className="flex gap-2">
                  {[7, 15, 30, 45].map(d => (
                    <button key={d} onClick={() => setValidadeDias(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${validadeDias === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {d}d
                    </button>
                  ))}
                  <input type="number" value={validadeDias} onChange={e => setValidadeDias(parseInt(e.target.value) || 15)} min={1}
                    className="w-16 border border-gray-200 rounded-lg py-2 px-2 text-sm text-center focus:outline-none focus:border-blue-400" />
                </div>
              </Field>

              <Field label="Observações / Condições Especiais">
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
                  placeholder="Ex: Condições negociadas. Entrada facilitada..."
                  className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </Field>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">📋 O PDF incluirá:</p>
                <ul className="text-xs text-blue-600 space-y-0.5">
                  <li>• Cabeçalho institucional Villela Exchange</li>
                  <li>• Dados do cliente, consultor e data de emissão</li>
                  <li>• {propostas?.length || 0} proposta(s) com condições comerciais detalhadas</li>
                  <li>• Prazo de validade e condições gerais</li>
                  <li>• Proposta arquivada em "Propostas Geradas" para consulta futura</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button onClick={gerar} disabled={loading || !clienteNome.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0a1f35] hover:bg-[#1a3150] text-yellow-400 border border-yellow-400/30 rounded-xl text-sm font-semibold transition disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {loading ? 'Gerando...' : 'Gerar Proposta PDF'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Proposta Gerada e Arquivada!</h3>
              <p className="text-sm text-gray-500 mb-2">
                Proposta de <strong>{produto}</strong> para <strong>{clienteNome}</strong> foi salva.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Acesse "Propostas Geradas" na tela de Precificação para acompanhar e aceitar propostas.
              </p>
              <div className="flex gap-3 justify-center">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download={`Proposta_${produto}_${clienteNome}.pdf`}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0a1f35] hover:bg-[#1a3150] text-yellow-400 border border-yellow-400/30 rounded-xl text-sm font-semibold transition">
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </a>
                <button onClick={() => { setStep('form'); setPdfUrl(null); }}
                  className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Nova Proposta
                </button>
              </div>
              <button onClick={onClose} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}