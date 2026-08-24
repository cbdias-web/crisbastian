import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Bot, User, Sparkles, MessageCircle, HelpCircle, ChevronDown, Search } from 'lucide-react';

const AURORA = {
  surface: '#161b22',
  surface2: '#1c2333',
  border: 'rgba(0,212,170,0.15)',
  accent: '#00D4AA',
  text: '#e6edf3',
  textMuted: 'rgba(230,237,243,0.55)',
};

// Roteiros fixos por produto (placeholder editável — ajuste o conteúdo com o time comercial).
const ROTEIROS = {
  DOLARIZE: {
    nome: 'Dolarize',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?

Deixa eu te contextualizar: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela é a fortaleza desta operação pelo seu histórico.

Você foi indicado para o Dolarize — a forma mais simples de investir em dólar sem complicação.

Principais benefícios:
• Acesso ao dólar com starting price justo
• Sem burocracia de corretora tradicional
• Liquidez diária
• Ideal para proteger-se da volatilidade do real

Ganchos: proteção cambial, reserva em moeda forte, simplicidade.`,
    objecoes: ['"É seguro?"', '"Qual a rentabilidade?"', '"Qual o valor mínimo?"', '"Como funciona o resgate?"'],
  },
  'CONTA INTERNACIONAL': {
    nome: 'Conta Internacional',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

A Villela Exchange é a vertical do Grupo Villela que viabiliza soluções financeiras com engenharia técnica — o Grupo Villela é a fortaleza desta operação pelo histórico.

Você foi indicado para a Conta Internacional — abrir uma conta nos EUA como residente no Brasil.

Diferenciais:
• Conta corrente/poupança em dólar nos EUA
• Cartão de débito internacional
• Remessas simplificadas
• Sem necessidade de ir aos EUA
• Estrutura para PF e PJ

Ganchos: dolarização de caixa, pagamentos internacionais, proteção patrimonial.`,
    objecoes: ['"Precisa ir aos EUA?"', '"Qual o valor mínimo de depósito?"', '"Tenho que declarar no IR?"', '"Quanto tempo leva?"'],
  },
  OFFSHORE: {
    nome: 'Offshore',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

A Villela Exchange é a vertical do Grupo Villela que entrega soluções financeiras com engenharia técnica — e proteção patrimonial é o nosso foco. O Grupo Villela é a fortaleza desta operação pelo seu histórico.

Você foi indicado para estruturação Offshore — proteção patrimonial e planejamento sucessório internacional.

Diferenciais:
• Estrutura em jurisdição segura
• Holding patrimonial / sucessória
• Confidencialidade e proteção de ativos
• Acompanhamento jurídico e contábil

Ganchos: proteção patrimonial, sucessão facilitada, isolamento de risco, dolarização de estrutura.`,
    objecoes: ['"É legal?"', '"Qual custo?"', '"Preciso declarar?"', '"Quanto tempo para estruturar?"'],
  },
  RATING: {
    nome: 'Rating',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Você foi indicado para o Rating — avaliação de crédito e rating empresarial para fortalecer o seu acesso a crédito e mercados.

Diferenciais:
• Rating independente reconhecido
• Relatório completo de análise
• Suporte em captação e negociação

Ganchos: acesso a crédito mais barato, credibilidade com fornecedores, negociação bancária.`,
    objecoes: ['"Quanto custa?"', '"Serve pra PJ pequena?"', '"Qual o prazo?"', '"Como é usado?"'],
  },
  'CANAL BANCÁRIO': {
    nome: 'Canal Bancário',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Você foi indicado para o Canal Bancário — estrutura para operar valores em reais (PF ou PJ).

Diferenciais:
• Operação acima de R$ 270.000 em 12 meses
• Estrutura para PF e PJ
• Acompanhamento completo

Ganchos: capacidade operacional, proteção e estruturação financeira.`,
    objecoes: ['"Qual o limite?"', '"PF ou PJ?"', '"Qual custo?"', '"Como funciona?"'],
  },
  'HISTÓRIA DO GRUPO VILLELA': {
    nome: 'História do Grupo Villela',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.

Deixa eu te contar quem somos: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela é a fortaleza desta operação pelo seu histórico de mais de 20 anos em câmbio e investimentos internacionais.

Quem somos:
• Especialistas em câmbio, remessas e investimentos no exterior
• Atendimento consultivo e personalizado
• Estrutura regulada e segura
• Rede de parceiros internacionais

Foco: proteção patrimonial — offshore, conta internacional e câmbio conversam diretamente com essa vertente.

Ganchos: solidez, expertise, acompanhamento próximo, soluções sob medida.`,
    objecoes: ['"Vocês são corretora?"', '"Têm selo do BC?"', '"Como ganham?"', '"Posso confiar?"'],
  },
};

