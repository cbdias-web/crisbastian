import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageCircle, Mail, ChevronDown, CheckCircle2, Send, Loader2, LifeBuoy,
  BookOpen, Zap, AlertCircle, Plus, Clock, Search, X, Star, MessageSquare,
  ChevronRight, RefreshCw, Filter, Paperclip, FileText, Download
} from 'lucide-react';
import { toast } from 'sonner';
import useIsAdmin from '@/hooks/useIsAdmin';
import AnexoUpload from '@/components/suporte/AnexoUpload';

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIAS = [
  'Acesso', 'Vendas e Comissoes', 'Contratos e Pipeline',
  'Analise de Documentos', 'Precificacao', 'Chat Interno',
  'Capacitacao', 'Sugestao de Melhoria', 'Bug / Erro', 'Outro',
];

const STATUS_CFG = {
  aberto:            { label: 'Aberto',             color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  em_andamento:      { label: 'Em Andamento',        color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  aguardando_usuario:{ label: 'Aguardando Voce',     color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  resolvido:         { label: 'Resolvido',           color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  fechado:           { label: 'Fechado',             color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
};

const PRIORIDADE_CFG = {
  baixa:   { label: 'Baixa',    color: 'bg-gray-100 text-gray-600' },
  media:   { label: 'Media',    color: 'bg-blue-100 text-blue-700' },
  alta:    { label: 'Alta',     color: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente',  color: 'bg-red-100 text-red-700' },
};

const FAQS = [
  { cat: 'Acesso', items: [
    { q: 'Nao recebi o convite.', a: 'Verifique o spam. Se nao encontrar, solicite ao administrador que reenvie o convite em Usuarios > Convidar Usuario.' },
    { q: 'Esqueci minha senha.', a: 'Na tela de login, clique em "Esqueci minha senha". Um link sera enviado ao seu e-mail.' },
  ]},
  { cat: 'Vendas', items: [
    { q: 'Registrei uma venda errada. Como corrigir?', a: 'Em Vendas, localize a venda e clique em Editar. As comissoes sao recalculadas automaticamente.' },
    { q: 'Minha comissao nao aparece.', a: 'A comissao e gerada ao salvar a venda. Verifique se a venda foi salva com sucesso. Se persistir, abra um chamado.' },
  ]},
  { cat: 'Precificacao', items: [
    { q: 'Os valores do simulador estao incorretos.', a: 'Verifique os parametros em Precificacao > Parametros. Um administrador pode ter alterado os valores base.' },
    { q: 'A busca de cambio nao funciona.', a: 'O servico de cotacao depende de API externa. Nesse caso, insira o valor manualmente no campo do simulador.' },
  ]},
  { cat: 'Chat e Meet', items: [
    { q: 'Nao estou recebendo mensagens no chat.', a: 'Verifique se voce e membro do canal. Para canais privados, o criador precisa adicionar voce.' },
    { q: 'O link do Google Meet nao e gerado.', a: 'Sua conta Google precisa estar conectada. Acesse Agenda do Dia e clique em "Google Calendar" para vincular.' },
  ]},
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.aberto;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function FaqAccordion({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${open ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
        <span className="text-sm font-medium text-gray-800 pr-3">{item.q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Modal de detalhe do chamado ─────────────────────────────────────────────

function ChamadoDetalhe({ chamado, user, isAdmin, onClose, onUpdate }) {
  const [resposta, setResposta] = useState('');
  const [respostaAnexos, setRespostaAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState(null);
  const [resolvendoIA, setResolvendoIA] = useState(false);
  const [avaliacao, setAvaliacao] = useState(chamado.avaliacao || 0);

  const respostas = chamado.respostas || [];
  const chamadoAnexos = chamado.anexos || [];

  async function enviarResposta() {
    if (!resposta.trim()) return;
    setEnviando(true);
    const novaResposta = {
      autor_nome: user?.full_name || user?.nome_tratamento || 'Voce',
      texto: resposta.trim(),
      data_hora: new Date().toISOString(),
      is_suporte: isAdmin,
      anexos: respostaAnexos,
    };
    const atualizadas = [...respostas, novaResposta];
    const novoStatus = isAdmin ? 'aguardando_usuario' : (chamado.status === 'aguardando_usuario' ? 'em_andamento' : chamado.status);
    await onUpdate(chamado.id, { respostas: atualizadas, status: novoStatus });
    // Notificar via Jarvis
    try {
      if (isAdmin && chamado.usuario_email) {
        await base44.entities.JarvisMensagem.create({
          destinatario_email: chamado.usuario_email,
          remetente_nome: 'Suporte Villela Exchange',
          remetente_email: user?.email || '',
          mensagem: `📋 **Chamado #${chamado.numero || chamado.id.slice(-4)} — ${chamado.titulo}**\n\n**Nova resposta do suporte:**\n${resposta.trim()}\n\nAcesse a Central de Suporte para visualizar e responder.`,
        });
      } else if (!isAdmin && chamado.usuario_email !== user?.email) {
        await base44.entities.JarvisMensagem.create({
          destinatario_email: 'suporte@villelaexchange.com.br',
          remetente_nome: user?.full_name || '',
          remetente_email: user?.email || '',
          mensagem: `Nova resposta no chamado #${chamado.numero || chamado.id.slice(-4)} de ${chamado.usuario_nome}: ${resposta.trim()}`,
        });
      }
    } catch (_) {}
    setResposta('');
    setRespostaAnexos([]);
    setEnviando(false);
    toast.success('Resposta enviada!');
  }

  async function fecharChamado() {
    await onUpdate(chamado.id, { status: 'fechado', avaliacao });
    toast.success('Chamado fechado. Obrigado pelo feedback!');
    onClose();
  }

  async function reabrirChamado() {
    await alterarStatus('aberto');
  }

  async function alterarStatus(novoStatus) {
    if (novoStatus === chamado.status) return;
    const msgSistema = {
      autor_nome: 'Sistema',
      texto: `🔄 Status alterado para: ${STATUS_CFG[novoStatus]?.label || novoStatus}`,
      data_hora: new Date().toISOString(),
      is_suporte: true,
    };
    const respostasAtualizadas = [...respostas, msgSistema];
    await onUpdate(chamado.id, { respostas: respostasAtualizadas, status: novoStatus });
    try {
      if (isAdmin && chamado.usuario_email) {
        await base44.entities.JarvisMensagem.create({
          destinatario_email: chamado.usuario_email,
          remetente_nome: 'Suporte Villela Exchange',
          remetente_email: user?.email || '',
          mensagem: `📋 **Chamado #${chamado.numero || chamado.id.slice(-4)} — ${chamado.titulo}**\n\nStatus atualizado para: **${STATUS_CFG[novoStatus]?.label || novoStatus}**\n\nAcesse a Central de Suporte para mais detalhes.`,
        });
      } else if (!isAdmin) {
        await base44.entities.JarvisMensagem.create({
          destinatario_email: 'suporte@villelaexchange.com.br',
          remetente_nome: user?.full_name || '',
          remetente_email: user?.email || '',
          mensagem: `📋 **Chamado #${chamado.numero || chamado.id.slice(-4)}**\n\nStatus atualizado para: **${STATUS_CFG[novoStatus]?.label || novoStatus}** por ${user?.full_name || 'usuário'}.`,
        });
      }
    } catch (_) {}
    toast.success(`Status alterado para: ${STATUS_CFG[novoStatus]?.label || novoStatus}`);
  }

  async function analisarComIA() {
    setAnalisandoIA(true);
    try {
      const response = await base44.functions.invoke('analisarChamadoIA', { chamado_id: chamado.id });
      const data = response.data;
      setSugestaoIA({
        resposta: data.resposta,
        novo_status: data.novo_status,
        resumo_interno: data.resumo_interno,
        acao_executar: data.acao_executar || { tipo: 'nenhuma' },
      });
      toast.success('Análise da IA concluída — revise e aprove a sugestão abaixo.');
    } catch (error) {
      toast.error('Erro ao analisar: ' + (error.response?.data?.error || error.message));
    }
    setAnalisandoIA(false);
  }

  async function aprovarSugestaoIA() {
    if (!sugestaoIA) return;
    setEnviando(true);
    try {
      // Se houver uma acao executavel, aplica-la antes de enviar a resposta
      let acaoResultado = null;
      const acao = sugestaoIA.acao_executar;
      if (acao && acao.tipo && acao.tipo !== 'nenhuma') {
        try {
          const execResp = await base44.functions.invoke('executarAcaoChamado', {
            chamado_id: chamado.id,
            acao,
          });
          acaoResultado = execResp.data;
          if (!acaoResultado.success) {
            toast.error('Falha ao executar ação: ' + (acaoResultado.error || ''));
            setEnviando(false);
            return;
          }
        } catch (error) {
          toast.error('Erro ao executar ação: ' + (error.response?.data?.error || error.message));
          setEnviando(false);
          return;
        }
      }

      // Montar texto da resposta, incluindo resultado da acao executada
      let textoResposta = sugestaoIA.resposta;
      if (acaoResultado && acaoResultado.success && acaoResultado.tipo !== 'nenhuma') {
        const detalhe = acaoResultado.mensagem || '';
        textoResposta += `\n\n---\n✅ **Solução aplicada automaticamente:** ${detalhe}`;
      }

      const novaResposta = {
        autor_nome: 'Assistente IA (Auto-Resolução)',
        texto: textoResposta,
        data_hora: new Date().toISOString(),
        is_suporte: true,
      };
      const respostasAtualizadas = [...(chamado.respostas || []), novaResposta];
      await onUpdate(chamado.id, { respostas: respostasAtualizadas, status: sugestaoIA.novo_status });
      try {
        if (chamado.usuario_email) {
          await base44.entities.JarvisMensagem.create({
            destinatario_email: chamado.usuario_email,
            remetente_nome: 'Suporte Villela Exchange',
            remetente_email: user?.email || '',
            mensagem: `📋 **Chamado #${chamado.numero || chamado.id.slice(-4)} — ${chamado.titulo}**\n\nSua solicitação foi analisada e ${acaoResultado?.success && acaoResultado.tipo !== 'nenhuma' ? 'resolvida' : 'respondida'}.\n\nAcesse a Central de Suporte para visualizar a resposta.`,
          });
        }
      } catch (_) {}
      setSugestaoIA(null);
      toast.success(acaoResultado?.success && acaoResultado.tipo !== 'nenhuma'
        ? 'Solução aplicada e enviada ao usuário!'
        : 'Sugestão aprovada e enviada ao usuário!');
    } catch (error) {
      toast.error('Erro ao aprovar: ' + (error.response?.data?.error || error.message));
    }
    setEnviando(false);
  }

  function rejeitarSugestaoIA() {
    setSugestaoIA(null);
    toast.info('Sugestão da IA descartada.');
  }

  async function resolverComIA() {
    setResolvendoIA(true);
    try {
      const response = await base44.functions.invoke('resolverChamadoIA', { chamado_id: chamado.id });
      const data = response.data;
      if (!data.success) {
        toast.error('Erro ao resolver: ' + (data.error || ''));
        return;
      }
      // Recarregar o chamado atualizado do banco
      const fresh = await base44.entities.ChamadoSuporte.get(chamado.id);
      await onUpdate(chamado.id, fresh);
      toast.success(
        data.acao_executada?.success
          ? 'Problema resolvido automaticamente pela IA!'
          : 'Resposta da IA enviada ao chamado!'
      );
    } catch (error) {
      toast.error('Erro ao resolver com IA: ' + (error.response?.data?.error || error.message));
    }
    setResolvendoIA(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge status={chamado.status} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORIDADE_CFG[chamado.prioridade]?.color}`}>
                {PRIORIDADE_CFG[chamado.prioridade]?.label}
              </span>
              <span className="text-xs text-gray-400">{chamado.categoria}</span>
            </div>
            <h2 className="font-bold text-gray-900 text-sm leading-snug">{chamado.titulo}</h2>
            {chamado.usuario_nome && isAdmin && (
              <p className="text-xs text-gray-400 mt-0.5">Aberto por: {chamado.usuario_nome}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && chamado.status !== 'fechado' && (
              <button onClick={analisarComIA} disabled={analisandoIA}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)', color: '#fff', boxShadow: '0 2px 8px rgba(0,212,170,0.3)' }}>
                {analisandoIA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {analisandoIA ? 'Analisando...' : 'Analisar com IA'}
              </button>
            )}
            {chamado.status !== 'fechado' && (isAdmin || chamado.usuario_id === user?.id) && (
              <button onClick={resolverComIA} disabled={resolvendoIA}
                title="O Jarvis analisa e resolve este chamado automaticamente, sem precisar do suporte humano"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                {resolvendoIA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {resolvendoIA ? 'Resolvendo...' : 'Resolver com IA'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Descricao original */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-1">Descricao</p>
            {chamado.descricao}
          </div>

          {/* Anexos do chamado */}
          {chamadoAnexos.length > 0 && (
            <div className="rounded-xl p-4 border border-blue-100 bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Documentos anexados ({chamadoAnexos.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {chamadoAnexos.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg pl-2.5 pr-2 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-700 hover:underline max-w-[160px] truncate">
                      {a.nome}
                    </a>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" download
                      className="text-blue-400 hover:text-blue-600 p-0.5">
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thread de respostas */}
          {respostas.length > 0 && (
            <div className="space-y-3">
              {respostas.map((r, i) => (
                r.autor_nome === 'Sistema' ? (
                  <div key={i} className="text-center py-1">
                    <span className="text-xs text-gray-400 italic bg-gray-100 px-3 py-1 rounded-full">{r.texto}</span>
                  </div>
                ) : (
                  <div key={i} className={`rounded-xl p-3 text-sm ${r.is_suporte ? (r.autor_nome?.includes('IA') ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100') : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${r.is_suporte ? (r.autor_nome?.includes('IA') ? 'text-emerald-700' : 'text-blue-700') : 'text-gray-700'}`}>
                        {r.is_suporte ? (r.autor_nome?.includes('IA') ? `🤖 ${r.autor_nome}` : '🛡️ Suporte') : r.autor_nome}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(r.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{r.texto}</p>
                    {r.anexos && r.anexos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200/50">
                        {r.anexos.map((a, j) => (
                          <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600 transition">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="max-w-[120px] truncate">{a.nome}</span>
                            <Download className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}

          {/* Sugestão da IA — painel de revisão do administrador */}
          {sugestaoIA && (
            <div className="rounded-xl p-4 border-2 border-emerald-300 bg-emerald-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Sugestão da IA — Revisão do Administrador
                </span>
                <button onClick={rejeitarSugestaoIA} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
              {sugestaoIA.resumo_interno && (
                <p className="text-xs text-gray-500 mb-2 italic">Resumo: {sugestaoIA.resumo_interno}</p>
              )}
              {sugestaoIA.acao_executar && sugestaoIA.acao_executar.tipo && sugestaoIA.acao_executar.tipo !== 'nenhuma' && (
                <div className="rounded-lg p-3 bg-white border border-emerald-300 mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">
                      Ação que será executada ao aprovar: {sugestaoIA.acao_executar.tipo.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {sugestaoIA.acao_executar.justificativa && (
                    <p className="text-xs text-gray-600 mb-1">{sugestaoIA.acao_executar.justificativa}</p>
                  )}
                  {sugestaoIA.acao_executar.dados && Object.keys(sugestaoIA.acao_executar.dados).length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {Object.entries(sugestaoIA.acao_executar.dados).slice(0, 8).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="text-gray-400 font-mono min-w-[120px]">{k}:</span>
                          <span className="text-gray-700 truncate">{String(v)}</span>
                        </div>
                      ))}
                      {Object.keys(sugestaoIA.acao_executar.dados).length > 8 && (
                        <p className="text-xs text-gray-400 italic">+ {Object.keys(sugestaoIA.acao_executar.dados).length - 8} campos adicionais</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs font-semibold text-gray-600 mb-1">Resposta sugerida (editável):</p>
              <textarea value={sugestaoIA.resposta} onChange={e => setSugestaoIA({ ...sugestaoIA, resposta: e.target.value })} rows={6}
                className="w-full border border-emerald-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-400 resize-none mb-2" />
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={aprovarSugestaoIA} disabled={enviando}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Aprovar e Enviar
                </button>
                <button onClick={rejeitarSugestaoIA}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition hover:bg-gray-50">
                  Rejeitar
                </button>
                <span className="text-xs text-gray-400 ml-auto">
                  Status sugerido: <strong>{STATUS_CFG[sugestaoIA.novo_status]?.label || sugestaoIA.novo_status}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Campo de resposta */}
          {chamado.status !== 'fechado' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adicionar resposta</label>
              <textarea value={resposta} onChange={e => setResposta(e.target.value)} rows={3}
                placeholder="Digite sua resposta..."
                className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
              <div className="mt-2">
                <AnexoUpload anexos={respostaAnexos} onChange={setRespostaAnexos} compact />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={enviarResposta} disabled={!resposta.trim() || enviando}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0a1f35] hover:bg-[#1a3150] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar
                </button>
                {isAdmin && (
                  <select onChange={e => { if (e.target.value) alterarStatus(e.target.value); }}
                    value=""
                    className="border border-gray-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-400 bg-white">
                    <option value="" disabled>Alterar status...</option>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Avaliacao + fechar (dono do chamado) */}
          {!isAdmin && chamado.status === 'resolvido' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Seu chamado foi resolvido! Avalie o atendimento:</p>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setAvaliacao(n)}>
                    <Star className={`w-6 h-6 transition ${n <= avaliacao ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={fecharChamado}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition">
                  Confirmar e Fechar
                </button>
                <button onClick={reabrirChamado}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition hover:bg-gray-50">
                  Nao foi resolvido — Reabrir
                </button>
              </div>
            </div>
          )}

          {chamado.status === 'fechado' && chamado.avaliacao > 0 && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              Avaliacao: {[...Array(chamado.avaliacao)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">
            Aberto em {new Date(chamado.created_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Suporte() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('inicio'); // inicio | abrir | chamados
  const [catFaq, setCatFaq] = useState(FAQS[0].cat);
  const [chamadoAberto, setChamadoAberto] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [duplicados, setDuplicados] = useState(null);

  // Formulario novo chamado
  const [form, setForm] = useState({ titulo: '', descricao: '', categoria: '', prioridade: 'media' });
  const [formAnexos, setFormAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados-suporte', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.ChamadoSuporte.list('-created_date', 200);
      }
      const u = await base44.auth.me();
      return base44.entities.ChamadoSuporte.filter({ usuario_id: u.id }, '-created_date', 100);
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChamadoSuporte.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamados-suporte'] }),
  });

  async function abrirChamado(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim() || !form.categoria) {
      toast.error('Preencha todos os campos obrigatorios.');
      return;
    }
    // Verificar chamados similares em andamento
    setEnviando(true);
    try {
      const todos = await base44.entities.ChamadoSuporte.list('-created_date', 200);
      const abertos = todos.filter(c => ['aberto', 'em_andamento', 'aguardando_usuario'].includes(c.status));
      const palavras = form.titulo.toLowerCase().split(' ').filter(p => p.length > 3);
      const similares = abertos.filter(c => {
        const cTitulo = (c.titulo || '').toLowerCase();
        const cDesc = (c.descricao || '').toLowerCase();
        return palavras.filter(p => cTitulo.includes(p) || cDesc.includes(p)).length >= 2;
      });
      if (similares.length > 0) {
        setDuplicados(similares);
        setEnviando(false);
        toast.warning('Encontramos chamados similares em andamento. Verifique antes de continuar.');
        return;
      }
    } catch (err) {}
    await criarChamado();
  }

  async function criarChamado() {
    setEnviando(true);
    try {
      const u = await base44.auth.me();
      const numero = `#${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const novo = await base44.entities.ChamadoSuporte.create({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        prioridade: form.prioridade,
        status: 'aberto',
        usuario_id: u.id,
        usuario_nome: u.full_name || u.nome_tratamento || u.email,
        usuario_email: u.email,
        numero,
        respostas: [],
        anexos: formAnexos,
      });
      // Notificar admin via Jarvis
      try {
        await base44.entities.JarvisMensagem.create({
          destinatario_email: 'suporte@villelaexchange.com.br',
          remetente_nome: u.full_name || u.email,
          remetente_email: u.email,
          mensagem: `🆕 Novo chamado ${numero} aberto por ${u.full_name || u.email}\n**Categoria:** ${form.categoria}\n**Prioridade:** ${form.prioridade}\n**Titulo:** ${form.titulo}${formAnexos.length > 0 ? `\n**📎 Anexos:** ${formAnexos.length} documento(s) para analise` : ''}\n\nAcesse a Central de Suporte para atender.`,
        });
      } catch (_) {}
      qc.invalidateQueries({ queryKey: ['chamados-suporte'] });
      setForm({ titulo: '', descricao: '', categoria: '', prioridade: 'media' });
      setFormAnexos([]);
      setDuplicados(null);
      toast.success(`Chamado ${numero} aberto com sucesso! Responderemos em breve.`);
      setTab('chamados');
      setChamadoAberto(novo);
    } catch (err) {
      toast.error('Erro ao abrir chamado: ' + err.message);
    }
    setEnviando(false);
  }

  const chamadosFiltrados = chamados.filter(c => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return (c.titulo || '').toLowerCase().includes(q) || (c.categoria || '').toLowerCase().includes(q) || (c.usuario_nome || '').toLowerCase().includes(q);
    }
    return true;
  });

  const abertos = chamados.filter(c => c.status === 'aberto' || c.status === 'em_andamento' || c.status === 'aguardando_usuario').length;

  const CONTATOS = [
    { icon: MessageCircle, label: 'WhatsApp Suporte', valor: '+55 (11) 99999-0000', desc: 'Seg a sex, 9h–18h', cor: 'bg-green-500', href: 'https://wa.me/5511999990000' },
    { icon: Mail, label: 'E-mail', valor: 'suporte@villelaexchange.com.br', desc: 'Resposta em ate 24h uteis', cor: 'bg-blue-500', href: 'mailto:suporte@villelaexchange.com.br' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1e35 0%, #1a3150 60%, #1e3a5f 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 opacity-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #4a90d9 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />
        <div className="relative px-6 py-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-300/60 text-[10px] uppercase tracking-[0.2em] font-semibold">Villela Exchange</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40 text-[10px] uppercase tracking-[0.15em]">Gestao Comercial</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-500 shadow-lg">
                <LifeBuoy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Central de Suporte</h1>
                <p className="text-white/50 text-xs mt-0.5">Duvidas, chamados, sugestoes e melhorias</p>
              </div>
            </div>
            {abertos > 0 && (
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2 text-center">
                <p className="text-amber-200 text-lg font-bold leading-none">{abertos}</p>
                <p className="text-amber-300/70 text-[10px]">chamado{abertos > 1 ? 's' : ''} aberto{abertos > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
            {[
              { id: 'inicio', label: 'Inicio' },
              { id: 'abrir', label: '+ Novo Chamado' },
              { id: 'chamados', label: `Meus Chamados${chamados.length > 0 ? ` (${chamados.length})` : ''}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

        {/* ── INICIO ── */}
        {tab === 'inicio' && (
          <div className="space-y-5">
            {/* Demandas em Tratamento */}
            {chamados.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">Demandas em Tratamento</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{isAdmin ? 'Visão geral de todos os chamados' : 'Seus chamados ativos'}</p>
                  </div>
                  <button onClick={() => setTab('chamados')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
                  {[
                    { key: 'aberto', label: 'Abertos', color: 'text-blue-600' },
                    { key: 'em_andamento', label: 'Em Andamento', color: 'text-amber-600' },
                    { key: 'aguardando_usuario', label: 'Aguardando', color: 'text-purple-600' },
                    { key: 'resolvido', label: 'Resolvidos', color: 'text-green-600' },
                  ].map(s => {
                    const count = chamados.filter(c => c.status === s.key).length;
                    return (
                      <div key={s.key} className="bg-white px-4 py-3 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{count}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
                {chamados.filter(c => ['aberto', 'em_andamento', 'aguardando_usuario'].includes(c.status)).length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {chamados
                      .filter(c => ['aberto', 'em_andamento', 'aguardando_usuario'].includes(c.status))
                      .slice(0, 5)
                      .map(c => {
                        const ultimaAtividade = c.respostas?.[c.respostas.length - 1];
                        return (
                          <button key={c.id} onClick={() => setChamadoAberto(c)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CFG[c.status]?.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{c.titulo}</p>
                              <p className="text-xs text-gray-400">
                                {c.numero || `#${c.id.slice(-4)}`} · {c.categoria}
                                {isAdmin && c.usuario_nome && ` · ${c.usuario_nome}`}
                                {ultimaAtividade && ` · últ. ${new Date(ultimaAtividade.data_hora).toLocaleDateString('pt-BR')}`}
                                {c.anexos && c.anexos.length > 0 && ` · 📎 ${c.anexos.length} anexo${c.anexos.length > 1 ? 's' : ''}`}
                              </p>
                            </div>
                            <Badge status={c.status} />
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Canais de contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONTATOS.map(c => {
                const Icon = c.icon;
                return (
                  <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition group">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.cor} flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5 group-hover:text-blue-600 transition truncate">{c.valor}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </a>
                );
              })}
            </div>

            {/* Links rapidos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { icon: Paperclip, label: 'Enviar Documento', desc: 'Contratos e documentos para analise', cor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
                  onClick: () => { setForm(f => ({ ...f, categoria: 'Analise de Documentos' })); setTab('abrir'); } },
                { icon: BookOpen, label: 'Manual da Plataforma', desc: 'Guia completo de uso', href: '/Manual', cor: 'text-amber-700 bg-amber-50 border-amber-100' },
                { icon: Zap, label: 'Capacitacao', desc: 'Treinamentos em video e texto', href: '/Treinamento', cor: 'text-rose-700 bg-rose-50 border-rose-100' },
                { icon: MessageSquare, label: 'Chamado pelo Jarvis', desc: 'Fale com o assistente IA', cor: 'text-blue-700 bg-blue-50 border-blue-100',
                  onClick: () => document.querySelector('[title*="Jarvis"]')?.click() },
              ].map(item => {
                const Icon = item.icon;
                const el = item.href
                  ? <a key={item.label} href={item.href} className={`flex items-center gap-3 p-4 rounded-2xl border ${item.cor} hover:shadow-sm transition`}><Icon className="w-5 h-5 flex-shrink-0" /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-xs opacity-70">{item.desc}</p></div></a>
                  : <button key={item.label} onClick={item.onClick} className={`flex items-center gap-3 p-4 rounded-2xl border w-full text-left ${item.cor} hover:shadow-sm transition`}><Icon className="w-5 h-5 flex-shrink-0" /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-xs opacity-70">{item.desc}</p></div></button>;
                return el;
              })}
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">Perguntas Frequentes</h2>
              </div>
              <div className="flex gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
                {FAQS.map(f => (
                  <button key={f.cat} onClick={() => setCatFaq(f.cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${catFaq === f.cat ? 'bg-[#1a3150] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f.cat}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-2">
                {FAQS.find(f => f.cat === catFaq)?.items.map((item, i) => (
                  <FaqAccordion key={i} item={item} />
                ))}
                <p className="text-xs text-gray-400 pt-2 text-center">
                  Nao encontrou o que precisa?{' '}
                  <button onClick={() => setTab('abrir')} className="text-blue-600 underline">Abra um chamado.</button>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Voce tambem pode abrir um chamado diretamente pelo <strong>Jarvis</strong> (assistente no canto inferior direito) digitando "abrir chamado" ou descrevendo o problema.
              </p>
            </div>
          </div>
        )}

        {/* ── ABRIR CHAMADO ── */}
        {tab === 'abrir' && (
          <div className="max-w-2xl mx-auto">
            {duplicados && duplicados.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-amber-800 text-sm">Chamados similares em andamento</h3>
                </div>
                <p className="text-xs text-amber-700 mb-3">Encontramos chamados que tratam do mesmo assunto. Verifique se algum deles já resolve sua demanda antes de abrir um novo.</p>
                <div className="space-y-2 mb-4">
                  {duplicados.map(d => (
                    <button key={d.id} onClick={() => { setChamadoAberto(d); setDuplicados(null); setTab('chamados'); }}
                      className="w-full text-left bg-white border border-amber-200 rounded-xl p-3 hover:border-amber-400 transition">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{d.numero || `#${d.id.slice(-4)}`}</span>
                        <Badge status={d.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{d.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.categoria} · {d.usuario_nome} · {new Date(d.created_date).toLocaleDateString('pt-BR')}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={criarChamado} disabled={enviando}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-60">
                    {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Continuar mesmo assim
                  </button>
                  <button onClick={() => setDuplicados(null)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Novo Chamado</h2>
                <p className="text-xs text-gray-400 mt-0.5">Descreva detalhadamente — isso agiliza o atendimento</p>
              </div>
              <form onSubmit={abrirChamado} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria *</label>
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} required
                      className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 bg-white">
                      <option value="">Selecione...</option>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Prioridade</label>
                    <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 bg-white">
                      <option value="baixa">Baixa</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Titulo *</label>
                  <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required
                    placeholder="Resumo do problema ou sugestao"
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descricao detalhada *</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required rows={5}
                    placeholder="Descreva o que estava fazendo, o que aconteceu e o comportamento esperado..."
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Documentos anexos</label>
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                    <AnexoUpload anexos={formAnexos} onChange={setFormAnexos} />
                    {form.categoria === 'Analise de Documentos' && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Anexe contratos, documentos de identificacao ou comprovantes para analise da equipe.
                      </p>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0a1f35] hover:bg-[#1a3150] text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {enviando ? 'Abrindo...' : 'Abrir Chamado'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── MEUS CHAMADOS ── */}
        {tab === 'chamados' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar chamado..."
                  className="w-full border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="todos">Todos os status</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={() => qc.invalidateQueries({ queryKey: ['chamados-suporte'] })}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition bg-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <LifeBuoy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum chamado encontrado</p>
                <button onClick={() => setTab('abrir')}
                  className="mt-3 px-4 py-2 bg-[#0a1f35] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3150] transition">
                  Abrir primeiro chamado
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {chamadosFiltrados.map(c => {
                  const naoPendentes = c.respostas?.filter(r => r.is_suporte)?.length || 0;
                  return (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
                      <div className="flex items-center gap-4 p-4">
                        <div className={`w-2 self-stretch rounded-full flex-shrink-0 ${STATUS_CFG[c.status]?.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-gray-400 font-mono">{c.numero || `#${c.id.slice(-4)}`}</span>
                            <Badge status={c.status} />
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORIDADE_CFG[c.prioridade]?.color}`}>
                              {PRIORIDADE_CFG[c.prioridade]?.label}
                            </span>
                            {isAdmin && c.usuario_nome && (
                              <span className="text-xs text-gray-400">— {c.usuario_nome}</span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">{c.titulo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {c.categoria} · {new Date(c.created_date).toLocaleDateString('pt-BR')}
                            {naoPendentes > 0 && <span className="ml-2 text-blue-600 font-semibold">· {naoPendentes} resposta{naoPendentes > 1 ? 's' : ''} do suporte</span>}
                            {c.anexos && c.anexos.length > 0 && <span className="ml-2 text-gray-500 font-semibold flex items-center gap-0.5 inline-flex"><Paperclip className="w-3 h-3" />{c.anexos.length}</span>}
                          </p>
                        </div>
                        <button onClick={() => setChamadoAberto(c)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition border border-gray-100 flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" /> Abrir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {chamadoAberto && (
        <ChamadoDetalhe
          chamado={chamadoAberto}
          user={user}
          isAdmin={isAdmin}
          onClose={() => setChamadoAberto(null)}
          onUpdate={async (id, data) => {
            await updateMutation.mutateAsync({ id, data });
            // Atualiza o chamado aberto local
            setChamadoAberto(prev => prev ? { ...prev, ...data } : null);
          }}
        />
      )}
    </div>
  );
}