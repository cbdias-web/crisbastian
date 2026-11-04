import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, Loader2, Mic, Sparkles, PhoneCall, PhoneMissed, MessageCircle, CalendarCheck, Ban, ThumbsDown, Voicemail, PhoneOff } from 'lucide-react';
import { hojeBrasilia, proximoDiaUtilBR, somaDiasData } from '@/lib/leadUtils';

const A = { surface: '#161b22', surface2: '#1c2333', border: 'rgba(255,255,255,0.08)', accent: '#00D4AA', text: '#e6edf3', muted: 'rgba(230,237,243,0.55)' };

const LIGACAO = [
  { k: 'atendeu_interessado', l: 'Atendeu — interessado', ic: PhoneCall, c: '#34d399', retorno: true },
  { k: 'atendeu_retorno', l: 'Atendeu — pediu retorno', ic: PhoneCall, c: '#fbbf24', retorno: true },
  { k: 'reuniao_marcada', l: 'Reunião marcada', ic: CalendarCheck, c: '#2dd4bf', reuniao: true },
  { k: 'atendeu_sem_interesse', l: 'Atendeu — sem interesse', ic: ThumbsDown, c: '#f87171' },
  { k: 'caixa_postal', l: 'Caixa postal', ic: Voicemail, c: '#8b96a3' },
  { k: 'nao_atendeu', l: 'Não atendeu', ic: PhoneMissed, c: '#fb923c' },
  { k: 'numero_errado', l: 'Número errado', ic: PhoneOff, c: '#8b96a3' },
  { k: 'opt_out', l: 'Não quer contato', ic: Ban, c: '#ef4444' },
];
const WHATS = [
  { k: 'whatsapp_enviado', l: 'WhatsApp enviado', ic: MessageCircle, c: '#34d399' },
  { k: 'respondeu', l: 'Lead respondeu', ic: MessageCircle, c: '#2dd4bf', retorno: true },
  { k: 'reuniao_marcada', l: 'Reunião marcada', ic: CalendarCheck, c: '#2dd4bf', reuniao: true },
  { k: 'numero_errado', l: 'Sem WhatsApp / número errado', ic: PhoneOff, c: '#8b96a3' },
  { k: 'opt_out', l: 'Pediu para sair (SAIR)', ic: Ban, c: '#ef4444' },
];

