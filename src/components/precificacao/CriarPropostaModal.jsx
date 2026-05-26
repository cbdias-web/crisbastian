/**
 * Modal para criar proposta técnica em PDF — Villela Exchange
 */
import { useState } from 'react';
import { X, FileText, Download, Loader2 } from 'lucide-react';
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

export default function CriarPropostaModal({ produto, cliente: clienteInicial, propostas, onClose }) {
  const [cliente, setCliente] = useState(clienteInicial || '');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [validadeDias, setValidadeDias] = useState(15);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  async function gerar() {
    if (!cliente.trim()) { toast.error('Informe o nome do cliente'); return; }
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('gerarPropostaPrecificacao', {
        produto, cliente, cpfCnpj, validadeDias, observacoes, propostas,
      });
      setPdfUrl(resp.data.file_url);
      toast.success('Proposta gerada com sucesso!');
    } catch (e) {
      toast.error('Erro ao gerar proposta: ' + (e.message || 'tente novamente'));
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, #0a1f35 0%, #1a3150 100%)' }}>
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
          {!pdfUrl ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome do Cliente / Empresa *">
                  <input value={cliente} onChange={e => setCliente(e.target.value)}
                    placeholder="Ex: João Silva ou Empresa XYZ"
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400" />
                </Field>
                <Field label="CPF / CNPJ (opcional)">
                  <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400" />
                </Field>
              </div>

              <Field label="Validade da Proposta (dias)">
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

              <Field label="Observações / Condições Especiais (opcional)">
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
                  rows={3} placeholder="Ex: Condições negociadas em reunião de 20/05/2026. Entrada facilitada em 6x..."
                  className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              </Field>

              {/* preview of what will be included */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">📋 O PDF incluirá:</p>
                <ul className="text-xs text-blue-600 space-y-0.5">
                  <li>• Identificação Villela Exchange com cabeçalho institucional</li>
                  <li>• Dados do cliente e consultor responsável</li>
                  <li>• {propostas?.length || 0} proposta(s) detalhada(s) com condições comerciais</li>
                  <li>• Validade, condições gerais e rodapé oficial</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button onClick={gerar} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {loading ? 'Gerando PDF...' : 'Gerar Proposta PDF'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Proposta Gerada!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Proposta técnica de <strong>{produto}</strong> para <strong>{cliente}</strong> pronta para envio.
              </p>
              <div className="flex gap-3 justify-center">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition">
                  <Download className="w-4 h-4" />
                  Abrir / Baixar PDF
                </a>
                <button onClick={() => { setPdfUrl(null); }}
                  className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Nova Proposta
                </button>
              </div>
              <button onClick={onClose} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}