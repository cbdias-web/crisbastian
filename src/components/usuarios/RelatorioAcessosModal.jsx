import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, FileDown, Loader2, Wifi, Clock, Shield, Activity, Users } from 'lucide-react';
import { toast } from 'sonner';

const formatDataHora = (iso) => {
  if (!iso) return { data: 'Nunca acessou', hora: '—', relativo: '—' };
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diffMin = (Date.now() - d.getTime()) / 1000 / 60;
  let relativo;
  if (diffMin <= 3) relativo = 'Online agora';
  else if (diffMin <= 60) relativo = `Há ${Math.round(diffMin)} min`;
  else if (diffMin <= 1440) relativo = `Há ${Math.round(diffMin / 60)}h`;
  else relativo = `Há ${Math.round(diffMin / 1440)} dia(s)`;
  return { data, hora, relativo };
};

const getOnlineStatus = (ultimoAcesso) => {
  if (!ultimoAcesso) return 'offline';
  const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 1000 / 60;
  if (diff <= 3) return 'online';
  if (diff <= 10) return 'ausente';
  return 'offline';
};

export default function RelatorioAcessosModal({ usuarios, onClose }) {
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Busca atividades por usuário (group by created_by_id)
  const { data: atividades = {}, isLoading } = useQuery({
    queryKey: ['relatorio-acessos-atividades'],
    queryFn: async () => {
      const [vendas, mensagens, chamados, interacoes, agendas] = await Promise.all([
        base44.entities.Venda.list('-created_date', 500),
        base44.entities.MensagemChat.list('-created_date', 500),
        base44.entities.ChamadoSuporte.list('-created_date', 500),
        base44.entities.InteracaoCliente.list('-created_date', 500),
        base44.entities.AgendaContato.list('-created_date', 500),
      ]);

      const contar = (lista) => {
        const map = {};
        for (const item of lista) {
          if (item.created_by_id) {
            map[item.created_by_id] = (map[item.created_by_id] || 0) + 1;
          }
        }
        return map;
      };

      return {
        vendas: contar(vendas),
        mensagens: contar(mensagens),
        chamados: contar(chamados),
        interacoes: contar(interacoes),
        agendas: contar(agendas),
      };
    },
  });

  const usuariosComDados = useMemo(() => {
    return usuarios.map(u => {
      const status = getOnlineStatus(u.ultimo_acesso);
      const acesso = formatDataHora(u.ultimo_acesso);
      const atua = {
        vendas: atividades.vendas?.[u.id] || 0,
        mensagens: atividades.mensagens?.[u.id] || 0,
        chamados: atividades.chamados?.[u.id] || 0,
        interacoes: atividades.interacoes?.[u.id] || 0,
        agendas: atividades.agendas?.[u.id] || 0,
      };
      const totalAtua = atua.vendas + atua.mensagens + atua.chamados + atua.interacoes + atua.agendas;
      const isAdminUser = u.role === 'admin' || u.permissao_admin === true;
      const menusCount = isAdminUser ? 'Total' : (u.menus_acesso?.length || 0);

      return { ...u, status, acesso, atua, totalAtua, isAdminUser, menusCount };
    });
  }, [usuarios, atividades]);

  const usuariosFiltrados = filtroStatus === 'todos'
    ? usuariosComDados
    : usuariosComDados.filter(u => {
        if (filtroStatus === 'online') return u.status === 'online';
        if (filtroStatus === 'bloqueados') return u.ativo === false;
        if (filtroStatus === 'inativos') return !u.ultimo_acesso;
        return true;
      });

  const stats = useMemo(() => {
    const online = usuariosComDados.filter(u => u.status === 'online').length;
    const bloqueados = usuariosComDados.filter(u => u.ativo === false).length;
    const nuncaAcessou = usuariosComDados.filter(u => !u.ultimo_acesso).length;
    return { total: usuariosComDados.length, online, bloqueados, nuncaAcessou };
  }, [usuariosComDados]);

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const response = await base44.functions.invoke('gerarRelatorioAcessosPDF', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-acessos-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF');
    }
    setGerandoPDF(false);
  };

  const statusColors = {
    online: { dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#34d399', label: 'Online' },
    ausente: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', label: 'Ausente' },
    offline: { dot: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Offline' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#1c2333] rounded-2xl shadow-2xl w-full max-w-6xl my-6 border border-[rgba(0,212,170,0.18)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[rgba(0,212,170,0.15)] flex items-center justify-between sticky top-0 bg-[#1c2333] rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.12)' }}>
              <Activity className="w-5 h-5" style={{ color: '#00D4AA' }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: '#e6edf3' }}>Relatório de Acessos</h3>
              <p className="text-xs" style={{ color: 'rgba(230,237,243,0.55)' }}>Controle de acesso e atuações dos usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={gerarPDF} disabled={gerandoPDF}
              className="border-[rgba(0,212,170,0.3)] text-[#00D4AA] hover:bg-[rgba(0,212,170,0.1)]">
              {gerandoPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Exportar PDF
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-[rgba(0,212,170,0.1)]" style={{ color: 'rgba(230,237,243,0.55)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
            <Users className="w-4 h-4" style={{ color: '#00D4AA' }} />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(230,237,243,0.55)' }}>Total</p>
              <p className="text-lg font-bold" style={{ color: '#e6edf3' }}>{stats.total}</p>
            </div>
          </div>
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Wifi className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(230,237,243,0.55)' }}>Online</p>
              <p className="text-lg font-bold text-emerald-400">{stats.online}</p>
            </div>
          </div>
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Shield className="w-4 h-4 text-red-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(230,237,243,0.55)' }}>Bloqueados</p>
              <p className="text-lg font-bold text-red-400">{stats.bloqueados}</p>
            </div>
          </div>
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(230,237,243,0.55)' }}>Nunca acessou</p>
              <p className="text-lg font-bold text-amber-400">{stats.nuncaAcessou}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'online', label: 'Online agora' },
            { key: 'bloqueados', label: 'Bloqueados' },
            { key: 'inativos', label: 'Nunca acessou' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltroStatus(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: filtroStatus === f.key ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: filtroStatus === f.key ? '#00D4AA' : 'rgba(230,237,243,0.55)',
                border: `1px solid ${filtroStatus === f.key ? 'rgba(0,212,170,0.3)' : 'rgba(0,212,170,0.1)'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="px-6 pb-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00D4AA' }} />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(0,212,170,0.15)' }}>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Usuário</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Papel</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Status</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Último Acesso</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Horário</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Menus</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Vendas</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Msgs Chat</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Chamados</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Interações</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Agenda</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(230,237,243,0.55)' }}>Total Atuações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => {
                  const sc = statusColors[u.status];
                  const initials = (u.full_name || u.email || 'U').charAt(0).toUpperCase();
                  return (
                    <tr key={u.id} className="border-b transition hover:bg-[rgba(0,212,170,0.04)]"
                      style={{ borderColor: 'rgba(0,212,170,0.08)' }}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00D4AA, #0066cc)' }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate" style={{ color: '#e6edf3' }}>{u.nome_tratamento || u.full_name || '—'}</p>
                            <p className="text-[10px] truncate" style={{ color: 'rgba(230,237,243,0.4)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: u.isAdminUser ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,249,0.12)',
                            color: u.isAdminUser ? '#fbbf24' : '#60a5fa',
                          }}>
                          {u.isAdminUser ? 'Admin' : 'Usuário'}
                        </span>
                        {u.ativo === false && (
                          <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Bloqueado</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full inline-flex"
                          style={{ background: sc.bg, color: sc.text }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: u.acesso.data === 'Nunca acessou' ? 'rgba(230,237,243,0.4)' : '#9da7b3' }}>
                        {u.acesso.data}
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#9da7b3' }}>
                        {u.acesso.hora}
                        <span className="block text-[9px]" style={{ color: 'rgba(230,237,243,0.4)' }}>{u.acesso.relativo}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#9da7b3' }}>{u.menusCount}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.vendas > 0 ? '#00D4AA' : 'rgba(230,237,243,0.3)' }}>{u.atua.vendas}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.mensagens > 0 ? '#60a5fa' : 'rgba(230,237,243,0.3)' }}>{u.atua.mensagens}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.chamados > 0 ? '#fbbf24' : 'rgba(230,237,243,0.3)' }}>{u.atua.chamados}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.interacoes > 0 ? '#a78bfa' : 'rgba(230,237,243,0.3)' }}>{u.atua.interacoes}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: u.atua.agendas > 0 ? '#34d399' : 'rgba(230,237,243,0.3)' }}>{u.atua.agendas}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: u.totalAtua > 0 ? '#00D4AA' : 'rgba(230,237,243,0.3)' }}>{u.totalAtua}</td>
                    </tr>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-sm" style={{ color: 'rgba(230,237,243,0.4)' }}>
                      Nenhum usuário encontrado no filtro selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}