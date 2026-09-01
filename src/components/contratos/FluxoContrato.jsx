import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle2, Circle, Upload, Link2, ExternalLink, Copy,
  Edit2, Save, Loader2, FileCheck, CreditCard, Receipt, X,
  Trash2, RotateCcw, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

const ORIGENS_PAGAMENTO = ['Boleto', 'Link de Pagamento', 'PIX', 'TED', 'Outros'];

const ETAPAS = [
  { key: 'assinado', label: 'Contrato Assinado', icon: FileCheck, cor: 'emerald' },
  { key: 'aguardando_pagamento', label: 'Cobrança Enviada', icon: CreditCard, cor: 'blue' },
  { key: 'pago', label: 'Pagamento Confirmado', icon: Receipt, cor: 'violet' },
  { key: 'no_pipeline', label: 'No Pipeline', icon: CheckCircle2, cor: 'purple' },
];

const STATUS_ORDER = ['rascunho', 'gerado', 'assinado', 'aguardando_pagamento', 'pago', 'no_pipeline'];

function etapaAtingida(status, etapaKey) {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(etapaKey);
}

function statusAnterior(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx > 0 ? STATUS_ORDER[idx - 1] : null;
}

export default function FluxoContrato({ contrato, isAdmin, onUpdate }) {
  const [uploading, setUploading] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [linkPagInput, setLinkPagInput] = useState(contrato.link_pagamento || '');
  const [editandoLinkPag, setEditandoLinkPag] = useState(false);
  const [salvandoLinkPag, setSalvandoLinkPag] = useState(false);
  const [origemPag, setOrigemPag] = useState(contrato.origem_pagamento || '');
  const [salvandoOrigem, setSalvandoOrigem] = useState(false);
  const [editandoLinkAssin, setEditandoLinkAssin] = useState(false);
  const [linkAssinInput, setLinkAssinInput] = useState(contrato.link_assinatura || '');
  const [salvandoLinkAssin, setSalvandoLinkAssin] = useState(false);
  const [editandoLinkAditivo, setEditandoLinkAditivo] = useState(false);
  const [linkAditivoInput, setLinkAditivoInput] = useState(contrato.link_assinatura_aditivo || '');
  const [salvandoLinkAditivo, setSalvandoLinkAditivo] = useState(false);

  const statusAtual = contrato.status || 'rascunho';
  const ordemAtual = STATUS_ORDER.indexOf(statusAtual);

  const salvarCampo = async (campos) => {
    await base44.entities.Contrato.update(contrato.id, campos);
    onUpdate({ ...contrato, ...campos });
  };

  const notificar = async (evento, destinatarios) => {
    try {
      await base44.functions.invoke('notificarStatusContrato', {
        contrato_id: contrato.id,
        evento,
        destinatarios,
      });
    } catch (e) {
      console.warn('Notificação falhou (não crítico):', e.message);
    }
  };

  const uploadArquivo = async (file, fieldUrl, fieldNome, novoStatus) => {
    setUploading(fieldUrl);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const campos = { [fieldUrl]: file_url, [fieldNome]: file.name };
      if (novoStatus && STATUS_ORDER.indexOf(novoStatus) > ordemAtual) campos.status = novoStatus;
      await salvarCampo(campos);
      toast.success('Arquivo enviado com sucesso!');

      // Notificações por tipo de arquivo
      if (fieldUrl === 'contrato_assinado_url') {
        notificar('contrato_assinado', 'admins');
      } else if (fieldUrl === 'boleto_url') {
        notificar('cobranca_enviada', 'gerente');
      } else if (fieldUrl === 'comprovante_url') {
        notificar('comprovante_anexado', 'admins');
      }
    } catch (err) {
      toast.error('Erro no upload: ' + err.message);
    }
    setUploading(null);
  };

  const removerArquivo = async (fieldUrl, fieldNome, statusRetorno) => {
    if (!confirm('Remover este arquivo? O status voltará para a etapa anterior.')) return;
    const campos = { [fieldUrl]: null, [fieldNome]: null };
    if (statusRetorno) campos.status = statusRetorno;
    await salvarCampo(campos);
    toast.success('Arquivo removido.');
  };

  // Lista normalizada de comprovantes (array + legado comprovante_url).
  const comprovantesList = (() => {
    const arr = Array.isArray(contrato.comprovantes) ? contrato.comprovantes.filter(c => c && c.url) : [];
    const list = [];
    const seen = new Set();
    if (contrato.comprovante_url && !arr.some(c => c.url === contrato.comprovante_url)) {
      list.push({ url: contrato.comprovante_url, nome: contrato.comprovante_nome || 'Comprovante' });
      seen.add(contrato.comprovante_url);
    }
    for (const c of arr) {
      if (c.url && !seen.has(c.url)) { list.push(c); seen.add(c.url); }
    }
    return list;
  })();

  const temComprovante = comprovantesList.length > 0;

  const adicionarComprovante = async (file) => {
    if (comprovantesList.length >= 3) {
      toast.error('Máximo de 3 comprovantes atingido. Remova um para anexar outro.');
      return;
    }
    setUploading('comprovante_novo');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const arr = Array.isArray(contrato.comprovantes) ? [...contrato.comprovantes] : [];
      // Evita duplicar o primário legado no array
      const arrLimpo = contrato.comprovante_url && !arr.some(c => c.url === contrato.comprovante_url)
        ? [{ url: contrato.comprovante_url, nome: contrato.comprovante_nome || 'Comprovante' }, ...arr]
        : arr;
      const novoArr = [...arrLimpo, { url: file_url, nome: file.name }];
      const campos = { comprovantes: novoArr };
      // Se ainda não há comprovante primário, define este + status=pago
      if (!contrato.comprovante_url) {
        campos.comprovante_url = file_url;
        campos.comprovante_nome = file.name;
        if (STATUS_ORDER.indexOf('pago') > ordemAtual) campos.status = 'pago';
      }
      await salvarCampo(campos);
      toast.success('Comprovante anexado!');
      notificar('comprovante_anexado', 'admins');
    } catch (err) {
      toast.error('Erro no upload: ' + err.message);
    }
    setUploading(null);
  };

  const removerComprovante = async (url) => {
    if (!confirm('Remover este comprovante?')) return;
    const arr = Array.isArray(contrato.comprovantes) ? contrato.comprovantes.filter(c => c.url !== url) : [];
    const campos = { comprovantes: arr };
    if (contrato.comprovante_url === url) {
      const proximo = arr[0];
      if (proximo) {
        campos.comprovante_url = proximo.url;
        campos.comprovante_nome = proximo.nome;
      } else {
        campos.comprovante_url = null;
        campos.comprovante_nome = null;
        if (statusAtual === 'pago') campos.status = 'aguardando_pagamento';
      }
    }
    await salvarCampo(campos);
    toast.success('Comprovante removido.');
  };

  const salvarLinkPagamento = async () => {
    setSalvandoLinkPag(true);
    try {
      const campos = { link_pagamento: linkPagInput.trim() };
      if (ordemAtual < STATUS_ORDER.indexOf('aguardando_pagamento')) campos.status = 'aguardando_pagamento';
      await salvarCampo(campos);
      setEditandoLinkPag(false);
      toast.success('Link de pagamento salvo!');
      notificar('cobranca_enviada', 'gerente');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setSalvandoLinkPag(false);
  };

  const removerLinkPagamento = async () => {
    if (!confirm('Remover o link de pagamento?')) return;
    // Se não houver boleto, volta o status também
    const campos = { link_pagamento: null };
    if (!contrato.boleto_url && statusAtual === 'aguardando_pagamento') campos.status = 'assinado';
    await salvarCampo(campos);
    setLinkPagInput('');
    toast.success('Link removido.');
  };

  const salvarLinkAssinatura = async () => {
    setSalvandoLinkAssin(true);
    try {
      await salvarCampo({ link_assinatura: linkAssinInput.trim() || null });
      setEditandoLinkAssin(false);
      toast.success('Link de assinatura atualizado!');
      if (linkAssinInput.trim()) notificar('link_assinatura_adicionado', 'gerente');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setSalvandoLinkAssin(false);
  };

  const removerLinkAssinatura = async () => {
    if (!confirm('Remover o link de assinatura?')) return;
    await salvarCampo({ link_assinatura: null });
    setLinkAssinInput('');
    toast.success('Link de assinatura removido.');
  };

  const salvarLinkAditivo = async () => {
    setSalvandoLinkAditivo(true);
    try {
      await salvarCampo({ link_assinatura_aditivo: linkAditivoInput.trim() || null });
      setEditandoLinkAditivo(false);
      toast.success('Link do aditivo salvo!');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setSalvandoLinkAditivo(false);
  };

  const removerLinkAditivo = async () => {
    if (!confirm('Remover o link de assinatura do aditivo?')) return;
    await salvarCampo({ link_assinatura_aditivo: null });
    setLinkAditivoInput('');
    toast.success('Link do aditivo removido.');
  };

  const salvarOrigemPagamento = async (origem) => {
    setSalvandoOrigem(true);
    try {
      await salvarCampo({ origem_pagamento: origem });
      setOrigemPag(origem);
      toast.success('Origem registrada!');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setSalvandoOrigem(false);
  };

  const voltarEtapa = async (novoStatus) => {
    const label = STATUS_ORDER.includes(novoStatus)
      ? (ETAPAS.find(e => e.key === novoStatus)?.label || novoStatus)
      : novoStatus;
    if (!confirm(`Retornar para a etapa "${label}"? Dados da etapa atual podem precisar ser reinseridos.`)) return;
    await salvarCampo({ status: novoStatus });
    toast.success('Etapa retornada!');
  };

  const forcarEtapa = async (novoStatus) => {
    const label = ETAPAS.find(e => e.key === novoStatus)?.label || novoStatus;
    if (!confirm(`Forçar etapa para "${label}"?`)) return;
    await salvarCampo({ status: novoStatus });
    toast.success('Etapa atualizada!');

    // Notificar conforme etapa forçada
    const eventoMap = {
      assinado: ['contrato_assinado', 'admins'],
      aguardando_pagamento: ['cobranca_enviada', 'gerente'],
      pago: ['contrato_pago', 'gerente'],
      no_pipeline: ['no_pipeline', 'gerente'],
    };
    const ev = eventoMap[novoStatus];
    if (ev) notificar(ev[0], ev[1]);
  };

  // Desbloqueios
  const podeAnexarAssinado = etapaAtingida(statusAtual, 'assinado');
  const podeVerCobranca = etapaAtingida(statusAtual, 'assinado') && !!contrato.contrato_assinado_url;
  const podeAnexarComprovante = etapaAtingida(statusAtual, 'aguardando_pagamento') &&
    (!!contrato.link_pagamento || !!contrato.boleto_url);
  const podePipeline = etapaAtingida(statusAtual, 'pago') && temComprovante;

  return (
    <div className="space-y-4 mb-5">

      {/* Barra de progresso */}
      <div className="rounded-2xl shadow-sm p-5" style={{ background: '#161b22', border: '1px solid rgba(0,212,170,0.15)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'rgba(230,237,243,0.55)' }}>Fluxo do Contrato</p>
        <div className="flex items-center gap-0">
          {ETAPAS.map((etapa, i) => {
            const atingida = etapaAtingida(statusAtual, etapa.key);
            const atual = statusAtual === etapa.key;
            const Icon = etapa.icon;
            return (
              <div key={etapa.key} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                    style={atingida
                      ? { background: '#00D4AA', borderColor: '#00D4AA' }
                      : { background: '#1c2333', borderColor: 'rgba(230,237,243,0.15)' }}>
                    {atingida ? <CheckCircle2 className="w-4 h-4" style={{ color: '#0d1117' }} /> : <Icon className="w-4 h-4" style={{ color: 'rgba(230,237,243,0.25)' }} />}
                  </div>
                  <span className="text-[9px] font-semibold text-center leading-tight max-w-[60px]"
                    style={{ color: atual ? '#00D4AA' : atingida ? 'rgba(230,237,243,0.7)' : 'rgba(230,237,243,0.3)' }}>{etapa.label}</span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ background: etapaAtingida(statusAtual, ETAPAS[i + 1].key) ? 'rgba(0,212,170,0.6)' : 'rgba(230,237,243,0.12)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Controles admin */}
        {isAdmin && (
          <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(0,212,170,0.12)' }}>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>Avançar para:</span>
              {ETAPAS.map(e => (
                <button key={e.key} onClick={() => forcarEtapa(e.key)}
                  disabled={statusAtual === e.key}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition"
                  style={statusAtual === e.key
                    ? { background: 'rgba(230,237,243,0.05)', color: 'rgba(230,237,243,0.3)', borderColor: 'rgba(230,237,243,0.1)', cursor: 'default' }
                    : { background: '#1c2333', color: 'rgba(230,237,243,0.7)', borderColor: 'rgba(0,212,170,0.2)' }}>
                  {e.label}
                </button>
              ))}
            </div>
            {/* Retornar etapa */}
            {ordemAtual > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.4)' }}>Retornar para:</span>
                {STATUS_ORDER.slice(0, ordemAtual).filter(s => s !== 'rascunho' && s !== 'gerado' || true).map(s => {
                  const etapa = ETAPAS.find(e => e.key === s);
                  const label = etapa?.label || (s === 'rascunho' ? 'Rascunho' : s === 'gerado' ? 'PDF Gerado' : s);
                  return (
                    <button key={s} onClick={() => voltarEtapa(s)}
                      className="text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition flex items-center gap-1"
                      style={{ borderColor: 'rgba(249,115,22,0.4)', color: '#fb923c', background: 'rgba(249,115,22,0.12)' }}>
                      <RotateCcw className="w-2.5 h-2.5" />{label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ETAPA 0 extra: Link de Assinatura (admin pode remover/editar) */}
      {(contrato.link_assinatura || isAdmin) && etapaAtingida(statusAtual, 'assinado') && (
        <EtapaCard titulo="Link de Assinatura Online" cor="amber" concluida={!!contrato.link_assinatura}>
          {editandoLinkAssin ? (
            <div className="flex gap-2">
              <input type="url" value={linkAssinInput} onChange={e => setLinkAssinInput(e.target.value)}
                placeholder="https://..." autoFocus
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400" />
              <button onClick={salvarLinkAssinatura} disabled={salvandoLinkAssin}
                className="flex items-center gap-1 px-3 py-2 bg-amber-600 text-white text-xs rounded-xl disabled:opacity-50">
                {salvandoLinkAssin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
              </button>
              <button onClick={() => setEditandoLinkAssin(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl"><X className="w-3 h-3" /></button>
            </div>
          ) : contrato.link_assinatura ? (
            <div className="flex items-center gap-2 flex-wrap">
              <a href={contrato.link_assinatura} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-600 underline truncate flex items-center gap-1 min-w-0">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />{contrato.link_assinatura}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(contrato.link_assinatura); toast.success('Copiado!'); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs rounded-lg shrink-0"><Copy className="w-3 h-3" /> Copiar</button>
              {isAdmin && <>
                <button onClick={() => { setLinkAssinInput(contrato.link_assinatura); setEditandoLinkAssin(true); }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0"><Edit2 className="w-3 h-3" /></button>
                <button onClick={removerLinkAssinatura}
                  className="p-1.5 text-red-400 hover:text-red-600 shrink-0" title="Remover link"><Trash2 className="w-3 h-3" /></button>
              </>}
            </div>
          ) : isAdmin ? (
            <button onClick={() => { setLinkAssinInput(''); setEditandoLinkAssin(true); }}
              className="text-xs text-amber-600 hover:underline font-semibold flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Adicionar link de assinatura
            </button>
          ) : (
            <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Aguardando administrador adicionar o link de assinatura.
            </p>
          )}
        </EtapaCard>
      )}

      {/* Link de Assinatura do ADITIVO (admin pode adicionar quando necessário) */}
      {(contrato.link_assinatura_aditivo || isAdmin) && etapaAtingida(statusAtual, 'assinado') && (
        <EtapaCard titulo="Link de Assinatura — Aditivo de Contrato" cor="amber" concluida={!!contrato.link_assinatura_aditivo}>
          {editandoLinkAditivo ? (
            <div className="flex gap-2">
              <input type="url" value={linkAditivoInput} onChange={e => setLinkAditivoInput(e.target.value)}
                placeholder="https://..." autoFocus
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400" />
              <button onClick={salvarLinkAditivo} disabled={salvandoLinkAditivo}
                className="flex items-center gap-1 px-3 py-2 bg-amber-600 text-white text-xs rounded-xl disabled:opacity-50">
                {salvandoLinkAditivo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
              </button>
              <button onClick={() => setEditandoLinkAditivo(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl"><X className="w-3 h-3" /></button>
            </div>
          ) : contrato.link_assinatura_aditivo ? (
            <div className="flex items-center gap-2 flex-wrap">
              <a href={contrato.link_assinatura_aditivo} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-sm text-blue-600 underline truncate flex items-center gap-1 min-w-0">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />{contrato.link_assinatura_aditivo}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(contrato.link_assinatura_aditivo); toast.success('Copiado!'); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs rounded-lg shrink-0"><Copy className="w-3 h-3" /> Copiar</button>
              {isAdmin && <>
                <button onClick={() => { setLinkAditivoInput(contrato.link_assinatura_aditivo); setEditandoLinkAditivo(true); }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0"><Edit2 className="w-3 h-3" /></button>
                <button onClick={removerLinkAditivo}
                  className="p-1.5 text-red-400 hover:text-red-600 shrink-0" title="Remover link"><Trash2 className="w-3 h-3" /></button>
              </>}
            </div>
          ) : isAdmin ? (
            <button onClick={() => { setLinkAditivoInput(''); setEditandoLinkAditivo(true); }}
              className="text-xs text-amber-600 hover:underline font-semibold flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Adicionar link do aditivo
            </button>
          ) : null}
        </EtapaCard>
      )}

      {/* ETAPA 1: Contrato assinado */}
      {podeAnexarAssinado && (
        <EtapaCard titulo="Contrato Assinado pelo Cliente" cor="emerald" concluida={!!contrato.contrato_assinado_url}>
          {contrato.contrato_assinado_url ? (
            <div className="flex items-center gap-2 flex-wrap">
              <ArquivoAnexado url={contrato.contrato_assinado_url} nome={contrato.contrato_assinado_nome} />
              <UploadBtn label="Substituir" carregando={uploading === 'contrato_assinado_url'}
                onChange={f => uploadArquivo(f, 'contrato_assinado_url', 'contrato_assinado_nome', null)} small 
                isDragOver={dragOver === 'contrato_assinado_url'} />
              <BtnRemover
                onClick={() => removerArquivo('contrato_assinado_url', 'contrato_assinado_nome',
                  // Se não há mais dados da etapa, volta para 'gerado'
                  !contrato.link_pagamento && !contrato.boleto_url && !contrato.comprovante_url ? 'gerado' : null
                )}
              />
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver('contrato_assinado_url'); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); setDragOver(null); if (e.dataTransfer.files[0]) uploadArquivo(e.dataTransfer.files[0], 'contrato_assinado_url', 'contrato_assinado_nome', null); }}
              className="p-4 rounded-xl border-2 border-dashed transition"
              style={dragOver === 'contrato_assinado_url' ? { borderColor: '#34d399', background: 'rgba(16,185,129,0.1)' } : { borderColor: 'rgba(0,212,170,0.2)', background: '#1c2333' }}
            >
              <UploadBtn label="Anexar contrato assinado" carregando={uploading === 'contrato_assinado_url'}
                onChange={f => uploadArquivo(f, 'contrato_assinado_url', 'contrato_assinado_nome', null)} 
                isDragOver={dragOver === 'contrato_assinado_url'} />
            </div>
          )}
        </EtapaCard>
      )}

      {/* ETAPA 2: Cobrança */}
      {podeVerCobranca && (
        <EtapaCard titulo="Cobrança ao Cliente" cor="blue"
          concluida={!!(contrato.link_pagamento || contrato.boleto_url)}
          adminOnly={!isAdmin && !contrato.link_pagamento && !contrato.boleto_url}
          adminMsg="Aguardando administrador enviar link ou boleto de pagamento.">

          {/* Admin: edita link e boleto */}
          {isAdmin && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Link de pagamento</p>
                {editandoLinkPag ? (
                  <div className="flex gap-2">
                    <input type="url" value={linkPagInput} onChange={e => setLinkPagInput(e.target.value)}
                      placeholder="https://..." autoFocus
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
                    <button onClick={salvarLinkPagamento} disabled={salvandoLinkPag}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-xl disabled:opacity-50">
                      {salvandoLinkPag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                    </button>
                    <button onClick={() => setEditandoLinkPag(false)} className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl"><X className="w-3 h-3" /></button>
                  </div>
                ) : contrato.link_pagamento ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={contrato.link_pagamento} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 underline truncate flex items-center gap-1 min-w-0">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />{contrato.link_pagamento}
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(contrato.link_pagamento); toast.success('Copiado!'); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs rounded-lg shrink-0"><Copy className="w-3 h-3" /> Copiar</button>
                    <button onClick={() => { setLinkPagInput(contrato.link_pagamento); setEditandoLinkPag(true); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0"><Edit2 className="w-3 h-3" /></button>
                    <BtnRemover onClick={removerLinkPagamento} />
                  </div>
                ) : (
                  <button onClick={() => setEditandoLinkPag(true)}
                    className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Adicionar link
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Upload className="w-3 h-3" /> Boleto de pagamento</p>
                {contrato.boleto_url ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ArquivoAnexado url={contrato.boleto_url} nome={contrato.boleto_nome} />
                    <UploadBtn label="Substituir" carregando={uploading === 'boleto_url'}
                      onChange={f => uploadArquivo(f, 'boleto_url', 'boleto_nome', 'aguardando_pagamento')} small 
                      isDragOver={dragOver === 'boleto_url'} />
                    <BtnRemover onClick={() => removerArquivo('boleto_url', 'boleto_nome',
                      !contrato.link_pagamento ? 'assinado' : null)} />
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver('boleto_url'); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => { e.preventDefault(); setDragOver(null); if (e.dataTransfer.files[0]) uploadArquivo(e.dataTransfer.files[0], 'boleto_url', 'boleto_nome', 'aguardando_pagamento'); }}
                    className="p-4 rounded-xl border-2 border-dashed transition"
                    style={dragOver === 'boleto_url' ? { borderColor: '#60a5fa', background: 'rgba(59,130,246,0.1)' } : { borderColor: 'rgba(0,212,170,0.2)', background: '#1c2333' }}
                  >
                    <UploadBtn label="Anexar boleto" carregando={uploading === 'boleto_url'}
                      onChange={f => uploadArquivo(f, 'boleto_url', 'boleto_nome', 'aguardando_pagamento')} 
                      isDragOver={dragOver === 'boleto_url'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gerente: só visualiza */}
          {!isAdmin && (contrato.link_pagamento || contrato.boleto_url) && (
            <div className="space-y-2">
              {contrato.link_pagamento && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-semibold">Link de pagamento</p>
                  <div className="flex items-center gap-2">
                    <a href={contrato.link_pagamento} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 underline truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />{contrato.link_pagamento}
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(contrato.link_pagamento); toast.success('Copiado!'); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs rounded-lg"><Copy className="w-3 h-3" /> Copiar</button>
                  </div>
                </div>
              )}
              {contrato.boleto_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-semibold">Boleto</p>
                  <ArquivoAnexado url={contrato.boleto_url} nome={contrato.boleto_nome} />
                </div>
              )}
            </div>
          )}
        </EtapaCard>
      )}

      {/* ETAPA 3: Comprovante de pagamento (até 3 comprovantes) */}
      {podeAnexarComprovante && (
        <EtapaCard titulo="Comprovante de Pagamento" cor="violet" concluida={temComprovante}>
          <div className="space-y-3">
            {/* Origem do pagamento */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Origem do pagamento</p>
              <div className="flex flex-wrap gap-1.5">
                {ORIGENS_PAGAMENTO.map(o => (
                  <button key={o} onClick={() => { setOrigemPag(o); salvarOrigemPagamento(o); }} disabled={salvandoOrigem}
                    className="text-xs px-3 py-1.5 rounded-lg border font-semibold transition"
                    style={contrato.origem_pagamento === o
                      ? { background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' }
                      : { background: '#1c2333', color: 'rgba(230,237,243,0.7)', borderColor: 'rgba(0,212,170,0.2)' }}>{o}</button>
                ))}
              </div>
              {contrato.origem_pagamento && (
                <button onClick={() => salvarOrigemPagamento(null)} className="mt-1.5 text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                  <X className="w-2.5 h-2.5" /> remover origem
                </button>
              )}
            </div>

            {/* Lista de comprovantes anexados */}
            {temComprovante && (
              <div className="space-y-2">
                {comprovantesList.map((c, i) => (
                  <div key={c.url} className="flex items-center gap-2 flex-wrap rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>#{i + 1}</span>
                    <ArquivoAnexado url={c.url} nome={c.nome} />
                    <BtnRemover onClick={() => removerComprovante(c.url)} />
                  </div>
                ))}
                <p className="text-[10px]" style={{ color: 'rgba(230,237,243,0.4)' }}>
                  {comprovantesList.length} de 3 comprovante{comprovantesList.length > 1 ? 's' : ''} anexado{comprovantesList.length > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Drop zone — só aparece se houver espaço */}
            {comprovantesList.length < 3 && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver('comprovante_url'); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); setDragOver(null); if (e.dataTransfer.files[0]) adicionarComprovante(e.dataTransfer.files[0]); }}
                className="p-4 rounded-xl border-2 border-dashed transition"
                style={dragOver === 'comprovante_url' ? { borderColor: '#a78bfa', background: 'rgba(139,92,246,0.1)' } : { borderColor: 'rgba(0,212,170,0.2)', background: '#1c2333' }}
              >
                <UploadBtn
                  label={temComprovante ? 'Anexar mais um comprovante' : 'Anexar comprovante de pagamento'}
                  carregando={uploading === 'comprovante_novo'}
                  onChange={adicionarComprovante}
                  isDragOver={dragOver === 'comprovante_url'}
                />
              </div>
            )}
          </div>
        </EtapaCard>
      )}

      {/* Pronto para Pipeline */}
      {(isAdmin || podePipeline) && etapaAtingida(statusAtual, 'pago') && statusAtual !== 'no_pipeline' && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>Pronto para enviar ao Pipeline!</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.7)' }}>Todas as etapas foram concluídas.</p>
          </div>
          <span className="text-xs font-medium" style={{ color: 'rgba(196,181,253,0.7)' }}>Use o botão "Enviar para Vendas" acima ↑</span>
        </div>
      )}
    </div>
  );
}

// --- Sub-componentes ---

function EtapaCard({ titulo, cor, concluida, children, adminOnly, adminMsg }) {
  const colors = {
    amber: { accent: '#fbbf24', glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    emerald: { accent: '#34d399', glow: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    blue: { accent: '#60a5fa', glow: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
    violet: { accent: '#a78bfa', glow: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  };
  const c = colors[cor] || colors.emerald;
  return (
    <div className="rounded-2xl shadow-sm overflow-hidden"
      style={{ background: '#161b22', border: `1px solid ${concluida ? c.border : 'rgba(0,212,170,0.12)'}` }}>
      <div className="px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${concluida ? c.border : 'rgba(0,212,170,0.1)'}`, background: concluida ? c.glow : '#1c2333' }}>
        {concluida
          ? <CheckCircle2 className="w-4 h-4" style={{ color: c.accent }} />
          : <Circle className="w-4 h-4" style={{ color: 'rgba(230,237,243,0.3)' }} />
        }
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: concluida ? c.accent : 'rgba(230,237,243,0.55)' }}>{titulo}</p>
        {concluida && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.glow, color: c.accent, border: `1px solid ${c.border}` }}>Concluído</span>}
      </div>
      <div className="p-5">
        {adminOnly
          ? <p className="text-sm italic flex items-center gap-2" style={{ color: 'rgba(230,237,243,0.4)' }}><Loader2 className="w-3.5 h-3.5 animate-spin" />{adminMsg}</p>
          : children
        }
      </div>
    </div>
  );
}

function ArquivoAnexado({ url, nome }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition"
      style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)', color: '#00D4AA' }}>
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{nome || 'Ver arquivo'}</span>
    </a>
  );
}

function UploadBtn({ label, carregando, onChange, small, isDragOver }) {
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer font-semibold rounded-xl transition ${
        small ? 'text-[11px] px-3 py-1.5 border' : 'text-xs px-4 py-2.5 shadow-sm'
      } ${carregando ? 'opacity-60 pointer-events-none' : ''} ${isDragOver ? 'ring-2 ring-emerald-400 brightness-110' : ''}`}
      style={small
        ? { borderColor: 'rgba(0,212,170,0.2)', color: 'rgba(230,237,243,0.6)', background: '#1c2333' }
        : { background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
      {carregando ? 'Enviando...' : label}
      <input type="file" className="hidden" onChange={e => { if (e.target.files[0]) onChange(e.target.files[0]); }} />
    </label>
  );
}

function BtnRemover({ onClick }) {
  return (
    <button onClick={onClick} title="Remover"
      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}