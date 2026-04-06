import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, Trash2, X, Save, BookOpen, PlayCircle, FileText, Link2, ChevronDown, ChevronRight, Users, BarChart2, Paperclip, Shield, Image, Printer, Check } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS = [
  { value: 'video', label: 'Vídeo', icon: PlayCircle },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'texto', label: 'Texto', icon: BookOpen },
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'imagem', label: 'Imagem', icon: Image },
];

const EMPTY_MODULO = { titulo: '', descricao: '', categoria: '', ordem: 0, ativo: true, capa_url: '' };
const EMPTY_AULA = { titulo: '', descricao: '', tipo: 'video', url_conteudo: '', texto_conteudo: '', ordem: 0, duracao_min: '', ativo: true };

export default function TreinamentoAdmin() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('modulos'); // modulos | relatorio
  const [moduloAberto, setModuloAberto] = useState(null);
  const [modalModulo, setModalModulo] = useState(null); // null | 'new' | objeto
  const [modalAula, setModalAula] = useState(null); // null | { moduloId, aula? }
  const [formModulo, setFormModulo] = useState(EMPTY_MODULO);
  const [formAula, setFormAula] = useState(EMPTY_AULA);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const userDropRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e) => {
      if (userDropRef.current && !userDropRef.current.contains(e.target)) setUserDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin' || user?.permissao_admin === true;

  const { data: modulos = [] } = useQuery({
    queryKey: ['modulos-treinamento-admin'],
    queryFn: () => base44.entities.TreinamentoModulo.list('ordem'),
  });

  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-treinamento-admin'],
    queryFn: () => base44.entities.TreinamentoAula.list('ordem'),
  });

  const { data: progressos = [] } = useQuery({
    queryKey: ['progressos-treinamento-admin'],
    queryFn: () => base44.entities.TreinamentoProgresso.list(),
    enabled: tab === 'relatorio',
  });

  const { data: usuariosRaw = [] } = useQuery({
    queryKey: ['usuarios-lista'],
    queryFn: () => base44.entities.User.list('full_name'),
    enabled: tab === 'relatorio',
  });
  const usuarios = usuariosRaw.filter(u => u.ativo !== false);

  // Mutations módulo
  const saveModulo = useMutation({
    mutationFn: (data) => modalModulo === 'new'
      ? base44.entities.TreinamentoModulo.create(data)
      : base44.entities.TreinamentoModulo.update(modalModulo.id, data),
    onSuccess: () => { queryClient.invalidateQueries(['modulos-treinamento-admin']); queryClient.invalidateQueries(['modulos-treinamento']); setModalModulo(null); toast.success('Módulo salvo!'); },
  });

  const deleteModulo = useMutation({
    mutationFn: async (id) => {
      const aulasModulo = aulas.filter(a => a.modulo_id === id);
      for (const a of aulasModulo) await base44.entities.TreinamentoAula.delete(a.id);
      return base44.entities.TreinamentoModulo.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['modulos-treinamento-admin']); queryClient.invalidateQueries(['aulas-treinamento-admin']); toast.success('Módulo excluído!'); },
  });

  const toggleModuloAtivo = useMutation({
    mutationFn: ({ id, ativo }) => base44.entities.TreinamentoModulo.update(id, { ativo }),
    onSuccess: () => { queryClient.invalidateQueries(['modulos-treinamento-admin']); queryClient.invalidateQueries(['modulos-treinamento']); },
  });

  // Mutations aula
  const saveAula = useMutation({
    mutationFn: (data) => modalAula?.aula
      ? base44.entities.TreinamentoAula.update(modalAula.aula.id, data)
      : base44.entities.TreinamentoAula.create({ ...data, modulo_id: modalAula.moduloId }),
    onSuccess: () => { queryClient.invalidateQueries(['aulas-treinamento-admin']); queryClient.invalidateQueries(['aulas-treinamento']); setModalAula(null); toast.success('Aula salva!'); },
  });

  const deleteAula = useMutation({
    mutationFn: (id) => base44.entities.TreinamentoAula.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['aulas-treinamento-admin']); queryClient.invalidateQueries(['aulas-treinamento']); toast.success('Aula excluída!'); },
  });

  const handleUploadCapa = async (file) => {
    setUploadingCapa(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormModulo(f => ({ ...f, capa_url: file_url }));
    setUploadingCapa(false);
  };

  const handleUploadPDF = async (file) => {
    setUploadingPDF(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormAula(f => ({ ...f, url_conteudo: file_url, _pdf_nome: file.name }));
    setUploadingPDF(false);
    toast.success('PDF anexado!');
  };

  const handleUploadVideo = async (file) => {
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormAula(f => ({ ...f, url_conteudo: file_url, _video_nome: file.name }));
    setUploadingVideo(false);
    toast.success('Vídeo anexado!');
  };

  const handleUploadImagem = async (file) => {
    setUploadingImagem(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormAula(f => ({ ...f, url_conteudo: file_url, _imagem_nome: file.name }));
    setUploadingImagem(false);
    toast.success('Imagem anexada!');
  };

  if (!isAdmin && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Acesso restrito a administradores.</p>
        </div>
      </div>
    );
  }

  // Relatório
  const totalAulas = aulas.length;
  const usuariosComProgresso = [...new Set(progressos.map(p => p.user_id))];

  const toggleSelectUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAllUsers = () => setSelectedUsers(prev => prev.length === usuarios.length ? [] : usuarios.map(u => u.id));

  const usuariosFiltrados = usuarios.filter(u => selectedUsers.includes(u.id));

  const gerarRelatorioTreinamento = () => {
    const lista = usuariosFiltrados;
    const rows = lista.map(u => {
      const progUser = progressos.filter(p => p.user_id === u.id);
      const pct = totalAulas > 0 ? Math.round((progUser.length / totalAulas) * 100) : 0;
      const modulosFeitos = [...new Set(progUser.map(p => p.modulo_id))].length;
      return `
        <tr>
          <td>${u.nome_tratamento || u.full_name || u.email}</td>
          <td style="text-align:center">${progUser.length}</td>
          <td style="text-align:center">${totalAulas}</td>
          <td style="text-align:center">${modulosFeitos}</td>
          <td style="text-align:center">${modulos.length}</td>
          <td style="text-align:center;font-weight:bold;color:${pct === 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'}">${pct}%</td>
        </tr>`;
    }).join('');

    const moduloRows = modulos.map(mod => {
      const aulasDoMod = aulas.filter(a => a.modulo_id === mod.id);
      const userCols = lista.map(u => {
        const feitas = aulasDoMod.filter(a => progressos.some(p => p.user_id === u.id && p.aula_id === a.id)).length;
        const pct = aulasDoMod.length > 0 ? Math.round((feitas / aulasDoMod.length) * 100) : 0;
        return `<td style="text-align:center;color:${pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#9ca3af'}">${feitas}/${aulasDoMod.length} (${pct}%)</td>`;
      }).join('');
      return `<tr><td><strong>${mod.titulo}</strong></td>${userCols}</tr>`;
    }).join('');

    const userHeaders = lista.map(u => `<th>${u.nome_tratamento || u.full_name || u.email}</th>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Treinamentos</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; }
      h1 { color: #0f1e35; font-size: 18px; margin-bottom: 4px; }
      h2 { color: #1a3150; font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
      .sub { color: #666; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #0f1e35; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
      td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
      tr:nth-child(even) td { background: #f9fafb; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>Villela Exchange — Relatório de Treinamentos</h1>
    <p class="sub">Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${lista.length} usuário(s) selecionado(s)</p>
    <button onclick="window.print()" style="padding:6px 16px;background:#0f1e35;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:16px;">Imprimir / Salvar PDF</button>
    <h2>Resumo por Usuário</h2>
    <table><thead><tr><th>Usuário</th><th>Aulas Concluídas</th><th>Total Aulas</th><th>Módulos Iniciados</th><th>Total Módulos</th><th>Progresso</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <h2>Detalhamento por Módulo</h2>
    <table><thead><tr><th>Módulo</th>${userHeaders}</tr></thead><tbody>${moduloRows}</tbody></table>
    </body></html>`;

    const janela = window.open('', '_blank');
    janela.document.write(html);
    janela.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Treinamentos</h1>
            <p className="text-gray-400 text-sm mt-0.5">Gerencie módulos, aulas e acompanhe o progresso</p>
          </div>
          {tab === 'modulos' && (
            <button onClick={() => { setFormModulo(EMPTY_MODULO); setModalModulo('new'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3150] text-white text-sm font-medium rounded-xl hover:bg-[#0f1e35] transition shadow-sm">
              <Plus className="w-4 h-4" /> Novo Módulo
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[{ id: 'modulos', label: 'Módulos & Aulas', icon: BookOpen }, { id: 'relatorio', label: 'Relatório de Progresso', icon: BarChart2 }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Módulos */}
        {tab === 'modulos' && (
          <div className="space-y-4">
            {modulos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Nenhum módulo criado ainda</p>
              </div>
            ) : modulos.map(modulo => {
              const aulasModulo = aulas.filter(a => a.modulo_id === modulo.id);
              const aberto = moduloAberto === modulo.id;
              return (
                <div key={modulo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <button onClick={() => setModuloAberto(aberto ? null : modulo.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      {modulo.capa_url ? (
                        <img src={modulo.capa_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">{modulo.titulo}</p>
                          {modulo.categoria && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{modulo.categoria}</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${modulo.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{modulo.ativo ? 'Ativo' : 'Oculto'}</span>
                        </div>
                        <p className="text-xs text-gray-400">{aulasModulo.length} aulas</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleModuloAtivo.mutate({ id: modulo.id, ativo: !modulo.ativo })}
                        className={`px-2.5 py-1.5 text-xs rounded-lg transition ${modulo.ativo ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                        {modulo.ativo ? 'Ocultar' : 'Publicar'}
                      </button>
                      <button onClick={() => { setFormModulo({ ...modulo }); setModalModulo(modulo); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"><Edit2 className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => { if (confirm('Excluir módulo e todas suas aulas?')) deleteModulo.mutate(modulo.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      <button onClick={() => setModuloAberto(aberto ? null : modulo.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                        {aberto ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  {aberto && (
                    <div className="border-t border-gray-50">
                      <div className="divide-y divide-gray-50">
                        {aulasModulo.length === 0 && (
                          <p className="px-5 py-3 text-xs text-gray-400">Nenhuma aula ainda.</p>
                        )}
                        {aulasModulo.map(aula => {
                          const TipoIcon = TIPOS.find(t => t.value === aula.tipo)?.icon || BookOpen;
                          return (
                            <div key={aula.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                              <TipoIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 font-medium truncate">{aula.titulo}</p>
                                <p className="text-[10px] text-gray-400 uppercase">{aula.tipo}{aula.duracao_min ? ` · ${aula.duracao_min} min` : ''}</p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => { setFormAula({ ...aula }); setModalAula({ moduloId: modulo.id, aula }); }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                                <button onClick={() => { if (confirm('Excluir aula?')) deleteAula.mutate(aula.id); }}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-5 py-3 border-t border-gray-50">
                        <button onClick={() => { setFormAula(EMPTY_AULA); setModalAula({ moduloId: modulo.id }); }}
                          className="flex items-center gap-2 text-sm text-[#1a3150] hover:text-[#0f1e35] font-medium transition">
                          <Plus className="w-4 h-4" /> Adicionar Aula
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Relatório */}
        {tab === 'relatorio' && (
          <div className="space-y-4">
            {/* Seleção de usuários */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1" ref={userDropRef}>
                  <button
                    onClick={() => setUserDropOpen(p => !p)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-[#1a3150] transition bg-white shadow-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-left">
                      {selectedUsers.length === 0 ? 'Selecione os usuários...' : `${selectedUsers.length} usuário(s) selecionado(s)`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userDropOpen && (
                    <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-2xl shadow-lg w-full min-w-64 p-3">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Pesquisar usuário..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a3150] mb-2"
                        autoFocus
                      />
                      <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedUsers.length === usuarios.length && usuarios.length > 0}
                          onChange={toggleAllUsers}
                          className="w-4 h-4 accent-[#1a3150]" />
                        <span className="font-medium text-gray-700">Todos os ativos</span>
                      </label>
                      <div className="my-1 border-t border-gray-100" />
                      <div className="max-h-52 overflow-y-auto space-y-0.5">
                        {usuarios
                          .filter(u => {
                            const nome = (u.nome_tratamento || u.full_name || u.email || '').toLowerCase();
                            return nome.includes(userSearch.toLowerCase());
                          })
                          .map(u => (
                            <label key={u.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                              <input type="checkbox" checked={selectedUsers.includes(u.id)}
                                onChange={() => toggleSelectUser(u.id)}
                                className="w-4 h-4 accent-[#1a3150]" />
                              <span className="text-gray-700">{u.nome_tratamento || u.full_name || u.email}</span>
                            </label>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={gerarRelatorioTreinamento}
                  disabled={selectedUsers.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3150] text-white text-sm font-medium rounded-xl hover:bg-[#0f1e35] transition shadow-sm whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
                  <Printer className="w-4 h-4" /> Gerar Relatório
                </button>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total de Módulos', value: modulos.length },
                { label: 'Total de Aulas', value: totalAulas },
                { label: 'Usuários com Progresso', value: usuariosComProgresso.length },
                { label: 'Conclusões Totais', value: progressos.length },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
              ))}
            </div>
            {/* Por usuário */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4" /> Progresso por Usuário</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {usuariosFiltrados.map(u => {
                  const progUser = progressos.filter(p => p.user_id === u.id);
                  const pct = totalAulas > 0 ? Math.round((progUser.length / totalAulas) * 100) : 0;
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-full bg-[#0f1e35] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(u.nome_tratamento || u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.nome_tratamento || u.full_name || u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 max-w-[200px] bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-[#1a3150]'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{progUser.length}/{totalAulas} aulas · {pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {usuariosFiltrados.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum usuário encontrado.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Módulo */}
      {modalModulo !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{modalModulo === 'new' ? 'Novo Módulo' : 'Editar Módulo'}</h2>
              <button onClick={() => setModalModulo(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <input value={formModulo.titulo} onChange={e => setFormModulo(f => ({ ...f, titulo: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição</label>
                <textarea value={formModulo.descricao} onChange={e => setFormModulo(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                  <input value={formModulo.categoria} onChange={e => setFormModulo(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ex: Vendas, CRM..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ordem</label>
                  <input type="number" value={formModulo.ordem} onChange={e => setFormModulo(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Imagem de Capa</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500 flex-1">
                    <Paperclip className="w-4 h-4" />
                    {uploadingCapa ? 'Enviando...' : formModulo.capa_url ? 'Trocar imagem' : 'Anexar imagem'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files[0] && handleUploadCapa(e.target.files[0])} disabled={uploadingCapa} />
                  </label>
                  {formModulo.capa_url && <img src={formModulo.capa_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalModulo(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => saveModulo.mutate(formModulo)} disabled={saveModulo.isPending || !formModulo.titulo}
                className="flex items-center gap-2 px-5 py-2 bg-[#1a3150] text-white text-sm rounded-lg hover:bg-[#0f1e35] disabled:opacity-50">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aula */}
      {modalAula !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">{modalAula.aula ? 'Editar Aula' : 'Nova Aula'}</h2>
              <button onClick={() => setModalAula(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <input value={formAula.titulo} onChange={e => setFormAula(f => ({ ...f, titulo: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Conteúdo *</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIPOS.map(t => (
                    <button key={t.value} type="button" onClick={() => setFormAula(f => ({ ...f, tipo: t.value }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition ${formAula.tipo === t.value ? 'bg-[#1a3150] text-white border-[#1a3150]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {formAula.tipo === 'link' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">URL do Link</label>
                  <input value={formAula.url_conteudo} onChange={e => setFormAula(f => ({ ...f, url_conteudo: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                </div>
              )}
              {formAula.tipo === 'imagem' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Arquivo de Imagem</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-emerald-300 bg-emerald-50/30 rounded-lg cursor-pointer hover:bg-emerald-50 text-sm text-gray-500">
                      <Image className="w-4 h-4 text-emerald-500" />
                      {uploadingImagem ? 'Enviando...' : formAula._imagem_nome || (formAula.url_conteudo ? 'Trocar imagem' : 'Clique para anexar imagem')}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadImagem(e.target.files[0])} disabled={uploadingImagem} />
                    </label>
                    {formAula.url_conteudo && (
                      <img src={formAula.url_conteudo} alt="Preview" className="max-h-32 rounded-lg object-contain border border-gray-200" />
                    )}
                  </div>
                </div>
              )}
              {formAula.tipo === 'video' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Arquivo de Vídeo ou URL</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-purple-300 bg-purple-50/30 rounded-lg cursor-pointer hover:bg-purple-50 text-sm text-gray-500">
                      <PlayCircle className="w-4 h-4 text-purple-500" />
                      {uploadingVideo ? 'Enviando...' : formAula._video_nome || (formAula.url_conteudo && !formAula.url_conteudo.includes('youtube') && !formAula.url_conteudo.includes('vimeo') ? 'Trocar vídeo' : 'Clique para anexar vídeo')}
                      <input type="file" accept="video/*" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadVideo(e.target.files[0])} disabled={uploadingVideo} />
                    </label>
                    {formAula.url_conteudo && (
                      <a href={formAula.url_conteudo} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" /> Visualizar vídeo atual
                      </a>
                    )}
                    <p className="text-[10px] text-gray-400">Ou cole uma URL (YouTube, Vimeo, etc):</p>
                    <input value={formAula.url_conteudo} onChange={e => setFormAula(f => ({ ...f, url_conteudo: e.target.value, _video_nome: '' }))}
                      placeholder="https://youtube.com/... ou https://vimeo.com/..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                  </div>
                </div>
              )}
              {formAula.tipo === 'pdf' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Arquivo PDF</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-blue-300 bg-blue-50/30 rounded-lg cursor-pointer hover:bg-blue-50 text-sm text-gray-500">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {uploadingPDF ? 'Enviando...' : formAula._pdf_nome || (formAula.url_conteudo ? 'Trocar PDF' : 'Clique para anexar PDF')}
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={e => e.target.files[0] && handleUploadPDF(e.target.files[0])} disabled={uploadingPDF} />
                    </label>
                    {formAula.url_conteudo && (
                      <a href={formAula.url_conteudo} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Visualizar PDF atual
                      </a>
                    )}
                    <p className="text-[10px] text-gray-400">Ou cole uma URL diretamente:</p>
                    <input value={formAula.url_conteudo} onChange={e => setFormAula(f => ({ ...f, url_conteudo: e.target.value, _pdf_nome: '' }))}
                      placeholder="https://... (opcional se já fez upload)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                  </div>
                </div>
              )}
              {formAula.tipo === 'texto' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Conteúdo</label>
                  <textarea value={formAula.texto_conteudo} onChange={e => setFormAula(f => ({ ...f, texto_conteudo: e.target.value }))} rows={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150] resize-none" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição</label>
                <textarea value={formAula.descricao} onChange={e => setFormAula(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Duração (min)</label>
                  <input type="number" value={formAula.duracao_min} onChange={e => setFormAula(f => ({ ...f, duracao_min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ordem</label>
                  <input type="number" value={formAula.ordem} onChange={e => setFormAula(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3150]" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setModalAula(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => saveAula.mutate(formAula)} disabled={saveAula.isPending || !formAula.titulo}
                className="flex items-center gap-2 px-5 py-2 bg-[#1a3150] text-white text-sm rounded-lg hover:bg-[#0f1e35] disabled:opacity-50">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}