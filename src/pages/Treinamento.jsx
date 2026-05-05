import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, PlayCircle, FileText, Link2, CheckCircle2, Clock, ArrowLeft, ExternalLink, Image, GraduationCap, ChevronRight, RotateCcw } from 'lucide-react';
import EinsteinCoach from '@/components/treinamento/JarvisCoach';

const TIPO_ICONS = {
  video: PlayCircle,
  pdf: FileText,
  texto: BookOpen,
  link: Link2,
  imagem: Image,
};

const TIPO_LABELS = { video: 'Vídeo', pdf: 'PDF', texto: 'Texto', link: 'Link', imagem: 'Imagem' };

const NIVEL_COLORS = {
  Iniciante: 'bg-blue-500',
  Intermediário: 'bg-amber-500',
  Avançado: 'bg-gray-700',
};

const CARD_GRADIENTS = [
  'from-[#0f1e35] to-[#1a3150]',
  'from-[#1a2a4a] to-[#2d4a7a]',
  'from-[#b45309] to-[#d97706]',
  'from-[#065f46] to-[#059669]',
  'from-[#1e1b4b] to-[#4338ca]',
  'from-[#7f1d1d] to-[#dc2626]',
];

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
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

  // Última aula acessada / em progresso
  const ultimoModuloEmProgresso = modulos.find(m => {
    const p = getProgressoModulo(m.id);
    return p > 0 && p < 100;
  });
  const ultimaAula = ultimoModuloEmProgresso
    ? aulas.filter(a => a.modulo_id === ultimoModuloEmProgresso.id).find(a => !aulasConcluidas.has(a.id))
    : null;

  // ── TELA DE AULA ──────────────────────────────────────────────────────────
  if (aulaAtiva) {
    const embed = aulaAtiva.tipo === 'video' ? embedUrl(aulaAtiva.url_conteudo) : null;
    const concluida = aulasConcluidas.has(aulaAtiva.id);
    const modulo = modulos.find(m => m.id === aulaAtiva.modulo_id);
    const aulasModulo = aulas.filter(a => a.modulo_id === aulaAtiva.modulo_id);
    const aulaIdx = aulasModulo.findIndex(a => a.id === aulaAtiva.id);
    const proximaAula = aulasModulo[aulaIdx + 1] || null;

    return (
      <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setAulaAtiva(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar para Capacitação
          </button>
          {modulo && (
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> {modulo.titulo}
              {aulaIdx >= 0 && <span className="ml-1">· Aula {aulaIdx + 1}/{aulasModulo.length}</span>}
            </p>
          )}
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
            {aulaAtiva.tipo === 'imagem' && aulaAtiva.url_conteudo && (
              <div className="p-4 flex justify-center">
                <img src={aulaAtiva.url_conteudo} alt={aulaAtiva.titulo} className="max-w-full max-h-[70vh] rounded-xl object-contain border border-gray-100 shadow-sm" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
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
              {aulaAtiva.tipo === 'link' && aulaAtiva.url_conteudo && (
                <a href={aulaAtiva.url_conteudo} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition">
                  <ExternalLink className="w-4 h-4" /> Abrir Link
                </a>
              )}
              {/* Próxima aula */}
              {proximaAula && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Próxima aula</p>
                    <p className="text-sm font-semibold text-gray-800">{proximaAula.titulo}</p>
                  </div>
                  <button onClick={() => setAulaAtiva(proximaAula)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a3150] text-white text-sm rounded-xl hover:bg-[#0f1e35] transition">
                    Próxima <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EinsteinCoach
        aulaIdx={aulaIdx}
        totalAulas={aulasModulo.length}
        nomeAula={aulaAtiva.titulo}
        concluida={concluida}
        proximaAula={proximaAula}
        onProxima={() => setAulaAtiva(proximaAula)}
      />
      </>
    );
  }

  // ── TELA DE MÓDULO (lista de aulas) ───────────────────────────────────────
  if (moduloAberto) {
    const modulo = modulos.find(m => m.id === moduloAberto);
    const aulasModulo = aulas.filter(a => a.modulo_id === moduloAberto);
    const progresso = getProgressoModulo(moduloAberto);
    if (!modulo) { setModuloAberto(null); return null; }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setModuloAberto(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar para Capacitação
          </button>

          {/* Módulo hero */}
          <div className={`rounded-2xl bg-gradient-to-br ${CARD_GRADIENTS[modulos.indexOf(modulo) % CARD_GRADIENTS.length]} p-6 mb-6 flex items-end justify-between min-h-[120px] relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
              <BookOpen className="w-40 h-40 text-white" />
            </div>
            <div className="relative z-10">
              {modulo.categoria && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold text-white mb-2 inline-block ${NIVEL_COLORS[modulo.categoria] || 'bg-gray-600'}`}>
                  {modulo.categoria}
                </span>
              )}
              <h2 className="text-white font-bold text-xl">{modulo.titulo}</h2>
              {modulo.descricao && <p className="text-white/70 text-sm mt-1">{modulo.descricao}</p>}
            </div>
            <div className="relative z-10 text-right flex-shrink-0 ml-4">
              <p className="text-white font-bold text-2xl">{progresso}%</p>
              <p className="text-white/60 text-xs">concluído</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${progresso === 100 ? 'bg-emerald-500' : 'bg-[#1a3150]'}`} style={{ width: `${progresso}%` }} />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{aulasModulo.filter(a => aulasConcluidas.has(a.id)).length}/{aulasModulo.length} aulas</span>
          </div>

          {/* Lista de aulas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {aulasModulo.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhuma aula neste módulo ainda.</p>
            ) : aulasModulo.map((aula, idx) => {
              const Icon = TIPO_ICONS[aula.tipo] || BookOpen;
              const concluida = aulasConcluidas.has(aula.id);
              return (
                <div key={aula.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer group"
                  onClick={() => setAulaAtiva(aula)}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${concluida ? 'bg-emerald-50' : 'bg-gray-100 group-hover:bg-[#1a3150]/10'}`}>
                    {concluida ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Icon className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${concluida ? 'text-gray-400' : 'text-gray-800'}`}>
                      <span className="text-gray-400 mr-1.5 text-xs">{idx + 1}.</span>{aula.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{TIPO_LABELS[aula.tipo]}</span>
                      {aula.duracao_min && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{aula.duracao_min} min</span>}
                    </div>
                  </div>
                  <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex-shrink-0 ${
                    concluida ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#1a3150] text-white hover:bg-[#0f1e35]'
                  }`}>
                    {concluida ? 'Revisar' : 'Continuar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── TELA PRINCIPAL ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero "Continue de onde parou" */}
      {ultimaAula && ultimoModuloEmProgresso && (
        <div className="bg-gradient-to-br from-[#0f1e35] via-[#1a3150] to-[#1e3a5f] px-6 py-10 md:px-10">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
              Continue de onde parou
            </span>
            <h2 className="text-white text-2xl md:text-3xl font-bold mb-1">
              {ultimoModuloEmProgresso.titulo} · {ultimaAula.titulo}
            </h2>
            {ultimaAula.descricao && (
              <p className="text-white/60 text-sm mb-4 max-w-xl">"{ultimaAula.descricao}"</p>
            )}
            <div className="flex items-center gap-5 text-white/60 text-xs mb-6">
              {ultimaAula.duracao_min && (
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {ultimaAula.duracao_min} min restantes</span>
              )}
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {getProgressoModulo(ultimoModuloEmProgresso.id)}% concluído
              </span>
            </div>
            <button onClick={() => setAulaAtiva(ultimaAula)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition text-sm shadow-lg">
              <PlayCircle className="w-4 h-4" /> Continuar assistindo
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header com progresso */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#1a3150]" /> Trilhas disponíveis
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Trilhas e treinamentos para sua equipe</p>
          </div>
          {totalAulas > 0 && (
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
          )}
        </div>

        {/* Grade de módulos (cards) */}
        {modulos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum módulo disponível ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {modulos.map((modulo, idx) => {
              const aulasModulo = aulas.filter(a => a.modulo_id === modulo.id);
              const progresso = getProgressoModulo(modulo.id);
              const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const totalDuracao = aulasModulo.reduce((s, a) => s + (a.duracao_min || 0), 0);

              return (
                <div key={modulo.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all duration-300 group hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 cursor-pointer">
                  {/* Cover */}
                  <div className={`relative h-24 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
                    {modulo.capa_url ? (
                      <img src={modulo.capa_url} alt="" className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <BookOpen className="w-14 h-14 text-white/30" />
                    )}
                    {modulo.categoria && (
                      <span className={`absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full font-bold text-white ${NIVEL_COLORS[modulo.categoria] || 'bg-gray-600'}`}>
                        {modulo.categoria}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-xs leading-tight">{modulo.titulo}</h3>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{aulasModulo.length} aulas</span>
                      {totalDuracao > 0 && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalDuracao >= 60 ? `${Math.round(totalDuracao / 60)}h` : `${totalDuracao}min`}</span>
                      )}
                    </div>

                    {/* Progresso */}
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[9px] text-gray-400">Progresso</span>
                        <span className="text-[9px] font-semibold text-gray-600">{progresso}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${progresso === 100 ? 'bg-emerald-500' : 'bg-[#1a3150]'}`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                    </div>

                    {/* Botão */}
                    <button
                      onClick={() => setModuloAberto(modulo.id)}
                      className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-[#0f1e35] hover:bg-[#1a3150] text-white"
                    >
                      {progresso === 100 ? (
                        <><RotateCcw className="w-3.5 h-3.5" /> Revisar</>
                      ) : progresso > 0 ? (
                        <><PlayCircle className="w-3.5 h-3.5" /> Continuar</>
                      ) : (
                        <><PlayCircle className="w-3.5 h-3.5" /> Começar</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}