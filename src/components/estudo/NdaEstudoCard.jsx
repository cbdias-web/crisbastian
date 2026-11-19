import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, Upload, CheckCircle2, X, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { buscarClientes } from '@/lib/clientesBusca';

const A = {
  surface2: '#1c2333', border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', goldDim: 'rgba(251,191,36,0.12)', danger: '#f87171',
};
const digitos = (v) => String(v || '').replace(/\D/g, '');

async function localizarCliente(dados) {
  const doc = digitos(dados?.cpf_cnpj);
  const nome = String(dados?.nome || '').trim();
  const termos = [nome.split(/\s+/)[0], doc].filter((t) => t && t.length >= 3);
  for (const termo of termos) {
    try {
      const page = await buscarClientes({ busca: termo, limite: 20 });
      const lista = page?.items || [];
      const achou = doc
        ? lista.find((c) => digitos(c.cpf_cnpj) === doc)
        : lista.find((c) => String(c.nome || '').trim().toLowerCase() === nome.toLowerCase());
      if (achou) return achou;
    } catch { /* segue para o próximo termo */ }
  }
  return null;
}

/**
 * Upload do NDA na abertura do estudo.
 * Lê o documento e devolve os dados cadastrais do cliente (armazenado privadamente),
 * indicando se ele já existe na base ou se o cadastro será criado a partir do NDA.
 */
export default function NdaEstudoCard({ onAlterar }) {
  const [arquivo, setArquivo] = useState(null);
  const [dados, setDados] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const enviar = async (file) => {
    if (!file) return;
    setProcessando(true);
    setDados(null);
    setCliente(null);
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      const fileUri = up?.file_uri;
      if (!fileUri) throw new Error('Falha ao enviar o arquivo.');
      setArquivo({ url: fileUri, nome: file.name });

      const res = await base44.functions.invoke('extrairDadosNDA', { file_uri: fileUri });
      if (res?.data?.error) throw new Error(res.data.error);
      const extraidos = res.data.dados || {};
      setDados(extraidos);

      const encontrado = await localizarCliente(extraidos);
      setCliente(encontrado);
      onAlterar?.({ url: fileUri, nome: file.name, dados: extraidos, cliente: encontrado });
      toast.success(encontrado ? 'Cliente identificado na base' : 'Dados do NDA extraídos');
    } catch (e) {
      setArquivo(null);
      onAlterar?.(null);
      toast.error(e?.message || 'Não foi possível ler o NDA.');
    }
    setProcessando(false);
  };

  const limpar = () => {
    setArquivo(null); setDados(null); setCliente(null);
    onAlterar?.(null);
  };

  const soltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (processando) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) enviar(file);
  };

  return (
    <div className="rounded-xl p-3 space-y-2 transition"
      onDragOver={(e) => { e.preventDefault(); if (!processando) setArrastando(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={soltar}
      style={{
        background: arrastando ? A.accentDim : A.surface2,
        border: `1px ${arrastando ? 'dashed' : 'solid'} ${arrastando ? A.accent : A.border}`,
      }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: A.accent }}>
            <FileText className="w-3.5 h-3.5" /> NDA do cliente
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: A.textMuted }}>
            Envie o NDA assinado: usamos o documento como base do cadastro quando o cliente não estiver na base.
          </p>
        </div>
        {arquivo && !processando && (
          <button type="button" onClick={limpar} className="p-1 rounded" style={{ color: A.textMuted }} title="Remover NDA">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!arquivo ? (
        <label className="flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer text-xs font-semibold"
          style={{ border: `1px dashed ${A.border}`, color: processando ? A.textMuted : A.accent, background: A.accentDim }}>
          {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {processando ? 'Lendo documento...' : arrastando ? 'Solte o NDA aqui' : 'Arraste o NDA aqui ou clique para selecionar'}
          <input type="file" className="hidden" accept=".pdf,image/*" disabled={processando}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; enviar(f); }} />
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs" style={{ color: A.text }}>
            <PaperclipIcon processando={processando} />
            <span className="flex-1 truncate">{arquivo.nome}</span>
          </div>
          {!processando && (
            <p className="text-[10px]" style={{ color: A.textMuted }}>Arraste outro arquivo aqui para substituir.</p>
          )}

          {dados && (
            <>
              <div className="rounded-lg p-2 text-[11px] space-y-0.5" style={{ background: '#161b22', border: `1px solid ${A.border}` }}>
                <p className="font-semibold" style={{ color: A.text }}>{dados.nome} <span style={{ color: A.textMuted }}>· {dados.tipo_pessoa}</span></p>
                <p style={{ color: A.textMuted }}>{[dados.cpf_cnpj, dados.email, dados.telefone].filter(Boolean).join(' · ') || 'Documento sem dados de contato'}</p>
              </div>
              {cliente ? (
                <p className="flex items-start gap-1.5 text-[11px]" style={{ color: '#34d399' }}>
                  <UserCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Cliente identificado na base: {cliente.nome}
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-[11px]" style={{ color: A.gold }}>
                  <UserPlus className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Cliente não identificado na base — o cadastro será criado com os dados do NDA.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PaperclipIcon({ processando }) {
  return processando
    ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: A.accent }} />
    : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: A.accent }} />;
}