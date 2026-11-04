import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Bot, User, Sparkles, MessageCircle, HelpCircle, ChevronDown, Search, ShieldAlert } from 'lucide-react';
import { ROTEIROS as ROTEIROS_PADRAO, DEFAULT_ROTEIRO, FAQ as FAQ_PADRAO } from './roteirosPadrao';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

export default function PitchAbordagemPanel({ produto, nomeLead, gerenteNome, fila, leadIndicacao, historicoResumo = [] }) {
  // Roteiros/FAQ editáveis (entidades); se vazias, usa o padrão em código
  const { data: roteirosDB = [] } = useQuery({ queryKey: ['roteiros-db'], queryFn: () => base44.entities.RoteiroProduto.filter({ ativo: true }, 'nome', 100), staleTime: 300000 });
  const { data: faqDB = [] } = useQuery({ queryKey: ['faq-db'], queryFn: () => base44.entities.FaqItem.filter({ ativo: true }, 'categoria', 300), staleTime: 300000 });
  const ROTEIROS = useMemo(() => {
    const m = { ...ROTEIROS_PADRAO };
    for (const r of roteirosDB) m[r.chave] = { nome: r.nome, pitch: r.pitch, objecoes: r.objecoes || [] };
    return m;
  }, [roteirosDB]);
  const FAQ = useMemo(() => (faqDB.length ? faqDB.map(f => ({ cat: f.categoria || 'Geral', q: f.pergunta, a: f.resposta })) : FAQ_PADRAO), [faqDB]);
  // Carteira (PJ): busca o representante legal do cliente para a abertura
  const [responsavelCliente, setResponsavelCliente] = useState(null);
  useEffect(() => {
    let vivo = true;
    const cid = fila?.cliente_id || (fila?.tipo_origem === 'carteira' ? fila?.ref_id : null);
    if (!cid) { setResponsavelCliente(null); return; }
    base44.entities.Cliente.get(cid)
      .then(c => { if (vivo) setResponsavelCliente(c?.responsavel_legal || null); })
      .catch(() => { if (vivo) setResponsavelCliente(null); });
    return () => { vivo = false; };
  }, [fila?.cliente_id, fila?.ref_id, fila?.tipo_origem]);

  const chave = (produto || '').toUpperCase().includes('DOLARIZE') ? 'DOLARIZE'
    : (produto || '').toUpperCase().includes('CONTA INTERNACIONAL') ? 'CONTA INTERNACIONAL'
    : (produto || '').toUpperCase().includes('OFFSHORE') ? 'OFFSHORE'
    : (produto || '').toUpperCase().includes('RATING') ? 'RATING'
    : (produto || '').toUpperCase().includes('CANAL BANCÁRIO') ? 'CANAL BANCÁRIO'
    : ROTEIROS[produto?.toUpperCase?.()] ? produto.toUpperCase()
    : (fila?.tipo_origem === 'carteira' && (fila?.produto_contratado || fila?.responsavel_origem)) ? 'REATIVACAO'
    : 'HISTÓRIA DO GRUPO VILLELA';
  const rot = ROTEIROS[chave] || DEFAULT_ROTEIRO;

  // Abertura personalizada: PF → primeiro nome do lead; PJ → representante legal
  const nomeAbertura = useMemo(() => {
    const rep = leadIndicacao?.tipo === 'PJ' ? leadIndicacao.pj_nome_responsavel : null;
    const base = (rep || responsavelCliente || nomeLead || '').toString().trim();
    return base.split(/\s+/)[0] || '—';
  }, [leadIndicacao, responsavelCliente, nomeLead]);
  const gerenteAbertura = (gerenteNome || '').toString().trim().split(/\s+/)[0] || 'gerente';
  const pitchFinal = useMemo(() => rot.pitch
    .replaceAll('[NOME]', nomeAbertura)
    .replaceAll('[GERENTE]', gerenteAbertura), [rot.pitch, nomeAbertura, gerenteAbertura]);

  const [aba, setAba] = useState('pitch');
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [faqAberto, setFaqAberto] = useState(null);
  const [faqBusca, setFaqBusca] = useState('');

  const perguntar = async (texto) => {
    const pergunta = (texto ?? input).trim();
    if (!pergunta) return;
    setInput('');
    const novas = [...msgs, { de: 'user', texto: pergunta }];
    setMsgs([...novas, { de: 'ia', loading: true }]);
    setEnviando(true);
    try {
      const contexto = [
        `Produto em negociação: ${rot.nome}.`,
        fila?.produto_contratado ? `Produto que o cliente já contratou no Grupo Villela: ${fila.produto_contratado}.` : '',
        fila?.valor_contrato ? `Faixa de valor do contrato original: ${fila.valor_contrato >= 5000 ? 'alta' : fila.valor_contrato >= 1500 ? 'média' : 'baixa'}.` : '',
        fila?.cadencia_passo >= 0 && fila?.cadencia_id ? `Passo da cadência: ${(fila.cadencia_passo || 0) + 1}.` : '',
        historicoResumo.length ? `Últimas interações: ${historicoResumo.join(' | ')}.` : '',
      ].filter(Boolean).join('\n');
      const faqTxt = FAQ.slice(0, 40).map(f => `- ${f.q}: ${f.a}`).join('\n');
      const prompt = `Você é o copiloto comercial da Villela Exchange apoiando um gerente em uma ligação ativa.
REGRAS OBRIGATÓRIAS (compliance):
1) Responda SOMENTE com base no roteiro e no FAQ aprovados abaixo. Se a informação não estiver neles, diga que o gerente deve "confirmar com a equipe técnica e retornar" — não improvise.
2) NUNCA prometa rentabilidade, retorno, prazo, isenção de impostos ou resultado. NUNCA invente valores.
3) NUNCA dê parecer jurídico, tributário ou de investimento; oriente consultar a equipe técnica/jurídica.
4) Se o cliente pedir para não ser contatado (ex.: "me tire da lista", "SAIR"), oriente registrar opt-out e encerrar com cortesia.
5) Vincule a resposta apenas ao produto "${rot.nome}". Tom consultivo, 2 a 4 frases.
Cliente (trate por ${nomeAbertura}). Gerente: ${gerenteAbertura}.
${contexto}

ROTEIRO APROVADO:
${pitchFinal}

FAQ APROVADO:
${faqTxt}

Objeção/pergunta do cliente: "${pergunta}"
Responda em JSON.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt, model: 'gemini_3_flash',
        response_json_schema: { type: 'object', properties: { resposta_curta: { type: 'string' }, pergunta_de_avanco: { type: 'string' }, proximo_passo: { type: 'string' }, alerta_compliance: { type: 'string' } } },
      });
      const j = typeof res === 'string' ? (() => { try { return JSON.parse(res); } catch { return { resposta_curta: res }; } })() : res;
      const resposta = [j.resposta_curta, j.pergunta_de_avanco ? `\n➡️ ${j.pergunta_de_avanco}` : '', j.proximo_passo ? `\n📌 ${j.proximo_passo}` : '', j.alerta_compliance ? `\n⚠️ ${j.alerta_compliance}` : ''].filter(Boolean).join('');
      setMsgs([...novas, { de: 'ia', texto: resposta }]);
    } catch (e) {
      setMsgs([...novas, { de: 'ia', texto: 'Erro ao consultar IA: ' + (e?.message || e) }]);
    }
    setEnviando(false);
  };

  const faqFiltrada = FAQ.filter(f => !faqBusca.trim() || (f.q + ' ' + f.a).toLowerCase().includes(faqBusca.trim().toLowerCase()));

  return (
    <div className="flex flex-col h-full" style={{ background: AURORA.surface }}>
      {/* Header compacto com abas Pitch / FAQ */}
      <div className="px-3 pt-2 flex items-center gap-1 flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}`, background: 'rgba(0,212,170,0.06)' }}>
        <button onClick={() => setAba('pitch')} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold transition"
          style={{ color: aba === 'pitch' ? AURORA.accent : AURORA.textMuted, borderBottom: aba === 'pitch' ? `2px solid ${AURORA.accent}` : '2px solid transparent' }}>
          <Sparkles className="w-3.5 h-3.5" /> Pitch
        </button>
        <button onClick={() => setAba('faq')} className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold transition"
          style={{ color: aba === 'faq' ? AURORA.accent : AURORA.textMuted, borderBottom: aba === 'faq' ? `2px solid ${AURORA.accent}` : '2px solid transparent' }}>
          <HelpCircle className="w-3.5 h-3.5" /> FAQ
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(0,212,170,0.12)', color: AURORA.accent }}>{rot.nome}</span>
      </div>

      {aba === 'pitch' ? (
        <>
          {/* Roteiro */}
          <div className="p-3" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
            <pre className="text-[10.5px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: AURORA.text, opacity: 0.88 }}>{pitchFinal}</pre>
          </div>

          {/* Objeções rápidas */}
          <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: AURORA.textMuted }}>
              <MessageCircle className="w-2.5 h-2.5" /> Objeções comuns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rot.objecoes.map((o, i) => (
                <button key={i} onClick={() => perguntar(o)} disabled={enviando}
                  className="text-[10px] px-2 py-1 rounded-full transition hover:brightness-125 disabled:opacity-40"
                  style={{ background: 'rgba(0,212,170,0.08)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Chat IA */}
          <div className="overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: '40%' }}>
            {msgs.length === 0 && <p className="text-[10px] italic text-center" style={{ color: AURORA.textMuted }}>Trabalhe objeções em tempo real — clique acima ou digite a sua.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.de === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: m.de === 'user' ? 'rgba(59,130,249,0.15)' : 'rgba(0,212,170,0.15)' }}>
                  {m.de === 'user' ? <User className="w-3 h-3" style={{ color: '#60a5fa' }} /> : <Bot className="w-3 h-3" style={{ color: AURORA.accent }} />}
                </div>
                <div className="text-[11px] leading-relaxed max-w-[82%] p-2 rounded-lg" style={{ background: m.de === 'user' ? 'rgba(59,130,249,0.10)' : AURORA.surface2, color: AURORA.text }}>
                  {m.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : m.texto}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-2.5 flex items-center gap-1.5 flex-shrink-0" style={{ borderTop: `1px solid ${AURORA.border}`, background: AURORA.surface2 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') perguntar(); }}
              placeholder="Digite a objeção do lead..."
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] focus:outline-none" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
            <button onClick={() => perguntar()} disabled={enviando || !input.trim()}
              className="p-1.5 rounded-lg transition disabled:opacity-40 hover:brightness-110" style={{ background: AURORA.accent, color: '#0d1117' }}>
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* FAQ — busca */}
          <div className="p-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${AURORA.border}` }}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}` }}>
              <Search className="w-3 h-3 flex-shrink-0" style={{ color: AURORA.textMuted }} />
              <input value={faqBusca} onChange={e => setFaqBusca(e.target.value)} placeholder="Buscar no FAQ..."
                className="flex-1 bg-transparent text-[11px] focus:outline-none" style={{ color: AURORA.text }} />
            </div>
          </div>

          {/* FAQ — lista acordeão */}
          <div className="flex-1 overflow-y-auto">
            {faqFiltrada.map((f, i) => {
              const aberto = faqAberto === i;
              return (
                <div key={i} style={{ borderBottom: `1px solid ${AURORA.border}` }}>
                  <button onClick={() => setFaqAberto(aberto ? null : i)} className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'rgba(0,212,170,0.10)', color: AURORA.accent }}>{f.cat}</span>
                    <span className="text-[11px] font-semibold flex-1 leading-snug" style={{ color: AURORA.text }}>{f.q}</span>
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-transform" style={{ color: AURORA.textMuted, transform: aberto ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {aberto && <p className="px-3 pb-3 pl-[34px] text-[10.5px] leading-relaxed pr-4" style={{ color: AURORA.textMuted }}>{f.a}</p>}
                </div>
              );
            })}
            {faqFiltrada.length === 0 && <p className="text-[10px] italic text-center py-6" style={{ color: AURORA.textMuted }}>Nada encontrado no FAQ.</p>}
          </div>
        </>
      )}
    </div>
  );
}