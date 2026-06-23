import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Trash2, GitMerge, UserCog, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const AURORA = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
  danger: '#f87171',
};

export default function GerenciarConversaModal({ conversa, conversas, vendedores, onClose, onConcluido }) {
  const [aba, setAba] = useState('transferir');
  const [salvando, setSalvando] = useState(false);
  const [novoGerenteId, setNovoGerenteId] = useState('');
  const [conversaDestinoId, setConversaDestinoId] = useState('');
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  // Conversas candidatas a mesclagem: mesmo telefone, exceto a atual
  const candidatasMesclagem = conversas.filter(
    c => c.id !== conversa.id && c.telefone === conversa.telefone
  );
  // Se não houver mesmo telefone, mostrar todas as outras para escolha manual
  const todasOutras = conversas.filter(c => c.id !== conversa.id);
  const listaMesclagem = candidatasMesclagem.length > 0 ? candidatasMesclagem : todasOutras;

  const transferirGerente = async () => {
    if (!novoGerenteId) { toast.error('Selecione um gerente'); return; }
    const vend = vendedores.find(v => v.id === novoGerenteId);
    if (!vend) return;
    setSalvando(true);
    try {
      const migracoes = conversa.migracoes || [];
      migracoes.push({
        de_nome: conversa.vendedor_nome || '—',
        para_nome: vend.nome,
        motivo: 'transferencia_manual_admin',
        em: new Date().toISOString(),
      });
      await base44.entities.ConversaWhatsapp.update(conversa.id, {
        vendedor_id: vend.id,
        vendedor_nome: vend.nome,
        migracoes,
      });
      toast.success(`Conversa transferida para ${vend.nome}`);
      onConcluido();
      onClose();
    } catch (err) {
      toast.error('Erro ao transferir: ' + err.message);
    }
    setSalvando(false);
  };

  const mesclarConversa = async () => {
    if (!conversaDestinoId) { toast.error('Selecione a conversa de destino'); return; }
    const destino = conversas.find(c => c.id === conversaDestinoId);
    if (!destino) return;
    setSalvando(true);
    try {
      const msgsOrigem = conversa.mensagens || [];
      const msgsDestino = destino.mensagens || [];

      // Marca de sistema indicando a mesclagem
      const marcaSistema = {
        de: 'Sistema',
        texto: `📎 Conversa de "${conversa.lead_nome}" mesclada em ${new Date().toLocaleString('pt-BR')}`,
        timestamp: new Date().toISOString(),
        tipo: 'sistema',
      };

      const msgsCombinadas = [...msgsDestino, marcaSistema, ...msgsOrigem];

      // Atualiza a conversa de destino com as mensagens combinadas
      const updateData = {
        mensagens: msgsCombinadas,
        ultima_mensagem: msgsOrigem.length > 0 ? msgsOrigem[msgsOrigem.length - 1].texto : destino.ultima_mensagem,
        ultima_mensagem_em: new Date().toISOString(),
      };

      // Se a origem tinha observação IA ou produto de interesse e o destino não, preservar
      if (conversa.observacao_ia && !destino.observacao_ia) updateData.observacao_ia = conversa.observacao_ia;
      if (conversa.produto_interesse && !destino.produto_interesse) updateData.produto_interesse = conversa.produto_interesse;

      // Preservar histórico de migrações da origem
      if (conversa.migracoes?.length > 0) {
        updateData.migracoes = [...(destino.migracoes || []), ...conversa.migracoes];
      }

      await base44.entities.ConversaWhatsapp.update(destino.id, updateData);

      // Excluir a conversa de origem
      await base44.entities.ConversaWhatsapp.delete(conversa.id);

      toast.success(`Conversa mesclada em "${destino.lead_nome}"`);
      onConcluido();
      onClose();
    } catch (err) {
      toast.error('Erro ao mesclar: ' + err.message);
    }
    setSalvando(false);
  };

  const excluirConversa = async () => {
    if (!confirmarExcluir) { setConfirmarExcluir(true); return; }
    setSalvando(true);
    try {
      await base44.entities.ConversaWhatsapp.delete(conversa.id);
      toast.success('Conversa excluída');
      onConcluido();
      onClose();
    } catch (err) {
      toast.error('Erro ao excluir: ' + err.message);
    }
    setSalvando(false);
  };

  const abas = [
    { key: 'transferir', label: 'Transferir', icon: UserCog, color: AURORA.accent },
    { key: 'mesclar', label: 'Mesclar / Mover', icon: GitMerge, color: '#a78bfa' },
    { key: 'excluir', label: 'Excluir', icon: Trash2, color: AURORA.danger },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: AURORA.surface2, borderBottom: `1px solid ${AURORA.border}` }}>
          <div>
            <p className="font-bold text-sm" style={{ color: AURORA.text }}>Gerenciar Conversa</p>
            <p className="text-[11px]" style={{ color: AURORA.textMuted }}>{conversa.lead_nome} · {conversa.telefone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: AURORA.textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-2" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
          {abas.map(a => (
            <button key={a.key} onClick={() => { setAba(a.key); setConfirmarExcluir(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition flex-1 justify-center"
              style={{
                background: aba === a.key ? `${a.color}22` : 'transparent',
                color: aba === a.key ? a.color : AURORA.textMuted,
                border: aba === a.key ? `1px solid ${a.color}55` : '1px solid transparent',
              }}>
              <a.icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-5">
          {aba === 'transferir' && (
            <div>
              <p className="text-xs mb-3" style={{ color: AURORA.textMuted }}>
                Transfira esta conversa para outro gerente. O histórico de migração será preservado.
              </p>
              <p className="text-[11px] mb-2" style={{ color: AURORA.text }}>
                Gerente atual: <strong>{conversa.vendedor_nome || '—'}</strong>
              </p>
              <select value={novoGerenteId} onChange={e => setNovoGerenteId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none mb-4"
                style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                <option value="">Selecione o novo gerente...</option>
                {vendedores.filter(v => v.id !== conversa.vendedor_id).map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
              <button onClick={transferirGerente} disabled={salvando || !novoGerenteId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{ background: AURORA.accent, color: '#0d1117' }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                Transferir Conversa
              </button>
            </div>
          )}

          {aba === 'mesclar' && (
            <div>
              <p className="text-xs mb-3" style={{ color: AURORA.textMuted }}>
                Mova todas as mensagens desta conversa para dentro de outra conversa. A conversa atual será excluída após a mesclagem.
              </p>
              {candidatasMesclagem.length > 0 && (
                <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
                  <p className="text-[11px]" style={{ color: AURORA.accent }}>
                    {candidatasMesclagem.length} conversa(s) com o mesmo telefone encontrada(s) — provável duplicidade.
                  </p>
                </div>
              )}
              <p className="text-[11px] mb-2" style={{ color: AURORA.text }}>
                Conversa de origem: <strong>{conversa.lead_nome}</strong> ({(conversa.mensagens || []).length} mensagens)
              </p>
              <p className="text-[11px] mb-2" style={{ color: AURORA.textMuted }}>Mover para:</p>
              <select value={conversaDestinoId} onChange={e => setConversaDestinoId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none mb-4"
                style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }}>
                <option value="">Selecione a conversa de destino...</option>
                {listaMesclagem.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.lead_nome} · {c.telefone} · {c.vendedor_nome || 'sem gerente'} ({(c.mensagens || []).length} msgs)
                  </option>
                ))}
              </select>
              {conversaDestinoId && (
                <div className="mb-4 px-3 py-2 rounded-xl flex items-center gap-2 text-[11px]" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.textMuted }}>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
                  {conversa.lead_nome} → {conversas.find(c => c.id === conversaDestinoId)?.lead_nome}
                </div>
              )}
              <button onClick={mesclarConversa} disabled={salvando || !conversaDestinoId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{ background: '#a78bfa', color: '#0d1117' }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                Mesclar e Excluir Origem
              </button>
            </div>
          )}

          {aba === 'excluir' && (
            <div>
              <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AURORA.danger }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: AURORA.danger }}>Excluir conversa permanentemente</p>
                  <p className="text-[11px] mt-1" style={{ color: AURORA.textMuted }}>
                    Todas as {(conversa.mensagens || []).length} mensagens e o histórico serão removidos. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              {confirmarExcluir ? (
                <div className="space-y-2">
                  <p className="text-xs text-center font-semibold" style={{ color: AURORA.danger }}>
                    Clique novamente em "Confirmar Exclusão" para remover definitivamente.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmarExcluir(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: AURORA.surface2, color: AURORA.text, border: `1px solid ${AURORA.border}` }}>
                      Cancelar
                    </button>
                    <button onClick={excluirConversa} disabled={salvando}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                      style={{ background: AURORA.danger, color: '#fff' }}>
                      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={excluirConversa}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'rgba(239,68,68,0.15)', color: AURORA.danger, border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-4 h-4" /> Excluir Conversa
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}