// Folha pós-chamada: 1 toque define o resultado e dispara a transição correta no servidor.
export default function PosChamadaSheet({ fila, canal = 'ligacao', modeloId, onDone, onClose }) {
  const opcoes = canal === 'whatsapp' ? WHATS : LIGACAO;
  const [sel, setSel] = useState(null);
  const [obs, setObs] = useState('');
  const [data, setData] = useState(proximoDiaUtilBR(somaDiasData(hojeBrasilia(), 1)));
  const [hora, setHora] = useState('09:00');
  const [reuniaoData, setReuniaoData] = useState(proximoDiaUtilBR(somaDiasData(hojeBrasilia(), 1)));
  const [reuniaoHora, setReuniaoHora] = useState('10:00');
  const [enviando, setEnviando] = useState(false);
  const [ia, setIa] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const recRef = useRef(null);

  const ditar = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.info('Seu navegador não suporta ditado por voz.'); return; }
    if (ouvindo) { recRef.current?.stop(); return; }
    const r = new SR(); r.lang = 'pt-BR'; r.interimResults = false; r.continuous = true;
    r.onresult = (e) => { const t = Array.from(e.results).map(x => x[0].transcript).join(' '); setObs(o => (o ? o + ' ' : '') + t); };
    r.onend = () => setOuvindo(false); r.onerror = () => setOuvindo(false);
    recRef.current = r; setOuvindo(true); r.start();
  };

  // IA: resume o que o gerente escreveu/ditou e sugere próximo passo (sem enviar CPF/e-mail/endereço)
  const resumirIA = async () => {
    if (obs.trim().length < 5) { toast.info('Escreva ou dite 1–2 frases primeiro.'); return; }
    setIa(true);
    try {
      const prompt = `Você apoia gerentes comerciais da Villela Exchange. Transforme a anotação abaixo em um resumo objetivo (máx. 2 frases), classifique o sentimento do cliente e sugira o próximo passo e em quantos dias úteis retornar. Não invente fatos nem valores.\nCliente (primeiro nome): ${(fila.nome || '').split(' ')[0]}\nProduto: ${fila.produto || fila.produto_contratado || '—'}\nCanal: ${canal}\nAnotação: "${obs}"`;
      const r = await base44.integrations.Core.InvokeLLM({
        prompt, model: 'gemini_3_flash',
        response_json_schema: { type: 'object', properties: { resumo: { type: 'string' }, sentimento: { type: 'string', enum: ['positivo', 'neutro', 'negativo'] }, proximo_passo: { type: 'string' }, dias_uteis_ate_retorno: { type: 'number' } } },
      });
      const j = typeof r === 'string' ? JSON.parse(r) : r;
      setObs(`${j.resumo} Próximo passo: ${j.proximo_passo}`);
      const d = Math.max(1, Math.min(15, Math.round(j.dias_uteis_ate_retorno || 1)));
      let alvo = hojeBrasilia(); for (let i = 0; i < d; i++) alvo = proximoDiaUtilBR(somaDiasData(alvo, 1));
      setData(alvo);
      toast.success('Resumo e data de retorno sugeridos — confira antes de salvar.');
    } catch (e) { toast.error('IA indisponível: ' + (e.message || e)); }
    setIa(false);
  };

  const salvar = async () => {
    if (!sel) return;
    const op = opcoes.find(o => o.k === sel);
    if (op.retorno && !data) { toast.error('Informe a data do retorno.'); return; }
    setEnviando(true);
    try {
      const payload = { fila_id: fila.id, canal, resultado: sel, observacao: obs.trim(), modelo_id: modeloId || undefined };
      if (op.retorno) payload.retorno = { data, hora };
      if (op.reuniao) payload.reuniao_em = new Date(`${reuniaoData}T${reuniaoHora}:00-03:00`).toISOString();
      const res = await base44.functions.invoke('registrarResultadoContato', payload);
      const d = res?.data || res;
      if (d?.error) throw new Error(d.error);
      toast.success(d.sugerir_nutricao ? 'Registrado. 4+ tentativas sem retorno — considere mover para Nutrição.' : 'Resultado registrado.');
      onDone?.(d);
    } catch (e) { toast.error('Erro: ' + (e?.response?.data?.error || e.message)); }
    setEnviando(false);
  };

  const op = opcoes.find(o => o.k === sel);
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col" style={{ background: A.surface, border: `1px solid ${A.border}` }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${A.border}` }}>
          <div>
            <p className="text-xs" style={{ color: A.muted }}>{canal === 'whatsapp' ? 'Resultado do WhatsApp' : 'Resultado da ligação'}</p>
            <p className="font-bold text-sm" style={{ color: A.text }}>{fila.nome}</p>
          </div>
          <button onClick={onClose} className="p-2" style={{ color: A.muted }}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {opcoes.map(o => (
              <button key={o.k} onClick={() => setSel(o.k)} className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-bold text-left transition"
                style={{ background: sel === o.k ? o.c : `${o.c}1a`, color: sel === o.k ? '#0d1117' : o.c, border: `1px solid ${sel === o.k ? o.c : `${o.c}55`}` }}>
                <o.ic className="w-4 h-4 flex-shrink-0" /> {o.l}
              </button>
            ))}
          </div>

          {op?.retorno && (
            <div className="rounded-xl p-3 flex items-center gap-2 flex-wrap" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              <span className="text-[11px]" style={{ color: A.muted }}>Retorno em</span>
              <input type="date" value={data} min={hojeBrasilia()} onChange={e => setData(e.target.value)} className="px-2 py-1 rounded-lg text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }} />
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="px-2 py-1 rounded-lg text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }} />
            </div>
          )}
          {op?.reuniao && (
            <div className="rounded-xl p-3 flex items-center gap-2 flex-wrap" style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              <span className="text-[11px]" style={{ color: A.muted }}>Reunião em</span>
              <input type="date" value={reuniaoData} min={hojeBrasilia()} onChange={e => setReuniaoData(e.target.value)} className="px-2 py-1 rounded-lg text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }} />
              <input type="time" value={reuniaoHora} onChange={e => setReuniaoHora(e.target.value)} className="px-2 py-1 rounded-lg text-xs" style={{ background: A.surface, color: A.text, border: `1px solid ${A.border}` }} />
              <span className="text-[10px]" style={{ color: A.muted }}>Para criar o Meet, use o botão "Reunião" do card.</span>
            </div>
          )}
          {sel === 'opt_out' && <p className="text-[11px] rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>O contato será colocado na lista de supressão e removido de todas as cadências e reimportações.</p>}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px]" style={{ color: A.muted }}>Observação (opcional)</label>
              <div className="flex gap-1.5">
                <button onClick={ditar} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ background: ouvindo ? '#ef4444' : A.surface2, color: ouvindo ? '#fff' : A.accent, border: `1px solid ${A.border}` }}><Mic className="w-3 h-3" /> {ouvindo ? 'Parar' : 'Ditar'}</button>
                <button onClick={resumirIA} disabled={ia} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold disabled:opacity-40" style={{ background: A.surface2, color: A.accent, border: `1px solid ${A.border}` }}>{ia ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Resumir com IA</button>
              </div>
            </div>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Ex.: cliente pediu proposta de Conta Internacional para PJ; ligar na quinta."
              className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none" style={{ background: A.surface2, color: A.text, border: `1px solid ${A.border}` }} />
          </div>
        </div>
        <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${A.border}` }}>
          <button onClick={salvar} disabled={!sel || enviando} className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: A.accent, color: '#0d1117' }}>
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar resultado
          </button>
        </div>
      </div>
    </div>
  );
}
