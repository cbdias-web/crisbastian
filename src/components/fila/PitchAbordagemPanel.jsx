import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react';

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
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?\n\nMotivo do contato: você foi indicado para conhecer o Dolarize — a forma mais simples de investir em dólar sem complicação.\n\nPrincipais benefícios:\n• Acesso ao dólar com starting price justo\n• Sem burocracia de corretora tradicional\n• Liquidez diária\n• Ideal para diversificar e proteger-se da volatilidade do real\n\nGanchos: proteção cambial, reserva em moeda forte, simplicidade.`,
    objecoes: ['"É seguro?"', '"Qual a rentabilidade?"', '"Qual o valor mínimo?"', '"Como funciona o resgate?"'],
  },
  'CONTA INTERNACIONAL': {
    nome: 'Conta Internacional',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.\n\nVocê foi indicado para a Conta Internacional — abrir uma conta nos EUA como residente no Brasil.\n\nDiferenciais:\n• Conta corrente/poupança em dólar nos EUA\n• Cartão de débito internacional\n• Remessas simplificadas\n• Sem necessidade de ir aos EUA\n• Estrutura para PF e PJ\n\nGanchos: dolarização de caixa, pagamentos internacionais, recebimento de clientes/fornecedores no exterior.`,
    objecoes: ['"Precisa ir aos EUA?"', '"Qual o valor mínimo de depósito?"', '"Tenho que declarar no IR?"', '"Quanto tempo leva?"'],
  },
  OFFSHORE: {
    nome: 'Offshore',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.\n\nVocê foi indicado para estruturação Offshore — proteção patrimonial e planejamento sucessório internacional.\n\nDiferenciais:\n• Estrutura em jurisdição segura\n• Holding patrimonial / sucessória\n• Confidencialidade e proteção de ativos\n• Acompanhamento jurídico e contábil\n\nGanchos: proteção patrimonial, sucessão facilitada,隔离 de risco, dolarização de estrutura.`,
    objecoes: ['"É legal?"', '"Qual custo?"', '"Preciso declarar?"', '"Quanto tempo para estruturar?"'],
  },
  RATING: {
    nome: 'Rating',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.\n\nVocê foi indicado para o Rating — avaliação de crédito e rating empresarial para fortalecer o seu acesso a crédito e mercados.\n\nDiferenciais:\n• Rating independente reconhecido\n• Relatório completo de análise\n• Suporte em captação e negociação\n\nGanchos: acesso a crédito mais barato, credibilidade com fornecedores, negociação bancária.`,
    objecoes: ['"Quanto custa?"', '"Serve pra PJ pequena?"', '"Qual o prazo?"', '"Como é usado?"'],
  },
  'HISTÓRIA DO GRUPO VILLELA': {
    nome: 'História do Grupo Villela',
    pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange.\n\nDeixa eu te contar rapidamente quem é o Grupo Villela — mais de 20 anos no mercado de câmbio e investimentos internacionais.\n\nQuem somos:\n• Especialistas em câmbio, remessas e investimentos no exterior\n• Atendimento consultivo e personalizado\n• Estrutura regulada e segura\n• Rede de parceiros internacionais\n\nGanchos: solidez, expertise, acompanhamento próximo, soluções sob medida.`,
    objecoes: ['"Vocês são corretora?"', '"Têm selo do BC?"', '"Como ganham?"', '"Posso confiar?"'],
  },
};

const DEFAULT_ROTEIRO = {
  nome: 'Abordagem Geral',
  pitch: `Abertura: "Oi [NOME], aqui é [GERENTE] da Villela Exchange. Tudo bem?\n\nMotivo do contato: você foi indicado para conhecer nossas soluções em câmbio e investimentos internacionais.\n\nPerguntas de qualificação:\n• Já investe no exterior hoje?\n• Qual o objetivo principal (proteção, pagamento, investimento)?\n• Qual o prazo e valor aproximado?`,
  objecoes: ['"Já tenho corretora"', '"Não tenho urgência"', '"Quero pensar"', '"Qual o custo?"'],
};

export default function PitchAbordagemPanel({ produto, nomeLead }) {
  const chave = (produto || '').toUpperCase().includes('DOLARIZE') ? 'DOLARIZE'
    : (produto || '').toUpperCase().includes('CONTA INTERNACIONAL') ? 'CONTA INTERNACIONAL'
    : (produto || '').toUpperCase().includes('OFFSHORE') ? 'OFFSHORE'
    : (produto || '').toUpperCase().includes('RATING') ? 'RATING'
    : ROTEIROS[produto?.toUpperCase?.()] ? produto.toUpperCase()
    : 'HISTÓRIA DO GRUPO VILLELA';
  const rot = ROTEIROS[chave] || DEFAULT_ROTEIRO;
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  return (
    <div className="flex flex-col h-full" style={{ background: AURORA.surface, border: `1px solid ${AURORA.border}` }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${AURORA.border}`, background: AURORA.surface2 }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: AURORA.accent }} />
        <p className="text-xs font-bold" style={{ color: AURORA.accent }}>Pitch · {rot.nome}</p>
      </div>
      <div className="p-3 overflow-y-auto" style={{ maxHeight: 200 }}>
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: AURORA.text }}>{rot.pitch}</pre>
        <div className="flex flex-wrap gap-1 mt-2">
          {rot.objecoes.map((o, i) => (
            <button key={i} onClick={() => perguntar(o)} disabled={enviando}
              className="text-[10px] px-2 py-1 rounded-full transition disabled:opacity-40"
              style={{ background: 'rgba(0,212,170,0.10)', color: AURORA.accent, border: `1px solid ${AURORA.border}` }}>
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 flex-1 overflow-y-auto space-y-2" style={{ borderTop: `1px solid ${AURORA.border}` }}>
        {msgs.length === 0 && <p className="text-[10px] italic" style={{ color: AURORA.textMuted }}>Trabalhe objeções em tempo real — clique numa objeção acima ou digite a sua.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.de === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: m.de === 'user' ? 'rgba(59,130,249,0.15)' : 'rgba(0,212,170,0.15)' }}>
              {m.de === 'user' ? <User className="w-3 h-3" style={{ color: '#60a5fa' }} /> : <Bot className="w-3 h-3" style={{ color: AURORA.accent }} />}
            </div>
            <div className="text-[11px] leading-relaxed max-w-[85%] p-2 rounded-lg" style={{ background: m.de === 'user' ? 'rgba(59,130,249,0.12)' : AURORA.surface2, color: AURORA.text }}>
              {m.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : m.texto}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 flex items-center gap-1" style={{ borderTop: `1px solid ${AURORA.border}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') perguntar(); }}
          placeholder="Digite a objeção do lead..."
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] focus:outline-none"
          style={{ background: AURORA.surface2, border: `1px solid ${AURORA.border}`, color: AURORA.text }} />
        <button onClick={() => perguntar()} disabled={enviando || !input.trim()}
          className="p-1.5 rounded-lg transition disabled:opacity-40" style={{ background: AURORA.accent, color: '#0d1117' }}>
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}