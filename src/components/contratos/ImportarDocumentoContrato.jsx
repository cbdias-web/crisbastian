import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Upload, Loader2, CheckCircle2, X, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ROTULOS = {
  nome: 'Nome / Razão social', cpf_cnpj: 'CPF/CNPJ', responsavel_legal: 'Responsável legal', cpf_responsavel: 'CPF do responsável',
  rg: 'RG', nascimento: 'Nascimento', nacionalidade: 'Nacionalidade', profissao: 'Profissão', estado_civil: 'Estado civil',
  email: 'E-mail', telefone: 'Telefone', cep: 'CEP', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade', estado: 'UF',
  valor_total: 'Valor total', valor_adesao: 'Entrada', num_parcelas: 'Nº de parcelas', valor_parcela: 'Valor da parcela',
  forma_pagamento: 'Forma de pagamento', data_primeiro_pagamento: 'Data da entrada', data_primeira_parcela: '1ª parcela',
  data_contrato: 'Data do contrato', estrutura_jurisdicao: 'Local da estrutura', offshore_tipo_entidade: 'Tipo de entidade',
  offshore_estrutura_nacional: 'Estrutura no Brasil', prazo_implantacao_dias: 'Prazo de entrega', offshore_manutencao_meses: 'Manutenção',
  local_assinatura: 'Local da assinatura', offshore_entrada_forma: 'Entrada com veículo', anexo_veiculo: 'Dados do veículo',
};
const ESSENCIAIS = ['nome', 'cpf_cnpj', 'email', 'telefone', 'endereco', 'cidade', 'valor_total'];
const TIPOS_DOC = { NDA: 'NDA', PROPOSTA: 'Proposta', CONTRATO: 'Contrato', OUTRO: 'Documento' };

/**
 * Arraste um NDA, proposta técnica/comercial ou documento da negociação:
 * a IA lê o arquivo e devolve os campos do contrato para preencher o formulário.
 */
export default function ImportarDocumentoContrato({ tipo, onDados, cor = '#1a3150' }) {
  const [processando, setProcessando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const ler = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 20 MB).'); return; }
    setProcessando(true);
    setResultado(null);
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      if (!up?.file_uri) throw new Error('Falha ao enviar o arquivo.');
      const res = await base44.functions.invoke('extrairDadosContrato', { file_uri: up.file_uri, tipo });
      const d = res?.data;
      if (!d || d.error) throw new Error(d?.error || 'Não foi possível ler o documento.');
      const preenchidos = Object.keys(d.dados || {});
      setResultado({ nome: file.name, ...d, preenchidos, faltando: ESSENCIAIS.filter(k => !preenchidos.includes(k)) });
      await onDados?.(d.dados || {}, { ...d, arquivo: file.name, file_uri: up.file_uri });
      toast.success(`${preenchidos.length} campo(s) preenchido(s) a partir do documento. Confira antes de salvar.`);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível ler o documento.');
    }
    setProcessando(false);
  };

  const soltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (processando) return;
    ler(e.dataTransfer?.files?.[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!processando) setArrastando(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false); }}
      onDrop={soltar}
      className={`bg-white rounded-2xl border shadow-sm p-4 mb-4 transition ${arrastando ? 'border-dashed border-2' : 'border-gray-200'}`}
      style={arrastando ? { borderColor: cor, background: '#f0fdfa' } : {}}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: cor }} /> Preencher com IA a partir de um documento
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">NDA, proposta técnica/comercial ou resumo da negociação (PDF ou imagem). A IA preenche cliente, valores, parcelas, local da estrutura e demais campos.</p>
        </div>
        {resultado && !processando && (
          <button type="button" onClick={() => setResultado(null)} className="p-1 rounded text-gray-400 hover:text-gray-600" title="Fechar resumo">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <label className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-semibold border border-dashed transition ${processando ? 'cursor-wait' : 'cursor-pointer hover:bg-gray-50'}`}
        style={{ borderColor: arrastando ? cor : '#d1d5db', color: processando ? '#9ca3af' : cor }}>
        {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {processando ? 'Lendo o documento e preenchendo os campos...' : arrastando ? 'Solte o arquivo aqui' : resultado ? 'Arraste outro documento para complementar' : 'Arraste o NDA ou a proposta aqui, ou clique para selecionar'}
        <input type="file" className="hidden" accept=".pdf,image/*" disabled={processando}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; ler(f); }} />
      </label>

      {resultado && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-2">
          <p className="text-xs text-gray-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">{TIPOS_DOC[resultado.tipo_documento] || 'Documento'}:</span>
            <span className="truncate">{resultado.nome}</span>
          </p>
          {resultado.resumo && <p className="text-[11px] text-gray-500">{resultado.resumo}</p>}
          <div className="flex flex-wrap gap-1">
            {resultado.preenchidos.map(k => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> {ROTULOS[k] || k}
              </span>
            ))}
          </div>
          {resultado.faltando.length > 0 && (
            <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Não encontrado no documento: {resultado.faltando.map(k => ROTULOS[k]).join(', ')} — complete manualmente.
            </p>
          )}
          {resultado.condicoes_especiais && (
            <p className="text-[11px] text-gray-600"><b>Condições especiais</b> (copiadas para Observações): {resultado.condicoes_especiais}</p>
          )}
        </div>
      )}
    </div>
  );
}