const DEFAULT_ROTEIRO = {
  nome: 'Abordagem Geral',
  pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?

Deixa eu te apresentar: a Villela Exchange é a vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela é a fortaleza desta operação pelo seu histórico.

Nosso foco é proteção patrimonial — offshore, conta internacional e câmbio conversam diretamente com essa vertente. A Exchange possui diversas possibilidades de produtos.

Perguntas de qualificação:
• Já investe no exterior hoje?
• Qual o objetivo principal (proteção, pagamento, investimento)?
• Qual o prazo e valor aproximado?`,
  objecoes: ['"Já tenho corretora"', '"Não tenho urgência"', '"Quero pensar"', '"Qual o custo?"'],
};

// FAQ construído com base nos produtos e no material de capacitação do portal.
const FAQ = [
  { cat: 'Institucional', q: 'Quem é a Villela Exchange?', a: 'A vertical do Grupo Villela que viabiliza e entrega soluções financeiras com engenharia técnica para clientes dos mais diversos perfis. O Grupo Villela é a fortaleza desta operação pelo seu histórico.' },
  { cat: 'Institucional', q: 'Qual o foco da Exchange?', a: 'Proteção patrimonial. Offshore, conta internacional e câmbio conversam diretamente com essa vertente de negócios. A Exchange possui diversas possibilidades de produtos.' },
  { cat: 'Institucional', q: 'Vocês são corretora?', a: 'Não. Somos uma vertical consultiva que estrutura soluções financeiras sob medida, com engenharia técnica e acompanhamento jurídico e contábil.' },
  { cat: 'Institucional', q: 'É seguro? É regulado?', a: 'Atuamos com estrutura regulada e parceiros internacionais, sempre dentro da legalidade.' },
  { cat: 'Dolarize', q: 'O que é o Dolarize?', a: 'A forma mais simples de investir em dólar sem complicação, com starting price justo e liquidez diária.' },
  { cat: 'Dolarize', q: 'Preciso de corretora?', a: 'Não. Sem burocracia de corretora tradicional.' },
  { cat: 'Dolarize', q: 'Qual a vantagem?', a: 'Proteção cambial e reserva em moeda forte, ideal para diversificar e proteger-se da volatilidade do real.' },
  { cat: 'Conta Internacional', q: 'Precisa ir aos EUA?', a: 'Não. A abertura é feita do Brasil, para PF e PJ.' },
  { cat: 'Conta Internacional', q: 'Tenho que declarar no IR?', a: 'Sim. Operações no exterior devem ser declaradas — sua equipe contábil orienta.' },
  { cat: 'Conta Internacional', q: 'Quanto tempo leva?', a: 'Processo estruturado com acompanhamento completo do início ao fim.' },
  { cat: 'Offshore', q: 'É legal?', a: 'Sim. Estruturação legítima em jurisdições seguras para proteção patrimonial e planejamento sucessório.' },
  { cat: 'Offshore', q: 'Qual o custo?', a: 'Variável conforme a estrutura; apresentado em proposta personalizada.' },
  { cat: 'Offshore', q: 'Preciso declarar?', a: 'Sim, as obrigações declaratórias aplicam-se e são orientadas pela equipe.' },
  { cat: 'Canal Bancário', q: 'O que é?', a: 'Canal bancário para operar valores em reais, disponível para PF e PJ.' },
  { cat: 'Canal Bancário', q: 'Quando preciso?', a: 'Para operações superiores a R$ 270.000 no período de 12 meses.' },
  { cat: 'Garantias', q: 'O que é Garantias?', a: 'Administração de débitos com foco em proteção patrimonial.' },
  { cat: 'Rating', q: 'Para que serve o Rating?', a: 'Avaliação de crédito independente que fortalece o acesso a crédito e mercados.' },
  { cat: 'Rating', q: 'Serve para PJ pequena?', a: 'Sim, independente do porte — amplia credibilidade com fornecedores e bancos.' },
];

export default function PitchAbordagemPanel({ produto, nomeLead }) {
  const chave = (produto || '').toUpperCase().includes('DOLARIZE') ? 'DOLARIZE'
    : (produto || '').toUpperCase().includes('CONTA INTERNACIONAL') ? 'CONTA INTERNACIONAL'
    : (produto || '').toUpperCase().includes('OFFSHORE') ? 'OFFSHORE'
    : (produto || '').toUpperCase().includes('RATING') ? 'RATING'
    : (produto || '').toUpperCase().includes('CANAL BANCÁRIO') ? 'CANAL BANCÁRIO'
    : ROTEIROS[produto?.toUpperCase?.()] ? produto.toUpperCase()
    : 'HISTÓRIA DO GRUPO VILLELA';
  const rot = ROTEIROS[chave] || DEFAULT_ROTEIRO;
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
      const prompt = `Você é o assistente comercial da Villela Exchange apoiando um gerente em uma ligação ativa.\nProduto: ${rot.nome}.\nNome do lead: ${nomeLead || '—'}.\nRoteiro base do produto:\n${rot.pitch}\n\nO lead apresentou a seguinte objeção/pergunta:\n"${pergunta}"\n\nResponda de forma curta, prática e consultiva, com 2 a 4 frases, sugerindo ao gerente o que responder e como conduzir. Não invente valores ou prazos não citados no roteiro.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      const resposta = typeof res === 'string' ? res : res?.response || res?.text || JSON.stringify(res);
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
            <pre className="text-[10.5px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: AURORA.text, opacity: 0.88 }}>{rot.pitch}</pre>
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
          <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 min-h-[100px]">
            {msgs.length === 0 && <p className="text-[10px] italic text-center pt-2" style={{ color: AURORA.textMuted }}>Trabalhe objeções em tempo real — clique acima ou digite a sua.</p>}
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