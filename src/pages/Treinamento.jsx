import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, PlayCircle, FileText, Link2, CheckCircle2, Clock, ChevronRight, ChevronDown, ArrowLeft, ExternalLink, Image } from 'lucide-react';

const TIPO_ICONS = {
  video: PlayCircle,
  pdf: FileText,
  texto: BookOpen,
  link: Link2,
  imagem: Image,
};

const TIPO_LABELS = { video: 'Vídeo', pdf: 'PDF', texto: 'Texto', link: 'Link', imagem: 'Imagem' };

function embedUrl(url) {
  if (!url) return null;
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function Treinamento() {
  const [user, setUser] = useState(null);
  const [moduloAberto, setModuloAberto] = useState(null);
  const [aulaAtiva, setAulaAtiva] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: modulos = [] } = useQuery({
    queryKey: ['modulos-treinamento'],
    queryFn: () => base44.entities.TreinamentoModulo.filter({ ativo: true }, 'ordem'),
  });

  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-treinamento'],
    queryFn: () => base44.entities.TreinamentoAula.filter({ ativo: true }, 'ordem'),
  });

  const { data: progressos = [] } = useQuery({
    queryKey: ['progresso-treinamento', user?.id],
    queryFn: () => base44.entities.TreinamentoProgresso.filter({ user_id: user.id }),
    enabled: !!user,
  });

  const concluirMutation = useMutation({
    mutationFn: async (aula) => {
      const jaFeito = progressos.find(p => p.aula_id === aula.id);
      if (jaFeito) {
        await base44.entities.TreinamentoProgresso.delete(jaFeito.id);
      } else {
        await base44.entities.TreinamentoProgresso.create({
          user_id: user.id,
          user_email: user.email,
          user_nome: user.nome_tratamento || user.full_name || user.email,
          aula_id: aula.id,
          modulo_id: aula.modulo_id,
          concluido_em: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['progresso-treinamento', user?.id]),
  });

  const aulasConcluidas = new Set(progressos.map(p => p.aula_id));

  const getProgressoModulo = (moduloId) => {
    const aulasDoModulo = aulas.filter(a => a.modulo_id === moduloId);
    if (!aulasDoModulo.length) return 0;
    const feitas = aulasDoModulo.filter(a => aulasConcluidas.has(a.id)).length;
    return Math.round((feitas / aulasDoModulo.length) * 100);
  };

  const totalAulas = aulas.length;
  const totalConcluidas = progressos.length;
  const progressoGeral = totalAulas > 0 ? Math.round((totalConcluidas / totalAulas) * 100) : 0;

  if (aulaAtiva) {
    const embed = aulaAtiva.tipo === 'video' ? embedUrl(aulaAtiva.url_conteudo) : null;
    const concluida = aulasConcluidas.has(aulaAtiva.id);
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setAulaAtiva(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {aulaAtiva.tipo === 'video' && aulaAtiva.url_conteudo && (
              embed ? (
                <div className="aspect-video w-full bg-black">
                  <iframe src={embed} className="w-full h-full" allowFullScreen title={aulaAtiva.titulo} />
                </div>
              ) : (
                <div className="aspect-video w-full bg-black">
                  <video src={aulaAtiva.url_conteudo} controls className="w-full h-full" />
                </div>
              )
            )}
            {aulaAtiva.tipo === 'pdf' && aulaAtiva.url_conteudo && (
              <div className="p-4">
                <iframe src={aulaAtiva.url_conteudo} className="w-full h-[70vh] rounded-xl border" title={aulaAtiva.titulo} />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{TIPO_LABELS[aulaAtiva.tipo]}</p>
                  <h1 className="text-xl font-bold text-gray-900">{aulaAtiva.titulo}</h1>
                  {aulaAtiva.descricao && <p className="text-gray-500 mt-2 text-sm">{aulaAtiva.descricao}</p>}
                </div>
                <button
                  onClick={() => concluirMutation.mutate(aulaAtiva)}
                  disabled={concluirMutation.isPending}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    concluida ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-[#1a3150] text-white hover:bg-[#0f1e35]'
                  }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {concluida ? 'Concluída ✓' : 'Marcar como concluída'}
                </button>
              </div>
              {aulaAtiva.tipo === 'texto' && aulaAtiva.texto_conteudo && (
                <div className="mt-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{aulaAtiva.texto_conteudo}</div>
              )}
              {aulaAtiva.tipo === 'imagem' && aulaAtiva.url_conteudo && (
                <div className="p-4 flex justify-center">
                  <img src={aulaAtiva.url_conteudo} alt={aulaAtiva.titulo} className="max-w-full max-h-[70vh] rounded-xl object-contain border border-gray-100 shadow-sm" />
                </div>
              )}
              {aulaAtiva.tipo === 'link' && aulaAtiva.url_conteudo && (
                <a href={aulaAtiva.url_conteudo} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition">
                  <ExternalLink className="w-4 h-4" /> Abrir Link
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Treinamentos</h1>
            <p className="text-gray-400 text-sm mt-0.5">Trilha de conhecimento da equipe</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400">Seu progresso</p>
              <p className="text-lg font-bold text-[#1a3150]">{progressoGeral}%</p>
            </div>
            <div className="w-24 bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-[#1a3150] to-blue-500 h-2 rounded-full transition-all" style={{ width: `${progressoGeral}%` }} />
            </div>
            <div className="text-xs text-gray-400">{totalConcluidas}/{totalAulas} aulas</div>
          </div>
        </div>

        {/* Módulos */}
        {modulos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum módulo disponível ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modulos.map(modulo => {
              const aulasModulo = aulas.filter(a => a.modulo_id === modulo.id);
              const progresso = getProgressoModulo(modulo.id);
              const aberto = moduloAberto === modulo.id;
              return (
                <div key={modulo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setModuloAberto(aberto ? null : modulo.id)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition text-left">
                    {modulo.capa_url ? (
                      <img src={modulo.capa_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0f1e35] to-[#1a3150] flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{modulo.titulo}</h3>
                        {modulo.categoria && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{modulo.categoria}</span>
                        )}
                      </div>
                      {modulo.descricao && <p className="text-sm text-gray-400 mt-0.5 truncate">{modulo.descricao}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-[160px] bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${progresso === 100 ? 'bg-emerald-500' : 'bg-[#1a3150]'}`} style={{ width: `${progresso}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{progresso}% · {aulasModulo.length} aulas</span>
                      </div>
                    </div>
                    {aberto ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  </button>
                  {aberto && (
                    <div className="border-t border-gray-50 divide-y divide-gray-50">
                      {aulasModulo.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-gray-400">Nenhuma aula neste módulo ainda.</p>
                      ) : aulasModulo.map(aula => {
                        const Icon = TIPO_ICONS[aula.tipo] || BookOpen;
                        const concluida = aulasConcluidas.has(aula.id);
                        return (
                          <div key={aula.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${concluida ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                              {concluida ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Icon className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${concluida ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{aula.titulo}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 uppercase">{TIPO_LABELS[aula.tipo]}</span>
                                {aula.duracao_min && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{aula.duracao_min} min</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => setAulaAtiva(aula)}
                              className="px-3 py-1.5 bg-[#1a3150] text-white text-xs font-medium rounded-lg hover:bg-[#0f1e35] transition flex-shrink-0">
                              {concluida ? 'Rever' : 'Acessar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}