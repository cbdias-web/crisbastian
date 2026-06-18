import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt, Upload, X, Loader2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

const A = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  accentDim: 'rgba(0,212,170,0.1)',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

const ACEITOS = '.pdf,.jpg,.jpeg,.png';
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;

export default function BoletosParcelas({ contrato, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [novoVenc, setNovoVenc] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const inputRef = useRef(null);
  const boletos = contrato.boletos_parcelas || [];

  const persistir = async (lista) => {
    await base44.entities.Contrato.update(contrato.id, { boletos_parcelas: lista });
    onUpdate({ ...contrato, boletos_parcelas: lista });
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const novos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novos.push({ url: file_url, nome: file.name, vencimento: novoVenc || '', descricao: novaDesc || '' });
      }
      await persistir([...boletos, ...novos]);
      setNovoVenc('');
      setNovaDesc('');
      toast.success(`${novos.length} boleto(s) anexado(s)`);
    } catch (e) {
      toast.error('Erro ao anexar boleto');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remover = async (idx) => {
    if (!confirm('Remover este boleto?')) return;
    await persistir(boletos.filter((_, i) => i !== idx));
    toast.success('Boleto removido');
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg focus:outline-none";
  const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };

  return (
    <div className="rounded-2xl overflow-hidden mb-5" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${A.border}`, background: A.accentDim }}>
        <Receipt className="w-4 h-4" style={{ color: A.accent }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: A.accent }}>
          Boletos das Parcelas Vincendas
        </p>
        {boletos.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: A.accentDim, color: A.accent }}>
            {boletos.length}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs" style={{ color: A.textMuted }}>
          Anexe os boletos das parcelas para enviar ao cliente e facilitar a cobrança.
        </p>

        {/* Lista de boletos */}
        {boletos.length > 0 && (
          <div className="space-y-2">
            {boletos.map((b, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
                <Receipt className="w-4 h-4 flex-shrink-0" style={{ color: A.accent }} />
                <div className="flex-1 min-w-0">
                  <a href={b.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium truncate flex items-center gap-1 hover:underline" style={{ color: A.text }}>
                    {b.descricao || b.nome || `Boleto ${i + 1}`}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: A.accent }} />
                  </a>
                  {b.vencimento && (
                    <p className="text-[10px]" style={{ color: A.textMuted }}>Vencimento: {fmtDate(b.vencimento)}</p>
                  )}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(b.url); toast.success('Link copiado!'); }}
                  className="p-1.5 rounded-lg transition flex-shrink-0" style={{ color: A.textMuted }}
                  title="Copiar link">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remover(i)}
                  className="p-1.5 rounded-lg transition flex-shrink-0" style={{ color: '#f87171' }}
                  title="Remover">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form de anexo */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: A.textMuted }}>Vencimento (opcional)</label>
            <input type="date" value={novoVenc} onChange={e => setNovoVenc(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: A.textMuted }}>Descrição (opcional)</label>
            <input value={novaDesc} onChange={e => setNovaDesc(e.target.value)} placeholder="Ex: Parcela 2/12" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <input ref={inputRef} type="file" accept={ACEITOS} multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
          style={{ background: A.accent, color: '#0d1117' }}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando...' : 'Anexar boleto(s) (PDF, JPG, PNG)'}
        </button>
      </div>
    </div>
  );
}