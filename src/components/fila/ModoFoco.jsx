import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, PhoneCall, MessageCircle, SkipForward, CalendarPlus, Link2, Sparkles, ClipboardCheck, Smartphone, Package, DollarSign, User, Flame, Target, Clock, Copy } from 'lucide-react';
import { telParaTel, waLink, qrUrl } from './QrCodeContato';
import PosChamadaSheet from './PosChamadaSheet';
import PitchAbordagemPanel from './PitchAbordagemPanel';
import AgendaMeetModal from '@/components/agenda/AgendaMeetModal';
import { getConfigFila } from '@/lib/listAll';
import { hojeBrasilia, renderModelo } from '@/lib/leadUtils';

const A = { bg: '#0d1117', surface: '#161b22', surface2: '#1c2333', border: 'rgba(0,212,170,0.15)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };
const SEG = { quente: '#f87171', morno: '#fbbf24', frio: '#60a5fa' };
const brl = (v) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

// Modo Foco (power-dial manual): um lead por vez, na ordem do Plano do Dia.
export default function ModoFoco({ vendedor, user, mobile = false, onSair }) {
  const qc = useQueryClient();
  const hoje = hojeBrasilia();
  const [pulados, setPulados] = useState([]);
  const [sheet, setSheet] = useState(null); // { canal }
  const [aguardando, setAguardando] = useState(null); // 'ligacao' | 'whatsapp'
  const [wa, setWa] = useState({ modeloId: '', texto: '' });
  const [agenda, setAgenda] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [carregandoBrief, setCarregandoBrief] = useState(false);
  const [mostrarPitch, setMostrarPitch] = useState(!mobile);
  const [linkAg, setLinkAg] = useState('');
  const [enviandoCmd, setEnviandoCmd] = useState(false);
  const aguardandoRef = useRef(null);
  aguardandoRef.current = aguardando;

  const vid = vendedor?.id;
  const { data: cfg = {} } = useQuery({ queryKey: ['cfg-fila'], queryFn: () => getConfigFila(base44), staleTime: 300000 });
  const { data: modelos = [] } = useQuery({ queryKey: ['modelos-wa'], queryFn: () => base44.entities.ModeloMensagem.filter({ ativo: true, canal: 'whatsapp' }, 'nome', 100), staleTime: 300000 });
  const { data: cadencias = [] } = useQuery({ queryKey: ['cadencias-ativas'], queryFn: () => base44.entities.Cadencia.filter({ ativa: true }, 'nome', 50), staleTime: 300000 });

  const { data: plano = [], isLoading, refetch } = useQuery({
    queryKey: ['plano-dia', vid],
    enabled: !!vid,
    refetchInterval: 60000,
    queryFn: async () => {
      const F = base44.entities.FilaContato;
      const [pend, ret] = await Promise.all([
        F.filter({ vendedor_id: vid, status: 'pendente' }, 'posicao', 300),
        F.filter({ vendedor_id: vid, status: 'atendeu', proximo_contato: { $lte: hoje } }, 'proximo_contato', 100),
      ]);
      const agora = Date.now();
      const rank = (f) => {
        if (f.status === 'atendeu') return 1;
        if (f.tipo_origem === 'indicacao' && !f.primeiro_toque_em) return 0;
        if (f.proximo_toque_em && new Date(f.proximo_toque_em).getTime() <= agora) return 2;
        if (f.tipo_origem === 'indicacao') return 3;
        return 4;
      };
      const vistos = new Set();
      return [...pend, ...ret]
        .filter(f => !['opt_out', 'nao_perturbe'].includes(f.consentimento_status) && !vistos.has(f.id) && vistos.add(f.id))
        .sort((a, b) => rank(a) - rank(b)
          || (rank(a) === 1 ? `${a.proximo_contato}${a.proximo_contato_hora || ''}`.localeCompare(`${b.proximo_contato}${b.proximo_contato_hora || ''}`) : 0)
          || (b.score || 0) - (a.score || 0) || (a.posicao || 0) - (b.posicao || 0));
    },
  });

  const { data: regsHoje = [], refetch: refetchRegs } = useQuery({
    queryKey: ['regs-hoje', vid, hoje], enabled: !!vid, refetchInterval: 120000,
    queryFn: () => base44.entities.RegistroContato.filter({ vendedor_id: vid, data_dia: hoje }, '-created_date', 1000),
  });

  const fila = useMemo(() => plano.find(f => !pulados.includes(f.id)) || null, [plano, pulados]);
  const { data: historico = [] } = useQuery({
    queryKey: ['hist-foco', fila?.id], enabled: !!fila,
    queryFn: () => base44.entities.InteracaoCliente.filter({ cliente_id: fila.cliente_id || fila.ref_id }, '-data_interacao', 3),
  });

  const cad = cadencias.find(c => c.id === fila?.cadencia_id);
  const passo = cad && (fila?.cadencia_passo ?? 0) >= 0 ? (cad.passos || []).slice().sort((a, b) => (a.dias_uteis || 0) - (b.dias_uteis || 0) || (a.horas_apos_anterior || 0) - (b.horas_apos_anterior || 0))[fila.cadencia_passo ?? 0] : null;

  const meta = vendedor?.meta_diaria_toques || cfg.toques_dia || 80;
  const toquesHoje = regsHoje.length;
  const waHoje = regsHoje.filter(r => r.canal === 'whatsapp').length;
  const limiteWa = cfg.limite_primeiro_whatsapp_dia || 40;

  // Seleção/render do modelo de WhatsApp para o lead atual
  useEffect(() => {
    if (!fila) return;
    const publico = fila.tipo_origem === 'indicacao' ? 'indicacao' : 'base_clientes';
    const m = modelos.find(x => x.id === passo?.modelo_id) || modelos.find(x => x.publico === publico && x.primeiro_contato === !fila.whatsapp_primeiro_em) || modelos.find(x => x.publico === publico) || modelos[0];
    if (m) setWa({ modeloId: m.id, texto: renderModelo(m.texto, { nome: fila.nome, gerente: vendedor?.nome, produto_contratado: fila.produto_contratado, produto: fila.produto, responsavel_origem: fila.responsavel_origem }, { descadastro: m.primeiro_contato || !fila.whatsapp_primeiro_em ? (cfg.texto_descadastro || 'Se preferir não receber contato, responda SAIR.') : '' }) });
    else setWa({ modeloId: '', texto: '' });
    setBriefing(''); setLinkAg('');
  }, [fila?.id, modelos.length, cfg.texto_descadastro]); // eslint-disable-line

  // Ao voltar ao app depois de ligar/enviar WhatsApp, abre a folha de resultado sozinha
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible' && aguardandoRef.current) { setSheet({ canal: aguardandoRef.current }); setAguardando(null); } };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // Atalhos (desktop)
  useEffect(() => {
    if (mobile) return;
    const h = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || sheet || agenda) return;
      if (e.key === 'c') abrirTel(); else if (e.key === 'w') abrirWa(); else if (e.key === 'n') pular(); else if (e.key === 'r') setSheet({ canal: 'ligacao' });
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }); // eslint-disable-line

  const criarComando = async (canal, mensagem) => {
    setEnviandoCmd(true);
    try {
      await base44.entities.ComandoDiscagem.create({ vendedor_id: vid, canal, telefone_e164: fila.telefone_e164 || `+${String(fila.telefone || '').replace(/\D/g, '')}`, nome: fila.nome, fila_id: fila.id, mensagem: mensagem || '', produto_contratado: fila.produto_contratado || fila.produto || '', criado_em: new Date().toISOString(), status: 'enviado' });
      toast.success(vendedor?.celular_operadora ? 'Enviado ao seu celular — toque no botão que apareceu.' : 'Enviado. Abra /m no celular (cadastre seu celular em "Meu celular").');
    } catch (e) { toast.error('Falha ao enviar ao celular: ' + (e.message || e)); }
    setEnviandoCmd(false);
  };

  // O prefixo da operadora só vale para quem DISCA: se um gestor está trabalhando a fila de outro gerente, não usa o código dele.
  const emailsDoVendedor = [vendedor?.email, ...(vendedor?.emails_alternativos || [])].map(e => String(e || '').toLowerCase()).filter(Boolean);
  const filaPropria = !!user?.email && emailsDoVendedor.includes(String(user.email).toLowerCase());
  const telHref = fila ? telParaTel(fila.telefone_e164 || fila.telefone, filaPropria ? vendedor?.operadora : undefined) : '';
  const waHref = fila ? waLink(fila.telefone_e164 || fila.telefone, wa.texto) : '';
  const limiteWaAtingido = !!fila && !fila.whatsapp_primeiro_em && waHoje >= limiteWa;

  const abrirTel = () => {
    if (!fila || !telHref) return;
    if (fila.telefone_valido === false) { toast.error('Número marcado como inválido.'); return; }
    if (!mobile) toast.info('No computador, a ligação abre o discador do sistema (ex.: FaceTime). Para ligar pelo chip do celular, escaneie o QR com a câmera.', { duration: 6000 });
    setAguardando('ligacao');
    window.location.href = telHref;
  };
  const abrirWa = () => {
    if (!fila || !waHref) return;
    if (limiteWaAtingido) { toast.error(`Limite diário de primeiros WhatsApps atingido (${limiteWa}). Use ligação ou aguarde amanhã.`); return; }
    setAguardando('whatsapp');
    window.open(waHref, '_blank', 'noopener');
  };
  const ligar = async () => {
    if (!fila) return;
    if (fila.telefone_valido === false) { toast.error('Número marcado como inválido.'); return; }
    if (mobile) { setAguardando('ligacao'); window.location.href = telHref; }
    else abrirTel();
  };
  const enviarWhatsApp = async () => {
    if (!fila) return;
    if (!fila.whatsapp_primeiro_em && waHoje >= limiteWa) { toast.error(`Limite diário de primeiros WhatsApps atingido (${limiteWa}). Use ligação ou aguarde amanhã.`); return; }
    abrirWa();
  };
  const pular = () => { if (fila) setPulados(p => [...p, fila.id]); };
  const aposResultado = () => { setSheet(null); setPulados([]); refetch(); refetchRegs(); qc.invalidateQueries({ queryKey: ['fila-contato'] }); };

  const gerarBriefing = async () => {
    setCarregandoBrief(true);
    try {
      const prompt = `Faça um briefing de 10 segundos (3 tópicos curtos, em português) para o gerente ligar para um cliente. Use só estes dados, sem inventar nada.\nPrimeiro nome: ${(fila.nome || '').split(' ')[0]}\nProduto já contratado no Grupo: ${fila.produto_contratado || '—'}\nFaixa de valor: ${fila.valor_contrato ? (fila.valor_contrato >= 5000 ? 'alta' : fila.valor_contrato >= 1500 ? 'média' : 'baixa') : '—'}\nTipo: ${fila.tipo_pessoa || '—'}\nPasso da cadência: ${passo ? `${(fila.cadencia_passo ?? 0) + 1} (${passo.canal})` : 'sem cadência'}\nÚltimas interações: ${historico.map(h => `${h.tipo}: ${h.descricao}`).join(' | ') || 'nenhuma'}\nSugira uma abertura e uma pergunta de qualificação.`;
      const r = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      setBriefing(typeof r === 'string' ? r : r?.response || JSON.stringify(r));
    } catch (e) { toast.error('IA indisponível.'); }
    setCarregandoBrief(false);
  };

  const gerarLinkAgenda = async () => {
    try {
      const r = await base44.functions.invoke('agendamentoPublico', { action: 'gerar_link', fila_id: fila.id });
      const d = r?.data || r; if (d?.error) throw new Error(d.error);
      const url = `${window.location.origin}/agendar/${d.token}`;
      setLinkAg(url);
      setWa(w => ({ ...w, texto: `${w.texto ? w.texto + '\n\n' : ''}Para facilitar, escolha o melhor horário para conversarmos: ${url}` }));
      try { await navigator.clipboard.writeText(url); toast.success('Link copiado e incluído na mensagem de WhatsApp.'); } catch { toast.success('Link gerado e incluído na mensagem.'); }
    } catch (e) { toast.error('Erro ao gerar link: ' + (e.message || e)); }
  };

  const reuniaoSalva = async (ag) => {
    setAgenda(false);
    try {
      const reuniao_em = new Date(`${ag.data_agendada}T${ag.horario || '09:00'}:00-03:00`).toISOString();
      await base44.functions.invoke('registrarResultadoContato', { fila_id: fila.id, canal: 'ligacao', resultado: 'reuniao_marcada', reuniao_em, observacao: 'Reunião criada pelo Modo Foco' });
      await base44.entities.FilaContato.update(fila.id, { meet_link: ag.meet_link || '', google_event_id: ag.google_event_id || '' }).catch(() => {});
      toast.success('Reunião marcada!'); aposResultado();
    } catch (e) { toast.error('Reunião criada, mas não consegui atualizar o lead: ' + (e.message || e)); }
  };

  if (!vendedor) return <div className="p-10 text-center text-sm" style={{ color: A.muted }}>Cadastro de gerente não encontrado para o seu usuário.</div>;

  const pct = Math.min(100, Math.round((toquesHoje / meta) * 100));
  return (
    <div className="w-full" style={{ color: A.text }}>
      {/* Barra de meta */}
      <div className="rounded-2xl p-3 mb-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="flex items-center gap-1 font-semibold" style={{ color: A.accent }}><Target className="w-3.5 h-3.5" /> Meta de hoje: {toquesHoje}/{meta} toques</span>
          <span style={{ color: A.muted }}>{plano.length - pulados.length} na fila · WhatsApp: {waHoje}/{limiteWa} 1ºs contatos</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: A.surface2 }}><div className="h-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#34d399' : A.accent }} /></div>
      </div>

      {isLoading ? <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: A.accent }} /></div>
        : !fila ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3" style={{ color: A.accent }} />
            <p className="font-semibold">Fila zerada por agora 🎉</p>
            <p className="text-xs mt-1" style={{ color: A.muted }}>Use "Solicitar mais clientes" ou aguarde os próximos retornos.</p>
            {pulados.length > 0 && <button onClick={() => setPulados([])} className="mt-3 text-xs underline" style={{ color: A.accent }}>Rever {pulados.length} pulado(s)</button>}
          </div>
        ) : (
          <div className={`grid gap-3 ${mobile ? 'grid-cols-1' : 'lg:grid-cols-[1fr_420px]'}`}>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: A.surface, border: `1px solid ${A.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg truncate">{fila.nome}</h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: fila.tipo_origem === 'indicacao' ? 'rgba(0,212,170,0.12)' : 'rgba(99,102,241,0.12)', color: fila.tipo_origem === 'indicacao' ? A.accent : '#818cf8' }}>{fila.status === 'atendeu' ? 'Retorno' : fila.tipo_origem === 'indicacao' ? 'Indicação' : 'Carteira'}</span>
                    {fila.segmento && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: `${SEG[fila.segmento]}22`, color: SEG[fila.segmento] }}><Flame className="w-3 h-3" />{fila.segmento}{fila.score != null ? ` · ${fila.score}` : ''}</span>}
                  </div>
                  <p className="text-sm mt-1 font-mono" style={{ color: A.accent }}>{fila.telefone || '—'}</p>
                </div>
                <button onClick={pular} title="Pular (N)" className="p-2 rounded-xl flex items-center gap-1 text-xs" style={{ background: A.surface2, color: A.muted }}><SkipForward className="w-4 h-4" /> Pular</button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: A.muted }}>
                {fila.produto_contratado && <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Contratou: <b style={{ color: A.text }}>{fila.produto_contratado}</b></span>}
                {fila.valor_contrato != null && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {brl(fila.valor_contrato)}</span>}
                {fila.responsavel_origem && <span className="flex items-center gap-1"><User className="w-3 h-3" /> Origem: {fila.responsavel_origem}</span>}
                {fila.produto && <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Interesse: {fila.produto}</span>}
                {fila.status === 'atendeu' && fila.proximo_contato && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Retorno {fila.proximo_contato.split('-').reverse().join('/')} {fila.proximo_contato_hora}</span>}
              </div>

              {passo && <div className="text-[11px] rounded-lg px-3 py-2" style={{ background: 'rgba(0,212,170,0.08)', color: A.accent }}>Cadência “{cad.nome}” · passo {(fila.cadencia_passo ?? 0) + 1}/{cad.passos.length}: <b>{passo.titulo || (passo.canal === 'ligacao' ? 'Ligar' : passo.canal === 'whatsapp' ? 'WhatsApp' : passo.canal)}</b></div>}

              {historico.length > 0 && (
                <div className="text-[11px] space-y-0.5" style={{ color: A.muted }}>
                  {historico.map(h => <p key={h.id} className="truncate">• {String(h.data_interacao || '').split('-').reverse().join('/')} · {h.tipo}: {h.descricao}</p>)}
                </div>
              )}

              {/* Ações */}
              {mobile ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={ligar} className="py-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition active:scale-95" style={{ background: 'rgba(59,130,249,0.18)', color: '#60a5fa', border: '1px solid rgba(59,130,249,0.45)' }}>
                    <PhoneCall className="w-6 h-6" /><span className="text-sm">Ligar</span>
                  </button>
                  <button onClick={abrirWa} className="py-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition active:scale-95" style={{ background: 'rgba(52,211,153,0.18)', color: '#34d399', border: '1px solid rgba(52,211,153,0.45)' }}>
                    <MessageCircle className="w-6 h-6" /><span className="text-sm">WhatsApp</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    {[{ k: 'wa', label: 'WhatsApp', atalho: 'W', href: waHref, cor: '#34d399', borda: 'rgba(52,211,153,0.55)', Ic: MessageCircle, onClick: (e) => { e.preventDefault(); abrirWa(); } },
                      { k: 'tel', label: 'Ligação', atalho: 'C', href: telHref, cor: '#60a5fa', borda: 'rgba(59,130,249,0.55)', Ic: PhoneCall, onClick: (e) => { e.preventDefault(); abrirTel(); } }].map(q => (
                      <a key={q.k} href={q.href || undefined} onClick={q.onClick} title={q.k === 'tel' ? 'Ligar agora (ou escaneie com a câmera do celular)' : 'Abrir WhatsApp (ou escaneie com a câmera do celular)'}
                        className="flex flex-col items-center py-3 rounded-2xl transition hover:scale-[1.02]" style={{ background: A.surface2, border: `1px solid ${q.borda}`, opacity: q.href ? 1 : 0.45 }}>
                        <div className="rounded-xl p-2 bg-white" style={{ boxShadow: `0 0 18px ${q.borda}` }}>
                          <img src={qrUrl(q.href || ' ', 112)} alt={`QR ${q.label}`} style={{ width: 112, height: 112 }} />
                        </div>
                        <span className="mt-2 text-sm font-bold flex items-center gap-1.5" style={{ color: q.cor }}><q.Ic className="w-4 h-4" /> {q.label}</span>
                        <span className="text-[9px] opacity-60" style={{ color: A.muted }}>clique ou escaneie · atalho {q.atalho}</span>
                      </a>
                    ))}
                  </div>
                  {filaPropria && vendedor?.celular_operadora && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: A.muted }}>
                      <Smartphone className="w-3 h-3" /> Opcional — enviar ao app do meu celular pareado:
                      <button onClick={() => criarComando('ligar')} disabled={enviandoCmd} className="underline" style={{ color: '#60a5fa' }}>Ligar</button>
                      <button onClick={() => criarComando('whatsapp', wa.texto)} disabled={enviandoCmd} className="underline" style={{ color: '#34d399' }}>WhatsApp</button>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem de WhatsApp */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
                <div className="flex items-center gap-2">
                  <select value={wa.modeloId} onChange={e => { const m = modelos.find(x => x.id === e.target.value); setWa({ modeloId: e.target.value, texto: m ? renderModelo(m.texto, { nome: fila.nome, gerente: vendedor?.nome, produto_contratado: fila.produto_contratado, produto: fila.produto, responsavel_origem: fila.responsavel_origem }, { descadastro: m.primeiro_contato ? (cfg.texto_descadastro || 'Se preferir não receber contato, responda SAIR.') : '' }) : '' }); }}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }}>
                    <option value="">Mensagem livre</option>{modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <button onClick={() => { navigator.clipboard?.writeText(wa.texto); toast.success('Copiado'); }} className="p-1.5 rounded-lg" style={{ background: A.surface, color: A.muted }}><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <textarea value={wa.texto} onChange={e => setWa(w => ({ ...w, texto: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }} />
                {linkAg && <p className="text-[10px] break-all" style={{ color: A.accent }}>{linkAg}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSheet({ canal: 'ligacao' })} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: A.accent, color: '#0d1117' }}><ClipboardCheck className="w-4 h-4" /> Registrar resultado {!mobile && <span className="opacity-60">(R)</span>}</button>
                <button onClick={() => setAgenda(true)} className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: A.surface2, color: A.accent, border: `1px solid ${A.border}` }}><CalendarPlus className="w-4 h-4" /> Reunião (Meet)</button>
                <button onClick={gerarLinkAgenda} className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: A.surface2, color: A.accent, border: `1px solid ${A.border}` }}><Link2 className="w-4 h-4" /> Link de agendamento</button>
                <button onClick={gerarBriefing} disabled={carregandoBrief} className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40" style={{ background: A.surface2, color: A.accent, border: `1px solid ${A.border}` }}>{carregandoBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Briefing 10s</button>
                {mobile && <button onClick={() => setMostrarPitch(p => !p)} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: A.surface2, color: A.muted }}>{mostrarPitch ? 'Ocultar' : 'Pitch / IA'}</button>}
              </div>
              {briefing && <div className="rounded-xl p-3 text-xs whitespace-pre-wrap" style={{ background: 'rgba(0,212,170,0.06)', border: `1px solid ${A.border}` }}>{briefing}</div>}
              {!vendedor?.celular_operadora && !mobile && <p className="text-[11px] rounded-lg p-2 flex items-center gap-1.5" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}><Smartphone className="w-3.5 h-3.5" /> Cadastre seu celular em “Meu celular” para ligar pelo seu chip.</p>}
            </div>

            {mostrarPitch && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${A.border}`, minHeight: 420, maxHeight: mobile ? 520 : 'calc(100vh - 260px)' }}>
                <PitchAbordagemPanel produto={fila.produto || fila.produto_contratado} nomeLead={fila.nome} gerenteNome={vendedor?.nome} fila={fila} leadIndicacao={null} historicoResumo={historico.map(h => `${h.tipo}: ${h.descricao}`)} />
              </div>
            )}
          </div>
        )}

      {sheet && fila && <PosChamadaSheet fila={fila} canal={sheet.canal} modeloId={sheet.canal === 'whatsapp' ? wa.modeloId : undefined} onDone={aposResultado} onClose={() => setSheet(null)} />}
      {agenda && fila && <AgendaMeetModal user={user} vendedorId={vendedor.id} vendedorNome={vendedor.nome} clienteNome={fila.nome} clienteId={fila.cliente_id || ''} clienteTelefone={fila.telefone || ''} onClose={() => setAgenda(false)} onSaved={reuniaoSalva} />}
    </div>
  );
}