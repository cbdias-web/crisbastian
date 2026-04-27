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
  const [linkPagInput, setLinkPagInput] = useState(contrato.link_pagamento || '');
  const [editandoLinkPag, setEditandoLinkPag] = useState(false);
  const [salvandoLinkPag, setSalvandoLinkPag] = useState(false);
  const [origemPag, setOrigemPag] = useState(contrato.origem_pagamento || '');
  const [salvandoOrigem, setSalvandoOrigem] = useState(false);
  const [editandoLinkAssin, setEditandoLinkAssin] = useState(false);
  const [linkAssinInput, setLinkAssinInput] = useState(contrato.link_assinatura || '');
  const [salvandoLinkAssin, setSalvandoLinkAssin] = useState(false);

  const statusAtual = contrato.status || 'rascunho';
  const ordemAtual = STATUS_ORDER.indexOf(statusAtual);

  const salvarCampo = async (campos) => {
    await base44.entities.Contrato.update(contrato.id, campos);
    onUpdate({ ...contrato, ...campos });
  };

  const uploadArquivo = async (file, fieldUrl, fieldNome, novoStatus) => {
    setUploading(fieldUrl);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const campos = { [fieldUrl]: file_url, [fieldNome]: file.name };
      if (novoStatus && STATUS_ORDER.indexOf(novoStatus) > ordemAtual) campos.status = novoStatus;
      await salvarCampo(campos);
      toast.success('Arquivo enviado com sucesso!');
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

  const salvarLinkPagamento = async () => {
    setSalvandoLinkPag(true);
    try {
      const campos = { link_pagamento: linkPagInput.trim() };
      if (ordemAtual < STATUS_ORDER.indexOf('aguardando_pagamento')) campos.status = 'aguardando_pagamento';
      await salvarCampo(campos);
      setEditandoLinkPag(false);
      toast.success('Link de pagamento salvo!');
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
  };

  // Desbloqueios
  const podeAnexarAssinado = etapaAtingida(statusAtual, 'assinado');
  const podeVerCobranca = etapaAtingida(statusAtual, 'assinado') && !!contrato.contrato_assinado_url;
  const podeAnexarComprovante = etapaAtingida(statusAtual, 'aguardando_pagamento') &&
    (!!contrato.link_pagamento || !!contrato.boleto_url);
  const podePipeline = etapaAtingida(statusAtual, 'pago') && !!contrato.comprovante_url;

  return (
    <div className="space-y-4 mb-5">

      {/* Barra de progresso */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Fluxo do Contrato</p>
        <div className="flex items-center gap-0">
          {ETAPAS.map((etapa, i) => {
            const atingida = etapaAtingida(statusAtual, etapa.key);
            const atual = statusAtual === etapa.key;
            const Icon = etapa.icon;
            return (
              <div key={etapa.key} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    atingida ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200'
                  }`}>
                    {atingida ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-gray-300" />}
                  </div>
                  <span className={`text-[9px] font-semibold text-center leading-tight max-w-[60px] ${
                    atual ? 'text-emerald-600' : atingida ? 'text-gray-600' : 'text-gray-300'
                  }`}>{etapa.label}</span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${etapaAtingida(statusAtual, ETAPAS[i + 1].key) ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Controles admin */}
        {isAdmin && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Avançar para:</span>
              {ETAPAS.map(e => (
                <button key={e.key} onClick={() => forcarEtapa(e.key)}
                  disabled={statusAtual === e.key}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition ${
                    statusAtual === e.key
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                  }`}>
                  {e.label}
                </button>
              ))}
            </div>
            {/* Retornar etapa */}
            {ordemAtual > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Retornar para:</span>
                {STATUS_ORDER.slice(0, ordemAtual).filter(s => s !== 'rascunho' && s !== 'gerado' || true).map(s => {
                  const etapa = ETAPAS.find(e => e.key === s);
                  const label = etapa?.label || (s === 'rascunho' ? 'Rascunho' : s === 'gerado' ? 'PDF Gerado' : s);
                  return (
                    <button key={s} onClick={() => voltarEtapa(s)}
                      className="text-[10px] px-2.5 py-1 rounded-lg font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition flex items-center gap-1">
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

      {/* ETAPA 1: Contrato assinado */}
      {podeAnexarAssinado && (
        <EtapaCard titulo="Contrato Assinado pelo Cliente" cor="emerald" concluida={!!contrato.contrato_assinado_url}>
          {contrato.contrato_assinado_url ? (
            <div className="flex items-center gap-2 flex-wrap">
              <ArquivoAnexado url={contrato.contrato_assinado_url} nome={contrato.contrato_assinado_nome} />
              <UploadBtn label="Substituir" carregando={uploading === 'contrato_assinado_url'}
                onChange={f => uploadArquivo(f, 'contrato_assinado_url', 'contrato_assinado_nome', null)} small />
              <BtnRemover
                onClick={() => removerArquivo('contrato_assinado_url', 'contrato_assinado_nome',
                  // Se não há mais dados da etapa, volta para 'gerado'
                  !contrato.link_pagamento && !contrato.boleto_url && !contrato.comprovante_url ? 'gerado' : null
                )}
              />
            </div>
          ) : (
            <UploadBtn label="Anexar contrato assinado" carregando={uploading === 'contrato_assinado_url'}
              onChange={f => uploadArquivo(f, 'contrato_assinado_url', 'contrato_assinado_nome', null)} />
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
                      onChange={f => uploadArquivo(f, 'boleto_url', 'boleto_nome', 'aguardando_pagamento')} small />
                    <BtnRemover onClick={() => removerArquivo('boleto_url', 'boleto_nome',
                      !contrato.link_pagamento ? 'assinado' : null)} />
                  </div>
                ) : (
                  <UploadBtn label="Anexar boleto" carregando={uploading === 'boleto_url'}
                    onChange={f => uploadArquivo(f, 'boleto_url', 'boleto_nome', 'aguardando_pagamento')} />
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

      {/* ETAPA 3: Comprovante de pagamento */}
      {podeAnexarComprovante && (
        <EtapaCard titulo="Comprovante de Pagamento" cor="violet" concluida={!!contrato.comprovante_url}>
          {contrato.comprovante_url ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ArquivoAnexado url={contrato.comprovante_url} nome={contrato.comprovante_nome} />
                <UploadBtn label="Substituir" carregando={uploading === 'comprovante_url'}
                  onChange={f => uploadArquivo(f, 'comprovante_url', 'comprovante_nome', 'pago')} small />
                <BtnRemover onClick={() => removerArquivo('comprovante_url', 'comprovante_nome', 'aguardando_pagamento')} />
              </div>
              {contrato.origem_pagamento && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                    Origem: <span className="font-semibold">{contrato.origem_pagamento}</span>
                  </p>
                  <button onClick={() => salvarOrigemPagamento(null)} className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                    <X className="w-2.5 h-2.5" /> remover
                  </button>
                </div>
              )}
              {!contrato.origem_pagamento && (
                <div className="flex flex-wrap gap-1.5">
                  {ORIGENS_PAGAMENTO.map(o => (
                    <button key={o} onClick={() => salvarOrigemPagamento(o)} disabled={salvandoOrigem}
                      className="text-xs px-3 py-1.5 rounded-lg border font-semibold transition bg-white text-gray-600 border-gray-200 hover:border-violet-400">
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Origem do pagamento</p>
                <div className="flex flex-wrap gap-1.5">
                  {ORIGENS_PAGAMENTO.map(o => (
                    <button key={o} onClick={() => { setOrigemPag(o); salvarOrigemPagamento(o); }} disabled={salvandoOrigem}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
                        origemPag === o ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400'
                      }`}>{o}</button>
                  ))}
                </div>
              </div>
              <UploadBtn label="Anexar comprovante de pagamento" carregando={uploading === 'comprovante_url'}
                onChange={f => uploadArquivo(f, 'comprovante_url', 'comprovante_nome', 'pago')} />
            </div>
          )}
        </EtapaCard>
      )}

      {/* Pronto para Pipeline */}
      {(isAdmin || podePipeline) && etapaAtingida(statusAtual, 'pago') && statusAtual !== 'no_pipeline' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-800">Pronto para enviar ao Pipeline!</p>
            <p className="text-xs text-purple-500 mt-0.5">Todas as etapas foram concluídas.</p>
          </div>
          <span className="text-xs text-purple-500 font-medium">Use o botão "Enviar ao Pipeline" acima ↑</span>
        </div>
      )}
    </div>
  );
}

// --- Sub-componentes ---

function EtapaCard({ titulo, cor, concluida, children, adminOnly, adminMsg }) {
  const colors = {
    amber: { border: 'border-amber-200', bg: 'bg-amber-50/30', headerBg: 'bg-amber-50/50', headerBorder: 'border-amber-100', textColor: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/30', headerBg: 'bg-emerald-50/50', headerBorder: 'border-emerald-100', textColor: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
    blue: { border: 'border-blue-200', bg: 'bg-blue-50/30', headerBg: 'bg-blue-50/50', headerBorder: 'border-blue-100', textColor: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-500' },
    violet: { border: 'border-violet-200', bg: 'bg-violet-50/30', headerBg: 'bg-violet-50/50', headerBorder: 'border-violet-100', textColor: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-500' },
  };
  const c = colors[cor] || colors.emerald;
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${concluida ? c.border : 'border-gray-200'} ${concluida ? c.bg : 'bg-white'}`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2 ${concluida ? `${c.headerBorder} ${c.headerBg}` : 'border-gray-100 bg-gray-50/50'}`}>
        {concluida
          ? <CheckCircle2 className={`w-4 h-4 ${c.icon}`} />
          : <Circle className="w-4 h-4 text-gray-300" />
        }
        <p className={`text-xs font-bold uppercase tracking-wider ${concluida ? c.textColor : 'text-gray-500'}`}>{titulo}</p>
        {concluida && <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>Concluído</span>}
      </div>
      <div className="p-5">
        {adminOnly
          ? <p className="text-sm text-gray-400 italic flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />{adminMsg}</p>
          : children
        }
      </div>
    </div>
  );
}

function ArquivoAnexado({ url, nome }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition">
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{nome || 'Ver arquivo'}</span>
    </a>
  );
}

function UploadBtn({ label, carregando, onChange, small }) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer font-semibold rounded-xl transition ${
      small
        ? 'text-[11px] px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100'
        : 'text-xs px-4 py-2.5 bg-[#1a3150] text-white hover:opacity-90 shadow-sm'
    } ${carregando ? 'opacity-60 pointer-events-none' : ''}`}>
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