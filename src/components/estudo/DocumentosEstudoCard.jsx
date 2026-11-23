import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, Upload, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { checklistDocumentos } from '@/lib/estudoViabilidade';

const A = {
  surface2: '#1c2333', border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', textMuted: 'rgba(230,237,243,0.55)',
  gold: '#fbbf24', danger: '#f87171',
};

/**
 * Documentos que a equipe já recebeu (balanço, DRE, IR do sócio, faturamento...).
 * Cada arquivo é lido pela IA, identificado e incluído no checklist do estudo —
 * o link do cliente já mostra o item como recebido, sem retrabalho.
 */
export default function DocumentosEstudoCard({ produto, tipoCliente, documentos = [], onChange, desabilitado }) {
  const [lista, setLista] = useState(documentos || []);
  const [processando, setProcessando] = useState(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => { setLista(documentos || []); }, [documentos]);

  const anexar = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    if (!produto) { toast.error('Selecione o produto do estudo antes de anexar documentos.'); return; }

    let atual = [...lista];
    for (const file of arr) {
      setProcessando(file.name);
      try {
        const up = await base44.integrations.Core.UploadPublicFile({ file });
        const url = up?.file_url || up?.data?.file_url;
        if (!url) throw new Error('Falha ao enviar o arquivo.');

        let doc;
        try {
          const res = await base44.functions.invoke('identificarDocumentoEstudo', {
            file_uri: url, produto, tipo_cliente: tipoCliente,
          });
          if (res?.data?.error) throw new Error(res.data.error);
          doc = { tipo: res.data.tipo, descricao: res.data.descricao, nome_arquivo: file.name, url, enviado_em: new Date().toISOString(), origem: 'equipe' };
        } catch {
          doc = { tipo: 'outros', descricao: 'Outros documentos', nome_arquivo: file.name, url, enviado_em: new Date().toISOString(), origem: 'equipe' };
        }

        const item = checklistDocumentos(produto, tipoCliente).find((d) => d.tipo === doc.tipo);
        if (!item?.multiplo) atual = atual.filter((d) => d.tipo !== doc.tipo);
        atual = [...atual, doc];
        setLista(atual);
        onChange?.(atual);
        toast.success(`Identificado: ${doc.descricao}`);
      } catch (e) {
        toast.error(`${file.name}: ${e?.message || 'não foi possível anexar'}`);
      }
    }
    setProcessando(null);
  };

  const remover = (url) => {
    const next = lista.filter((d) => d.url !== url);
    setLista(next);
    onChange?.(next);
  };

  const soltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (processando || desabilitado) return;
    anexar(e.dataTransfer?.files);
  };

  return (
    <div className="rounded-xl p-3 space-y-2 transition"
      onDragOver={(e) => { if (desabilitado) return; e.preventDefault(); if (!processando) setArrastando(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={soltar}
      style={{
        background: arrastando ? A.accentDim : A.surface2,
        border: `1px ${arrastando ? 'dashed' : 'solid'} ${arrastando ? A.accent : A.border}`,
      }}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: A.accent }}>
          <Sparkles className="w-3.5 h-3.5" /> Documentos já recebidos
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: A.textMuted }}>
          Anexe balanço, DRE, IR dos sócios, faturamento, contrato social… A IA identifica cada documento e ele já entra no link do cliente como recebido.
        </p>
      </div>

      {lista.length > 0 && (
        <ul className="space-y-1">
          {lista.map((d) => (
            <li key={d.url} className="flex items-start gap-1.5 text-[11px] rounded-lg px-2 py-1.5" style={{ background: '#161b22', border: `1px solid ${A.border}` }}>
              <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: A.accent }} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate" style={{ color: A.text }}>{d.descricao}</p>
                <a href={d.url} target="_blank" rel="noreferrer" className="truncate block hover:underline" style={{ color: A.textMuted }}>{d.nome_arquivo}</a>
              </div>
              {!desabilitado && (
                <button type="button" onClick={() => remover(d.url)} className="p-0.5 flex-shrink-0" style={{ color: A.textMuted }} title="Remover">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!desabilitado && (
        <label className="flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer text-xs font-semibold"
          style={{ border: `1px dashed ${A.border}`, color: processando ? A.textMuted : A.accent, background: A.accentDim }}>
          {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="truncate px-2">
            {processando ? `Identificando ${processando}...` : arrastando ? 'Solte os documentos aqui' : 'Arraste os documentos aqui ou clique para selecionar'}
          </span>
          <input type="file" className="hidden" multiple disabled={!!processando} accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.csv,.doc,.docx"
            onChange={(e) => { const fs = e.target.files; e.target.value = ''; anexar(fs); }} />
        </label>
      )}
    </div>
  );
}