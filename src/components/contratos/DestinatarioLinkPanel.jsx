import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, RotateCcw, MessageSquare } from 'lucide-react';
import { buscarClientes } from '@/lib/clientesBusca';

const A = {
  surface: '#111A2B', surface2: '#17223A',
  border: 'rgba(255,255,255,0.08)',
  accent: '#00D4AA', accentDim: 'rgba(0,212,170,0.12)',
  text: '#e6edf3', muted: 'rgba(230,237,243,0.55)',
};
const inputStyle = { background: A.surface2, border: `1px solid ${A.border}`, color: A.text };
const label = { color: A.muted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

// Mensagem de acolhimento padronizada (mesmo texto para todos os produtos; muda só o objetivo).
// Na página do cliente ela aparece depois de "Olá, <nome>." e é assinada pelo gerente responsável.
const acolhimento = (acao) => `Seja bem-vindo(a) à Villela Exchange! Para darmos início à ${acao}, precisamos de alguns dados e documentos. Preencha o formulário com atenção — seu progresso fica salvo e você pode voltar pelo mesmo link sempre que precisar. Qualquer dúvida, fale comigo: estou acompanhando o seu atendimento.`;
export const MENSAGENS_PADRAO = {
  canal: acolhimento('abertura do seu canal bancário'),
  conta: acolhimento('abertura da sua conta internacional'),
  offshore: acolhimento('constituição da sua empresa no exterior (LLC)'),
  rof: acolhimento('formalização do seu ROF (Registro de Operação Financeira)'),
  dolarize: acolhimento('abertura da sua conta Dolarize'),
};

// Com o cliente identificado, a mensagem já sai personalizada: "Olá, Fulano! Seja bem-vindo(a)…"
const primeiroNome = (n) => {
  const p = String(n || '').trim().split(/\s+/)[0] || '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
};
export const mensagemPadrao = (tipo, nomeCliente) => {
  const base = MENSAGENS_PADRAO[tipo] || MENSAGENS_PADRAO.canal;
  const n = primeiroNome(nomeCliente);
  return n ? `Olá, ${n}! ${base}` : base;
};
// A mensagem ainda é a padrão (com ou sem saudação)? Então pode ser regenerada quando o nome muda.
export const ehMensagemPadrao = (tipo, m) => {
  const base = MENSAGENS_PADRAO[tipo] || MENSAGENS_PADRAO.canal;
  const t = String(m || '').trim();
  return !t || t === base || (/^Olá, [^!]{1,40}! /.test(t) && t.replace(/^Olá, [^!]{1,40}! /, '') === base)
    || Object.values(MENSAGENS_PADRAO).includes(t);
};
// Na página pública: só acrescenta "Olá, nome." se a mensagem ainda não cumprimenta.
export const mensagemJaCumprimenta = (m) => /^\s*ol[aá]\b/i.test(String(m || ''));

// Destinatário do link + mensagem personalizada do formulário público.
// O cliente escolhido aqui é quem recebe o link e já sai preenchido no formulário.
export default function DestinatarioLinkPanel({ tipo = 'canal', valor, onChange, onSelecionarCliente }) {
  const v = valor || {};
  const mensagem = v.mensagem_cliente !== undefined && v.mensagem_cliente !== '' ? v.mensagem_cliente : mensagemPadrao(tipo, v.cliente_nome);
  // Trocou o cliente e a mensagem ainda é a padrão → personaliza com o novo nome
  const mudarNome = (nome) => onChange(ehMensagemPadrao(tipo, mensagem) ? { cliente_nome: nome, mensagem_cliente: mensagemPadrao(tipo, nome) } : { cliente_nome: nome });
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (busca.trim().length < 2) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    timer.current = setTimeout(async () => {
      try { setResultados(await buscarClientes({ busca: busca.trim(), limite: 6 })); }
      catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [busca]);

  const escolher = (c) => {
    mudarNome(c.nome || '');
    onSelecionarCliente?.(c);
    setBusca('');
    setResultados([]);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1" style={label}>Cliente destinatário *</label>
        <input value={v.cliente_nome || ''} onChange={e => mudarNome(e.target.value)}
          placeholder="Nome do cliente que vai receber o link"
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
        <div className="relative mt-1.5">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: A.muted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente cadastrado (nome ou CPF/CNPJ) para preencher"
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg focus:outline-none"
            style={{ ...inputStyle, background: A.surface }} />
          {buscando && <Loader2 className="w-3 h-3 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: A.accent }} />}
          {busca.trim().length >= 2 && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-2xl"
              style={{ background: A.surface2, border: `1px solid ${A.border}` }}>
              {buscando && (
                <p className="px-3 py-2 text-xs flex items-center gap-2" style={{ color: A.muted }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando na base...
                </p>
              )}
              {!buscando && resultados.map(c => (
                <button key={c.id} onClick={() => escolher(c)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-white/5">
                  <span className="truncate">{c.nome}</span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: A.muted }}>{c.cpf_cnpj || ''}</span>
                </button>
              ))}
              {!buscando && resultados.length === 0 && (
                <p className="px-3 py-2 text-xs" style={{ color: A.muted }}>
                  Nenhum cliente encontrado para “{busca.trim()}”.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label style={label}>Mensagem para o cliente</label>
          <button onClick={() => onChange({ mensagem_cliente: mensagemPadrao(tipo, v.cliente_nome) })}
            className="flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: A.accent }}>
            <RotateCcw className="w-3 h-3" /> Restaurar padrão
          </button>
        </div>
        <textarea value={mensagem} onChange={e => onChange({ mensagem_cliente: e.target.value })} rows={5}
          placeholder="Mensagem que o cliente verá no topo do formulário"
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-y" style={inputStyle} />
        <p className="mt-1 text-[11px]" style={{ color: A.muted }}>É exatamente o que o cliente vê no topo do formulário, assinada pelo consultor abaixo.</p>
      </div>

      <div>
        <label className="block mb-1" style={label}>Consultor responsável</label>
        <input value={v.responsavel_nome || ''} onChange={e => onChange({ responsavel_nome: e.target.value })}
          placeholder="Quem assina a mensagem enviada ao cliente"
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={inputStyle} />
      </div>

    </div>
  );
}